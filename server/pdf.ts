import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import type { Certificate } from '../src/types';

const BLUE_RULE = '#0A8FCB';
const BRAND_BLUE = '#0000FF';
const BLACK = '#000000';

const REVISION = 'REV. 2/2024';
const ADDRESS = 'PH BICSA Financial Center, Floor 44, Office No.4406, Balboa Avenue and Aquilino de la Guardia, Panama Rep. Of Panama';
const EMAIL = 'info@ctc.com.pa';
const WEBSITE = 'www.ctc.com.pa';

// Logos / signature live in server/assets (esbuild keeps __dirname-free paths: resolve from the project root).
const asset = (name: string) => readFileSync(resolve(process.cwd(), 'server/assets', name));
const assets = { ctc: asset('ctc-logo.png'), uag: asset('uag-seal.jpg'), signature: asset('signature.jpg') };

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const ordinal = (n: number) => {
  const v = n % 100;
  if (v >= 11 && v <= 13) return 'th';
  return ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
};
/** '2026-03-02' -> 'March 02nd, 2026' (the format printed on the official certificate). */
const longDate = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const day = Number(m[3]);
  return `${MONTHS[Number(m[2]) - 1]} ${String(day).padStart(2, '0')}${ordinal(day)}, ${m[1]}`;
};
const NUMBER_WORDS = ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN'];

type Seg = { text: string; bold?: boolean; underline?: boolean; color?: string; link?: string };

/** Renders the official certificate as an A4-landscape PDF. The QR encodes `${baseUrl}/certificate/<uniqueNumber>`. */
export async function generateCertificatePdf(cert: Certificate, baseUrl: string): Promise<Buffer> {
  const verifyUrl = `${baseUrl}/certificate/${cert.uniqueNumber}`;
  const qr = await QRCode.toBuffer(verifyUrl, { width: 400, margin: 1, errorCorrectionLevel: 'M' });

  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margin: 0,
    info: { Title: `${cert.certificateId} - ${cert.traineeName}`, Author: 'Continental Training Center S.A.' },
  });
  const chunks: Buffer[] = [];
  doc.on('data', (c) => chunks.push(c));
  const done = new Promise<Buffer>((resolveDone) => doc.on('end', () => resolveDone(Buffer.concat(chunks))));

  const W = doc.page.width; // 841.89
  const CX = W / 2;
  const LEFT = 50;
  const RIGHT = W - 50;

  // certificate id, top right
  doc.font('Helvetica-Bold').fontSize(8).fillColor(BLACK).text(cert.certificateId, RIGHT - 300, 26, { width: 300, align: 'right' });

  // dotted outer border
  doc.save().lineWidth(2.6).strokeColor(BLACK).dash(1.6, { space: 1.1 }).rect(LEFT, 40, RIGHT - LEFT, 540).stroke().undash().restore();

  // header: blue rules, logos, company block
  doc.lineWidth(3.2).strokeColor(BLUE_RULE);
  doc.moveTo(80, 66).lineTo(W - 80, 66).stroke();
  doc.moveTo(82, 180).lineTo(W - 82, 180).stroke();
  doc.image(assets.ctc, 118, 74, { width: 78, height: 79 });
  doc.image(assets.uag, W - 118 - 82, 70, { width: 82, height: 76 });

  const line = (text: string, y: number, font: string, size: number, color = BLACK, extra: any = {}) =>
    doc.font(font).fontSize(size).fillColor(color).text(text, LEFT + 10, y, { width: RIGHT - LEFT - 20, align: 'center', ...extra });

  line('CONTINENTAL TRAINING CENTER S.A.', 120, 'Helvetica-BoldOblique', 14, BRAND_BLUE);
  line('UNITED ALLIANCE GROUP LTD', 142, 'Helvetica-BoldOblique', 10.5, BRAND_BLUE);
  line(ADDRESS, 166, 'Helvetica-Bold', 6.6);

  /** One centred line made of differently styled pieces (bold / underlined / links). */
  const rich = (segs: Seg[], y: number, size = 9) => {
    const w = (s: Seg) => doc.font(s.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size).widthOfString(s.text);
    let x = CX - segs.reduce((a, s) => a + w(s), 0) / 2;
    for (const s of segs) {
      doc.font(s.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size).fillColor(s.color ?? BLACK)
        .text(s.text, x, y, { lineBreak: false, underline: !!s.underline, link: s.link });
      x += w(s);
    }
  };

  rich(
    [
      { text: 'E:mail: ', bold: true },
      { text: EMAIL, bold: true, underline: true, color: '#1155CC', link: `mailto:${EMAIL}` },
      { text: ' , Web Page: ' + WEBSITE, bold: true },
    ],
    186.5, 6.6,
  );

  line('Certify that:', 204, 'Helvetica', 9);
  rich([{ text: `${cert.traineeTitle} ${cert.traineeName}`, bold: true, underline: true }], 228, 10);
  rich([{ text: 'Passport No: ', bold: true }, { text: cert.passportNumber, underline: true }], 250, 7.5);
  line('Has successfully completed the training course', 273, 'Helvetica-Bold', 8.5);
  line(cert.courseTitle.toUpperCase(), 294, 'Helvetica-Bold', 12);
  const afterTitle = doc.y + 8;
  line('The course fulfills minimum requirements of', afterTitle, 'Helvetica', 8.5);
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(BLACK)
    .text(cert.stcwRegulation, CX - 270, doc.y + 4, { width: 540, align: 'center', lineGap: 4 });

  const resolutionNo = cert.approvalResolution.replace(/^\s*Resolution\s+No\.?\s*/i, '');
  const authority = (cert.approvalAuthority.split(',')[0] || '').replace(/^\s*Government of\s+/i, '').toUpperCase();
  let y = doc.y + 6;
  rich(
    [
      { text: `This course has been approved by the Government of ${authority}` },
      { text: ',', bold: true },
      { text: ' by means of Resolution No.' },
      { text: ` ${resolutionNo}`, underline: true },
      { text: ' dated' },
    ],
    y, 8.5,
  );
  y += 16.5;
  rich(
    [
      { text: 'On ' },
      { text: longDate(cert.approvalDate), underline: true },
      { text: ' and Valid until ' },
      { text: longDate(cert.approvalValidUntil), underline: true },
    ],
    y, 8.5,
  );
  y += 16.5;
  rich(
    [
      { text: 'Held from ', bold: true },
      { text: longDate(cert.trainingStartDate), underline: true },
      { text: ' to ', bold: true },
      { text: longDate(cert.trainingEndDate), underline: true },
      { text: ' Course Mode: ', bold: true },
      { text: cert.trainingMode, underline: true },
      { text: ' Conducted at ', bold: true },
      { text: cert.trainingLocation.toUpperCase(), underline: true },
    ],
    y, 8.5,
  );
  y += 17;
  rich(
    [
      { text: 'This certificate was issued on ', bold: true },
      { text: longDate(cert.issueDate), underline: true },
      { text: ', Valid until ', bold: true },
      { text: longDate(cert.expiryDate), underline: true },
    ],
    y, 8.5,
  );
  y += 26;
  const years = NUMBER_WORDS[cert.validityYears] ?? String(cert.validityYears);
  rich([{ text: `(THIS CERTIFICATE IS VALID FOR ${years} (${cert.validityYears}) YEAR )`, underline: true }], y, 8.5);

  // footer: revision, signatory, QR
  doc.font('Helvetica').fontSize(6.5).fillColor(BLACK).text(REVISION, 76, 553, { lineBreak: false });

  const sigCx = CX - 20;
  if (/claudia\s+galeano/i.test(cert.signatoryName)) {
    doc.image(assets.signature, sigCx - 52, 507, { width: 104, height: 44 });
  }
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(BLACK).text(cert.signatoryName, sigCx - 120, 540, { width: 240, align: 'center', lineBreak: false });
  doc.moveTo(sigCx - 122, 553).lineTo(sigCx + 122, 553).lineWidth(0.8).strokeColor(BLACK).stroke();
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(BLACK).text(cert.signatoryTitle, sigCx - 120, 557, { width: 240, align: 'center', lineBreak: false });

  const qrSize = 66;
  const qrX = RIGHT - 24 - qrSize;
  doc.image(qr, qrX, 498, { width: qrSize, height: qrSize });
  doc.font('Helvetica').fontSize(6.5).fillColor(BLACK).text(cert.uniqueNumber, qrX - 20, 567, { width: qrSize + 40, align: 'center', lineBreak: false });

  doc.end();
  return done;
}
