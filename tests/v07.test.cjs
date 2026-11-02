'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const fsSync=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const https=require('node:https');
const {createFileOps}=require('../src/shared/fileops.cjs');
const {createLokiShare,parseDownloadRange}=require('../src/shared/lokishare.cjs');

test('v0.7 lexical range parsing accepts only a forward byte-offset',()=>{
 assert.equal(parseDownloadRange(undefined,100),null);
 assert.equal(parseDownloadRange('bytes=3-',100),3);
 for(const raw of ['bytes=100-','bytes=-3','bytes=1-4','bytes=0-,3-','bytes=foo-','bytes=-','bytes=00-','bytes=9999999999999999999-'])
   assert.throws(()=>parseDownloadRange(raw,100));
});

test('v0.7 copy operation stays within selected root and never overwrites',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'loki-copy-'));
 t.after(()=>fs.rm(root,{force:true,recursive:true}));
 const operations=createFileOps(root);
 await operations.createFolder('','Docs');
 await operations.createFolder('','Backup');
 await fs.writeFile(path.join(root,'Docs','note.txt'),'important contents');
 const copied=await operations.copyFile('Docs/note.txt','Backup');
 assert.equal(copied.destination,path.join('Backup','note.txt'));
 assert.equal(await fs.readFile(path.join(root,'Backup','note.txt'),'utf8'),'important contents');
 await assert.rejects(operations.copyFile('Docs/note.txt','Backup'),{code:'EEXIST'});
 await assert.rejects(operations.copyFile('Docs/note.txt','../../'),/Outside selected folder/);
 await assert.rejects(operations.copyFile('Docs','Backup'),/Only ordinary files/);
 await assert.rejects(operations.copyFile('Docs/note.txt','Docs'),/same/);
 assert.equal(await fs.readFile(path.join(root,'Docs','note.txt'),'utf8'),'important contents');
});

async function request(base, route, cert, cookie='', extra={}){
 return new Promise((resolve,reject)=>{
  const r=https.get(base+route,{ca:cert,headers:{...(cookie?{Cookie:cookie}:{}),...extra}},response=>{
   const parts=[];response.on('data',x=>parts.push(x));response.on('end',()=>resolve({status:response.statusCode,body:Buffer.concat(parts),headers:response.headers}));
  });r.on('error',reject);
 });
}
async function pair(share,cert){
 const url=share.status().url;
 const pair=await new Promise((resolve,reject)=>{
  const raw=Buffer.from(JSON.stringify({join:share.status().code,device:'v07 test'}));
  const r=https.request(url+'/api/pair/request',{method:'POST',ca:cert,headers:{Origin:url,'Content-Type':'application/json','Content-Length':raw.length}},res=>{
   const data=[];res.on('data',x=>data.push(x));res.on('end',()=>resolve(JSON.parse(Buffer.concat(data).toString('utf8'))));
  });r.on('error',reject);r.end(raw);
 });
 share.approve(pair.id,true);
 const accepted=await request(url,`/api/pair/status?id=${pair.id}&key=${pair.key}`,cert);
 return accepted.headers['set-cookie'][0].split(';')[0];
}
test('v0.7 HTTPS download supports verified ranges, stale validator fallback, 416 and auth',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'loki-range-'));
 const share=createLokiShare({identityDir:path.join(dir,'identity')});
 t.after(async()=>{await share.stop();await fs.rm(dir,{recursive:true,force:true});});
 const file=path.join(dir,'example.bin');
 const content=Buffer.from('LokiVerse secure download can resume partial content');
 await fs.writeFile(file,content);
 await share.start('127.0.0.1');
 const cert=JSON.parse(fsSync.readFileSync(path.join(dir,'identity','lokishare-tls-identity.json'),'utf8')).cert;
 const url=share.status().url;
 await share.addFiles([file]);
 const id=share.status().files[0].id;
 const route='/api/download?id='+id;
 assert.equal((await request(url,route,cert,'',{Range:'bytes=4-'})).status,401);
 const cookie=await pair(share,cert);
 const full=await request(url,route,cert,cookie);
 assert.equal(full.status,200);assert.deepEqual(full.body,content);
 assert.equal(full.headers['accept-ranges'],'bytes');
 const partial=await request(url,route,cert,cookie,{Range:'bytes=14-','If-Range':full.headers.etag});
 assert.equal(partial.status,206);
 assert.deepEqual(partial.body,content.subarray(14));
 assert.equal(partial.headers['content-range'],`bytes 14-${content.length-1}/${content.length}`);
 assert.deepEqual(Buffer.concat([full.body.subarray(0,14),partial.body]),content);
 const invalid=await request(url,route,cert,cookie,{Range:`bytes=${content.length}-`});
 assert.equal(invalid.status,416);assert.equal(invalid.headers['content-range'],`bytes */${content.length}`);
 const changedValidator=await request(url,route,cert,cookie,{Range:'bytes=14-','If-Range':'"wrong"'});
 assert.equal(changedValidator.status,200);assert.deepEqual(changedValidator.body,content);
 await fs.appendFile(file,'!');
 const changed=await request(url,route,cert,cookie);
 assert.equal(changed.status,409);
});
