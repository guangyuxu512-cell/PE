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
  aiGen: data => ipcRenderer.invoke('ai-gen', data),
  aiTest: cfg => ipcRenderer.invoke('ai-test', cfg),
  batchExport: data => ipcRenderer.invoke('batch-export', data),
})
