import "dotenv/config"
import { app, BrowserWindow } from "electron"
import { createServer } from "http"
import { fileURLToPath } from "url"
import path from "path"
import expressApp from "./src/app.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = process.env.PORT || 3000
let mainWindow
let server

async function startServer() {
    return new Promise((resolve) => {
        server = createServer(expressApp)
        server.listen(PORT, () => {
            console.log(`Serveur Express lancé sur le port ${PORT}`)
            resolve()
        })
    })
}

async function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: false,
            contextIsolation: true
        },
        autoHideMenuBar: true,
        title: "Smart-Yield"
    })

    mainWindow.loadURL(`http://localhost:${PORT}/login`)

    mainWindow.on("closed", () => {
        mainWindow = null
    })
}

app.whenReady().then(async () => {
    await startServer()
    await createWindow()
})

// Fermer proprement le serveur Express quand Electron quitte
app.on("before-quit", () => {
    if (server) server.close()
})

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit()
})

app.on("activate", async () => {
    if (mainWindow === null) await createWindow()
})