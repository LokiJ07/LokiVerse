'use strict';
const { test }=require('node:test');
const assert=require('node:assert/strict');
const {PORT,MAGIC,broadcastFor,makeBeacon,createDiscoveryBroadcaster}=require('../src/shared/discovery.cjs');
test('discovery uses the chosen private subnet broadcast (and rejects bad masks)',()=>{
  assert.equal(broadcastFor('192.168.0.17','255.255.255.0'),'192.168.0.255');
  assert.equal(broadcastFor('10.1.2.3','255.255.0.0'),'10.1.255.255');
  assert.equal(broadcastFor('172.16.8.100','255.255.255.192'),'172.16.8.127');
  assert.equal(broadcastFor('10.1.2.3','255.0.255.0'),null);
  assert.equal(broadcastFor('192.168.0.5','255.255.255.255'),null);
  assert.equal(broadcastFor('999.1.2.3','255.255.0.0'),null);
});
test('beacons reveal no secrets, filenames, certificate pins or auth tokens',()=>{
  assert.equal(PORT,43961);
  const payload=JSON.parse(makeBeacon('192.168.10.7',34127,'PC<secret>\n').toString('utf8'));
  assert.deepEqual(Object.keys(payload).sort(),['address','magic','name','port']);
  assert.equal(payload.magic,MAGIC);assert.equal(payload.name,'PCsecret');
  assert.equal(payload.port,34127);
  assert.throws(()=>makeBeacon('192.168.1.1',70000,'PC'),/port/i);
  assert.throws(()=>makeBeacon('invalid',1234,'PC'),/address/i);
});
test('unavailable/unauthorized discovery does not prevent secure HTTPS pairing',async()=>{
  const ad=createDiscoveryBroadcaster();
  assert.deepEqual(await ad.start('203.0.113.20',1234),{active:false,reason:'Not a local interface.'});
  ad.stop();ad.stop();
});
