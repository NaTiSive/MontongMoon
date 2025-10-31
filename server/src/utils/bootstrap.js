import prisma from "../config/prisma.js";

const CREATE_EXPORT_REQUEST_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS export_request (
    id CHAR(36) NOT NULL PRIMARY KEY,
    broker_id VARCHAR(50) NOT NULL,
    status ENUM('pending','confirmed','rejected','withdrawn') NOT NULL DEFAULT 'pending',
    grade_a DECIMAL(12,2) NOT NULL DEFAULT 0,
    grade_b DECIMAL(12,2) NOT NULL DEFAULT 0,
    grade_c DECIMAL(12,2) NOT NULL DEFAULT 0,
    reserved_fruits TEXT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_export_request_broker FOREIGN KEY (broker_id) REFERENCES broker(broker_id) ON DELETE CASCADE ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
`;

const ADD_RESERVED_FRUITS_COLUMN_SQL = `
  ALTER TABLE export_request
  ADD COLUMN IF NOT EXISTS reserved_fruits TEXT NULL;
`;

export default async function bootstrap() {
  await ensureExportRequestTable();
}

async function ensureExportRequestTable() {
  await prisma.$executeRawUnsafe(CREATE_EXPORT_REQUEST_TABLE_SQL);
  await prisma.$executeRawUnsafe(ADD_RESERVED_FRUITS_COLUMN_SQL);
}
