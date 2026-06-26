// ============================================================================
// main.js — Process principal d'Electron
// ----------------------------------------------------------------------------
// C'est le point d'entrée de l'application de bureau. Electron exécute ce
// fichier dans un environnement Node.js. Son rôle : créer la fenêtre de l'app
// et y charger l'interface web servie par le serveur Express (Smart-Yield).
// La fenêtre se comporte donc comme un mini-navigateur dédié à l'application.
// ============================================================================

// Charge les variables d'environnement définies dans le fichier .env
import "dotenv/config"
// Modules d'Electron : app (cycle de vie), BrowserWindow (fenêtre), shell (ouvrir des liens)
import { app, BrowserWindow, shell } from "electron"
import { fileURLToPath } from "url"
import path from "path"

// En modules ES, __filename et __dirname n'existent pas : on les reconstruit ici
// (utile pour fabriquer des chemins absolus vers preload.js, l'icône, etc.)

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

// On calcule une seule fois l'URL du serveur au démarrage
const SERVER_URL = getServerBaseUrl()
if (!app.isPackaged) {
    console.log(`[Smart-Yield] Chargement depuis ${SERVER_URL} (définir SERVER_URL dans .env pour forcer une autre URL)`)
}

// Référence vers la fenêtre principale (gardée globale pour éviter qu'elle soit
// supprimée par le ramasse-miettes tant que l'app est ouverte)
let mainWindow

// Crée et configure la fenêtre de l'application
async function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        webPreferences: {
            // Conserve la session (cookies de connexion) entre deux ouvertures de l'app
            partition: 'persist:smart-yield-session',
            // Script de pont chargé avant la page web (voir preload.js)
            preload: path.join(__dirname, "preload.js"),
            // Sécurité : la page web n'a PAS un accès direct à Node.js...
            nodeIntegration: false,
            // ...et elle est isolée du code privilégié d'Electron
            contextIsolation: true
        },
        autoHideMenuBar: true,
        title: "Smart-Yield",
        icon: path.join(__dirname, "public/icon.ico")
    })

    // Charge la page de connexion servie par le serveur Express
    mainWindow.loadURL(`${SERVER_URL}/login`)

    // Ouvrir les liens externes dans le navigateur par défaut
    // (les liens vers notre propre serveur restent dans l'app, les autres s'ouvrent dehors)
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (!url.startsWith(SERVER_URL)) {
            shell.openExternal(url)
            return { action: "deny" }
        }
        return { action: "allow" }
    })

    // Gérer les erreurs de connexion au serveur
    // (si le serveur est injoignable, on affiche une page locale « hors ligne »)
    mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription) => {
        mainWindow.loadFile(path.join(__dirname, "public/offline.html"))
    })

    // Quand la fenêtre est fermée, on libère la référence
    mainWindow.on("closed", () => {
        mainWindow = null
    })
}

// Dès qu'Electron est prêt, on ouvre la fenêtre principale
app.whenReady().then(createWindow)

// Toutes les fenêtres fermées : on quitte l'app (sauf sur macOS où l'usage
// veut que l'application reste active dans le dock)
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit()
})

// Sur macOS, cliquer sur l'icône du dock alors qu'aucune fenêtre n'est ouverte
// doit recréer la fenêtre
app.on("activate", async () => {
    if (mainWindow === null) await createWindow()
})