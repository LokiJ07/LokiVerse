const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { normalizeData, compareVersions, isWithinFolder } = require('../src/shared/logic.cjs');

test('data is clean and has predictable fields', () => {
  const empty = normalizeData(null);
  assert.deepEqual(empty, { tasks: [], notes: [], settings: { displayName: 'Creator', accent: 'purple' } });
  const result = normalizeData({
    tasks: [{ id: 'a', title: 'My task', priority: 'Invalid', completed: 1 }],
    notes: [{ id: 'b', title: 'Idea', body: 'Hello' }], settings: { displayName: 'Loki' }
  });
  assert.equal(result.tasks[0].priority, 'Normal');
  assert.equal(result.tasks[0].completed, false);
  assert.equal(result.notes[0].body, 'Hello');
  assert.equal(result.settings.displayName, 'Loki');
  assert.equal(result.settings.accent, 'purple');
  assert.equal(normalizeData({ settings: { accent: 'cyan' } }).settings.accent, 'cyan');
  assert.equal(normalizeData({ settings: { accent: '<script>' } }).settings.accent, 'purple');
});
test('semantic release comparison works', () => {
  assert.equal(compareVersions('v0.1.2', '0.1.1'), 1);
  assert.equal(compareVersions('0.2.0', '0.1.9'), 1);
  assert.equal(compareVersions('1.0.0', '1.0.0'), 0);
  assert.equal(compareVersions('1.0.0', '1.0.1'), -1);
});
test('paths outside selected folder are rejected', () => {
  const root = path.resolve('CNO', 'workspace');
  assert.equal(isWithinFolder(root, root), true);
  assert.equal(isWithinFolder(root, path.join(root, 'hello.txt')), true);
  assert.equal(isWithinFolder(root, path.resolve('CNO', 'workspace-unsafe')), false);
  assert.equal(isWithinFolder(root, path.join(root, '..', 'secret.txt')), false);
});
