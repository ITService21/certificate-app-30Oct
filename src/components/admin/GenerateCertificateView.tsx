import { NationalitySelect } from './NationalitySelect';
import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api, certificateUrl, downloadDocument, openPdf } from '../../api';
import { Certificate } from '../../types';
import { CheckCircle2, Copy, Check, ExternalLink, ShieldCheck, FileText, Download, ChevronDown, Loader2 } from 'lucide-react';
import { QrCodeViewer } from '../common/QrCodeViewer';

interface CourseTemplate {
  code: string;
  title: string;
  stcwRegulation: string;
  approvalResolution: string;
  approvalAuthority: string;
  approvalDate: string;
  approvalValidUntil: string;
  validityYears: number;
  durationDays: number;
}
interface GeneratorConfig {
  courses: CourseTemplate[];
  defaults: { signatoryName: string; signatoryTitle: string; trainingMode: 'Presential' | 'Online' | 'Blended' };
}

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const INPUT = 'w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1A2644] text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#0A7AC1]';
const DISABLED = 'bg-slate-100! dark:bg-[#16213b]! text-slate-500! dark:text-slate-400! cursor-not-allowed';
const LABEL = 'block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 whitespace-nowrap overflow-hidden text-ellipsis';
const CARD = 'p-5 sm:p-6 rounded-xl bg-white dark:bg-[#131F37] border border-slate-200 dark:border-slate-700 shadow-xs space-y-4';
const CARD_TITLE = 'block text-xs font-bold uppercase tracking-wider text-[#0B1F4B] dark:text-sky-300 pb-1';

const blank = () => ({
  courseCode: '',
  traineeTitle: 'Mr.' as Certificate['traineeTitle'],
  traineeName: '',
  passportNumber: '',
  nationality: '',
  trainingStartDate: '',
  trainingEndDate: '',
  durationDays: 5,
  validityYears: 5,
  trainingMode: 'Presential' as Certificate['trainingMode'],
  trainingLocation: '',
  issueDate: today(),
  // advanced (blank = automatic / from template)
  certificateId: '',
  uniqueNumber: '',
  signatoryName: '',
  signatoryTitle: '',
  courseTitle: '',
  stcwRegulation: '',
});

/** Certificate generator: the issuer fills in the trainee-specific details, everything else is seeded. */
export const GenerateCertificateView: React.FC = () => {
  const { addCertificate, openCertificateById, setCurrentView, showToast } = useApp();
  const [config, setConfig] = useState<GeneratorConfig | null>(null);
  const [configError, setConfigError] = useState('');
  const [f, setF] = useState(blank);
  const [advanced, setAdvanced] = useState(false);
  const [busy, setBusy] = useState(false);
  const [published, setPublished] = useState<Certificate | null>(null);
  const set = <K extends keyof ReturnType<typeof blank>>(key: K, value: ReturnType<typeof blank>[K]) => setF((p) => ({ ...p, [key]: value }));

  const loadConfig = () => {
    setConfigError('');
    api.get<GeneratorConfig>('/admin/generator-config')
      .then((c) => { setConfig(c); setF((p) => ({ ...p, trainingMode: p.trainingMode || c.defaults.trainingMode })); })
      .catch((e) => setConfigError(e.status === 404
        ? 'The server is running an older version without the certificate generator. Restart the API (npm run server) and retry.'
        : e.message || 'Could not load the course list.'));
  };
  useEffect(loadConfig, []);

  const course = config?.courses.find((c) => c.code === f.courseCode);
  const validityYears = f.validityYears;

  // "Held from" + course duration -> "Held to" (read-only); a new course resets duration and validity to its defaults.
  const onCourse = (code: string) => {
    const c = config?.courses.find((x) => x.code === code);
    setF((p) => {
      const days = c?.durationDays ?? p.durationDays;
      return {
        ...p,
        courseCode: code,
        durationDays: days,
        validityYears: c?.validityYears ?? 5,
        trainingEndDate: p.trainingStartDate ? addDays(p.trainingStartDate, days - 1) : p.trainingEndDate,
      };
    });
  };
  const onStart = (start: string) =>
    setF((p) => ({ ...p, trainingStartDate: start, trainingEndDate: start ? addDays(start, p.durationDays - 1) : '' }));
  const onDuration = (raw: string) => {
    const days = Math.max(1, Math.min(60, Math.floor(Number(raw) || 1)));
    setF((p) => ({ ...p, durationDays: days, trainingEndDate: p.trainingStartDate ? addDays(p.trainingStartDate, days - 1) : p.trainingEndDate }));
  };
  // Issue date is automatic: today, or the last training day if the course has not finished yet.
  const issueDate = f.trainingEndDate && f.trainingEndDate > today() ? f.trainingEndDate : today();
  const expiry = useMemo(() => {
    const d = new Date(`${issueDate}T00:00:00Z`);
    d.setUTCFullYear(d.getUTCFullYear() + validityYears);
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  }, [issueDate, validityYears]);

  const payload = () => ({
    courseCode: f.courseCode,
    traineeTitle: f.traineeTitle,
    traineeName: f.traineeName.trim().toUpperCase(),
    passportNumber: f.passportNumber.trim().toUpperCase() || 'N/A',
    nationality: f.nationality.trim().toUpperCase(),
    trainingStartDate: f.trainingStartDate,
    trainingEndDate: f.trainingEndDate,
    trainingMode: f.trainingMode,
    trainingLocation: f.trainingLocation.trim(),
    issueDate,
    validityYears: f.validityYears,
    status: 'valid' as const,
    // optional overrides; empty values are ignored by the server
    certificateId: f.certificateId.trim(),
    uniqueNumber: f.uniqueNumber.replace(/\D/g, ''),
    signatoryName: f.signatoryName.trim(),
    signatoryTitle: f.signatoryTitle.trim(),
    courseTitle: f.courseTitle.trim(),
    stcwRegulation: f.stcwRegulation.trim(),
  });

  const problem = (): string | null => {
    if (!f.courseCode) return 'Choose the course';
    if (!f.traineeName.trim()) return "Enter the trainee's full name";
    if (!f.passportNumber.trim()) return 'Enter the passport number';
    if (!f.trainingStartDate || !f.trainingEndDate) return 'Enter the training start and end dates';
    if (f.trainingEndDate < f.trainingStartDate) return 'Training end date is before the start date';
    if (!f.trainingLocation.trim()) return 'Enter where the training was conducted';
    if (f.uniqueNumber && f.uniqueNumber.replace(/\D/g, '').length !== 14) return 'The certificate number must be exactly 14 digits (or leave it blank)';
    return null;
  };

  const preview = async () => {
    const p = problem();
    if (p) return showToast(p, 'error');
    try { await openPdf('/api/admin/certificates/preview', payload()); } catch (e) { showToast(e instanceof Error ? e.message : 'Preview failed', 'error'); }
  };

  const generate = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = problem();
    if (p) return showToast(p, 'error');
    setBusy(true);
    try {
      const created = await addCertificate(payload() as Partial<Certificate>);
      if (created) setPublished(created);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setPublished(null);
    setF({ ...blank(), trainingMode: config?.defaults.trainingMode ?? 'Presential' });
    setAdvanced(false);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {published && (
        <PublishedSuccessModal
          certificate={published}
          onClose={() => { setPublished(null); setCurrentView('admin_certificates'); }}
          onViewDetails={() => { const n = published.uniqueNumber; setPublished(null); openCertificateById(n); }}
          onAnother={reset}
        />
      )}

      <div>
        <h1 className="text-2xl font-extrabold text-[#0B1F4B] dark:text-white">Generate Certificate</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Fill in the trainee details. The company header, course wording, approval, signatory, ID, number and QR code are filled in automatically.
        </p>
      </div>

      <form onSubmit={generate} className="space-y-5">
        <div className={CARD}>
          <span className={CARD_TITLE}>1. Course</span>
          <select id="course" value={f.courseCode} onChange={(e) => onCourse(e.target.value)} className={INPUT} disabled={!config}>
            <option value="">{config ? 'Select the course…' : configError ? 'Courses unavailable' : 'Loading courses…'}</option>
            {config?.courses.map((c) => <option key={c.code} value={c.code}>{c.title}</option>)}
          </select>
          {configError && (
            <p role="alert" className="text-xs text-red-600 dark:text-red-400">
              {configError}{' '}
              <button type="button" onClick={loadConfig} className="font-bold underline cursor-pointer">Retry</button>
            </p>
          )}
          {course && (
            <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              {course.stcwRegulation}<br />
              {course.approvalResolution} · valid until {course.approvalValidUntil} · certificate valid for {course.validityYears} years
            </p>
          )}
        </div>

        <div className={CARD}>
          <span className={CARD_TITLE}>2. Trainee</span>
          <div className="grid gap-x-4 gap-y-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,15rem),1fr))]">
            <div>
              <label className={LABEL} htmlFor="title">Title</label>
              <select id="title" value={f.traineeTitle} onChange={(e) => set('traineeTitle', e.target.value as Certificate['traineeTitle'])} className={INPUT}>
                {['Mr.', 'Ms.', 'Capt.', 'Eng.', 'Dr.'].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL} htmlFor="trainee-name">Full name *</label>
              <input id="trainee-name" className={`${INPUT} uppercase`} value={f.traineeName} onChange={(e) => set('traineeName', e.target.value)} placeholder="e.g. STANLEY CARDOZO" />
            </div>
            <div>
              <label className={LABEL} htmlFor="passport">Passport no. *</label>
              <input id="passport" className={`${INPUT} uppercase font-mono`} value={f.passportNumber} onChange={(e) => set('passportNumber', e.target.value)} placeholder="e.g. Z4326490" />
            </div>
            <div>
              <label className={LABEL} htmlFor="nationality">Nacionality</label>
              <NationalitySelect id="nationality" className={INPUT} value={f.nationality} onChange={(v) => set('nationality', v)} />
            </div>
          </div>
        </div>

        <div className={CARD}>
          <span className={CARD_TITLE}>3. Training &amp; issue</span>
          <div className="grid gap-x-4 gap-y-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,15rem),1fr))]">
            <div>
              <label className={LABEL} htmlFor="start">Held from *</label>
              <input id="start" type="date" className={INPUT} value={f.trainingStartDate} onChange={(e) => onStart(e.target.value)} />
            </div>
            <div>
              <label className={LABEL} htmlFor="duration">Course duration (days)</label>
              <input id="duration" type="number" min={1} max={60} className={INPUT} value={f.durationDays} onChange={(e) => onDuration(e.target.value)} />
            </div>
            <div>
              <label className={LABEL} htmlFor="end">Held to (automatic)</label>
              <input id="end" type="date" disabled className={`${INPUT} ${DISABLED}`} value={f.trainingEndDate} readOnly />
            </div>
            <div>
              <label className={LABEL} htmlFor="mode">Course mode</label>
              <select id="mode" className={INPUT} value={f.trainingMode} onChange={(e) => set('trainingMode', e.target.value as Certificate['trainingMode'])}>
                {['Presential', 'Online', 'Blended'].map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL} htmlFor="location">Conducted at *</label>
              <input id="location" className={`${INPUT} uppercase`} value={f.trainingLocation} onChange={(e) => set('trainingLocation', e.target.value)} placeholder="e.g. AZERBAIJAN" />
            </div>
            <div>
              <label className={LABEL} htmlFor="issue">Issue date (automatic)</label>
              <input id="issue" type="date" disabled className={`${INPUT} ${DISABLED}`} value={issueDate} readOnly />
            </div>
            <div>
              <label className={LABEL} htmlFor="validity">Certificate validity (years)</label>
              <select id="validity" className={INPUT} value={f.validityYears} onChange={(e) => set('validityYears', Number(e.target.value))}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((y) => <option key={y} value={y}>{y} {y === 1 ? 'year' : 'years'}{y === 5 ? ' (default)' : ''}</option>)}
              </select>
            </div>
          </div>
          {expiry && <p className="text-[11px] text-slate-500 dark:text-slate-400">Certificate valid until <strong>{expiry}</strong> ({validityYears} {validityYears === 1 ? 'year' : 'years'})</p>}
        </div>

        <div className={CARD}>
          <button type="button" onClick={() => setAdvanced((v) => !v)} className={`${CARD_TITLE} flex items-center gap-1.5 cursor-pointer`} aria-expanded={advanced}>
            <ChevronDown className={`w-4 h-4 transition-transform ${advanced ? 'rotate-180' : ''}`} />
            <span>Advanced (optional – automatic by default)</span>
          </button>
          {advanced && (
            <div className="grid gap-x-4 gap-y-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,15rem),1fr))] pt-1">
              <div>
                <label className={LABEL} htmlFor="cert-id">Certificate ID</label>
                <input id="cert-id" className={`${INPUT} font-mono`} value={f.certificateId} onChange={(e) => set('certificateId', e.target.value)} placeholder="auto, e.g. UAG-TC-26-COOK-00661" />
              </div>
              <div>
                <label className={LABEL} htmlFor="unique-num">14-digit number (QR)</label>
                <input id="unique-num" className={`${INPUT} font-mono`} value={f.uniqueNumber} onChange={(e) => set('uniqueNumber', e.target.value)} placeholder="auto" inputMode="numeric" />
              </div>
              <div>
                <label className={LABEL} htmlFor="sig-name">Signatory</label>
                <input id="sig-name" className={INPUT} value={f.signatoryName} onChange={(e) => set('signatoryName', e.target.value)} placeholder={config?.defaults.signatoryName} />
              </div>
              <div>
                <label className={LABEL} htmlFor="sig-title">Signatory title</label>
                <input id="sig-title" className={INPUT} value={f.signatoryTitle} onChange={(e) => set('signatoryTitle', e.target.value)} placeholder={config?.defaults.signatoryTitle} />
              </div>
              <div className="col-span-full">
                <label className={LABEL} htmlFor="course-title">Course title (replaces the template wording)</label>
                <input id="course-title" className={INPUT} value={f.courseTitle} onChange={(e) => set('courseTitle', e.target.value)} placeholder={course?.title} />
              </div>
              <div className="col-span-full">
                <label className={LABEL} htmlFor="regulation">Regulation text (replaces the template wording)</label>
                <input id="regulation" className={INPUT} value={f.stcwRegulation} onChange={(e) => set('stcwRegulation', e.target.value)} placeholder={course?.stcwRegulation} />
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-1">
          <button type="button" onClick={() => setCurrentView('admin_certificates')} className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer">
            Cancel
          </button>
          <button type="button" onClick={preview} className="w-full sm:w-auto px-5 py-2.5 text-xs font-semibold rounded-lg border border-[#0A7AC1] text-[#0A7AC1] bg-white dark:bg-[#131F37] hover:bg-sky-50 transition-colors cursor-pointer flex items-center justify-center gap-2">
            <FileText className="w-4 h-4" />
            <span>Preview Certificate PDF</span>
          </button>
          <button type="submit" disabled={busy} className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-[#0B1F4B] hover:bg-[#0A7AC1] disabled:opacity-60 rounded-lg shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-2">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 text-emerald-400" />}
            <span>Generate Certificate</span>
          </button>
        </div>
      </form>
    </div>
  );
};

/* Modal when published */
const PublishedSuccessModal: React.FC<{
  certificate: Certificate;
  onClose: () => void;
  onViewDetails: () => void;
  onAnother: () => void;
}> = ({ certificate, onClose, onViewDetails, onAnother }) => {
  const { showToast } = useApp();
  const [copied, setCopied] = useState(false);
  const verifyLink = certificateUrl(certificate.uniqueNumber);

  const handleCopy = () => {
    navigator.clipboard.writeText(verifyLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto bg-white dark:bg-[#131F37] rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-7 h-7" />
        </div>

        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
            Certificate generated and published
          </span>
          <h2 className="text-xl font-extrabold text-[#0B1F4B] dark:text-white mt-0.5">
            Certificate Ready
          </h2>
          <p className="text-xs text-slate-500 font-mono tnum">
            {certificate.certificateId} · No: {certificate.uniqueNumber}
          </p>
        </div>

        <div className="py-2">
          <QrCodeViewer
            value={certificate.uniqueNumber}
            uniqueNumber={certificate.uniqueNumber}
            size={140}
            showDownload={true}
          />
        </div>

        <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#1A2644] border border-slate-200 dark:border-slate-700 text-left">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Verification URL
          </span>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={verifyLink}
              className="flex-1 bg-transparent text-xs font-mono text-slate-800 dark:text-slate-200 truncate focus:outline-hidden"
            />
            <button
              onClick={handleCopy}
              className="px-2.5 py-1 text-xs font-bold rounded bg-white dark:bg-[#131F37] border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer flex items-center gap-1"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
          <button
            onClick={() => openPdf(`/api/verify/${certificate.uniqueNumber}/document`).catch(() => {})}
            className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap text-[#0A7AC1] border border-[#0A7AC1] rounded-lg hover:bg-sky-50 cursor-pointer flex items-center justify-center gap-2"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Open Certificate PDF</span>
          </button>

          <button
            onClick={() => downloadDocument(`/api/verify/${certificate.uniqueNumber}/document`, `${certificate.certificateId}.pdf`).catch((e) => showToast(e.message, 'error'))}
            className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap text-[#0A7AC1] border border-[#0A7AC1] rounded-lg hover:bg-sky-50 cursor-pointer flex items-center justify-center gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </button>

          <button
            onClick={onViewDetails}
            className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap text-white bg-[#0B1F4B] hover:bg-[#0A7AC1] rounded-lg shadow-xs cursor-pointer flex items-center justify-center gap-2"
          >
            <span>View Verification Page</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onAnother}
            className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-[#1A2644] cursor-pointer"
          >
            Generate Another
          </button>
        </div>

        <button
          onClick={onClose}
          className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:underline cursor-pointer"
        >
          Back to Registry List
        </button>
      </div>
    </div>
  );
};
