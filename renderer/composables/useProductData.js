/* Product data state and CRUD helpers. */
import {
  DETAIL_WRAPPER_END,
  DETAIL_WRAPPER_START,
  FG,
  NUMS,
  TMPL,
  clone,
} from '../constants.js'

const { ref, reactive, computed, toRaw } = Vue

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildImageBlock(url) {
  return `<div style="margin:0 0 12px;text-align:center;"><img src="${escapeHtml(url)}" style="max-width:100%;display:block;margin:0 auto;" referrerpolicy="no-referrer"></div>`
}

function buildSectionBlock(section, imageUrl) {
  const title = section?.title ? `<div style="font-size:30px;line-height:1.4;font-weight:700;color:#222;margin:0 0 10px;">${escapeHtml(section.title)}</div>` : ''
  const subtitle = section?.subtitle ? `<div style="font-size:18px;line-height:1.7;color:#555;margin:0 0 12px;">${escapeHtml(section.subtitle)}</div>` : ''
  const highlights = Array.isArray(section?.highlights) && section.highlights.length
    ? `<ul style="margin:0 0 16px;padding-left:20px;color:#666;font-size:16px;line-height:1.8;">${section.highlights.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    : ''
  const image = imageUrl ? buildImageBlock(imageUrl) : ''
  return `<div style="padding:18px 0;border-bottom:1px solid #f0f0f0;">${title}${subtitle}${highlights}${image}</div>`
}

export function useProductData(logger) {
  const D = ref(null)
  const info = reactive({})
  const html = ref('')
  const json = ref('')
  const detailMode = ref('visual')
  const detailImages = ref([])

  const picIndex = ref(-1)
  const skuIndex = ref(-1)
  const propIndex = ref(-1)

  const picDialog = reactive({ show: false, mode: 'add', idx: -1, d: { Url: '', LocalPath: '', Keys: '', PicIndex: '0' } })
  const skuDialog = reactive({ show: false, mode: 'add', idx: -1, d: { sn: '', sv: '', SkuId: '', Price: 0, PromotionPrice: 0, CouponPrice: 0, Num: 0, SkuCode: '', Barcode: '' } })
  const propDialog = reactive({ show: false, mode: 'add', idx: -1, d: { Name: '', Value: '', IsSellPro: 0, PicUrl: '', Aliasname: '', PropertyName: '', PropertyKey: '' } })

  const picList = computed(() => D.value ? (D.value.FromPics || []).map((item, index) => ({ ...item, _i: index })) : [])
  const skuList = computed(() => {
    if (!D.value) return []
    return (D.value.FromSkus || []).map((sku, index) => {
      const spec = (sku.Specs || [])[0] || { SpecName: '', SpecValue: '' }
      return {
        _i: index,
        sn: spec.SpecName,
        sv: spec.SpecValue,
        SkuId: sku.SkuId || '',
        Price: sku.Price,
        PromotionPrice: sku.PromotionPrice,
        CouponPrice: sku.CouponPrice,
        Num: sku.Num,
        SkuCode: sku.SkuCode || '',
        Barcode: sku.Barcode || '',
      }
    })
  })
  const propList = computed(() => D.value ? (D.value.FromProperties || []).map((item, index) => ({ ...item, _i: index })) : [])

  function ensure(data) {
    data.FromItem = data.FromItem || {}
    data.FromContent = data.FromContent || {}
    data.FromPics = data.FromPics || []
    data.FromProperties = data.FromProperties || []
    data.FromSkus = data.FromSkus || []
  }

  function extractDetailImagesFromHtml(source) {
    const parser = new DOMParser()
    const doc = parser.parseFromString(source || '', 'text/html')
    return Array.from(doc.querySelectorAll('img'))
      .map(node => node.getAttribute('src') || '')
      .filter(Boolean)
  }

  function buildDetailHtmlFromImages(images) {
    const blocks = images.map(url => buildImageBlock(url)).join('')
    return `${DETAIL_WRAPPER_START}${blocks}${DETAIL_WRAPPER_END}`
  }

  function buildDetailHtmlFromSections(sections, imageUrls) {
    const safeImages = imageUrls || []
    const lastImage = safeImages[safeImages.length - 1] || ''
    const blocks = (sections || []).map((section, index) => buildSectionBlock(section, safeImages[index] || lastImage)).join('')
    return `${DETAIL_WRAPPER_START}${blocks}${DETAIL_WRAPPER_END}`
  }

  function syncDetailImagesFromHtml() {
    detailImages.value = extractDetailImagesFromHtml(html.value)
  }

  function syncJson() {
    if (D.value) json.value = JSON.stringify(D.value, null, 4)
  }

  function syncHtmlFromDetailImages() {
    html.value = buildDetailHtmlFromImages(detailImages.value.filter(Boolean))
    if (D.value) D.value.FromContent.PcDesc = html.value
    syncJson()
  }

  function toUi() {
    if (!D.value) return
    const item = D.value.FromItem || {}
    for (const group of FG) {
      for (const field of group.fields) {
        info[field.key] = item[field.key] == null ? '' : String(item[field.key])
      }
    }
    html.value = (D.value.FromContent || {}).PcDesc || ''
    syncDetailImagesFromHtml()
    json.value = JSON.stringify(D.value, null, 4)
    picIndex.value = -1
    skuIndex.value = -1
    propIndex.value = -1
  }

  function fromUi() {
    if (!D.value) return
    const item = D.value.FromItem
    for (const group of FG) {
      for (const field of group.fields) {
        const value = (info[field.key] || '').trim()
        if (value === '') item[field.key] = field.key === 'SysId' ? 1 : null
        else if (NUMS.has(field.key)) {
          const num = Number(value)
          item[field.key] = Number.isNaN(num) ? value : num
        } else {
          item[field.key] = value
        }
      }
    }
    if (!item.ItemPicUrl && (D.value.FromPics || [])[0]) item.ItemPicUrl = D.value.FromPics[0].Url
    D.value.FromContent.PcDesc = html.value
  }

  function newBlank() {
    D.value = clone(TMPL)
    toUi()
    logger.log('已新建空白商品')
  }

  async function importFile() {
    const result = await window.api.openFile()
    if (!result) return
    try {
      const text = result.content.replace(/^\uFEFF/, '')
      const start = text.indexOf('{')
      if (start < 0) throw new Error('未找到 JSON 对象')
      D.value = JSON.parse(text.substring(start))
      ensure(D.value)
      toUi()
      logger.log('已导入 ' + result.path)
    } catch (err) {
      ElementPlus.ElMessage.error('导入失败：' + err.message)
    }
  }

  async function exportFile() {
    if (!D.value) {
      ElementPlus.ElMessage.warning('请先加载数据')
      return
    }
    fromUi()
    syncJson()
    const savePath = await window.api.saveFile(json.value)
    if (savePath) logger.log('已导出 ' + savePath)
  }

  function loadFromJson() {
    const text = json.value.trim()
    if (!text) {
      ElementPlus.ElMessage.warning('JSON 文本框为空')
      return
    }
    try {
      D.value = JSON.parse(text)
      ensure(D.value)
      toUi()
      logger.log('已从 JSON 标签页加载')
    } catch (err) {
      ElementPlus.ElMessage.error('解析失败：' + err.message)
    }
  }

  function syncToJson() {
    if (!D.value) return
    fromUi()
    syncJson()
    logger.log('已同步到 JSON 标签页')
  }

  function saveInfo() {
    if (!D.value) return
    fromUi()
    syncJson()
    logger.log('已保存基础信息')
    ElementPlus.ElMessage.success('已保存')
  }

  function onTabChange(name) {
    if (name === 'json' && D.value) syncToJson()
    if (name === 'detail' && detailMode.value === 'visual') syncDetailImagesFromHtml()
  }

  function appendPicsByUrls(urls) {
    if (!D.value) return 0
    let count = 0
    for (const url of urls) {
      D.value.FromPics.push({ LocalPath: null, Url: url, Keys: null, PicIndex: D.value.FromPics.length })
      count += 1
    }
    if (!D.value.FromItem.ItemPicUrl && D.value.FromPics[0]) D.value.FromItem.ItemPicUrl = D.value.FromPics[0].Url
    syncJson()
    return count
  }

  function setTitle(title) {
    info.ItemName = title
    if (D.value?.FromItem) D.value.FromItem.ItemName = title
    syncJson()
  }

  function addProperties(properties) {
    if (!D.value) return 0
    let count = 0
    for (const item of properties) {
      D.value.FromProperties.push({
        SysId: (D.value.FromItem || {}).SysId || 1,
        PropertyName: item.PropertyName || null,
        Name: item.Name,
        Value: item.Value,
        PropertyKey: item.PropertyKey || null,
        IsSellPro: Number(item.IsSellPro) || 0,
        Aliasname: item.Aliasname || null,
        PicUrl: item.PicUrl || null,
        Index: null,
      })
      count += 1
    }
    syncJson()
    return count
  }

  function getProductSummary() {
    fromUi()
    return {
      title: (D.value?.FromItem || {}).ItemName || '',
      category: (D.value?.FromItem || {}).SortName || '',
      skus: (D.value?.FromSkus || []).map(item => ((item.Specs || [])[0] || {}).SpecValue || '').filter(Boolean),
      props: (D.value?.FromProperties || []).map(item => ({ Name: item.Name, Value: item.Value })),
      pics: (D.value?.FromPics || []).map(item => item.Url).filter(Boolean),
    }
  }

  function applyDetailSections(sections) {
    const summary = getProductSummary()
    const fallbackImages = detailImages.value.length ? detailImages.value : summary.pics
    html.value = buildDetailHtmlFromSections(sections, fallbackImages)
    if (D.value) D.value.FromContent.PcDesc = html.value
    syncDetailImagesFromHtml()
    syncJson()
  }

  function addDetailImage(url = '') {
    detailImages.value = [...detailImages.value, url]
    syncHtmlFromDetailImages()
  }

  function updateDetailImage(index, url) {
    const next = [...detailImages.value]
    next[index] = url
    detailImages.value = next
    syncHtmlFromDetailImages()
  }

  function moveDetailImage(index, step) {
    const target = index + step
    if (target < 0 || target >= detailImages.value.length) return
    const next = [...detailImages.value]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    detailImages.value = next
    syncHtmlFromDetailImages()
  }

  function removeDetailImage(index) {
    detailImages.value = detailImages.value.filter((_, current) => current !== index)
    syncHtmlFromDetailImages()
  }

  function insertDetailImages(urls) {
    detailImages.value = [...detailImages.value, ...urls]
    syncHtmlFromDetailImages()
  }

  function setDetailMode(mode) {
    if (mode === detailMode.value) return
    if (mode === 'visual') syncDetailImagesFromHtml()
    else syncHtmlFromDetailImages()
    detailMode.value = mode
  }

  function updateDetailSource(value) {
    html.value = value
    if (D.value) D.value.FromContent.PcDesc = value
    syncDetailImagesFromHtml()
    syncJson()
  }

  function defaultSpecName() {
    if (!D.value) return '颜色分类'
    for (const property of D.value.FromProperties || []) {
      if (property.IsSellPro == 1 && property.Name) return property.Name.trim()
    }
    for (const sku of D.value.FromSkus || []) {
      const spec = (sku.Specs || [])[0]
      if (spec && spec.SpecName) return spec.SpecName
    }
    return '颜色分类'
  }

  function syncSellProps() {
    const nonSale = (D.value.FromProperties || []).filter(item => item.IsSellPro != 1)
    const oldMap = {}
    for (const property of D.value.FromProperties || []) {
      if (property.IsSellPro == 1) oldMap[property.Name + '|' + property.Value] = clone(property)
    }
    const sale = []
    const seen = new Set()
    for (const sku of D.value.FromSkus || []) {
      for (const spec of sku.Specs || []) {
        const key = spec.SpecName + '|' + spec.SpecValue
        if (seen.has(key)) continue
        seen.add(key)
        const old = oldMap[key] || {}
        sale.push({
          SysId: old.SysId || (D.value.FromItem || {}).SysId || 1,
          PropertyName: old.PropertyName || null,
          Name: spec.SpecName,
          Value: spec.SpecValue,
          PropertyKey: old.PropertyKey || null,
          IsSellPro: 1,
          Aliasname: old.Aliasname || null,
          PicUrl: old.PicUrl || (D.value.FromItem || {}).ItemPicUrl || null,
          Index: old.Index || null,
        })
      }
    }
    D.value.FromProperties = [...nonSale, ...sale]
  }

  function openPicDialog(mode) {
    if (!D.value) return
    if (mode === 'add') {
      Object.assign(picDialog, { show: true, mode, idx: -1, d: { Url: '', LocalPath: '', Keys: '', PicIndex: String((D.value.FromPics || []).length) } })
      return
    }
    if (picIndex.value < 0) return
    const pic = D.value.FromPics[picIndex.value]
    Object.assign(picDialog, { show: true, mode, idx: picIndex.value, d: { Url: pic.Url || '', LocalPath: pic.LocalPath || '', Keys: pic.Keys || '', PicIndex: String(pic.PicIndex ?? picIndex.value) } })
  }

  function savePic() {
    const record = {
      LocalPath: picDialog.d.LocalPath || null,
      Url: picDialog.d.Url || '',
      Keys: picDialog.d.Keys || null,
      PicIndex: picDialog.d.PicIndex ? Number(picDialog.d.PicIndex) : 0,
    }
    if (picDialog.mode === 'add') {
      D.value.FromPics.push(record)
      logger.log('已新增主图')
    } else {
      D.value.FromPics[picDialog.idx] = record
      logger.log('已编辑主图 [' + picDialog.idx + ']')
    }
    picDialog.show = false
    if (!D.value.FromItem.ItemPicUrl && D.value.FromPics[0]) D.value.FromItem.ItemPicUrl = D.value.FromPics[0].Url
    syncJson()
  }

  async function deletePic() {
    if (picIndex.value < 0) return
    try {
      await ElementPlus.ElMessageBox.confirm('确认删除第 ' + picIndex.value + ' 张主图？', '删除确认')
    } catch {
      return
    }
    D.value.FromPics.splice(picIndex.value, 1)
    picIndex.value = -1
    syncJson()
    logger.log('已删除主图')
  }

  function openSkuDialog(mode) {
    if (!D.value) return
    if (mode === 'add') {
      Object.assign(skuDialog, { show: true, mode, idx: -1, d: { sn: defaultSpecName(), sv: '', SkuId: '', Price: 0, PromotionPrice: 0, CouponPrice: 0, Num: 0, SkuCode: '', Barcode: '' } })
      return
    }
    if (skuIndex.value < 0) return
    const sku = D.value.FromSkus[skuIndex.value]
    const spec = (sku.Specs || [])[0] || { SpecName: '', SpecValue: '' }
    Object.assign(skuDialog, { show: true, mode, idx: skuIndex.value, d: { sn: spec.SpecName, sv: spec.SpecValue, SkuId: sku.SkuId || '', Price: sku.Price || 0, PromotionPrice: sku.PromotionPrice || 0, CouponPrice: sku.CouponPrice || 0, Num: sku.Num || 0, SkuCode: sku.SkuCode || '', Barcode: sku.Barcode || '' } })
  }

  function saveSku() {
    const data = skuDialog.d
    if (!(data.sv || '').trim()) {
      ElementPlus.ElMessage.warning('规格值不能为空')
      return
    }
    const record = {
      SysId: (D.value.FromItem || {}).SysId || 1,
      SkuCode: data.SkuCode || null,
      Barcode: data.Barcode || null,
      SkuInfo: data.sn + ':' + data.sv,
      SkuInfoShort: data.sv,
      Price: Number(data.Price) || 0,
      PromotionPrice: Number(data.PromotionPrice) || 0,
      CouponPrice: Number(data.CouponPrice) || 0,
      Num: Number(data.Num) || 0,
      SkuId: data.SkuId || '',
      Specs: [{ SpecName: data.sn, SpecValue: data.sv }],
    }
    if (skuDialog.mode === 'add') {
      D.value.FromSkus.push(record)
      logger.log('已新增 SKU：' + data.sv)
    } else {
      D.value.FromSkus[skuDialog.idx] = record
      logger.log('已编辑 SKU：' + data.sv)
    }
    syncSellProps()
    skuDialog.show = false
    syncJson()
  }

  async function deleteSku() {
    if (skuIndex.value < 0) return
    const value = ((D.value.FromSkus[skuIndex.value].Specs || [])[0] || {}).SpecValue || ''
    try {
      await ElementPlus.ElMessageBox.confirm('确认删除 SKU：' + value + '？', '删除确认')
    } catch {
      return
    }
    D.value.FromSkus.splice(skuIndex.value, 1)
    skuIndex.value = -1
    syncSellProps()
    syncJson()
    logger.log('已删除 SKU：' + value)
  }

  function openPropDialog(mode) {
    if (!D.value) return
    if (mode === 'add') {
      Object.assign(propDialog, { show: true, mode, idx: -1, d: { Name: '', Value: '', IsSellPro: 0, PicUrl: '', Aliasname: '', PropertyName: '', PropertyKey: '' } })
      return
    }
    if (propIndex.value < 0) return
    const property = D.value.FromProperties[propIndex.value]
    Object.assign(propDialog, { show: true, mode, idx: propIndex.value, d: { Name: property.Name || '', Value: property.Value || '', IsSellPro: property.IsSellPro || 0, PicUrl: property.PicUrl || '', Aliasname: property.Aliasname || '', PropertyName: property.PropertyName || '', PropertyKey: property.PropertyKey || '' } })
  }

  function saveProp() {
    const data = propDialog.d
    const record = {
      SysId: (D.value.FromItem || {}).SysId || 1,
      PropertyName: data.PropertyName || null,
      Name: data.Name,
      Value: data.Value,
      PropertyKey: data.PropertyKey || null,
      IsSellPro: Number(data.IsSellPro) || 0,
      Aliasname: data.Aliasname || null,
      PicUrl: data.PicUrl || null,
      Index: null,
    }
    if (propDialog.mode === 'add') {
      D.value.FromProperties.push(record)
      logger.log('已新增属性 ' + data.Name + '=' + data.Value)
    } else {
      D.value.FromProperties[propDialog.idx] = record
      logger.log('已编辑属性 [' + propDialog.idx + ']')
    }
    propDialog.show = false
    syncJson()
  }

  async function deleteProp() {
    if (propIndex.value < 0) return
    const property = D.value.FromProperties[propIndex.value]
    try {
      await ElementPlus.ElMessageBox.confirm('确认删除属性 ' + property.Name + '=' + property.Value + '？', '删除确认')
    } catch {
      return
    }
    D.value.FromProperties.splice(propIndex.value, 1)
    propIndex.value = -1
    syncJson()
    logger.log('已删除属性')
  }

  return {
    D,
    FG,
    info,
    html,
    json,
    detailMode,
    detailImages,
    picIndex,
    skuIndex,
    propIndex,
    picDialog,
    skuDialog,
    propDialog,
    picList,
    skuList,
    propList,
    ensure,
    newBlank,
    importFile,
    exportFile,
    loadFromJson,
    syncToJson,
    saveInfo,
    onTabChange,
    fromUi,
    syncJson,
    appendPicsByUrls,
    setTitle,
    addProperties,
    getProductSummary,
    applyDetailSections,
    addDetailImage,
    updateDetailImage,
    moveDetailImage,
    removeDetailImage,
    insertDetailImages,
    setDetailMode,
    updateDetailSource,
    syncDetailImagesFromHtml,
    openPicDialog,
    savePic,
    deletePic,
    openSkuDialog,
    saveSku,
    deleteSku,
    openPropDialog,
    saveProp,
    deleteProp,
    toRawData: () => clone(toRaw(D.value)),
  }
}
