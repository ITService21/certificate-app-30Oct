# CertVerify – Redeployment Guide (update an already-live production)

Use this when the portal is **already running on the Hostinger VPS** and you are shipping the changes below.
First-time install is in [DEPLOYMENT.md](DEPLOYMENT.md).

## What changed in this release

| # | Change | Needs on the server |
|---|---|---|
| 1 | Certificate PDF rebuilt to match the official CTC layout (dotted frame, both logos, signature, QR bottom-right) | new files in `server/assets/`, `npm run pdf:regenerate` |
| 2 | QR now encodes `https://browser.seafarersctc.app/certificate/<number>` (was `…/?verify=<number>`) | `PUBLIC_URL` in `.env`, DNS + Nginx + HTTPS for the new host name |
| 3 | Scanning opens a minimal **QR Validity Query** page (6 rows + *View Certificate*), responsive for phones | frontend rebuild |
| 4 | New `certificates.nationality` column (shown on that page, editable in Admin → Add/Edit) | `npm run db:init` (adds the column; additive, no data loss) |
| 5 | New command `npm run pdf:regenerate` | – |
| 6 | Refreshing the admin panel keeps you on the same screen (`/admin`, `/admin/certificates`, …) instead of the public page | frontend rebuild only |
| 7 | Public lookup is **exact match** only (full 14-digit number or full certificate ID); **Search by Name removed** (`/api/search` no longer exists) | rebuild + restart |
| 8 | **Add Certificate form replaced by a Certificate Generator**: pick a course, enter only trainee details; company text, course wording, approval, signatory, ID, number, expiry and QR are automatic. Preview / Open / Download PDF | rebuild + restart + `db:init` |
| 10 | PDF is now an **exact reproduction of the sample** (Verdana fonts, exact positions/colours/signature size, frame image) with the diagonal "File Copy - Not an Application" watermark (Settings toggle) | deploy `server/assets/` incl. `fonts/`, rebuild, `pdf:regenerate` |
| 11 | Generator: *Course duration (days)* auto-fills *Held to*; *Certificate validity (years)* selector (default 5) | `db:init` adds `course_templates.duration_days` |
| 12 | Public QR page re-measured to the reference (sizes/spacing), "Verify another certificate" link removed; **View Certificate now opens the certificate inline below the button** (no new tab) in a scrollable pdf.js viewer; PDF header rule and signature rule moved to match the original | `npm install` (new dependency `pdfjs-dist`), rebuild, `pdf:regenerate` |
| 13 | Nacionality is a searchable dropdown (192 nationalities, new table `nationalities`, endpoint `GET /api/admin/nationalities`); PDF frame now shows the full dotted border incl. bottom, watermark kept inside it, signature/lines re-positioned to match the original | `npm run db:init`, rebuild, restart, `pdf:regenerate` |
| 14 | Admin login now lasts **7 days** (was 8 hours); optional `JWT_EXPIRES_IN` in `.env` (default `7d`). Watermark crosses the dotted border again | restart (and `pdf:regenerate`) |
| 9 | Seeded reference data on production: new tables `course_templates` (7 courses incl. Ship's Cook) and `certificate_defaults` (signatory) | `npm run db:init` |

Old printed/shared links `…/?verify=<number>` **keep working** as long as the old host still reaches this app.

> Existing PDFs are stored in MySQL with the **old QR baked in**. Step 8 regenerates the auto-generated ones. PDFs that were *uploaded* by an admin are never modified; re-upload a new file for those if they must carry the new QR.

---

## 0. Before you start (5 min)

- DNS access for `seafarersctc.app`, SSH access to the VPS as `deploy`.
- Decide the final public URL: **`https://browser.seafarersctc.app`** (no trailing slash). Printed QR codes can't be changed later.
- Never run `db:seed`, `db:reseed` or `npm run test:api` on production (they wipe/overwrite data).

## 1. DNS – add the new host name

At the DNS provider for `seafarersctc.app`:

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `browser` | `<VPS_IPV4>` | 300 |

Check from your laptop: `dig +short browser.seafarersctc.app` → the VPS IP. (Don't proceed to HTTPS until this resolves.)

## 2. Back up the database

```bash
ssh deploy@<VPS_IPV4>
mkdir -p ~/backups
mysqldump --single-transaction --quick --routines -u certverify -p certverify | gzip > ~/backups/pre-release-$(date +%F-%H%M).sql.gz
ls -lh ~/backups | tail -2          # must not be 0 bytes
```

## 3. Get the new code

```bash
cd /var/www/certverify/app           # the folder with package.json
git status                           # anything modified on the server? note it / stash it
git pull --ff-only                   # or: git fetch && git checkout <release-tag>
ls server/assets server/assets/fonts   # must list ctc-logo.jpg uag-seal.jpg signature.jpg frame.png and fonts/ (Verdana*.ttf, Arial-Bold.ttf, Calibri-REV.ttf)
node -v                              # must be ≥ 20.19
npm ci
```
If you deploy by copying files instead of git, copy the whole project **including `server/assets/` (with `fonts/`), `public/ctc-logo.png` and `public/eye-open.png`** (not `node_modules`, `.env` or `dist`).

## 4. Update `.env`

```bash
nano .env
```
```ini
PUBLIC_URL=https://browser.seafarersctc.app
```
Keep everything else (DB_*, JWT_SECRET, `ALLOW_DEMO_RESET=false`). If the old domain was different, this is the only line that changes.

## 5. Add the host name to Nginx + HTTPS

Edit `/etc/nginx/sites-available/certverify` and make `server_name` include the new name. Keep the old name too, so existing QR links still land:

```nginx
server_name browser.seafarersctc.app <old-domain> www.<old-domain>;
```
Then get a certificate that covers the new name and reload:
```bash
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx --expand -d browser.seafarersctc.app -d <old-domain> -d www.<old-domain> --redirect
```
(Fresh server block instead? Copy the existing one, change `server_name`, run `sudo certbot --nginx -d browser.seafarersctc.app --redirect`.)

Optional – once the new URL is confirmed, send the old domain to the new one (the path and `?verify=` query are preserved, and the app still understands them):
```nginx
server {
    listen 443 ssl;                       # certbot manages the ssl_certificate lines
    server_name <old-domain> www.<old-domain>;
    return 301 https://browser.seafarersctc.app$request_uri;
}
```

## 6. Migrate the database (adds `nationality`)

```bash
npm run db:init
# expected: "Added column certificates.nationality", "Reference data ready (course templates, certificate defaults).", "Schema ready (7 statements applied)."
```
Safe to re-run; on a second run it only prints "Schema ready".

## 7. Build and restart

```bash
npm run build                        # → dist/ (frontend) + server.js (API)
sudo systemctl restart certverify
sudo systemctl status certverify --no-pager | head -5
curl -s localhost:4100/api/health    # {"ok":true}
```

## 8. Regenerate the PDFs (new layout + new QR)

```bash
npm run pdf:regenerate -- --dry-run  # lists every certificate and the URL its QR will carry
npm run pdf:regenerate               # does it (≈ 1 s per 20 certificates; the site stays up)
```
Check the first lines of the output: `QR base URL = https://browser.seafarersctc.app`. If it prints anything else, stop and fix `PUBLIC_URL`.

## 8b. Watermark and Courses (new behaviour)

- The "File Copy - Not an Application" watermark is now added **only when the public page shows the certificate** ("View Certificate"). Stored PDFs, the Download button and the admin's own view are clean, so `npm run pdf:regenerate` (step 8) is **required** once to remove the watermark that older stored PDFs have baked in.
- Courses are managed in **Admin → Courses** (Super Admin): add, edit, hide or delete. `npm run db:init` only seeds the 7 starter courses into an **empty** table; it never restores a deleted course or overwrites an edited one. The Generate Certificate course field is now a searchable list.

- **Set the course list to the 8 official courses** (Ship's Cook, Survival Craft, Advanced Fire Fighting, Basic Training for Oil and Chemical Tanker Cargo Operations, Able Seafarer Deck, Able Seafarer Engine, Ratings Forming Part of an Engineering Watch / a Navigational Watch):
  ```bash
  npm run courses:sync     # safe to re-run
  ```
  It adds the missing courses, applies the official regulation wording to Survival Craft (only if still the old seeded text) and **removes the 4 retired first-seed courses (MFA, BRM, BST, ECDIS)**. Certificates already issued keep their printed wording. Courses the admin added or edited are never changed or removed. No rebuild or restart is needed. A line break (Enter) in a course's regulation wording is kept on the printed certificate.

## 9. Seeded course data & first-use notes

- `db:init` (step 6) already created and filled the course templates and the default signatory on production. Check: `mysql -u certverify -p certverify -e "SELECT code, title FROM course_templates; SELECT * FROM certificate_defaults;"`.
- The **approval validity printed on the certificates** ("Valid until June 12th, 2026" for the DGGM resolution) comes from the course. When the authority renews it, open **Admin → Courses → ✏️ Edit** and change *Approval valid until* (no deploy needed). Certificates already issued keep the dates they were printed with.
- The automatic Certificate ID continues from the highest existing `UAG-TC-<yy>-<COURSE>-<nnnnn>` already in the database, so existing numbering (e.g. …-COOK-00661) is respected. IDs imported with a different pattern are ignored for the counter.

## 9b. Fill in nationality for existing certificates

The new column is empty for old records (the public page shows `N/A`). Either:
- Admin → Certificates → ✏️ Edit → *Nacionality* (saving regenerates the PDF automatically), or
- bulk, then re-run `npm run pdf:regenerate`:
  ```sql
  UPDATE certificates SET nationality = 'INDIAN' WHERE passport_number IN ('…');
  ```

## 10. Verify (10 min)

- [ ] `https://browser.seafarersctc.app/` loads with a padlock; `http://` redirects to `https://`
- [ ] `https://browser.seafarersctc.app/certificate/<a real 14-digit number>` shows the **QR Validity Query** card: Number Certificate, Participant, Identity, Nacionality, Issued Date, Due Date, *View Certificate* – and no header/footer
- [ ] *View Certificate* opens the PDF; it shows the new layout
- [ ] Open a regenerated PDF and **scan its QR with a phone** → lands on the page above (not on an old domain)
- [ ] Old link `https://<old-domain>/?verify=<number>` still opens the certificate (or redirects to the new host)
- [ ] Phone check at 390 px width: no sideways scrolling, rows readable
- [ ] Admin login works; sidebar says **Generate Certificate**; the Course dropdown lists the 7 seeded courses (incl. SHIP'S COOK)
- [ ] Dashboard → *Recent Verification Scans* shows your phone scan
- [ ] Home page has no "Search by Name"; entering part of a number or ID gives "not found"
- [ ] Log in to Admin, go to Certificates, press **refresh (F5)** → you stay on Certificates (URL `/admin/certificates`)
- [ ] Generate Certificate → pick *SHIP'S COOK*, enter name / passport / dates / location only → **Preview Certificate PDF** shows the full official layout → **Generate Certificate** → Certificate ID like `UAG-TC-26-COOK-00662` was filled in automatically, QR scans to the new URL
- [ ] An unknown number (`/certificate/00000000000000`) shows "not found"
- [ ] `journalctl -u certverify -n 50 --no-pager` has no errors

## Rollback

```bash
cd /var/www/certverify/app
git checkout <previous-tag-or-commit>
npm ci && npm run build && sudo systemctl restart certverify
```
- The extra `nationality` column is harmless to the old code – leave it.
- PDFs already regenerated keep the new layout/QR. To get the old ones back, restore the pre-release dump:
  `gunzip -c ~/backups/pre-release-….sql.gz | mysql -u certverify -p certverify` (this also reverts any data entered since the backup – take a fresh dump first).
- Put `PUBLIC_URL` back in `.env` and restart if you also need the old QR host.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| QR opens the wrong host | `PUBLIC_URL` wrong when the PDF was made → fix `.env`, restart, `npm run pdf:regenerate` |
| `ENOENT … server/assets/fonts/Verdana.ttf` (or another asset) on create/regenerate | `server/assets/` not deployed, or the service `WorkingDirectory` isn't the app folder |
| `Unknown column 'nationality'` | `npm run db:init` was skipped |
| New page shows the old site header / old layout | Browser cache, or `npm run build` skipped → rebuild and hard-refresh |
| `/certificate/<n>` returns 404 from Nginx | `location /` must proxy everything to Node (SPA fallback lives in the app) |
| Certbot says the name doesn't resolve | DNS A record for `browser` not propagated yet (step 1) |
| Uploaded PDFs still show the old QR | Expected – only auto-generated PDFs are regenerated; re-upload a new file |
