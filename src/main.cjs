'use strict';
const { app, BrowserWindow, dialog, ipcMain, shell, Notification } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const https = require('node:https');
const os = require('node:os');
const { compareVersions, isWithinFolder } = require('./shared/logic.cjs');
const { createStorage } = require('./shared/storage.cjs');
const { createFileOps } = require('./shared/fileops.cjs');
const { dueReminders } = require('./shared/reminders.cjs');
const { createLokiShare, listPrivateInterfaces } = require('./shared/lokishare.cjs');

// Keep this identifier, package.json build.appId, and productName stable across releases.
// Electron's userData directory is likewise kept stable: installs preserve tasks and notes.
const RELEASE_REPOSITORY = 'LokiJ07/LokiVerse';
let mainWindow;
let selectedRoot = null;
let saving = Promise.resolve();
let cpuPrevious = null;
let workspaceRecovery = null;
let allowingClose = false;
let waitingForClose = false;
let closeTimeout = null;
const notifiedTasks = new Set();
let reminderBusy = false;
let remindersLoaded = false;
const lokiShare = createLokiShare({identityDir: path.join(app.getPath('userData'),'share-security'), historyFile: path.join(app.getPath('userData'),'lokishare-transfer-history.json'), onChange: () => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('share:changed'); }});

function dataFile() { return path.join(app.getPath('userData'), 'lokiverse-data.json'); }
function storage() { return createStorage(dataFile()); }
async function readData() {
  const result = await storage().read();
  if (result.recovered) workspaceRecovery = 'A previous backup was recovered after an unreadable workspace file. The original was preserved in your data folder.';
  return result.data;
}
async function writeData(data) { return storage().write(data); }
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1350, height: 850, minWidth: 980, minHeight: 640,
    show: false, backgroundColor: '#0b0c16',
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true, sandbox: true, nodeIntegration: false,
      webSecurity: true
    }
  });
  mainWindow.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  mainWindow.on('close', event => {
    if (allowingClose) return;
    event.preventDefault();
    if (waitingForClose) return;
    waitingForClose = true;
    mainWindow.webContents.send('app:requestClose');
    closeTimeout = setTimeout(async () => {
      closeTimeout = null;
      if (!mainWindow || mainWindow.isDestroyed() || !waitingForClose) return;
      const result = await dialog.showMessageBox(mainWindow, {
        type: 'warning', title: 'LokiVerse is still saving',
        message: 'The workspace did not confirm that saving finished.',
        detail: 'You can keep the app open or close it without confirming the latest changes were saved.',
        buttons: ['Keep open', 'Close anyway'], defaultId: 0, cancelId: 0
      });
      waitingForClose = false;
      if (result.response === 1) { allowingClose = true; mainWindow.close(); }
    }, 12000);
  });
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', event => event.preventDefault());
}
const safeHandle = (name, fn) => ipcMain.handle(name, (_, ...args) => fn(...args));

// SECURITY: the renderer gets named operations only. It never receives unrestricted fs/shell APIs.
function registerHandlers() {
  safeHandle('app:getInfo', () => ({ version: app.getVersion(), repository: RELEASE_REPOSITORY, dataDirectory: app.getPath('userData') }));
  safeHandle('data:load', readData);
  safeHandle('data:recoveryStatus', () => { const message = workspaceRecovery; workspaceRecovery = null; return message; });
  safeHandle('app:completeClose', async wasSaved => {
    if (!waitingForClose) return false;
    if (closeTimeout) clearTimeout(closeTimeout);
    closeTimeout = null;
    waitingForClose = false;
    if (wasSaved !== true) {
      await dialog.showMessageBox(mainWindow, { type: 'error', title: 'Workspace was not saved', message: 'Your latest changes could not be saved. LokiVerse will remain open so you can retry or make a backup.' });
      return false;
    }
    await saving;
    allowingClose = true;
    mainWindow.close();
    return true;
  });
  safeHandle('data:save', data => {
    const operation = saving.then(() => writeData(data));
    saving = operation.catch(() => {});
    return operation;
  });
  safeHandle('data:export', async () => {
    await saving;
    const selection = await dialog.showSaveDialog(mainWindow, {
      title: 'Export LokiVerse backup', defaultPath: 'LokiVerse-Backup.json',
      filters: [{ name: 'JSON backup', extensions: ['json'] }]
    });
    if (selection.canceled || !selection.filePath) return { canceled: true };
    await fs.writeFile(selection.filePath, JSON.stringify(await readData(), null, 2), 'utf8');
    return { canceled: false, filePath: selection.filePath };
  });
  safeHandle('data:import', async () => {
    const selection = await dialog.showOpenDialog(mainWindow, {
      title: 'Restore LokiVerse backup', properties: ['openFile'],
      filters: [{ name: 'JSON backup', extensions: ['json'] }]
    });
    if (selection.canceled || !selection.filePaths[0]) return { canceled: true };
    const rawText = await fs.readFile(selection.filePaths[0], 'utf8');
    if (Buffer.byteLength(rawText) > 15 * 1024 * 1024) throw new Error('Backup exceeds 15 MB.');
    const input = JSON.parse(rawText);
    if (!input || !Array.isArray(input.tasks) || !Array.isArray(input.notes)) throw new Error('Invalid LokiVerse backup.');
    const yes = await dialog.showMessageBox(mainWindow, {
      type: 'warning', buttons: ['Cancel', 'Replace workspace'], defaultId: 0, cancelId: 0,
      title: 'Restore workspace?', message: 'This will replace your current notes and tasks.',
      detail: 'Export a backup of your current workspace first if you want to keep it.'
    });
    if (yes.response !== 1) return { canceled: true };
    const operation = saving.then(() => writeData(input));
    saving = operation.catch(() => {});
    const restored = await operation;
    notifiedTasks.clear();
    return { canceled: false, data: restored };
  });
  safeHandle('data:openFolder', () => shell.openPath(app.getPath('userData')));
  safeHandle('files:selectFolder', async () => {
    const selection = await dialog.showOpenDialog(mainWindow, {
      title: 'Select folder to explore', properties: ['openDirectory']
    });
    if (selection.canceled || !selection.filePaths[0]) return { canceled: true };
    selectedRoot = await fs.realpath(selection.filePaths[0]);
    return { canceled: false, root: selectedRoot };
  });
  async function authorizedPath(relative) {
    if (!selectedRoot) throw new Error('Select a folder first.');
    if (typeof relative !== 'string' || relative.length > 4096) throw new Error('Invalid file path.');
    const requested = path.resolve(selectedRoot, relative);
    if (!isWithinFolder(selectedRoot, requested)) throw new Error('Path is outside selected folder.');
    const real = await fs.realpath(requested);
    if (!isWithinFolder(selectedRoot, real)) throw new Error('Path points outside selected folder.');
    return real;
  }
  safeHandle('files:list', async relative => {
    const folder = await authorizedPath(relative);
    if (!(await fs.stat(folder)).isDirectory()) throw new Error('Not a folder.');
    const entries = await fs.readdir(folder, { withFileTypes: true });
    const results = await Promise.all(entries.slice(0, 1500).map(async entry => {
      try {
        const full = path.join(folder, entry.name);
        const stat = await fs.stat(full);
        return { name: entry.name, directory: stat.isDirectory(), size: stat.isFile() ? stat.size : 0,
          modified: stat.mtime.toISOString(), relative: path.relative(selectedRoot, full),
          symlink: entry.isSymbolicLink() };
      } catch { return null; }
    }));
    return { root: selectedRoot, relative: path.relative(selectedRoot, folder), truncated: entries.length > 1500,
      entries: results.filter(Boolean).sort((a, b) => Number(b.directory) - Number(a.directory) || a.name.localeCompare(b.name)) };
  });
  safeHandle('files:createFolder', async (relative, name) => { if (!selectedRoot) throw new Error('Choose a folder first.'); return createFileOps(selectedRoot).createFolder(relative, name); });
  safeHandle('files:rename', async (relative, name) => { if (!selectedRoot) throw new Error('Choose a folder first.'); return createFileOps(selectedRoot).rename(relative, name); });
  safeHandle('files:scan', async options => {
    if (!selectedRoot) throw new Error('Choose a folder first.');
    return createFileOps(selectedRoot).scan(options);
  });
  safeHandle('files:open', async relative => {
    const file = await authorizedPath(relative);
    const result = await shell.openPath(file);
    if (result) throw new Error(result);
    return true;
  });
  safeHandle('files:reveal', async relative => {
    const file = await authorizedPath(relative);
    shell.showItemInFolder(file);
    return true;
  });
  safeHandle('system:stats', async () => {
    const snapshot = () => os.cpus().map(core => ({ idle: core.times.idle,
      total: Object.values(core.times).reduce((a, b) => a + b, 0) }));
    const current = snapshot();
    let usage = null;
    if (cpuPrevious && cpuPrevious.length === current.length) {
      let idleDelta = 0, totalDelta = 0;
      current.forEach((core, i) => { idleDelta += core.idle - cpuPrevious[i].idle; totalDelta += core.total - cpuPrevious[i].total; });
      usage = totalDelta > 0 ? Math.max(0, Math.min(100, Math.round(100 * (1 - idleDelta / totalDelta)))) : null;
    }
    cpuPrevious = current;
    let disk = null;
    try { const fsInfo = await fs.statfs(os.homedir()); disk = { total: fsInfo.blocks * fsInfo.bsize, free: fsInfo.bavail * fsInfo.bsize, location: path.parse(os.homedir()).root }; } catch {}
    return { cpuName: os.cpus()[0]?.model?.trim() || 'Unknown CPU', cores: os.cpus().length,
      cpu: usage, memoryTotal: os.totalmem(), memoryUsed: os.totalmem() - os.freemem(),
      uptime: os.uptime(), platform: `${os.type()} ${os.release()}`, hostname: os.hostname(), disk };
  });
  // Explicitly activated LAN sharing; never expose general filesystem operations over HTTPS.
  safeHandle('share:interfaces', () => listPrivateInterfaces());
  safeHandle('share:status', async () => { await lokiShare.loadHistory();return lokiShare.status(); });
  safeHandle('share:start', address => {
    if (!listPrivateInterfaces().some(entry => entry.address === address)) throw new Error('Select a private LAN/Wi-Fi address.');
    return lokiShare.start(address);
  });
  safeHandle('share:stop', () => lokiShare.stop());
  safeHandle('share:approve', (id, accept) => lokiShare.approve(id, accept === true));
  safeHandle('share:revoke', id => lokiShare.revoke(id));
  safeHandle('share:removeFile', id => lokiShare.removeFile(id));
  safeHandle('share:cancelTransfer', id => lokiShare.cancelTransfer(id));
  safeHandle('share:clearHistory', () => lokiShare.clearHistory());
  safeHandle('share:chooseInbox', async () => {
    const selection = await dialog.showOpenDialog(mainWindow, {
      title: 'LokiShare: Choose folder for incoming files', properties: ['openDirectory']
    });
    if (selection.canceled || !selection.filePaths[0]) return lokiShare.status();
    return lokiShare.setInbox(selection.filePaths[0]);
  });
  safeHandle('share:disableInbox', () => lokiShare.setInbox(null));
  safeHandle('share:addFiles', async () => {
    if (!lokiShare.status().running) throw new Error('Start LokiShare first.');
    const selection = await dialog.showOpenDialog(mainWindow, {
      title: 'LokiShare: Select files phone can download', properties: ['openFile', 'multiSelections']
    });
    if (selection.canceled || !selection.filePaths.length) return lokiShare.status();
    return lokiShare.addFiles(selection.filePaths);
  });
  safeHandle('share:qr', async () => {
    const url = lokiShare.inviteURL();
    if (!url) return null;
    const QRCode = require('qrcode');
    return QRCode.toDataURL(url, {width:240, margin:2, errorCorrectionLevel:'M', color:{dark:'#1b1531',light:'#ffffff'}});
  });
  safeHandle('app:checkUpdate', async () => {
    const info = await githubLatestRelease();
    if (!info) return { available: false, message: 'No public GitHub Release found yet.', current: app.getVersion() };
    return { available: compareVersions(info.version, app.getVersion()) > 0,
      current: app.getVersion(), latest: info.version, url: info.url, notes: info.notes };
  });
  safeHandle('app:openReleases', async () => {
    await shell.openExternal(`https://github.com/${RELEASE_REPOSITORY}/releases/latest`);
    return true;
  });
}
function githubLatestRelease() {
  const api = `https://api.github.com/repos/${RELEASE_REPOSITORY}/releases/latest`;
  return new Promise((resolve, reject) => {
    const request = https.get(api, {
      headers: { 'User-Agent': 'LokiVerse-Desktop', 'Accept': 'application/vnd.github+json' },
      timeout: 10000
    }, response => {
      let text = '';
      response.on('data', piece => { text += piece; if (text.length > 1048576) request.destroy(new Error('Response too large.')); });
      response.on('end', () => {
        if (response.statusCode === 404) return resolve(null);
        if (response.statusCode !== 200) return reject(new Error(`GitHub returned ${response.statusCode}.`));
        try {
          const release = JSON.parse(text);
          const tag = String(release.tag_name || '');
          if (!/^v?\d+\.\d+\.\d+$/.test(tag)) return reject(new Error('Invalid version tag in GitHub Release.'));
          resolve({ version: tag.replace(/^v/, ''), url: release.html_url,
            notes: String(release.body || '').slice(0, 2000) });
        } catch (error) { reject(error); }
      });
    });
    request.on('timeout', () => request.destroy(new Error('GitHub request timed out.')));
    request.on('error', reject);
  });
}
async function checkReminders() {
  if (reminderBusy) return;
  reminderBusy = true;
  try {
    const seenFile = path.join(app.getPath('userData'), 'reminders-seen.json');
    if (!remindersLoaded) {
      try { const ids = JSON.parse(await fs.readFile(seenFile, 'utf8')); if (Array.isArray(ids)) ids.slice(-4000).forEach(value => { if (typeof value === 'string') notifiedTasks.add(value); }); }
      catch { /* First launch, or damaged optional notification history; user workspace remains untouched. */ }
      remindersLoaded = true;
    }
    const loaded = await readData();
    const reminders = dueReminders(loaded, new Date(), notifiedTasks);
    for (const task of reminders) {
      if (Notification.isSupported()) {
        notifiedTasks.add(`${task.id}|${task.due}|${task.dueTime || '09:00'}`);
        const notification = new Notification({ title: 'LokiVerse · Task reminder', body: task.title.slice(0, 160) });
        notification.on('click', () => { if(mainWindow && !mainWindow.isDestroyed()) { mainWindow.show(); mainWindow.focus(); } });
        notification.show();
      }
    }
    if(reminders.length) {
      await fs.mkdir(path.dirname(seenFile), { recursive: true });
      const temp = `${seenFile}.${process.pid}.tmp`;
      await fs.writeFile(temp, JSON.stringify([...notifiedTasks].slice(-4000)), 'utf8');
      await fs.rename(temp, seenFile);
    }
  } catch (error) { console.warn('Reminders unavailable:', error.message); }
  finally { reminderBusy = false; }
}
app.whenReady().then(() => {
  registerHandlers();
  createWindow();
  setTimeout(checkReminders, 3500);
  setInterval(checkReminders, 60000).unref();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
}).catch(error => { dialog.showErrorBox('LokiVerse launch error', error.message); app.quit(); });
app.on('before-quit', () => { lokiShare.stop().catch(() => {}); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
