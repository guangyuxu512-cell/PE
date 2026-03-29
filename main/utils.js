// 用途：封装主进程通用工具，包括 COS / AI 客户端、图片代理和 JSON 解析。
const http = require('http')
const https = require('https')
const { URL } = require('url')

const imageProxyCache = new Map()
const IMAGE_CACHE_LIMIT = 200
const PROXY_HOST_PATTERNS = [
  /alicdn\.com$/i,
  /tbcdn\.cn$/i,
  /taobaocdn\.com$/i,
  /1688pic\.com$/i,
]

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

function extractJsonBlock(text, fallback) {
  const start = text.indexOf(fallback === 'array' ? '[' : '{')
  const end = text.lastIndexOf(fallback === 'array' ? ']' : '}')
  if (start < 0 || end < start) {
    throw new Error('AI 返回格式不正确')
  }
  return JSON.parse(text.slice(start, end + 1))
}

async function chatJson(cfg, messages, fallback) {
  const client = getAiClient(cfg)
  const response = await client.chat.completions.create({
    model: cfg.ai_model || 'gpt-3.5-turbo',
    messages,
    temperature: Number(cfg.ai_temperature ?? 0.9),
    max_tokens: Number(cfg.ai_max_tokens ?? 2048),
  })
  const content = response.choices[0].message.content || ''
  return extractJsonBlock(content.trim(), fallback)
}

function shouldProxyImage(url) {
  try {
    const hostname = new URL(url).hostname
    return PROXY_HOST_PATTERNS.some(pattern => pattern.test(hostname))
  } catch {
    return false
  }
}

function touchCache(url, payload) {
  if (imageProxyCache.has(url)) imageProxyCache.delete(url)
  imageProxyCache.set(url, payload)
  if (imageProxyCache.size > IMAGE_CACHE_LIMIT) {
    const firstKey = imageProxyCache.keys().next().value
    imageProxyCache.delete(firstKey)
  }
}

function fetchImageWithProxy(url, depth = 0) {
  if (!url) return Promise.resolve(null)
  if (imageProxyCache.has(url)) {
    const cached = imageProxyCache.get(url)
    touchCache(url, cached)
    return Promise.resolve(cached)
  }

  return new Promise(resolve => {
    let parsed
    try {
      parsed = new URL(url)
    } catch {
      resolve(null)
      return
    }

    const client = parsed.protocol === 'http:' ? http : https
    const req = client.get(url, {
      headers: {
        Referer: 'https://detail.1688.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
      timeout: 10000,
    }, res => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && depth < 3) {
        const location = res.headers.location
        res.resume()
        if (!location) {
          resolve(null)
          return
        }
        const redirectUrl = new URL(location, url).toString()
        fetchImageWithProxy(redirectUrl, depth + 1).then(resolve).catch(() => resolve(null))
        return
      }

      if (res.statusCode !== 200) {
        res.resume()
        resolve(null)
        return
      }

      const chunks = []
      res.on('data', chunk => chunks.push(chunk))
      res.on('end', () => {
        try {
          const buffer = Buffer.concat(chunks)
          const contentType = res.headers['content-type'] || 'image/jpeg'
          const payload = {
            base64: `data:${contentType};base64,${buffer.toString('base64')}`,
            contentType,
          }
          touchCache(url, payload)
          resolve(payload)
        } catch {
          resolve(null)
        }
      })
    })

    req.on('timeout', () => {
      req.destroy()
      resolve(null)
    })
    req.on('error', () => resolve(null))
  })
}

module.exports = {
  IMAGE_CACHE_LIMIT,
  PROXY_HOST_PATTERNS,
  chatJson,
  createCosClient,
  extractJsonBlock,
  fetchImageWithProxy,
  getAiClient,
  getCosDomain,
  getCosOptions,
  shouldProxyImage,
}
