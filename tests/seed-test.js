/**
 * SMART-YIELD — Seed de test
 * 
 * Crée les données nécessaires pour exécuter les tests :
 * - 1 SUPER_ADMIN (test-admin@smart.fr / Test1234!)
 * - 1 ADMIN (test-manager@smart.fr / Test1234!)
 * - 1 OPERATEUR (test-operateur@smart.fr / Test1234!)
 * - 1 Fournisseur, 1 Matière première, 1 Produit avec stock
 * 
 * Usage : node tests/seed-test.js
 */

import "dotenv/config";
import bcrypt from "bcryptjs";
import prisma from "../prisma/prismaClient.js";

const PASSWORD = "Test1234!";

async function seedTest() {
  console.log("\n🧪 Seed de test — Smart-Yield\n");

  const hash = await bcrypt.hash(PASSWORD, 10);

  // ── Utilisateurs de test ──
  const superAdmin = await prisma.user.upsert({
    where: { mail: "test-admin@smart.fr" },
    update: { password: hash },
    create: {
      mail: "test-admin@smart.fr",
      password: hash,
      firstName: "Super",
      lastName: "Admin",
      role: "SUPER_ADMIN",
      siret: "00000000000001",
      socialReason: "Smart-Yield Test",
    },
  });
  console.log(`  ✅ SUPER_ADMIN  → ${superAdmin.mail} (id: ${superAdmin.id})`);

  const admin = await prisma.user.upsert({
    where: { mail: "test-manager@smart.fr" },
    update: { password: hash, employeurId: superAdmin.id },
    create: {
      mail: "test-manager@smart.fr",
      password: hash,
      firstName: "Admin",
      lastName: "Manager",
      role: "ADMIN",
      employeurId: superAdmin.id,
    },
  });
  console.log(`  ✅ ADMIN        → ${admin.mail} (id: ${admin.id})`);

  const operateur = await prisma.user.upsert({
    where: { mail: "test-operateur@smart.fr" },
    update: { password: hash, employeurId: superAdmin.id },
    create: {
      mail: "test-operateur@smart.fr",
      password: hash,
      firstName: "Jean",
      lastName: "Operateur",
      role: "OPERATEUR",
      employeurId: superAdmin.id,
    },
  });
  console.log(`  ✅ OPERATEUR    → ${operateur.mail} (id: ${operateur.id})`);

  // ── Fournisseur de test ──
  const fournisseur = await prisma.fournisseur.create({
    data: {
      nom: "TEST-Fournisseur",
      nomContact: "Contact Test",
      email: "fournisseur@test.fr",
      telephone: "0600000000",
      delaiLivraison: 5,
    },
  });
  console.log(`  ✅ Fournisseur  → ${fournisseur.nom} (id: ${fournisseur.id})`);

  // ── Matière première de test ──
  const matiere = await prisma.matierePremiere.create({
    data: {
      nom: "TEST-Acier",
      unite: "kg",
      prixActuel: 2.5,
      seuilAchat: 100,
      seuilVente: 500,
    },
  });
  console.log(`  ✅ Matière      → ${matiere.nom} (id: ${matiere.id})`);

  // ── Stock MP ──
  await prisma.stockMP.create({
    data: { matiereId: matiere.id, quantite: 250 },
  });

  // ── Produit de test ──
  const produit = await prisma.produit.create({
    data: {
      nom: "TEST-Produit-Alpha",
      coutActuel: 15,
      seuilBas: 10,
      seuilHaut: 20,
      prixVente: 35,
      statut: "ACTIF",
      stock: { create: { quantite: 50 } },
    },
  });
  console.log(`  ✅ Produit      → ${produit.nom} (id: ${produit.id})`);

  // ── Production de test ──
  const production = await prisma.production.create({
    data: {
      produitId: produit.id,
      quantite: 10,
      coutFab: 150,
      debutFab: new Date(),
      finFab: new Date(Date.now() + 86400000),
      statut: "EN_ATTENTE",
    },
  });
  console.log(`  ✅ Production   → id: ${production.id} (EN_ATTENTE)`);

  // ── Vente de test ──
  const vente = await prisma.vente.create({
    data: {
      numeroCommande: "CMD-TEST-" + Date.now(),
      totalHT: 175,
      tva: 20,
      totalTTC: 210,
      statut: "EN_COURS",
      lignes: {
        create: [{
          produitId: produit.id,
          quantite: 5,
          prixUnitaire: 35,
          prixHT: 175,
        }],
      },
    },
  });
  console.log(`  ✅ Vente        → ${vente.numeroCommande} (id: ${vente.id})`);

  // ── Commande MP de test ──
  const achat = await prisma.achatMP.create({
    data: {
      matiereId: matiere.id,
      quantite: 100,
      prixUnitaire: 2.5,
      total: 250,
      statut: "EN_ATTENTE",
      dateLivraison: new Date(Date.now() + 5 * 86400000),
      fournisseurId: fournisseur.id,
    },
  });
  console.log(`  ✅ Achat MP     → id: ${achat.id} (EN_ATTENTE)`);

  // ── Seuil config ──
  const seuil = await prisma.seuilConfig.create({
    data: {
      matiereId: matiere.id,
      seuilAchat: 100,
      seuilVente: 500,
      declenchementAuto: false,
      statut: "ACTIF",
    },
  });
  console.log(`  ✅ SeuilConfig  → id: ${seuil.id}`);

  // Export IDs pour les tests
  const testIds = {
    superAdminId: superAdmin.id,
    adminId: admin.id,
    operateurId: operateur.id,
    fournisseurId: fournisseur.id,
    matiereId: matiere.id,
    produitId: produit.id,
    productionId: production.id,
    venteId: vente.id,
    achatId: achat.id,
    seuilId: seuil.id,
  };

  console.log("\n📋 IDs de test :", JSON.stringify(testIds, null, 2));
  console.log("\n✅ Seed terminé — Prêt pour les tests\n");

  return testIds;
}

seedTest()
  .catch((e) => {
    console.error("❌ Erreur seed :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
