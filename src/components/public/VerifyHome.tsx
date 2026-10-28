import React, { useState } from 'react';
import { Search, QrCode, Shield, CheckCircle, ArrowRight, UserCheck, Anchor, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { QrScannerModal } from '../common/QrScannerModal';

export const VerifyHome: React.FC = () => {
  const { verifyByNumber, verifyByName, showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'number' | 'name'>('number');
  const [certNumberInput, setCertNumberInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);

  const handleNumberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNum = certNumberInput.replace(/\s+/g, '');
    if (!cleanNum) {
      showToast('Please enter the 14-digit number from your certificate', 'error');
      return;
    }
    verifyByNumber(cleanNum);
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      showToast('Please enter a trainee name to search', 'error');
      return;
    }
    verifyByName(nameInput.trim());
  };

  return (
    <div className="flex-1 flex flex-col justify-start">
      {/* QR Scanner Modal */}
      <QrScannerModal isOpen={scannerOpen} onClose={() => setScannerOpen(false)} />

      {/* Main Verification Card Area */}
      <section className="relative overflow-hidden pt-8 pb-16 sm:py-16 bg-slate-50 dark:bg-[#0B1220]">
        
        {/* Subtle background nautical watermark */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.04] pointer-events-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="marine-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#marine-grid)" />
          </svg>
        </div>

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
          
          {/* Subtle badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-4 rounded-full bg-[#0A7AC1]/10 dark:bg-sky-950/70 border border-[#0A7AC1]/20 dark:border-sky-800 text-[#0A7AC1] dark:text-sky-300 text-xs font-semibold">
            <Anchor className="w-3.5 h-3.5" />
            <span>Continental Training Center S.A. · Republic of Panama</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0B1F4B] dark:text-white leading-tight">
            Verify a Certificate
          </h1>

          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 max-w-xl mx-auto">
            Scan the QR code on your certificate or enter the 14-digit number printed below it.
          </p>

          {/* Search Card */}
          <div className="mt-6 bg-white dark:bg-[#131F37] border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-5 sm:p-7 text-left">
            
            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 mb-5">
              <button
                type="button"
                onClick={() => setActiveTab('number')}
                className={`flex-1 pb-3 text-center text-xs sm:text-sm font-bold tracking-tight border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'number'
                    ? 'border-[#0A7AC1] text-[#0A7AC1] dark:text-sky-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Certificate Number (14 Digits)
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('name')}
                className={`flex-1 pb-3 text-center text-xs sm:text-sm font-bold tracking-tight border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'name'
                    ? 'border-[#0A7AC1] text-[#0A7AC1] dark:text-sky-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Search by Name
              </button>
            </div>

            {/* TAB 1: Number Search Form */}
            {activeTab === 'number' && (
              <form onSubmit={handleNumberSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="certNumber"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    14-Digit Unique Number or Certificate ID
                  </label>
                  <div className="relative flex items-center">
                    <input
                      id="certNumber"
                      type="text"
                      value={certNumberInput}
                      onChange={(e) => setCertNumberInput(e.target.value)}
                      placeholder="e.g. 32625474824291 or UAG-TC-22-PSCRB-01115"
                      className="w-full h-12 pl-4 pr-12 text-sm sm:text-base font-mono tnum rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-[#1A2644] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#0A7AC1] transition-all"
                    />
                    <div className="absolute right-3 text-slate-400 pointer-events-none">
                      <Search className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                  <button
                    type="submit"
                    className="flex-1 h-11 inline-flex items-center justify-center gap-2 px-6 rounded-lg font-bold text-xs uppercase tracking-wider text-white bg-[#0B1F4B] hover:bg-[#0A7AC1] transition-colors shadow-sm cursor-pointer"
                  >
                    <Search className="w-4 h-4" />
                    <span>Verify Certificate</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScannerOpen(true)}
                    className="h-11 inline-flex items-center justify-center gap-2 px-5 rounded-lg font-bold text-xs uppercase tracking-wider text-[#0A7AC1] dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 border border-sky-200 dark:border-sky-800 transition-colors cursor-pointer"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Scan QR</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: Name Search Form */}
            {activeTab === 'name' && (
              <form onSubmit={handleNameSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="traineeName"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Trainee Seafarer Name
                  </label>
                  <div className="relative flex items-center">
                    <input
                      id="traineeName"
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="e.g. ELBY MATHEW or NIKOLAOS"
                      className="w-full h-12 pl-4 pr-12 text-sm sm:text-base rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-[#1A2644] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#0A7AC1] transition-all"
                    />
                    <div className="absolute right-3 text-slate-400 pointer-events-none">
                      <UserCheck className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                  <button
                    type="submit"
                    className="flex-1 h-11 inline-flex items-center justify-center gap-2 px-6 rounded-lg font-bold text-xs uppercase tracking-wider text-white bg-[#0B1F4B] hover:bg-[#0A7AC1] transition-colors shadow-sm cursor-pointer"
                  >
                    <Search className="w-4 h-4" />
                    <span>Search Records</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScannerOpen(true)}
                    className="h-11 inline-flex items-center justify-center gap-2 px-5 rounded-lg font-bold text-xs uppercase tracking-wider text-[#0A7AC1] dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 border border-sky-200 dark:border-sky-800 transition-colors cursor-pointer"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Scan QR</span>
                  </button>
                </div>
              </form>
            )}

            {/* Quick 1-Click Samples for Easy Testing */}
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
              <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Quick Test Records:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => verifyByNumber('32625474824291')}
                  className="px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[11px] font-medium hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  <span className="font-bold">✔ Valid:</span> 32625474824291
                </button>

                <button
                  type="button"
                  onClick={() => verifyByNumber('84920173645102')}
                  className="px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-[11px] font-medium hover:bg-amber-100 transition-colors cursor-pointer"
                >
                  <span className="font-bold">⚠ Expiring:</span> 84920173645102
                </button>

                <button
                  type="button"
                  onClick={() => verifyByNumber('91827364501928')}
                  className="px-2.5 py-1 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-[11px] font-medium hover:bg-red-100 transition-colors cursor-pointer"
                >
                  <span className="font-bold">✖ Revoked:</span> 91827364501928
                </button>
              </div>
            </div>

          </div>

          {/* Simple Clean Trust Ribbon */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              <span>Panama Maritime Authority (AMP) Standard</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              <span>IMO STCW 1978 / 2010 Compliance</span>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
};
