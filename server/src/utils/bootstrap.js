import prisma from "../config/prisma.js";

const CREATE_EXPORT_REQUEST_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS export_request (
    id CHAR(36) NOT NULL PRIMARY KEY,
    broker_id VARCHAR(50) NOT NULL,
    status ENUM('pending','confirmed','rejected','withdrawn') NOT NULL DEFAULT 'pending',
    grade_a DECIMAL(12,2) NOT NULL DEFAULT 0,
    grade_b DECIMAL(12,2) NOT NULL DEFAULT 0,
    grade_c DECIMAL(12,2) NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_export_request_broker FOREIGN KEY (broker_id) REFERENCES broker(broker_id) ON DELETE CASCADE ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
`;

const CREATE_EXPORT_REQUEST_FRUIT_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS export_request_fruit (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    request_id CHAR(36) NOT NULL,
    fruit_id VARCHAR(50) NOT NULL,
    UNIQUE KEY uniq_export_request_fruit (request_id, fruit_id),
    CONSTRAINT fk_export_request_fruit_request FOREIGN KEY (request_id) REFERENCES export_request(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_export_request_fruit_fruit FOREIGN KEY (fruit_id) REFERENCES durian_fruit(fruit_id) ON DELETE CASCADE ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
`;

export default async function bootstrap() {
  await ensureExportRequestTable();
  await ensureExportRequestFruitTable();
}

async function ensureExportRequestTable() {
  await prisma.$executeRawUnsafe(CREATE_EXPORT_REQUEST_TABLE_SQL);
}

async function ensureExportRequestFruitTable() {
  await prisma.$executeRawUnsafe(CREATE_EXPORT_REQUEST_FRUIT_TABLE_SQL);
}
