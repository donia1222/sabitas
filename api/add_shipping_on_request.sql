-- Productos con "Versand auf Anfrage" (no se venden online: contactar para envío/recogida).
-- Ejecutar UNA vez en phpMyAdmin sobre la base de datos del shop.
ALTER TABLE `products` ADD COLUMN `shipping_on_request` TINYINT(1) NOT NULL DEFAULT 0 AFTER `weight_kg`;
