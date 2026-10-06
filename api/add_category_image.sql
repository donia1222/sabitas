-- Imagen para categorías (se usa sobre todo en Hauptkategorien).
-- Ejecutar UNA vez en phpMyAdmin sobre la base de datos del shop.
ALTER TABLE `categories` ADD COLUMN `image` VARCHAR(255) NULL DEFAULT NULL AFTER `description`;
