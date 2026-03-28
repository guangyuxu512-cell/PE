// 用途：Electron 主进程入口，负责创建窗口、加载页面并按模块注册 IPC。
const path = require('path')
const { app, BrowserWindow, ipcMain, dialog, Menu, clipboard } = require('electron')
const { loadEnvFile, readCfg, writeCfg } = require('./config')

const registerFileIpc = require('./ipc/file')
const registerCosIpc = require('./ipc/cos')
const registerAiIpc = require('./ipc/ai')
const registerClipboardIpc = require('./ipc/clipboard')

loadEnvFile()

let win = null

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 920,
    minWidth: 1100,
    minHeight: 750,
    title: '商品发布编辑器',
    webPreferences: {
      preload: path.resolve(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  })

  Menu.setApplicationMenu(null)
  win.loadFile(path.resolve(__dirname, '..', 'renderer', 'index.html'))
}

function getWindow() {
  return win
}

function registerConfigIpc() {
  ipcMain.handle('cfg-load', () => readCfg())
  ipcMain.handle('cfg-save', (_, cfg) => {
    writeCfg(cfg)
    return true
  })
}

app.whenReady().then(() => {
  createWindow()
  registerConfigIpc()
  registerFileIpc({ ipcMain, dialog, getWindow })
  registerCosIpc({ ipcMain })
  registerAiIpc({ ipcMain })
  registerClipboardIpc({ ipcMain, clipboard })
})

app.on('window-all-closed', () => app.quit())
