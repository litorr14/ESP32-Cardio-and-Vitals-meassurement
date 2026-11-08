// ============================================================================
// VitalMonitor & Computer Cardiogram — Electron Desktop Main Process
// Enables native Windows .EXE execution with automatic Web Serial (ESP32 COM)
// ============================================================================

const { app, BrowserWindow, session } = require('electron');
const path = require('path');

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1460,
    height: 920,
    minWidth: 1024,
    minHeight: 720,
    title: 'ESP32 Vital Sign & Computer Cardiogram Monitor',
    backgroundColor: '#020617',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableBlinkFeatures: 'Serial',
    },
  });

  // Enable Web Serial API permissions for ESP32 / ESP32-C3 SuperMini USB COM ports
  mainWindow.webContents.session.on(
    'select-serial-port',
    (event, portList, webContents, callback) => {
      event.preventDefault();
      if (portList && portList.length > 0) {
        // Prefer Silicon Labs CP210x, CH340, or ESP32 USB JTAG/Serial if multiple exist
        const espPort =
          portList.find(
            (p) =>
              (p.vendorId && ['10c4', '1a86', '303a', '0403'].includes(String(p.vendorId).toLowerCase())) ||
              (p.displayName && /cp210|ch340|usb|serial|esp32|jtag/i.test(p.displayName))
          ) || portList[0];
        callback(espPort.portId);
      } else {
        callback('');
      }
    }
  );

  mainWindow.webContents.session.setPermissionCheckHandler(
    (webContents, permission) => {
      if (permission === 'serial') return true;
      return true;
    }
  );

  mainWindow.webContents.session.setDevicePermissionHandler((details) => {
    if (details.deviceType === 'serial') return true;
    return false;
  });

  // Load built dist/index.html if packaged offline, otherwise load live app URL
  const localDistIndex = path.join(__dirname, '..', 'dist', 'index.html');
  const fs = require('fs');
  if (fs.existsSync(localDistIndex)) {
    mainWindow.loadFile(localDistIndex);
  } else {
    mainWindow.loadURL('https://ais-dev-qaykeneohhxokui3bifell-124019100377.us-east1.run.app');
  }
}

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
