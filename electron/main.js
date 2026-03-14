import { app, BrowserWindow, ipcMain, Menu } from "electron"
import { fileURLToPath } from "node:url"
import path from "node:path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const allowedApiOrigins = [
    "http://171.244.63.31:8443",
    "https://171.244.63.31:8443"
]

async function handleApiRequest(_event, request) {
    try {
        const url = typeof request?.url === "string" ? request.url : ""
        const isAllowed = allowedApiOrigins.some((origin) => url.startsWith(origin))
        if (!url || !isAllowed) {
            return {
                ok: false,
                status: 400,
                error: "API URL is not allowed"
            }
        }

        const method = typeof request?.method === "string" ? request.method : "GET"
        const headers = request?.headers && typeof request.headers === "object" ? request.headers : {}
        const body = request?.body

        const response = await fetch(url, {
            method,
            headers,
            body: body === undefined ? undefined : JSON.stringify(body)
        })

        const text = await response.text()
        let data = null

        try {
            data = text ? JSON.parse(text) : null
        } catch {
            data = { raw: text }
        }

        return {
            ok: response.ok,
            status: response.status,
            data
        }
    } catch (error) {
        return {
            ok: false,
            status: 500,
            error: error instanceof Error ? error.message : "Unknown IPC error"
        }
    }
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        autoHideMenuBar: true,
        icon: path.join(__dirname, "logo.png"),
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false
        }
    })

    win.maximize()

    const devServerUrl = process.env.VITE_DEV_SERVER_URL
    if (devServerUrl) {
        win.loadURL(devServerUrl)
        win.webContents.openDevTools({ mode: "detach" })
        return
    }

    const indexHtml = path.join(__dirname, "../dist/index.html")
    win.loadFile(indexHtml)
}

app.whenReady().then(() => {
    ipcMain.handle("api:request", handleApiRequest)
    Menu.setApplicationMenu(null)
    createWindow()
})

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit()
    }
})

app.on("before-quit", () => {
    ipcMain.removeHandler("api:request")
})

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})
