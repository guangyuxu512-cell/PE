// 用途：渲染商品属性 Tab，并提供 AI 补全属性入口。
const { inject } = Vue

export default {
  name: 'TabProps',
  setup() {
    const app = inject('appState')

    function previewProp(row) {
      if (!row.PicUrl) return
      app.openLightbox([row.PicUrl], 0, '属性图片')
    }

    async function replaceProp(row) {
      await app.gallery.replacePropImage(row._i)
    }

    return { app, previewProp, replaceProp }
  },
  template: `
    <div class="tscr">
      <div class="bb">
        <el-button type="primary" plain @click="app.productData.openPropDialog('add')">新增</el-button>
        <el-button :disabled="app.productData.propIndex < 0" @click="app.productData.openPropDialog('edit')">编辑</el-button>
        <el-button :disabled="app.productData.propIndex < 0" type="danger" plain @click="app.productData.deleteProp">删除</el-button>
        <el-divider direction="vertical"></el-divider>
        <el-button type="primary" plain @click="app.ai.fillProps">AI 补全属性</el-button>
      </div>
      <el-table
        :data="app.productData.propList"
        border
        stripe
        highlight-current-row
        style="width:100%"
        @current-change="row => app.productData.propIndex = row ? row._i : -1"
      >
        <el-table-column prop="Name" label="属性名" width="120"></el-table-column>
        <el-table-column prop="Value" label="属性值" width="220" show-overflow-tooltip></el-table-column>
        <el-table-column label="销售属性" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.IsSellPro == 1 ? 'success' : 'info'" size="small">
              {{ row.IsSellPro == 1 ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="PicUrl" label="图片链接" min-width="220" show-overflow-tooltip></el-table-column>
        <el-table-column prop="Aliasname" label="别名" width="120"></el-table-column>
        <el-table-column label="图片" width="180" align="center">
          <template #default="{ row }">
            <div class="thumb-cell thumb-cell--compact">
              <div class="thumb-cell__image">
                <image-proxy :src="row.PicUrl" :alt="row.Value"></image-proxy>
              </div>
              <div class="thumb-cell__actions">
                <el-button size="small" @click="previewProp(row)" :disabled="!row.PicUrl">👁</el-button>
                <el-button size="small" type="primary" plain @click="replaceProp(row)">换图</el-button>
              </div>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <el-dialog v-model="app.ai.propsDialog.show" title="AI 属性补全建议" width="620">
        <div v-loading="app.ai.propsDialog.loading">
          <el-empty v-if="!app.ai.propsDialog.loading && !app.ai.propsDialog.suggestions.length" description="暂无属性建议"></el-empty>
          <el-scrollbar v-else max-height="420px">
            <el-space direction="vertical" fill style="width:100%">
              <el-card v-for="(item, index) in app.ai.propsDialog.suggestions" :key="index" shadow="never">
                <div style="display:flex;align-items:center;gap:12px">
                  <el-checkbox v-model="item.checked"></el-checkbox>
                  <div>
                    <div style="font-weight:600">{{ item.Name }}</div>
                    <div class="muted" style="margin-top:4px">{{ item.Value }}</div>
                  </div>
                </div>
              </el-card>
            </el-space>
          </el-scrollbar>
        </div>
        <template #footer>
          <el-button @click="app.ai.propsDialog.show = false">取消</el-button>
          <el-button type="primary" @click="app.ai.applyCheckedProps">批量添加</el-button>
        </template>
      </el-dialog>
    </div>
  `,
}
