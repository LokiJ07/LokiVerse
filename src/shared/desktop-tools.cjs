'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const {isWithinFolder} = require('./logic.cjs');
const {resolveInside} = require('./fileops.cjs');

const MAX_ENTRIES=10000;
const MAX_DEPTH=10;
const PREVIEW_MAX_BYTES=128*1024;
const PREVIEW_EXTENSIONS=new Set(['.txt','.md','.markdown','.log','.json','.jsonl','.csv','.tsv','.yaml','.yml','.xml','.html','.css','.js','.cjs','.mjs','.ts','.py','.java','.gradle','.properties','.ini','.conf','.sh','.bat','.ps1']);
const CATEGORIES={
  Images:new Set(['.jpg','.jpeg','.png','.webp','.gif','.bmp','.svg','.heic']),
  Documents:new Set(['.pdf','.doc','.docx','.txt','.md','.csv','.xlsx','.xls','.ppt','.pptx','.rtf']),
  Audio:new Set(['.mp3','.wav','.flac','.ogg','.m4a','.aac']),
  Video:new Set(['.mp4','.mkv','.mov','.webm','.avi','.wmv']),
  Archives:new Set(['.zip','.7z','.rar','.tar','.gz']),
  Code:new Set(['.js','.cjs','.mjs','.ts','.jsx','.tsx','.py','.java','.cpp','.c','.h','.json','.yaml','.yml','.html','.css','.php','.go','.rs'])
};
function fileCategory(name) {
  const ext=path.extname(name).toLowerCase();
  return Object.entries(CATEGORIES).find(([,extensions])=>extensions.has(ext))?.[0]||'Other';
}
async function folderInsights(root){
  const canonicalRoot=await fs.realpath(root);
  const stack=[{absolute:canonicalRoot,depth:0}];
  const counts={Images:0,Documents:0,Audio:0,Video:0,Archives:0,Code:0,Other:0};
  const sizeByCategory=Object.fromEntries(Object.keys(counts).map(key=>[key,0]));
  const largest=[];
  let files=0,folders=0,bytes=0,scanned=0,skipped=0,truncated=false;
  while(stack.length){
    if(scanned>=MAX_ENTRIES){truncated=true;break;}
    const {absolute,depth}=stack.pop();
    let children;
    try{children=await fs.readdir(absolute,{withFileTypes:true});}
    catch {skipped++;continue;}
    for(const entry of children){
      if(scanned>=MAX_ENTRIES){truncated=true;break;}
      scanned++;
      if(entry.isSymbolicLink()){skipped++;continue;}
      const full=path.join(absolute,entry.name);
      if(entry.isDirectory()){
        folders++;
        if(depth>=MAX_DEPTH){skipped++;truncated=true;continue;}
        // Windows junctions and reparse points may appear as directories.
        // Never descend unless the canonical destination is inside the root.
        try{const real=await fs.realpath(full);if(!isWithinFolder(canonicalRoot,real)){skipped++;continue;}stack.push({absolute:real,depth:depth+1});}
        catch{skipped++;}
        continue;
      }
      if(!entry.isFile()){skipped++;continue;}
      let stat;
      try{stat=await fs.stat(full);}catch{skipped++;continue;}
      files++;bytes+=stat.size;
      const category=fileCategory(entry.name);counts[category]++;sizeByCategory[category]+=stat.size;
      const item={name:entry.name,relative:path.relative(canonicalRoot,full),size:stat.size,category};
      largest.push(item);largest.sort((a,b)=>b.size-a.size);if(largest.length>10)largest.pop();
    }
  }
  return {files,folders,bytes,scanned,skipped,truncated,limit:MAX_ENTRIES,counts,sizeByCategory,largest};
}
async function textPreview(root,relative){
  if(typeof relative!=='string'||relative.length>4096)throw Error('Invalid path.');
  const requested=path.resolve(root,relative);
  if(!isWithinFolder(root,requested))throw Error('Outside selected folder.');
  // Do not preview symlinks. Ordinary parent paths are protected by resolveInside.
  const link=await fs.lstat(requested);
  if(link.isSymbolicLink()||!link.isFile())throw Error('Preview requires an ordinary file.');
  if(!PREVIEW_EXTENSIONS.has(path.extname(requested).toLowerCase()))throw Error('Preview supports text and code files only.');
  const real=await resolveInside(root,relative);
  const stat=await fs.stat(real);
  if(stat.size>PREVIEW_MAX_BYTES)throw Error('Preview is limited to files smaller than 128 KB.');
  // Use a fatal UTF-8 decoder: never misrepresent a binary file as ordinary text.
  const raw=await fs.readFile(real);
  if(raw.length>PREVIEW_MAX_BYTES||raw.includes(0))throw Error('Not a supported UTF-8 text file.');
  let content;
  try{content=new TextDecoder('utf-8',{fatal:true}).decode(raw);}catch{throw Error('Not a valid UTF-8 text file.');}
  return {name:path.basename(real),relative:path.relative(await fs.realpath(root),real),content,size:raw.length};
}
function summaryCSV(report){
  if(!report||typeof report!=='object')throw Error('Invalid report.');
  // Neutralize Excel formula prefixes, even when filenames begin with whitespace.
  const cell=value=>{let s=String(value??'');if(/^[\s\uFEFF]*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
  const rows=[['LokiVerse Storage Insights',''],['Scanned items',report.scanned],['Files',report.files],['Folders',report.folders],['Total bytes',report.bytes],['Skipped',report.skipped],['Partial results',report.truncated?'Yes':'No'],[],['Category','File count','Total bytes']];
  for(const key of Object.keys(CATEGORIES).concat('Other'))rows.push([key,report.counts?.[key]||0,report.sizeByCategory?.[key]||0]);
  rows.push([],['Largest file','Relative path','Bytes']);
  for(const f of report.largest||[])rows.push([f.name,f.relative,f.size]);
  return '\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';
}
function telemetryCSV(samples){
  if(!Array.isArray(samples)||samples.length>300||samples.some(s=>!s||!Number.isFinite(s.cpu??0)||!Number.isFinite(s.ram)||typeof s.time!=='string'))throw Error('Invalid monitor samples.');
  const lines=['timestamp,cpu_percent,memory_percent,memory_used_bytes'];
  for(const s of samples){
    if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d/.test(s.time)||s.time.length>40||!Number.isFinite(s.memoryUsed)||s.memoryUsed<0||s.ram<0||s.ram>100||(s.cpu!=null&&(s.cpu<0||s.cpu>100)))throw Error('Invalid monitor sample.');
    lines.push([s.time,s.cpu??'',s.ram,Math.round(s.memoryUsed)].join(','));
  }
  return lines.join('\r\n')+'\r\n';
}
module.exports={folderInsights,textPreview,summaryCSV,telemetryCSV,fileCategory,MAX_ENTRIES,PREVIEW_MAX_BYTES};
