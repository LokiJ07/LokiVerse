'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {createFileOps,resolveInside,validName}=require('../src/shared/fileops.cjs');
const {dueReminders}=require('../src/shared/reminders.cjs');
const {normalizeData}=require('../src/shared/logic.cjs');

test('older v0.1.1 data gets optional v0.2.0 fields',()=>{
 const old=normalizeData({tasks:[{id:'a',title:'Existing',due:'2026-11-03'}],notes:[{id:'b',body:'Before upgrade'}],settings:{displayName:'Loki',accent:'cyan'}});
 assert.equal(old.tasks[0].category,'General');assert.equal(old.tasks[0].dueTime,'');
 assert.equal(old.notes[0].folder,'General');assert.equal(old.notes[0].pinned,false);
 assert.equal(old.settings.reminders,true);assert.equal(old.settings.accent,'cyan');
 const newData=normalizeData({tasks:[{id:'x',title:'X',category:'Development',dueTime:'12:30'}],notes:[{id:'y',title:'Y',pinned:true,folder:'Ideas'}],settings:{reminders:false,compactMode:true}});
 assert.equal(newData.tasks[0].category,'Development');assert.equal(newData.tasks[0].dueTime,'12:30');
 assert.equal(newData.notes[0].pinned,true);assert.equal(newData.settings.reminders,false);
});
test('due reminders fire only for pending tasks due within past 24 hours',()=>{
 const tasks=[{id:'due',title:'Due',due:'2026-11-02',dueTime:'09:00'},
  {id:'done',title:'Done',completed:true,due:'2026-11-02',dueTime:'09:00'},
  {id:'future',title:'Later',due:'2026-11-03',dueTime:'09:00'},
  {id:'old',title:'Old',due:'2026-10-28',dueTime:'09:00'}];
 const time=new Date('2026-11-02T10:00:00');
 assert.deepEqual(dueReminders({tasks},time,new Set()).map(x=>x.id),['due']);
 assert.equal(dueReminders({tasks},time,new Set(['due|2026-11-02|09:00'])).length,0);
 assert.equal(dueReminders({tasks,settings:{reminders:false}},time,new Set()).length,0);
});
test('directory operations prevent traversal, overwrite and invalid Windows names',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'lokiverse-files-'));
 t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const ops=createFileOps(root);
 await ops.createFolder('','Documents');
 await fs.writeFile(path.join(root,'Documents','a.txt'),'test');
 await assert.rejects(ops.createFolder('','../escape'),/Invalid folder name/);
 await assert.rejects(ops.createFolder('','CON'),/Invalid folder name/);
 await assert.rejects(ops.rename('Documents/a.txt','../no'),/Invalid new name/);
 await assert.rejects(ops.rename('','anything'),/Cannot rename selected root/);
 await fs.writeFile(path.join(root,'Documents','b.txt'),'other');
 await assert.rejects(ops.rename('Documents/a.txt','b.txt'),/exists/);
 await ops.rename('Documents/a.txt','renamed.txt');
 assert.equal(await fs.readFile(path.join(root,'Documents','renamed.txt'),'utf8'),'test');
 await assert.rejects(resolveInside(root,'../'),/Outside selected folder/);
 assert.equal(validName('valid.txt'),true);
});
test('lexical traversal is rejected before canonical/symlink checks',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'lokiverse-traversal-'));
 t.after(()=>fs.rm(root,{recursive:true,force:true}));
 assert.equal(await resolveInside(root,''),await fs.realpath(root));
 await assert.rejects(resolveInside(root,'../'),/Outside selected folder/);
 await assert.rejects(resolveInside(root,path.join('..','missing-file')),/Outside selected folder/);
});

test('a linked/junction selected root works, but links escaping it are denied',async t=>{
 const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'lokiverse-alias-'));
 t.after(()=>fs.rm(tmp,{recursive:true,force:true}));
 const physicalRoot=path.join(tmp,'actual');
 const aliasRoot=path.join(tmp,'alias');
 const outside=path.join(tmp,'outside');
 await fs.mkdir(physicalRoot);
 await fs.mkdir(outside);
 // Windows junctions do not require elevated symlink permissions.
 const kind=process.platform==='win32'?'junction':'dir';
 try { await fs.symlink(physicalRoot,aliasRoot,kind); }
 catch(err) {
   if(['EPERM','EACCES','ENOTSUP','EOPNOTSUPP'].includes(err.code)) { t.skip(`Links unavailable: ${err.code}`);return; }
   throw err;
 }
 assert.equal(await resolveInside(aliasRoot,''),await fs.realpath(physicalRoot));
 const ops=createFileOps(aliasRoot);
 await ops.createFolder('','Docs');
 await fs.writeFile(path.join(physicalRoot,'Docs','note.txt'),'hello');
 assert.equal((await ops.scan({query:'note'})).results[0].relative,path.join('Docs','note.txt'));
 await ops.rename('Docs/note.txt','updated.txt');
 assert.equal(await fs.readFile(path.join(physicalRoot,'Docs','updated.txt'),'utf8'),'hello');
 await assert.rejects(resolveInside(aliasRoot,'../'),/Outside selected folder/);
 const escape=path.join(physicalRoot,'escape');
 try { await fs.symlink(outside,escape,kind); }
 catch(err) {
   if(['EPERM','EACCES','ENOTSUP','EOPNOTSUPP'].includes(err.code)) { t.diagnostic(`Escape-link test unavailable: ${err.code}`);return; }
   throw err;
 }
 await assert.rejects(resolveInside(aliasRoot,'escape'),/Link escapes selected folder/);
 await assert.rejects(ops.createFolder('escape','Unsafe'),/Link escapes selected folder/);
 assert.deepEqual(await fs.readdir(outside),[]);
});

test('recursive search and sha256 duplicate grouping are bounded and read-only',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'lokiverse-search-'));
 t.after(()=>fs.rm(root,{recursive:true,force:true}));
 await fs.mkdir(path.join(root,'Deep'));
 await fs.writeFile(path.join(root,'same.txt'),'duplicate content');
 await fs.writeFile(path.join(root,'Deep','copy.txt'),'duplicate content');
 await fs.writeFile(path.join(root,'Deep','other.txt'),'unique content');
 const ops=createFileOps(root), match=await ops.scan({query:'copy'});
 assert.equal(match.results.length,1);
 assert.equal(match.results[0].relative,path.join('Deep','copy.txt'));
 const dup=await ops.scan({duplicates:true});
 assert.equal(dup.groups.length,1);
 assert.equal(dup.groups[0].length,2);
 assert.equal(dup.hashed,2);
});
