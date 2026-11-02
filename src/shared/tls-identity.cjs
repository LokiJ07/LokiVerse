'use strict';
// Generate a per-install self-signed X.509 certificate using Node's crypto primitives.
// No shared/embedded private key and no external OpenSSL executable is required.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

function asn(tag, content) {
  const data=Buffer.isBuffer(content)?content:Buffer.from(content);
  const len=data.length;
  const length=len<128?Buffer.from([len]):len<256?Buffer.from([0x81,len]):len<65536?Buffer.from([0x82,len>>8,len&255]):Buffer.from([0x83,(len>>16)&255,(len>>8)&255,len&255]);
  return Buffer.concat([Buffer.from([tag]),length,data]);
}
const join=(...parts)=>Buffer.concat(parts);
const seq=(...items)=>asn(0x30,join(...items));
const oid=value=>asn(0x06,Buffer.from(value));
const oidCommonName=oid([0x55,0x04,0x03]);
const sha256RSA=seq(oid([0x2a,0x86,0x48,0x86,0xf7,0x0d,0x01,0x01,0x0b]),asn(0x05,Buffer.alloc(0)));
// Strict ASN.1 DER requires a minimal, positive INTEGER. A leading 0x00 byte
// makes otherwise valid random serial numbers intermittently fail X.509 parsing.
function safeSerial(raw) {
  const serial=Buffer.from(raw);
  if(!serial.length)throw Error('Certificate serial must be non-empty.');
  serial[0] &= 0x7f;
  if(serial[0] === 0)serial[0]=1;
  return serial;
}
function makeCertificate() {
  const {publicKey,privateKey}=crypto.generateKeyPairSync('rsa',{modulusLength:3072,publicExponent:0x10001});
  const name=seq(asn(0x31,seq(oidCommonName,asn(0x0c,Buffer.from('LokiVerse LAN')))));
  const generalized=t=>asn(0x18,Buffer.from(t.toISOString().replace(/[-:T]/g,'').replace(/\.\d{3}Z$/,'Z')));
  const start=new Date(Date.now()-86400000),end=new Date(Date.now()+1000*86400000);
  const serial=safeSerial(crypto.randomBytes(16));
  const san=seq(asn(0x82,Buffer.from('localhost')),asn(0x87,Buffer.from([127,0,0,1])));
  const ext=seq(oid([0x55,0x1d,0x11]),asn(0x04,san));
  const tbs=seq(
    asn(0xa0,asn(0x02,Buffer.from([2]))),asn(0x02,serial),sha256RSA,name,
    seq(generalized(start),generalized(end)),name,
    publicKey.export({type:'spki',format:'der'}),asn(0xa3,seq(ext))
  );
  const signature=crypto.sign('RSA-SHA256',tbs,privateKey);
  const der=seq(tbs,sha256RSA,asn(0x03,Buffer.concat([Buffer.from([0]),signature])));
  const cert='-----BEGIN CERTIFICATE-----\n'+der.toString('base64').match(/.{1,64}/g).join('\n')+'\n-----END CERTIFICATE-----\n';
  return {private:privateKey.export({format:'pem',type:'pkcs8'}),cert};
}
function fingerprint(cert) {
  return new crypto.X509Certificate(cert).fingerprint256.replaceAll(':','').toLowerCase();
}
async function localTLSIdentity(dir) {
  await fs.mkdir(dir,{recursive:true,mode:0o700});
  const filename=path.join(dir,'lokishare-tls-identity.json');
  try {
    const data=JSON.parse(await fs.readFile(filename,'utf8'));
    const cert=new crypto.X509Certificate(data.cert);
    const key=crypto.createPrivateKey(data.private);
    if(!cert.checkPrivateKey(key))throw Error('Mismatched TLS keys.');
    if(Date.parse(cert.validTo)<=Date.now()+14*86400000)throw Error('TLS certificate expires soon; rotate it explicitly.');
    return {key:data.private,cert:data.cert,fingerprint:fingerprint(data.cert)};
  }catch(e){
    if(e.code!=='ENOENT')throw Error('LokiShare TLS identity is invalid or expired. Back up and remove share-security/lokishare-tls-identity.json to rotate and re-pair.');
  }
  const created=makeCertificate();
  const temp=filename+'.'+crypto.randomBytes(6).toString('hex')+'.tmp';
  await fs.writeFile(temp,JSON.stringify(created),{flag:'wx',mode:0o600});
  try{await fs.rename(temp,filename);}catch(e){await fs.rm(temp,{force:true});throw e;}
  return {key:created.private,cert:created.cert,fingerprint:fingerprint(created.cert)};
}
module.exports={localTLSIdentity,fingerprint,makeCertificate,safeSerial};
