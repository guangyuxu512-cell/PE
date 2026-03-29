const { reactive } = Vue

export function useAi(configState, productData, galleryState, logger) {
  const batchDialog = reactive({ show: false, n: 10, dir: '', busy: false })
  const titleState = reactive({
    loading: false,
    mode: '',
    generatedTitles: [],
    optimizedTitle: '',
    originalTitle: '',
  })
  const propsDialog = reactive({ show: false, loading: false, suggestions: [] })
  const skuNameDialog = reactive({ show: false, loading: false, suggestions: [] })
  const skuCodeDialog = reactive({ show: false, loading: false, suggestions: [] })

  function requireAiReady() {
    if (!configState.cfg.ai_base_url || !configState.cfg.ai_api_key) {
      ElementPlus.ElMessage.error('请先在系统设置中配置 AI API 凭证')
      return false
    }
    return true
  }

  function resetTitleState(mode = '') {
    titleState.mode = mode
    titleState.generatedTitles = []
    titleState.optimizedTitle = ''
    titleState.originalTitle = ''
  }

  async function pickBatchDir() {
    const dir = await window.api.pickDir()
    if (dir) batchDialog.dir = dir
  }

  async function runBatchGenerate() {
    if (!productData.D.value) return
    if (!requireAiReady()) return
    productData.fromUi()
    const title = (productData.D.value.FromItem || {}).ItemName || ''
    if (!title) {
      ElementPlus.ElMessage.warning('请先填写商品标题')
      return
    }
    if (!batchDialog.dir) {
      ElementPlus.ElMessage.warning('请选择导出目录')
      return
    }

    const skus = (productData.D.value.FromSkus || [])
      .map(item => ((item.Specs || [])[0] || {}).SpecValue || '')
      .filter(Boolean)

    batchDialog.busy = true
    logger.log('正在调用 AI 生成 ' + batchDialog.n + ' 套商品数据')

    try {
      const skuText = skus.length ? skus.map(name => '- ' + name).join('\n') : '（无 SKU）'
      const prompt = '你是一个电商运营专家。请基于以下商品信息，生成 '
        + batchDialog.n + ' 套不同的标题和 SKU 名称变体。\n\n'
        + '原标题：' + title + '\n原 SKU 列表：\n' + skuText + '\n\n'
        + '要求：\n'
        + '1. 每套标题自然、吸引人，包含核心关键词但措辞不同\n'
        + '2. SKU 名称与原 SKU 一一对应，数量保持一致（' + skus.length + ' 个）\n'
        + '3. 每套之间有明显差异\n'
        + '以 JSON 数组返回：[{"标题":"...","SKU":["..."]}]\n只返回 JSON，不要其他内容。'

      const text = await window.api.aiGen({ cfg: configState.cfgPayload(), prompt })
      const start = text.indexOf('[')
      const end = text.lastIndexOf(']') + 1
      if (start < 0 || end <= start) throw new Error('AI 返回格式不正确')
      const items = JSON.parse(text.substring(start, end))

      const files = items.map((item, index) => {
        const data = productData.toRawData()
        data.FromItem.ItemName = item['标题'] || title
        const nextSkus = item.SKU || []
        for (let i = 0; i < (data.FromSkus || []).length; i += 1) {
          if (i >= nextSkus.length) continue
          const sku = data.FromSkus[i]
          const oldValue = ((sku.Specs || [])[0] || {}).SpecValue || ''
          if (sku.Specs && sku.Specs[0]) sku.Specs[0].SpecValue = nextSkus[i]
          sku.SkuInfo = ((sku.Specs || [])[0] || {}).SpecName + ':' + nextSkus[i]
          sku.SkuInfoShort = nextSkus[i]
          for (const property of data.FromProperties || []) {
            if (property.IsSellPro == 1 && property.Value === oldValue) property.Value = nextSkus[i]
          }
        }
        return {
          name: '商品_' + String(index + 1).padStart(2, '0') + '.txt',
          content: JSON.stringify(data, null, 4),
        }
      })

      const count = await window.api.batchExport({ dir: batchDialog.dir, files })
      logger.log('AI 批量生成完成，' + count + ' 套已导出到 ' + batchDialog.dir)
      ElementPlus.ElMessage.success('已生成 ' + count + ' 套商品数据')
      batchDialog.show = false
    } catch (err) {
      logger.log('AI 生成失败：' + err.message)
      ElementPlus.ElMessage.error('生成失败：' + err.message)
    }

    batchDialog.busy = false
  }

  function getTitleRequestPayload() {
    const summary = productData.getProductSummary()
    return {
      cfg: configState.cfgPayload(),
      title: summary.title,
      shortTitle: summary.shortTitle,
      category: summary.category,
      skus: summary.skus,
      skuSpecNames: summary.skuSpecNames,
      priceRange: summary.priceRange,
      props: summary.props,
      pics: summary.pics,
    }
  }

  async function generateTitle() {
    if (!productData.D.value) return
    if (!requireAiReady()) return

    resetTitleState('generate')
    titleState.loading = true

    try {
      const suggestions = await window.api.aiGenerateTitle(getTitleRequestPayload())
      titleState.generatedTitles = (suggestions || []).slice(0, 5)
      logger.log('AI 生成标题已返回 ' + titleState.generatedTitles.length + ' 个候选项')
    } catch (err) {
      resetTitleState()
      logger.log('AI 生成标题失败：' + err.message)
      ElementPlus.ElMessage.error('AI 生成标题失败：' + err.message)
    }

    titleState.loading = false
  }

  async function optimizeTitle() {
    if (!productData.D.value) return
    if (!requireAiReady()) return
    const payload = getTitleRequestPayload()
    if (!payload.title) {
      ElementPlus.ElMessage.warning('请先填写当前标题，再执行 AI 优化标题')
      return
    }

    resetTitleState('optimize')
    titleState.loading = true
    titleState.originalTitle = payload.title

    try {
      titleState.optimizedTitle = await window.api.aiOptimizeTitle(payload)
      logger.log('AI 优化标题已返回结果')
    } catch (err) {
      resetTitleState()
      logger.log('AI 优化标题失败：' + err.message)
      ElementPlus.ElMessage.error('AI 优化标题失败：' + err.message)
    }

    titleState.loading = false
  }

  function applyTitleSuggestion(title) {
    productData.setTitle(title)
    resetTitleState()
    logger.log('已应用 AI 标题建议')
  }

  async function optimizeSkuNames() {
    if (!productData.D.value) return
    if (!requireAiReady()) return
    const rows = productData.getSelectedSkuRows()
    if (!rows.length) {
      ElementPlus.ElMessage.warning('请先勾选需要优化的 SKU 行')
      return
    }

    skuNameDialog.loading = true
    skuNameDialog.show = true
    try {
      const summary = productData.getProductSummary()
      const suggestions = await window.api.aiOptimizeSkus({
        cfg: configState.cfgPayload(),
        title: summary.title,
        category: summary.category,
        skus: rows.map(row => row.sv),
      })
      skuNameDialog.suggestions = suggestions.map((value, idx) => ({
        index: rows[idx]._i,
        original: rows[idx].sv,
        value,
        checked: true,
      }))
      logger.log('已生成 ' + skuNameDialog.suggestions.length + ' 条 SKU 名称建议')
    } catch (err) {
      skuNameDialog.show = false
      logger.log('SKU 名称优化失败：' + err.message)
      ElementPlus.ElMessage.error('SKU 名称优化失败：' + err.message)
    }
    skuNameDialog.loading = false
  }

  function applyCheckedSkuNames() {
    const selected = skuNameDialog.suggestions.filter(item => item.checked)
    if (!selected.length) {
      ElementPlus.ElMessage.warning('请至少选择一条 SKU 名称建议')
      return
    }
    const count = productData.applyOptimizedSkuNames(selected)
    skuNameDialog.show = false
    logger.log('已应用 ' + count + ' 条 SKU 名称建议')
    ElementPlus.ElMessage.success('SKU 名称已更新')
  }

  async function fillSkuCodes() {
    if (!productData.D.value) return
    if (!requireAiReady()) return
    const rows = productData.getSkusMissingCodes()
    if (!rows.length) {
      ElementPlus.ElMessage.success('所有 SKU 编码和条码都已填写')
      return
    }

    skuCodeDialog.loading = true
    skuCodeDialog.show = true
    try {
      const summary = productData.getProductSummary()
      const suggestions = await window.api.aiFillSkuCodes({
        cfg: configState.cfgPayload(),
        title: summary.title,
        category: summary.category,
        skus: rows.map(row => ({
          name: row.sn,
          value: row.sv,
          SkuCode: row.SkuCode || '',
          Barcode: row.Barcode || '',
        })),
      })
      skuCodeDialog.suggestions = suggestions.map((item, idx) => ({
        index: rows[idx]._i,
        name: rows[idx].sv,
        SkuCode: item?.SkuCode || '',
        Barcode: item?.Barcode || '',
        checked: true,
      }))
      logger.log('已生成 ' + skuCodeDialog.suggestions.length + ' 条 SKU 编码建议')
    } catch (err) {
      skuCodeDialog.show = false
      logger.log('SKU 编码补全失败：' + err.message)
      ElementPlus.ElMessage.error('SKU 编码补全失败：' + err.message)
    }
    skuCodeDialog.loading = false
  }

  function applySkuCodeSuggestions() {
    const selected = skuCodeDialog.suggestions.filter(item => item.checked)
    if (!selected.length) {
      ElementPlus.ElMessage.warning('请至少选择一条 SKU 编码建议')
      return
    }
    const count = productData.applySkuCodeSuggestions(selected)
    skuCodeDialog.show = false
    logger.log('已应用 ' + count + ' 个 SKU 编码字段')
    ElementPlus.ElMessage.success('SKU 编码已补全')
  }

  async function fillProps() {
    if (!productData.D.value) return
    if (!requireAiReady()) return
    propsDialog.loading = true
    propsDialog.show = true
    try {
      const summary = productData.getProductSummary()
      const suggestions = await window.api.aiFillProps({
        cfg: configState.cfgPayload(),
        title: summary.title,
        category: summary.category,
        existingProps: summary.props.filter(item => item.IsSellPro != 1),
      })
      propsDialog.suggestions = suggestions.map(item => ({ ...item, checked: true }))
      logger.log('已生成 ' + propsDialog.suggestions.length + ' 条属性建议')
    } catch (err) {
      propsDialog.show = false
      logger.log('属性补全失败：' + err.message)
      ElementPlus.ElMessage.error('属性补全失败：' + err.message)
    }
    propsDialog.loading = false
  }

  function applyCheckedProps() {
    const selected = propsDialog.suggestions.filter(item => item.checked)
    if (!selected.length) {
      ElementPlus.ElMessage.warning('请至少选择一条属性建议')
      return
    }
    const count = productData.addProperties(selected)
    propsDialog.show = false
    logger.log('已批量添加 ' + count + ' 条属性')
    ElementPlus.ElMessage.success('已添加 ' + count + ' 条属性')
  }

  return {
    batchDialog,
    titleState,
    propsDialog,
    skuNameDialog,
    skuCodeDialog,
    pickBatchDir,
    runBatchGenerate,
    generateTitle,
    optimizeTitle,
    applyTitleSuggestion,
    optimizeSkuNames,
    applyCheckedSkuNames,
    fillSkuCodes,
    applySkuCodeSuggestions,
    fillProps,
    applyCheckedProps,
  }
}
