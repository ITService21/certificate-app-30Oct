import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Certificate } from '../../types';
import {
  Upload,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  FileText,
  Calendar,
  User,
  Award,
  Hash,
  X,
  Image as ImageIcon,
} from 'lucide-react';
import { QrCodeViewer } from '../common/QrCodeViewer';

export const AddCertificateView: React.FC = () => {
  const { addCertificate, certificates, openCertificateById, setCurrentView, showToast } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Section 1: Upload Certificate
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: string;
    dataUrl?: string;
    isImage: boolean;
  } | null>(null);

  // Section 2: Identifier (Manual entry from certificate, NO random generator)
  const [uniqueNumber, setUniqueNumber] = useState('');
  const [certificateId, setCertificateId] = useState('');

  // Section 3: Trainee
  const [traineeTitle, setTraineeTitle] = useState<'Mr.' | 'Ms.' | 'Capt.' | 'Eng.' | 'Dr.'>('Mr.');
  const [traineeName, setTraineeName] = useState('');
  const [passportNumber, setPassportNumber] = useState('');

  // Section 4: Course
  const [courseTitle, setCourseTitle] = useState('Proficiency in Survival Craft and Rescue Boats Other Than Fast Rescue Boats');
  const [stcwRegulation, setStcwRegulation] = useState('STCW 1978 as amended, Regulation VI/2, Section A-VI/2, Paragraphs 1-6, Table A-VI/2-1');
  const [approvalResolution, setApprovalResolution] = useState('Resolution No. DGGM-CFM-005-2024');
  const [approvalDate, setApprovalDate] = useState('2024-02-06');
  const [approvalValidUntil, setApprovalValidUntil] = useState('2026-06-12');

  // Section 5: Training
  const [trainingStartDate, setTrainingStartDate] = useState('2026-05-11');
  const [trainingEndDate, setTrainingEndDate] = useState('2026-05-14');
  const [trainingMode, setTrainingMode] = useState<'Presential' | 'Online' | 'Blended'>('Presential');
  const [trainingLocation, setTrainingLocation] = useState('Panama Maritime Academy, Balboa');

  // Section 6: Validity & Signatory
  const [issueDate, setIssueDate] = useState(new Date().toISOString().substring(0, 10));
  const [validityYears, setValidityYears] = useState(5);
  const [expiryDate, setExpiryDate] = useState('');
  const [signatoryName, setSignatoryName] = useState('Claudia Galeano');
  const [signatoryTitle, setSignatoryTitle] = useState('CTC General Manager');

  // Success modal
  const [publishedCert, setPublishedCert] = useState<Certificate | null>(null);

  // Auto-calculate expiry date
  useEffect(() => {
    try {
      if (issueDate) {
        const d = new Date(issueDate);
        d.setFullYear(d.getFullYear() + validityYears);
        d.setDate(d.getDate() - 1);
        setExpiryDate(d.toISOString().substring(0, 10));
      }
    } catch {
      // fallback
    }
  }, [issueDate, validityYears]);

  // Handle actual file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const reader = new FileReader();

    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
      setUploadedFile({
        name: file.name,
        size: sizeMb,
        dataUrl,
        isImage,
      });
      showToast(`Certificate "${file.name}" uploaded successfully`, 'success');
    };

    reader.readAsDataURL(file);
  };

  // Live duplicate check
  const isDuplicate = Boolean(
    uniqueNumber &&
    uniqueNumber.length >= 10 &&
    certificates.some((c) => c.uniqueNumber === uniqueNumber)
  );

  const handleSubmit = (status: 'valid' | 'draft') => {
    const cleanNumber = uniqueNumber.replace(/\D/g, '');

    if (!cleanNumber || cleanNumber.length !== 14) {
      showToast('Unique Number must be exactly 14 digits as printed below the QR code', 'error');
      return;
    }

    if (isDuplicate) {
      showToast('This 14-digit number is already registered in the system', 'error');
      return;
    }

    if (!certificateId.trim()) {
      showToast('Certificate ID is required (e.g. UAG-TC-22-PSCRB-01115)', 'error');
      return;
    }

    if (!traineeName.trim()) {
      showToast('Trainee full name is required', 'error');
      return;
    }

    const created = addCertificate({
      uniqueNumber: cleanNumber,
      certificateId: certificateId.trim(),
      status,
      traineeTitle,
      traineeName: traineeName.trim().toUpperCase(),
      passportNumber: passportNumber.trim() || 'N/A',
      courseTitle,
      stcwRegulation,
      approvalResolution,
      approvalAuthority: 'Government of Panama, Directorate General of Merchant Marine',
      approvalDate,
      approvalValidUntil,
      trainingStartDate,
      trainingEndDate,
      trainingMode,
      trainingLocation,
      issueDate,
      expiryDate,
      validityYears,
      signatoryName,
      signatoryTitle,
      documentUrl: uploadedFile?.dataUrl,
      documentName: uploadedFile?.name || `${certificateId}.pdf`,
      documentSize: uploadedFile?.size || '1.8 MB',
    });

    if (status === 'valid') {
      setPublishedCert(created);
    } else {
      setCurrentView('admin_certificates');
    }
  };

  // Quick course selection
  const handleCoursePreset = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'pscrb') {
      setCourseTitle('Proficiency in Survival Craft and Rescue Boats Other Than Fast Rescue Boats');
      setStcwRegulation('STCW 1978 as amended, Regulation VI/2, Section A-VI/2, Paragraphs 1-6, Table A-VI/2-1');
      setCertificateId(`UAG-TC-26-PSCRB-${Math.floor(10000 + Math.random() * 90000)}`);
    } else if (val === 'aff') {
      setCourseTitle('Advanced Fire Fighting (STCW VI/3)');
      setStcwRegulation('STCW 1978 as amended, Regulation VI/3, Section A-VI/3, Paragraphs 1-4, Table A-VI/3');
      setCertificateId(`UAG-TC-26-AFF-${Math.floor(10000 + Math.random() * 90000)}`);
    } else if (val === 'mfa') {
      setCourseTitle('Medical First Aid On Board Ship');
      setStcwRegulation('STCW 1978 as amended, Regulation VI/4, Section A-VI/4, Paragraphs 1-3, Table A-VI/4-1');
      setCertificateId(`UAG-TC-26-MFA-${Math.floor(10000 + Math.random() * 90000)}`);
    } else if (val === 'brm') {
      setCourseTitle('Bridge Resource Management & Leadership and Teamwork');
      setStcwRegulation('STCW 1978 as amended, Regulations II/1, II/2 and VIII/2, Section A-II/1, Table A-II/1');
      setCertificateId(`UAG-TC-26-BRM-${Math.floor(10000 + Math.random() * 90000)}`);
    } else if (val === 'bst') {
      setCourseTitle('Basic Safety Training (STCW VI/1 Familiarization)');
      setStcwRegulation('STCW 1978 as amended, Regulation VI/1, Section A-VI/1, Paragraph 2, Table A-VI/1-1 to 1-4');
      setCertificateId(`UAG-TC-26-BST-${Math.floor(10000 + Math.random() * 90000)}`);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Success Modal */}
      {publishedCert && (
        <PublishedSuccessModal
          certificate={publishedCert}
          onClose={() => {
            setPublishedCert(null);
            setCurrentView('admin_certificates');
          }}
          onViewDetails={() => {
            const num = publishedCert.uniqueNumber;
            setPublishedCert(null);
            openCertificateById(num);
          }}
        />
      )}

      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-[#0B1F4B] dark:text-white">
          Add Certificate
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Upload certificate file and register details printed on the physical credential
        </p>
      </div>

      <div className="space-y-5">
        
        {/* SECTION 1: UPLOAD CERTIFICATE */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#131F37] border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0B1F4B] dark:text-sky-300 flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5 text-[#0A7AC1]" />
            <span>1. Upload Certificate File (PDF / Image)</span>
          </span>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*,application/pdf"
            className="hidden"
          />

          {!uploadedFile ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center bg-slate-50 dark:bg-[#1A2644] hover:bg-slate-100 dark:hover:bg-[#202E52] transition-colors cursor-pointer"
            >
              <Upload className="w-8 h-8 text-[#0A7AC1] mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Click to select or drag and drop Certificate (Image or PDF)
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Supports JPG, PNG, WebP, PDF up to 20MB
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileCheck className="w-5 h-5 text-emerald-600" />
                <div className="text-xs">
                  <span className="font-bold text-emerald-950 dark:text-emerald-100 block">
                    {uploadedFile.name}
                  </span>
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-300">
                    {uploadedFile.size} · Uploaded & Ready
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-900 rounded hover:bg-emerald-200"
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={() => setUploadedFile(null)}
                  className="p-1 text-slate-400 hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Image Thumbnail Preview */}
          {uploadedFile?.dataUrl && uploadedFile.isImage && (
            <div className="mt-2 p-2 bg-slate-100 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 flex items-center justify-center max-h-48 overflow-hidden">
              <img
                src={uploadedFile.dataUrl}
                alt="Certificate Preview"
                className="max-h-44 object-contain rounded"
              />
            </div>
          )}
        </div>

        {/* SECTION 2: IDENTIFIER (14 digits from certificate) */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#131F37] border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0B1F4B] dark:text-sky-300 flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5 text-[#0A7AC1]" />
            <span>2. Certificate Identifiers</span>
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="unique-num"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1"
              >
                Unique Number (14 Digits Printed Below QR) *
              </label>
              <input
                id="unique-num"
                type="text"
                maxLength={14}
                value={uniqueNumber}
                onChange={(e) => setUniqueNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 32625474824291"
                className={`w-full h-10 px-3 text-sm font-mono tnum rounded-lg border bg-white dark:bg-[#1A2644] text-slate-900 dark:text-white focus:outline-hidden ${
                  isDuplicate
                    ? 'border-red-500 focus:ring-2 focus:ring-red-500'
                    : 'border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-[#0A7AC1]'
                }`}
              />
              <div className="mt-1 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">
                  {uniqueNumber.length}/14 digits entered
                </span>
                {isDuplicate ? (
                  <span className="text-red-500 font-bold">Duplicate number!</span>
                ) : uniqueNumber.length === 14 ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">14 digits valid</span>
                ) : null}
              </div>
            </div>

            <div>
              <label
                htmlFor="cert-id"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1"
              >
                Certificate ID *
              </label>
              <input
                id="cert-id"
                type="text"
                value={certificateId}
                onChange={(e) => setCertificateId(e.target.value.toUpperCase())}
                placeholder="e.g. UAG-TC-22-PSCRB-01115"
                className="w-full h-10 px-3 text-sm font-mono tnum rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1A2644] text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#0A7AC1]"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: TRAINEE */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#131F37] border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0B1F4B] dark:text-sky-300 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-[#0A7AC1]" />
            <span>3. Trainee Seafarer</span>
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Title
              </label>
              <select
                value={traineeTitle}
                onChange={(e) => setTraineeTitle(e.target.value as any)}
                className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1A2644] text-slate-900 dark:text-white"
              >
                <option value="Mr.">Mr.</option>
                <option value="Ms.">Ms.</option>
                <option value="Capt.">Capt.</option>
                <option value="Eng.">Eng.</option>
              </select>
            </div>

            <div className="sm:col-span-5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={traineeName}
                onChange={(e) => setTraineeName(e.target.value)}
                placeholder="e.g. ELBY MATHEW"
                className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1A2644] text-slate-900 dark:text-white uppercase"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Passport No. *
              </label>
              <input
                type="text"
                required
                value={passportNumber}
                onChange={(e) => setPassportNumber(e.target.value)}
                placeholder="e.g. Z6045152"
                className="w-full h-10 px-3 text-xs font-mono tnum rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1A2644] text-slate-900 dark:text-white uppercase"
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: COURSE */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#131F37] border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0B1F4B] dark:text-sky-300 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-[#0A7AC1]" />
              <span>4. Course & Standards</span>
            </span>

            <select
              onChange={handleCoursePreset}
              className="text-[11px] font-semibold text-[#0A7AC1] bg-sky-50 dark:bg-sky-950/80 border border-sky-200 dark:border-sky-800 rounded px-2 py-1"
            >
              <option value="">Load Course Template...</option>
              <option value="pscrb">Survival Craft (PSCRB)</option>
              <option value="aff">Advanced Fire Fighting</option>
              <option value="mfa">Medical First Aid</option>
              <option value="brm">Bridge Resource Mgmt</option>
              <option value="bst">Basic Safety Training</option>
            </select>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Course Title *
              </label>
              <input
                type="text"
                required
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1A2644] text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                STCW Regulation *
              </label>
              <input
                type="text"
                required
                value={stcwRegulation}
                onChange={(e) => setStcwRegulation(e.target.value)}
                className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1A2644] text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Panama Approval Resolution
                </label>
                <input
                  type="text"
                  value={approvalResolution}
                  onChange={(e) => setApprovalResolution(e.target.value)}
                  className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1A2644] text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Approval Date
                </label>
                <input
                  type="date"
                  value={approvalDate}
                  onChange={(e) => setApprovalDate(e.target.value)}
                  className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1A2644] text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Approval Valid Until
                </label>
                <input
                  type="date"
                  value={approvalValidUntil}
                  onChange={(e) => setApprovalValidUntil(e.target.value)}
                  className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1A2644] text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 5: TRAINING DETAILS */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#131F37] border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0B1F4B] dark:text-sky-300 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#0A7AC1]" />
            <span>5. Training Dates & Location</span>
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={trainingStartDate}
                onChange={(e) => setTrainingStartDate(e.target.value)}
                className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1A2644] text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={trainingEndDate}
                onChange={(e) => setTrainingEndDate(e.target.value)}
                className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1A2644] text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Mode
              </label>
              <select
                value={trainingMode}
                onChange={(e) => setTrainingMode(e.target.value as any)}
                className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1A2644] text-slate-900 dark:text-white"
              >
                <option value="Presential">Presential</option>
                <option value="Online">Online</option>
                <option value="Blended">Blended</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Location
              </label>
              <input
                type="text"
                value={trainingLocation}
                onChange={(e) => setTrainingLocation(e.target.value)}
                placeholder="e.g. Baku, Azerbaijan"
                className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1A2644] text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* SECTION 6: VALIDITY & SIGNATORY */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#131F37] border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0B1F4B] dark:text-sky-300 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0A7AC1]" />
            <span>6. Validity & Signatory</span>
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Issue Date *
              </label>
              <input
                type="date"
                required
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1A2644] text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Validity (Auto-Calculated)
              </label>
              <select
                value={validityYears}
                onChange={(e) => setValidityYears(Number(e.target.value))}
                className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1A2644] text-slate-900 dark:text-white"
              >
                <option value={1}>1 Year Validity</option>
                <option value={2}>2 Years Validity</option>
                <option value={3}>3 Years Validity</option>
                <option value={5}>5 Years (Standard STCW)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Expiry Date
              </label>
              <input
                type="date"
                disabled
                value={expiryDate}
                className="w-full h-10 px-3 text-xs font-mono tnum rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Signatory Name
              </label>
              <input
                type="text"
                value={signatoryName}
                onChange={(e) => setSignatoryName(e.target.value)}
                className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1A2644] text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Signatory Title
              </label>
              <input
                type="text"
                value={signatoryTitle}
                onChange={(e) => setSignatoryTitle(e.target.value)}
                className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1A2644] text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* SUBMIT BUTTONS */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3">
          <button
            type="button"
            onClick={() => setCurrentView('admin_certificates')}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => handleSubmit('draft')}
            className="w-full sm:w-auto px-5 py-2.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-[#131F37] hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Save as Draft
          </button>

          <button
            type="button"
            onClick={() => handleSubmit('valid')}
            className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-[#0B1F4B] hover:bg-[#0A7AC1] rounded-lg shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Save & Publish Certificate</span>
          </button>
        </div>

      </div>
    </div>
  );
};

/* Modal when published */
const PublishedSuccessModal: React.FC<{
  certificate: Certificate;
  onClose: () => void;
  onViewDetails: () => void;
}> = ({ certificate, onClose, onViewDetails }) => {
  const [copied, setCopied] = useState(false);
  const verifyLink = `${window.location.origin}/?verify=${certificate.uniqueNumber}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(verifyLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white dark:bg-[#131F37] rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-7 h-7" />
        </div>

        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
            Published to Panama STCW Registry
          </span>
          <h2 className="text-xl font-extrabold text-[#0B1F4B] dark:text-white mt-0.5">
            Certificate Published
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

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:underline cursor-pointer"
          >
            Back to Registry List
          </button>

          <button
            onClick={onViewDetails}
            className="px-5 py-2 text-xs font-bold uppercase tracking-wider text-white bg-[#0B1F4B] hover:bg-[#0A7AC1] rounded-lg shadow-xs cursor-pointer flex items-center gap-2"
          >
            <span>View Verification Page</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
