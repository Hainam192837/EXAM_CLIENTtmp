import { app, BrowserWindow, dialog, ipcMain, Menu } from "electron"
import { fileURLToPath } from "node:url"
import path from "node:path"
import { autoUpdater } from "electron-updater"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const allowedApiOrigins = [
    "http://171.244.63.31:8443",
    "https://171.244.63.31:8443"
]
const updateFeedUrl = (process.env.EXAM_CLIENT_UPDATE_URL || "").trim()
let mainWindow = null
let updateCheckTimer = null

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
    mainWindow = win
    win.on("closed", () => {
        if (mainWindow === win) {
            mainWindow = null
        }
    })

    const devServerUrl = process.env.VITE_DEV_SERVER_URL
    if (devServerUrl) {
        win.loadURL(devServerUrl)
        win.webContents.openDevTools({ mode: "detach" })
        return
    }

    const indexHtml = path.join(__dirname, "../dist/index.html")
    win.loadFile(indexHtml)
}

function setupAutoUpdater() {
    if (!app.isPackaged) {
        return
    }

    if (!updateFeedUrl) {
        console.log("[updater] EXAM_CLIENT_UPDATE_URL is not configured, auto-update is disabled")
        return
    }

    autoUpdater.setFeedURL({
        provider: "generic",
        url: updateFeedUrl
    })

    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true

    autoUpdater.on("checking-for-update", () => {
        console.log("[updater] checking for updates...")
    })

    autoUpdater.on("update-available", (info) => {
        console.log("[updater] update available:", info?.version)
    })

    autoUpdater.on("update-not-available", () => {
        console.log("[updater] no updates available")
    })

    autoUpdater.on("error", (error) => {
        console.log("[updater] error:", error?.message || error)
    })

    autoUpdater.on("update-downloaded", async (info) => {
        console.log("[updater] update downloaded:", info?.version)
        const result = await dialog.showMessageBox(mainWindow ?? undefined, {
            type: "info",
            title: "Đã có bản cập nhật mới",
            message: "Bản cập nhật đã tải xong. Bạn có muốn cập nhật ngay bây giờ không?",
            detail: "Ứng dụng sẽ tự đóng và mở lại để hoàn tất cập nhật.",
            buttons: ["Cập nhật ngay", "Để sau"],
            defaultId: 0,
            cancelId: 1
        })

        if (result.response === 0) {
            autoUpdater.quitAndInstall()
        }
    })

    const checkForUpdates = async () => {
        try {
            await autoUpdater.checkForUpdates()
        } catch (error) {
            console.log("[updater] check failed:", error instanceof Error ? error.message : error)
        }
    }

    setTimeout(() => {
        void checkForUpdates()
    }, 5000)

    updateCheckTimer = setInterval(() => {
        void checkForUpdates()
    }, 30 * 60 * 1000)
}

app.whenReady().then(() => {
    ipcMain.handle("api:request", handleApiRequest)
    Menu.setApplicationMenu(null)
    createWindow()
    setupAutoUpdater()
})

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit()
    }
})

app.on("before-quit", () => {
    ipcMain.removeHandler("api:request")
    if (updateCheckTimer) {
        clearInterval(updateCheckTimer)
        updateCheckTimer = null
    }
})

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})
