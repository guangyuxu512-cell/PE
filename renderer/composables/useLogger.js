// 用途：封装底部日志面板状态和滚动行为。
import { now } from '../constants.js'

const { ref, nextTick } = Vue

export function useLogger() {
  const logs = ref([])
  const logEl = ref(null)
  let logId = 0

  function log(message) {
    logs.value.push({ id: ++logId, t: now(), s: message })
    nextTick(() => {
      if (logEl.value) logEl.value.scrollTop = logEl.value.scrollHeight
    })
  }

  return {
    logs,
    logEl,
    log,
  }
}
