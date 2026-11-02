'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const constants = require('node:fs').constants;
const { normalizeData } = require('./logic.cjs');

const MAX_WORKSPACE_BYTES = 15 * 1024 * 1024;

/** The workspace is deliberately backward-compatible: old settings-only JSON
 * is valid, but JSON arrays or unrelated objects must never silently become
 * an empty workspace after corruption or an incorrect import. */
function parseWorkspace(text) {
  if (Buffer.byteLength(text, 'utf8') > MAX_WORKSPACE_BYTES)
    throw new Error('Workspace exceeds the 15 MB limit.');
  const raw = JSON.parse(text);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) ||
      !('tasks' in raw || 'notes' in raw || 'settings' in raw) ||
      ('tasks' in raw && !Array.isArray(raw.tasks)) ||
      ('notes' in raw && !Array.isArray(raw.notes)) ||
      ('settings' in raw && (!raw.settings || typeof raw.settings !== 'object' || Array.isArray(raw.settings)))) {
    throw new Error('Invalid workspace structure. Original file was not changed.');
  }
  return normalizeData(raw);
}
function createStorage(filePath) {
  const backupPath = `${filePath}.bak`;
  async function loadFile(filename) {
    const stat = await fs.stat(filename);
    if (stat.size > MAX_WORKSPACE_BYTES) throw new Error('Workspace exceeds the 15 MB limit.');
    return parseWorkspace(await fs.readFile(filename, 'utf8'));
  }
  async function restoreBackup({preserveOriginal = false} = {}) {
    // Validate backup BEFORE modifying anything. Otherwise a damaged backup
    // could replace a damaged-but-recoverable primary workspace.
    const data = await loadFile(backupPath);
    const preserved = preserveOriginal ? `${filePath}.corrupt-${Date.now()}-${crypto.randomBytes(3).toString('hex')}.json` : null;
    if (preserved) await fs.copyFile(filePath, preserved, constants.COPYFILE_EXCL);
    const temp = `${filePath}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.restore.tmp`;
    try {
      await fs.copyFile(backupPath, temp, constants.COPYFILE_EXCL);
      await fs.rename(temp, filePath);
    } finally { await fs.rm(temp, {force:true}).catch(()=>{}); }
    return {data, recovered:true, preserved};
  }
  async function read() {
    try {
      const data = await loadFile(filePath);
      // First launch after an older version: seed backup without replacing
      // an existing last-known-good backup.
      try { await fs.copyFile(filePath, backupPath, constants.COPYFILE_EXCL); }
      catch (error) { if (error.code !== 'EEXIST') { /* keep read-only workspaces usable */ } }
      return {data, recovered:false};
    } catch (error) {
      const missing = error.code === 'ENOENT';
      // Permission and device errors are not corruption: do not attempt to
      // write/restore over a file the OS refused to read.
      if (error.code && !missing)
        throw new Error(`Workspace could not be read (${error.code}). Existing files were not changed.`);
      if (missing) {
        try { await fs.access(backupPath); }
        catch (check) {
          if (check.code === 'ENOENT') return {data:normalizeData({}), recovered:false};
          throw new Error(`Cannot inspect workspace backup: ${check.message}`);
        }
      }
      try { return await restoreBackup({preserveOriginal:!missing}); }
      catch (backupError) {
        throw new Error(`Workspace could not load. No existing data was overwritten. Primary: ${error.message}; backup: ${backupError.message}`);
      }
    }
  }
  async function write(raw) {
    const normalized = normalizeData(raw);
    const json = JSON.stringify(normalized, null, 2);
    if (Buffer.byteLength(json, 'utf8') > MAX_WORKSPACE_BYTES) throw new Error('Workspace exceeds the 15 MB limit.');
    await fs.mkdir(path.dirname(filePath), {recursive:true});
    const temp = `${filePath}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`;
    try {
      // Before a write, never overwrite the last-good .bak from an invalid
      // or missing primary. A missing primary with an existing backup demands
      // explicit recovery; otherwise we'd silently replace the user's data.
      try {
        await loadFile(filePath);
        // Replace last-known-good backup atomically. A power loss while
        // creating the new copy must not truncate the old recovery copy.
        const backupTemp = `${backupPath}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`;
        try {
          await fs.copyFile(filePath, backupTemp, constants.COPYFILE_EXCL);
          await fs.rename(backupTemp, backupPath);
        } finally { await fs.rm(backupTemp, {force:true}).catch(()=>{}); }
      } catch (error) {
        if (error.code !== 'ENOENT') throw new Error(`Existing workspace requires recovery before saving: ${error.message}`);
        try {await fs.access(backupPath);throw new Error('Workspace is missing but a backup exists. Recover it before saving.');}
        catch (backupError) {if(backupError.code!=='ENOENT')throw backupError;}
      }
      await fs.writeFile(temp,json,{encoding:'utf8',mode:0o600,flag:'wx'});
      await fs.rename(temp,filePath);
      // New workspaces also get a recovery copy after first successful write.
      try { await fs.copyFile(filePath,backupPath,constants.COPYFILE_EXCL); }
      catch (error) { if(error.code!=='EEXIST') { /* primary save is already committed */ } }
      return normalized;
    } finally { await fs.rm(temp,{force:true}).catch(()=>{}); }
  }
  async function health() {
    async function check(filename) {
      try {
        const stat=await fs.stat(filename);
        const data=await loadFile(filename);
        return {status:'healthy', bytes:stat.size, modified:stat.mtime.toISOString(), tasks:data.tasks.length, notes:data.notes.length};
      } catch (error) {
        if (error.code==='ENOENT') return {status:'missing'};
        return {status:'invalid', reason:error.message.slice(0,160)};
      }
    }
    const [primary,backup]=await Promise.all([check(filePath),check(backupPath)]);
    let verdict='healthy';
    if(primary.status==='missing' && backup.status==='missing') verdict='new';
    else if(primary.status!=='healthy') verdict=backup.status==='healthy'?'recoverable':'attention';
    else if(backup.status!=='healthy') verdict='backup-needed';
    return {verdict,primary,backup};
  }
  return {read,write,health,backupPath};
}
module.exports={createStorage,parseWorkspace,MAX_WORKSPACE_BYTES};
