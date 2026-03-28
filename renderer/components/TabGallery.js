// 用途：渲染存储桶图片管理 Tab。
const { inject } = Vue

export default {
  name: 'TabGallery',
  setup() {
    const app = inject('appState')
    return { app }
  },
  template: `
    <div class="tscr">
      <div class="gallery-wrap" v-if="app.gallery.galleryConfigured">
        <div class="gallery-toolbar">
          <div class="gallery-toolbar__group">
            <el-button :loading="app.gallery.gallery.loading" @click="app.gallery.loadCosGallery()">刷新</el-button>
            <el-button type="primary" plain :loading="app.gallery.gallery.uploading" @click="app.gallery.uploadToCos({ refreshGallery: true })">上传图片</el-button>
            <el-button type="danger" plain :disabled="!app.gallery.gallery.selKeys.length" :loading="app.gallery.gallery.deleting" @click="app.gallery.deleteSelectedCos">删除选中</el-button>
            <el-button :disabled="!app.gallery.gallery.selKeys.length" @click="app.gallery.addSelectedCosPics">添加为商品主图</el-button>
          </div>
          <div class="gallery-toolbar__stats">{{ app.gallery.galleryStatsText }}</div>
          <span class="sp"></span>
          <el-input v-model="app.gallery.gallery.keyword" clearable placeholder="按文件名搜索" style="width:240px"></el-input>
          <el-radio-group v-model="app.gallery.gallery.view">
            <el-radio-button label="grid">网格模式</el-radio-button>
            <el-radio-button label="table">列表模式</el-radio-button>
          </el-radio-group>
          <el-tag class="gallery-count-tag" type="info">当前显示 {{ app.gallery.galleryFilteredList.length }} 张</el-tag>
        </div>

        <div class="gallery-empty" v-if="!app.gallery.gallery.loading && !app.gallery.gallery.list.length">
          <el-empty description="当前存储桶暂无图片"></el-empty>
        </div>

        <div v-loading="app.gallery.gallery.loading" v-else-if="app.gallery.gallery.view === 'grid'" class="gallery-grid">
          <div v-for="item in app.gallery.galleryFilteredList" :key="item.key" class="gallery-card">
            <div class="gallery-card__image" @click="app.gallery.openPreview(item)">
              <image-proxy :src="item.url" :alt="item.name"></image-proxy>
            </div>
            <div class="gallery-card__body">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px">
                <el-checkbox :model-value="app.gallery.isGallerySelected(item.key)" @change="checked => app.gallery.toggleGallerySelection(item.key, checked)"></el-checkbox>
                <span style="color:#909399;font-size:12px">{{ app.gallery.formatBytes(item.size) }}</span>
              </div>
              <div class="gallery-card__title" :title="item.name">{{ item.name }}</div>
              <div class="gallery-card__meta">
                <span>{{ item.lastModified || '-' }}</span>
                <span>{{ item.key.split('/').length > 1 ? item.key.split('/').slice(0, -1).join('/') : '根目录' }}</span>
              </div>
              <div class="gallery-card__actions">
                <el-button link type="primary" @click="app.gallery.copyUrl(item.url)">复制 URL</el-button>
                <el-button link @click="app.gallery.addSingleCosPic(item)">设为主图</el-button>
              </div>
            </div>
          </div>
        </div>

        <el-table
          v-else
          :data="app.gallery.galleryFilteredList"
          border
          stripe
          row-key="key"
          @selection-change="app.gallery.onGalleryTableSelection"
          @row-dblclick="app.gallery.openPreview"
        >
          <el-table-column type="selection" width="48" reserve-selection></el-table-column>
          <el-table-column label="缩略图" width="90" align="center">
            <template #default="{ row }">
              <div style="width:52px;height:52px;border-radius:6px;overflow:hidden;margin:0 auto">
                <image-proxy :src="row.url" :alt="row.name"></image-proxy>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="name" label="文件名" min-width="220" show-overflow-tooltip></el-table-column>
          <el-table-column label="URL" min-width="320">
            <template #default="{ row }">
              <div class="table-url">
                <span class="table-url__text" :title="row.url">{{ row.url }}</span>
                <el-button link type="primary" @click="app.gallery.copyUrl(row.url)">复制</el-button>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="大小" width="100" align="right">
            <template #default="{ row }">{{ app.gallery.formatBytes(row.size) }}</template>
          </el-table-column>
          <el-table-column prop="lastModified" label="上传时间" width="180"></el-table-column>
          <el-table-column label="操作" width="120" align="center">
            <template #default="{ row }">
              <el-button link type="primary" @click="app.gallery.addSingleCosPic(row)">设为主图</el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-dialog v-model="app.gallery.gallery.preview.show" :title="app.gallery.gallery.preview.name || '图片预览'" width="880" class="preview-dialog">
          <image-proxy :src="app.gallery.gallery.preview.url" :alt="app.gallery.gallery.preview.name"></image-proxy>
        </el-dialog>
      </div>

      <div v-else class="gallery-empty">
        <el-empty description="尚未配置 COS 凭证，请先前往系统设置完成配置">
          <template #extra>
            <el-button type="primary" @click="app.openSettings">前往系统设置</el-button>
          </template>
        </el-empty>
      </div>
    </div>
  `,
}
