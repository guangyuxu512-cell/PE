// 用途：渲染 SKU 管理 Tab。
const { inject } = Vue

export default {
  name: 'TabSkus',
  setup() {
    const app = inject('appState')
    return { app }
  },
  template: `
    <div class="tscr">
      <div class="bb">
        <el-button type="primary" plain @click="app.productData.openSkuDialog('add')">新增</el-button>
        <el-button :disabled="app.productData.skuIndex < 0" @click="app.productData.openSkuDialog('edit')">编辑</el-button>
        <el-button :disabled="app.productData.skuIndex < 0" type="danger" plain @click="app.productData.deleteSku">删除</el-button>
      </div>
      <el-table
        :data="app.productData.skuList"
        border
        stripe
        highlight-current-row
        style="width:100%"
        @current-change="row => app.productData.skuIndex = row ? row._i : -1"
        @row-dblclick="() => app.productData.openSkuDialog('edit')"
      >
        <el-table-column prop="sn" label="规格名" width="100"></el-table-column>
        <el-table-column prop="sv" label="规格值" width="180" show-overflow-tooltip></el-table-column>
        <el-table-column prop="SkuId" label="SkuId" width="120"></el-table-column>
        <el-table-column prop="Price" label="价格" width="80" align="right"></el-table-column>
        <el-table-column prop="PromotionPrice" label="促销价" width="90" align="right"></el-table-column>
        <el-table-column prop="CouponPrice" label="券后价" width="90" align="right"></el-table-column>
        <el-table-column prop="Num" label="库存" width="70" align="right"></el-table-column>
        <el-table-column prop="SkuCode" label="编码" width="120" show-overflow-tooltip></el-table-column>
        <el-table-column prop="Barcode" label="条码" width="120" show-overflow-tooltip></el-table-column>
      </el-table>
    </div>
  `,
}
