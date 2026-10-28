import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Certificate } from '../../types';
import { XCircle, AlertTriangle, X, ShieldAlert } from 'lucide-react';

interface RevokeModalProps {
  certificate: Certificate | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RevokeModal: React.FC<RevokeModalProps> = ({ certificate, isOpen, onClose }) => {
  const { revokeCertificate, currentUser, showToast } = useApp();
  const [reason, setReason] = useState<'issued_in_error' | 'fraud' | 'course_withdrawn' | 'administrative_suspension'>('fraud');
  const [notes, setNotes] = useState('');
  const [confirmId, setConfirmId] = useState('');

  if (!isOpen || !certificate) return null;

  const isSuperAdmin = currentUser?.role === 'super_admin';

  const handleConfirmRevocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      showToast('Permission denied: Only Super Admin can revoke official certificates', 'error');
      return;
    }

    if (!notes.trim()) {
      showToast('Please provide an official audit note explaining revocation reason', 'error');
      return;
    }

    revokeCertificate(certificate.id, reason, notes);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#131F37] border-2 border-red-300 dark:border-red-900/80 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-red-100 dark:border-red-950/60 bg-red-50 dark:bg-[#200A0F]">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span className="font-extrabold text-sm tracking-tight">
              Revoke Maritime STCW Certificate
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleConfirmRevocation} className="p-6 space-y-4">
          
          {/* Target Certificate Summary */}
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#1A2644] border border-slate-200 dark:border-slate-700 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white">
                {certificate.traineeTitle} {certificate.traineeName}
              </span>
              <span className="font-mono tnum text-[#0A7AC1] dark:text-sky-400">
                {certificate.certificateId}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono tnum">
              14-Digit Number: {certificate.uniqueNumber}
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
              {certificate.courseTitle}
            </div>
          </div>

          {!isSuperAdmin && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200">
              <strong>Role Restriction:</strong> You are logged in as an <em>Issuer</em>. Only users with the <strong>Super Admin</strong> role have authorization to nullify or revoke registered maritime credentials.
            </div>
          )}

          {/* Reason Dropdown */}
          <div>
            <label
              htmlFor="revoke-reason"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1"
            >
              Official Revocation Reason
            </label>
            <select
              id="revoke-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value as any)}
              disabled={!isSuperAdmin}
              className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1A2644] text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-red-500"
            >
              <option value="issued_in_error">Issued in Error (Clerical / Data Entry Discrepancy)</option>
              <option value="fraud">Fraud / Fraudulent Documentation or False Sea-Service Records</option>
              <option value="course_withdrawn">Course Withdrawn / Incomplete Practical Assessment</option>
              <option value="administrative_suspension">Administrative Suspension by Panama Maritime Authority</option>
            </select>
          </div>

          {/* Detailed Audit Notes */}
          <div>
            <label
              htmlFor="revoke-notes"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1"
            >
              Audit Notes & Resolution References
            </label>
            <textarea
              id="revoke-notes"
              rows={3}
              required
              disabled={!isSuperAdmin}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter official investigation details or AMP inspector resolution reference..."
              className="w-full p-3 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1A2644] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-red-500"
            />
          </div>

          <p className="text-[11px] text-red-600 dark:text-red-400 leading-tight">
            <strong>Warning:</strong> Revoking this credential immediately flags the public verification page with a RED Revoked banner for port state control audits.
          </p>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!isSuperAdmin}
              className="px-5 py-2 text-xs font-bold uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed rounded shadow-xs transition-colors cursor-pointer"
            >
              Confirm Official Revocation
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
