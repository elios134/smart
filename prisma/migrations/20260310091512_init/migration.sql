-- CreateTable
CREATE TABLE `fournisseurs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nom` VARCHAR(191) NOT NULL,
    `nomContact` VARCHAR(191) NOT NULL,
    `fonctionContact` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `telephone` VARCHAR(191) NOT NULL,
    `delaiLivraison` INTEGER NOT NULL DEFAULT 0,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `achats_mp` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quantite` DOUBLE NOT NULL,
    `prixUnitaire` DOUBLE NOT NULL,
    `total` DOUBLE NOT NULL,
    `statut` ENUM('EN_ATTENTE', 'LIVRE', 'ANNULE') NOT NULL DEFAULT 'EN_ATTENTE',
    `dateLivraison` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `matiereId` INTEGER NOT NULL,
    `fournisseurId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `machines` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nom` VARCHAR(191) NOT NULL,
    `statut` ENUM('EN_MARCHE', 'EN_MAINTENANCE', 'ARRETEE') NOT NULL DEFAULT 'ARRETEE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `matieres_premieres` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nom` VARCHAR(191) NOT NULL,
    `unite` VARCHAR(191) NOT NULL DEFAULT 'kg',
    `prixActuel` DOUBLE NOT NULL DEFAULT 0,
    `seuilAchat` DOUBLE NOT NULL DEFAULT 0,
    `seuilVente` DOUBLE NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stocks_mp` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quantite` DOUBLE NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,
    `matiereId` INTEGER NOT NULL,

    UNIQUE INDEX `stocks_mp_matiereId_key`(`matiereId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `historique_prix_mp` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `prix` DOUBLE NOT NULL,
    `lastUpdated` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `matiereId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `seuils_config` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `seuilAchat` DOUBLE NOT NULL,
    `seuilVente` DOUBLE NOT NULL,
    `declenchementAuto` BOOLEAN NOT NULL DEFAULT false,
    `statut` ENUM('ACTIF', 'INACTIF') NOT NULL DEFAULT 'ACTIF',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `matiereId` INTEGER NOT NULL,

    UNIQUE INDEX `seuils_config_matiereId_key`(`matiereId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `productions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quantite` DOUBLE NOT NULL,
    `coutFab` DOUBLE NOT NULL DEFAULT 0,
    `debutFab` DATETIME(3) NOT NULL,
    `finFab` DATETIME(3) NOT NULL,
    `statut` ENUM('EN_ATTENTE', 'EN_COURS', 'TERMINEE', 'ANNULEE') NOT NULL DEFAULT 'EN_ATTENTE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `produitId` INTEGER NOT NULL,
    `machineId` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `nomenclatures` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quantite` DOUBLE NOT NULL,
    `produitId` INTEGER NOT NULL,
    `matiereId` INTEGER NOT NULL,

    UNIQUE INDEX `nomenclatures_produitId_matiereId_key`(`produitId`, `matiereId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `consommations_mp` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quantite` DOUBLE NOT NULL,
    `productionId` INTEGER NOT NULL,
    `matiereId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `produits` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nom` VARCHAR(191) NOT NULL,
    `coutActuel` DOUBLE NOT NULL DEFAULT 0,
    `seuilBas` DOUBLE NOT NULL DEFAULT 0,
    `seuilHaut` DOUBLE NOT NULL DEFAULT 0,
    `prixVente` DOUBLE NOT NULL DEFAULT 0,
    `statut` ENUM('EN_ATTENTE', 'ACTIF', 'INACTIF') NOT NULL DEFAULT 'EN_ATTENTE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stocks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quantite` DOUBLE NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,
    `produitId` INTEGER NOT NULL,

    UNIQUE INDEX `stocks_produitId_key`(`produitId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `historique_couts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cout` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `produitId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SetupToken` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `token` VARCHAR(191) NOT NULL,
    `used` BOOLEAN NOT NULL DEFAULT false,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `SetupToken_token_key`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `mail` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `role` ENUM('SUPER_ADMIN', 'ADMIN', 'OPERATEUR') NOT NULL DEFAULT 'OPERATEUR',
    `siret` VARCHAR(191) NULL,
    `socialReason` VARCHAR(191) NULL,
    `directorName` VARCHAR(191) NULL,
    `employeurId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_mail_key`(`mail`),
    UNIQUE INDEX `User_siret_key`(`siret`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ventes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numeroCommande` VARCHAR(191) NOT NULL,
    `statut` ENUM('EN_COURS', 'VALIDEE', 'ANNULEE') NOT NULL DEFAULT 'EN_COURS',
    `totalHT` DOUBLE NOT NULL DEFAULT 0,
    `tva` DOUBLE NOT NULL DEFAULT 20,
    `totalTTC` DOUBLE NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ventes_numeroCommande_key`(`numeroCommande`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lignes_vente` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quantite` DOUBLE NOT NULL,
    `prixUnitaire` DOUBLE NOT NULL,
    `prixHT` DOUBLE NOT NULL,
    `venteId` INTEGER NOT NULL,
    `produitId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `achats_mp` ADD CONSTRAINT `achats_mp_matiereId_fkey` FOREIGN KEY (`matiereId`) REFERENCES `matieres_premieres`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `achats_mp` ADD CONSTRAINT `achats_mp_fournisseurId_fkey` FOREIGN KEY (`fournisseurId`) REFERENCES `fournisseurs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stocks_mp` ADD CONSTRAINT `stocks_mp_matiereId_fkey` FOREIGN KEY (`matiereId`) REFERENCES `matieres_premieres`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historique_prix_mp` ADD CONSTRAINT `historique_prix_mp_matiereId_fkey` FOREIGN KEY (`matiereId`) REFERENCES `matieres_premieres`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `seuils_config` ADD CONSTRAINT `seuils_config_matiereId_fkey` FOREIGN KEY (`matiereId`) REFERENCES `matieres_premieres`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productions` ADD CONSTRAINT `productions_produitId_fkey` FOREIGN KEY (`produitId`) REFERENCES `produits`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productions` ADD CONSTRAINT `productions_machineId_fkey` FOREIGN KEY (`machineId`) REFERENCES `machines`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `nomenclatures` ADD CONSTRAINT `nomenclatures_produitId_fkey` FOREIGN KEY (`produitId`) REFERENCES `produits`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `nomenclatures` ADD CONSTRAINT `nomenclatures_matiereId_fkey` FOREIGN KEY (`matiereId`) REFERENCES `matieres_premieres`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `consommations_mp` ADD CONSTRAINT `consommations_mp_productionId_fkey` FOREIGN KEY (`productionId`) REFERENCES `productions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `consommations_mp` ADD CONSTRAINT `consommations_mp_matiereId_fkey` FOREIGN KEY (`matiereId`) REFERENCES `matieres_premieres`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stocks` ADD CONSTRAINT `stocks_produitId_fkey` FOREIGN KEY (`produitId`) REFERENCES `produits`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historique_couts` ADD CONSTRAINT `historique_couts_produitId_fkey` FOREIGN KEY (`produitId`) REFERENCES `produits`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_employeurId_fkey` FOREIGN KEY (`employeurId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lignes_vente` ADD CONSTRAINT `lignes_vente_venteId_fkey` FOREIGN KEY (`venteId`) REFERENCES `ventes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lignes_vente` ADD CONSTRAINT `lignes_vente_produitId_fkey` FOREIGN KEY (`produitId`) REFERENCES `produits`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
