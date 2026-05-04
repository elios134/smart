-- Lier les tokens de reset à un utilisateur précis
ALTER TABLE `SetupToken`
  ADD COLUMN `userId` INTEGER NULL;

CREATE INDEX `SetupToken_userId_idx` ON `SetupToken`(`userId`);

ALTER TABLE `SetupToken`
  ADD CONSTRAINT `SetupToken_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
  ON DELETE CASCADE
  ON UPDATE CASCADE;
