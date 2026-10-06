-- Marcar Hauptkategorien explícitamente (contenedores de nivel superior).
-- Ejecutar UNA vez en phpMyAdmin sobre la base de datos del shop.
ALTER TABLE `categories` ADD COLUMN `is_haupt` TINYINT(1) NOT NULL DEFAULT 0 AFTER `parent_id`;
