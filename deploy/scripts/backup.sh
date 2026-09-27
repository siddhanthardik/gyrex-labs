#!/usr/bin/env bash
# ============================================================
# Gyrex Labs — Production PostgreSQL & File Storage Backup Script
# ============================================================

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/gyrex-labs}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_BACKUP_FILE="${BACKUP_DIR}/gyrex_labs_db_${TIMESTAMP}.sql.gz"
STORAGE_BACKUP_FILE="${BACKUP_DIR}/gyrex_labs_storage_${TIMESTAMP}.tar.gz"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

# Verify Database URL is set
if [ -z "${DATABASE_URL:-}" ]; then
  echo "[ERROR] DATABASE_URL environment variable is not set." >&2
  exit 1
fi

mkdir -p "${BACKUP_DIR}"

echo "[$(date)] Starting Gyrex Labs backup routine..."

# 1. Backup PostgreSQL Database
echo "[$(date)] Dumping PostgreSQL database to ${DB_BACKUP_FILE}..."
pg_dump "${DATABASE_URL}" --clean --if-exists --no-owner --no-privileges | gzip > "${DB_BACKUP_FILE}"
echo "[$(date)] PostgreSQL database backup complete."

# 2. Backup Private Storage Directory (if exists)
SECURE_STORAGE_DIR="${STORAGE_LOCAL_DIR:-/opt/gyrex-labs/storage/secure}"
if [ -d "${SECURE_STORAGE_DIR}" ]; then
  echo "[$(date)] Archiving private storage files from ${SECURE_STORAGE_DIR}..."
  tar -czf "${STORAGE_BACKUP_FILE}" -C "$(dirname "${SECURE_STORAGE_DIR}")" "$(basename "${SECURE_STORAGE_DIR}")"
  echo "[$(date)] Storage archive complete."
fi

# 3. Purge Backups Older Than Retention Window
echo "[$(date)] Purging backups older than ${RETENTION_DAYS} days in ${BACKUP_DIR}..."
find "${BACKUP_DIR}" -type f -name "gyrex_labs_*" -mtime +"${RETENTION_DAYS}" -delete

echo "[$(date)] Gyrex Labs backup completed successfully."
