import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { certificateUrl, openPdf } from '../../api';
import { Certificate, CertificateStatus } from '../../types';
import {
  Search,
  Filter,
  PlusCircle,
  Upload,
  Download,
  Eye,
  Edit,
  Slash,
  Copy,
  Check,
  FileSpreadsheet,
  Calendar,
  X,
  FileText,
  Trash2,
} from 'lucide-react';
import { RevokeModal } from './RevokeModal';
import { downloadOfficialCertificate } from '../../utils/certificateDownload';

export const CertificatesListView: React.FC = () => {
  const {
    certificates,
    openCertificateById,
    setCurrentView,
    deleteCertificate,
    updateCertificate,
    bulkImportCertificates,
    currentUser,
    showToast,
  } = useApp();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [revokeModalCert, setRevokeModalCert] = useState<Certificate | null>(null);
  const [editModalCert, setEditModalCert] = useState<Certificate | null>(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const isSuperAdmin = currentUser?.role === 'super_admin';

  // Unique list of courses for filter dropdown
  const uniqueCourses = useMemo(() => {
    const set = new Set<string>();
    certificates.forEach((c) => set.add(c.courseTitle));
    return Array.from(set);
  }, [certificates]);

  // Filtered certificates
  const filteredCertificates = useMemo(() => {
    return certificates.filter((c) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        c.uniqueNumber.includes(q) ||
        c.certificateId.toLowerCase().includes(q) ||
        c.traineeName.toLowerCase().includes(q) ||
        c.passportNumber.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      const matchesCourse = courseFilter === 'all' || c.courseTitle === courseFilter;

      return matchesSearch && matchesStatus && matchesCourse;
    });
  }, [certificates, search, statusFilter, courseFilter]);

  const handleCopyLink = (uniqueNum: string) => {
    const link = certificateUrl(uniqueNum);
    navigator.clipboard.writeText(link);
    setCopiedId(uniqueNum);
    showToast(`Verification link copied for ${uniqueNum}`, 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = async (cert: Certificate) => {
    try {
      await downloadOfficialCertificate(cert);
      showToast(`Downloading certificate for ${cert.certificateId}`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Error generating certificate file', 'error');
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'UniqueNumber',
      'CertificateID',
      'TraineeTitle',
      'TraineeName',
      'PassportNumber',
      'CourseTitle',
      'STCWRegulation',
      'IssueDate',
      'ExpiryDate',
      'Status',
    ];

    const rows = certificates.map((c) => [
      `"${c.uniqueNumber}"`,
      `"${c.certificateId}"`,
      `"${c.traineeTitle}"`,
      `"${c.traineeName}"`,
      `"${c.passportNumber}"`,
      `"${c.courseTitle}"`,
      `"${c.stcwRegulation}"`,
      `"${c.issueDate}"`,
      `"${c.expiryDate}"`,
      `"${c.status}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CTC_Panama_STCW_Registry_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Registry exported as CSV successfully', 'success');
  };

  const maskPassport = (num: string) => {
    if (!num || num === 'N/A') return 'N/A';
    if (num.length <= 4) return num;
    return `${num.substring(0, 3)}****${num.substring(num.length - 2)}`;
  };

  const getStatusBadge = (status: CertificateStatus) => {
    switch (status) {
      case 'valid':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Valid</span>
          </span>
        );
      case 'expiring':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>Expiring</span>
          </span>
        );
      case 'revoked':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            <span>Revoked</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <span>Draft</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-5">
      {/* Revoke Modal */}
      <RevokeModal
        certificate={revokeModalCert}
        isOpen={!!revokeModalCert}
        onClose={() => setRevokeModalCert(null)}
      />

      {/* Edit Modal */}
      {editModalCert && (
        <EditCertificateModal
          certificate={editModalCert}
          onClose={() => setEditModalCert(null)}
          onSave={(updates) => {
            updateCertificate(editModalCert.id, updates);
            setEditModalCert(null);
          }}
        />
      )}

      {/* Bulk Upload Modal */}
      {bulkModalOpen && (
        <BulkUploadModal
          onClose={() => setBulkModalOpen(false)}
          onImport={(items) => {
            bulkImportCertificates(items);
            setBulkModalOpen(false);
          }}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0B1F4B] dark:text-white">
            Certificates Registry
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage, customize, and audit official Panama STCW certificate credentials
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setBulkModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-[#131F37] border border-slate-300 dark:border-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-[#0A7AC1]" />
            <span>Bulk CSV</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-[#131F37] border border-slate-300 dark:border-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#0A7AC1]" />
            <span>Export</span>
          </button>

          <button
            onClick={() => setCurrentView('admin_add_cert')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-white bg-[#0B1F4B] hover:bg-[#0A7AC1] transition-colors shadow-xs cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Generate Certificate</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-3.5 rounded-xl bg-white dark:bg-[#131F37] border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by 14-digit number, ID, Name, or Passport..."
            className="w-full h-9 pl-9 pr-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1A2644] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#0A7AC1]"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1A2644] text-slate-700 dark:text-slate-200 focus:outline-hidden"
          >
            <option value="all">All Statuses</option>
            <option value="valid">Valid Only</option>
            <option value="expiring">Expiring Soon</option>
            <option value="revoked">Revoked</option>
          </select>

          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="h-9 px-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1A2644] text-slate-700 dark:text-slate-200 focus:outline-hidden max-w-[200px] truncate"
          >
            <option value="all">All Courses</option>
            {uniqueCourses.map((c) => (
              <option key={c} value={c}>
                {c.length > 25 ? c.substring(0, 25) + '...' : c}
              </option>
            ))}
          </select>

          {(search || statusFilter !== 'all' || courseFilter !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setCourseFilter('all');
              }}
              className="text-xs font-semibold text-slate-500 hover:text-red-500"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* TABLE VIEW (Desktop) */}
      <div className="hidden md:block bg-white dark:bg-[#131F37] border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#0E172A] border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-2.5 px-3">14-Digit Number</th>
                <th className="py-2.5 px-3">Certificate ID</th>
                <th className="py-2.5 px-3">Trainee</th>
                <th className="py-2.5 px-3">Passport No.</th>
                <th className="py-2.5 px-3">Course</th>
                <th className="py-2.5 px-3">Issue Date</th>
                <th className="py-2.5 px-3">Expiry</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredCertificates.map((cert) => (
                <tr key={cert.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-3 font-mono tnum text-[#0A7AC1] dark:text-sky-300 font-bold whitespace-nowrap">
                    {cert.uniqueNumber}
                  </td>
                  <td className="py-2.5 px-3 font-mono tnum text-slate-800 dark:text-slate-200 font-semibold whitespace-nowrap">
                    {cert.certificateId}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap font-bold text-[#0B1F4B] dark:text-white">
                    {cert.traineeTitle} {cert.traineeName}
                  </td>
                  <td className="py-2.5 px-3 font-mono tnum text-slate-500 whitespace-nowrap">
                    {maskPassport(cert.passportNumber)}
                  </td>
                  <td className="py-2.5 px-3 max-w-[200px] truncate text-slate-700 dark:text-slate-300" title={cert.courseTitle}>
                    {cert.courseTitle}
                  </td>
                  <td className="py-2.5 px-3 font-mono tnum text-slate-500 whitespace-nowrap">
                    {cert.issueDate}
                  </td>
                  <td className="py-2.5 px-3 font-mono tnum text-slate-500 whitespace-nowrap">
                    {cert.expiryDate}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    {getStatusBadge(cert.status)}
                  </td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openCertificateById(cert.uniqueNumber)}
                        title="View Details"
                        className="p-1 text-slate-400 hover:text-[#0A7AC1] dark:hover:text-white cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setEditModalCert(cert)}
                        title="Edit Certificate Details & File"
                        className="p-1 text-slate-400 hover:text-[#0A7AC1] dark:hover:text-white cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => openPdf(`/api/verify/${cert.uniqueNumber}/document`).catch((e) => showToast(e.message, 'error'))}
                        title="Open Certificate PDF"
                        className="p-1 text-slate-400 hover:text-[#0A7AC1] dark:hover:text-white cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDownload(cert)}
                        title="Download Certificate PDF"
                        className="p-1 text-slate-400 hover:text-[#0A7AC1] dark:hover:text-white cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleCopyLink(cert.uniqueNumber)}
                        title="Copy Link"
                        className="p-1 text-slate-400 hover:text-[#0A7AC1] dark:hover:text-white cursor-pointer"
                      >
                        {copiedId === cert.uniqueNumber ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {cert.status !== 'revoked' && isSuperAdmin && (
                        <button
                          onClick={() => setRevokeModalCert(cert)}
                          title="Revoke Certificate"
                          className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                        >
                          <Slash className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {isSuperAdmin && (
                        <button
                          onClick={() => {
                            if (confirm(`Delete certificate ${cert.certificateId}?`)) {
                              deleteCertificate(cert.id);
                            }
                          }}
                          title="Delete Record"
                          className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MOBILE STACKED CARDS VIEW (md:hidden) */}
      <div className="md:hidden space-y-3">
        {filteredCertificates.map((cert) => (
          <div
            key={cert.id}
            className="p-4 rounded-xl bg-white dark:bg-[#131F37] border border-slate-200 dark:border-slate-700 shadow-xs space-y-2.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="font-extrabold text-sm text-[#0B1F4B] dark:text-white block">
                  {cert.traineeTitle} {cert.traineeName}
                </span>
                <span className="font-mono tnum text-xs font-bold text-[#0A7AC1] dark:text-sky-300">
                  {cert.uniqueNumber}
                </span>
              </div>
              {getStatusBadge(cert.status)}
            </div>

            <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">
              {cert.courseTitle}
            </div>

            <div className="grid grid-cols-2 gap-1 text-[11px] font-mono tnum text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
              <div>Cert: {cert.certificateId}</div>
              <div>Passport: {maskPassport(cert.passportNumber)}</div>
              <div>Issued: {cert.issueDate}</div>
              <div>Expires: {cert.expiryDate}</div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => openCertificateById(cert.uniqueNumber)}
                  className="font-bold text-[#0A7AC1] dark:text-sky-300 flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View</span>
                </button>

                <button
                  onClick={() => setEditModalCert(cert)}
                  className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>

                <button
                  onClick={() => handleDownload(cert)}
                  className="text-slate-600 dark:text-slate-300"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>

              {cert.status !== 'revoked' && isSuperAdmin && (
                <button
                  onClick={() => setRevokeModalCert(cert)}
                  className="px-2 py-0.5 text-[11px] font-bold text-red-600 bg-red-50 dark:bg-red-950/60 rounded"
                >
                  Revoke
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* Edit Certificate Modal */
const EditCertificateModal: React.FC<{
  certificate: Certificate;
  onClose: () => void;
  onSave: (updates: Partial<Certificate>) => void;
}> = ({ certificate, onClose, onSave }) => {
  const [traineeTitle, setTraineeTitle] = useState(certificate.traineeTitle);
  const [traineeName, setTraineeName] = useState(certificate.traineeName);
  const [passportNumber, setPassportNumber] = useState(certificate.passportNumber);
  const [nationality, setNationality] = useState(certificate.nationality ?? '');
  const [courseTitle, setCourseTitle] = useState(certificate.courseTitle);
  const [stcwRegulation, setStcwRegulation] = useState(certificate.stcwRegulation);
  const [status, setStatus] = useState<CertificateStatus>(certificate.status);
  const [issueDate, setIssueDate] = useState(certificate.issueDate);
  const [expiryDate, setExpiryDate] = useState(certificate.expiryDate);
  const [trainingLocation, setTrainingLocation] = useState(certificate.trainingLocation);
  const [documentUrl, setDocumentUrl] = useState(certificate.documentUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setDocumentUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      traineeTitle,
      traineeName: traineeName.trim().toUpperCase(),
      passportNumber: passportNumber.trim(),
      nationality: nationality.trim().toUpperCase(),
      courseTitle,
      stcwRegulation,
      status,
      issueDate,
      expiryDate,
      trainingLocation,
      documentUrl,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="w-full max-w-xl bg-white dark:bg-[#131F37] rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Edit className="w-4 h-4 text-[#0A7AC1]" />
            <span className="font-bold text-sm text-[#0B1F4B] dark:text-white">
              Edit Certificate: {certificate.certificateId}
            </span>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Unique number info */}
          <div className="p-2.5 rounded bg-slate-50 dark:bg-[#1A2644] text-[11px] font-mono flex items-center justify-between">
            <span>Unique No: <strong>{certificate.uniqueNumber}</strong></span>
            <span>ID: <strong>{certificate.certificateId}</strong></span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-3">
              <label className="block font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Title</label>
              <select
                value={traineeTitle}
                onChange={(e) => setTraineeTitle(e.target.value as any)}
                className="w-full h-9 px-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1A2644]"
              >
                <option value="Mr.">Mr.</option>
                <option value="Ms.">Ms.</option>
                <option value="Capt.">Capt.</option>
                <option value="Eng.">Eng.</option>
              </select>
            </div>

            <div className="sm:col-span-5">
              <label className="block font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Trainee Name</label>
              <input
                type="text"
                required
                value={traineeName}
                onChange={(e) => setTraineeName(e.target.value)}
                className="w-full h-9 px-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1A2644] uppercase"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Passport No.</label>
              <input
                type="text"
                required
                value={passportNumber}
                onChange={(e) => setPassportNumber(e.target.value)}
                className="w-full h-9 px-2 font-mono rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1A2644] uppercase"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Nationality</label>
              <input
                type="text"
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                className="w-full h-9 px-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1A2644] uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Course Title</label>
            <input
              type="text"
              required
              value={courseTitle}
              onChange={(e) => setCourseTitle(e.target.value)}
              className="w-full h-9 px-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1A2644]"
            />
          </div>

          <div>
            <label className="block font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">STCW Regulation</label>
            <input
              type="text"
              required
              value={stcwRegulation}
              onChange={(e) => setStcwRegulation(e.target.value)}
              className="w-full h-9 px-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1A2644]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as CertificateStatus)}
                className="w-full h-9 px-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1A2644]"
              >
                <option value="valid">Valid</option>
                <option value="expiring">Expiring Soon</option>
                <option value="revoked">Revoked</option>
                <option value="draft">Draft</option>
              </select>
            </div>

            <div>
              <label className="block font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Issue Date</label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full h-9 px-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1A2644]"
              />
            </div>

            <div>
              <label className="block font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">Expiry Date</label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full h-9 px-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1A2644]"
              />
            </div>
          </div>

          {/* Upload/Replace Certificate File */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="block font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
              Certificate Document (Image or PDF)
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*,application/pdf"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-[#1A2644] text-slate-700 dark:text-slate-200 hover:bg-slate-100"
            >
              {documentUrl ? 'Replace Uploaded File' : 'Upload File'}
            </button>
            {documentUrl && (
              <span className="ml-2 text-emerald-600 font-semibold">File attached</span>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 dark:text-slate-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 font-bold uppercase tracking-wider text-white bg-[#0B1F4B] hover:bg-[#0A7AC1] rounded shadow-xs"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* Bulk Upload Simulation Modal */
const BulkUploadModal: React.FC<{
  onClose: () => void;
  onImport: (items: Partial<Certificate>[]) => void;
}> = ({ onClose, onImport }) => {
  const [sampleLoaded, setSampleLoaded] = useState(false);

  const sampleItems: Partial<Certificate>[] = [
    {
      uniqueNumber: '58291049281742',
      certificateId: 'UAG-TC-26-EER-06101',
      traineeTitle: 'Mr.',
      traineeName: 'CARLOS ALBERTO MENDOZA',
      passportNumber: 'PA7821903',
      courseTitle: 'Engine Room Resource Management (ERM)',
      issueDate: '2026-06-10',
      expiryDate: '2031-06-09',
      status: 'valid',
    },
    {
      uniqueNumber: '49182736450192',
      certificateId: 'UAG-TC-26-SAT-07204',
      traineeTitle: 'Ms.',
      traineeName: 'LEILA YILMAZ',
      passportNumber: 'TR9821034',
      courseTitle: 'Security Awareness Training for All Seafarers',
      issueDate: '2026-07-01',
      expiryDate: '2031-06-30',
      status: 'valid',
    },
    {
      uniqueNumber: '73910284719203',
      certificateId: 'UAG-TC-26-RAD-08311',
      traineeTitle: 'Capt.',
      traineeName: 'ARTHUR VANDERBILT',
      passportNumber: 'GB4489210',
      courseTitle: 'Radar Navigation, Radar Plotting and Use of ARPA',
      issueDate: '2026-08-15',
      expiryDate: '2031-08-14',
      status: 'valid',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white dark:bg-[#131F37] rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[#0A7AC1]" />
            <span className="font-bold text-sm text-[#0B1F4B] dark:text-white">
              Bulk CSV Certificate Import
            </span>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-5 text-center space-y-2 bg-slate-50 dark:bg-[#1A2644]">
          <Upload className="w-7 h-7 text-slate-400 mx-auto" />
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Drag & drop certificate CSV file
          </p>
          <button
            onClick={() => setSampleLoaded(true)}
            className="mt-1 px-3 py-1 text-xs font-bold text-[#0A7AC1] dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 rounded hover:bg-sky-100"
          >
            Load 3-Record Batch Sample
          </button>
        </div>

        {sampleLoaded && (
          <div className="space-y-1 text-xs">
            <span className="font-bold text-slate-600 dark:text-slate-400 block text-[11px]">Ready to Import:</span>
            {sampleItems.map((s, idx) => (
              <div key={idx} className="p-1.5 rounded bg-slate-100 dark:bg-slate-800 flex justify-between">
                <span className="font-bold">{s.traineeName}</span>
                <span className="font-mono text-[#0A7AC1]">{s.uniqueNumber}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-slate-500">
            Cancel
          </button>
          <button
            disabled={!sampleLoaded}
            onClick={() => onImport(sampleItems)}
            className="px-4 py-1.5 text-xs font-bold text-white bg-[#0B1F4B] hover:bg-[#0A7AC1] disabled:opacity-40 rounded"
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
};
