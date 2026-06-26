// ============================================================================
// preload.js — Pont sécurisé entre Electron et la page web
// ----------------------------------------------------------------------------
// Ce script est exécuté par Electron AVANT le chargement de la page web, dans
// un contexte isolé qui a accès à Node.js. Son rôle est d'exposer, de façon
// contrôlée, quelques fonctions « natives » à la page (le front-end), sans lui
// donner un accès complet à Node.js. C'est plus sûr.
// Il est branché via l'option `preload` dans main.js.
// Pour l'instant il reste quasi vide : on l'enrichira au besoin.
// ============================================================================

// contextBridge : expose une API au front-end ; ipcRenderer : envoie/reçoit des
// messages vers le process principal (main.js)
const { contextBridge, ipcRenderer } = require('electron');

// Petit repère dans la console quand la page est prête (vérifie que le preload tourne)
window.addEventListener("DOMContentLoaded", () => {
    console.log("Preload chargé")
})

// Sécurisation : Exposition d'une API contrôlée au rendu (HTML/JS côté client)
// Cela empêche le front-end d'avoir un accès complet à Node.js
contextBridge.exposeInMainWorld('electronAPI', {
    // Vous pourrez ajouter vos appels IPC ici. Exemple :
    // fetchProducts: () => ipcRenderer.invoke('products:fetch'),
    // onStockWarning: (callback) => ipcRenderer.on('stock:warning', (_event, value) => callback(value))
});