#!/usr/bin/env bash
# ============================================================
# Gyrex Labs — Production Restore Procedure Script
# ============================================================

set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <path_to_db_backup.sql.gz> [path_to_storage_backup.tar.gz]"
  exit 1
fi

DB_BACKUP_FILE="$1"
STORAGE_BACKUP_FILE="${2:-}"

if [ ! -f "${DB_BACKUP_FILE}" ]; then
  echo "[ERROR] Database backup file not found: ${DB_BACKUP_FILE}" >&2
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[ERROR] DATABASE_URL environment variable is not set." >&2
  exit 1
fi

echo "============================================================"
echo "WARNING: RESTORING GYREX LABS PRODUCTION DATABASE"
echo "Target DB URL: [CONFIGURED]"
echo "Backup Source: ${DB_BACKUP_FILE}"
echo "============================================================"

read -p "Type 'CONFIRM_RESTORE' to proceed: " CONFIRMATION
if [ "${CONFIRMATION}" != "CONFIRM_RESTORE" ]; then
  echo "Restore aborted by user."
  exit 0
fi

# 1. Restore Database
echo "[$(date)] Decompressing and applying database snapshot..."
gunzip -c "${DB_BACKUP_FILE}" | psql "${DATABASE_URL}"
echo "[$(date)] Database restore completed."

# 2. Restore Storage Files if provided
if [ -n "${STORAGE_BACKUP_FILE}" ] && [ -f "${STORAGE_BACKUP_FILE}" ]; then
  TARGET_PARENT="/opt/gyrex-labs/storage"
  mkdir -p "${TARGET_PARENT}"
  echo "[$(date)] Extracting private storage files to ${TARGET_PARENT}..."
  tar -xzf "${STORAGE_BACKUP_FILE}" -C "${TARGET_PARENT}"
  echo "[$(date)] Storage files restore completed."
fi

echo "[$(date)] Restore procedure finished successfully."
