const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { detectLocalHardware } = require('../cli/utils/hardware');
const { UpgradeManager } = require('../cli/utils/upgrade');
const { USBManager } = require('../cli/utils/usb');
const { AppStoreManager } = require('../cli/utils/appstore');
const { SafetyManager } = require('../cli/utils/safety');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '..', '..', 'resources', 'icon.png'),
  });

  // In development, load from Vite dev server
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// === IPC Handlers ===

// Hardware detection
ipcMain.handle('hardware:detect', async () => {
  try {
    return await detectLocalHardware();
  } catch (err) {
    return { error: err.message };
  }
});

// OS recommendation
ipcMain.handle('os:recommend', async (event, hardware, intent) => {
  try {
    const { scoreOSMatch } = require('../cli/commands/recommend');
    const dbPath = path.join(__dirname, '..', '..', 'data', 'os-database.json');
    const fs = require('fs');
    let osDB;
    try {
      osDB = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    } catch {
      osDB = getDefaultOSDatabase();
    }
    return scoreOSMatch(hardware, osDB, intent || 'general');
  } catch (err) {
    return { error: err.message };
  }
});

// USB detection
ipcMain.handle('usb:list', async () => {
  try {
    const usb = new USBManager();
    return await usb.listUSBDrives();
  } catch (err) {
    return { error: err.message };
  }
});

// USB eject
ipcMain.handle('usb:eject', async (event, devicePath) => {
  try {
    const usb = new USBManager();
    await usb.eject(devicePath);
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
});

// Force upgrade
ipcMain.handle('upgrade:run', async (event, options) => {
  try {
    const manager = new UpgradeManager(options);
    if (options.type === 'windows') return await manager.upgradeWindows();
    if (options.type === 'macos') return await manager.upgradeMacOS();
    if (options.type === 'android') return await manager.upgradeAndroid(options.rom);
    if (options.type === 'ios') return await manager.upgradeIOS();
    return { error: 'Unknown upgrade type' };
  } catch (err) {
    return { error: err.message };
  }
});

// iOS detection
ipcMain.handle('ios:detect', async () => {
  try {
    const manager = new UpgradeManager();
    const device = await manager.detectIOSDevice();
    if (device) {
      // Add model info
      device.maxSupported = manager.getMaxIOSVersion(device.modelName || device.model);
      device.chip = manager.getChipForModel(device.modelName || device.model);
      return device;
    }
    return { error: 'No iOS device detected' };
  } catch (err) {
    return { error: err.message };
  }
});

// App store restoration
ipcMain.handle('appstore:restore', async (event, target) => {
  try {
    const manager = new AppStoreManager();
    return await manager.restore(target);
  } catch (err) {
    return { error: err.message };
  }
});

// Safety backup
ipcMain.handle('safety:backup', async (event, deviceName) => {
  try {
    const safety = new SafetyManager();
    return await safety.backupBootConfig(deviceName);
  } catch (err) {
    return { error: err.message };
  }
});

// Download OS
ipcMain.handle('os:download', async (event, url, filename) => {
  try {
    const { DownloadManager } = require('../cli/utils/download');
    const dl = new DownloadManager();
    return await dl.download(url, filename);
  } catch (err) {
    return { error: err.message };
  }
});

// Window controls
ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.on('window:close', () => mainWindow?.close());

function getDefaultOSDatabase() {
  const fs = require('fs');
  try {
    const dbPath = path.join(__dirname, '..', '..', 'data', 'os-database.json');
    return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  } catch {
    return { oses: [] };
  }
}
