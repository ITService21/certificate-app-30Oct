import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import type { Certificate } from '../src/types';

const NAVY = '#0B1F4B';
const BLUE = '#0A7AC1';
const GREY = '#475569';

/** Renders the official certificate as an A4-landscape PDF. The QR encodes `${baseUrl}/?verify=<uniqueNumber>`. */
export async function generateCertificatePdf(cert: Certificate, baseUrl: string): Promise<Buffer> {
  const verifyUrl = `${baseUrl}/?verify=${cert.uniqueNumber}`;
  const qr = await QRCode.toBuffer(verifyUrl, {
    width: 400,
    margin: 1,
    errorCorrectionLevel: 'H',
    color: { dark: NAVY, light: '#FFFFFF' },
  });

  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margin: 0,
    info: { Title: `${cert.certificateId} - ${cert.traineeName}`, Author: 'Continental Training Center S.A.' },
  });
  const chunks: Buffer[] = [];
  doc.on('data', (c) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

  const W = doc.page.width; // 841.89
  const H = doc.page.height; // 595.28

  // double border
  doc.lineWidth(3).strokeColor(NAVY).rect(24, 24, W - 48, H - 48).stroke();
  doc.lineWidth(0.8).strokeColor(BLUE).rect(32, 32, W - 64, H - 64).stroke();

  const center = (text: string, y: number, font: string, size: number, color: string, opts: any = {}) => {
    doc.font(font).fontSize(size).fillColor(color).text(text, 60, y, { width: W - 120, align: 'center', ...opts });
  };

  center('CONTINENTAL TRAINING CENTER S.A.  ·  UNITED ALLIANCE GROUP', 58, 'Helvetica-Bold', 11, BLUE, { characterSpacing: 1.5 });
  center('CERTIFICATE OF PROFICIENCY', 82, 'Times-Bold', 32, NAVY, { characterSpacing: 2 });
  center(`${cert.approvalAuthority}  ·  ${cert.approvalResolution}`, 126, 'Helvetica', 9.5, GREY);

  center('This is to certify that', 158, 'Times-Italic', 14, GREY);
  center(`${cert.traineeTitle} ${cert.traineeName}`, 182, 'Times-Bold', 30, NAVY);
  doc.moveTo(W / 2 - 200, 222).lineTo(W / 2 + 200, 222).lineWidth(0.7).strokeColor('#94A3B8').stroke();
  center(`Passport No. ${cert.passportNumber}`, 230, 'Helvetica', 10, GREY);

  center('has successfully completed the approved course', 256, 'Times-Italic', 14, GREY);
  center(cert.courseTitle, 280, 'Times-BoldItalic', 19, '#111827', { lineGap: 2 });
  const afterTitle = doc.y + 8;
  center(`In accordance with ${cert.stcwRegulation}`, afterTitle, 'Helvetica', 9, GREY);
  center(
    `Training: ${cert.trainingStartDate} to ${cert.trainingEndDate}  ·  ${cert.trainingMode}  ·  ${cert.trainingLocation}`,
    doc.y + 6, 'Helvetica', 9.5, GREY,
  );
  center(
    `Issued ${cert.issueDate}   ·   Valid until ${cert.expiryDate} (${cert.validityYears} years)`,
    doc.y + 6, 'Helvetica-Bold', 10.5, NAVY,
  );

  // signatory (bottom-left)
  doc.moveTo(70, 470).lineTo(300, 470).lineWidth(0.7).strokeColor('#334155').stroke();
  doc.font('Times-BoldItalic').fontSize(15).fillColor(NAVY).text(cert.signatoryName, 70, 476, { width: 240 });
  doc.font('Helvetica-Bold').fontSize(9).fillColor(GREY).text(cert.signatoryTitle, 70, 496, { width: 240 });
  doc.font('Helvetica').fontSize(8.5).fillColor(GREY)
    .text(`Certificate ID: ${cert.certificateId}`, 70, 514, { width: 300 });

  // QR (bottom-right)
  const qrSize = 104;
  const qrX = W - 70 - qrSize;
  doc.image(qr, qrX, 428, { width: qrSize, height: qrSize });
  doc.font('Helvetica-Bold').fontSize(8).fillColor(BLUE).text('SCAN TO VERIFY', qrX - 20, 534, { width: qrSize + 40, align: 'center' });
  doc.font('Helvetica-Bold').fontSize(9).fillColor(NAVY).text(cert.uniqueNumber, qrX - 20, 545, { width: qrSize + 40, align: 'center' });

  doc.end();
  return done;
}
