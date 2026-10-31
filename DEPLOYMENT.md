# CertVerify – Deployment Notes (Hostinger VPS + MySQL + New Domain)

Maritime STCW certificate verification portal.
React frontend + Node/Express API + **MySQL** (all data **and the certificate PDFs** live in the database).

---

## 1. Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS 4, `motion`, `lucide-react` |
| QR generation (browser) | `qrcode` |
| QR scanning | Browser camera (`getUserMedia`, needs HTTPS) |
| API | Node.js + Express 4 (`server/`) |
| Database | **MySQL 8** (MariaDB 10.6+ also works) via `mysql2` |
| Auth | bcrypt password hashes + JWT (8 h) in `Authorization: Bearer` |
| File upload | `multer` (memory) → stored as `LONGBLOB` in MySQL |
| Certificate PDF generation | `pdfkit` + `qrcode` (server side) |
| Build | `vite build` (frontend) + `esbuild` (bundles API to `server.js`) |
| Process manager | systemd |
| Reverse proxy / TLS | Nginx + Let's Encrypt (certbot) |

Removed: `@google/genai` (unused). `express`, `dotenv`, `tsx` are now used by the server.

**Runtime requirement:** Node **20.19+** (Vite 8). Node 18 cannot build the frontend.

### Request flow
```
Phone/Browser ──HTTPS──► Nginx :443 ──► Node (server.js) :4100 ──► MySQL :3306
                                         ├─ /api/*   JSON API
                                         └─ /*       built React app (dist/) + SPA fallback
```
One Node process serves both the API and the static site. In development Vite serves the UI on `:3000` and proxies `/api` to `:4100`.

---

## 2. Database design

Schema file: [`server/schema.sql`](server/schema.sql) (idempotent, applied by `npm run db:init`).

| Table | Purpose | Notes |
|---|---|---|
| `users` | Admin/issuer accounts | `password_hash` (bcrypt), `role` = `super_admin` \| `issuer`, `status` |
| `certificates` | One row per certificate (all printed fields, incl. `nationality`) | unique `unique_number` (14 digits) and `certificate_id`; status `valid/expiring/revoked/draft`; revocation audit columns; `scan_count`, `last_scanned_at` |
| `certificate_documents` | **The PDF/PNG/JPEG file itself** (`LONGBLOB`) | 1 per certificate (FK, `ON DELETE CASCADE`); `file_name`, `mime_type`, `size_bytes`, `sha256`, `is_generated` (server-made vs uploaded) |
| `scan_logs` | Every public verification | real IP, device (from User-Agent), method (`qr_scan`/`number_lookup`), suspicious flag for unknown numbers |
| `course_templates` | Seeded courses for the generator (code, title, regulation text, approval, validity) | upserted by `db:init` |
| `certificate_defaults` | One row: default signatory + course mode | inserted by `db:init` if missing |
| `portal_settings` | Branding/config key → JSON value | edited from Admin → Settings |

PDFs are in their own table so list queries never load file bytes.

---

## 3. Roles & security model

| Action | Public | Issuer | Super Admin |
|---|:--:|:--:|:--:|
| Verify by number / name, view/download PDF (non-draft) | ✅ | ✅ | ✅ |
| Create / edit / bulk import certificates, upload files | | ✅ | ✅ |
| Revoke, delete certificates | | | ✅ |
| Manage users, edit portal settings | | | ✅ |

- Passwords are bcrypt-hashed; the old "any password works" login is gone.
- Login is rate-limited (10 attempts / 15 min / IP); public lookups 120 / min / IP.
- **Drafts are private** (hidden from public verify and document download).
- Uploads: PDF / PNG / JPEG only, max 10 MB, checked by **file signature**, not just the extension.
- Deactivating a user invalidates their existing token immediately.
- The server **refuses to start in production without a 32+ char `JWT_SECRET`**.
- Staff lookups are not counted as scans.
- New users get a **one-time temporary password** (shown once in the UI). Users change it via `POST /api/admin/me/password` (there is no UI for this yet).

---

## 4. Local development

```bash
# 1. MySQL (pick one)
brew install mysql && brew services start mysql        # or Docker: docker run -d -p 3306:3306 -e MYSQL_ROOT_PASSWORD=root mysql:8
mysql -uroot -e "CREATE DATABASE certverify CHARACTER SET utf8mb4;
  CREATE USER 'certverify'@'localhost' IDENTIFIED BY 'certverify_dev_pw';
  GRANT ALL ON certverify.* TO 'certverify'@'localhost';"

# 2. App
cd Certificate-app-30Oct26     # the folder that contains package.json
cp .env.example .env     # set DB_*, JWT_SECRET, PUBLIC_URL=http://localhost:3000, ALLOW_DEMO_RESET=true
npm install
npm run db:init          # create tables
npm run db:seed          # demo data: 3 users, 6 certificates (+ PDFs), scan logs
npm run server           # API  → http://localhost:4100
npm run dev              # UI   → http://localhost:3000 (proxies /api)
```

Demo logins (password = `SEED_PASSWORD`, default `Admin@12345`):
`admin@ctc.com.pa` (Super Admin), `issuer@ctc.com.pa`, `e.rostova@ctc.com.pa`.
Demo numbers to try: `32625474824291` (valid), `84920173645102` (expiring), `91827364501928` (revoked).

To scan QR codes from a phone in dev, set `PUBLIC_URL=http://<your-LAN-IP>:3000` **before** seeding/creating certificates (the QR inside each PDF is baked in at creation time) and use the Vite `--host` dev script already in `package.json`.

> **Port note:** the API defaults to **4100**. If something else uses it, change `PORT` in `.env` and `API_URL` for Vite (`API_URL=http://localhost:PORT npm run dev`).

### The certificate generator (Admin → Generate Certificate)
- There is no "add certificate" form with dozens of fields. The issuer picks a **course** and fills in only what is specific to the trainee: title, full name, passport, nationality, training dates, mode, location and issue date.
- Everything else comes from **seeded reference data**: company header, address, logos, course wording (STCW/MLC regulation text), approval resolution and dates, validity (5 years), signatory (Claudia Galeano, CTC General Manager) and "REV. 2/2024".
- The **Certificate ID** (`UAG-TC-<yy>-<COURSE>-<nnnnn>`, continuing from the highest existing number for that course and year), the **14-digit number** and the **expiry date** are generated automatically. They can be overridden under *Advanced*.
- *Preview Certificate PDF* shows the result before anything is saved; *Generate Certificate* saves it and offers Open / Download PDF, the QR and the verification link.
- Reference data lives in `server/reference-data.ts` and is written to MySQL by `npm run db:init` (tables `course_templates`, `certificate_defaults`) – **also on production**, because `db:init` is part of every deploy. Course templates are upserted (edit the file, run `db:init`, done); `certificate_defaults` is only inserted when missing, so a later edit in the database (for example a new signatory) is kept.
- To add a course: add a line to `COURSE_TEMPLATES` in `server/reference-data.ts`, then `npm run db:init`.

### The QR link and the public page
- Every certificate PDF carries a QR that encodes `${PUBLIC_URL}/certificate/<14-digit number>` (e.g. `https://browser.seafarersctc.app/certificate/32625474824291`).
- That page shows only: Number Certificate, Participant, Identity (passport), Nacionality, Issued Date, Due Date and a **View Certificate** button (opens the stored PDF). Revoked/expired certificates also get a red notice.
- The generated PDF is an exact reproduction of the approved sample (REV. 2/2024): every position, font size, colour and the signature size come from the sample's own PDF. Fonts: Verdana (regular/bold/bold-italic), Arial Bold and Calibri (REV line). The fonts, logos, frame and signature live in `server/assets/` (fonts in `server/assets/fonts/`) and are read at runtime from the project root, so the service's `WorkingDirectory` must be the app folder.
- **Font licence:** the Verdana and Arial files are Microsoft fonts copied from macOS. They are embedded in the PDFs (as the sample itself does). If your licence does not allow keeping them in the repository, replace the files in `server/assets/fonts/` with your licensed copies under the same names.
- **Watermark:** the diagonal "File Copy - Not an Application" watermark is drawn behind the text when *Admin → Settings → Security Watermark* is on (default).
- Held to is filled from *Held from* + the course duration (days, seeded per course, editable); validity is a 1–10 years selector (default 5); the printed "Valid until" and the public page's Due Date follow it.
- Existing PDFs keep the QR they were created with. After changing `PUBLIC_URL` or the layout run `npm run pdf:regenerate` (uploaded files are never touched). See [REDEPLOY.md](REDEPLOY.md).

### Tests
```bash
# API on :4100 started with:  LOGIN_RATE_MAX=1000 ALLOW_DEMO_RESET=true npm run server
npm run test:api     # 111 checks: auth, roles, CRUD, exact-match lookup, PDF storage/preview, drafts, bulk, users, settings
npm run test:ui      # 49 checks in real Chrome (puppeteer-core): public flows, admin flows, refresh persistence, PDFs
```
⚠️ `test:api` ends by resetting the database to the demo dataset – never point it at production.

---

## 5. Deploying on a Hostinger VPS

Assumptions: Ubuntu 22.04/24.04 VPS (KVM 1 is enough), the portal on the sub-domain `browser.seafarersctc.app` (the QR codes point here), deploy user `deploy`.

### 5.1 DNS
hPanel → VPS → note the **IPv4**. At the domain's DNS add:

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `browser` | `<VPS_IPV4>` | 300 |

(The apex `seafarersctc.app` is untouched, so any existing site there keeps working.) Check: `dig +short browser.seafarersctc.app` returns the VPS IP.

### 5.2 Server hardening
```bash
ssh root@<VPS_IPV4>
apt update && apt upgrade -y
adduser deploy && usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw enable      # after nginx is installed
# /etc/ssh/sshd_config: PermitRootLogin no, PasswordAuthentication no  → systemctl restart ssh
apt install -y fail2ban
```

### 5.3 Install Node, Nginx, MySQL
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs nginx git mysql-server
node -v                      # ≥ 20.19
sudo mysql_secure_installation
```
MySQL must accept the PDFs (they are stored as blobs). Create `/etc/mysql/mysql.conf.d/certverify.cnf`:
```ini
[mysqld]
max_allowed_packet = 64M
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci
bind-address = 127.0.0.1        # never expose 3306 to the internet
```
```bash
sudo systemctl restart mysql
```

### 5.4 Create the database and a least-privilege user
```bash
sudo mysql <<'SQL'
CREATE DATABASE certverify CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'certverify'@'localhost' IDENTIFIED BY 'USE_A_LONG_RANDOM_PASSWORD';
GRANT ALL PRIVILEGES ON certverify.* TO 'certverify'@'localhost';
FLUSH PRIVILEGES;
SQL
```

### 5.5 Get the code, configure, build
```bash
sudo mkdir -p /var/www/certverify && sudo chown deploy:deploy /var/www/certverify
cd /var/www/certverify
git clone <YOUR_REPO_URL> app && cd app      # the folder containing package.json
cp .env.example .env && nano .env
```
`.env` for production:
```ini
NODE_ENV=production
PORT=4100
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=certverify
DB_PASSWORD=<the password from 5.4>
DB_NAME=certverify
JWT_SECRET=<output of: openssl rand -hex 48>
PUBLIC_URL=https://browser.seafarersctc.app   # ← QR codes on every generated PDF point here (no trailing slash)
ALLOW_DEMO_RESET=false
```
```bash
chmod 600 .env
npm ci
npm run db:init                          # create tables
npm run admin:create -- "Your Name" you@example.com 'A-Strong-Password-10+'   # first Super Admin
npm run build                            # → dist/ (frontend) + server.js (API bundle)
```
> **Do not run `db:seed` in production** – it creates demo users with a well-known password and demo certificates.

### 5.6 Run the API as a service
`/etc/systemd/system/certverify.service`
```ini
[Unit]
Description=CertVerify API + web
After=network.target mysql.service

[Service]
User=deploy
WorkingDirectory=/var/www/certverify/app
EnvironmentFile=/var/www/certverify/app/.env
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now certverify
curl -s localhost:4100/api/health        # {"ok":true}
journalctl -u certverify -f              # logs
```

### 5.7 Nginx
`/etc/nginx/sites-available/certverify`
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name browser.seafarersctc.app;

    client_max_body_size 12m;                       # uploads are capped at 10 MB by the API

    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(self)" always;   # QR scanner

    location / {
        proxy_pass http://127.0.0.1:4100;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;   # real client IP in scan logs
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}
```
```bash
sudo ln -s /etc/nginx/sites-available/certverify /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```
The app trusts exactly one proxy hop (`trust proxy 1`), which matches this setup. Do not expose port 4100 publicly (UFW only allows 22/80/443).

### 5.8 HTTPS
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d browser.seafarersctc.app --redirect --agree-tos -m you@example.com --no-eff-email
sudo certbot renew --dry-run
```
HTTPS is mandatory: the camera QR scanner is blocked by browsers on plain HTTP.

### 5.9 Backups (the DB holds everything, including the PDFs)
`/etc/cron.daily/certverify-backup` (`chmod +x`)
```bash
#!/usr/bin/env bash
set -euo pipefail
DIR=/var/backups/certverify; mkdir -p "$DIR"
mysqldump --single-transaction --quick --routines -u certverify -p'DB_PASSWORD' certverify | gzip > "$DIR/certverify-$(date +%F).sql.gz"
find "$DIR" -name 'certverify-*.sql.gz' -mtime +14 -delete
```
Also copy backups off the server (Hostinger snapshots, `rclone`, S3…). Restore: `gunzip -c file.sql.gz | mysql -u certverify -p certverify`.
If you move to many thousands of large files, consider object storage for PDFs; at this scale (≈11 KB per generated PDF) MySQL is fine.

---

## 6. Go-live checklist

- [ ] `https://browser.seafarersctc.app` loads with a valid padlock; `http://` redirects to `https://`
- [ ] `curl https://browser.seafarersctc.app/api/health` → `{"ok":true}`
- [ ] Sign in with the admin you created with `admin:create`
- [ ] Add a certificate (with and without a PDF upload); open its **Verification URL** – it must look like `https://browser.seafarersctc.app/certificate/<14-digit number>`
- [ ] Scan the QR from the downloaded PDF with a phone → lands on the verify page
- [ ] Admin → Dashboard → "Recent Verification Scans" shows your phone's real IP and device
- [ ] `ALLOW_DEMO_RESET=false` and no demo users exist (`SELECT email FROM users;`)
- [ ] First backup file appears in `/var/backups/certverify`
- [ ] Settle on the final domain **before printing** anything – printed QR codes can't be changed

---

## 7. Updating / rollback

```bash
cd /var/www/certverify/app
git pull --ff-only
npm ci
npm run db:init          # safe to re-run; only creates missing tables
npm run build
sudo systemctl restart certverify
```
Rollback: `git checkout <previous-tag>`, `npm ci && npm run build && sudo systemctl restart certverify`. Take a DB backup before any schema change.

---

## 8. API reference (summary)

Public pages (SPA)
- `/admin`, `/admin/certificates`, `/admin/add`, `/admin/users`, `/admin/settings` – admin screens; a refresh stays on the same screen (all served by the SPA fallback, so Nginx needs nothing extra).
- `/certificate/<number>` – the page a QR scan opens (minimal "QR Validity Query" card + View Certificate). The old `/?verify=<number>` links still work.

Public API
- `GET  /api/verify/:id?method=qr_scan|number_lookup` – **exact** match on the full 14-digit number or full certificate ID (no partial/name search; logs a scan)
- `GET  /api/verify/:uniqueNumber/document[?download=1]` – stored PDF/image
- `GET  /api/config` – portal settings + `publicUrl`
- `GET  /api/health`

Auth
- `POST /api/auth/login` · `GET /api/admin/me` · `POST /api/admin/me/password`

Admin (Bearer token)
- `GET/POST /api/admin/certificates` (POST = multipart: `data` JSON + optional `file`; send `courseCode` + trainee fields and the rest is filled from the seeded template; no file → PDF auto-generated with QR)
- `PUT /api/admin/certificates/:id` (auto-generated PDFs are regenerated; uploaded files are kept)
- `POST /api/admin/certificates/:id/document` – replace file
- `GET  /api/admin/generator-config` – course templates + defaults for the generator form
- `POST /api/admin/certificates/preview` – renders the certificate PDF from form values without saving
- `POST /api/admin/certificates/bulk` (≤ 500 rows; per-row errors returned)
- `POST /api/admin/certificates/:id/revoke` · `DELETE /api/admin/certificates/:id` (Super Admin)
- `GET /api/admin/scan-logs`
- `GET/POST /api/admin/users` · `PATCH /api/admin/users/:id/status` (Super Admin)
- `PUT /api/admin/config` (Super Admin) · `POST /api/admin/reset-demo` (Super Admin, only if `ALLOW_DEMO_RESET=true`)

---

## 9. Known gaps / next steps

- **Scan location** is not resolved (stored as "Unknown"); add a GeoIP lookup (e.g. MaxMind) if the dashboard needs cities/countries.
- **No change-password / forgot-password UI** (API exists for change; reset is via `npm run admin:create`, which also resets an existing admin's password).
- **Uploaded PDFs are not parsed:** the number/ID printed on an uploaded file isn't checked against the form fields.
- **The in-page camera scanner** ("Scan QR" button) only shows a camera preview plus demo "simulated scan" buttons; it does not decode QR codes. Real scanning works with the phone's own camera/QR app, which opens the `/certificate/<number>` link. Adding a decoder (e.g. `jsqr` or the `BarcodeDetector` API) would make the button functional.
- Rate limiting is in-memory (single process). Behind several Node instances, move it to Nginx (`limit_req`) or Redis.
- Verified against MariaDB 12.1 locally; the schema sticks to the MySQL 8 / MariaDB common subset. On your VPS, run `npm run db:init` and the API test-suite (against a scratch database) once to confirm on your exact MySQL version.

---

## 10. Troubleshooting

| Symptom | Fix |
|---|---|
| `SyntaxError ... 'styleText'` on build | Node too old → install Node ≥ 20.19 |
| `FATAL: JWT_SECRET must be set` | Set a 32+ char `JWT_SECRET` in `.env` |
| `Cannot connect to MySQL` | Check `DB_*`, `systemctl status mysql`, user grants |
| `Got a packet bigger than 'max_allowed_packet'` | Raise `max_allowed_packet` (5.3) and restart MySQL |
| 413 on upload | Nginx `client_max_body_size` too low |
| All scans show `127.0.0.1` | Nginx isn't sending `X-Forwarded-For`, or `trust proxy` mismatch |
| 429 Too many requests | Rate limits (login 10/15 min, public 120/min per IP) |
| Camera scanner doesn't prompt | Not on HTTPS, or `Permissions-Policy` blocks camera |
| QR in a PDF opens the wrong host | `PUBLIC_URL` was wrong when the PDF was created → fix `.env`, then edit the certificate (auto-generated PDFs regenerate) |
| Blank page on deep link | Request isn't reaching Node (Nginx `location /` must proxy everything) |

```bash
journalctl -u certverify -n 100 --no-pager
sudo nginx -t && sudo systemctl reload nginx
sudo tail -f /var/log/nginx/error.log
mysql -u certverify -p certverify -e "SELECT COUNT(*) FROM certificates; SELECT COUNT(*) FROM certificate_documents;"
```
