// ============================================================================
// server.js — Démarrage du serveur Express
// ----------------------------------------------------------------------------
// Ce fichier est le point d'entrée du serveur web. Il prend l'application
// Express configurée (src/app.js), la met en écoute sur un port, et lance la
// tâche périodique de surveillance de l'énergie. C'est ce qu'on exécute avec
// `npm run server`.
// ============================================================================

import 'dotenv/config';                 // Charge les variables du fichier .env
import { createServer } from 'http';    // Serveur HTTP natif de Node.js
import app from './src/app.js';         // L'application Express (routes + middlewares)
import { verifierDeclenchements } from './src/services/energieService.js';

// Port d'écoute, défini dans .env
const PORT = process.env.PORT;
// On enveloppe l'app Express dans un serveur HTTP
const server = createServer(app);

// Mise en écoute : le serveur accepte désormais les requêtes
server.listen(PORT, () => {
    console.log(`\n✅ Smart-Yield démarré sur le port ${PORT}`);
    console.log(`   → http://localhost:${PORT}/login\n`);
    // Tâche planifiée : vérifie les déclenchements énergie une fois par heure (3 600 000 ms)
    setInterval(verifierDeclenchements, 60 * 60 * 1000);
    console.log('⚡ Déclenchements automatiques énergie activés (interval 1h)');
});

// Arrêt propre : à la réception d'un signal d'arrêt (Ctrl+C ou fin de process),
// on ferme le serveur avant de quitter
process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
process.on('SIGINT',  () => { server.close(() => process.exit(0)); });
