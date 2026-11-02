'use strict';
const path = require('node:path');

function trimText(value, max) {
  return typeof value === 'string' ? value.slice(0, max) : '';
}
function normalizeData(raw) {
  const object = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const tasks = Array.isArray(object.tasks) ? object.tasks.slice(0, 5000) : [];
  const notes = Array.isArray(object.notes) ? object.notes.slice(0, 2000) : [];
  return {
    tasks: tasks.filter(x => x && typeof x === 'object' && typeof x.id === 'string').map(x => ({
      id: trimText(x.id, 100), title: trimText(x.title, 240),
      completed: x.completed === true,
      priority: ['Low','Normal','High'].includes(x.priority) ? x.priority : 'Normal',
      due: /^\d{4}-\d{2}-\d{2}$/.test(x.due || '') ? x.due : '',
      createdAt: trimText(x.createdAt, 40),
      category: trimText(x.category, 40) || 'General',
      dueTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(x.dueTime || '') ? x.dueTime : ''
    })).filter(x => x.title),
    notes: notes.filter(x => x && typeof x === 'object' && typeof x.id === 'string').map(x => ({
      id: trimText(x.id, 100), title: trimText(x.title, 140),
      body: trimText(x.body, 100000), updatedAt: trimText(x.updatedAt, 40),
      folder: trimText(x.folder, 40) || 'General', pinned: x.pinned === true
    })),
    settings: {
      displayName: trimText(object.settings?.displayName, 50) || 'Creator',
      accent: ['purple', 'cyan', 'sunset'].includes(object.settings?.accent) ? object.settings.accent : 'purple',
      reminders: object.settings?.reminders !== false,
      compactMode: object.settings?.compactMode === true
    }
  };
}
function compareVersions(a, b) {
  const parts = v => String(v).replace(/^v/, '').split('-')[0].split('.').map(x => Number(x) || 0);
  const aa = parts(a), bb = parts(b);
  for (let i = 0; i < 3; i++) {
    if ((aa[i] || 0) !== (bb[i] || 0)) return (aa[i] || 0) > (bb[i] || 0) ? 1 : -1;
  }
  return 0;
}
function isWithinFolder(root, target) {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  return relative === '' || (relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative));
}
module.exports = { normalizeData, compareVersions, isWithinFolder };
