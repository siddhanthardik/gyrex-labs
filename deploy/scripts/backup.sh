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

# 2. Backup File Storage (Private & Branding/Compliance Assets)
STORAGE_BASE_DIR="${STORAGE_PARENT_DIR:-$(dirname "${STORAGE_LOCAL_DIR:-/opt/gyrex-labs/storage/secure}")}"
SECURE_STORAGE_DIR="${STORAGE_LOCAL_DIR:-${STORAGE_BASE_DIR}/secure}"
BRANDING_STORAGE_DIR="${STORAGE_BRANDING_DIR:-${STORAGE_BASE_DIR}/branding}"
COMPLIANCE_STORAGE_DIR="${STORAGE_COMPLIANCE_DIR:-${STORAGE_BASE_DIR}/compliance}"

STORAGE_TARGETS=()
if [ -d "${SECURE_STORAGE_DIR}" ]; then
  STORAGE_TARGETS+=("$(basename "${SECURE_STORAGE_DIR}")")
fi
if [ -d "${BRANDING_STORAGE_DIR}" ]; then
  STORAGE_TARGETS+=("$(basename "${BRANDING_STORAGE_DIR}")")
fi
if [ -d "${COMPLIANCE_STORAGE_DIR}" ]; then
  STORAGE_TARGETS+=("$(basename "${COMPLIANCE_STORAGE_DIR}")")
fi

if [ ${#STORAGE_TARGETS[@]} -gt 0 ]; then
  echo "[$(date)] Archiving storage directories (${STORAGE_TARGETS[*]}) from ${STORAGE_BASE_DIR}..."
  tar -czf "${STORAGE_BACKUP_FILE}" -C "${STORAGE_BASE_DIR}" "${STORAGE_TARGETS[@]}"
  echo "[$(date)] Storage archive complete: ${STORAGE_BACKUP_FILE}"
else
  echo "[$(date)] No storage directories found to archive in ${STORAGE_BASE_DIR}."
fi

# 3. Purge Backups Older Than Retention Window
echo "[$(date)] Purging backups older than ${RETENTION_DAYS} days in ${BACKUP_DIR}..."
find "${BACKUP_DIR}" -type f -name "gyrex_labs_*" -mtime +"${RETENTION_DAYS}" -delete

echo "[$(date)] Gyrex Labs backup completed successfully."
