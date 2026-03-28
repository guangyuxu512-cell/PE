const { app, BrowserWindow, ipcMain, dialog, Menu, clipboard } = require('electron')
const path = require('path')
const fs = require('fs')
const dotenv = require('dotenv')

const ENV_KEY_MAP = {
  cos_secret_id: 'COS_SECRET_ID',
  cos_secret_key: 'COS_SECRET_KEY',
  cos_bucket: 'COS_BUCKET',
  cos_region: 'COS_REGION',
  cos_prefix: 'COS_PREFIX',
  ai_base_url: 'AI_BASE_URL',
  ai_api_key: 'AI_API_KEY',
  ai_model: 'AI_MODEL',
  ai_temperature: 'AI_TEMPERATURE',
  ai_max_tokens: 'AI_MAX_TOKENS',
}

const NUMBER_KEYS = new Set(['ai_temperature', 'ai_max_tokens'])

const CFG_PATH = path.join(app.isPackaged ? app.getAppPath() : __dirname, '.env')

function loadEnvFile() {
  if (fs.existsSync(CFG_PATH)) {
    dotenv.config({ path: CFG_PATH, override: true })
  }
}

function parseCfgValue(key, value) {
  if (value == null) return undefined
  if (NUMBER_KEYS.has(key)) {
    const num = Number(value)
    return Number.isFinite(num) ? num : undefined
  }
  return String(value)
}

function formatEnvValue(value) {
  const text = value == null ? '' : String(value)
  if (text === '') return ''
  if (/[\s#="'\\\r\n]/.test(text)) {
    return `"${text
      .replace(/\\/g, '\\\\')
      .replace(/\r/g, '\\r')
      .replace(/\n/g, '\\n')
      .replace(/"/g, '\\"')}"`
  }
  return text
}

function readCfg() {
  if (!fs.existsSync(CFG_PATH)) return {}
  const parsed = dotenv.parse(fs.readFileSync(CFG_PATH, 'utf-8'))
  const cfg = {}
  for (const [cfgKey, envKey] of Object.entries(ENV_KEY_MAP)) {
    if (!Object.prototype.hasOwnProperty.call(parsed, envKey)) continue
    const value = parseCfgValue(cfgKey, parsed[envKey])
    if (value !== undefined) cfg[cfgKey] = value
  }
  return cfg
}

function writeCfg(cfg) {
  const lines = []
  for (const [cfgKey, envKey] of Object.entries(ENV_KEY_MAP)) {
    lines.push(`${envKey}=${formatEnvValue(cfg[cfgKey])}`)
  }
  fs.writeFileSync(CFG_PATH, `${lines.join('\n')}\n`, 'utf-8')
  loadEnvFile()
}

function createCosClient(cfg) {
  const COS = require('cos-nodejs-sdk-v5')
  return new COS({
    SecretId: cfg.cos_secret_id,
    SecretKey: cfg.cos_secret_key,
  })
}

function getCosOptions(cfg) {
  return {
    Bucket: cfg.cos_bucket,
    Region: cfg.cos_region || 'ap-guangzhou',
    Prefix: cfg.cos_prefix || '',
  }
}

function getCosDomain(cfg) {
  const { Bucket, Region } = getCosOptions(cfg)
  return `https://${Bucket}.cos.${Region}.myqcloud.com`
}

function getAiClient(cfg) {
  const { OpenAI } = require('openai')
  return new OpenAI({
    baseURL: cfg.ai_base_url || 'https://api.openai.com/v1',
    apiKey: cfg.ai_api_key,
  })
}

async function listCosImages(cfg, maxKeys = 500) {
  const cos = createCosClient(cfg)
  const { Bucket, Region, Prefix } = getCosOptions(cfg)
  const domain = getCosDomain(cfg)
  return new Promise((resolve, reject) => {
    cos.getBucket({ Bucket, Region, Prefix, MaxKeys: maxKeys }, (err, data) => {
      if (err) return reject(err)
      const items = (data.Contents || [])
        .filter(item => /\.(jpe?g|png|gif|webp|bmp)$/i.test(item.Key))
        .map(item => ({
          key: item.Key,
          name: item.Key.split('/').pop(),
          url: `${domain}/${item.Key}`,
          size: Number(item.Size) || 0,
          lastModified: item.LastModified || '',
        }))
      resolve(items)
    })
  })
}

loadEnvFile()

let win

app.whenReady().then(() => {
  win = new BrowserWindow({
    width: 1400,
    height: 920,
    minWidth: 1100,
    minHeight: 750,
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

ipcMain.handle('open-file', async () => {
  const result = await dialog.showOpenDialog(win, {
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
  const result = await dialog.showSaveDialog(win, {
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
  const result = await dialog.showOpenDialog(win, {
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: '图片', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] }],
  })
  return result.canceled ? [] : result.filePaths
})

ipcMain.handle('pick-dir', async () => {
  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory', 'createDirectory'],
  })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('copy-text', (_, text) => {
  clipboard.writeText(text || '')
  return true
})

ipcMain.handle('cfg-load', () => readCfg())

ipcMain.handle('cfg-save', (_, cfg) => {
  writeCfg(cfg)
  return true
})

ipcMain.handle('cos-upload', async (_, { files, cfg }) => {
  const cos = createCosClient(cfg)
  const { Bucket, Region, Prefix } = getCosOptions(cfg)
  const domain = getCosDomain(cfg)
  const results = []

  for (const filePath of files) {
    const name = path.basename(filePath)
    const key = `${Prefix ? `${Prefix}/` : ''}${Date.now()}_${name}`
    try {
      await new Promise((resolve, reject) => {
        cos.uploadFile({ Bucket, Region, Key: key, FilePath: filePath }, err => (err ? reject(err) : resolve()))
      })
      results.push({ ok: true, key, name, url: `${domain}/${key}` })
    } catch (err) {
      results.push({ ok: false, key, name, err: err.message })
    }
  }

  return results
})

ipcMain.handle('cos-list', async (_, cfg) => listCosImages(cfg))

ipcMain.handle('cos-test', async (_, cfg) => {
  const items = await listCosImages(cfg, 1)
  return { ok: true, count: items.length }
})

ipcMain.handle('cos-delete', async (_, { keys, cfg }) => {
  const cos = createCosClient(cfg)
  const { Bucket, Region } = getCosOptions(cfg)
  const results = []

  for (const key of keys || []) {
    try {
      await new Promise((resolve, reject) => {
        cos.deleteObject({ Bucket, Region, Key: key }, err => (err ? reject(err) : resolve()))
      })
      results.push({ ok: true, key })
    } catch (err) {
      results.push({ ok: false, key, err: err.message })
    }
  }

  return results
})

ipcMain.handle('ai-gen', async (_, { cfg, prompt }) => {
  const client = getAiClient(cfg)
  const response = await client.chat.completions.create({
    model: cfg.ai_model || 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
    temperature: Number(cfg.ai_temperature ?? 0.9),
    max_tokens: Number(cfg.ai_max_tokens ?? 2048),
  })
  return response.choices[0].message.content.trim()
})

ipcMain.handle('ai-test', async (_, cfg) => {
  const client = getAiClient(cfg)
  const response = await client.chat.completions.create({
    model: cfg.ai_model || 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: '请只回复 OK。' }],
    temperature: Number(cfg.ai_temperature ?? 0.9),
    max_tokens: 32,
  })
  return response.choices[0].message.content.trim()
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
