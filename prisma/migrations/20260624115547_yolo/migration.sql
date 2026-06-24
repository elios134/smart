/*
  Warnings:

  - You are about to drop the `achats_mp` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `consommations_mp` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `fournisseur_matieres` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `fournisseurs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `historique_couts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `historique_prix_mp` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `lignes_vente` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `machines` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `matieres_premieres` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `nomenclatures` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `productions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `produits` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `seuils_config` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `stocks` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `stocks_mp` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ventes` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `achats_mp` DROP FOREIGN KEY `achats_mp_fournisseurId_fkey`;

-- DropForeignKey
ALTER TABLE `achats_mp` DROP FOREIGN KEY `achats_mp_matiereId_fkey`;

-- DropForeignKey
ALTER TABLE `consommations_mp` DROP FOREIGN KEY `consommations_mp_matiereId_fkey`;

-- DropForeignKey
ALTER TABLE `consommations_mp` DROP FOREIGN KEY `consommations_mp_productionId_fkey`;

-- DropForeignKey
ALTER TABLE `fournisseur_matieres` DROP FOREIGN KEY `fournisseur_matieres_fournisseurId_fkey`;

-- DropForeignKey
ALTER TABLE `fournisseur_matieres` DROP FOREIGN KEY `fournisseur_matieres_matiereId_fkey`;

-- DropForeignKey
ALTER TABLE `historique_couts` DROP FOREIGN KEY `historique_couts_produitId_fkey`;

-- DropForeignKey
ALTER TABLE `historique_prix_mp` DROP FOREIGN KEY `historique_prix_mp_matiereId_fkey`;

-- DropForeignKey
ALTER TABLE `lignes_vente` DROP FOREIGN KEY `lignes_vente_produitId_fkey`;

-- DropForeignKey
ALTER TABLE `lignes_vente` DROP FOREIGN KEY `lignes_vente_venteId_fkey`;

-- DropForeignKey
ALTER TABLE `nomenclatures` DROP FOREIGN KEY `nomenclatures_matiereId_fkey`;

-- DropForeignKey
ALTER TABLE `nomenclatures` DROP FOREIGN KEY `nomenclatures_produitId_fkey`;

-- DropForeignKey
ALTER TABLE `productions` DROP FOREIGN KEY `productions_machineId_fkey`;

-- DropForeignKey
ALTER TABLE `productions` DROP FOREIGN KEY `productions_produitId_fkey`;

-- DropForeignKey
ALTER TABLE `seuils_config` DROP FOREIGN KEY `seuils_config_matiereId_fkey`;

-- DropForeignKey
ALTER TABLE `stocks` DROP FOREIGN KEY `stocks_produitId_fkey`;

-- DropForeignKey
ALTER TABLE `stocks_mp` DROP FOREIGN KEY `stocks_mp_matiereId_fkey`;

-- DropTable
DROP TABLE `achats_mp`;

-- DropTable
DROP TABLE `consommations_mp`;

-- DropTable
DROP TABLE `fournisseur_matieres`;

-- DropTable
DROP TABLE `fournisseurs`;

-- DropTable
DROP TABLE `historique_couts`;

-- DropTable
DROP TABLE `historique_prix_mp`;

-- DropTable
DROP TABLE `lignes_vente`;

-- DropTable
DROP TABLE `machines`;

-- DropTable
DROP TABLE `matieres_premieres`;

-- DropTable
DROP TABLE `nomenclatures`;

-- DropTable
DROP TABLE `productions`;

-- DropTable
DROP TABLE `produits`;

-- DropTable
DROP TABLE `seuils_config`;

-- DropTable
DROP TABLE `stocks`;

-- DropTable
DROP TABLE `stocks_mp`;

-- DropTable
DROP TABLE `ventes`;

-- CreateTable
CREATE TABLE `sources_energie` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nom` VARCHAR(191) NOT NULL,
    `type` ENUM('EOLIEN', 'SOLAIRE', 'HYDRAULIQUE', 'HYDROGENE', 'RESEAU') NOT NULL,
    `coutProduction` DOUBLE NOT NULL DEFAULT 0,
    `couleur` VARCHAR(191) NOT NULL DEFAULT '#4F8AFF',
    `actif` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stocks_energie` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quantite` DOUBLE NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,
    `sourceId` INTEGER NOT NULL,

    UNIQUE INDEX `stocks_energie_sourceId_key`(`sourceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `achats_energie` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quantite` DOUBLE NOT NULL,
    `prixAchat` DOUBLE NOT NULL,
    `total` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `sourceId` INTEGER NOT NULL,
    `tiersId` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ventes_energie` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quantite` DOUBLE NOT NULL,
    `prixVente` DOUBLE NOT NULL,
    `total` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `sourceId` INTEGER NOT NULL,
    `tiersId` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `seuils_energie` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `seuilDeclenchement` DOUBLE NOT NULL DEFAULT 20,
    `seuilArret` DOUBLE NOT NULL DEFAULT 10,
    `declenchementAuto` BOOLEAN NOT NULL DEFAULT false,
    `statut` ENUM('ACTIF', 'INACTIF') NOT NULL DEFAULT 'ACTIF',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `sourceId` INTEGER NOT NULL,

    UNIQUE INDEX `seuils_energie_sourceId_key`(`sourceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessions_energie` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `titre` VARCHAR(191) NOT NULL,
    `quantitePrevue` DOUBLE NOT NULL DEFAULT 0,
    `quantiteProduite` DOUBLE NOT NULL DEFAULT 0,
    `coutTotal` DOUBLE NOT NULL DEFAULT 0,
    `debutPrev` DATETIME(3) NOT NULL,
    `finPrev` DATETIME(3) NOT NULL,
    `debutReel` DATETIME(3) NULL,
    `finReel` DATETIME(3) NULL,
    `statut` ENUM('EN_ATTENTE', 'EN_COURS', 'TERMINEE', 'ANNULEE') NOT NULL DEFAULT 'EN_ATTENTE',
    `notes` TEXT NULL,
    `declenchement` VARCHAR(191) NOT NULL DEFAULT 'MANUEL',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `sourceId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessions` (
    `sid` VARCHAR(191) NOT NULL,
    `data` TEXT NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,

    INDEX `sessions_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`sid`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tiers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nom` VARCHAR(191) NOT NULL,
    `typeTiers` ENUM('FOURNISSEUR', 'CLIENT') NOT NULL DEFAULT 'FOURNISSEUR',
    `nomContact` VARCHAR(191) NULL,
    `fonctionContact` VARCHAR(191) NULL,
    `mail` VARCHAR(191) NULL,
    `telephone` VARCHAR(191) NULL,
    `delaiLivraison` INTEGER NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `stocks_energie` ADD CONSTRAINT `stocks_energie_sourceId_fkey` FOREIGN KEY (`sourceId`) REFERENCES `sources_energie`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `achats_energie` ADD CONSTRAINT `achats_energie_sourceId_fkey` FOREIGN KEY (`sourceId`) REFERENCES `sources_energie`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `achats_energie` ADD CONSTRAINT `achats_energie_tiersId_fkey` FOREIGN KEY (`tiersId`) REFERENCES `tiers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ventes_energie` ADD CONSTRAINT `ventes_energie_sourceId_fkey` FOREIGN KEY (`sourceId`) REFERENCES `sources_energie`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ventes_energie` ADD CONSTRAINT `ventes_energie_tiersId_fkey` FOREIGN KEY (`tiersId`) REFERENCES `tiers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `seuils_energie` ADD CONSTRAINT `seuils_energie_sourceId_fkey` FOREIGN KEY (`sourceId`) REFERENCES `sources_energie`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sessions_energie` ADD CONSTRAINT `sessions_energie_sourceId_fkey` FOREIGN KEY (`sourceId`) REFERENCES `sources_energie`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
