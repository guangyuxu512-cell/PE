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
                <template v-if="field.key === 'ItemName'">
                  <div class="title-ai-block">
                    <el-input v-model="app.productData.info[field.key]"></el-input>
                    <div class="title-ai-actions">
                      <el-button type="primary" @click="app.ai.generateTitle" :loading="app.ai.titleState.loading && app.ai.titleState.mode === 'generate'">AI 生成标题</el-button>
                      <el-button @click="app.ai.optimizeTitle" :loading="app.ai.titleState.loading && app.ai.titleState.mode === 'optimize'">AI 优化标题</el-button>
                    </div>

                    <div v-if="app.ai.titleState.mode === 'optimize' && app.ai.titleState.optimizedTitle" class="title-ai-panel">
                      <div class="title-ai-panel__title">优化结果</div>
                      <div class="title-ai-compare">
                        <div class="title-ai-compare__item">
                          <div class="title-ai-compare__label">原标题</div>
                          <div>{{ app.ai.titleState.originalTitle }}</div>
                        </div>
                        <div class="title-ai-compare__item">
                          <div class="title-ai-compare__label">优化后标题</div>
                          <div>{{ app.ai.titleState.optimizedTitle }}</div>
                        </div>
                      </div>
                      <div class="title-ai-actions">
                        <el-button type="primary" @click="app.ai.applyTitleSuggestion(app.ai.titleState.optimizedTitle)">采用</el-button>
                      </div>
                    </div>

                    <div v-if="app.ai.titleState.mode === 'generate' && app.ai.titleState.generatedTitles.length" class="title-ai-panel">
                      <div class="title-ai-panel__title">候选标题</div>
                      <div class="title-ai-list">
                        <div v-for="(item, index) in app.ai.titleState.generatedTitles" :key="index" class="title-ai-list__item">
                          <div class="title-ai-list__text">{{ item }}</div>
                          <el-button type="primary" link @click="app.ai.applyTitleSuggestion(item)">采用</el-button>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>
                <el-input v-else v-model="app.productData.info[field.key]"></el-input>
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </div>

      <el-button type="primary" size="large" @click="app.productData.saveInfo">保存基础信息到数据</el-button>
    </div>
  `,
}
