import "dotenv/config"
import { app, BrowserWindow, shell } from "electron"
import { fileURLToPath } from "url"
import path from "path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ── URL du serveur (VPS) ──────────────────────────────
// En production : https://smartyield.tondomaine.fr

const SERVER_URL ="http://51.91.146.83:3506";

let mainWindow

async function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: false,
            contextIsolation: true
        },
        autoHideMenuBar: true,
        title: "Smart-Yield",
        icon: path.join(__dirname, "public/icon.ico")
    })

    // Charger l'app depuis le VPS
    mainWindow.loadURL(`${SERVER_URL}/login`)

    // Ouvrir les liens externes dans le navigateur par défaut
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (!url.startsWith(SERVER_URL)) {
            shell.openExternal(url)
            return { action: "deny" }
        }
        return { action: "allow" }
    })

    // Gérer les erreurs de connexion au serveur
    mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription) => {
        mainWindow.loadFile(path.join(__dirname, "public/offline.html"))
    })

    mainWindow.on("closed", () => {
        mainWindow = null
    })
}

app.whenReady().then(createWindow)

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit()
})

app.on("activate", async () => {
    if (mainWindow === null) await createWindow()
})