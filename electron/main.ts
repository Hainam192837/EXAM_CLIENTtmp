import { app, BrowserWindow } from "electron"

function createWindow() {

    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        autoHideMenuBar: true
    })

    win.maximize()

    win.loadURL("http://localhost:5173")
    win.webContents.openDevTools({ mode: "detach" })

}

app.whenReady().then(createWindow)