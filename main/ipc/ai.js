const { chatJson, getAiClient } = require('../utils')

function buildTitleContext({ category, shortTitle, skuSpecNames, skus, priceRange, props, pics }) {
  const propText = (props || [])
    .map(item => `${item.Name}:${item.Value}`)
    .join('；') || '无'
  const specNameText = (skuSpecNames || []).join(' / ') || '无'
  const skuText = (skus || []).join(' / ') || '无'
  const priceText = priceRange && priceRange.min != null
    ? priceRange.min === priceRange.max
      ? `${priceRange.min}`
      : `${priceRange.min} ~ ${priceRange.max}`
    : '无'
  const picText = (pics || []).join('\n') || '无'

  return [
    `类目：${category || '无'}`,
    `短标题：${shortTitle || '无'}`,
    `SKU 规格名：${specNameText}`,
    `SKU 规格值：${skuText}`,
    `价格区间：${priceText}`,
    `商品属性：${propText}`,
    `主图：${picText}`,
  ].join('\n')
}

module.exports = function registerAiIpc({ ipcMain }) {
  ipcMain.handle('ai-gen', async (_, { cfg, prompt }) => {
    const client = getAiClient(cfg)
    const response = await client.chat.completions.create({
      model: cfg.ai_model || 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: Number(cfg.ai_temperature ?? 0.9),
      max_tokens: Number(cfg.ai_max_tokens ?? 2048),
    })
    return (response.choices[0].message.content || '').trim()
  })

  ipcMain.handle('ai-test', async (_, cfg) => {
    const client = getAiClient(cfg)
    const response = await client.chat.completions.create({
      model: cfg.ai_model || 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: '请只回复 OK。' }],
      temperature: Number(cfg.ai_temperature ?? 0.9),
      max_tokens: 32,
    })
    return (response.choices[0].message.content || '').trim()
  })

  ipcMain.handle('ai-describe-image', async (_, { cfg, imageUrl, prompt }) => {
    const client = getAiClient(cfg)
    const response = await client.chat.completions.create({
      model: cfg.ai_model || 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt || '请用中文简要描述这张商品图片的卖点、材质、场景和视觉重点。' },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      }],
      temperature: Number(cfg.ai_temperature ?? 0.9),
      max_tokens: Number(cfg.ai_max_tokens ?? 512),
    })
    return (response.choices[0].message.content || '').trim()
  })

  ipcMain.handle('ai-generate-title', async (_, { cfg, category, shortTitle, skuSpecNames, skus, priceRange, props, pics }) => {
    const context = buildTitleContext({ category, shortTitle, skuSpecNames, skus, priceRange, props, pics })
    return chatJson(cfg, [
      {
        role: 'system',
        content: '你是电商商品标题生成助手。只返回 JSON 数组，数组内为 3 到 5 个中文标题字符串。',
      },
      {
        role: 'user',
        content:
          '请根据以下商品信息，生成 5 个适合电商平台的商品标题，每个标题包含核心卖点和搜索关键词，控制在 60 字以内。\n'
          + `商品信息：\n${context}\n`
          + '只返回 JSON 数组，不要返回解释。',
      },
    ], 'array')
  })

  ipcMain.handle('ai-optimize-title', async (_, { cfg, title, category, shortTitle, skuSpecNames, skus, priceRange, props }) => {
    const context = buildTitleContext({ category, shortTitle, skuSpecNames, skus, priceRange, props, pics: [] })
    const data = await chatJson(cfg, [
      {
        role: 'system',
        content: '你是电商标题优化助手。只返回 JSON 对象，格式为 {"optimizedTitle":""}。',
      },
      {
        role: 'user',
        content:
          '请基于以下原标题和商品信息，优化这个标题使其更适合电商搜索，保留核心卖点，控制在 60 字以内。\n'
          + `原标题：${title || ''}\n`
          + `商品信息：\n${context}\n`
          + '只返回 JSON 对象。',
      },
    ], 'object')
    return (data && data.optimizedTitle ? String(data.optimizedTitle) : '').trim()
  })

  ipcMain.handle('ai-optimize-skus', async (_, { cfg, title, category, skus }) => {
    return chatJson(cfg, [
      {
        role: 'system',
        content: '你是电商 SKU 命名优化助手。只返回 JSON 数组，顺序必须与输入一致，每项为一个中文 SKU 值名称。',
      },
      {
        role: 'user',
        content:
          `商品标题：${title || ''}\n` +
          `类目：${category || ''}\n` +
          `需要优化的 SKU 值列表：${(skus || []).join(' / ') || '无'}\n` +
          '请在保持原意的前提下，生成更规范、更有吸引力的 SKU 值名称。只返回 JSON 数组。',
      },
    ], 'array')
  })

  ipcMain.handle('ai-fill-sku-codes', async (_, { cfg, title, category, skus }) => {
    return chatJson(cfg, [
      {
        role: 'system',
        content: '你是电商 SKU 编码补全助手。只返回 JSON 数组，每项形如 {"SkuCode":"","Barcode":""}，顺序必须与输入一致。',
      },
      {
        role: 'user',
        content:
          `商品标题：${title || ''}\n` +
          `类目：${category || ''}\n` +
          `SKU 列表：${JSON.stringify(skus || [])}\n` +
          '请为缺失 SkuCode 或 Barcode 的规格生成建议值。已有值的字段请用空字符串返回。只返回 JSON 数组。',
      },
    ], 'array')
  })

  ipcMain.handle('ai-fill-props', async (_, { cfg, title, category, existingProps }) => {
    const data = await chatJson(cfg, [
      {
        role: 'system',
        content: '你是电商属性补全助手。只返回 JSON 数组，每项为 {"Name":"","Value":""}。',
      },
      {
        role: 'user',
        content:
          `商品标题：${title || ''}\n` +
          `类目：${category || ''}\n` +
          `现有非销售属性：${(existingProps || []).map(item => `${item.Name}:${item.Value}`).join('；') || '无'}\n` +
          '请只补全非销售属性，例如材质、风格、流行元素、功能点等，最多返回 8 条，不要与现有属性重复。',
      },
    ], 'array')
    return data.filter(item => item && item.Name && item.Value)
  })
}
