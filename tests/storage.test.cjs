'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createStorage } = require('../src/shared/storage.cjs');

async function workspace(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'lokiverse-test-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const target = path.join(dir, 'lokiverse-data.json');
  return { ...createStorage(target), target };
}

test('writes workspace, keeps last-good backup and reads v0.1.0-compatible data', async t => {
  const storage = await workspace(t);
  const old = { tasks: [{ id:'t1', title:'My original task', completed:false, priority:'Normal', due:'' }],
    notes: [{ id:'n1', title:'Existing note', body:'Keep me' }], settings: { displayName:'LokiJ' } };
  const first = await storage.write(old);
  assert.equal(first.settings.accent, 'purple'); // new optional setting does not break older data
  await storage.write({ ...old, notes:[{ id:'n1', title:'Updated note', body:'Keep me and more' }] });
  const backup = JSON.parse(await fs.readFile(storage.backupPath, 'utf8'));
  assert.equal(backup.notes[0].body, 'Keep me');
  const current = await storage.read();
  assert.equal(current.data.notes[0].body, 'Keep me and more');
  assert.equal(current.data.settings.displayName, 'LokiJ');
  assert.equal(current.recovered, false);
});

test('recovers from corrupt primary without deleting original damaged file', async t => {
  const storage = await workspace(t);
  const initial = { tasks: [{ id:'t1', title:'Original task' }], notes:[{ id:'n1', title:'Original idea', body:'Do not lose me' }] };
  await storage.write(initial);
  await storage.write({ ...initial, notes:[{ id:'n1', title:'Newer version', body:'Updated' }] });
  await fs.writeFile(storage.target, '{broken JSON');
  const result = await storage.read();
  assert.equal(result.recovered, true);
  assert.equal(result.data.notes[0].body, 'Do not lose me');
  assert.equal(await fs.readFile(result.preserved, 'utf8'), '{broken JSON');
  const readable = JSON.parse(await fs.readFile(storage.target,'utf8'));
  assert.equal(readable.notes[0].body, 'Do not lose me');
});

test('does not overwrite corrupt primary data when no usable backup exists', async t => {
  const storage = await workspace(t);
  await fs.writeFile(storage.target, '[not valid');
  await assert.rejects(storage.write({tasks:[], notes:[]}), /requires recovery/);
  assert.equal(await fs.readFile(storage.target,'utf8'), '[not valid');
  await assert.rejects(storage.read(), /could not load/);
});

test('new workspace starts clean and does not require a backup file', async t => {
  const storage=await workspace(t);
  const initial=await storage.read();
  assert.equal(initial.recovered,false);
  assert.equal(initial.data.settings.accent,'purple');
  await storage.write({settings:{displayName:'New',accent:'cyan'}});
  assert.equal((await storage.read()).data.settings.accent,'cyan');
});

test('backup recovery allows saving again', async t => {
  const storage = await workspace(t);
  await storage.write({ notes:[{ id:'x', title:'First', body:'first' }] });
  await storage.write({ notes:[{ id:'x', title:'Second', body:'second' }] });
  await fs.writeFile(storage.target,'not json');
  await storage.read();
  await storage.write({ notes:[{ id:'x', title:'Third', body:'third' }] });
  assert.equal((await storage.read()).data.notes[0].body,'third');
});

test('first launch with a v0.1.0 workspace seeds a recovery copy without changing original', async t => {
  const storage = await workspace(t);
  const oldJson = JSON.stringify({
    tasks:[{id:'a',title:'Keep old task',priority:'High',completed:false}],
    notes:[{id:'b',title:'Keep old note',body:'Unchanged'}],
    settings:{displayName:'Original'}
  });
  await fs.writeFile(storage.target, oldJson);
  const result = await storage.read();
  assert.equal(result.data.tasks[0].title,'Keep old task');
  assert.equal(result.data.settings.accent,'purple');
  assert.equal(await fs.readFile(storage.target,'utf8'), oldJson);
  assert.equal(await fs.readFile(storage.backupPath,'utf8'), oldJson);
});
