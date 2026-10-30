import React from 'react';
import { CtcLogo, UagLogo, PanamaOfficialBadge } from './Logos';
import { CTC_COMPANY_INFO } from '../../data/company';
import { ShieldCheck, Mail, MapPin, Globe, Phone, ExternalLink } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Footer: React.FC = () => {
  const { setCurrentView } = useApp();

  return (
    <footer className="w-full bg-white dark:bg-[#080E1A] border-t border-slate-200 dark:border-slate-800 transition-colors mt-auto no-print">
      {/* Top accreditation ribbon */}
      <div className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-[#0B1220] py-3 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Panama Maritime Authority (AMP) Registered STCW Training Facility
            </span>
          </div>
          <div className="text-[11px] font-mono tnum text-slate-500">
            {CTC_COMPANY_INFO.resolutionNo}
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Col 1: Identity */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex flex-wrap items-center gap-4">
              <CtcLogo size={36} showText={true} />
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-lg mt-2">
              Continental Training Center S.A. (CTC) is a maritime educational and certification institution operating under United Alliance Group Ltd, Panama. Authorized under Panama Maritime Authority (AMP) regulations in strict compliance with the International Convention on Standards of Training, Certification and Watchkeeping for Seafarers (STCW 1978, as amended).
            </p>
            <div className="pt-2">
              <PanamaOfficialBadge />
            </div>
          </div>

          {/* Col 2: Institutional Headquarters */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0B1F4B] dark:text-sky-400 block">
              Official Headquarters
            </span>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#0A7AC1] shrink-0 mt-0.5" />
                <span>
                  PH BICSA Financial Center, Floor 44, Office 4406, Balboa Avenue, Panama City, Republic of Panama
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#0A7AC1] shrink-0" />
                <a href="mailto:info@ctc.com.pa" className="hover:underline">info@ctc.com.pa</a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[#0A7AC1] shrink-0" />
                <span>+507 269-8422 / +507 830-5190</span>
              </li>
              <li className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-[#0A7AC1] shrink-0" />
                <a href="https://www.ctc.com.pa" target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1">
                  www.ctc.com.pa
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Portal & Audit Links */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0B1F4B] dark:text-sky-400 block">
              Auditor Resources
            </span>
            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <li>
                <button
                  onClick={() => setCurrentView('verify_home')}
                  className="hover:text-[#0A7AC1] dark:hover:text-white transition-colors cursor-pointer text-left"
                >
                  Verify Certificate Online
                </button>
              </li>
              <li>
                <button
                  onClick={() => setCurrentView('admin_login')}
                  className="hover:text-[#0A7AC1] dark:hover:text-white transition-colors cursor-pointer text-left"
                >
                  Administrator & Auditor Portal
                </button>
              </li>
              <li className="text-slate-400 text-[11px] pt-1">
                For port state control (PSC) verification inquiries or vetting audits, contact registrar@ctc.com.pa
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500 dark:text-slate-400 text-center sm:text-left">
          <div>
            © {new Date().getFullYear()} Continental Training Center S.A.
          </div>
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 sm:gap-3">
            <span>STCW 1978 / 2010</span>
            <span>·</span>
            <span>RUC: 155728192</span>
            <span>·</span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400">AMP Certified</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
