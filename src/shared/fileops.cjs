'use strict';
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { isWithinFolder } = require('./logic.cjs');
const MAX_SCAN = 10000;
function validName(name) {
  return typeof name === 'string' && name.length > 0 && name.length <= 180 &&
    name !== '.' && name !== '..' && !/[\\/\x00-\x1f<>:"|?*]/.test(name) && !/[. ]$/.test(name) &&
    !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i.test(name);
}
async function resolveInside(root, relative = '') {
  if(typeof relative !== 'string' || relative.length > 4096) throw Error('Invalid path.');
  const candidate=path.resolve(root,relative);
  if(!isWithinFolder(root,candidate)) throw Error('Outside selected folder.');
  const real=await fs.realpath(candidate);
  if(!isWithinFolder(root,real)) throw Error('Link escapes selected folder.');
  return real;
}
function createFileOps(root) {
  async function folder(parent) {
    const real=await resolveInside(root,parent);
    if(!(await fs.stat(real)).isDirectory()) throw Error('Not a folder.');
    return real;
  }
  async function createFolder(relative, name) {
    if(!validName(name)) throw Error('Invalid folder name.');
    const parent=await folder(relative);
    const target=path.join(parent,name);
    if(!isWithinFolder(root,target)) throw Error('Invalid path.');
    await fs.mkdir(target);
    return { name };
  }
  async function rename(relative, name) {
    if(!validName(name)) throw Error('Invalid new name.');
    const existing=path.resolve(root,relative);
    if(!isWithinFolder(root,existing) || existing===root) throw Error('Cannot rename selected root.');
    const stat=await fs.lstat(existing);
    if(stat.isSymbolicLink()) throw Error('Renaming links is disabled.');
    await resolveInside(root,relative);
    const target=path.join(path.dirname(existing),name);
    if(!isWithinFolder(root,target)) throw Error('Invalid destination.');
    // Never overwrite existing files, including symlinks. Windows rename is not no-replace by itself.
    try { await fs.lstat(target); throw Error('A file or folder with that name exists.'); }
    catch(err) { if(err.code!=='ENOENT') throw err; }
    await fs.rename(existing,target);
    return { name };
  }
  async function scan({ query='', duplicates=false }={}) {
    if(typeof query !== 'string' || query.length > 120) throw Error('Search is too long.');
    const term=query.trim().toLowerCase();
    const stack=[{absolute:root,depth:0}];
    let scanned=0, skipped=0, truncated=false;
    const matches=[], candidates=[];
    while(stack.length) {
      if(scanned>=MAX_SCAN) { truncated=true; break; }
      const {absolute,depth}=stack.pop();
      let children;
      try { children=await fs.readdir(absolute,{withFileTypes:true}); }
      catch { skipped++; continue; }
      for(const item of children) {
        if(scanned>=MAX_SCAN) { truncated=true; break; }
        scanned++;
        if(item.isSymbolicLink()) { skipped++;continue; } // do not follow links/junction-like entries
        const full=path.join(absolute,item.name);
        const relative=path.relative(root,full);
        const directory=item.isDirectory();
        if(!directory && !item.isFile()) { skipped++;continue; }
        let st;try{st=await fs.stat(full);}catch{skipped++;continue;}
        const entry={name:item.name,relative,directory,size:directory?0:st.size,modified:st.mtime.toISOString()};
        if(!duplicates && item.name.toLowerCase().includes(term) && matches.length<1000) matches.push(entry);
        if(duplicates && !directory && st.size>0 && st.size<=100*1024*1024 && candidates.length<2500) candidates.push(entry);
        if(directory && depth<10) stack.push({absolute:full,depth:depth+1});
        else if(directory) skipped++;
      }
    }
    if(!duplicates) return {mode:'search',results:matches,scanned,skipped,truncated:truncated||matches.length>=1000};
    const bySize=new Map();
    for(const file of candidates) {const key=file.size;if(!bySize.has(key))bySize.set(key,[]);bySize.get(key).push(file);}
    const possible=[...bySize.values()].filter(items=>items.length>1).flat().slice(0,150);
    const byHash=new Map();
    let hashed=0;
    for(const item of possible) {
      try {
        const digest=await new Promise((resolve,reject)=>{
          const hash=crypto.createHash('sha256');const stream=fsSync.createReadStream(path.join(root,item.relative));
          stream.on('data',chunk=>hash.update(chunk));stream.on('error',reject);stream.on('end',()=>resolve(hash.digest('hex')));
        });
        hashed++;
        const key=`${item.size}:${digest}`;
        if(!byHash.has(key))byHash.set(key,[]);byHash.get(key).push(item);
      }catch{skipped++;}
    }
    return {mode:'duplicates',groups:[...byHash.values()].filter(group=>group.length>1),scanned,skipped,hashed,truncated:truncated||possible.length>=150||candidates.length>=2500};
  }
  return { createFolder,rename,scan };
}
module.exports={createFileOps,resolveInside,validName};
