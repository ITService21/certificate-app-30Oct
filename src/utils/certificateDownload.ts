import QRCode from 'qrcode';
import { Certificate } from '../types';

/**
 * Downloads the official certificate file.
 * If a custom file/image was uploaded by admin, downloads that file directly.
 * Otherwise, renders an ultra high-resolution official STCW certificate onto canvas and downloads as PNG.
 */
export async function downloadOfficialCertificate(cert: Certificate): Promise<void> {
  // 1. If admin uploaded an actual file (dataUrl or link), download directly
  if (cert.documentUrl && cert.documentUrl.startsWith('data:')) {
    const a = document.createElement('a');
    a.href = cert.documentUrl;
    a.download = cert.documentName || `${cert.certificateId}_Certificate.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  // 2. Otherwise, generate an ultra-high-resolution official certificate parchment (2400 x 1700 px)
  const canvas = document.createElement('canvas');
  canvas.width = 2400;
  canvas.height = 1700;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background Parchment
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Outer Deep Maritime Navy Border
  ctx.strokeStyle = '#0B1F4B';
  ctx.lineWidth = 24;
  ctx.strokeRect(50, 50, canvas.width - 100, canvas.height - 100);

  // Inner Gold/Azure Guilloche Accent Border
  ctx.strokeStyle = '#0A7AC1';
  ctx.lineWidth = 6;
  ctx.strokeRect(75, 75, canvas.width - 150, canvas.height - 150);

  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 2;
  ctx.strokeRect(85, 85, canvas.width - 170, canvas.height - 170);

  // Security Watermark in background
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(-Math.PI / 12);
  ctx.fillStyle = 'rgba(11, 31, 75, 0.03)';
  ctx.font = 'bold 140px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CONTINENTAL TRAINING CENTER S.A.', 0, -60);
  ctx.fillText('REPUBLIC OF PANAMA · STCW 1978', 0, 100);
  ctx.restore();

  // Header Title
  ctx.textAlign = 'center';
  ctx.fillStyle = '#DA121A'; // Panama Red accent
  ctx.font = 'bold 36px Inter, sans-serif';
  ctx.fillText('REPUBLIC OF PANAMA', canvas.width / 2, 170);

  ctx.fillStyle = '#0B1F4B';
  ctx.font = 'bold 44px Inter, sans-serif';
  ctx.fillText('PANAMA MARITIME AUTHORITY', canvas.width / 2, 230);

  ctx.fillStyle = '#64748B';
  ctx.font = '600 28px Inter, sans-serif';
  ctx.fillText('DIRECTORATE GENERAL OF MERCHANT MARINE', canvas.width / 2, 280);

  // Institution Banner
  ctx.fillStyle = '#0A7AC1';
  ctx.font = 'bold 64px Inter, sans-serif';
  ctx.fillText('CONTINENTAL TRAINING CENTER S.A.', canvas.width / 2, 380);

  ctx.fillStyle = '#475569';
  ctx.font = '500 28px Inter, sans-serif';
  ctx.fillText('PART OF UNITED ALLIANCE GROUP LTD, PANAMA', canvas.width / 2, 430);
  ctx.fillText(cert.approvalResolution || 'Resolution No. DGGM-CFM-005-2024 dated Feb 06, 2024', canvas.width / 2, 475);

  // Gold Divider Line
  ctx.strokeStyle = '#0A7AC1';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(350, 520);
  ctx.lineTo(canvas.width - 350, 520);
  ctx.stroke();

  // Certificate Heading
  ctx.fillStyle = '#0B1F4B';
  ctx.font = 'bold 56px Inter, sans-serif';
  ctx.fillText('CERTIFICATE OF TRAINING & COMPETENCE', canvas.width / 2, 600);

  ctx.font = 'italic 34px Georgia, serif';
  ctx.fillStyle = '#334155';
  ctx.fillText('This is to certify that', canvas.width / 2, 670);

  // Trainee Name
  ctx.fillStyle = '#0B1F4B';
  ctx.font = '900 76px Inter, sans-serif';
  ctx.fillText(`${cert.traineeTitle} ${cert.traineeName}`, canvas.width / 2, 770);

  // Passport info
  ctx.fillStyle = '#475569';
  ctx.font = 'bold 32px Inter, sans-serif';
  ctx.fillText(`Passport Identification No: ${cert.passportNumber}`, canvas.width / 2, 830);

  // Course body
  ctx.font = 'italic 32px Georgia, serif';
  ctx.fillStyle = '#334155';
  ctx.fillText('has successfully completed the approved maritime training course in:', canvas.width / 2, 910);

  ctx.fillStyle = '#0A7AC1';
  ctx.font = 'bold 50px Inter, sans-serif';
  // Wrap course title if long
  const courseWords = cert.courseTitle.split(' ');
  let line1 = '';
  let line2 = '';
  for (let w of courseWords) {
    if ((line1 + w).length < 48) {
      line1 += (line1 ? ' ' : '') + w;
    } else {
      line2 += (line2 ? ' ' : '') + w;
    }
  }

  if (line2) {
    ctx.fillText(line1, canvas.width / 2, 980);
    ctx.fillText(line2, canvas.width / 2, 1045);
  } else {
    ctx.fillText(line1, canvas.width / 2, 1000);
  }

  // STCW standard
  ctx.fillStyle = '#475569';
  ctx.font = '500 30px Inter, sans-serif';
  ctx.fillText(`In accordance with: ${cert.stcwRegulation}`, canvas.width / 2, line2 ? 1115 : 1075);
  ctx.fillText(`Conducted at: ${cert.trainingLocation} (${cert.trainingStartDate} to ${cert.trainingEndDate})`, canvas.width / 2, line2 ? 1165 : 1125);

  // Bottom Line Divider
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(150, 1260);
  ctx.lineTo(canvas.width - 150, 1260);
  ctx.stroke();

  // Bottom Left: Signatory Block
  ctx.textAlign = 'left';
  ctx.font = 'italic bold 42px Georgia, serif';
  ctx.fillStyle = '#0B1F4B';
  ctx.fillText(cert.signatoryName || 'Claudia Galeano', 200, 1370);

  ctx.font = 'bold 28px Inter, sans-serif';
  ctx.fillText(cert.signatoryTitle || 'CTC General Manager', 200, 1420);

  ctx.font = '500 24px Inter, sans-serif';
  ctx.fillStyle = '#64748B';
  ctx.fillText('Continental Training Center S.A. · Republic of Panama', 200, 1465);
  ctx.fillText(`Issue Date: ${cert.issueDate}  ·  Expiry Date: ${cert.expiryDate}`, 200, 1510);
  ctx.fillText(`Certificate ID: ${cert.certificateId}`, 200, 1555);

  // Bottom Right: Generate and embed real QR Code
  try {
    const qrDataUrl = await QRCode.toDataURL(
      `${window.location.origin}/?verify=${cert.uniqueNumber}`,
      { width: 280, margin: 1, color: { dark: '#0B1F4B', light: '#FFFFFF' } }
    );
    const qrImg = new Image();
    qrImg.src = qrDataUrl;
    await new Promise((resolve) => {
      qrImg.onload = resolve;
    });

    const qrX = canvas.width - 550;
    const qrY = 1300;
    ctx.drawImage(qrImg, qrX, qrY, 260, 260);

    // 14-digit number underneath QR
    ctx.textAlign = 'center';
    ctx.font = 'bold 24px monospace';
    ctx.fillStyle = '#0A7AC1';
    ctx.fillText('UNIQUE NUMBER (BELOW QR):', qrX + 130, qrY + 295);
    ctx.font = 'bold 34px monospace';
    ctx.fillStyle = '#0B1F4B';
    ctx.fillText(cert.uniqueNumber, qrX + 130, qrY + 335);
  } catch (err) {
    console.error('Failed drawing QR on canvas', err);
  }

  // Trigger download
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cert.certificateId}_Official_Certificate.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 'image/png');
}

/**
 * Downloads official Port State Control (PSC) Verification Transcript document
 */
export function downloadVerificationTranscript(cert: Certificate): void {
  const verifiedAt = new Date().toUTCString();
  const transcriptHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Official Verification Transcript - ${cert.certificateId}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 40px; color: #0F172A; }
    .header { border-bottom: 3px solid #0B1F4B; padding-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
    .title { color: #0B1F4B; font-size: 24px; font-weight: 800; margin: 0; }
    .subtitle { color: #0A7AC1; font-size: 14px; font-weight: 600; margin-top: 4px; }
    .status-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-weight: bold; font-size: 14px; background: ${
      cert.status === 'valid' ? '#DCFCE7; color: #166534; border: 1px solid #86EFAC;' :
      cert.status === 'expiring' ? '#FEF3C7; color: #92400E; border: 1px solid #FCD34D;' :
      '#FEE2E2; color: #991B1B; border: 1px solid #FCA5A5;'
    } }
    .dossier { margin-top: 30px; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden; }
    .row { display: flex; border-bottom: 1px solid #E2E8F0; }
    .row:last-child { border-bottom: none; }
    .label { width: 35%; background: #F8FAFC; padding: 12px 16px; font-weight: 600; font-size: 13px; color: #475569; }
    .value { width: 65%; padding: 12px 16px; font-size: 13px; font-weight: 500; font-family: monospace; }
    .footer { margin-top: 40px; font-size: 12px; color: #64748B; border-top: 1px solid #E2E8F0; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="title">CONTINENTAL TRAINING CENTER S.A.</h1>
      <div class="subtitle">United Alliance Group Ltd · Panama Maritime Authority (AMP) Registry</div>
    </div>
    <div class="status-badge">
      ${cert.status === 'valid' ? '✔ OFFICIALLY VERIFIED & VALID' : cert.status === 'expiring' ? '⚠ EXPIRING SOON' : '✖ CERTIFICATE REVOKED'}
    </div>
  </div>

  <div class="dossier">
    <div class="row"><div class="label">Certificate ID</div><div class="value">${cert.certificateId}</div></div>
    <div class="row"><div class="label">14-Digit Unique Number</div><div class="value">${cert.uniqueNumber}</div></div>
    <div class="row"><div class="label">Trainee Seafarer</div><div class="value">${cert.traineeTitle} ${cert.traineeName}</div></div>
    <div class="row"><div class="label">Passport Number</div><div class="value">${cert.passportNumber}</div></div>
    <div class="row"><div class="label">Course Title</div><div class="value" style="font-family: inherit;">${cert.courseTitle}</div></div>
    <div class="row"><div class="label">STCW Standard</div><div class="value" style="font-family: inherit;">${cert.stcwRegulation}</div></div>
    <div class="row"><div class="label">Government Approval</div><div class="value">${cert.approvalResolution} (Dated ${cert.approvalDate}, valid until ${cert.approvalValidUntil})</div></div>
    <div class="row"><div class="label">Training Dates & Location</div><div class="value">${cert.trainingStartDate} to ${cert.trainingEndDate} · ${cert.trainingLocation} (${cert.trainingMode})</div></div>
    <div class="row"><div class="label">Issue Date</div><div class="value">${cert.issueDate}</div></div>
    <div class="row"><div class="label">Expiry Date</div><div class="value">${cert.expiryDate} (5 Years Validity)</div></div>
    <div class="row"><div class="label">Authorized Signatory</div><div class="value">${cert.signatoryName}, ${cert.signatoryTitle}</div></div>
    <div class="row"><div class="label">Verification Query Timestamp</div><div class="value">${verifiedAt}</div></div>
  </div>

  <div class="footer">
    <p><strong>Headquarters:</strong> PH BICSA Financial Center, Floor 44, Office 4406, Balboa Avenue, Panama City, Republic of Panama</p>
    <p><strong>Official Inquiries:</strong> info@ctc.com.pa · www.ctc.com.pa</p>
    <p>This transcript constitutes official electronic proof of STCW certification for Port State Control (PSC) audits.</p>
  </div>
</body>
</html>
  `;

  const blob = new Blob([transcriptHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${cert.certificateId}_Verification_Transcript.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
