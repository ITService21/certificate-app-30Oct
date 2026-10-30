// Browser end-to-end test (puppeteer-core + system Chrome). Needs the stack running and a freshly seeded DB:
//   npm run db:reseed && npm run server   (API on :4100)   +   npm run dev   (UI on :3000)
// Run:  npm run test:ui   (URL=http://host:port, CHROME_PATH=/path/to/chrome to override)
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const S = process.env.TEST_TMP || path.join(os.tmpdir(), 'certverify-ui-test');
fs.mkdirSync(S, { recursive: true });
const SHOTS = `${S}/shots`; const DL = `${S}/downloads`;
fs.rmSync(DL, { recursive: true, force: true }); fs.mkdirSync(SHOTS, { recursive: true }); fs.mkdirSync(DL, { recursive: true });
const URL = process.env.URL || 'http://127.0.0.1:3000';
const API = `${URL}/api`;

let pass = 0, fail = 0; const failures = [];
const ok = (c, n, extra = '') => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; failures.push(n); console.log(`  ✗ ${n} ${extra}`); } };
const section = (t) => console.log(`\n== ${t}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new', args: ['--no-sandbox'], defaultViewport: { width: 1360, height: 900 },
});
const page = await browser.newPage();
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => consoleErrors.push('PAGEERROR ' + e.message));
page.on('dialog', (d) => d.accept());
const cdp = await page.createCDPSession();
await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DL, eventsEnabled: true });

const text = () => page.evaluate(() => document.body.innerText);
const waitText = async (t, timeout = 6000) => {
  try { await page.waitForFunction((x) => document.body.innerText.includes(x), { timeout }, t); return true; } catch { return false; }
};
const clickText = async (selector, label) => {
  const handle = await page.evaluateHandle((sel, l) => {
    return [...document.querySelectorAll(sel)].find((e) => e.innerText && e.innerText.trim().toLowerCase().includes(l.toLowerCase())) || null;
  }, selector, label);
  const el = handle.asElement();
  if (!el) throw new Error(`No <${selector}> containing "${label}"`);
  await el.click();
};
const shot = (n) => page.screenshot({ path: `${SHOTS}/${n}.png` });
const typeInto = async (sel, val) => {
  await page.click(sel);
  await page.$eval(sel, (e) => e.select()); // select all existing text so typing replaces it
  await page.type(sel, val);
};

// ------------------------------------------------------------------
section('A. Public home loads');
await page.goto(URL, { waitUntil: 'networkidle0' });
ok((await text()).includes('CertVerify') || (await text()).toLowerCase().includes('verify'), 'home renders');
ok(!!(await page.$('#certNumber')), 'number input present');
await shot('01-home');

section('B. Verify by number');
await typeInto('#certNumber', '32625474824291');
await page.keyboard.press('Enter');
ok(await waitText('ELBY MATHEW'), 'details page shows trainee ELBY MATHEW');
let t = await text();
ok(/valid/i.test(t), 'shows Valid status');
ok(t.includes('UAG-TC-22-PSCRB-01115'), 'shows certificate ID');
await shot('02-details-valid');

section('C. Minimal QR page: rows + View Certificate opens the stored PDF');
t = await text();
ok(['QR Validity Query', 'Number Certificate', 'Participant', 'Identity', 'Nationality', 'Issued Date', 'Due Date'].every((x) => t.includes(x)), 'shows only the six validity rows');
ok(t.includes('INDIAN') && t.includes('Z6045152') && t.includes('2026-05-15'), 'row values (nationality, identity, issued date)');
ok(!t.includes('Course') && !t.includes('Trainer') && !(await page.$('header')), 'no extra data, no site header');
const viewHref = await page.$eval('a.qr-btn', (a) => a.getAttribute('href'));
ok(viewHref === '/api/verify/32625474824291/document', `View Certificate links to the stored PDF (${viewHref})`);
const pdfRes = await fetch(`${URL}${viewHref}`);
ok(pdfRes.headers.get('content-type') === 'application/pdf' && Buffer.from(await pdfRes.arrayBuffer()).subarray(0, 5).toString() === '%PDF-', 'link returns a real PDF');

section('D. Unknown number -> invalid page');
await page.goto(URL, { waitUntil: 'networkidle0' });
await typeInto('#certNumber', '11223344556677');
await page.keyboard.press('Enter');
ok(await waitText('11223344556677') && !(await text()).includes('ELBY MATHEW'), 'invalid certificate page for unknown number');
await shot('03-invalid');

section('E. Name search -> results -> open');
await page.goto(URL, { waitUntil: 'networkidle0' });
await clickText('button', 'Search by Name');
await page.waitForSelector('#traineeName');
await typeInto('#traineeName', 'maria');
await page.keyboard.press('Enter');
ok(await waitText('MARIA SANTOS'), 'search results list MARIA SANTOS');
await shot('04-search');
await clickText('button', 'View');
ok(await waitText('UAG-TC-25-BRM'), 'opens certificate from search result');

section('F. QR deep links: /certificate/<number> (new) and ?verify= (legacy)');
await page.goto(`${URL}/certificate/32625474824291`, { waitUntil: 'networkidle0' });
ok(await waitText('QR Validity Query') && (await text()).includes('ELBY MATHEW'), '/certificate/<number> opens the validity page');
ok(!(await page.$('a.qr-back')), 'no in-app back link when opened from a QR');
await page.goto(`${URL}/certificate/00000000000000`, { waitUntil: 'networkidle0' });
ok(await waitText('not found'), '/certificate/<unknown> shows not-found page');
await page.goto(`${URL}/?verify=32625474824291`, { waitUntil: 'networkidle0' });
ok(await waitText('ELBY MATHEW'), 'deep link opens certificate directly');
await page.goto(`${URL}/?verify=84920173645102`, { waitUntil: 'networkidle0' });
t = await text();
ok(/expir|valid|revoked/i.test(t) && !t.includes('No certificate selected'), 'second deep link renders a status');

section('G. Admin login');
await page.goto(URL, { waitUntil: 'networkidle0' });
await clickText('button', 'Admin');
await page.waitForSelector('#admin-email');
await typeInto('#admin-email', 'admin@ctc.com.pa');
await typeInto('#admin-password', 'wrong-password-123');
await page.keyboard.press('Enter');
ok(await waitText('Invalid credentials'), 'wrong password shows error toast');
await typeInto('#admin-password', 'Admin@12345');
await page.keyboard.press('Enter');
ok(await waitText('Welcome back'), 'login success toast');
await sleep(600);
t = await text();
ok(/Dashboard/i.test(t), 'dashboard visible');
ok(t.includes('6') , 'dashboard shows data counts');
await shot('05-dashboard');

section('H. Session survives reload');
await page.reload({ waitUntil: 'networkidle0' });
await sleep(800);
await clickText('button', 'Admin Panel');
await sleep(800);
t = await text();
ok(/super admin/i.test(t) && !/Sign In to Console/i.test(t), 'still signed in after reload (token restored from API, no login prompt)');

section('I. Add certificate with PDF upload');
await clickText('button', 'Add Certificate');
await page.waitForSelector('#unique-num');
const uniq = String(Math.floor(1e13 + Math.random() * 9e13));
const certId = `UI-TEST-${Date.now()}`;
const fileInput = await page.$('input[type=file]');
fs.writeFileSync(`${S}/doc.pdf`, Buffer.from(await (await fetch(`${API}/verify/32625474824291/document`)).arrayBuffer()));
await fileInput.uploadFile(`${S}/doc.pdf`);
ok(await waitText('uploaded successfully'), 'file selected toast');
await typeInto('#unique-num', uniq);
await typeInto('#cert-id', certId);
await typeInto('input[placeholder="e.g. ELBY MATHEW"]', 'browser tester');
await shot('06-add-form');
await clickText('button', 'Save & Publish Certificate');
ok(await waitText('Certificate Published'), 'publish success modal');
await shot('07-published');
const apiCert = await (await fetch(`${API}/verify/${uniq}`)).json();
ok(apiCert.traineeName === 'BROWSER TESTER' && apiCert.documentName === 'doc.pdf', `stored in MySQL with uploaded file name (${apiCert.documentName})`);
const docRes = await fetch(`${API}/verify/${uniq}/document`);
ok(docRes.headers.get('content-type') === 'application/pdf' && (await docRes.arrayBuffer()).byteLength === fs.statSync(`${S}/doc.pdf`).size, 'uploaded PDF bytes round-trip through MySQL');

await clickText('button', 'Back to Registry List');
await sleep(500);
section('J. Duplicate is rejected in UI');
await clickText('button', 'Add Certificate');
await page.waitForSelector('#unique-num');
await typeInto('#unique-num', uniq);
await typeInto('#cert-id', 'DUP-' + Date.now());
await typeInto('input[placeholder="e.g. ELBY MATHEW"]', 'dup person');
await clickText('button', 'Save & Publish Certificate');
ok(await waitText('already registered'), 'duplicate number blocked');

section('K. Certificates list, filter, revoke');
await clickText('button', 'Certificates');
ok(await waitText(certId), 'new certificate appears in admin list');
await shot('08-list');
const rowHandle = await page.evaluateHandle((id) => [...document.querySelectorAll('tr')].find((r) => r.innerText.includes(id)), certId);
await (await rowHandle.asElement().$('button[title="Revoke Certificate"]')).click();
await page.waitForSelector('#revoke-notes');
await page.type('#revoke-notes', 'UI test revocation: issued in error');
await shot('09-revoke-modal');
await page.evaluate(() => document.querySelector('#revoke-notes').closest('form').requestSubmit());
ok(await waitText('REVOKED'), 'revocation toast');
const rev = await (await fetch(`${API}/verify/${uniq}`)).json();
ok(rev.status === 'revoked' && rev.revocationNotes.includes('UI test'), 'public API now reports revoked + audit note');

section('L. Public page for revoked certificate');
await page.goto(`${URL}/certificate/${uniq}`, { waitUntil: 'networkidle0' });
ok(await waitText('BROWSER TESTER') && /revoked/i.test(await text()), 'public page shows REVOKED');
await shot('10-public-revoked');

section('M. Delete (super admin)');
await page.goto(URL, { waitUntil: 'networkidle0' });
await sleep(500);
await clickText('button', 'Admin Panel').catch(() => {});
await sleep(500);
await clickText('button', 'Certificates');
await waitText(certId);
const row2 = await page.evaluateHandle((id) => [...document.querySelectorAll('tr')].find((r) => r.innerText.includes(id)), certId);
await (await row2.asElement().$('button[title="Delete Record"]')).click();
ok(await waitText('deleted from database'), 'delete toast');
ok((await fetch(`${API}/verify/${uniq}`)).status === 404, 'record + PDF gone from MySQL');

section('N. Users: invite shows one-time password');
await clickText('button', 'Users');
await sleep(400);
await clickText('button', 'Invite');
await page.waitForSelector('input[placeholder="e.g. Sofia Delgado"]');
const mail = `ui.${Date.now()}@ctc.com.pa`;
await page.type('input[placeholder="e.g. Sofia Delgado"]', 'UI Officer');
await page.type('input[type=email]', mail);
await shot('11-invite');
await page.evaluate(() => document.querySelector('input[type=email]').closest('form').requestSubmit());
ok(await waitText('One-time temporary password'), 'temporary password banner shown');
await shot('12-temp-password');
ok((await text()).includes(mail), 'new user listed');

section('O. Settings persist');
await clickText('button', 'Settings');
await sleep(400);
await page.evaluate(() => document.querySelector('form').requestSubmit());
ok(await waitText('saved successfully'), 'settings saved toast');

section('P. Logout');
await page.click('button[title="Sign Out"]');
ok(await waitText('logged out'), 'logout toast');
await page.reload({ waitUntil: 'networkidle0' });
ok(!/super admin/i.test(await text()), 'session gone after logout + reload');
ok((await page.evaluate(() => localStorage.getItem('certverify_token'))) === null, 'token cleared from storage');
ok((await page.evaluate(() => localStorage.getItem('certverify_certificates'))) === null, 'no certificate data in localStorage');

section('Q. Browser console');
const relevant = consoleErrors.filter((e) => !/favicon|Failed to load resource.*(401|404)/.test(e));
ok(relevant.length === 0, `no unexpected console errors${relevant.length ? ': ' + relevant.slice(0, 3).join(' | ') : ''}`);

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
if (fail) { console.log('FAILED:\n - ' + failures.join('\n - ')); process.exit(1); }
