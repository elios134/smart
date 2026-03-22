-- CreateTable
CREATE TABLE `fournisseur_matieres` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fournisseurId` INTEGER NOT NULL,
    `matiereId` INTEGER NOT NULL,

    UNIQUE INDEX `fournisseur_matieres_fournisseurId_matiereId_key`(`fournisseurId`, `matiereId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `fournisseur_matieres` ADD CONSTRAINT `fournisseur_matieres_fournisseurId_fkey` FOREIGN KEY (`fournisseurId`) REFERENCES `fournisseurs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fournisseur_matieres` ADD CONSTRAINT `fournisseur_matieres_matiereId_fkey` FOREIGN KEY (`matiereId`) REFERENCES `matieres_premieres`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
