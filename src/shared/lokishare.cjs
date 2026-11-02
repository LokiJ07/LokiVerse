'use strict';
// LokiShare: on-demand local-network HTTPS service with a unique local TLS identity.
// Certificates are pinned by the Android client from an out-of-band QR invitation.
const https = require('node:https');
const {localTLSIdentity} = require('./tls-identity.cjs');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const crypto = require('node:crypto');
const { pipeline } = require('node:stream/promises');
const { validName } = require('./fileops.cjs');

const MAX_FILE = 512 * 1024 * 1024; // 512 MiB / single file
const CLIENT_TTL = 30 * 60 * 1000;
const PAIR_TTL = 2 * 60 * 1000;
const MAX_PENDING = 5;
const PUBLIC_DIR = path.join(__dirname, '..', 'share-web');
const headers = {
  'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; form-action 'none'; frame-ancestors 'none'"
};
const rand = (n=24) => crypto.randomBytes(n).toString('hex');
const code = (length=10) => Array.from(crypto.randomBytes(length), b => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');
const safeEqual = (a,b) => {
  if (typeof a!=='string' || typeof b!=='string' || a.length!==b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b));
};
function listPrivateInterfaces() {
  const found = [];
  for (const [name, entries] of Object.entries(os.networkInterfaces())) for (const entry of entries || []) {
    const ip=entry.address;
    if (entry.internal || entry.family!=='IPv4') continue;
    const parts=ip.split('.').map(Number);
    const privateIP=parts[0]===10 || (parts[0]===172 && parts[1]>=16 && parts[1]<=31) || (parts[0]===192 && parts[1]===168);
    if(privateIP) found.push({name, address:ip});
  }
  return found;
}
function safeFileName(input) {
  if(typeof input!=='string') throw Error('Invalid filename.');
  // No attacker-controlled filesystem path: filename only, never relative directories.
  const candidate=input.normalize('NFC');
  if(candidate.length>180 || !validName(candidate)) throw Error('Unsupported filename. Rename the file and try again.');
  return candidate;
}
// Only support a single forward range. Multi-range is not needed for local phone resuming.
function parseDownloadRange(header, size) {
  if (header === undefined || header === null) return null;
  if (typeof header !== 'string' || !/^bytes=(0|[1-9]\d*)-$/.test(header)) throw Error('Invalid byte range.');
  const offset = Number(header.slice(6,-1));
  if (!Number.isSafeInteger(offset) || offset >= size || offset < 0) throw Error('Range cannot be satisfied.');
  return offset;
}
function transferETag(file, stat) {
  // ETag for a particular selected file/version. Avoid a full 512 MiB hash on each request.
  return '"' + crypto.createHash('sha256').update(`${file.id}:${file.path}:${stat.size}:${stat.mtimeMs}`).digest('hex') + '"';
}
function newDownloadName(name) {
  // ASCII fallback + RFC 5987 encoded UTF-8 filename for mobile browsers.
  const ascii=name.replace(/[^a-zA-Z0-9._-]/g,'_').replace(/^\.+/,'file');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}
function createLokiShare({onChange=()=>{}, clock=()=>Date.now(), publicDir=PUBLIC_DIR, identityDir=path.join(os.tmpdir(),'lokishare-test-'+process.pid), historyFile=null}={}) {
  let server=null, bindAddress=null, hostURL=null, pairCode=null, joinSecret=null, inbox=null, tlsFingerprint=null;
  const pending=new Map(), clients=new Map(), downloads=new Map(), transfers=[];
  const activeTransfers=new Map();
  let historyLoaded=false, historyError=null, historyQueue=Promise.resolve();
  const failures=new Map();
  const sockets=new Set();
  let sequence=0;
  let stateVersion=0;
  function changed() { stateVersion++; onChange(); }
  // Separate from the workspace backup: never persist paths, pairing codes, IPs or cookies.
  async function readHistory() {
    if(historyLoaded || !historyFile) return;
    try {
      const data=JSON.parse(await fs.readFile(historyFile,'utf8'));
      if(!data || data.version!==1 || !Array.isArray(data.items)) throw Error('Unsupported history format.');
      transfers.splice(0,transfers.length,...data.items.slice(0,100).filter(x=>x && typeof x.id==='string' && typeof x.name==='string' && typeof x.timestamp==='string').map(x=>({
        id:x.id.slice(0,32),timestamp:x.timestamp.slice(0,40),name:x.name.slice(0,180),
        direction:String(x.direction||'').slice(0,24), device:String(x.device||'').slice(0,36),
        size:Number.isSafeInteger(x.size)&&x.size>=0?x.size:0,
        bytes:Number.isSafeInteger(x.bytes)&&x.bytes>=0?x.bytes:0,
        status:x.status==='transferring'?'interrupted':String(x.status||'interrupted').slice(0,24)
      })));
    } catch(error) {
      if(error.code!=='ENOENT') historyError='History file could not be read. It was left untouched; clear it only after reviewing it.';
    }
    historyLoaded=true;changed();
  }
  function persistHistory() {
    if(!historyFile || historyError) return;
    const snapshot=JSON.stringify({version:1,items:transfers.map(({id,timestamp,name,direction,device,size,bytes,status})=>({id,timestamp,name,direction,device,size,bytes,status}))});
    historyQueue=historyQueue.catch(()=>{}).then(async()=>{
      await fs.mkdir(path.dirname(historyFile),{recursive:true});
      const temp=`${historyFile}.${process.pid}.tmp`;
      try {await fs.writeFile(temp,snapshot,{encoding:'utf8',mode:0o600});await fs.rename(temp,historyFile);}
      finally {await fs.rm(temp,{force:true}).catch(()=>{});}
    }).catch(error=>{historyError=`Transfer history could not be saved: ${error.message}`;changed();});
  }
  function finishTransfer(transfer,status) {
    if(transfer.status==='cancelled' && status!=='cancelled') return;
    transfer.status=status;activeTransfers.delete(transfer.id);changed();persistHistory();
  }
  function cancelTransfer(id) {
    const action=activeTransfers.get(id);
    if(!action)return status();
    const item=transfers.find(t=>t.id===id);
    if(item && item.status==='transferring') {item.status='cancelled';activeTransfers.delete(id);changed();persistHistory();action();}
    return status();
  }
  async function clearHistory() {
    if(historyError) throw Error('History file is unreadable. Back it up and remove it manually from the app data directory first.');
    // Keep transfers still in flight; do not remove an active transfer from the UI.
    const inFlight=transfers.filter(t=>t.status==='transferring');
    transfers.splice(0,transfers.length,...inFlight);changed();persistHistory();
    await historyQueue;return status();
  }

  function addTransfer(input) {
    const item={id:rand(6), timestamp:new Date(clock()).toISOString(),...input};
    transfers.unshift(item);if(transfers.length>100) transfers.pop();changed();persistHistory();return item;
  }
  function status() {
    prune();
    return { running:!!server, url:hostURL, code:pairCode, inbox, tlsFingerprint, secure:true,
      pending:[...pending.values()].filter(p=>p.status==='pending').map(p=>({id:p.id, device:p.device, match:p.match, created:p.created})),
      clients:[...clients.values()].map(c=>({id:c.id,device:c.device,lastSeen:c.lastSeen})),
      files:[...downloads.values()].map(f=>({id:f.id,name:f.name,size:f.size})),
      transfers:transfers.map(x=>({...x})),
      historyError,
      totals:{completed:transfers.filter(t=>t.status==='completed').length,
        receivedBytes:transfers.filter(t=>t.status==='completed' && t.direction==='to PC').reduce((sum,t)=>sum+t.size,0),
        sentBytes:transfers.filter(t=>t.status==='completed' && t.direction==='to phone').reduce((sum,t)=>sum+t.size,0)},
      maxFileBytes:MAX_FILE, version:stateVersion };
  }
  function prune() {
    for(const [key,p] of pending) if(clock()-p.created>PAIR_TTL) pending.delete(key);
    for(const [key,c] of clients) if(clock()-c.lastSeen>CLIENT_TTL) clients.delete(key);
    for(const [key,attempt] of failures) if(clock()-attempt.since>10*60*1000) failures.delete(key);
  }
  function json(res,statusCode,body,extra={}) { res.writeHead(statusCode,{...headers,'Content-Type':'application/json; charset=utf-8',...extra});res.end(JSON.stringify(body)); }
  function error(res,code,msg) { json(res,code,{error:msg}); }
  function sessionFor(req) {
    const found=/\bloki_session=([a-f0-9]{64})\b/.exec(req.headers.cookie||'');
    if(!found) return null;
    const value=found[1]; const result=clients.get(value);
    if(!result) return null;
    if(clock()-result.lastSeen>CLIENT_TTL || result.ip!==req.socket.remoteAddress) { clients.delete(value);return null; }
    result.lastSeen=clock();return result;
  }
  function sameOrigin(req) {
    // Required on state-changing requests to prevent cross-site fetch/form attacks.
    const origin=req.headers.origin;
    return origin===hostURL;
  }
  async function readJSON(req, limit=2048) {
    let used=0;const chunks=[];
    for await(const piece of req) { used+=piece.length;if(used>limit) throw Error('Request too large.');chunks.push(piece); }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }
  function clientIP(req) {return req.socket.remoteAddress||'';}
  async function handle(req,res) {
    try {
      prune();
      const u=new URL(req.url,hostURL);
      if(req.headers.host!==new URL(hostURL).host) return error(res,421,'Invalid host.');
      if(req.method==='GET' && ['/','/app.js','/styles.css'].includes(u.pathname)) {
        const file=u.pathname==='/'?'index.html':u.pathname.slice(1);
        const type=file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html';
        const raw=await fs.readFile(path.join(publicDir,file));
        res.writeHead(200,{...headers,'Content-Type':`${type}; charset=utf-8`});res.end(raw);return;
      }
      if(req.method==='POST' && u.pathname==='/api/pair/request') {
        if(!sameOrigin(req)) return error(res,403,'Origin rejected.');
        const ip=clientIP(req);
        const f=failures.get(ip);
        if(f && f.count>=6 && clock()-f.since<10*60*1000) return error(res,429,'Too many attempts. Retry later.');
        let input;try {input=await readJSON(req);}catch{return error(res,400,'Invalid request.');}
        if(!safeEqual(input.join,joinSecret) && !safeEqual(String(input.join||'').toUpperCase(),pairCode)) {
          const old=failures.get(ip)||{count:0,since:clock()};old.count++;failures.set(ip,old);
          return error(res,403,'Incorrect connection code.');
        }
        if([...pending.values()].filter(p=>p.status==='pending').length>=MAX_PENDING) return error(res,429,'Too many pending pairing requests.');
        const id=rand(12), key=rand(24), match=String(crypto.randomInt(100000,1000000));
        const device=String(input.device||'Phone').replace(/[<>\x00-\x1f]/g,'').slice(0,36)||'Phone';
        pending.set(id,{id,key,match,device,ip,status:'pending',created:clock()});changed();
        return json(res,200,{id,key,match,expiresSeconds:120});
      }
      if(req.method==='GET' && u.pathname==='/api/pair/status') {
        const p=pending.get(u.searchParams.get('id'));
        if(!p || p.ip!==clientIP(req) || !safeEqual(u.searchParams.get('key'),p.key)) return error(res,404,'Pairing expired.');
        if(p.status==='rejected') { pending.delete(p.id);return json(res,200,{status:'rejected'}); }
        if(p.status!=='approved') return json(res,200,{status:'pending'});
        pending.delete(p.id);
        const secret=rand(32);clients.set(secret,{id:rand(8),device:p.device,ip:p.ip,lastSeen:clock()});changed();
        return json(res,200,{status:'approved'}, {'Set-Cookie':`loki_session=${secret}; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=1800`});
      }
      if(req.method==='POST' && !sameOrigin(req)) return error(res,403,'Origin rejected.');
      const client=sessionFor(req);
      if(!client) return error(res,401,'Pair your phone with LokiVerse first.');
      if(req.method==='GET' && u.pathname==='/api/status') return json(res,200,{connected:true,device:client.device,canUpload:!!inbox,maxFileBytes:MAX_FILE});
      if(req.method==='GET' && u.pathname==='/api/manifest') return json(res,200,{files:[...downloads.values()].map(f=>({id:f.id,name:f.name,size:f.size}))});
      if(req.method==='GET' && u.pathname==='/api/download') {
        const file=downloads.get(u.searchParams.get('id'));
        if(!file) return error(res,404,'File is no longer shared.');
        const stat=await fs.stat(file.path);
        if(!stat.isFile() || stat.size!==file.size) return error(res,409,'File changed since it was selected. Re-add it on the PC.');
        // Prevent resuming a changed file, including edits that preserve the same byte size.
        if (file.modifiedMs !== stat.mtimeMs) return error(res,409,'Shared file changed. Re-add it from Windows.');
        const etag=transferETag(file,stat);
        const ifRange=req.headers['if-range'];
        let offset=null;
        try {
          // A stale validator means send a fresh complete file, never append mixed versions.
          if (!ifRange || ifRange===etag) offset=parseDownloadRange(req.headers.range,stat.size);
        } catch {
          res.writeHead(416,{...headers,'Content-Range':`bytes */${stat.size}`,'ETag':etag,'Accept-Ranges':'bytes'});
          res.end();return;
        }
        const start=offset??0, partial=offset!==null;
        const transfer=addTransfer({direction:'to phone',device:client.device,name:file.name,size:stat.size,bytes:start,status:'transferring'});
        res.writeHead(partial?206:200,{...headers,'Content-Type':'application/octet-stream',
          'Accept-Ranges':'bytes','ETag':etag,
          ...(partial?{'Content-Range':`bytes ${start}-${stat.size-1}/${stat.size}`} : {}),
          'Content-Length':String(stat.size-start),'Content-Disposition':newDownloadName(file.name)});
        const stream=fsSync.createReadStream(file.path,{start});let last=0;
        activeTransfers.set(transfer.id,()=>{stream.destroy();res.destroy();});
        stream.on('data',chunk=>{transfer.bytes+=chunk.length;if(clock()-last>250){last=clock();changed();}});
        res.on('close',()=>{if(!res.writableFinished && transfer.status==='transferring'){finishTransfer(transfer,'interrupted');stream.destroy();}});
        try { await pipeline(stream,res);transfer.bytes=stat.size;finishTransfer(transfer,'completed'); }
        catch {finishTransfer(transfer,'interrupted');}
        return;
      }
      if(req.method==='POST' && u.pathname==='/api/upload') {
        if(!inbox) return error(res,409,'Choose a receive folder on Windows first.');
        let name;try {name=safeFileName(u.searchParams.get('name'));}catch(e){return error(res,400,e.message);}
        const declared=Number(req.headers['content-length']);
        if(!/^(0|[1-9]\d*)$/.test(String(req.headers['content-length']??'')) || declared>MAX_FILE) return error(res,413,'File size must be known and under 512 MiB.');
        // Reserve a random temporary path; completed files are published without overwriting.
        const tmp=path.join(inbox,`.lokishare-${rand(10)}.part`);
        const transfer=addTransfer({direction:'to PC',device:client.device,name,size:declared,bytes:0,status:'transferring'});

        try {
          const stream=fsSync.createWriteStream(tmp,{flags:'wx',mode:0o600});let last=0;
          activeTransfers.set(transfer.id,()=>{req.destroy();stream.destroy();});
          req.on('data',piece=>{transfer.bytes+=piece.length;if(transfer.bytes>MAX_FILE)req.destroy();if(clock()-last>250){last=clock();changed();}});
          await pipeline(req,stream);
          if(transfer.status==='cancelled') throw Error('Upload cancelled.');
          if(transfer.bytes!==declared) throw Error('Incomplete upload.');
          const ext=path.extname(name), base=name.slice(0,name.length-ext.length), maxAttempts=100;
          let savedName,savedPath;
          for(let i=0;i<maxAttempts;i++) {
            const candidate=i?`${base} (${i})${ext}`:name;
            if(!validName(candidate)) continue;
            try { const candidatePath=path.join(inbox,candidate); await fs.copyFile(tmp,candidatePath,fsSync.constants.COPYFILE_EXCL);savedName=candidate;savedPath=candidatePath;break; }
            catch(e){if(e.code!=='EEXIST')throw e;}
          }
          if(transfer.status==='cancelled') {if(savedPath) await fs.rm(savedPath,{force:true});throw Error('Upload cancelled.');}
          if(!savedName) throw Error('Unable to find an available filename.');
          transfer.savedName=savedName;finishTransfer(transfer,'completed');
          json(res,200,{ok:true,savedName});
        } catch(e) {
          transfer.error=e.message;finishTransfer(transfer,'failed');
          if(!res.headersSent && !res.destroyed) error(res,500,'Upload failed. Please try again.');
        } finally { await fs.rm(tmp,{force:true}).catch(()=>{}); }
        return;
      }
      return error(res,404,'Not found.');
    } catch(e) {if(!res.headersSent && !res.destroyed) error(res,500,'Request failed.');}
  }
  async function start(address) {
    if(server) throw Error('LokiShare is already running.');
    await readHistory();
    const addresses=listPrivateInterfaces().map(x=>x.address);
    // Localhost allowed only for test harness; production UI must choose a private interface.
    if(!addresses.includes(address) && address!=='127.0.0.1') throw Error('Choose a connected private Wi-Fi/LAN interface.');
    const identity=await localTLSIdentity(identityDir);
    const instance=https.createServer({key:identity.key,cert:identity.cert,minVersion:'TLSv1.2'},(req,res)=>{handle(req,res).catch(()=>{if(!res.headersSent)res.end();});});
    instance.requestTimeout=5*60*1000;
    instance.headersTimeout=20000;
    instance.on('connection',socket=>{sockets.add(socket);socket.on('close',()=>sockets.delete(socket));});
    try { await new Promise((resolve,reject)=>{instance.once('error',reject);instance.listen(0,address,()=>{instance.removeListener('error',reject);resolve();});}); }
    catch(e){instance.close();throw e;}
    server=instance;bindAddress=address;
    hostURL=`https://${address}:${server.address().port}`;
    tlsFingerprint=identity.fingerprint;
    pairCode=code(10);joinSecret=rand(32);changed();
    return status();
  }
  async function stop() {
    if(!server) return status();
    const old=server;server=null;hostURL=null;pairCode=null;joinSecret=null;tlsFingerprint=null;
    pending.clear();clients.clear();downloads.clear();failures.clear();
    for(const t of [...transfers])if(t.status==='transferring')cancelTransfer(t.id);
    old.close();for(const socket of sockets)socket.destroy();sockets.clear();changed();
    await historyQueue.catch(()=>{});return status();
  }
  function approve(id,accepted) {
    const p=pending.get(id);if(!p || p.status!=='pending' || clock()-p.created>PAIR_TTL) throw Error('Pairing request is no longer available.');
    p.status=accepted===true?'approved':'rejected';changed();return status();
  }
  async function setInbox(folder) {
    if(folder===null){inbox=null;changed();return status();}
    const real=await fs.realpath(folder);
    if(!(await fs.stat(real)).isDirectory()) throw Error('Not a directory.');
    inbox=real;changed();return status();
  }
  async function addFiles(paths) {
    if(!server) throw Error('Start LokiShare before sharing files.');
    for(const candidate of paths.slice(0,30)) {
      const real=await fs.realpath(candidate),st=await fs.stat(real);
      if(!st.isFile() || st.size>MAX_FILE) continue;
      const name=path.basename(real);
      if(!validName(name)) continue;
      const id=rand(10);downloads.set(id,{id,path:real,name,size:st.size,modifiedMs:st.mtimeMs});
    }
    changed();return status();
  }
  function removeFile(id) {downloads.delete(id);changed();return status();}
  function revoke(id) {for(const [key,value] of clients) if(value.id===id)clients.delete(key);changed();return status();}
  function inviteURL(){
    // Native invitation carries pinned certificate fingerprint via physical QR out-of-band.
    // Only display on the Windows screen; NEVER send cert fingerprint from the LAN endpoint.
    if (!hostURL) return null;
    const query=new URLSearchParams({url:hostURL,join:joinSecret,fp:tlsFingerprint});
    return `lokiverse://pair?${query}`;
  }
  return {listPrivateInterfaces,status,start,stop,approve,setInbox,addFiles,removeFile,revoke,inviteURL,cancelTransfer,clearHistory,loadHistory:readHistory};
}
module.exports={createLokiShare,listPrivateInterfaces,safeFileName,MAX_FILE,parseDownloadRange,transferETag};
