'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const fsSync=require('node:fs');
const https=require('node:https');
const {createLokiShare,listPrivateInterfaces,safeFileName,MAX_FILE}=require('../src/shared/lokishare.cjs');

test('private interface discovery and filename boundaries',()=>{
 assert.ok(Array.isArray(listPrivateInterfaces()));
 assert.equal(safeFileName('photo-2026.jpg'),'photo-2026.jpg');
 for(const evil of ['../secret.txt','folder\\secret.txt','CON.txt','..','bad<name','a/'.repeat(100)])
   assert.throws(()=>safeFileName(evil));
 assert.equal(MAX_FILE,512*1024*1024);
});

let trustedTestCert = null;
async function secureFetch(url,options={}) {
  const ref=new URL(url);
  const {method='GET',headers={},body}=options;
  return new Promise((resolve,reject)=>{
    const req=https.request(ref,{method,headers,ca:trustedTestCert},res=>{
      const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>{const buffer=Buffer.concat(chunks);resolve({status:res.statusCode,ok:res.statusCode>=200&&res.statusCode<300,headers:{get:n=>Array.isArray(res.headers[String(n).toLowerCase()])?res.headers[String(n).toLowerCase()][0]:(res.headers[String(n).toLowerCase()]||null)},json:async()=>JSON.parse(buffer.toString('utf8')),text:async()=>buffer.toString('utf8')});});
    });
    req.on('error',reject);req.end(body);
  });
}
// Tests explicitly trust the PC-generated certificate; all TLS verification stays enabled.
test('LAN pairing requires PC approval, limits file scope, transfers both directions, and revokes access',async t=>{
 const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'lokishare-e2e-'));
 const inbox=path.join(tmp,'inbox');await fs.mkdir(inbox);
 await fs.writeFile(path.join(tmp,'private.txt'),'NEVER SHARED');
 await fs.writeFile(path.join(tmp,'public.txt'),'PUBLIC DATA');
 const share=createLokiShare({identityDir:path.join(tmp,'tls')});
 t.after(async()=>{await share.stop();await fs.rm(tmp,{recursive:true,force:true});});
 await share.start('127.0.0.1');
 trustedTestCert=JSON.parse(fsSync.readFileSync(path.join(tmp,'tls','lokishare-tls-identity.json'),'utf8')).cert;
 const {url,code}=share.status();
 assert.match(url,/^https:\/\/127\.0\.0\.1:\d+$/);
 assert.match(share.status().tlsFingerprint,/^[a-f0-9]{64}$/);
 assert.match(share.inviteURL(),/^lokiverse:\/\/pair\?url=https/);
 const headers={'Origin':url,'Content-Type':'application/json'};
 const post=(uri,body,other={})=>secureFetch(url+uri,{method:'POST',headers,body:JSON.stringify(body),...other});
 const unauthorized=await secureFetch(url+'/api/manifest');assert.equal(unauthorized.status,401);
 const staticPage=await secureFetch(url+'/');assert.equal(staticPage.status,200);
 assert.match(await staticPage.text(),/Send to Windows/);
 const denied=await post('/api/pair/request',{join:'WRONG',device:'Phone'});assert.equal(denied.status,403);
 const forged=await secureFetch(url+'/api/pair/request',{method:'POST',headers:{'Content-Type':'application/json','Origin':'http://evil.test'},body:JSON.stringify({join:code,device:'Fake'})});
 assert.equal(forged.status,403);
 const pair=await post('/api/pair/request',{join:code,device:'Test Android'});
 assert.equal(pair.status,200);const p=await pair.json();assert.match(p.match,/^\d{6}$/);
 assert.equal(share.status().pending[0].match,p.match);
 let before=await secureFetch(url+`/api/pair/status?id=${p.id}&key=${p.key}`);
 assert.deepEqual(await before.json(),{status:'pending'});
 share.approve(p.id,true);
 const accepted=await secureFetch(url+`/api/pair/status?id=${p.id}&key=${p.key}`);
 assert.equal((await accepted.json()).status,'approved');
 const cookie=accepted.headers.get('set-cookie').split(';')[0];
 const auth={Cookie:cookie};
 assert.equal((await secureFetch(url+'/api/status',{headers:auth})).status,200);
 const none=await secureFetch(url+'/api/manifest',{headers:auth});assert.deepEqual((await none.json()).files,[]);
 const postUpload=(name,data,optional={})=>secureFetch(url+'/api/upload?name='+encodeURIComponent(name),{method:'POST',headers:{...auth,Origin:url,...optional},body:data});
 let upload=await postUpload('photo.txt',Buffer.from('MY PHOTO'));
 assert.equal(upload.status,409,'must explicitly choose incoming folder');
 await share.setInbox(inbox);
 upload=await postUpload('../private.txt',Buffer.from('NO'));
 assert.equal(upload.status,400,'traversal upload filename rejected');
 await fs.writeFile(path.join(inbox,'photo.txt'),'ORIGINAL');
 upload=await postUpload('photo.txt',Buffer.from('MY PHOTO'));
 assert.equal(upload.status,200);
 assert.equal((await upload.json()).savedName,'photo (1).txt');
 assert.equal(await fs.readFile(path.join(inbox,'photo.txt'),'utf8'),'ORIGINAL');
 assert.equal(await fs.readFile(path.join(inbox,'photo (1).txt'),'utf8'),'MY PHOTO');
 const notAllowed=await secureFetch(url+'/api/download?id=../../private.txt',{headers:auth});assert.equal(notAllowed.status,404);
 await share.addFiles([path.join(tmp,'public.txt')]);
 const manifest=await secureFetch(url+'/api/manifest',{headers:auth});const entries=(await manifest.json()).files;
 assert.equal(entries.length,1);assert.equal(entries[0].name,'public.txt');
 const download=await secureFetch(url+'/api/download?id='+entries[0].id,{headers:auth});
 assert.equal(download.status,200);assert.equal(await download.text(),'PUBLIC DATA');
 let doneCount=0;
 for(let i=0;i<80;i++){doneCount=share.status().transfers.filter(x=>x.status==='completed').length;if(doneCount>=2)break;await new Promise(resolve=>setTimeout(resolve,25));}
 assert.equal(doneCount,2,JSON.stringify(share.status().transfers));
 const client=share.status().clients[0];share.revoke(client.id);
 assert.equal((await secureFetch(url+'/api/status',{headers:auth})).status,401);
 await share.stop();assert.equal(share.status().running,false);
});

test('pairing rejection never gives session credentials',async t=>{
 const testdir=await fs.mkdtemp(path.join(os.tmpdir(),'share-tls-'));
 const share=createLokiShare({identityDir:testdir});t.after(async()=>{await share.stop();await fs.rm(testdir,{force:true,recursive:true});});
 await share.start('127.0.0.1');
 trustedTestCert=JSON.parse(fsSync.readFileSync(path.join(testdir,'lokishare-tls-identity.json'),'utf8')).cert;const {url,code}=share.status();
 const pair=await secureFetch(url+'/api/pair/request',{method:'POST',headers:{Origin:url,'Content-Type':'application/json'},body:JSON.stringify({join:code,device:'Other'})});
 const p=await pair.json();share.approve(p.id,false);
 const response=await secureFetch(url+`/api/pair/status?id=${p.id}&key=${p.key}`);
 assert.equal((await response.json()).status,'rejected');assert.equal(response.headers.get('set-cookie'),null);
});

test('v0.5 transfer history survives session restarts and can be cleared without deleting files',async t=>{
 const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'lokiverse-history-'));
 const historyFile=path.join(tmp,'history.json');const inbox=path.join(tmp,'received');await fs.mkdir(inbox);
 let share=createLokiShare({identityDir:path.join(tmp,'cert'),historyFile});
 t.after(async()=>{await share.stop();await fs.rm(tmp,{recursive:true,force:true});});
 await share.start('127.0.0.1');
 const cert=JSON.parse(await fs.readFile(path.join(tmp,'cert','lokishare-tls-identity.json'),'utf8')).cert;
 trustedTestCert=cert;
 const url=share.status().url,headers={Origin:url,'Content-Type':'application/json'};
 const pair=await secureFetch(url+'/api/pair/request',{method:'POST',headers,body:JSON.stringify({join:share.status().code,device:'Test'})});
 const {id,key}=await pair.json();share.approve(id,true);
 const accepted=await secureFetch(url+`/api/pair/status?id=${id}&key=${key}`);const cookie=accepted.headers.get('set-cookie').split(';')[0];
 await share.setInbox(inbox);
 const response=await secureFetch(url+'/api/upload?name=memory.txt',{method:'POST',headers:{Origin:url,Cookie:cookie},body:Buffer.from('KEEP THIS')});
 assert.equal(response.status,200);
 assert.equal(share.status().totals.completed,1);
 assert.equal(share.status().totals.receivedBytes,9);
 await share.stop();assert.equal(share.status().transfers.length,1,'stop does not remove history');
 await new Promise(resolve=>setTimeout(resolve,30));
 share=createLokiShare({identityDir:path.join(tmp,'cert'),historyFile});
 await share.start('127.0.0.1');
 assert.equal(share.status().transfers[0].status,'completed');
 assert.equal(share.status().totals.receivedBytes,9);
 await share.clearHistory();assert.equal(share.status().transfers.length,0);
 assert.equal(await fs.readFile(path.join(inbox,'memory.txt'),'utf8'),'KEEP THIS');
 await share.stop();
 share=createLokiShare({identityDir:path.join(tmp,'cert'),historyFile});await share.start('127.0.0.1');
 assert.equal(share.status().transfers.length,0);
});

test('desktop cancel aborts an in-flight upload and cleans its temporary file',async t=>{
 const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'lokiverse-cancel-'));
 const share=createLokiShare({identityDir:path.join(tmp,'cert'),historyFile:path.join(tmp,'history.json')});
 t.after(async()=>{await share.stop();await fs.rm(tmp,{recursive:true,force:true});});
 const inbox=path.join(tmp,'incoming');await fs.mkdir(inbox);
 await share.start('127.0.0.1');await share.setInbox(inbox);
 const url=share.status().url;
 const cert=JSON.parse(await fs.readFile(path.join(tmp,'cert','lokishare-tls-identity.json'),'utf8')).cert;
 trustedTestCert=cert;
 const pair=await secureFetch(url+'/api/pair/request',{method:'POST',headers:{Origin:url,'Content-Type':'application/json'},body:JSON.stringify({join:share.status().code,device:'Slow sender'})});
 const {id,key}=await pair.json();share.approve(id,true);
 const accepted=await secureFetch(url+`/api/pair/status?id=${id}&key=${key}`);const cookie=accepted.headers.get('set-cookie').split(';')[0];
 const request=https.request(url+'/api/upload?name=incomplete.dat',{method:'POST',ca:cert,headers:{Origin:url,Cookie:cookie,'Content-Length':String(1024*1024*10)}});
 request.on('error',()=>{});request.on('response',res=>res.resume());
 request.write(Buffer.alloc(128*1024,65));
 let active=null;
 for(let i=0;i<120;i++){
   active=share.status().transfers.find(x=>x.status==='transferring');
   if(active)break;
   await new Promise(resolve=>setTimeout(resolve,20));
 }
 assert.ok(active,'upload should be active');
 share.cancelTransfer(active.id);
 request.destroy();
 for(let i=0;i<120;i++){
   const files=await fs.readdir(inbox);
   if(files.length===0 && share.status().transfers[0].status==='cancelled')break;
   await new Promise(resolve=>setTimeout(resolve,20));
 }
 assert.equal(share.status().transfers[0].status,'cancelled');
 assert.deepEqual(await fs.readdir(inbox),[],'cancelled upload must not leave a partial file');
 await share.stop();
});
