import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PdfViewer } from './PdfViewer';
import { CTC_COMPANY_INFO } from '../../data/company';

/** Public "QR Validity Query" page: what a phone shows after scanning the QR on a certificate. Deliberately minimal. */
export const CertificateDetails: React.FC = () => {
  const { selectedCert: cert, setCurrentView, loading } = useApp();
  const [showCert, setShowCert] = useState(false);

  if (!cert) {
    return (
      <div className="qr-page">
        <div className="qr-card" style={{ textAlign: 'center' }}>
          {loading ? (
            <p role="status">Verifying…</p>
          ) : (
            <>
              <p>No certificate selected.</p>
              <button className="qr-btn" onClick={() => setCurrentView('verify_home')} style={{ marginTop: 16 }}>
                Return to search
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  const rows: [string, string][] = [
    ['Number Certificate', cert.certificateId],
    ['Participant', cert.traineeName],
    ['Identity', cert.passportNumber],
    ['Nacionality', cert.nationality || 'N/A'],
    ['Issued Date', cert.issueDate],
    ['Due Date', cert.expiryDate],
  ];
  const revoked = cert.status === 'revoked';
  const expired = !revoked && cert.expiryDate < new Date().toISOString().slice(0, 10);

  return (
    <div className="qr-page">
      <div className="qr-card ">
        <div className="qr-head">
          <img src="/ctc-logo.png" alt="Continental Training Center S.A." className="qr-logo" />
          <div className="qr-head-text">
            <h1>QR Validity Query</h1>
            <p className="qr-strong">Continental training Center S.A</p>
            <p>
              PH. BICSA Financial Center, Floor 44, Office 4406 . Balboa Avenue and Aquilino De la Guardia Street,{' '}
              <span className="qr-addr2">Panama, Republic of Panama</span>
            </p>
            <p className="qr-mail">
              Email <a href={`mailto:${CTC_COMPANY_INFO.email}`}>{CTC_COMPANY_INFO.email}</a>
            </p>
          </div>
        </div>

        <hr className="qr-divider" />

        <dl className="qr-rows">
          {rows.map(([label, value]) => (
            <div className="qr-row" key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>

        {(revoked || expired) && (
          <p className="qr-alert" role="alert">
            {revoked ? 'This certificate has been REVOKED and is no longer valid.' : 'This certificate has EXPIRED.'}
          </p>
        )}

        <button type="button" className="qr-btn" onClick={() => setShowCert(true)} aria-expanded={showCert}>
          <img src="/eye-open.png" alt="" />
          <span>View Certificate</span>
        </button>

        {showCert && (
          <div className="qr-viewer">
            <PdfViewer url={`/api/verify/${cert.uniqueNumber}/document`} />
            <a className="qr-viewer-open" href={`/api/verify/${cert.uniqueNumber}/document`} target="_blank" rel="noopener noreferrer">
              Open in a new tab
            </a>
          </div>
        )}

      </div>
    </div>
  );
};
