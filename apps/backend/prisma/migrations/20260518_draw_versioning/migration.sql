-- CreateTable
CREATE TABLE `draw_bracket` (
  `id` VARCHAR(191) NOT NULL,
  `event_item_id` VARCHAR(191) NOT NULL,
  `version` INTEGER NOT NULL,
  `is_current` BOOLEAN NOT NULL DEFAULT true,
  `format` ENUM('single_elim', 'group_then_elim') NOT NULL,
  `status` ENUM('DRAFT', 'DRAWN', 'FROZEN') NOT NULL DEFAULT 'DRAFT',
  `bracket_size` INTEGER NOT NULL,
  `entrant_count` INTEGER NOT NULL,
  `seed_limit` INTEGER NOT NULL,
  `seed_count` INTEGER NOT NULL,
  `bye_count` INTEGER NOT NULL,
  `group_count` INTEGER NULL,
  `qualify_per_group` INTEGER NULL,
  `executed_at` DATETIME(3) NULL,
  `frozen_at` DATETIME(3) NULL,
  `created_by` VARCHAR(191) NOT NULL,
  `updated_by` VARCHAR(191) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `draw_bracket_event_item_id_version_key`(`event_item_id`, `version`),
  INDEX `draw_bracket_event_item_id_idx`(`event_item_id`),
  INDEX `draw_bracket_event_item_id_is_current_idx`(`event_item_id`, `is_current`),
  INDEX `draw_bracket_status_idx`(`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `draw_slot` (
  `id` VARCHAR(191) NOT NULL,
  `draw_bracket_id` VARCHAR(191) NOT NULL,
  `position` INTEGER NOT NULL,
  `entrant_id` VARCHAR(191) NULL,
  `entrant_name_snapshot` VARCHAR(128) NULL,
  `seed_no_snapshot` INTEGER NULL,
  `is_seed` BOOLEAN NOT NULL DEFAULT false,
  `is_bye` BOOLEAN NOT NULL DEFAULT false,
  `source_type` ENUM('SEED', 'NON_SEED', 'BYE', 'MANUAL_SWAP') NOT NULL,
  `group_rank_code` VARCHAR(16) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `draw_slot_draw_bracket_id_position_key`(`draw_bracket_id`, `position`),
  INDEX `draw_slot_draw_bracket_id_idx`(`draw_bracket_id`),
  INDEX `draw_slot_entrant_id_idx`(`entrant_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `draw_operation_log` (
  `id` VARCHAR(191) NOT NULL,
  `event_item_id` VARCHAR(191) NOT NULL,
  `draw_bracket_id` VARCHAR(191) NOT NULL,
  `operation_type` ENUM('SEED_UPDATE', 'EXECUTE', 'SWAP', 'FREEZE', 'REDRAW') NOT NULL,
  `operator_id` VARCHAR(191) NOT NULL,
  `operator_name_snapshot` VARCHAR(64) NULL,
  `position_a` INTEGER NULL,
  `position_b` INTEGER NULL,
  `before_data` JSON NULL,
  `after_data` JSON NULL,
  `remark` VARCHAR(255) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `draw_operation_log_event_item_id_created_at_idx`(`event_item_id`, `created_at`),
  INDEX `draw_operation_log_draw_bracket_id_created_at_idx`(`draw_bracket_id`, `created_at`),
  INDEX `draw_operation_log_operator_id_idx`(`operator_id`),
  INDEX `draw_operation_log_operation_type_idx`(`operation_type`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `draw_seed_setting` (
  `id` VARCHAR(191) NOT NULL,
  `event_item_id` VARCHAR(191) NOT NULL,
  `entrant_id` VARCHAR(191) NOT NULL,
  `seed_no` INTEGER NOT NULL,
  `created_by` VARCHAR(191) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `draw_seed_setting_event_item_id_seed_no_key`(`event_item_id`, `seed_no`),
  UNIQUE INDEX `draw_seed_setting_event_item_id_entrant_id_key`(`event_item_id`, `entrant_id`),
  INDEX `draw_seed_setting_event_item_id_idx`(`event_item_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `draw_group` (
  `id` VARCHAR(191) NOT NULL,
  `draw_bracket_id` VARCHAR(191) NOT NULL,
  `group_code` VARCHAR(8) NOT NULL,
  `sort_order` INTEGER NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `draw_group_draw_bracket_id_group_code_key`(`draw_bracket_id`, `group_code`),
  INDEX `draw_group_draw_bracket_id_idx`(`draw_bracket_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `draw_group_member` (
  `id` VARCHAR(191) NOT NULL,
  `draw_group_id` VARCHAR(191) NOT NULL,
  `entrant_id` VARCHAR(191) NOT NULL,
  `entrant_name_snapshot` VARCHAR(128) NULL,
  `seed_no_snapshot` INTEGER NULL,
  `group_rank` INTEGER NULL,
  `is_qualified` BOOLEAN NOT NULL DEFAULT false,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `draw_group_member_draw_group_id_entrant_id_key`(`draw_group_id`, `entrant_id`),
  INDEX `draw_group_member_draw_group_id_idx`(`draw_group_id`),
  INDEX `draw_group_member_entrant_id_idx`(`entrant_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `draw_bracket`
  ADD CONSTRAINT `draw_bracket_event_item_id_fkey`
  FOREIGN KEY (`event_item_id`) REFERENCES `Event`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `draw_slot`
  ADD CONSTRAINT `draw_slot_draw_bracket_id_fkey`
  FOREIGN KEY (`draw_bracket_id`) REFERENCES `draw_bracket`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `draw_slot`
  ADD CONSTRAINT `draw_slot_entrant_id_fkey`
  FOREIGN KEY (`entrant_id`) REFERENCES `Registration`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `draw_operation_log`
  ADD CONSTRAINT `draw_operation_log_event_item_id_fkey`
  FOREIGN KEY (`event_item_id`) REFERENCES `Event`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `draw_operation_log`
  ADD CONSTRAINT `draw_operation_log_draw_bracket_id_fkey`
  FOREIGN KEY (`draw_bracket_id`) REFERENCES `draw_bracket`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `draw_operation_log`
  ADD CONSTRAINT `draw_operation_log_operator_id_fkey`
  FOREIGN KEY (`operator_id`) REFERENCES `User`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `draw_seed_setting`
  ADD CONSTRAINT `draw_seed_setting_event_item_id_fkey`
  FOREIGN KEY (`event_item_id`) REFERENCES `Event`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `draw_seed_setting`
  ADD CONSTRAINT `draw_seed_setting_entrant_id_fkey`
  FOREIGN KEY (`entrant_id`) REFERENCES `Registration`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `draw_seed_setting`
  ADD CONSTRAINT `draw_seed_setting_created_by_fkey`
  FOREIGN KEY (`created_by`) REFERENCES `User`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `draw_group`
  ADD CONSTRAINT `draw_group_draw_bracket_id_fkey`
  FOREIGN KEY (`draw_bracket_id`) REFERENCES `draw_bracket`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `draw_group_member`
  ADD CONSTRAINT `draw_group_member_draw_group_id_fkey`
  FOREIGN KEY (`draw_group_id`) REFERENCES `draw_group`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `draw_group_member`
  ADD CONSTRAINT `draw_group_member_entrant_id_fkey`
  FOREIGN KEY (`entrant_id`) REFERENCES `Registration`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
