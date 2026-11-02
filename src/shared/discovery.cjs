'use strict';
// Optional LAN advertisement. This packet contains NO QR join secret, credentials,
// certificate fingerprint or user files. Discovery is UNTRUSTED until QR-pinned.
const dgram = require('node:dgram');
const os = require('node:os');
const PORT = 43961;
const MAGIC = 'lokishare-discovery-v1';
function broadcastFor(address, mask) {
  const parse = value => {
    if (!/^(?:\d{1,3}\.){3}\d{1,3}$/.test(value || '')) return null;
    const v=value.split('.').map(Number);
    return v.every(x=>x>=0&&x<256)?v:null;
  };
  const ip=parse(address),netmask=parse(mask);
  if(!ip||!netmask)return null;
  // Refuse noncontiguous masks or /31 and /32 (no useful broadcast).
  let bits=0,seenZero=false;
  for(const byte of netmask)for(let bit=7;bit>=0;bit--){const one=(byte>>bit)&1;if(one&&seenZero)return null;if(one)bits++;else seenZero=true;}
  if(bits<8||bits>30)return null;
  return ip.map((octet,index)=>(octet | (~netmask[index] & 255))).join('.');
}
function makeBeacon(address,port,name) {
  if(!/^(?:\d{1,3}\.){3}\d{1,3}$/.test(address))throw Error('Invalid LAN address.');
  if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid port.');
  return Buffer.from(JSON.stringify({magic:MAGIC,address,port,name:String(name||'LokiVerse PC').replace(/[\x00-\x1f<>]/g,'').slice(0,48)}),'utf8');
}
function createDiscoveryBroadcaster() {
  let socket=null,timer=null;
  async function start(address,port) {
    stop();
    const iface=Object.values(os.networkInterfaces()).flatMap(x=>x||[]).find(x=>x.address===address&&x.family==='IPv4'&&!x.internal);
    if(!iface) return {active:false,reason:'Not a local interface.'};
    const broadcast=broadcastFor(address,iface.netmask);
    if(!broadcast)return {active:false,reason:'No compatible broadcast address.'};
    const payload=makeBeacon(address,port,os.hostname());
    const udp=dgram.createSocket('udp4');
    try {
      await new Promise((resolve,reject)=>{udp.once('error',reject);udp.bind(0,address,()=>{udp.removeAllListeners('error');resolve();});});
      udp.setBroadcast(true);
    }catch(err){udp.close();return {active:false,reason:err.message};}
    socket=udp;
    const announce=()=>{if(socket===udp)udp.send(payload,PORT,broadcast,()=>{});};
    announce();timer=setInterval(announce,2500);timer.unref?.();
    return {active:true};
  }
  function stop(){if(timer){clearInterval(timer);timer=null;}if(socket){const old=socket;socket=null;try{old.close();}catch{}}}
  return {start,stop};
}
module.exports={PORT,MAGIC,broadcastFor,makeBeacon,createDiscoveryBroadcaster};
