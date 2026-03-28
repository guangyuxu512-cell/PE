// 用途：渲染商品详情双模式编辑 Tab，支持图片列表、源代码、COS 选择和 AI 生成。
const { inject, reactive, computed } = Vue

export default {
  name: 'TabDetail',
  setup() {
    const app = inject('appState')
    const picker = reactive({ show: false, selected: [] })
    const dragState = reactive({ from: -1 })

    const pickerItems = computed(() => app.gallery.galleryFilteredList || [])

    async function openPicker() {
      if (!app.gallery.galleryConfigured) {
        app.openSettings()
        ElementPlus.ElMessage.error('请先配置 COS 凭证')
        return
      }
      picker.selected = []
      picker.show = true
      await app.gallery.loadCosGallery(true)
    }

    function insertSelected() {
      const urls = (app.gallery.gallery.list || [])
        .filter(item => picker.selected.includes(item.key))
        .map(item => item.url)
      if (!urls.length) {
        ElementPlus.ElMessage.warning('请先选择图片')
        return
      }
      app.productData.insertDetailImages(urls)
      picker.show = false
    }

    function previewDetail(index) {
      const images = app.productData.detailImages.filter(Boolean)
      const currentUrl = app.productData.detailImages[index]
      const currentIndex = images.indexOf(currentUrl)
      app.openLightbox(images, currentIndex < 0 ? 0 : currentIndex, '商品详情图')
    }

    async function replaceDetailImage(index) {
      await app.gallery.replaceDetailImage(index)
    }

    function onDragStart(index) {
      dragState.from = index
    }

    function onDrop(index) {
      app.productData.reorderDetailImage(dragState.from, index)
      dragState.from = -1
    }

    return {
      app,
      picker,
      pickerItems,
      openPicker,
      insertSelected,
      previewDetail,
      replaceDetailImage,
      onDragStart,
      onDrop,
    }
  },
  template: `
    <div class="tscr">
      <div class="bb">
        <el-radio-group :model-value="app.productData.detailMode" @change="app.productData.setDetailMode">
          <el-radio-button label="visual">图片列表模式</el-radio-button>
          <el-radio-button label="source">HTML 源码模式</el-radio-button>
        </el-radio-group>
      </div>

      <div class="bb" v-if="app.productData.detailMode === 'visual'">
        <el-button type="primary" plain @click="app.productData.addDetailImage('')">添加图片链接</el-button>
        <el-button @click="openPicker">从存储桶选择</el-button>
        <el-button type="primary" @click="app.ai.generateDetail">AI 生成详情</el-button>
        <span class="muted">支持拖拽排序</span>
      </div>

      <div v-if="app.productData.detailMode === 'visual'" class="detail-list">
        <div
          v-for="(url, index) in app.productData.detailImages"
          :key="index"
          class="detail-item"
          draggable="true"
          @dragstart="onDragStart(index)"
          @dragover.prevent
          @drop.prevent="onDrop(index)"
        >
          <div class="detail-item__preview">
            <image-proxy :src="url" :alt="'详情图 ' + (index + 1)"></image-proxy>
          </div>
          <div>
            <div class="drag-hint">拖拽排序 · 第 {{ index + 1 }} 张</div>
            <el-input
              type="textarea"
              :rows="4"
              :model-value="url"
              placeholder="请输入详情图片 URL"
              @input="value => app.productData.updateDetailImage(index, value)"
            ></el-input>
          </div>
          <div class="detail-item__actions">
            <el-button @click="previewDetail(index)" :disabled="!url">👁 预览</el-button>
            <el-button type="primary" plain @click="replaceDetailImage(index)">换图</el-button>
            <el-button @click="app.productData.moveDetailImage(index, -1)" :disabled="index === 0">上移</el-button>
            <el-button @click="app.productData.moveDetailImage(index, 1)" :disabled="index === app.productData.detailImages.length - 1">下移</el-button>
            <el-button @click="app.gallery.copyUrl(url)" :disabled="!url">复制 URL</el-button>
            <el-button type="danger" plain @click="app.productData.removeDetailImage(index)">删除</el-button>
          </div>
        </div>
        <el-empty v-if="!app.productData.detailImages.length" description="当前详情还没有图片，请添加或从存储桶插入"></el-empty>
      </div>

      <div v-else style="display:flex;flex-direction:column;height:100%">
        <p class="muted" style="margin-bottom:8px">PC 端商品详情 HTML 源码</p>
        <textarea class="jbox" :value="app.productData.html" @input="event => app.productData.updateDetailSource(event.target.value)" style="flex:1;min-height:420px"></textarea>
      </div>

      <el-dialog v-model="picker.show" title="从存储桶选择详情图" width="920">
        <div class="cos-picker__tip">可多选图片，插入后会自动重建详情 HTML。</div>
        <el-table :data="pickerItems" border stripe max-height="460" @selection-change="rows => picker.selected = rows.map(row => row.key)">
          <el-table-column type="selection" width="48"></el-table-column>
          <el-table-column label="预览" width="90" align="center">
            <template #default="{ row }">
              <div class="table-thumb">
                <image-proxy :src="row.url" :alt="row.name"></image-proxy>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="name" label="文件名" min-width="220" show-overflow-tooltip></el-table-column>
          <el-table-column prop="url" label="URL" min-width="320" show-overflow-tooltip></el-table-column>
        </el-table>
        <template #footer>
          <el-button @click="picker.show = false">取消</el-button>
          <el-button type="primary" @click="insertSelected">插入详情</el-button>
        </template>
      </el-dialog>

      <el-dialog v-model="app.ai.detailDialog.show" title="AI 详情建议" width="760">
        <div v-loading="app.ai.detailDialog.loading">
          <el-empty v-if="!app.ai.detailDialog.loading && !app.ai.detailDialog.blocks.length" description="暂无详情建议"></el-empty>
          <el-space v-else direction="vertical" fill style="width:100%">
            <el-card v-for="(block, index) in app.ai.detailDialog.blocks" :key="index" shadow="never">
              <div style="font-size:16px;font-weight:700;margin-bottom:8px">{{ block.title }}</div>
              <div class="muted" style="line-height:1.8;margin-bottom:8px">{{ block.subtitle }}</div>
              <el-tag v-for="(item, itemIndex) in block.highlights || []" :key="itemIndex" style="margin:0 8px 8px 0">
                {{ item }}
              </el-tag>
            </el-card>
          </el-space>
        </div>
        <template #footer>
          <el-button @click="app.ai.detailDialog.show = false">取消</el-button>
          <el-button type="primary" @click="app.ai.applyDetailBlocks">生成详情 HTML</el-button>
        </template>
      </el-dialog>
    </div>
  `,
}
