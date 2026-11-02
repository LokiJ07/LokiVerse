'use strict';
const { contextBridge, ipcRenderer } = require('electron');
const invoke = (name, ...args) => ipcRenderer.invoke(name, ...args);
contextBridge.exposeInMainWorld('loki', Object.freeze({
  info: () => invoke('app:getInfo'),
  load: () => invoke('data:load'), save: data => invoke('data:save', data),
  exportBackup: () => invoke('data:export'), importBackup: () => invoke('data:import'),
  openDataFolder: () => invoke('data:openFolder'),
  getRecoveryStatus: () => invoke('data:recoveryStatus'),
  onCloseRequest: callback => { ipcRenderer.on('app:requestClose', callback); },
  completeClose: saved => invoke('app:completeClose', saved),
  selectFolder: () => invoke('files:selectFolder'),
  listFiles: relative => invoke('files:list', relative),
  openFile: relative => invoke('files:open', relative),
  revealFile: relative => invoke('files:reveal', relative),
  stats: () => invoke('system:stats'),
  checkUpdate: () => invoke('app:checkUpdate'), openReleases: () => invoke('app:openReleases')
}));
