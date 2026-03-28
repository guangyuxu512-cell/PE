// 用途：渲染 JSON 源码查看与编辑 Tab。
const { inject } = Vue

export default {
  name: 'TabJson',
  setup() {
    const app = inject('appState')
    return { app }
  },
  template: `
    <div class="tscr" style="display:flex;flex-direction:column;height:100%">
      <textarea class="jbox" v-model="app.productData.json" style="flex:1;min-height:420px"></textarea>
    </div>
  `,
}
