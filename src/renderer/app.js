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
let info = {version:'0.2.1'};
let currentView = 'home';
let taskFilter = 'all';
let taskSearch = '';
let taskCategory = 'all';
let selectedNoteId = null;
let noteQuery = '';
let noteFolder = 'all';
let notePreview = false;
let fileListing = null;
let fileQuery = '';
let fileSort = 'name';
let fileType = 'all';
let fileScan = null;
let fileResultsCache = [];
let system = null;
let cpuHistory = [];
let ramHistory = [];
let monitorTimer = null;
let shareTimer = null;
let shareQRURL = null;
let shareStatusVersion = -1;
let saveChain = Promise.resolve();
let noteSaveTimer = null;
let saveRevision = 0;
let lastSaveError = false;
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
  document.body.classList.toggle('compact-mode', data.settings?.compactMode === true);
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
    if (revision === saveRevision) { lastSaveError = false; setSaveStatus('saved', '✓ Saved locally'); }
    if (showToast) toast('Workspace saved locally.');
  }).catch(error => {
    lastSaveError = true;
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
  if (shareTimer) { clearInterval(shareTimer); shareTimer = null; }
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
    <div class="stats-grid"><div class="stat-card"><span class="stat-card-label">Total Tasks</span><div class="stat-icon">${icon('tasks')}</div><div class="stat-card-number">${data.tasks.length}</div><div class="stat-card-bottom">${data.tasks.filter(t=>t.category!=="General").length} organized by category</div></div><div class="stat-card"><span class="stat-card-label">Notes Created</span><div class="stat-icon">${icon('notes')}</div><div class="stat-card-number">${data.notes.length}</div><div class="stat-card-bottom">${data.notes.filter(n=>n.pinned).length} pinned ideas</div></div><div class="stat-card"><span class="stat-card-label">Tasks Finished</span><div class="stat-icon">${icon('check')}</div><div class="stat-card-number">${completed}</div><div class="stat-card-bottom">Keep the momentum going</div></div><div class="stat-card"><span class="stat-card-label">Workspace Modules</span><div class="stat-icon">${icon('sparkles')}</div><div class="stat-card-number">5<span style="font-size:14px;color:#9390ae"> / 5</span></div><div class="stat-card-bottom">Now includes LokiShare</div></div></div>
    <section class="progress-summary" aria-label="Task progress"><div class="progress-summary-copy"><span class="eyebrow">TODAY AT A GLANCE</span><h3>${completionPercent}% of tasks completed</h3><p>${pending.length} active · ${completed} finished · ${overdue} overdue</p></div><div class="progress-summary-track"><span style="width:${completionPercent}%"></span></div><button class="button button-ghost" data-goto="tasks">Manage tasks ${icon('arrow',15)}</button></section>
    <div class="two-col"><div><div class="section-header"><h3>Upcoming tasks</h3><button data-goto="tasks">View all →</button></div><div class="panel">${upcoming.length ? upcoming.map(t=>`<div class="mini-task"><input type="checkbox" class="checkbox" data-complete="${escapeHtml(t.id)}" aria-label="Mark completed"><div style="min-width:0;flex:1"><div class="mini-task-title">${escapeHtml(t.title)}</div><div class="mini-task-sub">${niceDate(t.due)}</div></div><span class="task-tag ${t.priority.toLowerCase()}">${escapeHtml(t.priority)}</span></div>`).join('') : emptyState('tasks','No pending tasks — you are all caught up!')}</div></div><div><div class="section-header"><h3>Quick launch</h3><button data-goto="settings">Customize →</button></div><div class="panel"><button class="quick-link" data-goto="notes"><span class="quick-icon">${icon('notes')}</span><span><strong>LokiNotes</strong><small>Capture your next big idea</small></span><span class="arrow">→</span></button><button class="quick-link" data-goto="files"><span class="quick-icon">${icon('folder')}</span><span><strong>LokiFiles</strong><small>Browse local files and folders</small></span><span class="arrow">→</span></button><button class="quick-link" data-goto="monitor"><span class="quick-icon">${icon('activity')}</span><span><strong>SystemPulse</strong><small>Live CPU and memory insights</small></span><span class="arrow">→</span></button></div></div></div>`;
  panel.querySelectorAll('[data-complete]').forEach(box=>box.addEventListener('change',()=>toggleTask(box.dataset.complete)));
  bindGoto();
}
function bindGoto() { panel.querySelectorAll('[data-goto]').forEach(btn=>btn.addEventListener('click',()=>switchView(btn.dataset.goto))); }
function toggleTask(taskId) { const task = data.tasks.find(t=>t.id===taskId); if (!task) return; task.completed=!task.completed; persist(); render(); }
function categoryChoices(items, selected, emptyLabel='All categories') {
  const groups=[...new Set(items.map(x=>x.category||x.folder||'General'))].sort((a,b)=>a.localeCompare(b));
  return `<option value="all" ${selected==='all'?'selected':''}>${emptyLabel}</option>`+groups.map(g=>`<option value="${escapeHtml(g)}" ${selected===g?'selected':''}>${escapeHtml(g)}</option>`).join('');
}
function renderTasks() {
  const total=data.tasks.length;
  const today=new Date();const todayKey=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  let shown=data.tasks.filter(t=>taskFilter==='all'||(taskFilter==='active'?!t.completed:taskFilter==='completed'?t.completed:taskFilter==='overdue'?!t.completed&&t.due&&t.due<todayKey:true));
  shown=shown.filter(t=>(taskCategory==='all'||(t.category||'General')===taskCategory) && (t.title+' '+(t.category||'')).toLowerCase().includes(taskSearch.toLowerCase()));
  shown.sort((a,b)=>(Number(a.completed)-Number(b.completed))||(a.due||'9999').localeCompare(b.due||'9999')||(b.createdAt||'').localeCompare(a.createdAt||''));
  panel.innerHTML = `${heading('MAKE EVERY DAY COUNT','My Tasks','Plan with priorities, categories and optional local desktop reminders.',`<span class="pill">${total} TOTAL TASKS</span>`)}
    <form id="taskForm" class="panel enhanced-form"><div class="form-row"><input class="field flex-field" name="title" placeholder="What needs to be done?" required maxlength="240" autocomplete="off"><select class="field" name="priority"><option>Normal</option><option>High</option><option>Low</option></select><button class="button button-primary" type="submit">${icon('plus')} Add task</button></div>
    <div class="form-row options-row"><label class="compact-label">Category<input class="field" name="category" maxlength="40" value="General" placeholder="Project name"></label><label class="compact-label">Due date<input class="field" name="due" type="date"></label><label class="compact-label">Time (optional)<input class="field" name="dueTime" type="time"></label><small class="fine-print">Reminders: at the selected time (9:00 AM if empty), while the app is running.</small></div></form>
    <div class="task-toolbar"><div class="filter-row">${[['all','All'],['active','Active'],['completed','Completed'],['overdue','Overdue']].map(([key,label])=>`<button class="filter-chip ${taskFilter===key?'active':''}" data-filter="${key}">${label}</button>`).join('')}</div><input id="taskSearch" class="field" type="search" placeholder="Find a task..." value="${escapeHtml(taskSearch)}"><select id="taskCategory" class="field">${categoryChoices(data.tasks,taskCategory)}</select></div>
    <div class="task-list">${shown.length?shown.map(t=>`<div class="task-row ${t.completed?'done':''}"><input type="checkbox" class="checkbox" data-complete="${escapeHtml(t.id)}" ${t.completed?'checked':''} aria-label="Toggle completed"><div class="task-main"><div class="task-name">${escapeHtml(t.title)}</div><div class="task-meta">${icon('calendar',12)} ${escapeHtml(niceDate(t.due))}${t.dueTime?' · '+escapeHtml(t.dueTime):''} · ${escapeHtml(t.category||'General')} · ${escapeHtml(compactTime(t.createdAt))}</div></div><span class="task-tag ${t.priority.toLowerCase()}">${escapeHtml(t.priority)}</span><button class="icon-button" data-edit-task="${escapeHtml(t.id)}" title="Edit task">${icon('settings')}</button><button class="icon-button danger-icon" data-delete-task="${escapeHtml(t.id)}" title="Delete task">${icon('trash')}</button></div>`).join(''):emptyState('check','No matching tasks')}</div>`;
  q('#taskForm').addEventListener('submit',e=>{
    e.preventDefault();const f=new FormData(e.currentTarget),title=String(f.get('title')||'').trim();if(!title)return;
    data.tasks.push({id:id(),title,priority:f.get('priority'),due:String(f.get('due')||''),dueTime:String(f.get('dueTime')||''),category:String(f.get('category')||'General').trim().slice(0,40)||'General',completed:false,createdAt:new Date().toISOString()});
    persist();toast('Task created.');renderTasks();
  });
  q('#taskSearch').addEventListener('input',e=>{taskSearch=e.target.value;const focused=q('#taskSearch');const start=focused.selectionStart;renderTasks();q('#taskSearch').focus();q('#taskSearch').setSelectionRange(start,start);});
  q('#taskCategory').addEventListener('change',e=>{taskCategory=e.target.value;renderTasks()});
  panel.querySelectorAll('[data-complete]').forEach(b=>b.addEventListener('change',()=>toggleTask(b.dataset.complete)));
  panel.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{taskFilter=b.dataset.filter;renderTasks()}));
  panel.querySelectorAll('[data-edit-task]').forEach(b=>b.addEventListener('click',()=>{
    const task=data.tasks.find(t=>t.id===b.dataset.editTask);if(!task)return;
    const title=prompt('Edit task title',task.title);if(title===null)return;
    if(!title.trim()){toast('Task title cannot be empty.',true);return;}
    const category=prompt('Category',task.category||'General');if(category===null)return;
    task.title=title.trim().slice(0,240);task.category=category.trim().slice(0,40)||'General';persist();renderTasks();
  }));
  panel.querySelectorAll('[data-delete-task]').forEach(b=>b.addEventListener('click',()=>{if(!confirm('Delete this task?'))return;data.tasks=data.tasks.filter(t=>t.id!==b.dataset.deleteTask);persist();renderTasks();}));
}
function renderMarkdown(value) {
  // Escape raw HTML first. Markdown preview deliberately excludes HTML, images and active links.
  let text=escapeHtml(value||'');
  text=text.replace(/^### (.+)$/gm,'<h3>$1</h3>').replace(/^## (.+)$/gm,'<h2>$1</h2>').replace(/^# (.+)$/gm,'<h1>$1</h1>');
  text=text.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>')
    .replace(/`([^`\n]+)`/g,'<code>$1</code>').replace(/^- (.+)$/gm,'<div class="md-bullet">• $1</div>');
  return text.split(/\n\n+/).map(block=>`<div class="md-paragraph">${block.replace(/\n/g,'<br>')}</div>`).join('');
}
function sortedNotes() {
  return [...data.notes].filter(n=>(noteFolder==='all'||(n.folder||'General')===noteFolder)&&
    (n.title+' '+n.body).toLowerCase().includes(noteQuery.toLowerCase()))
    .sort((a,b)=>Number(b.pinned)-Number(a.pinned)||(b.updatedAt||'').localeCompare(a.updatedAt||''));
}
function noteListHtml() {
  const filtered=sortedNotes();
  return filtered.length?filtered.map(n=>`<button class="note-item ${n.id===selectedNoteId?'selected':''}" data-note="${escapeHtml(n.id)}"><strong>${n.pinned?'✦ ':''}${escapeHtml(n.title||'Untitled note')}</strong><small>${escapeHtml(n.folder||'General')} · ${escapeHtml((n.body||'').replace(/\s+/g,' ').slice(0,40)||'Empty note')}</small></button>`).join(''):emptyState('notes','No notes found');
}
function renderNotes() {
  const selected=data.notes.find(n=>n.id===selectedNoteId);
  panel.innerHTML=`${heading('CAPTURE · ORGANIZE · CREATE','LokiNotes','Notes with folders, pinned ideas, Markdown formatting and safe local preview.',`<button class="button button-primary" id="newNote">${icon('plus')} New note</button>`)}
    <div class="note-layout"><section class="panel note-sidebar"><input class="field search" id="noteSearch" type="search" placeholder="Search notes..." value="${escapeHtml(noteQuery)}"><select id="noteFolderFilter" class="field note-folder-select">${categoryChoices(data.notes.map(n=>({category:n.folder||'General'})),noteFolder,'All folders')}</select><div id="noteList">${noteListHtml()}</div></section>
    <section class="panel note-editor">${selected?`<div class="note-editor-top"><input id="noteTitle" maxlength="140" placeholder="Untitled note" value="${escapeHtml(selected.title)}"><button class="button button-ghost" id="pinNote">${selected.pinned?'✦ Pinned':'☆ Pin'}</button></div><div class="note-tools"><label class="compact-label">Folder<input id="noteFolder" class="field" maxlength="40" value="${escapeHtml(selected.folder||'General')}" placeholder="Folder name"></label><div class="note-tabs"><button id="editNote" class="filter-chip ${!notePreview?'active':''}">Edit</button><button id="previewNote" class="filter-chip ${notePreview?'active':''}">Preview</button></div></div><div id="markdownToolbar" class="markdown-toolbar" ${notePreview?'hidden':''}><button class="format-btn" data-format="bold" title="Bold">B</button><button class="format-btn" data-format="italic" title="Italic"><i>I</i></button><button class="format-btn" data-format="heading" title="Heading">H1</button><button class="format-btn" data-format="bullet" title="Bullet">• List</button><span class="fine-print">Markdown supported · **bold**, *italic*, # heading</span></div><textarea id="noteBody" maxlength="100000" placeholder="Let your ideas flow..." ${notePreview?'hidden':''}></textarea><div id="noteRendered" class="markdown-preview" ${!notePreview?'hidden':''}>${renderMarkdown(selected.body)}</div><div class="editor-bottom"><span><span id="noteStatus">Saved locally</span> <span id="noteCount" class="word-count"></span></span><button id="deleteNote" class="button button-danger">${icon('trash')} Delete</button></div>`: `<div class="empty" style="margin:auto">${icon('notes',32)}<strong>Your thoughts, your universe.</strong><p>Create a note or select one.</p></div>`}</section></div>`;
  if(selected){q('#noteBody').value=selected.body;updateNoteCount();}
  q('#newNote').addEventListener('click',()=>{
    const note={id:id(),title:'Untitled note',body:'',folder:noteFolder==='all'?'General':noteFolder,pinned:false,updatedAt:new Date().toISOString()};
    data.notes.push(note);selectedNoteId=note.id;noteQuery='';notePreview=false;persist();renderNotes();q('#noteTitle').focus();q('#noteTitle').select();
  });
  q('#noteSearch').addEventListener('input',e=>{noteQuery=e.target.value;updateNoteList();});
  q('#noteFolderFilter').addEventListener('change',e=>{noteFolder=e.target.value;updateNoteList();});
  bindNoteItems();
  if(!selected)return;
  const onEdit=()=>{
    selected.title=q('#noteTitle').value;selected.body=q('#noteBody').value;selected.folder=q('#noteFolder').value.trim().slice(0,40)||'General';selected.updatedAt=new Date().toISOString();
    q('#noteStatus').textContent='Saving changes...';setSaveStatus('saving','● Saving…');updateNoteCount();
    if(noteSaveTimer)clearTimeout(noteSaveTimer);
    noteSaveTimer=setTimeout(async()=>{noteSaveTimer=null;try{await persist();const status=q('#noteStatus');if(status)status.textContent='Saved locally ✓';updateNoteList();}catch(error){fail(error);}},230);
  };
  ['noteTitle','noteBody','noteFolder'].forEach(id=>q('#'+id).addEventListener('input',onEdit));
  q('#pinNote').addEventListener('click',()=>{selected.pinned=!selected.pinned;persist();renderNotes();});
  q('#editNote').addEventListener('click',()=>{notePreview=false;renderNotes();});
  q('#previewNote').addEventListener('click',()=>{flushNoteEdits();notePreview=true;renderNotes();});
  panel.querySelectorAll('[data-format]').forEach(btn=>btn.addEventListener('click',()=>{
    const area=q('#noteBody'),a=area.selectionStart,b=area.selectionEnd,selection=area.value.slice(a,b)||'text';
    const fmt=btn.dataset.format;
    const wrapper=fmt==='bold'?`**${selection}**`:fmt==='italic'?`*${selection}*`:fmt==='heading'?`# ${selection}`:`- ${selection}`;
    area.setRangeText(wrapper,a,b,'select');area.dispatchEvent(new Event('input',{bubbles:true}));area.focus();
  }));
  q('#deleteNote').addEventListener('click',()=>{if(!confirm('Delete this note?'))return;data.notes=data.notes.filter(n=>n.id!==selected.id);selectedNoteId=data.notes[0]?.id||null;persist();renderNotes();});
}
function selectNote(noteId){flushNoteEdits();selectedNoteId=noteId;renderNotes();}
function updateNoteCount(){const el=q('#noteCount');if(el){const body=q('#noteBody')?.value||'';el.textContent=` · ${body.trim()?body.trim().split(/\s+/).length:0} words`;}}
function updateNoteList(){const list=q('#noteList');if(!list)return;list.innerHTML=noteListHtml();bindNoteItems();}
function bindNoteItems(){panel.querySelectorAll('[data-note]').forEach(b=>b.addEventListener('click',()=>selectNote(b.dataset.note)));}
async function browseFiles(relative='') {
  try{fileListing=await window.loki.listFiles(relative);fileQuery='';fileScan=null;if(currentView==='files')renderFiles();}
  catch(error){fail(error);}
}
function matchFileType(item) {
  if(fileType==='all') return true;
  if(fileType==='folders') return item.directory;
  if(item.directory) return false;
  const ext=(item.name.split('.').pop()||'').toLowerCase();
  const formats={docs:['pdf','doc','docx','txt','md','csv','xlsx','xls','ppt','pptx'],images:['jpg','jpeg','png','webp','gif','bmp','svg'],audio:['mp3','wav','flac','ogg','m4a'],video:['mp4','mkv','mov','webm','avi']};
  return (formats[fileType]||[]).includes(ext);
}
function sortedFiles(){
  if(!fileListing)return [];
  const items=fileScan?fileScan.results:fileListing.entries.filter(x=>x.name.toLowerCase().includes(fileQuery.toLowerCase()));
  return [...items].filter(matchFileType).sort((a,b)=>Number(b.directory)-Number(a.directory)||(
    fileSort==='modified'?String(b.modified).localeCompare(String(a.modified)):
    fileSort==='size'?(b.size||0)-(a.size||0):a.name.localeCompare(b.name)));
}
function renderFiles(){
  panel.innerHTML=`${heading('EXPLORE MORE · STAY IN CONTROL','LokiFiles','Browse, search subfolders, spot duplicates, organize folders and rename items.',`<button class="button button-primary" id="pickFolder">${icon('folder')} Choose folder</button>`)}
    <section class="panel files-panel"><div class="folder-toolbar"><button class="button button-ghost" id="goParent" ${!fileListing||!fileListing.relative?'disabled':''}>${icon('back')} Up</button><div class="folder-path">${fileListing?escapeHtml(fileListing.root+(fileListing.relative?'\\'+fileListing.relative:'')):'No folder selected'}</div><button class="button button-ghost" id="newFolder" ${!fileListing?'disabled':''}>${icon('plus')} Folder</button></div>
    <div class="file-tools"><input id="fileSearch" class="field flex-field" type="search" placeholder="Search current folder..." value="${escapeHtml(fileQuery)}" ${!fileListing?'disabled':''}><select id="fileType" class="field">${[['all','All types'],['folders','Folders'],['docs','Documents'],['images','Images'],['audio','Audio'],['video','Videos']].map(([val,label])=>`<option value="${val}" ${fileType===val?'selected':''}>${label}</option>`).join('')}</select><select id="fileSort" class="field"><option value="name" ${fileSort==='name'?'selected':''}>Name</option><option value="modified" ${fileSort==='modified'?'selected':''}>Recently modified</option><option value="size" ${fileSort==='size'?'selected':''}>Largest</option></select></div>
    <div class="file-tools scan-tools"><button class="button button-ghost" id="deepSearch" ${!fileListing?'disabled':''}>${icon('search')} Search subfolders</button><button class="button button-ghost" id="findDuplicates" ${!fileListing?'disabled':''}>${icon('harddrive')} Find duplicates</button><button class="button button-ghost" id="clearScan" ${!fileScan?'disabled':''}>Current folder</button><span class="fine-print">Scans selected root only · capped to protect system performance</span></div><div id="fileResults">${fileListing?fileResultsHtml():emptyState('folder','Choose a folder to get started')}</div></section>`;
  q('#pickFolder').addEventListener('click',async()=>{try{const result=await window.loki.selectFolder();if(!result.canceled)await browseFiles('');}catch(e){fail(e)}});
  q('#goParent').addEventListener('click',()=>{const parts=(fileListing?.relative||'').split(/[\\/]/).filter(Boolean);parts.pop();browseFiles(parts.join('\\'));});
  q('#fileSearch').addEventListener('input',e=>{fileQuery=e.target.value;if(!fileScan)updateFileResults();});
  q('#fileSort').addEventListener('change',e=>{fileSort=e.target.value;updateFileResults();});
  q('#fileType').addEventListener('change',e=>{fileType=e.target.value;updateFileResults();});
  q('#newFolder').addEventListener('click',async()=>{
    const name=prompt('Name of your new folder');if(name===null)return;
    try{await window.loki.createFolder(fileListing.relative,name.trim());toast('Folder created.');await browseFiles(fileListing.relative);}catch(e){fail(e)}
  });
  q('#deepSearch').addEventListener('click',async()=>{
    const term=prompt('Search file/folder names in all subfolders of the selected root:',fileQuery);
    if(term===null||!term.trim()){toast('Enter a search term first.');return;}await runScan({query:term.trim(),duplicates:false});
  });
  q('#findDuplicates').addEventListener('click',async()=>{await runScan({duplicates:true});});
  q('#clearScan').addEventListener('click',()=>{fileScan=null;fileQuery='';renderFiles();});
  bindFileResults();
}
async function runScan(options){
  const output=q('#fileResults');if(output)output.innerHTML='<div class="scan-loading">Scanning selected folder... Please keep LokiVerse open.</div>';
  try{const result=await window.loki.scanFiles(options);fileScan=result;if(currentView==='files')updateFileResults();}
  catch(error){fail(error);if(currentView==='files')updateFileResults();}
}
function fileResultsHtml(){
  if(!fileListing)return '';
  let shown;
  if(fileScan?.mode==='duplicates') shown=fileScan.groups.flatMap((group,index)=>group.map(f=>({...f,duplicateGroup:index+1}))).filter(matchFileType);
  else shown=sortedFiles();
  fileResultsCache=shown;
  const message=fileScan?(fileScan.mode==='duplicates'?`${fileScan.groups.length} duplicate group(s) · ${fileScan.hashed} files hashed`:`${shown.length} matches in selected root`)+` · ${fileScan.scanned} scanned${fileScan.truncated?' · LIMIT REACHED, results partial':''}${fileScan.skipped?' · '+fileScan.skipped+' skipped':''}`:`${fileListing.entries.length} item(s)${fileListing.truncated?' · Showing first 1,500':''}`;
  return `<div class="scan-summary">${escapeHtml(message)}</div>${shown.length?`<div class="table-scroll"><table class="files-table"><thead><tr><th>NAME</th><th>TYPE / GROUP</th><th>SIZE</th><th>MODIFIED</th><th>ACTIONS</th></tr></thead><tbody>${shown.map((f,i)=>`<tr><td class="name-cell"><span class="file-icon">${icon(f.directory?'folder':'file')}</span><button class="file-open" data-file="${i}" title="${escapeHtml(f.relative)}">${escapeHtml(f.name)}</button>${fileScan?`<small class="file-path-hint">${escapeHtml(f.relative)}</small>`:''}</td><td>${f.duplicateGroup?'Duplicate #'+f.duplicateGroup:f.directory?'Folder':escapeHtml((f.name.split('.').pop()||'File').toUpperCase())}</td><td>${f.directory?'—':bytes(f.size)}</td><td>${niceDate(f.modified)}</td><td><div class="file-actions"><button class="icon-button" data-reveal="${i}" title="Show in Explorer">${icon('external')}</button>${!fileScan?`<button class="icon-button" data-rename="${i}" title="Rename item">${icon('settings')}</button>`:''}</div></td></tr>`).join('')}</tbody></table></div>`:emptyState('search',fileScan?'No matches found':'No files in this folder')}`;
}
function updateFileResults(){const el=q('#fileResults');if(el){el.innerHTML=fileResultsHtml();bindFileResults();}}
function bindFileResults(){
  panel.querySelectorAll('[data-file]').forEach(b=>b.addEventListener('click',async()=>{
    const item=fileResultsCache[Number(b.dataset.file)];if(!item)return;
    try{if(item.directory){await browseFiles(item.relative);}else await window.loki.openFile(item.relative);}catch(e){fail(e)}
  }));
  panel.querySelectorAll('[data-reveal]').forEach(b=>b.addEventListener('click',async()=>{
    const item=fileResultsCache[Number(b.dataset.reveal)];if(!item)return;
    try{await window.loki.revealFile(item.relative);}catch(e){fail(e)}
  }));
  panel.querySelectorAll('[data-rename]').forEach(b=>b.addEventListener('click',async()=>{
    const item=fileResultsCache[Number(b.dataset.rename)];if(!item)return;
    const name=prompt('Rename file or folder:',item.name);if(name===null||name===item.name)return;
    try{await window.loki.renameFile(item.relative,name.trim());toast('Item renamed.');await browseFiles(fileListing.relative);}catch(e){fail(e)}
  }));
}
function sparkline(points, label){
  const samples=points.slice(-40);if(samples.length<2)return '<span class="fine-print">Gathering history…</span>';
  const coords=samples.map((v,i)=>`${(i/(39||1)*100).toFixed(1)},${(100-v).toFixed(1)}`).join(' ');
  return `<svg class="history-chart" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="${escapeHtml(label)} history"><polyline points="${coords}" fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>`;
}
function renderMonitor(){
  panel.innerHTML=`${heading('LIVE · PRIVATE · LOCAL','SystemPulse','CPU, RAM and primary-drive statistics, refreshed every 3 seconds.',`<span class="pill">${icon('activity',13)} LIVE</span>`)}
    <div class="monitor-grid"><div class="panel metric-panel"><span class="eyebrow">CPU UTILIZATION</span><div class="big-number" id="cpuPercent">—<small>%</small></div><div class="progress-track"><div class="progress-fill" id="cpuBar"></div></div><div id="cpuChart" class="chart-wrap">${sparkline(cpuHistory,'CPU')}</div></div><div class="panel metric-panel"><span class="eyebrow">MEMORY USAGE</span><div class="big-number" id="ramPercent">—<small>%</small></div><div class="progress-track"><div class="progress-fill green" id="ramBar"></div></div><div id="ramChart" class="chart-wrap">${sparkline(ramHistory,'RAM')}</div><p class="fine-print" id="ramDetails">Reading memory…</p></div></div>
    <div class="section-header"><h3>Device insights</h3></div><div class="panel device-insights" id="systemDetails">${emptyState('activity','Gathering system details...')}</div>
    <p class="fine-print">Charts show recent sampled utilization while SystemPulse is open. Disk figures cover the drive containing your user folder, not every drive. Temperature/GPU telemetry is not supported.</p>`;
  refreshStats();monitorTimer=setInterval(()=>{if(currentView==='monitor')refreshStats();},3000);
}
async function refreshStats(){
  try{
    const result=await window.loki.stats();if(currentView!=='monitor')return;system=result;
    const cpu=system.cpu==null?null:Math.round(system.cpu),ram=system.memoryTotal?Math.round(100*system.memoryUsed/system.memoryTotal):0;
    if(cpu!==null)cpuHistory.push(cpu);ramHistory.push(ram);cpuHistory=cpuHistory.slice(-40);ramHistory=ramHistory.slice(-40);
    q('#cpuPercent').innerHTML=`${cpu??'—'}<small>%</small>`;q('#cpuBar').style.width=`${cpu||0}%`;
    q('#ramPercent').innerHTML=`${ram}<small>%</small>`;q('#ramBar').style.width=`${ram}%`;
    q('#ramDetails').textContent=`${bytes(system.memoryUsed)} of ${bytes(system.memoryTotal)} in use`;
    q('#cpuChart').innerHTML=sparkline(cpuHistory,'CPU');q('#ramChart').innerHTML=sparkline(ramHistory,'RAM');
    const disk=system.disk;
    const rows=[['Computer',system.hostname],['Processor',system.cpuName],['Logical CPUs',system.cores],['Operating system',system.platform],['Uptime',`${Math.floor(system.uptime/3600)}h ${Math.floor((system.uptime%3600)/60)}m`]];
    if(disk){rows.push(['User drive',disk.location],['Drive free / total',`${bytes(disk.free)} free of ${bytes(disk.total)}`]);}
    q('#systemDetails').innerHTML=rows.map(([a,b])=>`<div class="detail-row"><span>${escapeHtml(a)}</span><strong>${escapeHtml(b)}</strong></div>`).join('');
  }catch(error){if(currentView==='monitor')fail(error);}
}
function renderShare(){
  panel.innerHTML=`${heading('CONNECT YOUR DEVICES','LokiShare','Send files between Windows and your phone on the same private Wi-Fi. No cloud required.')}
    <section class="share-intro"><span class="share-live">${icon('share')} ENCRYPTED LOCAL FILE TRANSFER · v0.4.0</span><h2>Your files. Your devices.<br><strong>One local connection.</strong></h2><p>Start a temporary sharing session, approve your phone, and choose exactly which files and folders to share.</p><div class="share-steps"><span>① Start Windows host</span><span>② Scan QR with Android app</span><span>③ Approve matching number</span><span>④ Transfer directly</span></div></section>
    <div class="share-layout"><div>
      <section class="panel share-card"><div class="section-header"><h3>Connection</h3><span class="share-badge" id="shareBadge">Offline</span></div>
      <p class="muted share-info">Choose the private network connected to your phone. LokiShare starts only when you click Start.</p>
      <div class="share-controls"><select class="field" id="shareInterface" aria-label="Network interface"><option value="">Loading local networks…</option></select><button class="button button-primary" id="shareStart">${icon('share')} Start sharing</button><button class="button button-danger" id="shareStop" hidden>Stop sharing</button></div>
      <div id="shareInvite" hidden><div class="share-qr-layout"><div id="shareQR" class="share-qr"><span>QR code</span></div><div><span class="eyebrow">HTTPS ADDRESS · ANDROID QR PAIRING</span><div class="share-link" id="shareLink"></div><div class="share-code" id="shareCode"></div><p class="fine-print">Scan the QR from the LokiShare Android companion for certificate-pinned HTTPS. Browser access may show a self-signed certificate warning; never bypass it on an untrusted network.</p></div></div></div></section>
      <section class="panel share-card"><div class="section-header"><h3>Incoming · Phone → Windows</h3><span class="share-direction">RECEIVE</span></div><p class="muted share-info">Files sent by an approved phone are stored only in the folder you select. Original files are never overwritten.</p><div id="shareInbox" class="share-path">No receive folder selected</div><div class="share-controls"><button class="button" id="shareChooseInbox">${icon('folder')} Choose receive folder</button><button class="button button-ghost" id="shareDisableInbox">Disable receiving</button></div></section>
      <section class="panel share-card"><div class="section-header"><h3>Outgoing · Windows → Phone</h3><span class="share-direction">SEND</span></div><p class="muted share-info">The phone can download only files you explicitly choose below. Downloads must be started on the phone.</p><button class="button" id="shareAddFiles">${icon('plus')} Add files to share</button><div id="shareSharedFiles" class="share-list"></div></section>
    </div><div>
      <section class="panel share-card"><div class="section-header"><h3>Pairing requests</h3><span class="share-badge">PC APPROVAL</span></div><p class="muted share-info">Compare the 6-digit number on both screens before approving a device. Never approve unknown devices.</p><div id="sharePending" class="share-list"></div></section>
      <section class="panel share-card"><div class="section-header"><h3>Approved phones</h3><span class="share-badge">SESSION ONLY</span></div><div id="shareClients" class="share-list"></div></section>
      <section class="panel share-card"><div class="section-header"><h3>Live activity</h3><span class="share-badge">TRANSFER HISTORY</span></div><div id="shareTransfers" class="share-list"></div></section>
      <section class="share-security">${icon('shield')} <div><strong>Encrypted Wi-Fi transfers with certificate pinning.</strong><p>v0.4.0 uses HTTPS and a unique local certificate. The Android app verifies the certificate fingerprint from your QR invitation. Browser pairing requires manually trusting the self-signed certificate; prefer the native Android companion. Still use trusted private Wi-Fi.</p></div></section>
    </div></div>`;
  q('#shareStart').addEventListener('click', async()=>{const address=q('#shareInterface').value;if(!address)return toast('Select a private network first.',true);await shareCall(()=>window.loki.shareStart(address));});
  q('#shareStop').addEventListener('click', async()=>{if(!confirm('End this sharing session and disconnect all phones?'))return;shareQRURL=null;await shareCall(()=>window.loki.shareStop());});
  q('#shareChooseInbox').addEventListener('click',()=>shareCall(()=>window.loki.shareChooseInbox()));
  q('#shareDisableInbox').addEventListener('click',()=>shareCall(()=>window.loki.shareDisableInbox()));
  q('#shareAddFiles').addEventListener('click',()=>shareCall(()=>window.loki.shareAddFiles()));
  window.loki.shareInterfaces().then(addresses=>{
    if(currentView!=='share')return;
    q('#shareInterface').innerHTML=addresses.length?addresses.map(item=>`<option value="${escapeHtml(item.address)}">${escapeHtml(item.name)} · ${escapeHtml(item.address)}</option>`).join(''):'<option value="">No private network detected</option>';
    q('#shareStart').disabled=!addresses.length;
  }).catch(fail);
  shareStatusVersion=-1;
  refreshShare().catch(fail);
  shareTimer=setInterval(()=>{if(currentView==='share')refreshShare().catch(()=>{});},1400);
}
async function shareCall(action){
  try {await action();await refreshShare();}catch(error){fail(error);}
}
async function refreshShare(){
  if(currentView!=='share')return;
  const state=await window.loki.shareStatus();
  if(currentView!=='share'||state.version===shareStatusVersion)return;
  shareStatusVersion=state.version;
  const running=state.running;
  q('#shareStart').hidden=running;q('#shareStop').hidden=!running;q('#shareInterface').disabled=running;
  q('#shareBadge').textContent=running?'● Sharing active':'Offline';q('#shareBadge').classList.toggle('online',running);
  q('#shareInvite').hidden=!running;
  q('#shareInbox').textContent=state.inbox||'No receive folder selected';
  q('#shareAddFiles').disabled=!running;
  if(running){
    q('#shareLink').textContent=state.url;
    q('#shareCode').textContent=state.code;
    q('#shareLink').title='TLS SHA256: '+state.tlsFingerprint;
    if(shareQRURL!==state.url){
      shareQRURL=state.url;
      q('#shareQR').innerHTML='<span>Generating pairing QR…</span>';
      window.loki.shareQRCode().then(url=>{
        if(currentView==='share'&&shareQRURL===state.url){
          if(url){const img=document.createElement('img');img.src=url;img.alt='QR code for connecting to LokiShare';q('#shareQR').replaceChildren(img);}
          else q('#shareQR').textContent='Open the local address on your phone.';
        }
      }).catch(()=>{if(currentView==='share')q('#shareQR').textContent='Use the address and code shown here.';});
    }
  } else {shareQRURL=null;q('#shareQR').textContent='QR code';}
  q('#shareSharedFiles').innerHTML=state.files.length?state.files.map(f=>`<div class="share-row"><div>${icon('file',17)} <span><strong>${escapeHtml(f.name)}</strong><small>${bytes(f.size)}</small></span></div><button class="share-row-action" data-remove-share="${escapeHtml(f.id)}">Remove</button></div>`).join(''):'<div class="share-empty">No files selected. Add files to make them downloadable on your phone.</div>';
  q('#sharePending').innerHTML=state.pending.length?state.pending.map(p=>`<div class="share-request"><div class="share-request-head">${icon('activity')} <strong>${escapeHtml(p.device)}</strong></div><span class="eyebrow">MATCH NUMBER ON BOTH SCREENS</span><div class="share-match">${escapeHtml(p.match)}</div><div class="share-controls"><button class="button button-primary" data-pair-yes="${escapeHtml(p.id)}">${icon('check')} Approve</button><button class="button button-danger" data-pair-no="${escapeHtml(p.id)}">Reject</button></div></div>`).join(''):'<div class="share-empty">No pairing requests. Use the QR code or connection code to connect.</div>';
  q('#shareClients').innerHTML=state.clients.length?state.clients.map(c=>`<div class="share-row"><div>${icon('check',17)}<span><strong>${escapeHtml(c.device)}</strong><small>Authorized for this session</small></span></div><button class="share-row-action" data-revoke="${escapeHtml(c.id)}">Disconnect</button></div>`).join(''):'<div class="share-empty">No phones connected.</div>';
  q('#shareTransfers').innerHTML=state.transfers.length?state.transfers.slice(0,8).map(t=>`<div class="share-transfer"><div><strong>${escapeHtml(t.name)}</strong><span>${escapeHtml(t.direction)} · ${escapeHtml(t.status)} · ${bytes(t.bytes)} / ${bytes(t.size)}</span></div><div class="share-progress"><span style="width:${Math.min(100,t.size?Math.round(t.bytes/t.size*100):100)}%"></span></div></div>`).join(''):'<div class="share-empty">Your transfers will appear here.</div>';
  panel.querySelectorAll('[data-remove-share]').forEach(el=>el.addEventListener('click',()=>shareCall(()=>window.loki.shareRemoveFile(el.dataset.removeShare))));
  panel.querySelectorAll('[data-pair-yes]').forEach(el=>el.addEventListener('click',()=>shareCall(()=>window.loki.shareApprove(el.dataset.pairYes,true))));
  panel.querySelectorAll('[data-pair-no]').forEach(el=>el.addEventListener('click',()=>shareCall(()=>window.loki.shareApprove(el.dataset.pairNo,false))));
  panel.querySelectorAll('[data-revoke]').forEach(el=>el.addEventListener('click',()=>shareCall(()=>window.loki.shareRevoke(el.dataset.revoke))));
}
function renderSettings(){
  panel.innerHTML=`${heading('MAKE IT YOURS','Settings','Manage your workspace, local backups, and app updates.')}
    <section class="panel setting-card"><div class="setting-line"><div><h3>Display name</h3><p>Make your workspace feel like your own.</p></div></div><form id="nameForm" class="settings-form"><input id="displayName" class="field flex-field" maxlength="50" value="${escapeHtml(data.settings.displayName)}" required><button class="button button-primary" type="submit">Save Name</button></form></section>
    <section class="panel setting-card"><div class="setting-line"><div><h3>Accent color</h3><p>Personalize LokiVerse without changing your local data.</p></div></div><div class="accent-options" role="group" aria-label="Accent color"><button class="accent-option ${data.settings.accent==='purple'?'selected':''}" data-accent="purple"><span class="accent-dot purple-dot"></span> Aurora purple</button><button class="accent-option ${data.settings.accent==='cyan'?'selected':''}" data-accent="cyan"><span class="accent-dot cyan-dot"></span> Arctic cyan</button><button class="accent-option ${data.settings.accent==='sunset'?'selected':''}" data-accent="sunset"><span class="accent-dot sunset-dot"></span> Sunset rose</button></div></section>
    <section class="panel setting-card"><div class="setting-line"><div><h3>Workspace preferences</h3><p>Reminders appear while LokiVerse is running. Compact mode fits more content on screen.</p></div><div class="setting-toggles"><label><input id="remindersEnabled" type="checkbox" ${data.settings.reminders!==false?'checked':''}> Task reminders</label><label><input id="compactEnabled" type="checkbox" ${data.settings.compactMode?'checked':''}> Compact layout</label></div></div></section>
    <section class="panel setting-card"><div class="setting-line"><div><h3>Local backups</h3><p>Tasks, categories, notes, and settings are saved locally. Export a JSON backup or restore an earlier backup.</p></div><div style="display:flex;gap:9px"><button class="button" id="exportBackup">${icon('download')} Export</button><button class="button button-ghost" id="importBackup">${icon('upload')} Restore</button></div></div></section>
    <section class="panel setting-card"><div class="setting-line"><div><h3>Version & updates</h3><p>Installed version: <strong>v${escapeHtml(info.version)}</strong>. New Windows installers update over the existing installation. GitHub Releases are publicly available without an app signing secret.</p><p id="updateMessage" class="fine-print"></p></div><div style="display:flex;gap:9px"><button class="button" id="checkUpdate">${icon('refresh')} Check Updates</button><button class="button button-ghost" id="releasePage">${icon('external')} Releases</button></div></div></section>
    <section class="panel setting-card"><div class="setting-line"><div><h3>Your storage</h3><p>Saved data folder: <strong>${escapeHtml(info.dataDirectory||'Local app data')}</strong></p><p>Files and notes stay on your computer unless you export or share them.</p></div><button class="button button-ghost" id="openDataFolder">${icon('folder')} Open Folder</button></div></section>
    <div class="fine-print">LokiVerse Creator Edition · MIT License · No account, telemetry, or cloud sync in v0.4.0. LokiShare runs only when enabled and uses local HTTPS.</div>`;
  q('#nameForm').addEventListener('submit',e=>{e.preventDefault();data.settings.displayName=q('#displayName').value.trim().slice(0,50)||'Creator';persist(true);renderSettings();});
  panel.querySelectorAll('[data-accent]').forEach(btn=>btn.addEventListener('click',()=>{data.settings.accent=btn.dataset.accent;applyAccent();persist(true);renderSettings();}));
  q('#remindersEnabled').addEventListener('change',e=>{data.settings.reminders=e.target.checked;persist(true);});
  q('#compactEnabled').addEventListener('change',e=>{data.settings.compactMode=e.target.checked;applyAccent();persist(true);});
  q('#exportBackup').addEventListener('click',async()=>{try{const result=await window.loki.exportBackup();if(!result.canceled)toast('Backup exported successfully.')}catch(e){fail(e)}});
  q('#importBackup').addEventListener('click',async()=>{try{await flushNoteEdits();const result=await window.loki.importBackup();if(!result.canceled){data=result.data;selectedNoteId=null;noteFolder='all';taskCategory='all';applyAccent();setSaveStatus('saved','✓ Saved locally');toast('Workspace restored.');renderSettings();}}catch(e){fail(e)}});
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
    ...Object.entries(pages).map(([view,title])=>({label:title,kind:'Module',view,icon:view==='home'?'home':view==='monitor'?'activity':view==='files'?'folder':view==='tasks'?'tasks':view==='notes'?'notes':'settings'})),
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
  window.loki.onShareChanged(()=>{if(currentView==='share')refreshShare().catch(()=>{});});
  window.loki.onCloseRequest(async()=>{try{await flushNoteEdits();await window.loki.completeClose(!lastSaveError);}catch(error){fail(error);window.loki.completeClose(false).catch(fail);}});
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
