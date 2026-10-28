import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  EyeOff,
  Download,
  Share2,
  ArrowLeft,
  Calendar,
  Building2,
  User,
  Award,
  Check,
  Clock,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { QrCodeViewer } from '../common/QrCodeViewer';
import { CtcLogo } from '../common/Logos';
import { downloadOfficialCertificate, downloadVerificationTranscript } from '../../utils/certificateDownload';

export const CertificateDetails: React.FC = () => {
  const { selectedCert, setCurrentView, showToast } = useApp();
  const [showPassport, setShowPassport] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  const cert = selectedCert;

  // Live verified timestamp
  const verifiedTimestamp = useMemo(() => {
    return new Date().toUTCString();
  }, []);

  if (!cert) {
    return (
      <div className="flex-1 py-16 text-center px-4">
        <p className="text-sm text-slate-500">No certificate selected.</p>
        <button
          onClick={() => setCurrentView('verify_home')}
          className="mt-4 px-4 py-2 text-xs font-bold text-white bg-[#0B1F4B] rounded cursor-pointer"
        >
          Return to Search
        </button>
      </div>
    );
  }

  // Calculate validity progress
  const validityStats = useMemo(() => {
    try {
      const issue = new Date(cert.issueDate).getTime();
      const expiry = new Date(cert.expiryDate).getTime();
      const now = Date.now();
      const total = expiry - issue;
      const elapsed = Math.max(0, Math.min(total, now - issue));
      const percent = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
      const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
      return { percent, daysLeft };
    } catch {
      return { percent: 15, daysLeft: 1800 };
    }
  }, [cert.issueDate, cert.expiryDate]);

  // Mask passport
  const maskedPassport = useMemo(() => {
    const raw = cert.passportNumber;
    if (!raw || raw === 'N/A') return 'N/A';
    if (raw.length <= 4) return raw;
    const prefix = raw.substring(0, 3);
    const suffix = raw.substring(raw.length - 2);
    return `${prefix}****${suffix}`;
  }, [cert.passportNumber]);

  const handleCopyLink = () => {
    const link = `${window.location.origin}/?verify=${cert.uniqueNumber}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    showToast('Verification link copied to clipboard', 'info');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDownloadCertificate = async () => {
    setIsDownloading(true);
    try {
      await downloadOfficialCertificate(cert);
      showToast(`Downloaded official certificate for ${cert.certificateId}`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Error generating certificate file. Opening print window...', 'error');
      window.print();
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadTranscript = () => {
    downloadVerificationTranscript(cert);
    showToast(`Downloaded official verification transcript`, 'success');
  };

  return (
    <div className="flex-1 py-4 sm:py-8 px-3 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full min-w-0">
      
      {/* Top Navigation & Direct Download Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 no-print">
        <button
          onClick={() => setCurrentView('verify_home')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0A7AC1] dark:text-sky-400 hover:underline cursor-pointer self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Verify Another Certificate</span>
        </button>

        {/* Customer Download Buttons */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Copied' : 'Share Link'}</span>
          </button>

          <button
            onClick={handleDownloadTranscript}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-[#131F37] border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-[#0A7AC1]" />
            <span>Transcript</span>
          </button>

          <button
            onClick={handleDownloadCertificate}
            disabled={isDownloading}
            className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg text-white bg-[#0B1F4B] hover:bg-[#0A7AC1] transition-colors shadow-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isDownloading ? 'Downloading...' : 'Download Certificate (PDF)'}</span>
          </button>
        </div>
      </div>

      {/* STATUS BANNER */}
      {cert.status === 'valid' && (
        <div className="mb-5 p-3.5 sm:p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-[#06241B] flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-extrabold text-emerald-950 dark:text-emerald-100 uppercase tracking-tight">
                  ✔ Verified Certificate
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-200">
                  AUTHENTIC
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-emerald-800 dark:text-emerald-300">
                Accredited under Panama Maritime Authority (AMP) regulations.
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right sm:border-l sm:border-emerald-200 dark:sm:border-emerald-800 sm:pl-4 text-[11px] sm:text-xs font-mono tnum text-emerald-900 dark:text-emerald-200">
            <span>AMP Panama Accredited</span>
          </div>
        </div>
      )}

      {cert.status === 'expiring' && (
        <div className="mb-5 p-3.5 sm:p-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-[#2A1D0B] flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-extrabold text-amber-950 dark:text-amber-100 uppercase tracking-tight">
                  ⚠ Expiring Soon
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-200">
                  RENEWAL
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-amber-800 dark:text-amber-300">
                This STCW credential reaches expiration in {validityStats.daysLeft} days.
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right sm:border-l sm:border-amber-200 dark:sm:border-amber-800 sm:pl-4 text-xs font-mono font-bold text-amber-900 dark:text-amber-200 tnum">
            Expires: {cert.expiryDate}
          </div>
        </div>
      )}

      {cert.status === 'revoked' && (
        <div className="mb-5 p-3.5 sm:p-4 rounded-xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-[#2A0E13] flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0">
              <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-extrabold text-red-950 dark:text-red-100 uppercase tracking-tight">
                  ✖ Certificate Revoked
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-red-200 dark:bg-red-800 text-red-900 dark:text-red-200">
                  VOID
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-red-800 dark:text-red-300">
                Revocation Reason: {cert.revocationReason ? cert.revocationReason.replace(/_/g, ' ') : 'Administrative Order'}.
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right sm:border-l sm:border-red-200 dark:sm:border-red-800 sm:pl-4 text-xs font-mono font-bold text-red-900 dark:text-red-200 tnum">
            Revoked: {cert.revokedAt ? cert.revokedAt.substring(0, 10) : 'Recorded'}
          </div>
        </div>
      )}

      {/* MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-w-0">
        
        {/* LEFT DOSSIER (8 COLS) */}
        <div className="lg:col-span-8 space-y-5 min-w-0">
          
          <div className="bg-white dark:bg-[#131F37] border border-slate-200 dark:border-slate-700/80 rounded-xl p-4 sm:p-6 shadow-xs space-y-4">
            
            {/* Header Line */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Official Maritime Record
                </span>
                <h2 className="text-base sm:text-lg font-extrabold text-[#0B1F4B] dark:text-white">
                  Certificate Information
                </h2>
              </div>
              <div className="text-left sm:text-right font-mono tnum">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Certificate ID
                </span>
                <span className="text-xs sm:text-sm font-bold text-[#0A7AC1] dark:text-sky-300">
                  {cert.certificateId}
                </span>
              </div>
            </div>

            {/* Trainee Card */}
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#1A2644] border border-slate-200 dark:border-slate-700/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                  Trainee Full Name
                </span>
                <span className="text-sm sm:text-base font-extrabold text-[#0B1F4B] dark:text-white">
                  {cert.traineeTitle} {cert.traineeName}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                  Passport Number
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono tnum text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                    {showPassport ? cert.passportNumber : maskedPassport}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPassport(!showPassport)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-[#0A7AC1] dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-950 rounded transition-colors cursor-pointer"
                  >
                    {showPassport ? (
                      <>
                        <EyeOff className="w-3 h-3" />
                        <span>Hide</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3 h-3" />
                        <span>👁 View</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Course & Standard */}
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#1A2644] border border-slate-200 dark:border-slate-700/60 space-y-2">
              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                  Course Title
                </span>
                <span className="text-xs sm:text-sm font-bold text-[#0B1F4B] dark:text-sky-200 leading-snug block">
                  {cert.courseTitle}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                  STCW Standard
                </span>
                <span className="text-xs text-slate-700 dark:text-slate-300 block leading-snug">
                  {cert.stcwRegulation}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    Panama Approval
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {cert.approvalResolution}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    Approval Validity
                  </span>
                  <span className="font-mono tnum text-slate-600 dark:text-slate-300">
                    Dated {cert.approvalDate} · Until {cert.approvalValidUntil}
                  </span>
                </div>
              </div>
            </div>

            {/* Training Dates & Validity */}
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#1A2644] border border-slate-200 dark:border-slate-700/60 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    Training Dates
                  </span>
                  <span className="font-mono tnum font-semibold text-slate-800 dark:text-slate-200">
                    {cert.trainingStartDate} to {cert.trainingEndDate}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    Mode
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {cert.trainingMode}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    Location
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                    {cert.trainingLocation}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono tnum">
                  <span>Issued: <strong>{cert.issueDate}</strong></span>
                  <span>Expires: <strong className="text-[#0A7AC1] dark:text-sky-300">{cert.expiryDate}</strong></span>
                </div>

                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      cert.status === 'revoked'
                        ? 'bg-red-500'
                        : cert.status === 'expiring'
                        ? 'bg-amber-500'
                        : 'bg-[#0A7AC1]'
                    }`}
                    style={{ width: `${validityStats.percent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Signatory Block */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Authorized Signatory
                </span>
                <span className="font-bold text-[#0B1F4B] dark:text-white">
                  {cert.signatoryName}
                </span>
                <span className="text-[11px] text-slate-500 block">
                  {cert.signatoryTitle}
                </span>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Digital Authentication
                </span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                  ✔ Sealed by CTC Panama
                </span>
              </div>
            </div>

          </div>

          {/* EMBEDDED CERTIFICATE DOCUMENT PREVIEW */}
          <div className="bg-white dark:bg-[#131F37] border border-slate-200 dark:border-slate-700/80 rounded-xl p-3.5 sm:p-5 shadow-xs space-y-3 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Certificate Preview
              </span>

              <button
                onClick={handleDownloadCertificate}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-[#0A7AC1] dark:text-sky-300 hover:underline cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Document</span>
              </button>
            </div>

            {/* If actual file uploaded, display image */}
            {cert.documentUrl && cert.documentUrl.startsWith('data:image') ? (
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden max-h-[400px] flex items-center justify-center bg-slate-100 dark:bg-slate-900">
                <img
                  src={cert.documentUrl}
                  alt={`Certificate ${cert.certificateId}`}
                  className="max-h-[400px] object-contain w-full"
                />
              </div>
            ) : (
              /* Clean Authentic STCW Parchment */
              <div className="certificate-print-sheet p-3.5 sm:p-6 rounded-lg border-2 border-double border-[#0B1F4B] dark:border-sky-800 bg-[#FCFDFD] dark:bg-[#0E172A] text-slate-900 dark:text-slate-100">
                <div className="flex items-center justify-between border-b border-slate-300 dark:border-slate-700 pb-2.5 mb-2.5">
                  <CtcLogo size={30} showText={true} />
                  <div className="text-right text-[10px] sm:text-[11px] font-mono tnum text-slate-500">
                    <div className="font-bold text-[#0A7AC1]">{cert.certificateId}</div>
                  </div>
                </div>

                <div className="text-center py-2 sm:py-3 space-y-1">
                  <div className="text-[9px] uppercase font-bold tracking-widest text-slate-400">
                    Republic of Panama · Directorate General of Merchant Marine
                  </div>
                  <h3 className="text-xs sm:text-base font-extrabold text-[#0B1F4B] dark:text-white uppercase">
                    Certificate of Training & Competence
                  </h3>
                  <p className="text-[11px] italic text-slate-500">This is to certify that</p>
                  <h4 className="text-sm sm:text-base font-bold text-[#0A7AC1] uppercase">
                    {cert.traineeTitle} {cert.traineeName}
                  </h4>
                  <p className="text-[10px] sm:text-[11px] font-mono text-slate-500">
                    Passport No: {showPassport ? cert.passportNumber : maskedPassport}
                  </p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 pt-1 font-medium leading-snug">
                    has completed training in <strong>{cert.courseTitle}</strong>
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
                  <div>
                    <div className="font-serif italic text-xs">{cert.signatoryName}</div>
                    <div className="text-[10px] text-slate-500">{cert.signatoryTitle}</div>
                  </div>
                  <div className="text-left sm:text-right text-[10px] font-mono text-slate-500">
                    <div>No: {cert.uniqueNumber}</div>
                    <div>Valid: {cert.issueDate} - {cert.expiryDate}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: QR MATRIX & ISSUER CONTACT (4 COLS) */}
        <div className="lg:col-span-4 space-y-5 min-w-0">
          
          {/* QR Code Card */}
          <div className="bg-white dark:bg-[#131F37] border border-slate-200 dark:border-slate-700/80 rounded-xl p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0B1F4B] dark:text-sky-300">
                Unique QR Matrix
              </span>
              <span className="text-[10px] font-mono tnum text-slate-400">
                14 Digits
              </span>
            </div>

            <div className="flex justify-center">
              <QrCodeViewer
                value={cert.uniqueNumber}
                uniqueNumber={cert.uniqueNumber}
                size={140}
                showDownload={true}
              />
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center leading-relaxed">
              Printed on physical certificate. Scanning opens this verification record.
            </p>
          </div>

          {/* Issuer Contact Details */}
          <div className="bg-white dark:bg-[#131F37] border border-slate-200 dark:border-slate-700/80 rounded-xl p-4 sm:p-5 shadow-xs space-y-2 text-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Issuing Headquarters
            </span>

            <div className="space-y-1 text-slate-700 dark:text-slate-300">
              <div className="font-bold text-[#0B1F4B] dark:text-white">
                Continental Training Center S.A.
              </div>
              <div className="text-[11px] text-slate-500">
                Part of United Alliance Group Ltd, Panama
              </div>
              <div className="pt-1.5 text-[11px] space-y-1">
                <p>PH BICSA Financial Center, Floor 44, Office 4406, Balboa Avenue, Panama City, Panama</p>
                <p>Email: <a href="mailto:info@ctc.com.pa" className="text-[#0A7AC1] hover:underline">info@ctc.com.pa</a></p>
                <p>Web: <a href="https://www.ctc.com.pa" target="_blank" rel="noreferrer" className="text-[#0A7AC1] hover:underline">www.ctc.com.pa</a></p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-mono">
              Verified on {verifiedTimestamp}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
