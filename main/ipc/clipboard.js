// 用途：注册系统剪贴板相关 IPC。
module.exports = function registerClipboardIpc({ ipcMain, clipboard }) {
  ipcMain.handle('copy-text', (_, text) => {
    clipboard.writeText(text || '')
    return true
  })
}
