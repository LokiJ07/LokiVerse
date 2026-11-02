'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {normalizeData}=require('../src/shared/logic.cjs');
const {dateKey,validDate,addDays,addMonthsAnchored,nextOccurrence,sortedAgenda,toggleCompleted}=require('../src/shared/planner.cjs');

test('v0.9: upgrades legacy workspace tasks without dropping data or notes',()=>{
  const restored=normalizeData({tasks:[{id:'legacy-task',title:'Keep existing tasks',due:'2026-11-02',category:'Work',dueTime:'14:35',priority:'High'}],notes:[{id:'legacy-note',title:'Keep existing notes',body:'Safe content'}],settings:{accent:'cyan'}});
  assert.equal(restored.tasks[0].title,'Keep existing tasks');
  assert.equal(restored.tasks[0].recurrence,'none');
  assert.equal(restored.tasks[0].recurrenceDay,2);
  assert.equal(restored.tasks[0].noteId,'');
  assert.equal(restored.notes[0].body,'Safe content');
  assert.equal(restored.settings.accent,'cyan');
  const linked=normalizeData({tasks:[{...restored.tasks[0],recurrence:'weekly',noteId:'legacy-note'}],notes:restored.notes});
  assert.equal(linked.tasks[0].noteId,'legacy-note');
  assert.equal(linked.tasks[0].recurrence,'weekly');
  assert.equal(normalizeData({tasks:[{id:'x',title:'Title',recurrence:'invalid',due:'2026-02-30'}]}).tasks[0].due,'');
});

test('v0.9: calendar dates are validated including leap years and daylight-saving intervals',()=>{
  assert.equal(validDate('2024-02-29'),true);
  assert.equal(validDate('2026-02-29'),false);
  assert.equal(validDate('2026-13-01'),false);
  assert.equal(addDays('2026-12-31',1),'2027-01-01');
  assert.equal(addDays('2026-03-07',2),'2026-03-09');
  assert.equal(dateKey(new Date(2026,10,2,14,0)), '2026-11-02');
  assert.equal(addMonthsAnchored('2026-01-31',1,31),'2026-02-28');
  assert.equal(addMonthsAnchored('2024-01-31',1,31),'2024-02-29');
});

test('v0.9: repeat dates remain anchored and skip missed occurrences',()=>{
  assert.equal(nextOccurrence('2026-11-02','daily','2026-11-02'), '2026-11-03');
  assert.equal(nextOccurrence('2026-11-02','daily','2026-11-07'), '2026-11-08');
  assert.equal(nextOccurrence('2026-11-02','weekly','2026-11-12'), '2026-11-16');
  assert.equal(nextOccurrence('2026-01-31','monthly','2026-02-02',31), '2026-02-28');
  assert.equal(nextOccurrence('2026-01-31','monthly','2026-02-28',31), '2026-03-31');
  assert.equal(nextOccurrence('2026-01-31','monthly','2027-05-25',31), '2027-05-31');
  assert.equal(nextOccurrence('2026-01-31','none','2026-02-01'), '');
  assert.equal(nextOccurrence('not-a-date','weekly','2026-11-02'), '');
});

test('v0.9: repeat completion generates one next occurrence with linked LokiNote',()=>{
  const tasks=normalizeData({tasks:[{id:'first',title:'Weekly review',due:'2026-11-02',priority:'High',recurrence:'weekly',category:'Projects',noteId:'note-1'}]}).tasks;
  const first=toggleCompleted(tasks,'first','2026-11-02',()=> 'second', '2026-11-02T14:30:00Z');
  assert.equal(first.next.due,'2026-11-09');
  assert.equal(first.next.noteId,'note-1');
  assert.equal(first.next.completed,false);
  assert.equal(tasks[0].completed,true);
  assert.equal(tasks[0].nextTaskId,'second');
  assert.equal(tasks.length,2);
  toggleCompleted(tasks,'first','2026-11-02',()=> 'third'); // undo
  const again=toggleCompleted(tasks,'first','2026-11-02',()=> 'third');
  assert.equal(again.next,null);
  assert.equal(tasks.length,2);
});

test('v0.9: recurrence can still complete one-time, and task count is capped',()=>{
  const tasks=[{id:'a',title:'One-time',due:'2026-11-02',recurrence:'none',completed:false}];
  const result=toggleCompleted(tasks,'a','2026-11-02',()=> 'new');
  assert.equal(result.next,null);
  assert.equal(tasks.length,1);
  assert.equal(tasks[0].completed,true);
});

test('v0.9: focus buckets order overdue, today, next six days and unplanned',()=>{
  const tasks=[{id:'a',due:'2026-11-01',title:'Overdue'}, {id:'b',due:'2026-11-02',title:'Today'}, {id:'c',due:'2026-11-07',title:'Week'}, {id:'d',due:'2026-11-09',title:'Later'}, {id:'e',due:'',title:'No date'}, {id:'f',due:'2026-11-02',completed:true}];
  const agenda=sortedAgenda(tasks,'2026-11-02');
  assert.equal(agenda.overdue[0].id,'a');
  assert.equal(agenda.today[0].id,'b');
  assert.equal(agenda.week[0].id,'c');
  assert.equal(agenda.later[0].id,'d');
  assert.equal(agenda.unscheduled[0].id,'e');
  assert.equal(Object.values(agenda).flat().some(x=>x.id==='f'),false);
});

test('v0.9: repeating task survives local backup roundtrip without spawning duplicates',async()=>{
  const fs=require('node:fs/promises');
  const os=require('node:os');
  const path=require('node:path');
  const {createStorage}=require('../src/shared/storage.cjs');
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'loki09-'));
  try {
    const store=createStorage(path.join(directory,'workspace.json'));
    const workspace=normalizeData({tasks:[{id:'occ-1',title:'Monthly close',due:'2026-01-31',recurrence:'monthly',recurrenceDay:31,noteId:'note-a'}],notes:[{id:'note-a',title:'Month-end',body:'Remember this'}]});
    toggleCompleted(workspace.tasks,'occ-1','2026-02-02',()=> 'occ-2');
    await store.write(workspace);
    const {data}=await store.read();
    assert.equal(data.tasks.length,2);
    assert.equal(data.tasks[1].due,'2026-02-28');
    assert.equal(data.tasks[1].noteId,'note-a');
    assert.equal(data.tasks[0].nextTaskId,'occ-2');
    toggleCompleted(data.tasks,'occ-1','2026-02-02',()=> 'occ-3');
    toggleCompleted(data.tasks,'occ-1','2026-02-02',()=> 'occ-3');
    assert.equal(data.tasks.length,2);
  }finally {await fs.rm(directory,{recursive:true,force:true});}
});
