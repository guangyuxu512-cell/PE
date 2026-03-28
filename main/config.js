// 用途：统一管理项目根目录 .env 配置的读取、写入和键名映射。
const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')
const { app } = require('electron')

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
const CFG_PATH = path.join(app.isPackaged ? app.getAppPath() : path.resolve(__dirname, '..'), '.env')

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

module.exports = {
  CFG_PATH,
  ENV_KEY_MAP,
  NUMBER_KEYS,
  loadEnvFile,
  readCfg,
  writeCfg,
}
