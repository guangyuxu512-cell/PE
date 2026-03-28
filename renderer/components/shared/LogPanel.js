// 用途：渲染底部日志面板。
const { inject } = Vue

export default {
  name: 'LogPanel',
  setup() {
    const app = inject('appState')
    return { app }
  },
  template: `
    <div class="logs">
      <div v-for="item in app.logger.logs" :key="item.id" class="l">
        [{{ item.t }}] {{ item.s }}
      </div>
    </div>
  `,
}
