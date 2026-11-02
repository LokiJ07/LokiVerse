'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const {folderInsights,textPreview,summaryCSV,telemetryCSV}=require('../src/shared/desktop-tools.cjs');

test('v0.8 storage insights groups extensions, totals sizes and sorts largest files',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'loki08-insight-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 await fs.mkdir(path.join(root,'Nested'));
 await fs.writeFile(path.join(root,'logo.png'),'12345');
 await fs.writeFile(path.join(root,'Nested','notes.md'),'12');
 await fs.writeFile(path.join(root,'Nested','code.js'),'1234567');
 const report=await folderInsights(root);
 assert.equal(report.files,3);assert.equal(report.folders,1);assert.equal(report.bytes,14);
 assert.equal(report.counts.Images,1);assert.equal(report.counts.Documents,1);assert.equal(report.counts.Code,1);
 assert.equal(report.largest[0].name,'code.js');assert.equal(report.truncated,false);
 assert.match(summaryCSV(report),/"Category","File count","Total bytes"/);
});
test('v0.8 insights skips external symlink and never includes its files',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'loki08-root-'));
 const outside=await fs.mkdtemp(path.join(os.tmpdir(),'loki08-out-'));
 t.after(async()=>{await fs.rm(root,{recursive:true,force:true});await fs.rm(outside,{recursive:true,force:true});});
 await fs.writeFile(path.join(outside,'secret.txt'),'hidden');
 try{await fs.symlink(outside,path.join(root,'external'),'dir');}catch(error){if(['EPERM','EACCES','ENOTSUP'].includes(error.code))return;throw error;}
 const report=await folderInsights(root);
 assert.equal(report.files,0);assert.ok(report.skipped>=1);
 await assert.rejects(textPreview(root,'external/secret.txt'),/Outside selected folder|Link escapes selected folder/);
});
test('v0.8 UTF-8 text preview is bounded and rejects traversal, links and binary data',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'loki08-preview-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 await fs.writeFile(path.join(root,'readme.md'),'Hello <script>alert(1)</script>');
 assert.match((await textPreview(root,'readme.md')).content,/<script>/);
 await fs.writeFile(path.join(root,'binary.txt'),Buffer.from([0,1,2]));
 await assert.rejects(textPreview(root,'binary.txt'),/Not a supported UTF-8/);
 await fs.writeFile(path.join(root,'large.txt'),'x'.repeat(128*1024+1));
 await assert.rejects(textPreview(root,'large.txt'),/128 KB/);
 await assert.rejects(textPreview(root,'../anything.txt'),/Outside selected folder/);
 await assert.rejects(textPreview(root,'readme.exe'),/ENOENT|Preview supports/);
});
test('v0.8 CSV exports cannot execute spreadsheet formulas from filenames',()=>{
 const csv=summaryCSV({scanned:1,files:1,folders:0,bytes:1,largest:[{name:'=HYPERLINK("evil")',relative:'=X1',size:1}]});
 assert.match(csv,/"'=HYPERLINK\(""evil""\)"/);
 assert.match(csv,/"'=X1"/);
 const telemetry=telemetryCSV([{time:'2026-11-02T12:20:00.000Z',cpu:40,ram:50,memoryUsed:8192}]);
 assert.match(telemetry,/2026-11-02T12:20:00.000Z,40,50,8192/);
 assert.throws(()=>telemetryCSV([{time:'=SUM(A1)',cpu:2,ram:25,memoryUsed:10}]),/Invalid monitor sample/);
});

const {safeSerial} = require('../src/shared/tls-identity.cjs');
test('v0.8 X.509 serials never have forbidden DER leading-zero padding',()=>{
 assert.equal(safeSerial(Buffer.from([0,10]))[0],1);
 assert.equal(safeSerial(Buffer.from([128,10]))[0],1);
 assert.equal(safeSerial(Buffer.from([255,10]))[0],127);
 assert.equal(safeSerial(Buffer.from([3,10]))[0],3);
});
