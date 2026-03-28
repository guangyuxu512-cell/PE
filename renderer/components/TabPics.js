// 用途：渲染商品主图管理 Tab。
const { inject } = Vue

export default {
  name: 'TabPics',
  setup() {
    const app = inject('appState')

    function previewPic(row) {
      const images = app.productData.picList.map(item => item.Url).filter(Boolean)
      const currentIndex = images.indexOf(row.Url)
      app.openLightbox(images, currentIndex < 0 ? 0 : currentIndex, '商品主图')
    }

    async function replacePic(row) {
      await app.gallery.replaceMainPic(row._i)
    }

    return { app, previewPic, replacePic }
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
      >
        <el-table-column prop="PicIndex" label="序号" width="70" align="center"></el-table-column>
        <el-table-column prop="Url" label="图片链接" min-width="300" show-overflow-tooltip></el-table-column>
        <el-table-column prop="LocalPath" label="本地路径" min-width="220" show-overflow-tooltip></el-table-column>
        <el-table-column label="预览" width="210" align="center">
          <template #default="{ row }">
            <div class="thumb-cell">
              <div class="thumb-cell__image">
                <image-proxy :src="row.Url" :alt="row.Url"></image-proxy>
              </div>
              <div class="thumb-cell__actions">
                <el-button size="small" @click="previewPic(row)" :disabled="!row.Url">👁 预览</el-button>
                <el-button size="small" type="primary" plain @click="replacePic(row)">本地换图</el-button>
              </div>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>
  `,
}
