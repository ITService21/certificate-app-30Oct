import React, { useState } from 'react';
import { Sun, Moon, Shield, Lock, User as UserIcon, LogOut, CheckCircle2, Menu, X, ArrowLeft } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CtcLogo, UagLogo } from './Logos';

export const Header: React.FC = () => {
  const {
    theme,
    toggleTheme,
    currentUser,
    logout,
    currentView,
    setCurrentView,
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdminView = currentView.startsWith('admin_');

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-[#0B1220]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-18 gap-2 sm:gap-4">
          
          {/* Left Brand: CTC & UAG Dual Maritime Emblems */}
          <div className="flex items-center gap-2 sm:gap-6 shrink-0 min-w-0">
            <button
              onClick={() => {
                if (isAdminView) {
                  setCurrentView('admin_dashboard');
                } else {
                  setCurrentView('verify_home');
                }
              }}
              className="flex items-center gap-2 sm:gap-3 text-left group cursor-pointer focus:outline-hidden"
            >
              <CtcLogo size={34} showText={true} />
              
              <div className="hidden lg:block h-9 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1" />
              
              <div className="hidden lg:block">
                <UagLogo size={36} showText={true} />
              </div>
            </button>
          </div>

          {/* Center or Breadcrumb Context */}
          <div className="hidden md:flex items-center gap-2">
            {!isAdminView ? (
              <div className="flex items-center gap-2 px-3 py-1 rounded bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/60 text-xs text-[#0A7AC1] dark:text-sky-300 font-medium">
                <Shield className="w-3.5 h-3.5" />
                <span>Official Panama STCW Verification Service</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                <span>Continental Training Center Admin</span>
                <span>/</span>
                <span className="text-[#0B1F4B] dark:text-sky-400 font-bold capitalize">
                  {currentView === 'admin_add_cert' ? 'generate certificate' : currentView.replace('admin_', '').replace('_', ' ')}
                </span>
              </div>
            )}
          </div>

          {/* Right Zone: Theme Toggle & Admin Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Theme Toggle on EVERY screen as requested */}
            <button
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
              className="relative p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            >
              {theme === 'light' ? (
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <Moon className="w-4 h-4 text-slate-700" />
                  <span className="hidden sm:inline text-slate-600">Dark</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline text-slate-200">Light</span>
                </div>
              )}
            </button>

            {/* Switch between Public Verification & Admin */}
            {currentUser ? (
              <div className="flex items-center gap-2">
                {isAdminView ? (
                  <button
                    onClick={() => setCurrentView('verify_home')}
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Public Verify</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentView('admin_dashboard')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#0B1F4B] hover:bg-[#0A7AC1] rounded transition-colors cursor-pointer shadow-xs"
                  >
                    <Shield className="w-3.5 h-3.5 text-sky-400" />
                    <span>Admin Panel</span>
                  </button>
                )}

                {/* Current User Badge */}
                <div className="hidden md:flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
                  <div className="w-7 h-7 rounded-full bg-[#0B1F4B] dark:bg-sky-900 text-white flex items-center justify-center font-bold text-xs uppercase">
                    {currentUser.name.charAt(0)}
                  </div>
                  <div className="text-left text-xs leading-none">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate max-w-[120px]">
                      {currentUser.name}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                      {currentUser.role === 'super_admin' ? 'Super Admin' : 'Issuer'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={logout}
                  title="Sign Out"
                  className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {currentView !== 'admin_login' ? (
                  <button
                    onClick={() => setCurrentView('admin_login')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#0B1F4B] hover:bg-[#0A7AC1] rounded transition-colors cursor-pointer shadow-xs"
                  >
                    <Lock className="w-3.5 h-3.5 text-sky-300" />
                    <span>Admin Login</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentView('verify_home')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors cursor-pointer"
                  >
                    <span>Back to Verify</span>
                  </button>
                )}
              </div>
            )}

            {/* Mobile Hamburger toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <UagLogo size={28} showText={true} />
            </div>

            <button
              onClick={() => {
                setCurrentView('verify_home');
                setMobileMenuOpen(false);
              }}
              className={`px-3 py-2 text-xs font-medium text-left rounded transition-colors ${
                currentView === 'verify_home'
                  ? 'bg-sky-50 text-[#0A7AC1] font-bold dark:bg-sky-950/60 dark:text-sky-300'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              Public Certificate Verification
            </button>

            {currentUser ? (
              <>
                <button
                  onClick={() => {
                    setCurrentView('admin_dashboard');
                    setMobileMenuOpen(false);
                  }}
                  className={`px-3 py-2 text-xs font-medium text-left rounded transition-colors ${
                    isAdminView
                      ? 'bg-sky-50 text-[#0A7AC1] font-bold dark:bg-sky-950/60 dark:text-sky-300'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  Admin Console ({currentUser.name})
                </button>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="px-3 py-2 text-xs font-semibold text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  setCurrentView('admin_login');
                  setMobileMenuOpen(false);
                }}
                className="px-3 py-2 text-xs font-semibold text-left text-[#0A7AC1] dark:text-sky-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded transition-colors"
              >
                Admin Sign In
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
