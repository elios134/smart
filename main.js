import "dotenv/config"
import { app, BrowserWindow, shell } from "electron"
import { fileURLToPath } from "url"
import path from "path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** Serveur distant par défaut quand l’app est installée (build). */
const DEFAULT_PACKAGED_SERVER = "http://51.91.146.83:3506"

/**
 * URL de l’API / du rendu Twig :
 * - variable d’environnement SERVER_URL si définie ;
 * - sinon, en dev (`electron .` non packagé) : http://127.0.0.1:PORT (PORT depuis .env, défaut 3506) ;
 * - sinon (app packagée) : VPS ci-dessus.
 * Lancer en parallèle : `npm run server` (ou `npm run dev:server`).
 */
function getServerBaseUrl() {
    const fromEnv = process.env.SERVER_URL?.trim()
    if (fromEnv) return fromEnv.replace(/\/$/, "")

    const port = process.env.PORT || "3506"
    if (app.isPackaged) return DEFAULT_PACKAGED_SERVER.replace(/\/$/, "")

    return `http://127.0.0.1:${port}`
}

const SERVER_URL = getServerBaseUrl()
if (!app.isPackaged) {
    console.log(`[Smart-Yield] Chargement depuis ${SERVER_URL} (définir SERVER_URL dans .env pour forcer une autre URL)`)
}

let mainWindow

async function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        webPreferences: {
            partition: 'persist:smart-yield-session',
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: false,
            contextIsolation: true
        },
        autoHideMenuBar: true,
        title: "Smart-Yield",
        icon: path.join(__dirname, "public/icon.ico")
    })

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