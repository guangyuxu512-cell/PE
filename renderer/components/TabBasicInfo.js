// 用途：渲染商品基础信息 Tab。
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
                <el-input v-model="app.productData.info[field.key]"></el-input>
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </div>
      <span style="display:none">AI 优化</span>
      <el-button type="primary" size="large" @click="app.productData.saveInfo">保存基础信息到数据</el-button>
    </div>
  `,
}
