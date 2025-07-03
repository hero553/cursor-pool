import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import os from 'node:os'
import { MainProcess } from './main-process'
import { killCursorProcess } from './utils'
import { switchAccount } from './service/cursor-account-service'
const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.mjs   > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.APP_ROOT = path.join(__dirname, '../..')

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

// Disable GPU Acceleration for Windows 7
if (os.release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

let win: BrowserWindow | null = null
const preload = path.join(__dirname, '../preload/index.mjs')
const indexHtml = path.join(RENDERER_DIST, 'index.html')

// --- ps-list 猴子补丁，修正 asar.unpacked 路径 ---
import log from 'electron-log';
if (process.platform === 'win32') {
  const fs = require('fs');
  const Module = require('module');
  const path = require('path');
  log.info('ps-list monkey patch loaded!');
  const originalRequire = Module.prototype.require;
  Module.prototype.require = function (request) {
    if (request === 'ps-list') {
      const psList = originalRequire.apply(this, arguments);
      // 只 patch windows 方法
      if (typeof psList === 'function' && psList.name === 'windows') {
        log.info('ps-list windows method patched!');
        psList.windows = async function () {
          let binary;
          switch (process.arch) {
            case 'x64':
              binary = 'fastlist-0.3.0-x64.exe';
              break;
            case 'ia32':
              binary = 'fastlist-0.3.0-x86.exe';
              break;
            default:
              throw new Error(`Unsupported architecture: ${process.arch}`);
          }
          const binaryPath = path.join(
            process.resourcesPath,
            'app.asar.unpacked',
            'node_modules',
            'ps-list',
            'vendor',
            binary
          );
          console.log('ps-list fastlist exe 路径:', binaryPath);
          const { execFile } = require('child_process').promises;
          const { stdout } = await execFile(binaryPath, {
            maxBuffer: 1000 * 1000 * 10,
            windowsHide: true,
          });
          return stdout
            .trim()
            .split('\r\n')
            .map(line => line.split('\t'))
            .map(([pid, ppid, name]) => ({
              pid: Number.parseInt(pid, 10),
              ppid: Number.parseInt(ppid, 10),
              name,
            }));
        };
      }
      return psList;
    }
    return originalRequire.apply(this, arguments);
  };
}
// --- ps-list 猴子补丁结束 ---

async function createWindow() {
  win = new BrowserWindow({
    title: 'Cursor Professional',
    icon: path.join(process.env.VITE_PUBLIC, 'icons/favicon.ico'),
    webPreferences: {
      preload,
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      // nodeIntegration: true,

      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
      // contextIsolation: false,
    },
  })

  if (VITE_DEV_SERVER_URL) { // #298
    win.loadURL(VITE_DEV_SERVER_URL)
    // Open devTool if the app is not packaged
    win.webContents.openDevTools()
  } else {
    win.loadFile(indexHtml)
  }

  // Test actively push message to the Electron-Renderer
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })
  // win.webContents.on('will-navigate', (event, url) => { }) #344
}

app.whenReady().then(() => {
  createWindow();
  /** 初始化主进程 */
  new MainProcess();
})

app.on('window-all-closed', () => {
  win = null
  if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    createWindow()
  }
})

// New window example arg: new windows url
ipcMain.handle('open-win', (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${VITE_DEV_SERVER_URL}#${arg}`)
  } else {
    childWindow.loadFile(indexHtml, { hash: arg })
  }
})

ipcMain.handle('exit-cursor', async () => {
  try {
    const result = await killCursorProcess();
    return { success: result };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
});

ipcMain.handle('switch-account', async (event, { token, email, password }) => {
  return await switchAccount(token, email, password)
})