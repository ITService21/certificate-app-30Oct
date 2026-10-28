import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  PlusCircle,
  Eye,
  Calendar,
  Award,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { CertificateStatus } from '../../types';

export const DashboardView: React.FC = () => {
  const { certificates, setCurrentView, openCertificateById } = useApp();

  // Calculate KPIs
  const kpis = useMemo(() => {
    const total = certificates.length;
    const active = certificates.filter((c) => c.status === 'valid').length;
    const revoked = certificates.filter((c) => c.status === 'revoked').length;
    const expiring = certificates.filter((c) => c.status === 'expiring').length;

    return { total, active, revoked, expiring };
  }, [certificates]);

  // Course distribution
  const courseDistribution = useMemo(() => {
    const map: { [course: string]: number } = {};
    certificates.forEach((c) => {
      let label = c.courseTitle;
      if (label.includes('Survival Craft')) label = 'Survival Craft (PSCRB)';
      else if (label.includes('Fire Fighting')) label = 'Advanced Fire Fighting';
      else if (label.includes('Medical First Aid')) label = 'Medical First Aid';
      else if (label.includes('Bridge Resource')) label = 'Bridge Resource Mgmt';
      else if (label.includes('Basic Safety')) label = 'Basic Safety Training';
      else if (label.includes('ECDIS')) label = 'ECDIS Navigation';
      else if (label.length > 25) label = label.substring(0, 24) + '...';

      map[label] = (map[label] || 0) + 1;
    });

    return Object.entries(map).map(([name, count]) => ({
      name,
      count,
      percent: Math.round((count / certificates.length) * 100),
    }));
  }, [certificates]);

  const getStatusBadge = (status: CertificateStatus) => {
    switch (status) {
      case 'valid':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
            <span>Valid</span>
          </span>
        );
      case 'expiring':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
            <span>Expiring</span>
          </span>
        );
      case 'revoked':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300">
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
    <div className="space-y-6 max-w-full">
      
      {/* Top Banner & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#0B1F4B] dark:text-white">
            STCW Registry Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Continental Training Center S.A. · Republic of Panama
          </p>
        </div>

        <button
          onClick={() => setCurrentView('admin_add_cert')}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-white bg-[#0B1F4B] hover:bg-[#0A7AC1] transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add Certificate</span>
        </button>
      </div>

      {/* 4 KPI CARDS (2 cols on mobile, 4 on desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* KPI 1: Total Issued */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#131F37] border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Issued
            </span>
            <FileCheck className="w-4 h-4 text-[#0A7AC1]" />
          </div>
          <div className="mt-1 text-2xl font-extrabold text-[#0B1F4B] dark:text-white font-mono tnum">
            {kpis.total}
          </div>
          <span className="text-[10px] text-slate-500">STCW records</span>
        </div>

        {/* KPI 2: Active */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#131F37] border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active Valid
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-1 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono tnum">
            {kpis.active}
          </div>
          <span className="text-[10px] text-emerald-700 dark:text-emerald-400/80 font-medium">Valid credentials</span>
        </div>

        {/* KPI 3: Expiring Soon */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#131F37] border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Expiring Soon
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-1 text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-mono tnum">
            {kpis.expiring}
          </div>
          <span className="text-[10px] text-amber-700 dark:text-amber-400/80 font-medium">&lt; 90 Days left</span>
        </div>

        {/* KPI 4: Revoked */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#131F37] border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Revoked
            </span>
            <XCircle className="w-4 h-4 text-red-500" />
          </div>
          <div className="mt-1 text-2xl font-extrabold text-red-600 dark:text-red-400 font-mono tnum">
            {kpis.revoked}
          </div>
          <span className="text-[10px] text-red-700 dark:text-red-400/80 font-medium">Nullified records</span>
        </div>

      </div>

      {/* COURSES DISTRIBUTION & RECENT CERTIFICATES ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Course distribution (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-[#131F37] border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Award className="w-4 h-4 text-[#0A7AC1]" />
              <h2 className="text-sm font-bold text-[#0B1F4B] dark:text-white">
                Certificates by Course
              </h2>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              {certificates.length} Total
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {courseDistribution.map((item) => (
              <div key={item.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
                    {item.name}
                  </span>
                  <span className="font-mono tnum text-slate-500">
                    {item.count} ({item.percent}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#0A7AC1] h-full rounded-full"
                    style={{ width: `${Math.max(item.percent, 8)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Certificates (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#131F37] border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-[#0A7AC1]" />
              <h2 className="text-sm font-bold text-[#0B1F4B] dark:text-white">
                Recently Issued Certificates
              </h2>
            </div>
            
            <button
              onClick={() => setCurrentView('admin_certificates')}
              className="text-xs font-semibold text-[#0A7AC1] dark:text-sky-400 hover:underline cursor-pointer"
            >
              View All ({certificates.length})
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {certificates.slice(0, 5).map((cert) => (
              <div
                key={cert.id}
                className="py-2.5 flex items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                      {cert.traineeTitle} {cert.traineeName}
                    </span>
                    {getStatusBadge(cert.status)}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tnum truncate">
                    {cert.certificateId} · No: {cert.uniqueNumber}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openCertificateById(cert.uniqueNumber)}
                    className="p-1.5 text-slate-400 hover:text-[#0A7AC1] dark:hover:text-white transition-colors cursor-pointer"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
