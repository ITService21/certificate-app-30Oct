import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import type { Certificate } from '../src/types';
import { pool } from './db';

/*
 * Official certificate layout, reproduced from the approved sample ("stanley cardozo SHIPS COOK.pdf", REV. 2/2024).
 * Every coordinate below is the sample's own (PDF points, origin bottom-left, page 842 x 595.5):
 *  - fonts: Verdana / Verdana Bold / Verdana Bold Italic, Arial Bold (signatory title), Calibri (REV line)
 *  - colours: black text, company name pure blue, e-mail link #055FC1, rules rgb(0,128,191)
 *  - each text line keeps the horizontal centre it has in the sample, so the sample's own data lands on the sample's own x.
 */

const PAGE_W = 842;
const PAGE_H = 595.5;
const BLUE = '#0000FF';
const LINK = '#055FC1';
const RULE = '#0080BF';
const BLACK = '#000000';

const REVISION = 'REV. 2/2024';
const ADDRESS = 'PH BICSA Financial Center, Floor 44, Office No.4406, Balboa Avenue and Aquilino de la Guardia, Panama Rep. Of Panama';
const EMAIL = 'info@ctc.com.pa';
const WEBSITE = 'www.ctc.com.pa';

const assetsDir = resolve(process.cwd(), 'server/assets');
const file = (name: string) => readFileSync(resolve(assetsDir, name));
const FONT_FILES = {
  V: 'fonts/Verdana.ttf',
  VB: 'fonts/Verdana-Bold.ttf',
  VBI: 'fonts/Verdana-BoldItalic.ttf',
  AB: 'fonts/Arial-Bold.ttf',
  CAL: 'fonts/Calibri-REV.ttf',
} as const;
type FontKey = keyof typeof FONT_FILES;
const fontData = Object.fromEntries(Object.entries(FONT_FILES).map(([k, f]) => [k, file(f)])) as Record<FontKey, Buffer>;
const images = { frame: file('frame.png'), ctc: file('ctc-logo.jpg'), uag: file('uag-seal.jpg'), signature: file('signature.jpg') };

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const ordinal = (n: number) => {
  const v = n % 100;
  if (v >= 11 && v <= 13) return 'th';
  return ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
};
const parts = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? { y: m[1], month: MONTHS[Number(m[2]) - 1], d: Number(m[3]) } : { y: iso, month: '', d: 0 };
};
const NUMBER_WORDS = ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN'];

interface Seg { t: string; f: FontKey; s: number; sx?: number; cs?: number; color?: string; ul?: [number, number] }
const seg = (t: string, f: FontKey, s: number, sx = 1, extra: Partial<Seg> = {}): Seg => ({ t, f, s, sx, ...extra });

const UL8: [number, number] = [1.2, 0.5];
/** "March 02" + small "nd," + year: the way the sample prints training dates. */
const heldDate = (iso: string, last = false): Seg[] => {
  const p = parts(iso);
  return [
    seg(`${p.month} ${String(p.d).padStart(2, '0')}`, 'V', 8, 1.049, { ul: UL8 }),
    seg(ordinal(p.d), 'V', 6.5, 1.03, { ul: UL8 }),
    seg(', ', 'V', 5.5, 1.036, { ul: UL8 }),
    seg(`${p.y} `, 'V', 8, 1.049, { ul: UL8 }),
  ].slice(0, last ? 4 : 4);
};

/** `cs`: extra character spacing (pt) that reproduces the sample's per-line word spacing. */
interface Line { y: number; x0: number; cs?: number; segs: (c: Certificate) => Seg[] }

/** Lines whose content depends on the certificate (everything else is drawn from fixed text below). */
const LINES: Record<string, Line> = {
  company: { y: 437.8, x0: 290.42, segs: () => [seg('CONTINENTAL TRAINING CENTER S.A.', 'VBI', 12.5, 1, { color: BLUE })] },
  uag: { y: 425.1, x0: 344.45, segs: () => [seg('UNITED ALLIANCE GROUP LTD', 'VBI', 9.5, 1, { color: BLUE })] },
  address: { y: 408.8, x0: 210.02, cs: 0.0597, segs: () => [seg(`${ADDRESS} `, 'VB', 6, 1.029)] },
  email: {
    y: 391.7, x0: 332.45, cs: 0.021,
    segs: () => [
      seg('E:mail: ', 'VB', 6, 1.029),
      seg(`${EMAIL} `, 'VB', 6, 1.029, { color: LINK, ul: [1.01, 0.6] }),
      seg(`, Web Page: ${WEBSITE} `, 'VB', 6, 1.029),
    ],
  },
  certify: { y: 364.5, x0: 402.45, cs: -0.077, segs: () => [seg('Certify that: ', 'V', 8, 1.049)] },
  name: { y: 343, x0: 377.95, cs: 0.015, segs: (c) => [seg(`${c.traineeTitle} ${c.traineeName} `, 'VB', 8.5, 1.042, { ul: [1.51, 0.9] })] },
  passport: {
    y: 325.2, x0: 385.65, cs: 0.04,
    segs: (c) => [seg('Passport No: ', 'VB', 7, 1.05), seg(`${c.passportNumber} `, 'V', 7, 1.028, { ul: [1.0, 0.4] })],
  },
  has: { y: 300.6, x0: 327.65, cs: 0.081, segs: () => [seg('Has successfully completed the training course ', 'VB', 8, 1)] },
  course: { y: 277.6, x0: 391.45, cs: -0.054, segs: (c) => [seg(`${c.courseTitle.toUpperCase()} `, 'VB', 11, 1)] },
  fulfills: { y: 255.9, x0: 342.85, cs: -0.111, segs: () => [seg('The course fulfills minimum requirements of ', 'V', 8, 1.049)] },
  approved: {
    y: 206, x0: 181.73, cs: -0.055,
    segs: (c) => {
      const authority = (c.approvalAuthority.split(',')[0] || '').replace(/^\s*Government of\s+/i, '').toUpperCase();
      const no = c.approvalResolution.replace(/^\s*Resolution\s+No\.?\s*/i, '');
      return [
        seg(`This course has been approved by the Government of ${authority}`, 'V', 8, 1.049),
        seg(', ', 'VB', 8, 1.044),
        seg('by means of Resolution No.', 'V', 8, 1.049),
        seg(' ', 'V', 8, 1.031, { ul: [1.2, 0.5] }),
        seg(no, 'V', 8, 1.049, { ul: [1.2, 0.5] }),
        seg(' dated ', 'V', 8, 1.049),
      ];
    },
  },
  approvalDates: {
    y: 189.2, x0: 321.45, cs: -0.074,
    segs: (c) => {
      const a = parts(c.approvalDate), b = parts(c.approvalValidUntil);
      return [
        seg('On ', 'V', 8, 1.049),
        seg(`${a.month} ${String(a.d).padStart(2, '0')}`, 'V', 8, 1.049, { ul: UL8 }),
        seg(`${ordinal(a.d)} `, 'V', 6.5, 1.03, { ul: UL8 }),
        seg(`, ${a.y}`, 'V', 8, 1.049, { ul: UL8 }),
        seg(' and Valid until ', 'V', 8, 1.049),
        seg(`${b.month} ${b.d}`, 'V', 8, 1.049, { ul: UL8 }),
        seg(`${ordinal(b.d)} `, 'V', 6.5, 1.03, { ul: UL8 }),
        seg(`,${b.y} `, 'V', 8, 1.049, { ul: UL8 }),
      ];
    },
  },
  held: {
    y: 172, x0: 233.33, cs: -0.099,
    segs: (c) => [
      seg('Held from ', 'VB', 8, 1.044),
      ...heldDate(c.trainingStartDate),
      seg('to ', 'VB', 8, 1.044),
      ...heldDate(c.trainingEndDate),
      seg('Course Mode: ', 'VB', 8, 1.044),
      seg(`${c.trainingMode} `, 'V', 8, 1.049, { ul: UL8 }),
      seg('Conducted at ', 'VB', 8, 1.044),
      seg(`${c.trainingLocation.toUpperCase()} `, 'V', 8, 1.049, { ul: UL8 }),
    ],
  },
  issued: {
    y: 154.8, x0: 268.52, cs: -0.005,
    segs: (c) => {
      const i = parts(c.issueDate), e = parts(c.expiryDate);
      return [
        seg('This certificate was issued on ', 'VB', 8, 1.044),
        seg(`${i.month} ${String(i.d).padStart(2, '0')}`, 'V', 8, 1.049, { ul: UL8 }),
        seg(`${ordinal(i.d)}, `, 'V', 6.5, 1.03, { ul: UL8 }),
        seg(`${i.y}, `, 'V', 8, 1.049, { ul: UL8 }),
        seg('Valid until ', 'VB', 8, 1.044),
        seg(`${e.month} ${e.d}`, 'V', 8, 1.049, { ul: UL8 }),
        seg(`${ordinal(e.d)}, `, 'V', 6.5, 1.03, { ul: UL8 }),
        seg(`${e.y} `, 'V', 8, 1.049, { ul: UL8 }),
      ];
    },
  },
  validity: {
    y: 131.7, x0: 327.85, cs: -0.063,
    segs: (c) => [seg(`(THIS CERTIFICATE IS VALID FOR ${NUMBER_WORDS[c.validityYears] ?? c.validityYears} (${c.validityYears}) YEAR ) `, 'V', 8, 1.049, { ul: [1.19, 0.5] })],
  },
  signName: { y: 42.5, x0: 355.65, segs: (c) => [seg(`${c.signatoryName} `, 'VB', 7.5, 1.046)] },
  signTitle: { y: 24.8, x0: 342.75, segs: (c) => [seg(c.signatoryTitle, 'AB', 9, 1)] },
};

// The sample certificate: used only to find each line's centre.
const SAMPLE = {
  traineeTitle: 'Mr.', traineeName: 'STANLEY CARDOZO', passportNumber: 'Z4326490', courseTitle: "SHIP'S COOK",
  approvalResolution: 'Resolution No. DGGM-CFM-005-2024', approvalAuthority: 'Government of Panama, Directorate General of Merchant Marine',
  approvalDate: '2024-02-06', approvalValidUntil: '2026-06-12', trainingStartDate: '2026-03-02', trainingEndDate: '2026-03-06',
  trainingMode: 'Presential', trainingLocation: 'AZERBAIJAN', issueDate: '2026-03-08', expiryDate: '2031-03-06', validityYears: 5,
  signatoryName: 'Claudia Galeano', signatoryTitle: 'CTC General Manager',
} as Certificate;

// Watermark tuning (edit here), measured from the original: letters follow the diagonal, copies repeat every
// WM_PITCH pt along it, at font size WM_FONT_SIZE.
const WM_TEXT = 'File Copy - Not an Application'; // edit the wording here
const WM_COLOR = '#A8A8A8';
const WM_ANGLE = 30.5; // degrees, anticlockwise
const WM_PITCH = 302; // pt between the starts of consecutive copies along the diagonal
const WM_FONT_SIZE = 16.9; // pt, watermark font size (was 21.9)
const WM_STEM = 120; // degrees, anticlockwise from the text direction, at which the letter strokes stand (90 = upright)
const WM_BLUR = 0.4; // pt, softness of the edge; 0 = sharp
const WM_PASS_OPACITY = 0.22;
const REG_LINES_Y = [240.6, 223.5];
const REG_X0 = [189.02, 309.75];
const REG_MAX_WIDTH = 512;
const SAMPLE_REG = 'According to Maritime Labor Convention, 2006 and Resolution ADM No. 068-2013, Regulation 3.2, Standard A3. and Guideline B3.2 of Maritime Labour Convention';

export async function generateCertificatePdf(cert: Certificate, baseUrl: string, opts: { watermark?: boolean } = {}): Promise<Buffer> {
  // Admin -> Settings -> "Security Watermark" switches the "File Copy" watermark on/off (default: on).
  let showWatermark = opts.watermark;
  if (showWatermark === undefined) {
    const [wm] = await pool.query<any[]>("SELECT config_value FROM portal_settings WHERE config_key = 'showWatermark'");
    showWatermark = !wm.length || JSON.parse(wm[0].config_value) !== false;
  }
  const qr = await QRCode.toBuffer(`${baseUrl}/certificate/${cert.uniqueNumber}`, { width: 232, margin: 2, errorCorrectionLevel: 'M' });

  const doc = new PDFDocument({
    size: [PAGE_W, PAGE_H],
    margin: 0,
    info: { Title: `${cert.certificateId} - ${cert.traineeName}`, Author: 'Continental Training Center S.A.' },
  });
  const chunks: Buffer[] = [];
  doc.on('data', (c) => chunks.push(c));
  const done = new Promise<Buffer>((resolveDone) => doc.on('end', () => resolveDone(Buffer.concat(chunks))));
  for (const k of Object.keys(FONT_FILES) as FontKey[]) doc.registerFont(k, fontData[k]);

  const width = (s: Seg) => (doc.font(s.f).fontSize(s.s).widthOfString(s.t) + (s.cs ?? 0) * s.t.length) * (s.sx ?? 1);
  const total = (segs: Seg[]) => segs.reduce((a, s) => a + width(s), 0);
  const fy = (y: number) => PAGE_H - y; // PDF baseline y -> pdfkit top-origin y

  const drawSegs = (segs: Seg[], x: number, y: number) => {
    segs.forEach((s, i) => {
      const w = width(s);
      doc.font(s.f).fontSize(s.s).fillColor(s.color ?? BLACK)
        .text(s.t, x, fy(y), { lineBreak: false, baseline: 'alphabetic', horizontalScaling: (s.sx ?? 1) * 100, characterSpacing: s.cs ?? 0 } as any);
      if (s.ul) {
        // underline runs under the text; trailing spaces are underlined too unless the segment ends the line
        const trimmed = i === segs.length - 1 ? s.t.replace(/\s+$/, '') : s.t;
        const uw = i === segs.length - 1 ? width({ ...s, t: trimmed }) : w;
        doc.rect(x, fy(y - s.ul[0]) - s.ul[1], uw, s.ul[1]).fill(s.color ?? BLACK);
      }
      x += w;
    });
  };
  /** Draw a line centred on the centre it has in the sample. */
  const drawLine = (line: Line, c: Certificate, yOverride?: number) => {
    const withCs = (segs: Seg[]) => segs.map((s) => ({ ...s, cs: line.cs ?? 0 }));
    const sampleSegs = withCs(line.segs(SAMPLE));
    const cx = line.x0 + total(sampleSegs) / 2;
    const segs = withCs(line.segs(c));
    drawSegs(segs, cx - total(segs) / 2, yOverride ?? line.y);
  };

  // 1. page frame (raster from the sample)
  // raster border box is mapped onto the sample's: x 49.5..791.5, y 39.5..579.5 (top-origin pt)
  doc.image(images.frame, 44.6, 35.0, { width: 753.31, height: 549.5 });

  // 3. blue rules
  doc.lineWidth(2.88).lineJoin('round').strokeColor(RULE);
  doc.moveTo(78.878, fy(530.84)).lineTo(770.15, fy(530.84)).stroke();
  doc.moveTo(81.038, fy(417.6)).lineTo(772.31, fy(417.6)).stroke();

  // 4. logos, signature, QR
  doc.image(images.ctc, 116.08, fy(449 + 75.96), { width: 81.715, height: 75.96 });
  doc.image(images.uag, 659.16, fy(454.88 + 70.08), { width: 75.955, height: 70.08 });
  if (/claudia\s+galeano/i.test(cert.signatoryName)) {
    doc.image(images.signature, 291.26, 515.2, { width: 210.23, height: 52 });
  }
  // QR and its number sit fully inside the dotted border (original copy)
  doc.image(qr, 694.76, 493.3, { width: 69, height: 69 });

  // watermark: drawn after the logos/QR/signature images (their white backgrounds would otherwise cut it), before the text
  if (showWatermark) {
    doc.save();
    doc.rect(0, 0, PAGE_W, PAGE_H).clip(); // crosses the dotted border, stops at the page edge
    doc.fillColor(WM_COLOR).font('Helvetica'); // the slant comes from WM_STEM
    const text = WM_TEXT;
    const rad = (WM_ANGLE * Math.PI) / 180;
    const size = WM_FONT_SIZE;
    doc.fontSize(size);
    for (let j = -3; j <= 4; j++) {
      for (let i = -2; i <= 4; i++) {
        const x = 43.3 + WM_PITCH * Math.cos(rad) * i, y = 218.3 + WM_PITCH * Math.sin(rad) * j;
        // only whole copies: skip one whose rotated text would run past the page edge (no cut-off fragments)
        const run = doc.widthOfString(text), rise = size * 0.8;
        if (x < 0 || x + run * Math.cos(rad) + rise * 0.5 > PAGE_W || y - run * Math.sin(rad) - rise * 0.87 < 0 || y + size * 0.25 > PAGE_H) continue;
        // a few faint, slightly offset passes give the soft edge; letters follow the diagonal (no per-letter turn)
        // slant the upright letters so their strokes stand WM_STEM degrees anticlockwise from the text direction
        const shear = -1 / Math.tan((WM_STEM * Math.PI) / 180);
        doc.save().rotate(-WM_ANGLE, { origin: [x, y] }).transform(1, 0, shear, 1, -shear * y, 0);
        for (const [dx, dy] of [[0, 0], [WM_BLUR, 0], [-WM_BLUR, 0], [0, WM_BLUR], [0, -WM_BLUR]]) {
          doc.opacity(WM_PASS_OPACITY).text(text, x + dx, y + dy, { lineBreak: false });
        }
        doc.restore();
      }
    }
    doc.restore();
  }


  // 5. text
  const idSeg = seg(cert.certificateId, 'VB', 7, 1.05);
  drawSegs([idSeg], 763.9 - width(idSeg), 541.9);
  for (const key of ['company', 'uag', 'address', 'email', 'certify', 'name', 'passport', 'has']) drawLine(LINES[key], cert);

  // course title: shrink only if it would not fit inside the frame
  const courseLine = LINES.course;
  const courseSegs = courseLine.segs(cert);
  const fit = Math.min(1, 660 / total(courseSegs));
  if (fit < 1) {
    const small = courseSegs.map((s) => ({ ...s, s: s.s * fit }));
    const cx = courseLine.x0 + total(courseLine.segs(SAMPLE)) / 2;
    drawSegs(small, cx - total(small) / 2, courseLine.y);
  } else {
    drawLine(courseLine, cert);
  }

  drawLine(LINES.fulfills, cert);

  // regulation text: wrapped like the sample (max width), each line centred on the sample's centres
  const words = cert.stcwRegulation.trim().split(/\s+/);
  const regLines: string[] = [];
  let cur = '';
  const REG_CS = [-0.0625, 0.017];
  const regSeg = (t: string, i = 0) => seg(`${t} `, 'VB', 8, 1.044, { cs: REG_CS[Math.min(i, 1)] });
  const regW = (t: string, i = 0) => width(regSeg(t, i));
  for (const w of words) {
    if (cur && regW(`${cur} ${w}`) > REG_MAX_WIDTH) { regLines.push(cur); cur = w; } else cur = cur ? `${cur} ${w}` : w;
  }
  if (cur) regLines.push(cur);
  const sampleReg: string[] = [];
  { let sc = ''; for (const w of SAMPLE_REG.split(' ')) { if (sc && regW(`${sc} ${w}`) > REG_MAX_WIDTH) { sampleReg.push(sc); sc = w; } else sc = sc ? `${sc} ${w}` : w; } if (sc) sampleReg.push(sc); }
  regLines.slice(0, 3).forEach((t, i) => {
    const k = Math.min(i, 1);
    const cx = REG_X0[k] + regW(sampleReg[k] ?? t, k) / 2;
    const y = REG_LINES_Y[0] - 17.1 * i;
    const s = regSeg(t, i);
    drawSegs([s], cx - width(s) / 2, y);
  });

  // with a single regulation line the block below moves up one line, so the gaps stay as tight as in the original
  const lift = regLines.length === 1 ? 17.1 : 0;
  for (const key of ['approved', 'approvalDates', 'held', 'issued', 'validity']) drawLine(LINES[key], cert, LINES[key].y + lift);

  // footer
  drawSegs([seg(`${REVISION} `, 'CAL', 8.5, 1)], 76.3, 36.2);
  drawLine(LINES.signName, cert);
  doc.lineWidth(0.96).strokeColor(BLACK).moveTo(302.9, fy(53.4)).lineTo(478.09, fy(53.4)).stroke();
  drawLine(LINES.signTitle, cert);
  const num = seg(cert.uniqueNumber, 'V', 6.5, 1);
  drawSegs([num], 729.26 - width(num) / 2, 24);

  doc.end();
  return done;
}
