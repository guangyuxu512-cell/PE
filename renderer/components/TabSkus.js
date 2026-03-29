const { inject } = Vue

export default {
  name: 'TabSkus',
  setup() {
    const app = inject('appState')

    function previewSku(row) {
      const items = app.productData.skuList.filter(item => item.imageUrl)
      const currentIndex = items.findIndex(item => item._i === row._i)
      app.openLightbox(items.map(item => item.imageUrl), currentIndex < 0 ? 0 : currentIndex, 'SKU 图片')
    }

    async function replaceSku(row) {
      await app.gallery.replaceSkuImage(row._i)
    }

    return { app, previewSku, replaceSku }
  },
  template: `
    <div class="tscr">
      <div class="bb">
        <el-button type="primary" plain @click="app.productData.openSkuDialog('add')">新增</el-button>
        <el-button :disabled="app.productData.skuIndex < 0" @click="app.productData.openSkuDialog('edit')">编辑</el-button>
        <el-button :disabled="app.productData.skuIndex < 0" type="danger" plain @click="app.productData.deleteSku">删除</el-button>
        <el-divider direction="vertical"></el-divider>
        <el-button :disabled="!app.productData.selectedSkuIndexes.length" @click="app.ai.optimizeSkuNames">AI 优化 SKU 名称</el-button>
        <el-button @click="app.ai.fillSkuCodes">AI 批量补全</el-button>
      </div>
      <el-table
        :data="app.productData.skuList"
        border
        stripe
        highlight-current-row
        style="width:100%"
        @current-change="row => app.productData.skuIndex = row ? row._i : -1"
        @selection-change="app.productData.setSkuSelection"
      >
        <el-table-column type="selection" width="48"></el-table-column>
        <el-table-column prop="sn" label="规格名" width="120"></el-table-column>
        <el-table-column prop="sv" label="规格值" min-width="180" show-overflow-tooltip></el-table-column>
        <el-table-column label="SKU图片" width="210" align="center">
          <template #default="{ row }">
            <div class="thumb-cell">
              <div class="thumb-cell__image">
                <image-proxy :src="row.imageUrl" :alt="row.sv"></image-proxy>
              </div>
              <div class="thumb-cell__actions">
                <el-button size="small" @click="previewSku(row)" :disabled="!row.imageUrl">预览</el-button>
                <el-button size="small" type="primary" plain @click="replaceSku(row)">换图</el-button>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="SkuId" label="SkuId" width="120"></el-table-column>
        <el-table-column prop="Price" label="价格" width="80" align="right"></el-table-column>
        <el-table-column prop="PromotionPrice" label="促销价" width="90" align="right"></el-table-column>
        <el-table-column prop="CouponPrice" label="券后价" width="90" align="right"></el-table-column>
        <el-table-column prop="Num" label="库存" width="70" align="right"></el-table-column>
        <el-table-column prop="SkuCode" label="编码" width="120" show-overflow-tooltip></el-table-column>
        <el-table-column prop="Barcode" label="条码" width="120" show-overflow-tooltip></el-table-column>
      </el-table>

      <el-dialog v-model="app.ai.skuNameDialog.show" title="AI SKU 名称建议" width="620">
        <div v-loading="app.ai.skuNameDialog.loading">
          <el-empty v-if="!app.ai.skuNameDialog.loading && !app.ai.skuNameDialog.suggestions.length" description="暂无 SKU 建议"></el-empty>
          <el-space direction="vertical" fill style="width:100%" v-else>
            <el-card v-for="item in app.ai.skuNameDialog.suggestions" :key="item.index" shadow="never">
              <div style="display:flex;gap:12px;align-items:flex-start">
                <el-checkbox v-model="item.checked"></el-checkbox>
                <div style="flex:1">
                  <div class="muted">原规格值：{{ item.original }}</div>
                  <div style="margin-top:6px;font-weight:600">{{ item.value }}</div>
                </div>
              </div>
            </el-card>
          </el-space>
        </div>
        <template #footer>
          <el-button @click="app.ai.skuNameDialog.show = false">取消</el-button>
          <el-button type="primary" @click="app.ai.applyCheckedSkuNames">批量应用</el-button>
        </template>
      </el-dialog>

      <el-dialog v-model="app.ai.skuCodeDialog.show" title="AI SKU 编码补全建议" width="620">
        <div v-loading="app.ai.skuCodeDialog.loading">
          <el-empty v-if="!app.ai.skuCodeDialog.loading && !app.ai.skuCodeDialog.suggestions.length" description="暂无编码建议"></el-empty>
          <el-space direction="vertical" fill style="width:100%" v-else>
            <el-card v-for="item in app.ai.skuCodeDialog.suggestions" :key="item.index" shadow="never">
              <div style="display:flex;gap:12px;align-items:flex-start">
                <el-checkbox v-model="item.checked"></el-checkbox>
                <div style="flex:1">
                  <div style="font-weight:600">{{ item.name }}</div>
                  <div class="muted" style="margin-top:6px">SkuCode: {{ item.SkuCode || '无建议' }}</div>
                  <div class="muted">Barcode: {{ item.Barcode || '无建议' }}</div>
                </div>
              </div>
            </el-card>
          </el-space>
        </div>
        <template #footer>
          <el-button @click="app.ai.skuCodeDialog.show = false">取消</el-button>
          <el-button type="primary" @click="app.ai.applySkuCodeSuggestions">批量应用</el-button>
        </template>
      </el-dialog>
    </div>
  `,
}
