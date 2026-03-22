/**
 * SMART-YIELD — Nettoyage des données de test
 * 
 * Supprime toutes les données créées par seed-test.js et les tests.
 * 
 * Usage : node tests/cleanup-test.js
 */

import "dotenv/config";
import prisma from "../prisma/prismaClient.js";

async function cleanup() {
  console.log("\n🧹 Nettoyage des données de test\n");

  // Supprimer dans l'ordre inverse des dépendances
  const deletedSeuils = await prisma.seuilConfig.deleteMany({});
  console.log(`  ✅ SeuilConfig     → ${deletedSeuils.count} supprimé(s)`);

  const deletedLignes = await prisma.ligneVente.deleteMany({});
  console.log(`  ✅ LigneVente      → ${deletedLignes.count} supprimée(s)`);

  const deletedVentes = await prisma.vente.deleteMany({});
  console.log(`  ✅ Vente           → ${deletedVentes.count} supprimée(s)`);

  const deletedConso = await prisma.consommationMP.deleteMany({});
  console.log(`  ✅ ConsommationMP  → ${deletedConso.count} supprimée(s)`);

  const deletedProductions = await prisma.production.deleteMany({});
  console.log(`  ✅ Production      → ${deletedProductions.count} supprimée(s)`);

  const deletedStocks = await prisma.stock.deleteMany({});
  console.log(`  ✅ Stock           → ${deletedStocks.count} supprimé(s)`);

  const deletedNomenclatures = await prisma.nomenclature.deleteMany({});
  console.log(`  ✅ Nomenclature    → ${deletedNomenclatures.count} supprimée(s)`);

  const deletedHistoCout = await prisma.historiqueCout.deleteMany({});
  console.log(`  ✅ HistoriqueCout  → ${deletedHistoCout.count} supprimé(s)`);

  const deletedProduits = await prisma.produit.deleteMany({});
  console.log(`  ✅ Produit         → ${deletedProduits.count} supprimé(s)`);

  const deletedAchats = await prisma.achatMP.deleteMany({});
  console.log(`  ✅ AchatMP         → ${deletedAchats.count} supprimé(s)`);

  const deletedStockMP = await prisma.stockMP.deleteMany({});
  console.log(`  ✅ StockMP         → ${deletedStockMP.count} supprimé(s)`);

  const deletedHistoPrix = await prisma.historiquePrixMP.deleteMany({});
  console.log(`  ✅ HistoriquePrix  → ${deletedHistoPrix.count} supprimé(s)`);

  const deletedMatieres = await prisma.matierePremiere.deleteMany({});
  console.log(`  ✅ MatierePremiere → ${deletedMatieres.count} supprimée(s)`);

  const deletedFournisseurs = await prisma.fournisseur.deleteMany({});
  console.log(`  ✅ Fournisseur     → ${deletedFournisseurs.count} supprimé(s)`);

  const deletedMachines = await prisma.machine.deleteMany({});
  console.log(`  ✅ Machine         → ${deletedMachines.count} supprimée(s)`);

  // Supprimer les utilisateurs de test (pas les vrais)
  const deletedUsers = await prisma.user.deleteMany({
    where: {
      mail: {
        in: [
          "test-admin@smart.fr",
          "test-manager@smart.fr",
          "test-operateur@smart.fr",
        ],
      },
    },
  });
  console.log(`  ✅ Users test      → ${deletedUsers.count} supprimé(s)`);

  // Supprimer aussi les employés créés par les tests (mail contient "test-employe")
  const deletedTestEmployes = await prisma.user.deleteMany({
    where: { mail: { contains: "test-employe" } },
  });
  console.log(`  ✅ Employés test   → ${deletedTestEmployes.count} supprimé(s)`);

  console.log("\n✅ Nettoyage terminé\n");
}

cleanup()
  .catch((e) => {
    console.error("❌ Erreur cleanup :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
