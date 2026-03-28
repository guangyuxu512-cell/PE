// 用途：提供全局复用的图片灯箱，支持左右切换与 ESC 关闭。
const { inject, computed, onMounted, onBeforeUnmount } = Vue

export default {
  name: 'ImageLightbox',
  setup() {
    const app = inject('appState')

    const currentImage = computed(() => app.lightbox.images[app.lightbox.index] || '')

    function onKeydown(event) {
      if (!app.lightbox.show) return
      if (event.key === 'Escape') app.closeLightbox()
      if (event.key === 'ArrowLeft') app.shiftLightbox(-1)
      if (event.key === 'ArrowRight') app.shiftLightbox(1)
    }

    onMounted(() => window.addEventListener('keydown', onKeydown))
    onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

    return {
      app,
      currentImage,
    }
  },
  template: `
    <div v-if="app.lightbox.show" class="lightbox" @click.self="app.closeLightbox">
      <button class="lightbox__close" @click="app.closeLightbox">关闭</button>
      <button class="lightbox__nav" :disabled="app.lightbox.images.length < 2" @click.stop="app.shiftLightbox(-1)">‹</button>
      <div class="lightbox__content">
        <div class="lightbox__head">
          <div class="lightbox__title">{{ app.lightbox.title || '图片预览' }}</div>
          <div class="lightbox__counter">{{ app.lightbox.index + 1 }} / {{ app.lightbox.images.length }}</div>
        </div>
        <div class="lightbox__body">
          <image-proxy :src="currentImage" :alt="app.lightbox.title || '图片预览'"></image-proxy>
        </div>
      </div>
      <button class="lightbox__nav" :disabled="app.lightbox.images.length < 2" @click.stop="app.shiftLightbox(1)">›</button>
    </div>
  `,
}
