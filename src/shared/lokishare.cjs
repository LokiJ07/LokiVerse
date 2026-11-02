'use strict';
// LokiShare: on-demand local-network HTTP service. No cloud, no external server.
// HTTP is NOT end-to-end encrypted: use only on a trusted private Wi-Fi network.
const http = require('node:http');
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
function newDownloadName(name) {
  // ASCII fallback + RFC 5987 encoded UTF-8 filename for mobile browsers.
  const ascii=name.replace(/[^a-zA-Z0-9._-]/g,'_').replace(/^\.+/,'file');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}
function createLokiShare({onChange=()=>{}, clock=()=>Date.now(), publicDir=PUBLIC_DIR}={}) {
  let server=null, bindAddress=null, hostURL=null, pairCode=null, joinSecret=null, inbox=null;
  const pending=new Map(), clients=new Map(), downloads=new Map(), transfers=[];
  const failures=new Map();
  const sockets=new Set();
  let sequence=0;
  let stateVersion=0;
  function changed() { stateVersion++; onChange(); }
  function addTransfer(input) {
    const item={id:rand(6), timestamp:new Date(clock()).toISOString(),...input};
    transfers.unshift(item);if(transfers.length>25) transfers.pop();changed();return item;
  }
  function status() {
    prune();
    return { running:!!server, url:hostURL, code:pairCode, inbox,
      pending:[...pending.values()].filter(p=>p.status==='pending').map(p=>({id:p.id, device:p.device, match:p.match, created:p.created})),
      clients:[...clients.values()].map(c=>({id:c.id,device:c.device,lastSeen:c.lastSeen})),
      files:[...downloads.values()].map(f=>({id:f.id,name:f.name,size:f.size})),
      transfers:transfers.map(x=>({...x})), maxFileBytes:MAX_FILE, version:stateVersion };
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
        return json(res,200,{status:'approved'}, {'Set-Cookie':`loki_session=${secret}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=1800`});
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
        const transfer=addTransfer({direction:'to phone',device:client.device,name:file.name,size:stat.size,bytes:0,status:'transferring'});
        res.writeHead(200,{...headers,'Content-Type':'application/octet-stream','Content-Length':String(stat.size),'Content-Disposition':newDownloadName(file.name)});
        const stream=fsSync.createReadStream(file.path);let last=0;
        stream.on('data',chunk=>{transfer.bytes+=chunk.length;if(clock()-last>250){last=clock();changed();}});
        res.on('close',()=>{if(!res.writableFinished && transfer.status==='transferring'){transfer.status='interrupted';changed();stream.destroy();}});
        try { await pipeline(stream,res);transfer.status='completed';transfer.bytes=stat.size;changed(); }
        catch {transfer.status='interrupted';changed();}
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
        let ended=false;
        try {
          const stream=fsSync.createWriteStream(tmp,{flags:'wx',mode:0o600});let last=0;
          req.on('data',piece=>{transfer.bytes+=piece.length;if(transfer.bytes>MAX_FILE)req.destroy();if(clock()-last>250){last=clock();changed();}});
          await pipeline(req,stream);
          if(transfer.bytes!==declared) throw Error('Incomplete upload.');
          const ext=path.extname(name), base=name.slice(0,name.length-ext.length), maxAttempts=100;
          let savedName;
          for(let i=0;i<maxAttempts;i++) {
            const candidate=i?`${base} (${i})${ext}`:name;
            if(!validName(candidate)) continue;
            try { await fs.copyFile(tmp,path.join(inbox,candidate),fsSync.constants.COPYFILE_EXCL);savedName=candidate;break; }
            catch(e){if(e.code!=='EEXIST')throw e;}
          }
          if(!savedName) throw Error('Unable to find an available filename.');
          transfer.status='completed';transfer.savedName=savedName;ended=true;changed();
          json(res,200,{ok:true,savedName});
        } catch(e) {
          transfer.status='failed';transfer.error=e.message;changed();
          if(!res.headersSent && !res.destroyed) error(res,500,'Upload failed. Please try again.');
        } finally { await fs.rm(tmp,{force:true}).catch(()=>{}); }
        return;
      }
      return error(res,404,'Not found.');
    } catch(e) {if(!res.headersSent && !res.destroyed) error(res,500,'Request failed.');}
  }
  async function start(address) {
    if(server) throw Error('LokiShare is already running.');
    const addresses=listPrivateInterfaces().map(x=>x.address);
    // Localhost allowed only for test harness; production UI must choose a private interface.
    if(!addresses.includes(address) && address!=='127.0.0.1') throw Error('Choose a connected private Wi-Fi/LAN interface.');
    const instance=http.createServer((req,res)=>{handle(req,res).catch(()=>{if(!res.headersSent)res.end();});});
    instance.requestTimeout=5*60*1000;
    instance.headersTimeout=20000;
    instance.on('connection',socket=>{sockets.add(socket);socket.on('close',()=>sockets.delete(socket));});
    try { await new Promise((resolve,reject)=>{instance.once('error',reject);instance.listen(0,address,()=>{instance.removeListener('error',reject);resolve();});}); }
    catch(e){instance.close();throw e;}
    server=instance;bindAddress=address;
    hostURL=`http://${address}:${server.address().port}`;
    pairCode=code(10);joinSecret=rand(32);changed();
    return status();
  }
  async function stop() {
    if(!server) return status();
    const old=server;server=null;hostURL=null;pairCode=null;joinSecret=null;
    pending.clear();clients.clear();downloads.clear();transfers.splice(0);failures.clear();
    old.close();for(const socket of sockets)socket.destroy();sockets.clear();changed();
    return status();
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
      const id=rand(10);downloads.set(id,{id,path:real,name,size:st.size});
    }
    changed();return status();
  }
  function removeFile(id) {downloads.delete(id);changed();return status();}
  function revoke(id) {for(const [key,value] of clients) if(value.id===id)clients.delete(key);changed();return status();}
  function inviteURL(){return hostURL?`${hostURL}/?join=${joinSecret}`:null;}
  return {listPrivateInterfaces,status,start,stop,approve,setInbox,addFiles,removeFile,revoke,inviteURL};
}
module.exports={createLokiShare,listPrivateInterfaces,safeFileName,MAX_FILE};
