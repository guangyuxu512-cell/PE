import { COS_HOST_KEYWORDS, PROXY_IMAGE_HOST_KEYWORDS } from '../../constants.js'

const { ref, watch } = Vue

function getHostname(src) {
  try {
    return new URL(src).hostname
  } catch {
    return ''
  }
}

function shouldProxy(src) {
  const hostname = getHostname(src)
  return PROXY_IMAGE_HOST_KEYWORDS.some(keyword => hostname.endsWith(keyword))
}

function isCosImage(src) {
  const hostname = getHostname(src)
  return hostname.includes('.cos.') || COS_HOST_KEYWORDS.some(keyword => hostname.endsWith(keyword))
}

function getProxyApiName(src) {
  return isCosImage(src) ? 'cosProxyImage' : 'proxyImage'
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
    const proxied = ref(false)

    async function loadByProxy(apiName) {
      const result = apiName === 'cosProxyImage'
        ? await window.api.cosProxyImage(props.src)
        : await window.api.proxyImage(props.src)
      currentSrc.value = result?.base64 || ''
      failed.value = !currentSrc.value
      proxied.value = !!currentSrc.value
    }

    async function fallbackToProxy() {
      if (!props.src || loading.value || proxied.value) {
        failed.value = true
        return
      }

      loading.value = true
      failed.value = false
      try {
        await loadByProxy(getProxyApiName(props.src))
      } catch {
        currentSrc.value = ''
        failed.value = true
      }
      loading.value = false
    }

    async function load() {
      if (!props.src) {
        currentSrc.value = ''
        loading.value = false
        failed.value = false
        proxied.value = false
        return
      }

      failed.value = false
      proxied.value = false

      if (shouldProxy(props.src)) {
        loading.value = true
        try {
          await loadByProxy('proxyImage')
        } catch {
          currentSrc.value = ''
          failed.value = true
        }
        loading.value = false
        return
      }

      currentSrc.value = props.src
      loading.value = false
    }

    watch(() => props.src, load, { immediate: true })

    return {
      currentSrc,
      failed,
      loading,
      fallbackToProxy,
    }
  },
  template: `
    <div class="proxy-image" :class="{ 'proxy-image--error': failed }">
      <span v-if="loading">加载中...</span>
      <span v-else-if="failed">预览失败</span>
      <span v-else-if="!currentSrc">暂无图片</span>
      <img v-else :src="currentSrc" :alt="alt" referrerpolicy="no-referrer" @error="fallbackToProxy">
    </div>
  `,
}
