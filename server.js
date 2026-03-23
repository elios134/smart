/**
 * SMART-YIELD — Démarrage serveur (VPS)
 * 
 * Lance Express + Prisma sans Electron.
 * Usage : node server.js
 * 
 * Avec PM2 (recommandé) :
 *   pm2 start server.js --name smart-yield
 *   pm2 save
 *   pm2 startup
 */

import "dotenv/config";
import { createServer } from "http";
import app from "./src/app.js";

const PORT = process.env.DB_PORT;

const server = createServer(app);

server.listen(PORT, () => {
    console.log(`\n✅ Smart-Yield démarré sur le port ${PORT}`);
    console.log(`   → http://localhost:${PORT}/login\n`);
});

// Arrêt propre
process.on("SIGTERM", () => {
    console.log("\n🛑 Arrêt du serveur...");
    server.close(() => process.exit(0));
});

process.on("SIGINT", () => {
    console.log("\n🛑 Arrêt du serveur...");
    server.close(() => process.exit(0));
});
