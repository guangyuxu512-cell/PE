// 用途：渲染商品主图管理 Tab。
const { inject } = Vue

export default {
  name: 'TabPics',
  setup() {
    const app = inject('appState')
    return { app }
  },
  template: `
    <div class="tscr">
      <div class="bb">
        <el-button type="primary" plain @click="app.productData.openPicDialog('add')">新增</el-button>
        <el-button :disabled="app.productData.picIndex < 0" @click="app.productData.openPicDialog('edit')">编辑</el-button>
        <el-button :disabled="app.productData.picIndex < 0" type="danger" plain @click="app.productData.deletePic">删除</el-button>
        <el-divider direction="vertical"></el-divider>
        <el-button @click="app.gallery.uploadToCos({ askAddToMain: true, refreshGallery: app.tab === 'cos-gallery' })">上传到 COS</el-button>
        <el-button @click="app.openGallery">浏览存储桶图片</el-button>
      </div>
      <el-table
        :data="app.productData.picList"
        border
        stripe
        highlight-current-row
        style="width:100%"
        @current-change="row => app.productData.picIndex = row ? row._i : -1"
        @row-dblclick="() => app.productData.openPicDialog('edit')"
      >
        <el-table-column prop="PicIndex" label="序号" width="70" align="center"></el-table-column>
        <el-table-column prop="Url" label="图片链接" show-overflow-tooltip></el-table-column>
        <el-table-column prop="LocalPath" label="本地路径" width="220" show-overflow-tooltip></el-table-column>
        <el-table-column prop="Keys" label="Keys" width="120"></el-table-column>
        <el-table-column label="预览" width="100" align="center">
          <template #default="{ row }">
            <div style="width:52px;height:52px;margin:0 auto;border-radius:6px;overflow:hidden">
              <image-proxy :src="row.Url" :alt="row.Url"></image-proxy>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>
  `,
}
