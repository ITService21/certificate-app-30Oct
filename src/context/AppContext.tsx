import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Certificate, User, ScanLog, PortalConfig } from '../types';
import { CTC_COMPANY_INFO } from '../data/company';
import { api, ApiError, getToken, setToken, setPublicUrl, setUnauthorizedHandler } from '../api';

export const DEFAULT_PORTAL_CONFIG: PortalConfig = {
  portalName: 'CertVerify',
  companyName: CTC_COMPANY_INFO.name,
  companyGroup: CTC_COMPANY_INFO.group,
  accreditationAuthority: 'Government of Panama, Directorate General of Merchant Marine',
  resolutionNumber: CTC_COMPANY_INFO.resolutionNo,
  headquartersAddress: CTC_COMPANY_INFO.address,
  contactEmail: CTC_COMPANY_INFO.email,
  contactPhone: CTC_COMPANY_INFO.phone,
  websiteUrl: CTC_COMPANY_INFO.website,
  defaultSignatoryName: 'Claudia Galeano',
  defaultSignatoryTitle: 'CTC General Manager',
  showWatermark: true,
  maskPassportByDefault: true,
};

export type AppView =
  | 'verify_home'
  | 'search_results'
  | 'cert_details'
  | 'invalid_cert'
  | 'admin_login'
  | 'admin_dashboard'
  | 'admin_certificates'
  | 'admin_add_cert'
  | 'admin_users'
  | 'admin_settings';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

type ScanMethod = 'qr_scan' | 'number_lookup';

interface AppContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  currentUser: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  /** True while a verification request is in flight. */
  loading: boolean;
  certificates: Certificate[];
  scanLogs: ScanLog[];
  selectedCert: Certificate | null;
  setSelectedCert: (cert: Certificate | null) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  nameSearchResults: Certificate[];

  // Verification actions
  verifyByNumber: (num: string) => Promise<void>;
  verifyByName: (name: string) => Promise<void>;
  openCertificateById: (uniqueNumber: string, method?: ScanMethod) => Promise<void>;

  // Admin actions
  addCertificate: (certData: Partial<Certificate>, file?: File | null) => Promise<Certificate | null>;
  updateCertificate: (id: string, updates: Partial<Certificate>) => Promise<void>;
  revokeCertificate: (id: string, reason: string, notes: string) => Promise<void>;
  deleteCertificate: (id: string) => Promise<void>;
  bulkImportCertificates: (certs: Partial<Certificate>[]) => Promise<number>;
  resetDemoData: () => Promise<boolean>;

  // Users actions
  users: User[];
  /** Returns the one-time temporary password on success. */
  addUser: (user: Omit<User, 'id' | 'lastLogin'>) => Promise<string | null>;
  updateUserStatus: (id: string, status: 'active' | 'inactive') => Promise<void>;

  // Portal settings
  portalConfig: PortalConfig;
  updatePortalConfig: (updates: Partial<PortalConfig>) => Promise<void>;

  // Toasts
  toasts: Toast[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  dismissToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const errMsg = (e: unknown) => (e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme (a per-viewer preference, fine to keep in the browser)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('certverify_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch { /* ignore */ }
    return 'light';
  });

  useEffect(() => {
    try { localStorage.setItem('certverify_theme', theme); } catch { /* ignore */ }
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.body.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismissToast = useCallback((id: string) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => dismissToast(id), 4000);
  }, [dismissToast]);

  // Data
  const [portalConfig, setPortalConfig] = useState<PortalConfig>(DEFAULT_PORTAL_CONFIG);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [scanLogs, setScanLogs] = useState<ScanLog[]>([]);

  const [currentView, setCurrentView] = useState<AppView>(() =>
    /^\/certificate\/[^/]/.test(window.location.pathname) ? 'cert_details' : 'verify_home',
  );

  // Leaving the QR landing page: drop /certificate/<n> from the address bar so a reload doesn't re-open it.
  useEffect(() => {
    if (currentView !== 'cert_details' && /^\/certificate\//.test(window.location.pathname)) {
      window.history.replaceState(null, '', '/');
    }
  }, [currentView]);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [nameSearchResults, setNameSearchResults] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAdminData = useCallback(async () => {
    const [certs, usrs, logs] = await Promise.all([
      api.get<Certificate[]>('/admin/certificates'),
      api.get<User[]>('/admin/users'),
      api.get<ScanLog[]>('/admin/scan-logs?limit=200'),
    ]);
    setCertificates(certs);
    setUsers(usrs);
    setScanLogs(logs);
  }, []);

  const clearSession = useCallback(() => {
    setToken(null);
    setCurrentUser(null);
    setCertificates([]);
    setUsers([]);
    setScanLogs([]);
  }, []);

  // Session expiry from any admin call
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;
  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession();
      setCurrentView('admin_login');
      showToastRef.current('Your session expired. Please sign in again.', 'error');
    });
  }, [clearSession]);

  // Boot: public config + restore an existing admin session
  useEffect(() => {
    api.get<{ settings: Partial<PortalConfig>; publicUrl: string }>('/config')
      .then((c) => {
        setPortalConfig({ ...DEFAULT_PORTAL_CONFIG, ...c.settings });
        if (c.publicUrl) setPublicUrl(c.publicUrl);
      })
      .catch(() => { /* defaults are fine */ });

    if (getToken()) {
      api.get<User>('/admin/me')
        .then(async (u) => {
          setCurrentUser(u);
          await loadAdminData();
        })
        .catch(() => clearSession());
    }
  }, [loadAdminData, clearSession]);

  // Auth
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { token, user } = await api.post<{ token: string; user: User }>('/auth/login', { email, password });
      setToken(token);
      setCurrentUser(user);
      await loadAdminData();
      showToast(`Welcome back, ${user.name} (${user.role === 'super_admin' ? 'Super Admin' : 'Issuer'})`, 'success');
      setCurrentView('admin_dashboard');
      return true;
    } catch (e) {
      showToast(errMsg(e), 'error');
      return false;
    }
  };

  const logout = () => {
    clearSession();
    showToast('You have been logged out securely.', 'info');
    setCurrentView('verify_home');
  };

  // Verification
  const openCertificateById = async (uniqueNumber: string, method: ScanMethod = 'number_lookup') => {
    setLoading(true);
    try {
      const found = await api.get<Certificate>(`/verify/${encodeURIComponent(uniqueNumber)}?method=${method}`);
      setSelectedCert(found);
      setCurrentView('cert_details');
    } catch (e) {
      if (e instanceof ApiError && (e.status === 404 || e.status === 400)) {
        setSearchQuery(uniqueNumber);
        setSelectedCert(null);
        setCurrentView('invalid_cert');
      } else {
        showToast(errMsg(e), 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyByNumber = async (num: string) => {
    const cleaned = num.replace(/\s+/g, '').trim();
    setSearchQuery(cleaned);
    await openCertificateById(cleaned, 'number_lookup');
  };

  const verifyByName = async (name: string) => {
    const q = name.trim();
    setSearchQuery(name);
    if (q.length < 2) {
      showToast('Enter at least 2 characters to search', 'info');
      return;
    }
    setLoading(true);
    try {
      setNameSearchResults(await api.get<Certificate[]>(`/search?q=${encodeURIComponent(q)}`));
      setCurrentView('search_results');
    } catch (e) {
      showToast(errMsg(e), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Admin CRUD
  const addCertificate = async (certData: Partial<Certificate>, file?: File | null): Promise<Certificate | null> => {
    try {
      const form = new FormData();
      form.append('data', JSON.stringify(certData));
      if (file) form.append('file', file);
      const created = await api.post<Certificate>('/admin/certificates', form);
      setCertificates((prev) => [created, ...prev]);
      showToast(`Certificate ${created.certificateId} created successfully.`, 'success');
      return created;
    } catch (e) {
      showToast(errMsg(e), 'error');
      return null;
    }
  };

  const updateCertificate = async (id: string, updates: Partial<Certificate>) => {
    try {
      const updated = await api.put<Certificate>(`/admin/certificates/${id}`, updates);
      setCertificates((prev) => prev.map((c) => (c.id === id ? updated : c)));
      setSelectedCert((cur) => (cur?.id === id ? updated : cur));
      showToast('Certificate updated successfully.', 'success');
    } catch (e) {
      showToast(errMsg(e), 'error');
    }
  };

  const revokeCertificate = async (id: string, reason: string, notes: string) => {
    try {
      const updated = await api.post<Certificate>(`/admin/certificates/${id}/revoke`, { reason, notes });
      setCertificates((prev) => prev.map((c) => (c.id === id ? updated : c)));
      setSelectedCert((cur) => (cur?.id === id ? updated : cur));
      showToast(`Certificate ${updated.certificateId} has been officially REVOKED.`, 'error');
    } catch (e) {
      showToast(errMsg(e), 'error');
    }
  };

  const deleteCertificate = async (id: string) => {
    try {
      await api.del(`/admin/certificates/${id}`);
      setCertificates((prev) => prev.filter((c) => c.id !== id));
      showToast('Certificate deleted from database.', 'info');
    } catch (e) {
      showToast(errMsg(e), 'error');
    }
  };

  const bulkImportCertificates = async (items: Partial<Certificate>[]): Promise<number> => {
    try {
      const r = await api.post<{ imported: number; failed: { row: number; error: string }[]; certificates: Certificate[] }>(
        '/admin/certificates/bulk',
        { items },
      );
      setCertificates((prev) => [...r.certificates, ...prev]);
      showToast(
        r.failed.length
          ? `Imported ${r.imported}, skipped ${r.failed.length} (row ${r.failed[0].row}: ${r.failed[0].error})`
          : `Successfully imported ${r.imported} certificates.`,
        r.failed.length ? 'info' : 'success',
      );
      return r.imported;
    } catch (e) {
      showToast(errMsg(e), 'error');
      return 0;
    }
  };

  const resetDemoData = async (): Promise<boolean> => {
    try {
      await api.post('/admin/reset-demo');
      return true;
    } catch (e) {
      showToast(errMsg(e), 'error');
      return false;
    }
  };

  const addUser = async (userData: Omit<User, 'id' | 'lastLogin'>): Promise<string | null> => {
    try {
      const r = await api.post<{ user: User; temporaryPassword: string }>('/admin/users', userData);
      setUsers((prev) => [...prev, r.user]);
      showToast(`User ${r.user.name} added as ${r.user.role === 'super_admin' ? 'Super Admin' : 'Issuer'}.`, 'success');
      return r.temporaryPassword;
    } catch (e) {
      showToast(errMsg(e), 'error');
      return null;
    }
  };

  const updateUserStatus = async (id: string, status: 'active' | 'inactive') => {
    try {
      const updated = await api.patch<User>(`/admin/users/${id}/status`, { status });
      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
      showToast('User status updated.', 'info');
    } catch (e) {
      showToast(errMsg(e), 'error');
    }
  };

  const updatePortalConfig = async (updates: Partial<PortalConfig>) => {
    try {
      await api.put('/admin/config', updates);
      setPortalConfig((prev) => ({ ...prev, ...updates }));
      showToast('Portal configuration saved successfully', 'success');
    } catch (e) {
      showToast(errMsg(e), 'error');
    }
  };

  return (
    <AppContext.Provider
      value={{
        theme,
        toggleTheme,
        currentUser,
        login,
        logout,
        currentView,
        setCurrentView,
        loading,
        certificates,
        scanLogs,
        selectedCert,
        setSelectedCert,
        searchQuery,
        setSearchQuery,
        nameSearchResults,
        verifyByNumber,
        verifyByName,
        openCertificateById,
        addCertificate,
        updateCertificate,
        revokeCertificate,
        deleteCertificate,
        bulkImportCertificates,
        resetDemoData,
        users,
        addUser,
        updateUserStatus,
        portalConfig,
        updatePortalConfig,
        toasts,
        showToast,
        dismissToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
