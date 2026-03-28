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

function getSkuSpec(sku) {
  return (sku?.Specs || [])[0] || { SpecName: '', SpecValue: '' }
}

export function useProductData(logger) {
  const D = ref(null)
  const info = reactive({})
  const html = ref('')
  const json = ref('')
  const detailMode = ref('visual')
  const detailImages = ref([])
  const selectedSkuIndexes = ref([])

  const picIndex = ref(-1)
  const skuIndex = ref(-1)
  const propIndex = ref(-1)

  const picDialog = reactive({ show: false, mode: 'add', idx: -1, d: { Url: '', LocalPath: '', PicIndex: '0' } })
  const skuDialog = reactive({ show: false, mode: 'add', idx: -1, d: { sn: '', sv: '', SkuId: '', Price: 0, PromotionPrice: 0, CouponPrice: 0, Num: 0, SkuCode: '', Barcode: '' } })
  const propDialog = reactive({ show: false, mode: 'add', idx: -1, d: { Name: '', Value: '', IsSellPro: 0, PicUrl: '', Aliasname: '', PropertyName: '', PropertyKey: '' } })

  function ensure(data) {
    data.FromItem = data.FromItem || {}
    data.FromContent = data.FromContent || {}
    data.FromPics = data.FromPics || []
    data.FromProperties = data.FromProperties || []
    data.FromSkus = data.FromSkus || []
  }

  function findSaleProp(specName, specValue) {
    if (!D.value) return { index: -1, property: null }
    const index = (D.value.FromProperties || []).findIndex(item => item.IsSellPro == 1 && item.Name === specName && item.Value === specValue)
    return {
      index,
      property: index >= 0 ? D.value.FromProperties[index] : null,
    }
  }

  function ensureSalePropForSku(sku) {
    if (!D.value || !sku) return { index: -1, property: null }
    const spec = getSkuSpec(sku)
    if (!spec.SpecValue) return { index: -1, property: null }

    const matched = findSaleProp(spec.SpecName, spec.SpecValue)
    if (matched.property) return matched

    const property = {
      SysId: (D.value.FromItem || {}).SysId || 1,
      PropertyName: null,
      Name: spec.SpecName,
      Value: spec.SpecValue,
      PropertyKey: null,
      IsSellPro: 1,
      Aliasname: null,
      PicUrl: (D.value.FromItem || {}).ItemPicUrl || null,
      Index: null,
    }
    D.value.FromProperties.push(property)
    return {
      index: D.value.FromProperties.length - 1,
      property,
    }
  }

  const picList = computed(() => D.value ? (D.value.FromPics || []).map((item, index) => ({ ...item, _i: index })) : [])

  const skuList = computed(() => {
    if (!D.value) return []
    return (D.value.FromSkus || []).map((sku, index) => {
      const spec = getSkuSpec(sku)
      const matched = findSaleProp(spec.SpecName, spec.SpecValue)
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
        imageUrl: matched.property?.PicUrl || '',
        propertyIndex: matched.index,
      }
    })
  })

  const propList = computed(() => D.value ? (D.value.FromProperties || []).map((item, index) => ({ ...item, _i: index })) : [])

  const selectedSkuRows = computed(() => {
    const selected = new Set(selectedSkuIndexes.value)
    return skuList.value.filter(row => selected.has(row._i))
  })

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
    selectedSkuIndexes.value = []
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
    logger.log('Blank product created')
  }

  async function importFile() {
    const result = await window.api.openFile()
    if (!result) return
    try {
      const text = result.content.replace(/^\uFEFF/, '')
      const start = text.indexOf('{')
      if (start < 0) throw new Error('JSON object not found')
      D.value = JSON.parse(text.substring(start))
      ensure(D.value)
      toUi()
      logger.log('Imported ' + result.path)
    } catch (err) {
      ElementPlus.ElMessage.error('Import failed: ' + err.message)
    }
  }

  async function exportFile() {
    if (!D.value) {
      ElementPlus.ElMessage.warning('Load product data first')
      return
    }
    fromUi()
    syncJson()
    const savePath = await window.api.saveFile(json.value)
    if (savePath) logger.log('Exported ' + savePath)
  }

  function loadFromJson() {
    const text = json.value.trim()
    if (!text) {
      ElementPlus.ElMessage.warning('JSON is empty')
      return
    }
    try {
      D.value = JSON.parse(text)
      ensure(D.value)
      toUi()
      logger.log('Loaded from JSON tab')
    } catch (err) {
      ElementPlus.ElMessage.error('Parse failed: ' + err.message)
    }
  }

  function syncToJson() {
    if (!D.value) return
    fromUi()
    syncJson()
    logger.log('Synced to JSON tab')
  }

  function saveInfo() {
    if (!D.value) return
    fromUi()
    syncJson()
    logger.log('Saved basic info')
    ElementPlus.ElMessage.success('Saved')
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
      skus: skuList.value.map(item => item.sv).filter(Boolean),
      props: (D.value?.FromProperties || []).map(item => ({ Name: item.Name, Value: item.Value, IsSellPro: item.IsSellPro })),
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

  function reorderDetailImage(from, to) {
    if (from === to || from < 0 || to < 0 || from >= detailImages.value.length || to >= detailImages.value.length) return
    const next = [...detailImages.value]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    detailImages.value = next
    syncHtmlFromDetailImages()
  }

  function moveDetailImage(index, step) {
    reorderDetailImage(index, index + step)
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
      const spec = getSkuSpec(sku)
      if (spec.SpecName) return spec.SpecName
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
      Object.assign(picDialog, { show: true, mode, idx: -1, d: { Url: '', LocalPath: '', PicIndex: String((D.value.FromPics || []).length) } })
      return
    }
    if (picIndex.value < 0) return
    const pic = D.value.FromPics[picIndex.value]
    Object.assign(picDialog, { show: true, mode, idx: picIndex.value, d: { Url: pic.Url || '', LocalPath: pic.LocalPath || '', PicIndex: String(pic.PicIndex ?? picIndex.value) } })
  }

  function savePic() {
    const source = picDialog.mode === 'edit' ? (D.value.FromPics[picDialog.idx] || {}) : {}
    const record = {
      LocalPath: picDialog.d.LocalPath || null,
      Url: picDialog.d.Url || '',
      Keys: source.Keys || null,
      PicIndex: picDialog.d.PicIndex ? Number(picDialog.d.PicIndex) : 0,
    }
    if (picDialog.mode === 'add') {
      D.value.FromPics.push(record)
      logger.log('Added main image')
    } else {
      D.value.FromPics[picDialog.idx] = record
      logger.log('Edited main image [' + picDialog.idx + ']')
    }
    picDialog.show = false
    if (!D.value.FromItem.ItemPicUrl && D.value.FromPics[0]) D.value.FromItem.ItemPicUrl = D.value.FromPics[0].Url
    syncJson()
  }

  async function deletePic() {
    if (picIndex.value < 0) return
    try {
      await ElementPlus.ElMessageBox.confirm('Delete main image #' + (picIndex.value + 1) + '?', 'Confirm delete')
    } catch {
      return
    }
    D.value.FromPics.splice(picIndex.value, 1)
    picIndex.value = -1
    syncJson()
    logger.log('Deleted main image')
  }

  function openSkuDialog(mode) {
    if (!D.value) return
    if (mode === 'add') {
      Object.assign(skuDialog, { show: true, mode, idx: -1, d: { sn: defaultSpecName(), sv: '', SkuId: '', Price: 0, PromotionPrice: 0, CouponPrice: 0, Num: 0, SkuCode: '', Barcode: '' } })
      return
    }
    if (skuIndex.value < 0) return
    const sku = D.value.FromSkus[skuIndex.value]
    const spec = getSkuSpec(sku)
    Object.assign(skuDialog, { show: true, mode, idx: skuIndex.value, d: { sn: spec.SpecName, sv: spec.SpecValue, SkuId: sku.SkuId || '', Price: sku.Price || 0, PromotionPrice: sku.PromotionPrice || 0, CouponPrice: sku.CouponPrice || 0, Num: sku.Num || 0, SkuCode: sku.SkuCode || '', Barcode: sku.Barcode || '' } })
  }

  function saveSku() {
    const data = skuDialog.d
    if (!(data.sv || '').trim()) {
      ElementPlus.ElMessage.warning('SKU value is required')
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
      logger.log('Added SKU: ' + data.sv)
    } else {
      D.value.FromSkus[skuDialog.idx] = record
      logger.log('Edited SKU: ' + data.sv)
    }
    syncSellProps()
    skuDialog.show = false
    syncJson()
  }

  async function deleteSku() {
    if (skuIndex.value < 0) return
    const deletingIndex = skuIndex.value
    const value = getSkuSpec(D.value.FromSkus[skuIndex.value]).SpecValue || ''
    try {
      await ElementPlus.ElMessageBox.confirm('Delete SKU: ' + value + '?', 'Confirm delete')
    } catch {
      return
    }
    D.value.FromSkus.splice(deletingIndex, 1)
    skuIndex.value = -1
    selectedSkuIndexes.value = []
    syncSellProps()
    syncJson()
    logger.log('Deleted SKU: ' + value)
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
      logger.log('Added property ' + data.Name + '=' + data.Value)
    } else {
      D.value.FromProperties[propDialog.idx] = record
      logger.log('Edited property [' + propDialog.idx + ']')
    }
    propDialog.show = false
    syncJson()
  }

  async function deleteProp() {
    if (propIndex.value < 0) return
    const property = D.value.FromProperties[propIndex.value]
    try {
      await ElementPlus.ElMessageBox.confirm('Delete property ' + property.Name + '=' + property.Value + '?', 'Confirm delete')
    } catch {
      return
    }
    D.value.FromProperties.splice(propIndex.value, 1)
    propIndex.value = -1
    syncJson()
    logger.log('Deleted property')
  }

  function setSkuSelection(rows) {
    selectedSkuIndexes.value = rows.map(row => row._i)
  }

  function getSelectedSkuRows() {
    return selectedSkuRows.value
  }

  function getSkusMissingCodes() {
    return skuList.value.filter(item => !item.SkuCode || !item.Barcode)
  }

  function applyOptimizedSkuNames(items) {
    if (!D.value) return 0
    let count = 0
    for (const item of items || []) {
      const sku = D.value.FromSkus[item.index]
      if (!sku || !(item.value || '').trim()) continue
      const spec = getSkuSpec(sku)
      const oldValue = spec.SpecValue
      spec.SpecValue = item.value.trim()
      sku.SkuInfo = `${spec.SpecName}:${spec.SpecValue}`
      sku.SkuInfoShort = spec.SpecValue
      const matched = findSaleProp(spec.SpecName, oldValue)
      if (matched.property) matched.property.Value = spec.SpecValue
      else ensureSalePropForSku(sku)
      count += 1
    }
    syncJson()
    return count
  }

  function applySkuCodeSuggestions(items) {
    if (!D.value) return 0
    let count = 0
    for (const item of items || []) {
      const sku = D.value.FromSkus[item.index]
      if (!sku) continue
      if (!sku.SkuCode && item.SkuCode) {
        sku.SkuCode = item.SkuCode
        count += 1
      }
      if (!sku.Barcode && item.Barcode) {
        sku.Barcode = item.Barcode
        count += 1
      }
    }
    syncJson()
    return count
  }

  function replacePicByUpload(index, upload) {
    if (!D.value || index < 0) return
    const current = D.value.FromPics[index] || {}
    const previousUrl = current.Url || ''
    D.value.FromPics[index] = {
      ...current,
      LocalPath: upload.localPath || current.LocalPath || null,
      Url: upload.url,
      Keys: upload.key || current.Keys || null,
      PicIndex: current.PicIndex ?? index,
    }
    if (D.value.FromItem.ItemPicUrl === previousUrl || (!D.value.FromItem.ItemPicUrl && index === 0)) {
      D.value.FromItem.ItemPicUrl = upload.url
      info.ItemPicUrl = upload.url
    }
    syncJson()
  }

  function replaceSkuImageByUpload(index, upload) {
    if (!D.value || index < 0) return
    const sku = D.value.FromSkus[index]
    const matched = ensureSalePropForSku(sku)
    if (!matched.property) return
    matched.property.PicUrl = upload.url
    syncJson()
  }

  function replacePropImageByUpload(index, upload) {
    if (!D.value || index < 0) return
    const property = D.value.FromProperties[index]
    if (!property) return
    property.PicUrl = upload.url
    syncJson()
  }

  function replaceDetailImageByUpload(index, upload) {
    updateDetailImage(index, upload.url)
  }

  return {
    D,
    FG,
    info,
    html,
    json,
    detailMode,
    detailImages,
    selectedSkuIndexes,
    selectedSkuRows,
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
    reorderDetailImage,
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
    setSkuSelection,
    getSelectedSkuRows,
    getSkusMissingCodes,
    applyOptimizedSkuNames,
    applySkuCodeSuggestions,
    replacePicByUpload,
    replaceSkuImageByUpload,
    replacePropImageByUpload,
    replaceDetailImageByUpload,
    toRawData: () => clone(toRaw(D.value)),
  }
}
