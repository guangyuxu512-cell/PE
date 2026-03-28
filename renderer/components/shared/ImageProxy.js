// 用途：针对防盗链图片提供代理预览组件，并处理加载状态和失败占位。
import { PROXY_IMAGE_HOST_KEYWORDS } from '../../constants.js'

const { ref, watch } = Vue

function shouldProxy(src) {
  try {
    const hostname = new URL(src).hostname
    return PROXY_IMAGE_HOST_KEYWORDS.some(keyword => hostname.endsWith(keyword))
  } catch {
    return false
  }
}

export default {
  name: 'ImageProxy',
  props: {
    src: { type: String, default: '' },
    alt: { type: String, default: '' },
  },
  setup(props) {
    const currentSrc = ref('')
    const loading = ref(false)
    const failed = ref(false)

    async function load() {
      if (!props.src) {
        currentSrc.value = ''
        failed.value = false
        return
      }

      loading.value = true
      failed.value = false
      try {
        if (shouldProxy(props.src)) {
          const result = await window.api.proxyImage(props.src)
          currentSrc.value = result?.base64 || ''
          failed.value = !currentSrc.value
        } else {
          currentSrc.value = props.src
        }
      } catch {
        currentSrc.value = ''
        failed.value = true
      }
      loading.value = false
    }

    watch(() => props.src, load, { immediate: true })

    return {
      currentSrc,
      failed,
      loading,
    }
  },
  template: `
    <div class="proxy-image" :class="{ 'proxy-image--error': failed }">
      <span v-if="loading">加载中...</span>
      <span v-else-if="failed">预览失败</span>
      <span v-else-if="!currentSrc">暂无图片</span>
      <img v-else :src="currentSrc" :alt="alt" referrerpolicy="no-referrer">
    </div>
  `,
}
