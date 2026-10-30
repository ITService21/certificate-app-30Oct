import React, { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { ToastContainer } from './components/common/ToastContainer';

// Public screens
import { VerifyHome } from './components/public/VerifyHome';
import { CertificateDetails } from './components/public/CertificateDetails';
import { InvalidCertificate } from './components/public/InvalidCertificate';

// Admin screens
import { AdminLogin } from './components/admin/AdminLogin';
import { AdminLayout } from './components/admin/AdminLayout';
import { DashboardView } from './components/admin/DashboardView';
import { CertificatesListView } from './components/admin/CertificatesListView';
import { GenerateCertificateView } from './components/admin/GenerateCertificateView';
import { UsersRolesView } from './components/admin/UsersRolesView';
import { SettingsView } from './components/admin/SettingsView';

const MainContent: React.FC = () => {
  const { currentView, openCertificateById, currentUser, loading, sessionLoading } = useApp();

  // Direct verification links: /certificate/32625474824291 (printed in the QR) and the legacy ?verify=32625474824291
  useEffect(() => {
    const fromPath = /^\/certificate\/([^/?#]+)/.exec(window.location.pathname);
    const verifyId = fromPath ? decodeURIComponent(fromPath[1]) : new URLSearchParams(window.location.search).get('verify');
    if (verifyId) {
      openCertificateById(verifyId, 'qr_scan');
    }
  }, []);

  // Protect admin views
  const isAdminView = currentView.startsWith('admin_') && currentView !== 'admin_login';
  if (isAdminView && !currentUser) {
    if (sessionLoading) {
      return <div className="flex-1 flex items-center justify-center text-sm text-slate-500" role="status">Restoring your session…</div>;
    }
    return <AdminLogin />;
  }

  // Render Admin View inside AdminLayout
  if (isAdminView) {
    return (
      <AdminLayout>
        {currentView === 'admin_dashboard' && <DashboardView />}
        {currentView === 'admin_certificates' && <CertificatesListView />}
        {currentView === 'admin_add_cert' && <GenerateCertificateView />}
        {currentView === 'admin_users' && <UsersRolesView />}
        {currentView === 'admin_settings' && <SettingsView />}
      </AdminLayout>
    );
  }

  // QR landing page is a bare card: no site header/footer
  if (currentView === 'cert_details') return <CertificateDetails />;

  // Render Public or Login View
  return (
    <div className="flex-1 flex flex-col" aria-busy={loading}>
      {loading && (
        <div className="text-center text-xs font-semibold text-[#0A7AC1] py-2" role="status">Verifying…</div>
      )}
      {currentView === 'verify_home' && <VerifyHome />}
      {currentView === 'invalid_cert' && <InvalidCertificate />}
      {currentView === 'admin_login' && <AdminLogin />}
    </div>
  );
};

/** Header/footer wrap everything except the minimal QR landing page. */
const Shell: React.FC = () => {
  const { currentView } = useApp();
  const bare = currentView === 'cert_details';
  return (
    <>
      {!bare && <Header />}
      <MainContent />
      {!bare && <Footer />}
    </>
  );
};

export default function App() {
  return (
    <AppProvider>
      <div className="min-h-screen w-full max-w-full overflow-x-hidden flex flex-col bg-[#F8FAFC] dark:bg-[#0B1220] text-slate-900 dark:text-slate-100 transition-colors duration-150 selection:bg-[#0A7AC1]/20 selection:text-[#0B1F4B]">
        <Shell />
        <ToastContainer />
      </div>
    </AppProvider>
  );
}
