-- CreateTable
CREATE TABLE `Announcement` (
  `id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(120) NOT NULL,
  `content` TEXT NOT NULL,
  `type` VARCHAR(24) NOT NULL DEFAULT '公告',
  `isPublished` BOOLEAN NOT NULL DEFAULT false,
  `isPinned` BOOLEAN NOT NULL DEFAULT false,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `publishedAt` DATETIME(3) NULL,
  `expiresAt` DATETIME(3) NULL,
  `createdBy` VARCHAR(191) NULL,
  `updatedBy` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `Announcement_isPublished_isPinned_sortOrder_idx`(`isPublished`, `isPinned`, `sortOrder`),
  INDEX `Announcement_publishedAt_idx`(`publishedAt`),
  INDEX `Announcement_expiresAt_idx`(`expiresAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
