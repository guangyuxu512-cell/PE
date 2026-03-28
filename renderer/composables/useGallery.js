// 用途：封装存储桶图片列表、上传、删除、预览和图片替换闭环。
import { formatBytes } from '../constants.js'

const { reactive, computed } = Vue

export function useGallery(configState, productData, logger, tabState) {
  const gallery = reactive({
    list: [],
    loading: false,
    uploading: false,
    deleting: false,
    keyword: '',
    view: 'grid',
    selKeys: [],
    preview: { show: false, url: '', name: '' },
  })

  const galleryConfigured = computed(() => !!(
    configState.cfg.cos_secret_id &&
    configState.cfg.cos_secret_key &&
    configState.cfg.cos_bucket
  ))

  const galleryFilteredList = computed(() => {
    const keyword = gallery.keyword.trim().toLowerCase()
    if (!keyword) return gallery.list
    return gallery.list.filter(item => item.name.toLowerCase().includes(keyword))
  })

  const gallerySelectedItems = computed(() => {
    const keySet = new Set(gallery.selKeys)
    return gallery.list.filter(item => keySet.has(item.key))
  })

  const galleryStatsText = computed(() => `${configState.cfg.cos_bucket || '未配置存储桶'} · 共 ${gallery.list.length} 张图片`)

  async function loadCosGallery(silent) {
    if (!galleryConfigured.value) {
      gallery.list = []
      gallery.selKeys = []
      return
    }
    gallery.loading = true
    try {
      const list = await window.api.cosList(configState.cfgPayload())
      gallery.list = list
      const validKeys = new Set(list.map(item => item.key))
      gallery.selKeys = gallery.selKeys.filter(key => validKeys.has(key))
      if (!silent) logger.log('已刷新存储桶图片，共 ' + list.length + ' 张')
    } catch (err) {
      logger.log('读取存储桶图片失败：' + err.message)
      ElementPlus.ElMessage.error('读取存储桶图片失败：' + err.message)
    }
    gallery.loading = false
  }

  function ensureCosReady() {
    if (galleryConfigured.value) return true
    tabState.value = 'settings'
    ElementPlus.ElMessage.error('请先在系统设置中配置 COS 凭证')
    return false
  }

  async function uploadFiles(files, options = {}) {
    if (!ensureCosReady()) return []
    if (!files.length) return []

    const shouldRefresh = !!options.refreshGallery || tabState.value === 'cos-gallery'
    if (shouldRefresh) gallery.uploading = true

    logger.log('正在上传 ' + files.length + ' 张图片到 COS')
    try {
      const results = await window.api.cosUpload({ files, cfg: configState.cfgPayload() })
      const success = results.filter(item => item.ok)
      const failed = results.filter(item => !item.ok)

      for (const item of success) logger.log('已上传 ' + item.name + ' -> ' + item.url)
      for (const item of failed) logger.log('上传失败：' + item.name + ' - ' + item.err)

      if (shouldRefresh) await loadCosGallery(true)

      if (options.askAddToMain && success.length && productData.D.value) {
        try {
          await ElementPlus.ElMessageBox.confirm(`已成功上传 ${success.length} 张图片，是否添加为商品主图？`, '上传完成')
          const count = productData.appendPicsByUrls(success.map(item => item.url))
          logger.log('已添加 ' + count + ' 张主图')
        } catch {}
      }

      if (!options.silent) {
        if (success.length) ElementPlus.ElMessage.success('上传成功 ' + success.length + ' 张')
        if (failed.length) ElementPlus.ElMessage.warning('有 ' + failed.length + ' 张图片上传失败')
      }
      return results
    } catch (err) {
      logger.log('上传失败：' + err.message)
      ElementPlus.ElMessage.error('上传失败：' + err.message)
      return []
    } finally {
      gallery.uploading = false
    }
  }

  async function pickAndUploadSingleImage(label) {
    if (!ensureCosReady()) return null
    const files = await window.api.pickImages()
    if (!files.length) return null
    const results = await uploadFiles([files[0]], { refreshGallery: true, silent: true })
    const uploaded = results.find(item => item.ok)
    if (!uploaded) {
      ElementPlus.ElMessage.error(label + '上传失败')
      return null
    }
    logger.log(label + '已上传到 COS')
    ElementPlus.ElMessage.success(label + '已替换')
    return {
      ...uploaded,
      localPath: files[0],
    }
  }

  async function uploadToCos(options = {}) {
    if (!ensureCosReady()) return []
    const files = await window.api.pickImages()
    if (!files.length) return []
    return uploadFiles(files, options)
  }

  async function replaceMainPic(index) {
    const uploaded = await pickAndUploadSingleImage('主图')
    if (!uploaded) return
    productData.replacePicByUpload(index, uploaded)
  }

  async function replaceSkuImage(index) {
    const uploaded = await pickAndUploadSingleImage('SKU 图片')
    if (!uploaded) return
    productData.replaceSkuImageByUpload(index, uploaded)
  }

  async function replacePropImage(index) {
    const uploaded = await pickAndUploadSingleImage('属性图片')
    if (!uploaded) return
    productData.replacePropImageByUpload(index, uploaded)
  }

  async function replaceDetailImage(index) {
    const uploaded = await pickAndUploadSingleImage('详情图')
    if (!uploaded) return
    productData.replaceDetailImageByUpload(index, uploaded)
  }

  async function deleteSelectedCos() {
    if (!gallerySelectedItems.value.length) return
    try {
      await ElementPlus.ElMessageBox.confirm('确认删除已选中的 ' + gallerySelectedItems.value.length + ' 张图片吗？', '删除确认', { type: 'warning' })
    } catch {
      return
    }
    gallery.deleting = true
    try {
      const results = await window.api.cosDelete({
        keys: gallerySelectedItems.value.map(item => item.key),
        cfg: configState.cfgPayload(),
      })
      const success = results.filter(item => item.ok)
      const failed = results.filter(item => !item.ok)
      if (success.length) logger.log('已删除 ' + success.length + ' 张存储桶图片')
      for (const item of failed) logger.log('删除失败：' + item.key + ' - ' + item.err)
      await loadCosGallery(true)
      if (failed.length) ElementPlus.ElMessage.warning('删除完成，成功 ' + success.length + ' 张，失败 ' + failed.length + ' 张')
      else ElementPlus.ElMessage.success('删除成功')
    } catch (err) {
      ElementPlus.ElMessage.error('删除失败：' + err.message)
    }
    gallery.deleting = false
  }

  function openPreview(item) {
    gallery.preview.url = item.url
    gallery.preview.name = item.name
    gallery.preview.show = true
  }

  async function copyUrl(url) {
    try {
      await window.api.copyText(url)
      logger.log('已复制图片 URL')
      ElementPlus.ElMessage.success('URL 已复制')
    } catch (err) {
      ElementPlus.ElMessage.error('复制失败：' + err.message)
    }
  }

  function addSingleCosPic(item) {
    if (!productData.D.value) {
      ElementPlus.ElMessage.warning('请先加载商品数据')
      return
    }
    productData.appendPicsByUrls([item.url])
    logger.log('已从存储桶添加 1 张主图')
    ElementPlus.ElMessage.success('已添加为商品主图')
  }

  function addSelectedCosPics() {
    if (!productData.D.value) {
      ElementPlus.ElMessage.warning('请先加载商品数据')
      return
    }
    if (!gallerySelectedItems.value.length) return
    const count = productData.appendPicsByUrls(gallerySelectedItems.value.map(item => item.url))
    logger.log('已从存储桶添加 ' + count + ' 张主图')
    ElementPlus.ElMessage.success('已添加 ' + count + ' 张主图')
  }

  function isGallerySelected(key) {
    return gallery.selKeys.includes(key)
  }

  function toggleGallerySelection(key, checked) {
    if (checked) {
      if (!gallery.selKeys.includes(key)) gallery.selKeys = [...gallery.selKeys, key]
    } else {
      gallery.selKeys = gallery.selKeys.filter(item => item !== key)
    }
  }

  function onGalleryTableSelection(rows) {
    const visibleKeys = new Set(galleryFilteredList.value.map(item => item.key))
    const hiddenKeys = gallery.selKeys.filter(key => !visibleKeys.has(key))
    gallery.selKeys = [...hiddenKeys, ...rows.map(row => row.key)]
  }

  return {
    gallery,
    galleryConfigured,
    galleryFilteredList,
    gallerySelectedItems,
    galleryStatsText,
    formatBytes,
    loadCosGallery,
    uploadFiles,
    uploadToCos,
    replaceMainPic,
    replaceSkuImage,
    replacePropImage,
    replaceDetailImage,
    deleteSelectedCos,
    openPreview,
    copyUrl,
    addSingleCosPic,
    addSelectedCosPics,
    isGallerySelected,
    toggleGallerySelection,
    onGalleryTableSelection,
  }
}
