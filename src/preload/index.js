const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('phoenix', {
  // Hardware detection
  detectHardware: () => ipcRenderer.invoke('hardware:detect'),

  // OS recommendations
  recommendOS: (hardware, intent) => ipcRenderer.invoke('os:recommend', hardware, intent),

  // USB management
  listUSB: () => ipcRenderer.invoke('usb:list'),
  ejectUSB: (devicePath) => ipcRenderer.invoke('usb:eject', devicePath),

  // Force upgrade
  runUpgrade: (options) => ipcRenderer.invoke('upgrade:run', options),

  // App store restoration
  restoreAppStore: (target) => ipcRenderer.invoke('appstore:restore', target),

  // Safety
  backupBootConfig: (deviceName) => ipcRenderer.invoke('safety:backup', deviceName),

  // Downloads
  downloadOS: (url, filename) => ipcRenderer.invoke('os:download', url, filename),

  // iOS detection
  detectIOS: () => ipcRenderer.invoke('ios:detect'),

  // Window controls
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
});
