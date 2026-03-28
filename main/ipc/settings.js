// 用途：注册系统设置读写相关 IPC。
const { readCfg, writeCfg } = require('../config')

module.exports = function registerSettingsIpc({ ipcMain }) {
  ipcMain.handle('cfg-load', () => readCfg())
  ipcMain.handle('cfg-save', (_, cfg) => {
    writeCfg(cfg)
    return true
  })
}
