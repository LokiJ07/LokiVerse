'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const crypto=require('node:crypto');
const {localTLSIdentity}=require('../src/shared/tls-identity.cjs');

test('unique TLS identity persists across app releases and has valid signature',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'lv04-tls-'));
 t.after(()=>fs.rm(root,{force:true,recursive:true}));
 const x=await localTLSIdentity(root),y=await localTLSIdentity(root);
 assert.equal(x.fingerprint,y.fingerprint);
 assert.match(x.fingerprint,/^[0-9a-f]{64}$/);
 const cert=new crypto.X509Certificate(x.cert);
 assert.equal(cert.verify(crypto.createPublicKey(x.key)),true);
 assert.equal(cert.checkPrivateKey(crypto.createPrivateKey(x.key)),true);
 assert.ok(Date.parse(cert.validTo)>Date.now());
 await fs.writeFile(path.join(root,'lokishare-tls-identity.json'),'{bad');
 await assert.rejects(()=>localTLSIdentity(root),/identity is invalid/);
});
