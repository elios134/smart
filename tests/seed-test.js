/**
 * SMART-YIELD — Seed de test (refonte énergie)
 *
 * Crée les données nécessaires pour les tests :
 * - 1 SUPER_ADMIN (test-admin@smart.fr / Test1234!)
 * - 1 ADMIN       (test-manager@smart.fr / Test1234!)
 * - 1 OPERATEUR   (test-operateur@smart.fr / Test1234!)
 * - 2 Sources énergie (EOLIEN, SOLAIRE)
 * - 1 Stock énergie
 * - 1 Tiers FOURNISSEUR + 1 Tiers CLIENT
 * - 1 Session énergie EN_ATTENTE
 * - 1 Seuil énergie
 * - 1 Achat énergie
 * - 1 Vente énergie
 *
 * Usage : node tests/seed-test.js
 */

import "dotenv/config";
import bcrypt from "bcryptjs";
import prisma from "../prisma/prismaClient.js";

const PASSWORD = "Test1234!";

async function seedTest() {
    console.log("\n🧪 Seed de test — Smart-Yield Énergie\n");

    const hash = await bcrypt.hash(PASSWORD, 10);

    // ── Utilisateurs ──────────────────────────────────────────
    const superAdmin = await prisma.user.upsert({
        where:  { mail: "test-admin@smart.fr" },
        update: { password: hash },
        create: {
            mail: "test-admin@smart.fr", password: hash,
            firstName: "Super", lastName: "Admin",
            role: "SUPER_ADMIN", siret: "00000000000001",
            socialReason: "Smart-Yield Test"
        }
    });
    console.log(`  ✅ SUPER_ADMIN  → ${superAdmin.mail} (id: ${superAdmin.id})`);

    const admin = await prisma.user.upsert({
        where:  { mail: "test-manager@smart.fr" },
        update: { password: hash, employeurId: superAdmin.id },
        create: {
            mail: "test-manager@smart.fr", password: hash,
            firstName: "Admin", lastName: "Manager",
            role: "ADMIN", employeurId: superAdmin.id
        }
    });
    console.log(`  ✅ ADMIN        → ${admin.mail} (id: ${admin.id})`);

    const operateur = await prisma.user.upsert({
        where:  { mail: "test-operateur@smart.fr" },
        update: { password: hash, employeurId: superAdmin.id },
        create: {
            mail: "test-operateur@smart.fr", password: hash,
            firstName: "Jean", lastName: "Operateur",
            role: "OPERATEUR", employeurId: superAdmin.id
        }
    });
    console.log(`  ✅ OPERATEUR    → ${operateur.mail} (id: ${operateur.id})`);

    // ── Sources énergie ───────────────────────────────────────
    const sourceEolien = await prisma.sourceEnergie.create({
        data: {
            nom: "TEST-Parc-Eolien", type: "EOLIEN",
            coutProduction: 45.0, couleur: "#4F8AFF", actif: true
        }
    });
    console.log(`  ✅ Source       → ${sourceEolien.nom} (id: ${sourceEolien.id})`);

    const sourceSolaire = await prisma.sourceEnergie.create({
        data: {
            nom: "TEST-Centrale-Solaire", type: "SOLAIRE",
            coutProduction: 38.0, couleur: "#F5C518", actif: true
        }
    });
    console.log(`  ✅ Source       → ${sourceSolaire.nom} (id: ${sourceSolaire.id})`);

    // ── Stock énergie ─────────────────────────────────────────
    const stock = await prisma.stockEnergie.create({
        data: { sourceId: sourceEolien.id, quantite: 150.0 }
    });
    console.log(`  ✅ Stock        → ${stock.quantite} MWh (sourceId: ${stock.sourceId})`);

    // ── Tiers ─────────────────────────────────────────────────
    const fournisseur = await prisma.tiers.create({
        data: {
            nom: "TEST-Fournisseur-Reseau", typeTiers: "FOURNISSEUR",
            nomContact: "Contact Test", mail: "fournisseur@test.fr",
            telephone: "0600000000", delaiLivraison: 2
        }
    });
    console.log(`  ✅ Tiers        → ${fournisseur.nom} (id: ${fournisseur.id})`);

    const client = await prisma.tiers.create({
        data: {
            nom: "TEST-Client-EDF", typeTiers: "CLIENT",
            nomContact: "Client Test", mail: "client@test.fr",
            telephone: "0600000001"
        }
    });
    console.log(`  ✅ Tiers        → ${client.nom} (id: ${client.id})`);

    // ── Session énergie ───────────────────────────────────────
    const session = await prisma.sessionEnergie.create({
        data: {
            sourceId: sourceEolien.id,
            titre: "TEST-Session-Eolien",
            quantitePrevue: 100.0,
            debutPrev: new Date(),
            finPrev: new Date(Date.now() + 86400000),
            statut: "EN_ATTENTE",
            declenchement: "MANUEL"
        }
    });
    console.log(`  ✅ Session      → ${session.titre} (id: ${session.id})`);

    // ── Seuil énergie ─────────────────────────────────────────
    const seuil = await prisma.seuilEnergie.create({
        data: {
            sourceId: sourceEolien.id,
            seuilDeclenchement: 20,
            seuilArret: 10,
            declenchementAuto: false,
            statut: "ACTIF"
        }
    });
    console.log(`  ✅ Seuil        → id: ${seuil.id} (sourceId: ${seuil.sourceId})`);

    // ── Achat énergie ─────────────────────────────────────────
    const achat = await prisma.achatEnergie.create({
        data: {
            sourceId: sourceEolien.id,
            tiersId: fournisseur.id,
            quantite: 50.0,
            prixAchat: 45.0,
            total: 2250.0
        }
    });
    console.log(`  ✅ Achat        → ${achat.quantite} MWh — ${achat.total} € (id: ${achat.id})`);

    // ── Vente énergie ─────────────────────────────────────────
    const vente = await prisma.venteEnergie.create({
        data: {
            sourceId: sourceEolien.id,
            tiersId: client.id,
            quantite: 30.0,
            prixVente: 80.0,
            total: 2400.0
        }
    });
    console.log(`  ✅ Vente        → ${vente.quantite} MWh — ${vente.total} € (id: ${vente.id})`);

    const testIds = {
        superAdminId:   superAdmin.id,
        adminId:        admin.id,
        operateurId:    operateur.id,
        sourceEolienId: sourceEolien.id,
        sourceSolaireId:sourceSolaire.id,
        stockId:        stock.id,
        fournisseurId:  fournisseur.id,
        clientId:       client.id,
        sessionId:      session.id,
        seuilId:        seuil.id,
        achatId:        achat.id,
        venteId:        vente.id
    };

    console.log("\n📋 IDs de test :", JSON.stringify(testIds, null, 2));
    console.log("\n✅ Seed terminé — Prêt pour les tests\n");
    return testIds;
}

seedTest()
    .catch((e) => { console.error("❌ Erreur seed :", e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });