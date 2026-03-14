const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("electronAPI", {
    request: (request) => ipcRenderer.invoke("api:request", request)
})
