// Ce fichier sert de pont sécurisé entre Electron et le contenu web
// Pour l'instant il peut rester vide, il est déclaré dans main.js
// Tu pourras y ajouter des fonctionnalités natives plus tard si besoin
const { contextBridge, ipcRenderer } = require('electron');

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