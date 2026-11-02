'use strict';

// Dates are calendar dates, not timestamps. UTC calculations keep repeat dates
// stable across daylight-saving changes and local timezone offsets.
const DAY = 86400000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const FREQUENCIES = Object.freeze(['none', 'daily', 'weekly', 'monthly']);
function validDate(key) {
  if (typeof key !== 'string' || !ISO_DATE.test(key)) return false;
  const value = new Date(`${key}T00:00:00.000Z`);
  return !Number.isNaN(value.getTime()) && value.toISOString().slice(0,10) === key;
}
function dateKey(input = new Date()) {
  if (!(input instanceof Date) || Number.isNaN(input.getTime())) throw new TypeError('Invalid clock.');
  // Compute a LOCAL calendar key (not UTC calendar day) for the current user.
  return `${input.getFullYear()}-${String(input.getMonth()+1).padStart(2,'0')}-${String(input.getDate()).padStart(2,'0')}`;
}
function addDays(key, days) {
  if (!validDate(key) || !Number.isSafeInteger(days) || Math.abs(days)>365000) throw new Error('Invalid calendar date.');
  return new Date(Date.parse(`${key}T00:00:00Z`) + days * DAY).toISOString().slice(0,10);
}
function addMonthsAnchored(key, months, anchorDay) {
  if (!validDate(key) || !Number.isSafeInteger(months) || Math.abs(months)>12000) throw new Error('Invalid calendar date.');
  const [year, month] = key.split('-').map(Number);
  const first = new Date(Date.UTC(year, month - 1 + months, 1));
  const max = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const day = Math.min(Number.isInteger(anchorDay) && anchorDay >= 1 && anchorDay <= 31 ? anchorDay : Number(key.slice(8)), max);
  first.setUTCDate(day);
  return first.toISOString().slice(0,10);
}
function nextOccurrence(due, recurrence, today, anchorDay) {
  if (!validDate(due) || !validDate(today) || !FREQUENCIES.includes(recurrence) || recurrence === 'none') return '';
  if (recurrence === 'monthly') {
    const [y,m] = due.split('-').map(Number), [ty,tm] = today.split('-').map(Number);
    let months = Math.max(1, (ty-y)*12 + tm-m+1); // initially at least the next month
    let proposed = addMonthsAnchored(due, months, anchorDay);
    // If this month's anchored date is still ahead, use it instead.
    if (months>1 && addMonthsAnchored(due, months-1, anchorDay)>today) proposed=addMonthsAnchored(due, months-1, anchorDay);
    if (proposed<=due || proposed<=today) proposed=addMonthsAnchored(due, months+1, anchorDay);
    return proposed;
  }
  const step = recurrence === 'weekly' ? 7 : 1;
  const delta = Math.max(0, Math.floor((Date.parse(today+'T00:00:00Z') - Date.parse(due+'T00:00:00Z')) / DAY));
  const increments = Math.max(1, Math.floor(delta/step)+1);
  return addDays(due, increments*step);
}
function sortedAgenda(tasks, today) {
  if (!validDate(today)) throw new Error('Invalid calendar date.');
  const until = addDays(today,6);
  const agenda = {overdue:[], today:[], week:[], later:[], unscheduled:[]};
  for (const task of tasks || []) {
    if (!task || task.completed) continue;
    const due=validDate(task.due) ? task.due : '';
    const bucket = !due?'unscheduled':due<today?'overdue':due===today?'today':due<=until?'week':'later';
    agenda[bucket].push(task);
  }
  const priority={High:0,Normal:1,Low:2};
  for (const group of Object.values(agenda)) group.sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999')||(a.dueTime||'99:99').localeCompare(b.dueTime||'99:99')||(priority[a.priority]??1)-(priority[b.priority]??1));
  return agenda;
}
/** Complete or re-open one task. Recurring completion creates exactly one next occurrence. */
function toggleCompleted(tasks, taskId, today, newId, completedAt = new Date().toISOString()) {
  const task = tasks.find(item=>item.id===taskId);
  if (!task) return {changed:false, next:null};
  if (task.completed) {task.completed=false;task.completedAt='';return {changed:true,next:null};}
  task.completed=true;task.completedAt=completedAt;
  const linked=task.nextTaskId && tasks.some(item=>item.id===task.nextTaskId);
  if (!linked && tasks.length < 5000) {
    const due=nextOccurrence(task.due,task.recurrence||'none',today,task.recurrenceDay);
    if(due){
      const next={...task,id:newId(),due,completed:false,completedAt:'',createdAt:completedAt,nextTaskId:'',recurrenceDay:task.recurrenceDay||Number(task.due.slice(8))};
      if (next.id===task.id || tasks.some(item=>item.id===next.id)) throw new Error('Unable to generate unique task ID.');
      task.nextTaskId=next.id;
      tasks.push(next);
      return {changed:true,next};
    }
  }
  return {changed:true,next:null};
}
module.exports={FREQUENCIES,validDate,dateKey,addDays,addMonthsAnchored,nextOccurrence,sortedAgenda,toggleCompleted};
