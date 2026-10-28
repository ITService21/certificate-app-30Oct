import React from 'react';
import { useApp } from '../../context/AppContext';
import { ArrowLeft, User, Calendar, Award, ExternalLink, AlertTriangle, ShieldCheck, Search } from 'lucide-react';
import { Certificate, CertificateStatus } from '../../types';

export const SearchResults: React.FC = () => {
  const {
    nameSearchResults,
    searchQuery,
    openCertificateById,
    setCurrentView,
    setSearchQuery,
  } = useApp();

  const getStatusBadge = (status: CertificateStatus) => {
    switch (status) {
      case 'valid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Valid</span>
          </span>
        );
      case 'expiring':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>Expiring Soon</span>
          </span>
        );
      case 'revoked':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 border border-red-300 dark:border-red-800">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            <span>Revoked</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
            <span>Draft</span>
          </span>
        );
    }
  };

  const maskUniqueNumber = (num: string) => {
    if (num.length < 10) return num;
    return `${num.substring(0, 4)}••••••${num.substring(num.length - 4)}`;
  };

  return (
    <div className="flex-1 py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
      {/* Top back navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setCurrentView('verify_home')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#0A7AC1] dark:text-sky-400 hover:underline cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Verification Search</span>
        </button>

        <span className="text-xs text-slate-500 dark:text-slate-400">
          Showing results for <strong className="text-slate-800 dark:text-slate-200">"{searchQuery}"</strong>
        </span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#0B1F4B] dark:text-white">
          Maritime Certificate Search Results
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Found {nameSearchResults.length} matching STCW records issued by Continental Training Center S.A.
        </p>
      </div>

      {/* Results List */}
      {nameSearchResults.length > 0 ? (
        <div className="space-y-4">
          {nameSearchResults.map((cert) => (
            <div
              key={cert.id}
              className="bg-white dark:bg-[#131F37] border border-slate-200 dark:border-slate-700/80 rounded-xl p-5 shadow-xs hover:border-[#0A7AC1]/50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-extrabold text-base text-[#0B1F4B] dark:text-white">
                    {cert.traineeTitle} {cert.traineeName}
                  </span>
                  {getStatusBadge(cert.status)}
                </div>

                <div className="flex items-start gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <Award className="w-4 h-4 text-[#0A7AC1] shrink-0 mt-0.5" />
                  <span>{cert.courseTitle}</span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1 font-mono tnum">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Issued: {cert.issueDate}</span>
                  </div>
                  <span>·</span>
                  <div className="font-mono tnum">
                    <span>Valid until: {cert.expiryDate}</span>
                  </div>
                  <span>·</span>
                  <div className="font-mono tnum text-[#0A7AC1] dark:text-sky-400">
                    <span>Cert: {cert.certificateId}</span>
                  </div>
                  <span>·</span>
                  <div className="font-mono tnum">
                    <span>No: {maskUniqueNumber(cert.uniqueNumber)}</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="shrink-0 flex items-center gap-3">
                <button
                  onClick={() => openCertificateById(cert.uniqueNumber)}
                  className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-white bg-[#0B1F4B] hover:bg-[#0A7AC1] transition-colors shadow-xs cursor-pointer"
                >
                  <span>View Details</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white dark:bg-[#131F37] border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center max-w-xl mx-auto shadow-xs">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto mb-4">
            <Search className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
            No certificate found
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
            We couldn't find any STCW certificates matching the name <strong className="text-slate-700 dark:text-slate-300">"{searchQuery}"</strong> in the Continental Training Center S.A. registry.
          </p>
          
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => setCurrentView('verify_home')}
              className="px-4 py-2 text-xs font-bold text-white bg-[#0B1F4B] hover:bg-[#0A7AC1] rounded-lg transition-colors cursor-pointer"
            >
              Try Another Name or Number
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
