'use strict';
const ICONS = {
  home:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  tasks:'<path d="m4 7 2 2 4-4M13 7h7M4 17l2 2 4-4M13 17h7"/>',
  notes:'<rect x="4" y="2.5" width="16" height="19" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  folder:'<path d="M3 7a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  activity:'<path d="M2 12h4l3-8 5 16 3-8h5"/>',
  share:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.5 10.6 7-4.1m-7 9 7 3.9"/>',
  settings:'<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a2 2 0 0 0 .4 2.2l-2.6 2.6a2 2 0 0 0-2.2-.4 2 2 0 0 0-1.3 1.7h-3.5a2 2 0 0 0-1.3-1.7 2 2 0 0 0-2.2.4l-2.6-2.6A2 2 0 0 0 4.6 15 2 2 0 0 0 3 13.7v-3.5a2 2 0 0 0 1.6-1.3 2 2 0 0 0-.4-2.2l2.6-2.6A2 2 0 0 0 9 4.5 2 2 0 0 0 10.3 3h3.5a2 2 0 0 0 1.3 1.5 2 2 0 0 0 2.2-.4l2.6 2.6a2 2 0 0 0-.4 2.2 2 2 0 0 0 1.5 1.3v3.5a2 2 0 0 0-1.6 1.3Z"/>',
  plus:'<path d="M12 5v14M5 12h14"/>', check:'<path d="m5 12 5 5L20 7"/>',
  arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>', refresh:'<path d="M20 11a8 8 0 1 0-3 7M20 4v7h-7"/>',
  trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3"/>',
  file:'<path d="M6 2h8l5 5v15H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2ZM14 2v6h6"/>',
  chevron:'<path d="m9 18 6-6-6-6"/>', search:'<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>',
  external:'<path d="M13 5h6v6M19 5l-8 8M19 13v6H5V5h6"/>',
  download:'<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
  upload:'<path d="M12 20V8m-5 5 5-5 5 5M4 7V3h16v4"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',
  shield:'<path d="m12 2 8 4v6c0 5-3 8-8 10-5-2-8-5-8-10V6z"/><path d="m9 12 2 2 4-4"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',
  sparkles:'<path d="m12 2 2.3 7.7L22 12l-7.7 2.3L12 22l-2.3-7.7L2 12l7.7-2.3z"/>',
  harddrive:'<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 14h.01M11 14h.01"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 2v6m8-6v6"/>',
  back:'<path d="m15 18-6-6 6-6M9 12h12"/>'
};
const icon = (name, size = 18) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.sparkles}</svg>`;
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const q = selector => document.querySelector(selector);
const panel = q('#content');
const pages = {home:'Overview',tasks:'My Tasks',notes:'LokiNotes',files:'LokiFiles',monitor:'SystemPulse',share:'LokiShare',settings:'Settings'};
let data = {tasks:[],notes:[],settings:{displayName:'Creator'}};
let info = {version:'0.1.1'};
let currentView = 'home';
let taskFilter = 'all';
let selectedNoteId = null;
let noteQuery = '';
let fileListing = null;
let fileQuery = '';
let system = null;
let monitorTimer = null;
let saveChain = Promise.resolve();
let noteSaveTimer = null;
let saveRevision = 0;
let paletteVisible = false;
let paletteQuery = '';
let paletteItems = [];
let paletteIndex = 0;

function setSaveStatus(status, label) {
  const badge = q('#saveStatus');
  if (!badge) return;
  badge.dataset.status = status;
  badge.textContent = label;
}
function flushNoteEdits() {
  if (noteSaveTimer) {
    clearTimeout(noteSaveTimer);
    noteSaveTimer = null;
    return persist();
  }
  return saveChain;
}
function applyAccent() {
  document.body.dataset.accent = data.settings?.accent || 'purple';
}


function toast(message, error = false) {
  const box = document.createElement('div'); box.className = `toast ${error ? 'error' : ''}`; box.textContent = message;
  q('#toastContainer').appendChild(box);
  setTimeout(() => box.remove(), 3500);
}
function fail(error) { toast(error?.message || String(error), true); }
function persist(showToast = false) {
  const snapshot = JSON.parse(JSON.stringify(data));
  const revision = ++saveRevision;
  setSaveStatus('saving', '● Saving…');
  saveChain = saveChain.catch(() => {}).then(() => window.loki.save(snapshot));
  saveChain.then(() => {
    if (revision === saveRevision) setSaveStatus('saved', '✓ Saved locally');
    if (showToast) toast('Workspace saved locally.');
  }).catch(error => {
    setSaveStatus('error', '⚠ Save failed');
    fail(error);
  });
  return saveChain;
}
function id() { return `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function niceDate(value) {
  if (!value) return 'No due date';
  const date = new Date(value + (value.length === 10 ? 'T12:00:00' : ''));
  return Number.isNaN(date.getTime()) ? 'Unknown date' : date.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
}
function compactTime(value) { return value ? new Date(value).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : 'Just now'; }
function bytes(value) { if (!Number.isFinite(value)) return '—'; const units=['B','KB','MB','GB','TB']; let n=value,i=0; while(n>=1024&&i<units.length-1){n/=1024;i++} return `${n.toFixed(i ? 1 : 0)} ${units[i]}`; }
function renderNavIcons() { document.querySelectorAll('[data-icon]').forEach(el => { el.outerHTML = icon(el.dataset.icon); }); }
function switchView(view) {
  if (!pages[view]) return;
  flushNoteEdits();
  if (monitorTimer) { clearInterval(monitorTimer); monitorTimer = null; }
  currentView = view;
  q('#topTitle').textContent = pages[view];
  document.querySelectorAll('.nav-button').forEach(b => b.classList.toggle('active',b.dataset.view===view));
  panel.scrollTop = 0;
  render();
}
function emptyState(name, message) { return `<div class="empty">${icon(name,28)}<strong>${escapeHtml(message)}</strong><p>Everything you create stays on this device.</p></div>`; }
function heading(eyebrow, title, subtitle, action = '') {
  return `<div class="page-heading"><div><span class="eyebrow">${escapeHtml(eyebrow)}</span><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p></div>${action}</div>`;
}
function render() {
  switch (currentView) {
    case 'home': renderHome(); break;
    case 'tasks': renderTasks(); break;
    case 'notes': renderNotes(); break;
    case 'files': renderFiles(); break;
    case 'monitor': renderMonitor(); break;
    case 'share': renderShare(); break;
    case 'settings': renderSettings(); break;
  }
}
function renderHome() {
  const pending = data.tasks.filter(t=>!t.completed);
  const completed = data.tasks.length - pending.length;
  const completionPercent = data.tasks.length ? Math.round(completed / data.tasks.length * 100) : 0;
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const overdue = pending.filter(t => t.due && t.due < todayKey).length;
  const upcoming = [...pending].sort((a,b)=>(a.due || '9999').localeCompare(b.due || '9999')).slice(0,4);
  panel.innerHTML = `
    ${heading('YOUR CREATIVE COMMAND CENTER',`Welcome back, ${data.settings.displayName}! ✦`,'One beautiful place for the tools that power your day.')}
    <section class="hero"><div><span class="eyebrow" style="color:#c4a9ff">✦ &nbsp; LOKIVERSE · VERSION ${escapeHtml(info.version)}</span><h2>Your space to create <strong>more.</strong></h2><p>Organize ideas, stay on top of tasks, explore files, and keep an eye on your system. All in one private, offline-first workspace.</p><button class="button button-primary" data-goto="tasks">${icon('plus')} Create a task ${icon('arrow',16)}</button></div><div class="hero-icon">L</div></section>
    <div class="stats-grid"><div class="stat-card"><span class="stat-card-label">Total Tasks</span><div class="stat-icon">${icon('tasks')}</div><div class="stat-card-number">${data.tasks.length}</div><div class="stat-card-bottom">Your action items</div></div><div class="stat-card"><span class="stat-card-label">Notes Created</span><div class="stat-icon">${icon('notes')}</div><div class="stat-card-number">${data.notes.length}</div><div class="stat-card-bottom">Ideas saved locally</div></div><div class="stat-card"><span class="stat-card-label">Tasks Finished</span><div class="stat-icon">${icon('check')}</div><div class="stat-card-number">${completed}</div><div class="stat-card-bottom">Keep the momentum going</div></div><div class="stat-card"><span class="stat-card-label">Workspace Modules</span><div class="stat-icon">${icon('sparkles')}</div><div class="stat-card-number">4<span style="font-size:14px;color:#9390ae"> / 5</span></div><div class="stat-card-bottom">LokiShare coming later</div></div></div>
    <section class="progress-summary" aria-label="Task progress"><div class="progress-summary-copy"><span class="eyebrow">TODAY AT A GLANCE</span><h3>${completionPercent}% of tasks completed</h3><p>${pending.length} active · ${completed} finished · ${overdue} overdue</p></div><div class="progress-summary-track"><span style="width:${completionPercent}%"></span></div><button class="button button-ghost" data-goto="tasks">Manage tasks ${icon('arrow',15)}</button></section>
    <div class="two-col"><div><div class="section-header"><h3>Upcoming tasks</h3><button data-goto="tasks">View all →</button></div><div class="panel">${upcoming.length ? upcoming.map(t=>`<div class="mini-task"><input type="checkbox" class="checkbox" data-complete="${escapeHtml(t.id)}" aria-label="Mark completed"><div style="min-width:0;flex:1"><div class="mini-task-title">${escapeHtml(t.title)}</div><div class="mini-task-sub">${niceDate(t.due)}</div></div><span class="task-tag ${t.priority.toLowerCase()}">${escapeHtml(t.priority)}</span></div>`).join('') : emptyState('tasks','No pending tasks — you are all caught up!')}</div></div><div><div class="section-header"><h3>Quick launch</h3><button data-goto="settings">Customize →</button></div><div class="panel"><button class="quick-link" data-goto="notes"><span class="quick-icon">${icon('notes')}</span><span><strong>LokiNotes</strong><small>Capture your next big idea</small></span><span class="arrow">→</span></button><button class="quick-link" data-goto="files"><span class="quick-icon">${icon('folder')}</span><span><strong>LokiFiles</strong><small>Browse local files and folders</small></span><span class="arrow">→</span></button><button class="quick-link" data-goto="monitor"><span class="quick-icon">${icon('activity')}</span><span><strong>SystemPulse</strong><small>Live CPU and memory insights</small></span><span class="arrow">→</span></button></div></div></div>`;
  panel.querySelectorAll('[data-complete]').forEach(box=>box.addEventListener('change',()=>toggleTask(box.dataset.complete)));
  bindGoto();
}
function bindGoto() { panel.querySelectorAll('[data-goto]').forEach(btn=>btn.addEventListener('click',()=>switchView(btn.dataset.goto))); }
function toggleTask(taskId) { const task = data.tasks.find(t=>t.id===taskId); if (!task) return; task.completed=!task.completed; persist(); render(); }
function renderTasks() {
  const all = data.tasks.length;
  const shown = data.tasks.filter(t=>taskFilter==='all' || (taskFilter==='active'?!t.completed:t.completed));
  panel.innerHTML = `${heading('STAY FOCUSED','My Tasks','Small wins add up. Plan, track, and complete the important things.',`<span class="pill">${all} TOTAL TASKS</span>`)}
    <form id="taskForm" class="form-row"><input class="field flex-field" name="title" placeholder="What needs to be done?" required maxlength="240" autocomplete="off"><select class="field" name="priority"><option>Normal</option><option>High</option><option>Low</option></select><input class="field" name="due" type="date" aria-label="Due date"><button class="button button-primary" type="submit">${icon('plus')} Add Task</button></form>
    <div class="filter-row"><button class="filter-chip ${taskFilter==='all'?'active':''}" data-filter="all">All (${all})</button><button class="filter-chip ${taskFilter==='active'?'active':''}" data-filter="active">Active (${data.tasks.filter(t=>!t.completed).length})</button><button class="filter-chip ${taskFilter==='completed'?'active':''}" data-filter="completed">Completed (${data.tasks.filter(t=>t.completed).length})</button></div>
    <div class="task-list">${shown.length ? [...shown].reverse().map(t=>`<div class="task-row ${t.completed?'done':''}"><input type="checkbox" class="checkbox" data-complete="${escapeHtml(t.id)}" ${t.completed?'checked':''} aria-label="Toggle completed"><div class="task-main"><div class="task-name">${escapeHtml(t.title)}</div><div class="task-meta">${icon('calendar',12)} &nbsp;${niceDate(t.due)} &nbsp;·&nbsp; Created ${compactTime(t.createdAt)}</div></div><span class="task-tag ${t.priority.toLowerCase()}">${escapeHtml(t.priority)}</span><button class="icon-button danger-icon" data-delete-task="${escapeHtml(t.id)}" title="Delete task">${icon('trash')}</button></div>`).join('') : emptyState('check','Nothing in this list yet')}</div>`;
  q('#taskForm').addEventListener('submit', e => {
    e.preventDefault(); const f = new FormData(e.currentTarget), title=String(f.get('title')||'').trim(); if(!title)return;
    data.tasks.push({id:id(),title,priority:f.get('priority'),due:String(f.get('due')||''),completed:false,createdAt:new Date().toISOString()});
    persist(); toast('New task created.'); renderTasks();
  });
  panel.querySelectorAll('[data-complete]').forEach(b=>b.addEventListener('change',()=>toggleTask(b.dataset.complete)));
  panel.querySelectorAll('[data-delete-task]').forEach(b=>b.addEventListener('click',()=>{if(!confirm('Delete this task?'))return;data.tasks=data.tasks.filter(t=>t.id!==b.dataset.deleteTask);persist();renderTasks();}));
  panel.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{taskFilter=b.dataset.filter;renderTasks();}));
}
function renderNotes() {
  const selected=data.notes.find(n=>n.id===selectedNoteId);
  const filtered=[...data.notes].filter(n=>(n.title+' '+n.body).toLowerCase().includes(noteQuery.toLowerCase())).sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''));
  panel.innerHTML = `${heading('YOUR IDEAS, SAFE AND SOUND','LokiNotes','A quiet place for thoughts, projects, and everything in between.',`<button class="button button-primary" id="newNote">${icon('plus')} New Note</button>`)}
    <div class="note-layout"><section class="panel note-sidebar"><input class="field search" id="noteSearch" type="search" placeholder="Search notes..." value="${escapeHtml(noteQuery)}"><div id="noteList">${filtered.length ? filtered.map(n=>`<button class="note-item ${n.id===selectedNoteId?'selected':''}" data-note="${escapeHtml(n.id)}"><strong>${escapeHtml(n.title||'Untitled note')}</strong><small>${escapeHtml((n.body||'').replace(/\s+/g,' ').slice(0,45)||'Empty note')} · ${compactTime(n.updatedAt)}</small></button>`).join('') : emptyState('notes','No notes found')}</div></section>
    <section class="panel note-editor">${selected ? `<input id="noteTitle" maxlength="140" placeholder="Untitled note" value="${escapeHtml(selected.title)}"><textarea id="noteBody" maxlength="100000" placeholder="Let your ideas flow..."></textarea><div class="editor-bottom"><span><span id="noteStatus">All changes saved locally</span> <span id="noteCount" class="word-count"></span></span><button id="deleteNote" class="button button-danger">${icon('trash')} Delete Note</button></div>` : `<div class="empty" style="margin:auto">${icon('notes',32)}<strong>Your thoughts, your universe.</strong><p>Create a note or select one from the list.</p></div>`}</section></div>`;
  if (selected) { q('#noteBody').value=selected.body; updateNoteCount(); }
  q('#newNote').addEventListener('click',()=>{
    const note={id:id(),title:'Untitled note',body:'',updatedAt:new Date().toISOString()};data.notes.push(note);selectedNoteId=note.id;noteQuery='';persist();renderNotes();q('#noteTitle').focus();q('#noteTitle').select();
  });
  q('#noteSearch').addEventListener('input',e=>{noteQuery=e.target.value;updateNoteList();});
  panel.querySelectorAll('[data-note]').forEach(b=>b.addEventListener('click',()=>selectNote(b.dataset.note)));
  if(selected) {
    const onEdit=()=>{
      selected.title=q('#noteTitle').value;selected.body=q('#noteBody').value;selected.updatedAt=new Date().toISOString();
      q('#noteStatus').textContent='Saving changes...';
      setSaveStatus('saving', '● Saving…');
      updateNoteCount();
      if(noteSaveTimer)clearTimeout(noteSaveTimer);
      noteSaveTimer=setTimeout(async()=>{noteSaveTimer=null;try{await persist();const status=q('#noteStatus');if(status)status.textContent='Saved locally ✓';updateNoteList();}catch(error){fail(error);}},230);
    };
    q('#noteTitle').addEventListener('input',onEdit);q('#noteBody').addEventListener('input',onEdit);
    q('#deleteNote').addEventListener('click',()=>{if(!confirm('Delete this note?'))return;data.notes=data.notes.filter(n=>n.id!==selected.id);selectedNoteId=data.notes[0]?.id||null;persist();renderNotes();});
  }
}
function selectNote(noteId) { flushNoteEdits(); selectedNoteId=noteId;renderNotes(); }
function updateNoteCount() { const target=q('#noteCount'), body=q('#noteBody'); if(target&&body) {const words=body.value.trim()?body.value.trim().split(/\s+/).length:0;target.textContent=` · ${words} words`; } }
function updateNoteList() {
  const filtered=[...data.notes].filter(n=>(n.title+' '+n.body).toLowerCase().includes(noteQuery.toLowerCase())).sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''));
  const list=q('#noteList');if(!list)return;
  list.innerHTML=filtered.length ? filtered.map(n=>`<button class="note-item ${n.id===selectedNoteId?'selected':''}" data-note="${escapeHtml(n.id)}"><strong>${escapeHtml(n.title||'Untitled note')}</strong><small>${escapeHtml((n.body||'').replace(/\s+/g,' ').slice(0,45)||'Empty note')} · ${compactTime(n.updatedAt)}</small></button>`).join('') : emptyState('search','No notes match your search');
  list.querySelectorAll('[data-note]').forEach(b=>b.addEventListener('click',()=>selectNote(b.dataset.note)));
}
async function browseFiles(relative='') {
  try {fileListing=await window.loki.listFiles(relative);fileQuery='';if(currentView==='files')renderFiles();}
  catch(error){fail(error);}
}
function renderFiles() {
  panel.innerHTML=`${heading('YOUR FILES, SIMPLIFIED','LokiFiles','A safe, read-only file explorer. Open folders and files without moving or deleting anything.',`<button class="button button-primary" id="pickFolder">${icon('folder')} Choose Folder</button>`)}
    <section class="panel"><div class="folder-toolbar"><button class="button button-ghost" id="goParent" ${!fileListing||!fileListing.relative?'disabled':''} title="Go up">${icon('back')} Up</button><div class="folder-path">${fileListing?escapeHtml(fileListing.root+(fileListing.relative?'\\'+fileListing.relative:'')):'No folder selected'}</div><input id="fileSearch" class="field" type="search" placeholder="Search here..." value="${escapeHtml(fileQuery)}" ${!fileListing?'disabled':''}></div><div id="fileResults">${fileListing?fileResultsHtml():emptyState('folder','Choose a folder to start browsing')}</div></section>`;
  q('#pickFolder').addEventListener('click',async()=>{try{const result=await window.loki.selectFolder();if(!result.canceled)await browseFiles('');}catch(e){fail(e)}});
  q('#goParent').addEventListener('click',()=>{if(!fileListing)return;const parts=fileListing.relative.split(/[\\/]/).filter(Boolean);parts.pop();browseFiles(parts.join('\\'));});
  q('#fileSearch').addEventListener('input',e=>{fileQuery=e.target.value;updateFileResults();});
  bindFileResults();
}
function fileResultsHtml(){
  if(!fileListing)return '';
  const shown=fileListing.entries.filter(x=>x.name.toLowerCase().includes(fileQuery.toLowerCase()));
  return `<div class="fine-print" style="margin-bottom:15px">${fileListing.entries.length} item(s) ${fileListing.truncated?'· Showing first 1,500':''} · Open folders with one click</div>${shown.length?`<div style="overflow:auto"><table class="files-table"><thead><tr><th>NAME</th><th>TYPE</th><th>SIZE</th><th>MODIFIED</th><th>ACTIONS</th></tr></thead><tbody>${shown.map((f,i)=>`<tr><td class="name-cell"><span class="file-icon">${icon(f.directory?'folder':'file')}</span><button class="file-open" data-file="${i}">${escapeHtml(f.name)}</button></td><td>${f.directory?'Folder':escapeHtml((f.name.split('.').pop()||'File').toUpperCase())}</td><td>${f.directory?'—':bytes(f.size)}</td><td>${niceDate(f.modified)}</td><td><div class="file-actions"><button class="icon-button" data-reveal="${i}" title="Show in Explorer">${icon('external')}</button></div></td></tr>`).join('')}</tbody></table></div>`:emptyState('search','No matching files')}`;
}
function visibleFiles(){return fileListing?fileListing.entries.filter(x=>x.name.toLowerCase().includes(fileQuery.toLowerCase())):[];}
function updateFileResults(){q('#fileResults').innerHTML=fileResultsHtml();bindFileResults();}
function bindFileResults(){
  panel.querySelectorAll('[data-file]').forEach(b=>b.addEventListener('click',async()=>{
    const item=visibleFiles()[Number(b.dataset.file)];if(!item)return;
    try{if(item.directory)await browseFiles(item.relative);else await window.loki.openFile(item.relative);}catch(e){fail(e)}
  }));
  panel.querySelectorAll('[data-reveal]').forEach(b=>b.addEventListener('click',async()=>{
    const item=visibleFiles()[Number(b.dataset.reveal)];if(!item)return;
    try{await window.loki.revealFile(item.relative)}catch(e){fail(e)}
  }));
}
function renderMonitor(){
  panel.innerHTML=`${heading('LIVE SYSTEM INSIGHTS','SystemPulse','A lightweight look at your PC. Refreshes automatically every 3 seconds.',`<span class="pill">${icon('activity',13)} LIVE MONITORING</span>`)}
    <div class="monitor-grid"><div class="panel metric-panel"><span class="eyebrow">PROCESSOR LOAD</span><div class="big-number" id="cpuPercent">—<small>%</small></div><div class="progress-track"><div class="progress-fill" id="cpuBar"></div></div><p class="fine-print">Current overall CPU usage (estimated from system counters).</p></div><div class="panel metric-panel"><span class="eyebrow">MEMORY USAGE</span><div class="big-number" id="ramPercent">—<small>%</small></div><div class="progress-track"><div class="progress-fill green" id="ramBar"></div></div><p class="fine-print" id="ramDetails">Reading system memory...</p></div></div>
    <div class="section-header"><h3>Device information</h3></div><div class="panel" id="systemDetails">${emptyState('activity','Gathering system information...')}</div>
    <p class="fine-print" style="margin-top:16px">Temperature, power consumption, GPU telemetry and disk health require additional hardware-specific integrations and are not available in this initial release.</p>`;
  refreshStats(); monitorTimer=setInterval(()=>{if(currentView==='monitor')refreshStats();},3000);
}
async function refreshStats(){
  try{
    system=await window.loki.stats();if(currentView!=='monitor')return;
    const cpu=system.cpu==null?'—':String(system.cpu),ram=Math.round(100*system.memoryUsed/system.memoryTotal);
    q('#cpuPercent').innerHTML=`${cpu}<small>%</small>`;q('#cpuBar').style.width=`${system.cpu||0}%`;
    q('#ramPercent').innerHTML=`${ram}<small>%</small>`;q('#ramBar').style.width=`${ram}%`;
    q('#ramDetails').textContent=`${bytes(system.memoryUsed)} used of ${bytes(system.memoryTotal)} installed system memory`;
    q('#systemDetails').innerHTML=[['Computer name',system.hostname],['Processor',system.cpuName],['Logical processors',system.cores],['Operating system',system.platform],['System uptime',`${Math.floor(system.uptime/3600)}h ${Math.floor((system.uptime%3600)/60)}m`]].map(([a,b])=>`<div class="detail-row"><span>${escapeHtml(a)}</span><strong>${escapeHtml(b)}</strong></div>`).join('');
  }catch(error){if(currentView==='monitor')fail(error)}
}
function renderShare(){
  panel.innerHTML=`${heading('THE NEXT CONNECTION','LokiShare','Our upcoming direct Wi-Fi file sharing module.')}
    <div class="center-card"><div class="giant-icon">${icon('share')}</div><span class="eyebrow">COMING IN A FUTURE RELEASE</span><h2>Share files. Not your privacy.</h2><p>We are planning direct Android ↔ Windows file transfer over the same local network, without cloud accounts. This feature is <strong>not yet implemented</strong> in v0.1.1.</p></div>
    <div class="roadmap"><div class="roadmap-card"><div class="roadmap-icon">${icon('shield')}</div><h3>Secure pairing</h3><p>Pair devices with a one-time code or QR scan before transferring files.</p></div><div class="roadmap-card"><div class="roadmap-icon">${icon('share')}</div><h3>Direct transfers</h3><p>Send files over local Wi-Fi, even when the internet is disconnected.</p></div><div class="roadmap-card"><div class="roadmap-icon">${icon('activity')}</div><h3>Live progress</h3><p>Track the status of incoming and outgoing transfers in real time.</p></div></div>`;
}
function renderSettings(){
  panel.innerHTML=`${heading('MAKE IT YOURS','Settings','Manage your workspace, local backups, and app updates.')}
    <section class="panel setting-card"><div class="setting-line"><div><h3>Display name</h3><p>Make your workspace feel like your own.</p></div></div><form id="nameForm" class="settings-form"><input id="displayName" class="field flex-field" maxlength="50" value="${escapeHtml(data.settings.displayName)}" required><button class="button button-primary" type="submit">Save Name</button></form></section>
    <section class="panel setting-card"><div class="setting-line"><div><h3>Accent color</h3><p>Personalize LokiVerse without changing your local data.</p></div></div><div class="accent-options" role="group" aria-label="Accent color"><button class="accent-option ${data.settings.accent==='purple'?'selected':''}" data-accent="purple"><span class="accent-dot purple-dot"></span> Aurora purple</button><button class="accent-option ${data.settings.accent==='cyan'?'selected':''}" data-accent="cyan"><span class="accent-dot cyan-dot"></span> Arctic cyan</button><button class="accent-option ${data.settings.accent==='sunset'?'selected':''}" data-accent="sunset"><span class="accent-dot sunset-dot"></span> Sunset rose</button></div></section>
    <section class="panel setting-card"><div class="setting-line"><div><h3>Local backups</h3><p>Tasks and notes are saved on this PC. Export a JSON backup or restore an earlier backup.</p></div><div style="display:flex;gap:9px"><button class="button" id="exportBackup">${icon('download')} Export</button><button class="button button-ghost" id="importBackup">${icon('upload')} Restore</button></div></div></section>
    <section class="panel setting-card"><div class="setting-line"><div><h3>Version & updates</h3><p>Installed version: <strong>v${escapeHtml(info.version)}</strong>. New Windows installers update over the existing installation. GitHub Releases are publicly available without an app signing secret.</p><p id="updateMessage" class="fine-print"></p></div><div style="display:flex;gap:9px"><button class="button" id="checkUpdate">${icon('refresh')} Check Updates</button><button class="button button-ghost" id="releasePage">${icon('external')} Releases</button></div></div></section>
    <section class="panel setting-card"><div class="setting-line"><div><h3>Your storage</h3><p>Saved data folder: <strong>${escapeHtml(info.dataDirectory||'Local app data')}</strong></p><p>Files and notes stay on your computer unless you export or share them.</p></div><button class="button button-ghost" id="openDataFolder">${icon('folder')} Open Folder</button></div></section>
    <div class="fine-print">LokiVerse Creator Edition · MIT License · No account, telemetry, or cloud sync in v0.1.1.</div>`;
  q('#nameForm').addEventListener('submit',e=>{e.preventDefault();data.settings.displayName=q('#displayName').value.trim().slice(0,50)||'Creator';persist(true);renderSettings();});
  panel.querySelectorAll('[data-accent]').forEach(btn=>btn.addEventListener('click',()=>{data.settings.accent=btn.dataset.accent;applyAccent();persist(true);renderSettings();}));
  q('#exportBackup').addEventListener('click',async()=>{try{const result=await window.loki.exportBackup();if(!result.canceled)toast('Backup exported successfully.')}catch(e){fail(e)}});
  q('#importBackup').addEventListener('click',async()=>{try{await flushNoteEdits();const result=await window.loki.importBackup();if(!result.canceled){data=result.data;selectedNoteId=null;applyAccent();setSaveStatus('saved','✓ Saved locally');toast('Workspace restored.');renderSettings();}}catch(e){fail(e)}});
  q('#checkUpdate').addEventListener('click',checkUpdate);
  q('#releasePage').addEventListener('click',()=>window.loki.openReleases().catch(fail));
  q('#openDataFolder').addEventListener('click',()=>window.loki.openDataFolder().catch(fail));
}
async function checkUpdate(){
  const btn=q('#checkUpdate');if(btn)btn.disabled=true;
  const status=q('#updateMessage');if(status)status.textContent='Checking public GitHub Releases...';
  try{
    const result=await window.loki.checkUpdate();
    if(result.available){
      const msg=`A new version v${result.latest} is available. Open GitHub Releases to get the installer.`;
      if(status)status.textContent=msg;toast(msg);
      if(currentView!=='settings' && confirm(`${msg}\n\nOpen GitHub Releases now?`))await window.loki.openReleases();
    }else{const msg=result.message || `You're up to date (v${result.current}).`;if(status)status.textContent=msg;toast(msg);}
  }catch(error){if(status)status.textContent='Update check failed. You can try again later.';fail(error)}
  finally{if(btn)btn.disabled=false;}
}
function openPalette() {
  paletteVisible = true;
  paletteQuery = '';
  paletteIndex = 0;
  q('#commandPalette').hidden = false;
  q('#paletteInput').value = '';
  renderPaletteResults();
  q('#paletteInput').focus();
}
function closePalette() { paletteVisible=false; q('#commandPalette').hidden=true; }
function paletteAction(item) {
  closePalette();
  if (item.view) switchView(item.view);
  if (item.noteId) { selectedNoteId=item.noteId; noteQuery=''; switchView('notes'); }
  if (item.taskId) switchView('tasks');
}
function renderPaletteResults() {
  const query = paletteQuery.trim().toLowerCase();
  const matches = (s) => s.toLowerCase().includes(query);
  paletteItems = [
    ...Object.entries(pages).filter(([key])=>key!=='share').map(([view,title])=>({label:title,kind:'Module',view,icon:view==='home'?'home':view==='monitor'?'activity':view==='files'?'folder':view==='tasks'?'tasks':view==='notes'?'notes':'settings'})),
    ...data.notes.map(note=>({label:note.title||'Untitled note',kind:'Note',noteId:note.id,icon:'notes'})),
    ...data.tasks.map(task=>({label:task.title,kind:task.completed?'Completed task':'Task',taskId:task.id,icon:'tasks'}))
  ].filter(item=>matches(item.label)||matches(item.kind)).slice(0,12);
  const results=q('#paletteResults');
  results.innerHTML = paletteItems.length ? paletteItems.map((item,index)=>`<button class="palette-result ${paletteIndex===index?'selected':''}" data-palette-index="${index}" role="option" aria-selected="${paletteIndex===index}"><span class="palette-result-icon">${icon(item.icon,17)}</span><span>${escapeHtml(item.label)}</span><small>${escapeHtml(item.kind)}</small>${icon('arrow',14)}</button>`).join('') : '<div class="palette-empty">No matching modules, notes, or tasks.</div>';
  results.querySelectorAll('[data-palette-index]').forEach(btn=>btn.addEventListener('click',()=>paletteAction(paletteItems[Number(btn.dataset.paletteIndex)])));
}
function handlePaletteKey(event) {
  if(event.key==='Escape') { event.preventDefault();closePalette();return; }
  if(event.key==='ArrowDown' || event.key==='ArrowUp') {
    event.preventDefault();
    if(!paletteItems.length)return;
    paletteIndex=(paletteIndex+(event.key==='ArrowDown'?1:-1)+paletteItems.length)%paletteItems.length;
    renderPaletteResults();
  }
  if(event.key==='Enter' && paletteItems[paletteIndex]) {event.preventDefault();paletteAction(paletteItems[paletteIndex]);}
}
function handleShortcuts(event) {
  if((event.ctrlKey||event.metaKey) && event.key.toLowerCase()==='k') { event.preventDefault();paletteVisible?closePalette():openPalette(); }
  else if(event.key==='Escape' && paletteVisible) {event.preventDefault();closePalette();}
}
async function main(){
  renderNavIcons();
  q('#dateLabel').textContent=new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'});
  document.querySelectorAll('.nav-button').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.view)));
  q('#topUpdate').addEventListener('click',checkUpdate);
  q('#openPalette').addEventListener('click', openPalette);
  q('#paletteClose').addEventListener('click',closePalette);
  q('#paletteBackdrop').addEventListener('click',closePalette);
  q('#paletteInput').addEventListener('input',event=>{paletteQuery=event.target.value;paletteIndex=0;renderPaletteResults();});
  q('#paletteInput').addEventListener('keydown',handlePaletteKey);
  document.addEventListener('keydown', handleShortcuts);
  window.loki.onCloseRequest(async()=>{try{await flushNoteEdits();await window.loki.completeClose(true);}catch(error){fail(error);window.loki.completeClose(false).catch(fail);}});
  try{
    const loaded=await Promise.all([window.loki.load(),window.loki.info()]);data=loaded[0];info=loaded[1];
    q('#sidebarVersion').textContent=`v${info.version}`;
    applyAccent();
    setSaveStatus('saved', '✓ Saved locally');
    const recovery = await window.loki.getRecoveryStatus();
    if (recovery) toast(recovery, true);
    selectedNoteId=data.notes[0]?.id||null;
    render();
  }catch(error){
    panel.innerHTML=`<div class="center-card"><h2>Workspace could not load</h2><p>${escapeHtml(error.message||error)}</p><p>For your safety, no existing files have been overwritten.</p></div>`;fail(error);
  }
}
main();
