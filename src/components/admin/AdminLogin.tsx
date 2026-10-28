import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CtcLogo, UagLogo } from '../common/Logos';
import { Lock, Mail, ArrowRight, ShieldCheck, KeyRound, ArrowLeft } from 'lucide-react';

export const AdminLogin: React.FC = () => {
  const { login, setCurrentView } = useApp();
  const [email, setEmail] = useState('admin@ctc.com.pa');
  const [password, setPassword] = useState('••••••••••••');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      login(email, password);
      setIsLoading(false);
    }, 400);
  };

  const handleQuickLogin = (roleEmail: string) => {
    setEmail(roleEmail);
    login(roleEmail);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        
        {/* Card */}
        <div className="bg-white dark:bg-[#131F37] border border-slate-200 dark:border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-xl">
          
          {/* Top Brand Logo */}
          <div className="text-center space-y-3 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex justify-center">
              <CtcLogo size={52} showText={true} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-[#0B1F4B] dark:text-white">
                Admin & Auditor Portal
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Continental Training Center S.A. STCW Credential Management
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="admin-email"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1"
              >
                Official CTC Email
              </label>
              <div className="relative">
                <input
                  id="admin-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@ctc.com.pa"
                  className="w-full h-11 pl-10 pr-3 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-[#1A2644] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#0A7AC1]"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              </div>
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1"
              >
                Passcode / Credentials
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 pl-10 pr-3 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-[#1A2644] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#0A7AC1]"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 inline-flex items-center justify-center gap-2 px-4 rounded-lg font-bold text-xs uppercase tracking-wider text-white bg-[#0B1F4B] hover:bg-[#0A7AC1] transition-colors shadow-sm cursor-pointer mt-2"
            >
              <KeyRound className="w-4 h-4" />
              <span>{isLoading ? 'Authenticating...' : 'Sign In to Console'}</span>
            </button>
          </form>

          {/* Quick Demo Logins for instant evaluation */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 text-center">
              Quick Role Switch for Evaluation:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@ctc.com.pa')}
                className="p-2 text-left rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 dark:hover:bg-sky-900/60 transition-colors cursor-pointer"
              >
                <div className="text-[11px] font-bold text-[#0B1F4B] dark:text-sky-300">
                  Super Admin
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  Claudia Galeano
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('issuer@ctc.com.pa')}
                className="p-2 text-left rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                  Issuer Officer
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  Manuel Castillero
                </div>
              </button>
            </div>
          </div>

          {/* Return link */}
          <div className="mt-5 text-center">
            <button
              onClick={() => setCurrentView('verify_home')}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#0A7AC1] dark:hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Public Certificate Verification</span>
            </button>
          </div>

        </div>

        {/* Security badge below */}
        <div className="text-center text-[11px] text-slate-400 dark:text-slate-400 flex items-center justify-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Restricted to Authorized Panama STCW Issuing Personnel</span>
        </div>

      </div>
    </div>
  );
};
