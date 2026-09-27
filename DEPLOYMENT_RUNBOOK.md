# Gyrex Labs — Production Deployment & DevOps Runbook (Artifact 08)

**Version:** 1.0.0  
**Environment:** Linux VPS (Ubuntu / Debian LTS)  
**Process Manager:** PM2  
**Web Server / Reverse Proxy:** Nginx with Let's Encrypt SSL  
**Database:** PostgreSQL 15+  
**Application:** Next.js (App Router, Node.js 20+)

---

## 1. Architecture Overview

Gyrex Labs is a multi-tenant diagnostic laboratory SaaS platform designed for complete operational isolation from existing Gyrex applications (e.g. Gyrex Clinics).

```
 Internet (HTTPS 443)
       │
       ▼
 ┌────────────────────────────────────────────────────────┐
 │ Nginx Reverse Proxy (SSL / TLS 1.3 Termination)        │
 │  ├── labs.gyrex.in       ──► http://127.0.0.1:3005     │
 │  └── admin-labs.gyrex.in ──► http://127.0.0.1:3005     │
 └────────────────────────────────────────────────────────┘
       │
       ▼
 ┌────────────────────────────────────────────────────────┐
 │ PM2 Process: gyrex-labs (Dedicated Port 3005)          │
 │  ├── Working Dir: /opt/gyrex-labs                      │
 │  └── Node.js Next.js Application Engine                │
 └────────────────────────────────────────────────────────┘
       │
       ├──► PostgreSQL Database: gyrex_labs_db (Isolated)
       ├──► Local Private Storage: /opt/gyrex-labs/storage/secure
       ├──► Razorpay Gateway (Flow A: Lab Direct | Flow B: Gyrex SaaS)
       └──► Google Gemini 1.5 Flash (Prescription OCR Extraction)
```

---

## 2. VPS Working Directory

- **Directory:** `/opt/gyrex-labs`
- **Ownership:** `www-data:www-data` or designated deploy user (e.g. `gyrex`).
- **Isolation Rule:** Do NOT deploy inside `/var/www/gyrex-clinics` or any existing clinic directories.

---

## 3. Dedicated Application Port

- **Dedicated Port:** `3005`
- **Binding:** `127.0.0.1:3005` (Internal loopback only; blocked from public internet access).
- **Environment Variable:** `PORT=3005`

---

## 4. PM2 Process Configuration

- **Process Name:** `gyrex-labs`
- **Configuration File:** `ecosystem.config.cjs`
- **Management:**
  ```bash
  # Start process
  pm2 start ecosystem.config.cjs --only gyrex-labs
  
  # Zero-downtime reload
  pm2 reload ecosystem.config.cjs --only gyrex-labs --update-env
  
  # Status
  pm2 status gyrex-labs
  
  # Save PM2 state
  pm2 save
  ```
- **STRICT SAFETY RULE:** Never run `pm2 delete all` or `pm2 restart all`.

---

## 5. Domain Routing

| Domain | Target Module | Description |
|---|---|---|
| `labs.gyrex.in` | Patient App & Lab Admin | Storefronts (`/{labSlug}`), booking, cart, checkout, lab management (`/lab/*`) |
| `admin-labs.gyrex.in` | Superadmin Portal | Multi-tenant platform management, global catalogues, lab verification (`/superadmin/*`) |

---

## 6. DNS Configuration Requirements

Configure the following DNS `A` records in the DNS provider (e.g. Cloudflare / Route 53):

| Type | Name | Target IPv4 | Proxy Status |
|---|---|---|---|
| `A` | `labs` (in `gyrex.in`) | `<VPS_PUBLIC_IP>` | DNS Only (or Proxied) |
| `A` | `admin-labs` (in `gyrex.in`) | `<VPS_PUBLIC_IP>` | DNS Only (or Proxied) |

---

## 7. Nginx Configuration

Copy [`deploy/nginx/gyrex-labs.conf`](file:///d:/gyrex-labs/deploy/nginx/gyrex-labs.conf) to `/etc/nginx/sites-available/gyrex-labs.conf`:

```bash
# Link configuration
sudo ln -sf /etc/nginx/sites-available/gyrex-labs.conf /etc/nginx/sites-enabled/gyrex-labs.conf

# Test syntax before reload
sudo nginx -t

# Reload Nginx without downtime
sudo systemctl reload nginx
```

---

## 8. SSL / TLS Certificate Provisioning

Generate Let's Encrypt certificates using Certbot:

```bash
sudo certbot certonly --nginx \
  -d labs.gyrex.in \
  -d admin-labs.gyrex.in \
  --email admin@gyrex.in \
  --agree-tos \
  --no-eff-email
```

Ensure automatic renewal cron/timer is active:
```bash
sudo systemctl status certbot.timer
```

---

## 9. Environment Variables Specification

The production `.env` must reside strictly on the VPS at `/opt/gyrex-labs/.env` (mode `0600`, owned by deploy user):

```env
# Database (Dedicated PostgreSQL Instance)
DATABASE_URL="postgresql://gyrex_labs_user:SECURE_PASSWORD@localhost:5432/gyrex_labs_db?schema=public"

# Cryptographic Keys (Must be >= 32 characters, unique and distinct)
AUTH_SECRET="SECURE_32_PLUS_CHARACTERS_JWT_SECRET"
ENCRYPTION_SECRET="SECURE_32_PLUS_CHARACTERS_AES_KEY"
STORAGE_SIGNING_SECRET="SECURE_32_PLUS_CHARACTERS_URL_SECRET"
SESSION_MAX_AGE_SECONDS=604800

# Domains
NEXT_PUBLIC_APP_URL="https://labs.gyrex.in"
NEXT_PUBLIC_PATIENT_DOMAIN="labs.gyrex.in"
NEXT_PUBLIC_SUPERADMIN_DOMAIN="admin-labs.gyrex.in"

# Port & Node Environment
NODE_ENV="production"
PORT=3005

# AI OCR (Google Gemini)
GEMINI_API_KEY="AIzaSy..."

# Platform SaaS Gateway (Flow B: Lab -> Gyrex Subscriptions)
GYREX_RAZORPAY_KEY_ID="rzp_live_..."
GYREX_RAZORPAY_KEY_SECRET="..."
GYREX_RAZORPAY_WEBHOOK_SECRET="..."

# File Storage
STORAGE_PROVIDER="LOCAL_SECURE"
STORAGE_LOCAL_DIR="/opt/gyrex-labs/storage/secure"
```

---

## 10. Secret Management & Segregation

1. **Key Isolation:** `AUTH_SECRET`, `ENCRYPTION_SECRET`, and `STORAGE_SIGNING_SECRET` MUST NOT share the same value.
2. **Never Commit Secrets:** `.env` is ignored in Git.
3. **No Terminal Secret Printing:** Scripts and logs must never echo raw secret strings.

---

## 11. PostgreSQL Database Setup

Create the dedicated Gyrex Labs PostgreSQL database and user:

```bash
sudo -u postgres psql -c "CREATE USER gyrex_labs_user WITH ENCRYPTED PASSWORD 'STRONG_PASSWORD';"
sudo -u postgres psql -c "CREATE DATABASE gyrex_labs_db OWNER gyrex_labs_user;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE gyrex_labs_db TO gyrex_labs_user;"
```

---

## 12. Prisma Migration & Deployment

Execute deterministic schema migrations:

```bash
cd /opt/gyrex-labs
npx prisma migrate status
npx prisma migrate deploy
```

**STRICT SAFETY INVARIANT:** Never execute `prisma migrate reset` or `prisma db push` on production.

---

## 13. Production Build Process

```bash
cd /opt/gyrex-labs
npm ci --production=false
npx prisma generate
npm run build
```

---

## 14. PM2 Startup & Reload Commands

```bash
# Start initial process
pm2 start ecosystem.config.cjs --only gyrex-labs

# Check process list
pm2 list

# Check live logs
pm2 logs gyrex-labs --lines 50

# Reload after code update (zero-downtime)
pm2 reload ecosystem.config.cjs --only gyrex-labs --update-env
```

---

## 15. Health Check Verification

The `/api/health` route verifies application status and database connectivity:

```bash
curl -i http://127.0.0.1:3005/api/health
```

Expected output:
```json
{
  "status": "healthy",
  "service": "gyrex-labs",
  "version": "0.1.0",
  "checks": {
    "database": { "status": "healthy" },
    "environment": { "status": "valid", "errorCount": 0 }
  }
}
```

---

## 16. Log Management

- **PM2 Stdout Logs:** `/opt/gyrex-labs/logs/pm2-out.log`
- **PM2 Error Logs:** `/opt/gyrex-labs/logs/pm2-error.log`
- **Nginx Access Logs:** `/var/log/nginx/gyrex_labs_access.log`
- **Nginx Error Logs:** `/var/log/nginx/gyrex_labs_error.log`

Log rotation is handled automatically via `pm2-logrotate` and `logrotate.d/nginx`.

---

## 17. Backup Strategy

Automated backup is scheduled via cron using [`deploy/scripts/backup.sh`](file:///d:/gyrex-labs/deploy/scripts/backup.sh):

```bash
# Add to crontab (runs daily at 02:00 AM)
0 2 * * * /opt/gyrex-labs/deploy/scripts/backup.sh >> /var/log/gyrex_labs_backup.log 2>&1
```

- **Retention Window:** 14 days rolling backup.
- **Artifacts:** Gzipped PostgreSQL dump (`.sql.gz`) + Private storage archive (`.tar.gz`).
- **Location:** `/var/backups/gyrex-labs/`.

---

## 18. Disaster Recovery & Restore Procedure

To restore from a backup file:

```bash
/opt/gyrex-labs/deploy/scripts/restore.sh \
  /var/backups/gyrex-labs/gyrex_labs_db_YYYYMMDD_HHMMSS.sql.gz \
  /var/backups/gyrex-labs/gyrex_labs_storage_YYYYMMDD_HHMMSS.tar.gz
```

---

## 19. Rollback Procedure

If a deployed release introduces an issue:

1. **Revert Git to Prior Tag / Commit:**
   ```bash
   cd /opt/gyrex-labs
   git checkout <PREVIOUS_STABLE_COMMIT>
   ```
2. **Re-generate Client & Rebuild:**
   ```bash
   npm ci
   npx prisma generate
   npm run build
   ```
3. **Reload PM2:**
   ```bash
   pm2 reload ecosystem.config.cjs --only gyrex-labs --update-env
   ```
4. **Verify Health:**
   ```bash
   curl -f http://127.0.0.1:3005/api/health
   ```

*Note on Database Migrations:* Application releases are designed with forward-compatible migrations (additive columns/tables) so rolling back application code does not require rolling back the database.

---

## 20. GitHub Deployment Automation

Deployments from GitHub Actions use `.github/workflows/deploy.yml` triggered on push to `main` with SSH authentication.

---

## 21. Security & Firewall Requirements

1. **Firewall (UFW):**
   - Port `80` (HTTP) — Open to public (redirects to HTTPS).
   - Port `443` (HTTPS) — Open to public.
   - Port `22` (SSH) — Restricted / Open.
   - Port `3005` (Gyrex Labs) — **BLOCKED** from public (Internal loopback only).
   - Port `5432` (PostgreSQL) — **BLOCKED** from public.
2. **Security Headers:** Configured both in `next.config.ts` and Nginx.

---

## 22. Production Smoke Test Verification

Execute following smoke test sequence post-deployment:
1. `GET https://labs.gyrex.in/api/health` -> HTTP 200 `{ status: "healthy" }`
2. `GET https://labs.gyrex.in/sharma-diagnostics` -> Storefront renders with tests & packages
3. `POST /api/patient/orders` -> Server-authoritative order creation returns `orderNumber`
4. `GET /sharma-diagnostics/booking/{orderNumber}` -> Booking confirmed screen without empty-cart flash
5. `GET https://admin-labs.gyrex.in/login` -> Superadmin login screen loads

---

## 23. Troubleshooting Guide

| Symptom | Probable Cause | Resolution |
|---|---|---|
| `502 Bad Gateway` on Nginx | PM2 process down or starting up | Run `pm2 status gyrex-labs` and inspect `pm2 logs gyrex-labs` |
| Database connection refused | PostgreSQL stopped or wrong `DATABASE_URL` | Check `systemctl status postgresql` and verify credentials |
| Upload returns `413 Request Entity Too Large` | Nginx `client_max_body_size` too small | Ensure `client_max_body_size 25M;` is active in Nginx configuration |
| Missing Secret error on startup | `.env` variables not loaded | Ensure PM2 reload includes `--update-env` and `.env` has all required keys |

---

## 24. Existing Gyrex Clinics Application Protection

To guarantee zero impact to existing Gyrex Clinics services:
- Gyrex Clinics PM2 processes are untouched.
- Gyrex Clinics Nginx configuration files in `/etc/nginx/sites-available/` are untouched.
- Gyrex Clinics database and ports remain independent.

---

## 25. Deployment Checklist

- [x] Dedicated application directory (`/opt/gyrex-labs`)
- [x] Dedicated local port (`3005`)
- [x] Dedicated PM2 process name (`gyrex-labs`)
- [x] Isolated PostgreSQL database created
- [x] Prisma migration status verified
- [x] Cryptographic secrets segregated in `.env`
- [x] Nginx configuration created with SSL & security headers
- [x] Public health check endpoint operational (`/api/health`)
- [x] Upload body limit set to 25M
- [x] Daily automated backup script configured
- [x] Rollback plan documented
- [x] Automated test suites passing (86/86)
- [x] TypeScript clean compilation
