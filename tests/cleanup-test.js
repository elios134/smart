/**
 * SMART-YIELD — Nettoyage des données de test (refonte énergie)
 *
 * Supprime toutes les données créées par seed-test.js et les tests.
 *
 * Usage : node tests/cleanup-test.js
 */

import "dotenv/config";
import prisma from "../prisma/prismaClient.js";

async function cleanup() {
    console.log("\n🧹 Nettoyage des données de test\n");

    // Ordre inverse des dépendances
    const seuils = await prisma.seuilEnergie.deleteMany({});
    console.log(`  ✅ SeuilEnergie    → ${seuils.count} supprimé(s)`);

    const ventes = await prisma.venteEnergie.deleteMany({});
    console.log(`  ✅ VenteEnergie    → ${ventes.count} supprimée(s)`);

    const achats = await prisma.achatEnergie.deleteMany({});
    console.log(`  ✅ AchatEnergie    → ${achats.count} supprimé(s)`);

    const sessions = await prisma.sessionEnergie.deleteMany({});
    console.log(`  ✅ SessionEnergie  → ${sessions.count} supprimée(s)`);

    const stocks = await prisma.stockEnergie.deleteMany({});
    console.log(`  ✅ StockEnergie    → ${stocks.count} supprimé(s)`);

    const sources = await prisma.sourceEnergie.deleteMany({});
    console.log(`  ✅ SourceEnergie   → ${sources.count} supprimée(s)`);

    const tiers = await prisma.tiers.deleteMany({});
    console.log(`  ✅ Tiers           → ${tiers.count} supprimé(s)`);

    // Utilisateurs de test
    const users = await prisma.user.deleteMany({
        where: {
            mail: {
                in: [
                    "test-admin@smart.fr",
                    "test-manager@smart.fr",
                    "test-operateur@smart.fr"
                ]
            }
        }
    });
    console.log(`  ✅ Users test      → ${users.count} supprimé(s)`);

    // Employés créés pendant les tests
    const testEmployes = await prisma.user.deleteMany({
        where: { mail: { contains: "test-employe" } }
    });
    console.log(`  ✅ Employés test   → ${testEmployes.count} supprimé(s)`);

    console.log("\n✅ Nettoyage terminé\n");
}

cleanup()
    .catch((e) => { console.error("❌ Erreur cleanup :", e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });