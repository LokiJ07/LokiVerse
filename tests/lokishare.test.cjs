'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {createLokiShare,listPrivateInterfaces,safeFileName,MAX_FILE}=require('../src/shared/lokishare.cjs');

test('private interface discovery and filename boundaries',()=>{
 assert.ok(Array.isArray(listPrivateInterfaces()));
 assert.equal(safeFileName('photo-2026.jpg'),'photo-2026.jpg');
 for(const evil of ['../secret.txt','folder\\secret.txt','CON.txt','..','bad<name','a/'.repeat(100)])
   assert.throws(()=>safeFileName(evil));
 assert.equal(MAX_FILE,512*1024*1024);
});

test('LAN pairing requires PC approval, limits file scope, transfers both directions, and revokes access',async t=>{
 const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'lokishare-e2e-'));
 const inbox=path.join(tmp,'inbox');await fs.mkdir(inbox);
 await fs.writeFile(path.join(tmp,'private.txt'),'NEVER SHARED');
 await fs.writeFile(path.join(tmp,'public.txt'),'PUBLIC DATA');
 const share=createLokiShare();
 t.after(async()=>{await share.stop();await fs.rm(tmp,{recursive:true,force:true});});
 await share.start('127.0.0.1');
 const {url,code}=share.status();
 assert.match(url,/^http:\/\/127\.0\.0\.1:\d+$/);
 const headers={'Origin':url,'Content-Type':'application/json'};
 const post=(uri,body,other={})=>fetch(url+uri,{method:'POST',headers,body:JSON.stringify(body),...other});
 const unauthorized=await fetch(url+'/api/manifest');assert.equal(unauthorized.status,401);
 const staticPage=await fetch(url+'/');assert.equal(staticPage.status,200);
 assert.match(await staticPage.text(),/Send to Windows/);
 const denied=await post('/api/pair/request',{join:'WRONG',device:'Phone'});assert.equal(denied.status,403);
 const forged=await fetch(url+'/api/pair/request',{method:'POST',headers:{'Content-Type':'application/json','Origin':'http://evil.test'},body:JSON.stringify({join:code,device:'Fake'})});
 assert.equal(forged.status,403);
 const pair=await post('/api/pair/request',{join:code,device:'Test Android'});
 assert.equal(pair.status,200);const p=await pair.json();assert.match(p.match,/^\d{6}$/);
 assert.equal(share.status().pending[0].match,p.match);
 let before=await fetch(url+`/api/pair/status?id=${p.id}&key=${p.key}`);
 assert.deepEqual(await before.json(),{status:'pending'});
 share.approve(p.id,true);
 const accepted=await fetch(url+`/api/pair/status?id=${p.id}&key=${p.key}`);
 assert.equal((await accepted.json()).status,'approved');
 const cookie=accepted.headers.get('set-cookie').split(';')[0];
 const auth={Cookie:cookie};
 assert.equal((await fetch(url+'/api/status',{headers:auth})).status,200);
 const none=await fetch(url+'/api/manifest',{headers:auth});assert.deepEqual((await none.json()).files,[]);
 const postUpload=(name,data,optional={})=>fetch(url+'/api/upload?name='+encodeURIComponent(name),{method:'POST',headers:{...auth,Origin:url,...optional},body:data});
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
 const notAllowed=await fetch(url+'/api/download?id=../../private.txt',{headers:auth});assert.equal(notAllowed.status,404);
 await share.addFiles([path.join(tmp,'public.txt')]);
 const manifest=await fetch(url+'/api/manifest',{headers:auth});const entries=(await manifest.json()).files;
 assert.equal(entries.length,1);assert.equal(entries[0].name,'public.txt');
 const download=await fetch(url+'/api/download?id='+entries[0].id,{headers:auth});
 assert.equal(download.status,200);assert.equal(await download.text(),'PUBLIC DATA');
 let doneCount=0;
 for(let i=0;i<80;i++){doneCount=share.status().transfers.filter(x=>x.status==='completed').length;if(doneCount>=2)break;await new Promise(resolve=>setTimeout(resolve,25));}
 assert.equal(doneCount,2,JSON.stringify(share.status().transfers));
 const client=share.status().clients[0];share.revoke(client.id);
 assert.equal((await fetch(url+'/api/status',{headers:auth})).status,401);
 await share.stop();assert.equal(share.status().running,false);
});

test('pairing rejection never gives session credentials',async t=>{
 const share=createLokiShare();t.after(()=>share.stop());
 await share.start('127.0.0.1');const {url,code}=share.status();
 const pair=await fetch(url+'/api/pair/request',{method:'POST',headers:{Origin:url,'Content-Type':'application/json'},body:JSON.stringify({join:code,device:'Other'})});
 const p=await pair.json();share.approve(p.id,false);
 const response=await fetch(url+`/api/pair/status?id=${p.id}&key=${p.key}`);
 assert.equal((await response.json()).status,'rejected');assert.equal(response.headers.get('set-cookie'),null);
});
