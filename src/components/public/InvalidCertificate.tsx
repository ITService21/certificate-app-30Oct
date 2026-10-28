import React from 'react';
import { useApp } from '../../context/AppContext';
import { AlertCircle, ArrowLeft, Search, Mail, Phone, ShieldAlert } from 'lucide-react';
import { CTC_COMPANY_INFO } from '../../data/mockData';

export const InvalidCertificate: React.FC = () => {
  const { searchQuery, setCurrentView, verifyByNumber } = useApp();

  return (
    <div className="flex-1 py-12 px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto w-full flex flex-col justify-center">
      <div className="bg-white dark:bg-[#131F37] border-2 border-red-200 dark:border-red-900/60 rounded-xl p-6 sm:p-8 shadow-lg text-center space-y-6">
        
        {/* Warning Icon Badge */}
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto shadow-xs">
          <ShieldAlert className="w-8 h-8" />
        </div>

        {/* Primary Alert Heading */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-widest text-red-600 dark:text-red-400">
            Official Registry Check Failed
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#0B1F4B] dark:text-white">
            This certificate number was not found.
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
            Please check the number or contact CTC.
          </p>
        </div>

        {/* Queried value display */}
        {searchQuery && (
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#1A2644] border border-slate-200 dark:border-slate-700 text-xs font-mono tnum text-slate-700 dark:text-slate-300">
            Searched identifier: <strong className="text-red-600 dark:text-red-400 font-bold">{searchQuery}</strong>
          </div>
        )}

        {/* Instructions / Guidance */}
        <div className="text-left text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-[#1A2644] p-4 rounded-lg space-y-2 border border-slate-200 dark:border-slate-700">
          <strong className="text-slate-800 dark:text-slate-200 block text-[11px] uppercase tracking-wider">
            Possible Reasons:
          </strong>
          <ul className="list-disc list-inside space-y-1 text-[11px]">
            <li>A typographical error occurred while entering the 14-digit number.</li>
            <li>The certificate was issued under a different series or is pending registry publication.</li>
            <li>The physical parchment may not have originated from Continental Training Center S.A.</li>
          </ul>
        </div>

        {/* Contact Help Box */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4 text-xs text-slate-500 dark:text-slate-400 space-y-2">
          <span className="font-semibold block text-slate-700 dark:text-slate-300">
            Need Direct Verification Assistance?
          </span>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
            <a
              href={`mailto:${CTC_COMPANY_INFO.email}?subject=Certificate Verification Inquiry for ${searchQuery}`}
              className="inline-flex items-center gap-1.5 text-[#0A7AC1] dark:text-sky-400 hover:underline font-semibold"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>{CTC_COMPANY_INFO.email}</span>
            </a>
            <span>·</span>
            <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>{CTC_COMPANY_INFO.phone}</span>
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => setCurrentView('verify_home')}
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-white bg-[#0B1F4B] hover:bg-[#0A7AC1] transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Try Another Number</span>
          </button>

          <button
            onClick={() => verifyByNumber('32625474824291')}
            className="w-full sm:w-auto px-4 py-2.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Load Valid Sample (32625474824291)
          </button>
        </div>

      </div>
    </div>
  );
};
