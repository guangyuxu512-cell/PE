// 用途：向渲染进程暴露受控的 Electron IPC 能力。
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  openFile: () => ipcRenderer.invoke('open-file'),
  saveFile: text => ipcRenderer.invoke('save-file', text),
  pickImages: () => ipcRenderer.invoke('pick-images'),
  pickDir: () => ipcRenderer.invoke('pick-dir'),
  copyText: text => ipcRenderer.invoke('copy-text', text),
  cfgLoad: () => ipcRenderer.invoke('cfg-load'),
  cfgSave: cfg => ipcRenderer.invoke('cfg-save', cfg),
  cosUpload: data => ipcRenderer.invoke('cos-upload', data),
  cosList: cfg => ipcRenderer.invoke('cos-list', cfg),
  cosTest: cfg => ipcRenderer.invoke('cos-test', cfg),
  cosDelete: data => ipcRenderer.invoke('cos-delete', data),
  proxyImage: url => ipcRenderer.invoke('proxy-image', url),
  cosProxyImage: url => ipcRenderer.invoke('cos-proxy-image', url),
  aiGen: data => ipcRenderer.invoke('ai-gen', data),
  aiTest: cfg => ipcRenderer.invoke('ai-test', cfg),
  aiDescribeImage: data => ipcRenderer.invoke('ai-describe-image', data),
  aiGenerateDetail: data => ipcRenderer.invoke('ai-generate-detail', data),
  aiOptimizeTitle: data => ipcRenderer.invoke('ai-optimize-title', data),
  aiFillProps: data => ipcRenderer.invoke('ai-fill-props', data),
  batchExport: data => ipcRenderer.invoke('batch-export', data),
})
