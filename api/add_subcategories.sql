-- Añadir soporte de subcategorías a la tabla categories
ALTER TABLE `categories` ADD COLUMN `parent_id` INT NULL DEFAULT NULL AFTER `id`;
ALTER TABLE `categories` ADD CONSTRAINT `fk_category_parent` FOREIGN KEY (`parent_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL;
