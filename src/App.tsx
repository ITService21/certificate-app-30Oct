import React, { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { ToastContainer } from './components/common/ToastContainer';

// Public screens
import { VerifyHome } from './components/public/VerifyHome';
import { SearchResults } from './components/public/SearchResults';
import { CertificateDetails } from './components/public/CertificateDetails';
import { InvalidCertificate } from './components/public/InvalidCertificate';

// Admin screens
import { AdminLogin } from './components/admin/AdminLogin';
import { AdminLayout } from './components/admin/AdminLayout';
import { DashboardView } from './components/admin/DashboardView';
import { CertificatesListView } from './components/admin/CertificatesListView';
import { AddCertificateView } from './components/admin/AddCertificateView';
import { UsersRolesView } from './components/admin/UsersRolesView';
import { SettingsView } from './components/admin/SettingsView';

const MainContent: React.FC = () => {
  const { currentView, openCertificateById, currentUser, setCurrentView } = useApp();

  // Check URL parameters for direct verification links (e.g. ?verify=32625474824291)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verifyId = params.get('verify');
    if (verifyId) {
      openCertificateById(verifyId);
    }
  }, []);

  // Protect admin views
  const isAdminView = currentView.startsWith('admin_') && currentView !== 'admin_login';
  if (isAdminView && !currentUser) {
    return <AdminLogin />;
  }

  // Render Admin View inside AdminLayout
  if (isAdminView) {
    return (
      <AdminLayout>
        {currentView === 'admin_dashboard' && <DashboardView />}
        {currentView === 'admin_certificates' && <CertificatesListView />}
        {currentView === 'admin_add_cert' && <AddCertificateView />}
        {currentView === 'admin_users' && <UsersRolesView />}
        {currentView === 'admin_settings' && <SettingsView />}
      </AdminLayout>
    );
  }

  // Render Public or Login View
  return (
    <div className="flex-1 flex flex-col">
      {currentView === 'verify_home' && <VerifyHome />}
      {currentView === 'search_results' && <SearchResults />}
      {currentView === 'cert_details' && <CertificateDetails />}
      {currentView === 'invalid_cert' && <InvalidCertificate />}
      {currentView === 'admin_login' && <AdminLogin />}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <div className="min-h-screen w-full max-w-full overflow-x-hidden flex flex-col bg-[#F8FAFC] dark:bg-[#0B1220] text-slate-900 dark:text-slate-100 transition-colors duration-150 selection:bg-[#0A7AC1]/20 selection:text-[#0B1F4B]">
        <Header />
        <MainContent />
        <Footer />
        <ToastContainer />
      </div>
    </AppProvider>
  );
}
