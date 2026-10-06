-- ============================================================
-- Añadir columna article_number a products
-- Guarda el SKU original del Excel (Artikel-Nr.) tal cual
-- ============================================================

ALTER TABLE `products`
  ADD COLUMN `article_number` VARCHAR(50) DEFAULT NULL AFTER `id`,
  ADD INDEX `idx_article_number` (`article_number`);
