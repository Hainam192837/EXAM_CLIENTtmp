const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("electronAPI", {
    request: (request) => ipcRenderer.invoke("api:request", request),
    onBrowserDetected: (callback) => {
        const channel = "proctor:browser-detected"
        const listener = (_event, payload) => callback(payload)
        ipcRenderer.on(channel, listener)

        return () => {
            ipcRenderer.removeListener(channel, listener)
        }
    }
})
