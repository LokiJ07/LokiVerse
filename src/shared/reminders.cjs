'use strict';
function dueReminders(data, now, sent = new Set()) {
  if (data.settings?.reminders === false) return [];
  return (data.tasks || []).filter(task => {
    if(task.completed || !task.due || sent.has(`${task.id}|${task.due}|${task.dueTime || '09:00'}`)) return false;
    const due = new Date(`${task.due}T${task.dueTime || '09:00'}:00`);
    return !Number.isNaN(due.getTime()) && due.getTime() <= now.getTime() && (now.getTime()-due.getTime()) <= 24*60*60*1000;
  });
}
module.exports = {dueReminders};
