// 用途：注册文件读写、图片选择、目录选择和批量导出相关 IPC。
const fs = require('fs')
const path = require('path')

module.exports = function registerFileIpc({ ipcMain, dialog, getWindow }) {
  ipcMain.handle('open-file', async () => {
    const result = await dialog.showOpenDialog(getWindow(), {
      filters: [
        { name: 'JSON / TXT', extensions: ['txt', 'json'] },
        { name: '所有文件', extensions: ['*'] },
      ],
    })
    if (result.canceled || !result.filePaths.length) return null
    const filePath = result.filePaths[0]
    return { path: filePath, content: fs.readFileSync(filePath, 'utf-8') }
  })

  ipcMain.handle('save-file', async (_, text) => {
    const result = await dialog.showSaveDialog(getWindow(), {
      defaultPath: '商品数据.txt',
      filters: [
        { name: 'TXT', extensions: ['txt'] },
        { name: 'JSON', extensions: ['json'] },
      ],
    })
    if (result.canceled) return null
    fs.writeFileSync(result.filePath, text, 'utf-8')
    return result.filePath
  })

  ipcMain.handle('pick-images', async () => {
    const result = await dialog.showOpenDialog(getWindow(), {
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: '图片', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] }],
    })
    return result.canceled ? [] : result.filePaths
  })

  ipcMain.handle('pick-dir', async () => {
    const result = await dialog.showOpenDialog(getWindow(), {
      properties: ['openDirectory', 'createDirectory'],
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('batch-export', (_, { dir, files }) => {
    fs.mkdirSync(dir, { recursive: true })
    let count = 0
    for (const file of files) {
      try {
        fs.writeFileSync(path.join(dir, file.name), file.content, 'utf-8')
        count += 1
      } catch {}
    }
    return count
  })
}
