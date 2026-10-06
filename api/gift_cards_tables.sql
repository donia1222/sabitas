-- ============================================================
-- GESCHENKGUTSCHEIN — Neue Tabellen
-- Datenbank: la base de datos de la tienda
-- ============================================================

-- Plantillas de tarjetas de regalo (las crea el admin)
CREATE TABLE `gift_cards` (
  `id`          int(11)        NOT NULL AUTO_INCREMENT,
  `name`        varchar(255)   NOT NULL,
  `description` text           DEFAULT NULL,
  `amount`      decimal(10,2)  NOT NULL,
  `image`       varchar(255)   DEFAULT NULL,
  `is_active`   tinyint(1)     NOT NULL DEFAULT 1,
  `created_at`  timestamp      NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ejemplo de plantilla inicial
INSERT INTO `gift_cards` (`name`, `description`, `amount`, `is_active`) VALUES
('Gutschein CHF 25',  'Geschenkgutschein im Wert von CHF 25',  25.00,  1),
('Gutschein CHF 50',  'Geschenkgutschein im Wert von CHF 50',  50.00,  1),
('Gutschein CHF 100', 'Geschenkgutschein im Wert von CHF 100', 100.00, 1);

-- --------------------------------------------------------

-- Una fila por cada compra de tarjeta de regalo
CREATE TABLE `gift_card_purchases` (
  `id`             int(11)       NOT NULL AUTO_INCREMENT,
  `order_id`       int(11)       NOT NULL,
  `gift_card_id`   int(11)       NOT NULL,
  `buyer_name`     varchar(255)  DEFAULT NULL,
  `buyer_email`    varchar(255)  DEFAULT NULL,
  `amount`         decimal(10,2) NOT NULL,
  `code`           varchar(20)   DEFAULT NULL COMMENT 'USFH-XXXXXX, NULL hasta pago confirmado',
  `status`         enum('offen','aktiv','used','storniert') NOT NULL DEFAULT 'offen',
  `paid_at`        timestamp     NULL DEFAULT NULL,
  `created_at`     timestamp     NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `order_id` (`order_id`),
  KEY `gift_card_id` (`gift_card_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
