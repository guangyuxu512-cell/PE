// 用途：注册 AI 文本、视觉和详情生成相关 IPC。
const { chatJson, getAiClient } = require('../utils')

function getProductSummary(productInfo) {
  const title = productInfo.title || ''
  const category = productInfo.category || ''
  const skus = (productInfo.skus || []).filter(Boolean)
  const props = productInfo.props || []
  const pics = productInfo.pics || []
  return { title, category, skus, props, pics }
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

  ipcMain.handle('ai-generate-detail', async (_, { cfg, productInfo }) => {
    const summary = getProductSummary(productInfo || {})
    return chatJson(cfg, [
      {
        role: 'system',
        content: '你是资深电商详情页策划。只返回 JSON 数组，不要输出额外说明。',
      },
      {
        role: 'user',
        content:
          '请根据以下商品信息，生成 4 到 8 个详情页图片区块建议。' +
          '每个区块返回 {"title":"","subtitle":"","highlights":["",""]}。\n' +
          `商品标题：${summary.title}\n` +
          `类目：${summary.category}\n` +
          `SKU：${summary.skus.join(' / ') || '无'}\n` +
          `属性：${summary.props.map(item => `${item.Name}:${item.Value}`).join('；') || '无'}\n` +
          `主图：${summary.pics.join('\n') || '无'}\n`,
      },
    ], 'array')
  })

  ipcMain.handle('ai-optimize-title', async (_, { cfg, title, category, skus }) => {
    return chatJson(cfg, [
      {
        role: 'system',
        content: '你是电商标题优化助手。只返回 JSON 数组，数组内恰好 3 个中文标题字符串。',
      },
      {
        role: 'user',
        content:
          `原标题：${title || ''}\n` +
          `类目：${category || ''}\n` +
          `SKU：${(skus || []).join(' / ') || '无'}\n` +
          '请给出 3 个更适合电商发布的中文标题建议，避免夸张词，保留核心卖点。',
      },
    ], 'array')
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
