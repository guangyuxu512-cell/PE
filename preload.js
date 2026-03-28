const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  openFile:   ()  => ipcRenderer.invoke('open-file'),
  saveFile:   t   => ipcRenderer.invoke('save-file', t),
  pickImages: ()  => ipcRenderer.invoke('pick-images'),
  pickDir:    ()  => ipcRenderer.invoke('pick-dir'),
  cfgLoad:    ()  => ipcRenderer.invoke('cfg-load'),
  cfgSave:    c   => ipcRenderer.invoke('cfg-save', c),
  cosUpload:  d   => ipcRenderer.invoke('cos-upload', d),
  cosList:    c   => ipcRenderer.invoke('cos-list', c),
  aiGen:      d   => ipcRenderer.invoke('ai-gen', d),
  batchExport:d   => ipcRenderer.invoke('batch-export', d),
})