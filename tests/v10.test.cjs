'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {createStorage,parseWorkspace,MAX_WORKSPACE_BYTES} = require('../src/shared/storage.cjs');

async function setup(t) {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(),'loki10-'));
  t.after(()=>fs.rm(folder,{recursive:true,force:true}));
  const file = path.join(folder,'lokiverse-data.json');
  return {storage:createStorage(file),file};
}
test('v1.0: missing primary automatically restores last good backup without clearing tasks',async t=>{
  const {storage,file}=await setup(t);
  await storage.write({tasks:[{id:'1',title:'Keep this task'}],notes:[{id:'a',title:'Keep this note'}]});
  await fs.rm(file);
  const result=await storage.read();
  assert.equal(result.recovered,true);
  assert.equal(result.preserved,null);
  assert.equal(result.data.tasks[0].title,'Keep this task');
  assert.equal((await storage.read()).data.notes[0].title,'Keep this note');
});
test('v1.0: missing primary cannot silently overwrite a valid existing backup',async t=>{
  const {storage,file}=await setup(t);
  await storage.write({notes:[{id:'1',title:'Precious',body:'Untouched'}]});
  await fs.rm(file);
  await assert.rejects(storage.write({notes:[],tasks:[]}),/missing but a backup exists/);
  assert.equal((await storage.read()).data.notes[0].body,'Untouched');
});
test('v1.0: valid JSON of incorrect shape is treated as corrupt, not as an empty workspace',async t=>{
  const {storage,file}=await setup(t);
  await storage.write({notes:[{id:'1',title:'Preserve'}]});
  await fs.writeFile(file,JSON.stringify({unrecognized:true}));
  const result=await storage.read();
  assert.equal(result.recovered,true);
  assert.equal(result.data.notes[0].title,'Preserve');
  assert.deepEqual(JSON.parse(await fs.readFile(result.preserved,'utf8')),{unrecognized:true});
  assert.throws(()=>parseWorkspace('[]'),/Invalid workspace structure/);
  assert.throws(()=>parseWorkspace('{"tasks":{},"notes":[]}'),/Invalid workspace structure/);
  assert.throws(()=>parseWorkspace('{"settings":null}'),/Invalid workspace structure/);
});
test('v1.0: invalid backup and missing primary refuses data loss and leaves backup untouched',async t=>{
  const {storage,file}=await setup(t);
  await fs.writeFile(storage.backupPath,'{"oops":true}');
  const original=await fs.readFile(storage.backupPath,'utf8');
  await assert.rejects(storage.read(),/Workspace could not load/);
  await assert.rejects(storage.write({tasks:[],notes:[]}),/backup exists/);
  assert.equal(await fs.readFile(storage.backupPath,'utf8'),original);
  await assert.rejects(fs.stat(file),{code:'ENOENT'});
});
test('v1.0: health check reports valid primary and backup, and missing/corrupt states without mutation',async t=>{
  const {storage,file}=await setup(t);
  assert.equal((await storage.health()).verdict,'new');
  await storage.write({tasks:[{id:'task',title:'One'}],notes:[{id:'note',title:'Two'}]});
  const healthy=await storage.health();
  assert.equal(healthy.verdict,'healthy');
  assert.equal(healthy.primary.tasks,1);
  assert.equal(healthy.backup.notes,1);
  await fs.writeFile(storage.backupPath,'broken');
  assert.equal((await storage.health()).verdict,'backup-needed');
  assert.equal((await storage.read()).data.notes.length,1);
  await fs.writeFile(file,'broken');
  assert.equal((await storage.health()).verdict,'attention');
});
test('v1.0: damaged primary stays untouched when backup cannot be validated',async t=>{
  const {storage,file}=await setup(t);
  await fs.writeFile(file,'oops');
  await fs.writeFile(storage.backupPath,'still-bad');
  await assert.rejects(storage.read(),/could not load/);
  assert.equal(await fs.readFile(file,'utf8'),'oops');
  assert.equal(await fs.readFile(storage.backupPath,'utf8'),'still-bad');
});
test('v1.0: old settings-only workspaces remain compatible and are backed up',async t=>{
  const {storage,file}=await setup(t);
  await fs.writeFile(file,JSON.stringify({settings:{displayName:'LokiJ',accent:'cyan'}}));
  assert.equal((await storage.read()).data.settings.accent,'cyan');
  assert.equal((await storage.health()).verdict,'healthy');
});
test('v1.0: the workspace parser rejects oversized raw data',()=>{
  assert.throws(()=>parseWorkspace(' '.repeat(MAX_WORKSPACE_BYTES+1)),/15 MB limit/);
});
