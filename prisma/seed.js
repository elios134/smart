import "dotenv/config";
import crypto from "crypto";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/index.js";

const adapter = new PrismaMariaDb(
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
);

const prisma = new PrismaClient({ adapter });

async function main() {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const setupToken = await prisma.setupToken.create({
        data: { token, expiresAt }
    });

    console.log("\n✅ Token de setup créé avec succès !");
    console.log("──────────────────────────────────────────────");
    console.log(`🔗 URL d'accès : http://localhost:3000/setup/${setupToken.token}`);
    console.log(`⏳ Expire le  : ${expiresAt.toLocaleString("fr-FR")}`);
    console.log("──────────────────────────────────────────────\n");
}

main()
    .catch((e) => {
        console.error("❌ Erreur seed :", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });