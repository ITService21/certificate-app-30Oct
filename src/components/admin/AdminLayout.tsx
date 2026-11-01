import React, { useState } from 'react';
import { useApp, AppView } from '../../context/AppContext';
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  BarChart3,
  Users,
  Settings,
  ShieldAlert,
  LogOut,
  ChevronRight,
  Menu,
  X,
  ExternalLink,
  Shield,
  Sun,
  Moon,
  BookOpen,
} from 'lucide-react';
import { CtcLogo } from '../common/Logos';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { currentView, setCurrentView, currentUser, logout, theme, toggleTheme } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems: { view: AppView; label: string; icon: React.ReactNode; superAdminOnly?: boolean }[] = [
    { view: 'admin_dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { view: 'admin_certificates', label: 'Certificates', icon: <FileText className="w-4 h-4" /> },
    { view: 'admin_add_cert', label: 'Generate Certificate', icon: <PlusCircle className="w-4 h-4" /> },
    { view: 'admin_courses', label: 'Courses', icon: <BookOpen className="w-4 h-4" />, superAdminOnly: true },
    { view: 'admin_users', label: 'Users & Roles', icon: <Users className="w-4 h-4" />, superAdminOnly: true },
    { view: 'admin_settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  const handleNavClick = (view: AppView) => {
    setCurrentView(view);
    setSidebarOpen(false);
  };

  const isSuperAdmin = currentUser?.role === 'super_admin';

  return (
    <div className="flex-1 flex min-h-[calc(100vh-5rem)] bg-slate-50 dark:bg-[#0B1220]">
      
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-xs"
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-[#0D1829] border-r border-slate-200 dark:border-slate-800 transition-transform duration-200 flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Sidebar Header (on mobile, includes close button) */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#0A7AC1]" />
            <span className="font-extrabold text-sm tracking-tight text-[#0B1F4B] dark:text-white">
              CTC Administration
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card in Sidebar */}
        {currentUser && (
          <div className="p-3 mx-3 my-3 rounded-lg bg-slate-50 dark:bg-[#131F37] border border-slate-200 dark:border-slate-700/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#0B1F4B] dark:bg-sky-900 text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">
                {currentUser.name.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <span className="font-bold text-xs text-slate-800 dark:text-white block truncate">
                  {currentUser.name}
                </span>
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.2 rounded inline-block ${
                    isSuperAdmin
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300'
                  }`}
                >
                  {isSuperAdmin ? 'Super Admin' : 'Issuer Role'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = currentView === item.view;
            const isRestricted = item.superAdminOnly && !isSuperAdmin;

            return (
              <button
                key={item.view}
                onClick={() => handleNavClick(item.view)}
                disabled={isRestricted}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#0B1F4B] text-white shadow-xs dark:bg-sky-900/60 dark:text-sky-200'
                    : isRestricted
                    ? 'opacity-40 text-slate-400 cursor-not-allowed'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {item.superAdminOnly && (
                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    Admin
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer with quick links */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
              <span>{theme === 'light' ? 'Dark Theme' : 'Light Theme'}</span>
            </div>
            <span className="text-[10px] uppercase font-bold text-slate-400">{theme}</span>
          </button>

          <button
            onClick={() => setCurrentView('verify_home')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#0A7AC1]" />
            <span>Public Verify Portal</span>
          </button>

          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Mobile top strip for toggling sidebar */}
        <div className="lg:hidden p-3 bg-white dark:bg-[#0D1829] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded"
          >
            <Menu className="w-4 h-4" />
            <span>Admin Menu</span>
          </button>

          <span className="text-xs font-bold text-[#0B1F4B] dark:text-white capitalize">
            {currentView === 'admin_add_cert' ? 'generate certificate' : currentView.replace('admin_', '').replace('_', ' ')}
          </span>
        </div>

        {/* Content container */}
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>

    </div>
  );
};
