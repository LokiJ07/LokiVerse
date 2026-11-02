'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const constants = require('node:fs').constants;
const { normalizeData } = require('./logic.cjs');

/** Maintain a last-known-good .bak and preserve corrupt originals for inspection.
 * The caller serializes writes, so two saves never compete for the temp path. */
function createStorage(filePath) {
  const backupPath = `${filePath}.bak`;
  const parse = text => normalizeData(JSON.parse(text));

  async function read() {
    try {
      const data = parse(await fs.readFile(filePath, 'utf8'));
      // Seed a recovery copy on first launch after upgrading from v0.1.0.
      try { await fs.copyFile(filePath, backupPath, constants.COPYFILE_EXCL); }
      catch (error) { if (error.code !== 'EEXIST') { /* A read may still succeed on read-only storage. */ } }
      return { data, recovered: false };
    } catch (error) {
      if (error.code === 'ENOENT') return { data: normalizeData({}), recovered: false };
      // Attempt recovery only after a corrupt/unreadable existing primary.
      let previous;
      try { previous = parse(await fs.readFile(backupPath, 'utf8')); }
      catch { throw new Error(`Workspace could not load. Your original file remains unchanged. ${error.message}`); }
      const preserved = `${filePath}.corrupt-${Date.now()}.json`;
      await fs.copyFile(filePath, preserved);
      await fs.copyFile(backupPath, filePath);
      return { data: previous, recovered: true, preserved };
    }
  }

  async function write(raw) {
    const normalized = normalizeData(raw);
    const json = JSON.stringify(normalized, null, 2);
    if (Buffer.byteLength(json) > 15 * 1024 * 1024) throw new Error('Workspace exceeds the 15 MB limit.');
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const temp = `${filePath}.${process.pid}.tmp`;
    try {
      // Never replace a valid backup with already-corrupted primary contents.
      try {
        const previous = await fs.readFile(filePath, 'utf8');
        parse(previous);
        await fs.copyFile(filePath, backupPath);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw new Error(`Existing workspace requires recovery before saving: ${error.message}`);
        }
      }
      await fs.writeFile(temp, json, { encoding: 'utf8', mode: 0o600 });
      await fs.rename(temp, filePath);
      return normalized;
    } finally {
      await fs.rm(temp, { force: true }).catch(() => {});
    }
  }
  return { read, write, backupPath };
}
module.exports = { createStorage };
