// 用途：封装系统配置的加载、保存和连接测试状态。
import { CFG_DEFAULTS, clone } from '../constants.js'

const { reactive } = Vue

export function useConfig(logger) {
  const cfg = reactive(clone(CFG_DEFAULTS))
  const settings = reactive({ saving: false, aiTesting: false, cosTesting: false })

  function cfgPayload() {
    return JSON.parse(JSON.stringify(cfg))
  }

  async function loadCfg() {
    const saved = await window.api.cfgLoad()
    Object.assign(cfg, clone(CFG_DEFAULTS), saved || {})
  }

  async function saveCfg(onAfterSave) {
    settings.saving = true
    try {
      await window.api.cfgSave(cfgPayload())
      logger.log('系统设置已保存')
      ElementPlus.ElMessage.success('设置已保存')
      if (onAfterSave) await onAfterSave()
    } catch (err) {
      ElementPlus.ElMessage.error('保存失败：' + err.message)
    }
    settings.saving = false
  }

  async function testAiConnection() {
    if (!cfg.ai_base_url || !cfg.ai_api_key) {
      ElementPlus.ElMessage.error('请先填写 AI Base URL 和 API Key')
      return
    }
    settings.aiTesting = true
    try {
      const reply = await window.api.aiTest(cfgPayload())
      logger.log('AI 连接测试成功：' + reply)
      ElementPlus.ElMessage.success('AI 连接成功')
    } catch (err) {
      logger.log('AI 连接测试失败：' + err.message)
      ElementPlus.ElMessage.error('AI 连接失败：' + err.message)
    }
    settings.aiTesting = false
  }

  async function testCosConnection() {
    if (!cfg.cos_secret_id || !cfg.cos_secret_key || !cfg.cos_bucket) {
      ElementPlus.ElMessage.error('请先填写 COS 凭证和存储桶配置')
      return
    }
    settings.cosTesting = true
    try {
      const result = await window.api.cosTest(cfgPayload())
      logger.log('COS 连接测试成功，当前返回 ' + result.count + ' 条结果')
      ElementPlus.ElMessage.success('COS 连接成功')
    } catch (err) {
      logger.log('COS 连接测试失败：' + err.message)
      ElementPlus.ElMessage.error('COS 连接失败：' + err.message)
    }
    settings.cosTesting = false
  }

  return {
    cfg,
    cfgPayload,
    settings,
    loadCfg,
    saveCfg,
    testAiConnection,
    testCosConnection,
  }
}
