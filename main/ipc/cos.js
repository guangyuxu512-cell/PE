// 用途：注册 COS 上传、列表、测试、删除和图片代理相关 IPC。
const path = require('path')
const {
  createCosClient,
  fetchImageWithProxy,
  getCosDomain,
  getCosOptions,
} = require('../utils')

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

module.exports = function registerCosIpc({ ipcMain }) {
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

  ipcMain.handle('proxy-image', async (_, url) => fetchImageWithProxy(url))
  ipcMain.handle('cos-proxy-image', async (_, url) => fetchImageWithProxy(url))
}
