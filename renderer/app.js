// 用途：渲染进程入口，初始化全局状态、注册组件并挂载主应用。
import { COS_REGIONS } from './constants.js'
import { useLogger } from './composables/useLogger.js'
import { useConfig } from './composables/useConfig.js'
import { useProductData } from './composables/useProductData.js'
import { useGallery } from './composables/useGallery.js'
import { useAi } from './composables/useAi.js'

import ImageProxy from './components/shared/ImageProxy.js'
import ImageLightbox from './components/shared/ImageLightbox.js'
import LogPanel from './components/shared/LogPanel.js'
import TabBasicInfo from './components/TabBasicInfo.js'
import TabPics from './components/TabPics.js'
import TabSkus from './components/TabSkus.js'
import TabProps from './components/TabProps.js'
import TabDetail from './components/TabDetail.js'
import TabGallery from './components/TabGallery.js'
import TabJson from './components/TabJson.js'
import TabSettings from './components/TabSettings.js'

const { createApp, ref, reactive, provide, onMounted } = Vue

const RootApp = {
  setup() {
    const tab = ref('basic')
    const logger = useLogger()
    const config = useConfig(logger)
    const productData = useProductData(logger)
    const gallery = useGallery(config, productData, logger, tab)
    const ai = useAi(config, productData, gallery, logger)
    const lightbox = reactive({ show: false, images: [], index: 0, title: '' })

    async function saveSettings() {
      await config.saveCfg(async () => {
        if (tab.value === 'cos-gallery' && gallery.galleryConfigured.value) {
          await gallery.loadCosGallery(true)
        }
      })
    }

    async function openGallery() {
      tab.value = 'cos-gallery'
      await gallery.loadCosGallery(true)
    }

    function openSettings() {
      tab.value = 'settings'
    }

    async function handleTabChange(name) {
      productData.onTabChange(name)
      if (name === 'cos-gallery') await gallery.loadCosGallery(true)
    }

    function openLightbox(images, index = 0, title = '') {
      const validImages = (images || []).filter(Boolean)
      if (!validImages.length) return
      lightbox.images = validImages
      lightbox.index = Math.min(Math.max(index, 0), validImages.length - 1)
      lightbox.title = title
      lightbox.show = true
    }

    function closeLightbox() {
      lightbox.show = false
    }

    function shiftLightbox(step) {
      if (lightbox.images.length < 2) return
      const total = lightbox.images.length
      lightbox.index = (lightbox.index + step + total) % total
    }

    function scrollTabs(step) {
      const wrap = document.querySelector('.main-tabs .el-tabs__nav-wrap')
      if (wrap) wrap.scrollBy({ left: step, behavior: 'smooth' })
    }

    const appState = reactive({
      tab,
      logger,
      config,
      productData,
      gallery,
      ai,
      lightbox,
      COS_REGIONS,
      handleTabChange,
      openGallery,
      openSettings,
      saveSettings,
      openLightbox,
      closeLightbox,
      shiftLightbox,
      scrollTabs,
    })

    provide('appState', appState)

    onMounted(async () => {
      try {
        await config.loadCfg()
      } catch (err) {
        logger.log('加载配置失败：' + err.message)
      }
      productData.newBlank()
    })

    return appState
  },
  template: `
    <div class="wrap">
      <header class="bar">
        <el-button @click="productData.newBlank">新建空白</el-button>
        <el-button @click="productData.importFile">导入文件</el-button>
        <el-button @click="productData.exportFile">导出文件</el-button>
        <el-divider direction="vertical"></el-divider>
        <el-button @click="productData.loadFromJson">从 JSON 加载</el-button>
        <el-button @click="productData.syncToJson">同步到 JSON</el-button>
        <el-divider direction="vertical"></el-divider>
        <el-button type="primary" @click="ai.batchDialog.show = true">AI 批量生成</el-button>
        <span class="sp"></span>
        <el-button @click="openSettings">设置</el-button>
      </header>

      <div class="tabs-toolbar">
        <div class="tabs-toolbar__hint">标签支持水平滚动，当前窗口较窄时可用左右按钮快速切换。</div>
        <div class="tabs-toolbar__actions">
          <el-button @click="scrollTabs(-240)">←</el-button>
          <el-button @click="scrollTabs(240)">→</el-button>
        </div>
      </div>

      <el-tabs v-model="tab" class="main-tabs" @tab-change="handleTabChange">
        <el-tab-pane label="基础信息" name="basic"><tab-basic-info></tab-basic-info></el-tab-pane>
        <el-tab-pane label="商品图片" name="pics"><tab-pics></tab-pics></el-tab-pane>
        <el-tab-pane label="SKU 管理" name="skus"><tab-skus></tab-skus></el-tab-pane>
        <el-tab-pane label="商品属性" name="props"><tab-props></tab-props></el-tab-pane>
        <el-tab-pane label="商品详情" name="detail"><tab-detail></tab-detail></el-tab-pane>
        <el-tab-pane label="存储桶图片" name="cos-gallery"><tab-gallery></tab-gallery></el-tab-pane>
        <el-tab-pane label="JSON" name="json"><tab-json></tab-json></el-tab-pane>
        <el-tab-pane label="系统设置" name="settings"><tab-settings></tab-settings></el-tab-pane>
      </el-tabs>

      <log-panel></log-panel>
      <image-lightbox></image-lightbox>

      <el-dialog v-model="productData.picDialog.show" :title="productData.picDialog.mode === 'add' ? '新增主图' : '编辑主图'" width="520">
        <el-form label-width="100px">
          <el-form-item label="图片链接"><el-input v-model="productData.picDialog.d.Url"></el-input></el-form-item>
          <el-form-item label="本地路径"><el-input v-model="productData.picDialog.d.LocalPath"></el-input></el-form-item>
          <el-form-item label="图片序号"><el-input v-model="productData.picDialog.d.PicIndex"></el-input></el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="productData.picDialog.show = false">取消</el-button>
          <el-button type="primary" @click="productData.savePic">保存</el-button>
        </template>
      </el-dialog>

      <el-dialog v-model="productData.skuDialog.show" :title="productData.skuDialog.mode === 'add' ? '新增 SKU' : '编辑 SKU'" width="560">
        <el-form label-width="100px">
          <el-form-item label="规格名"><el-input v-model="productData.skuDialog.d.sn"></el-input></el-form-item>
          <el-form-item label="规格值"><el-input v-model="productData.skuDialog.d.sv"></el-input></el-form-item>
          <el-form-item label="SKU 编号"><el-input v-model="productData.skuDialog.d.SkuId"></el-input></el-form-item>
          <el-row :gutter="12">
            <el-col :span="8"><el-form-item label="价格" label-width="50px"><el-input v-model.number="productData.skuDialog.d.Price"></el-input></el-form-item></el-col>
            <el-col :span="8"><el-form-item label="促销价" label-width="60px"><el-input v-model.number="productData.skuDialog.d.PromotionPrice"></el-input></el-form-item></el-col>
            <el-col :span="8"><el-form-item label="券后价" label-width="60px"><el-input v-model.number="productData.skuDialog.d.CouponPrice"></el-input></el-form-item></el-col>
          </el-row>
          <el-form-item label="库存"><el-input v-model.number="productData.skuDialog.d.Num"></el-input></el-form-item>
          <el-form-item label="SKU 编码"><el-input v-model="productData.skuDialog.d.SkuCode"></el-input></el-form-item>
          <el-form-item label="条码"><el-input v-model="productData.skuDialog.d.Barcode"></el-input></el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="productData.skuDialog.show = false">取消</el-button>
          <el-button type="primary" @click="productData.saveSku">保存</el-button>
        </template>
      </el-dialog>

      <el-dialog v-model="productData.propDialog.show" :title="productData.propDialog.mode === 'add' ? '新增属性' : '编辑属性'" width="520">
        <el-form label-width="110px">
          <el-form-item label="属性名"><el-input v-model="productData.propDialog.d.Name"></el-input></el-form-item>
          <el-form-item label="属性值"><el-input v-model="productData.propDialog.d.Value"></el-input></el-form-item>
          <el-form-item label="销售属性">
            <el-select v-model="productData.propDialog.d.IsSellPro" style="width:100%">
              <el-option :value="0" label="否"></el-option>
              <el-option :value="1" label="是"></el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="图片链接"><el-input v-model="productData.propDialog.d.PicUrl"></el-input></el-form-item>
          <el-form-item label="别名"><el-input v-model="productData.propDialog.d.Aliasname"></el-input></el-form-item>
          <el-form-item label="PropertyName"><el-input v-model="productData.propDialog.d.PropertyName"></el-input></el-form-item>
          <el-form-item label="PropertyKey"><el-input v-model="productData.propDialog.d.PropertyKey"></el-input></el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="productData.propDialog.show = false">取消</el-button>
          <el-button type="primary" @click="productData.saveProp">保存</el-button>
        </template>
      </el-dialog>

      <el-dialog v-model="ai.batchDialog.show" title="AI 批量生成" width="500">
        <el-form label-width="90px">
          <el-form-item label="生成套数"><el-input-number v-model="ai.batchDialog.n" :min="1" :max="50"></el-input-number></el-form-item>
          <el-form-item label="导出目录">
            <el-input v-model="ai.batchDialog.dir" placeholder="选择一个导出目录">
              <template #append><el-button @click="ai.pickBatchDir">选择</el-button></template>
            </el-input>
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="ai.batchDialog.show = false">取消</el-button>
          <el-button type="primary" :loading="ai.batchDialog.busy" @click="ai.runBatchGenerate">开始生成</el-button>
        </template>
      </el-dialog>
    </div>
  `,
}

const app = createApp(RootApp)

app.component('image-proxy', ImageProxy)
app.component('image-lightbox', ImageLightbox)
app.component('log-panel', LogPanel)
app.component('tab-basic-info', TabBasicInfo)
app.component('tab-pics', TabPics)
app.component('tab-skus', TabSkus)
app.component('tab-props', TabProps)
app.component('tab-detail', TabDetail)
app.component('tab-gallery', TabGallery)
app.component('tab-json', TabJson)
app.component('tab-settings', TabSettings)

app.use(ElementPlus)
app.mount('#app')
