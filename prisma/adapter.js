import { PrismaMariaDb } from '@prisma/adapter-mariadb'

// Activer le chiffrement TLS de la connexion DB en production : DB_SSL=true dans .env.
// Indispensable dès que la base n'est pas en localhost (sinon mot de passe en clair sur le réseau).
const useSsl = process.env.DB_SSL === "true";

export const adapter = new PrismaMariaDb(
  {
    connectionLimit: 5,
    port: parseInt(process.env.DB_PORT),
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    password: process.env.DB_PASSWORD,
    user: process.env.DB_USER,
    // allowPublicKeyRetrieval n'est utile/sûr qu'en local sans TLS ; on le désactive dès que TLS est actif
    allowPublicKeyRetrieval: !useSsl,
    ssl: useSsl
  },
  { schema: process.env.DB_NAME }
)