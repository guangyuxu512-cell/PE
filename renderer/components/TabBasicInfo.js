// 用途：渲染商品基础信息 Tab，并提供 AI 标题优化入口。
const { inject } = Vue

export default {
  name: 'TabBasicInfo',
  setup() {
    const app = inject('appState')
    return { app }
  },
  template: `
    <div class="tscr">
      <div v-for="group in app.productData.FG" :key="group.name" class="card">
        <div class="card-t">{{ group.name }}</div>
        <el-form label-width="100px">
          <el-row :gutter="20">
            <el-col :span="12" v-for="field in group.fields" :key="field.key">
              <el-form-item :label="field.label" style="margin-bottom:10px">
                <el-input v-if="field.key === 'ItemName'" v-model="app.productData.info[field.key]">
                  <template #append>
                    <el-button @click="app.ai.optimizeTitle">AI 优化</el-button>
                  </template>
                </el-input>
                <el-input v-else v-model="app.productData.info[field.key]"></el-input>
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </div>
      <el-button type="primary" size="large" @click="app.productData.saveInfo">保存基础信息到数据</el-button>

      <el-dialog v-model="app.ai.titleDialog.show" title="AI 标题优化建议" width="560">
        <div v-loading="app.ai.titleDialog.loading">
          <el-empty v-if="!app.ai.titleDialog.loading && !app.ai.titleDialog.suggestions.length" description="暂无标题建议"></el-empty>
          <el-space direction="vertical" fill style="width:100%" v-else>
            <el-card v-for="(item, index) in app.ai.titleDialog.suggestions" :key="index" shadow="never">
              <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start">
                <div style="line-height:1.8">{{ item }}</div>
                <el-button type="primary" @click="app.ai.applyTitleSuggestion(item)">应用</el-button>
              </div>
            </el-card>
          </el-space>
        </div>
      </el-dialog>
    </div>
  `,
}
