// 用途：渲染系统设置 Tab。
const { inject } = Vue

export default {
  name: 'TabSettings',
  setup() {
    const app = inject('appState')
    return { app }
  },
  template: `
    <div class="tscr settings-page">
      <div class="settings-grid">
        <el-card shadow="never" class="settings-card">
          <template #header>
            <div class="settings-head">
              <div class="settings-head__title">
                <strong>AI 接入配置</strong>
                <span>配置 OpenAI 兼容接口、模型名称、温度和最大 Token。</span>
              </div>
              <el-button :loading="app.config.settings.aiTesting" @click="app.config.testAiConnection">测试连接</el-button>
            </div>
          </template>
          <el-form label-width="120px">
            <el-form-item label="Base URL"><el-input v-model="app.config.cfg.ai_base_url" placeholder="https://api.openai.com/v1"></el-input></el-form-item>
            <el-form-item label="API Key"><el-input v-model="app.config.cfg.ai_api_key" type="password" show-password></el-input></el-form-item>
            <el-form-item label="模型名称"><el-input v-model="app.config.cfg.ai_model" placeholder="gpt-3.5-turbo"></el-input></el-form-item>
            <el-form-item label="温度"><div class="slider-row"><el-slider v-model="app.config.cfg.ai_temperature" :min="0" :max="2" :step="0.1" show-input></el-slider></div></el-form-item>
            <el-form-item label="最大 Token"><el-input-number v-model="app.config.cfg.ai_max_tokens" :min="1" :max="32000" :step="128"></el-input-number></el-form-item>
          </el-form>
        </el-card>

        <el-card shadow="never" class="settings-card">
          <template #header>
            <div class="settings-head">
              <div class="settings-head__title">
                <strong>对象存储配置</strong>
                <span>配置腾讯云 COS 凭证、存储桶、地域和路径前缀。</span>
              </div>
              <el-button :loading="app.config.settings.cosTesting" @click="app.config.testCosConnection">测试连接</el-button>
            </div>
          </template>
          <el-form label-width="120px">
            <el-form-item label="SecretId"><el-input v-model="app.config.cfg.cos_secret_id" type="password" show-password></el-input></el-form-item>
            <el-form-item label="SecretKey"><el-input v-model="app.config.cfg.cos_secret_key" type="password" show-password></el-input></el-form-item>
            <el-form-item label="Bucket"><el-input v-model="app.config.cfg.cos_bucket"></el-input></el-form-item>
            <el-form-item label="Region">
              <el-select v-model="app.config.cfg.cos_region" style="width:100%">
                <el-option v-for="region in app.COS_REGIONS" :key="region" :label="region" :value="region"></el-option>
              </el-select>
            </el-form-item>
            <el-form-item label="路径前缀"><el-input v-model="app.config.cfg.cos_prefix" placeholder="可选，如 images/product"></el-input></el-form-item>
          </el-form>
        </el-card>
      </div>
      <div class="settings-actions">
        <el-button type="primary" :loading="app.config.settings.saving" @click="app.saveSettings">保存设置</el-button>
      </div>
    </div>
  `,
}
