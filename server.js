import 'dotenv/config';
import { createServer } from 'http';
import app from './src/app.js';
import { verifierDeclenchements } from './src/services/energieService.js';

const PORT = process.env.PORT;
const server = createServer(app);

server.listen(PORT, () => {
    console.log(`\n✅ Smart-Yield démarré sur le port ${PORT}`);
    console.log(`   → http://localhost:${PORT}/login\n`);
    setInterval(verifierDeclenchements, 60 * 60 * 1000);
    console.log('⚡ Déclenchements automatiques énergie activés (interval 1h)');
});

process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
process.on('SIGINT',  () => { server.close(() => process.exit(0)); });
