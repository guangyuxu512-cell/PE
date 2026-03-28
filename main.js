const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')

// ---- 配置管理 ----
const CFG_PATH = path.join(os.homedir(), '.商品编辑器配置.json')
const readCfg = () => { try { return JSON.parse(fs.readFileSync(CFG_PATH, 'utf-8')) } catch { return {} } }
const writeCfg = c => fs.writeFileSync(CFG_PATH, JSON.stringify(c, null, 2), 'utf-8')

let win

app.whenReady().then(() => {
  win = new BrowserWindow({
    width: 1400, height: 920, minWidth: 1100, minHeight: 750,
    title: '商品发布编辑器',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  })
  Menu.setApplicationMenu(null)
  win.loadFile('index.html')
})

app.on('window-all-closed', () => app.quit())

// ---- 文件对话框 ----
ipcMain.handle('open-file', async () => {
  const r = await dialog.showOpenDialog(win, {
    filters: [
      { name: 'JSON / TXT', extensions: ['txt', 'json'] },
      { name: '所有文件', extensions: ['*'] },
    ],
  })
  if (r.canceled || !r.filePaths.length) return null
  return { path: r.filePaths[0], content: fs.readFileSync(r.filePaths[0], 'utf-8') }
})

ipcMain.handle('save-file', async (_, text) => {
  const r = await dialog.showSaveDialog(win, {
    defaultPath: '商品数据.txt',
    filters: [
      { name: 'TXT', extensions: ['txt'] },
      { name: 'JSON', extensions: ['json'] },
    ],
  })
  if (r.canceled) return null
  fs.writeFileSync(r.filePath, text, 'utf-8')
  return r.filePath
})

ipcMain.handle('pick-images', async () => {
  const r = await dialog.showOpenDialog(win, {
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: '图片', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] }],
  })
  return r.canceled ? [] : r.filePaths
})

ipcMain.handle('pick-dir', async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openDirectory', 'createDirectory'] })
  return r.canceled ? null : r.filePaths[0]
})

// ---- 配置 ----
ipcMain.handle('cfg-load', () => readCfg())
ipcMain.handle('cfg-save', (_, c) => { writeCfg(c); return true })

// ---- 腾讯云 COS ----
ipcMain.handle('cos-upload', async (_, { files, cfg }) => {
  const COS = require('cos-nodejs-sdk-v5')
  const cos = new COS({ SecretId: cfg.cos_secret_id, SecretKey: cfg.cos_secret_key })
  const bkt = cfg.cos_bucket, rgn = cfg.cos_region || 'ap-guangzhou'
  const pfx = cfg.cos_prefix || ''
  const dom = 'https://' + bkt + '.cos.' + rgn + '.myqcloud.com'
  const out = []
  for (const fp of files) {
    const name = path.basename(fp)
    const key = (pfx ? pfx + '/' : '') + Date.now() + '_' + name
    try {
      await new Promise((ok, no) =>
        cos.uploadFile({ Bucket: bkt, Region: rgn, Key: key, FilePath: fp },
          (e, d) => e ? no(e) : ok(d)))
      out.push({ ok: true, url: dom + '/' + key, name })
    } catch (e) {
      out.push({ ok: false, name, err: e.message })
    }
  }
  return out
})

ipcMain.handle('cos-list', async (_, cfg) => {
  const COS = require('cos-nodejs-sdk-v5')
  const cos = new COS({ SecretId: cfg.cos_secret_id, SecretKey: cfg.cos_secret_key })
  const bkt = cfg.cos_bucket, rgn = cfg.cos_region || 'ap-guangzhou'
  const pfx = cfg.cos_prefix || ''
  const dom = 'https://' + bkt + '.cos.' + rgn + '.myqcloud.com'
  return new Promise((ok, no) => {
    cos.getBucket({ Bucket: bkt, Region: rgn, Prefix: pfx, MaxKeys: 200 }, (e, d) => {
      if (e) return no(e)
      ok((d.Contents || [])
        .filter(i => /\.(jpe?g|png|gif|webp|bmp)$/i.test(i.Key))
        .map(i => ({ key: i.Key, url: dom + '/' + i.Key, size: i.Size, name: i.Key.split('/').pop() })))
    })
  })
})

// ---- AI ----
ipcMain.handle('ai-gen', async (_, { cfg, prompt }) => {
  const { OpenAI } = require('openai')
  const client = new OpenAI({ baseURL: cfg.ai_base_url, apiKey: cfg.ai_api_key })
  const r = await client.chat.completions.create({
    model: cfg.ai_model || 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.9,
  })
  return r.choices[0].message.content.trim()
})

// ---- 批量导出 ----
ipcMain.handle('batch-export', (_, { dir, files }) => {
  fs.mkdirSync(dir, { recursive: true })
  let n = 0
  for (const f of files) {
    try { fs.writeFileSync(path.join(dir, f.name), f.content, 'utf-8'); n++ } catch {}
  }
  return n
})