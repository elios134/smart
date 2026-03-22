import { PrismaMariaDb } from '@prisma/adapter-mariadb'

export const adapter = new PrismaMariaDb(
  {
    connectionLimit: 5,
    port: parseInt(process.env.DB_PORT),
    database: process.env.DB_NAME, 
    host: process.env.DB_HOST, 
    password: process.env.DB_PASSWORD,
    user: process.env.DB_USER,
    allowPublicKeyRetrieval: true,
    ssl: false
  },
  { schema: process.env.DB_NAME }
)