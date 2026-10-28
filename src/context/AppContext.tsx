import React, { createContext, useContext, useState, useEffect } from 'react';
import { Certificate, User, ScanLog, CertificateStatus, PortalConfig } from '../types';
import { INITIAL_CERTIFICATES, INITIAL_USERS, INITIAL_SCAN_LOGS, CTC_COMPANY_INFO } from '../data/mockData';

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

interface AppContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  currentUser: User | null;
  login: (email: string, password?: string) => boolean;
  logout: () => void;
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  certificates: Certificate[];
  scanLogs: ScanLog[];
  selectedCert: Certificate | null;
  setSelectedCert: (cert: Certificate | null) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  nameSearchResults: Certificate[];
  
  // Verification actions
  verifyByNumber: (num: string) => void;
  verifyByName: (name: string) => void;
  openCertificateById: (uniqueNumber: string) => void;
  
  // Admin actions
  addCertificate: (certData: Partial<Certificate>) => Certificate;
  updateCertificate: (id: string, updates: Partial<Certificate>) => void;
  revokeCertificate: (id: string, reason: string, notes: string) => void;
  deleteCertificate: (id: string) => void;
  bulkImportCertificates: (certs: Partial<Certificate>[]) => number;
  
  // Users actions
  users: User[];
  addUser: (user: Omit<User, 'id' | 'lastLogin'>) => void;
  updateUserStatus: (id: string, status: 'active' | 'inactive') => void;
  
  // Portal settings
  portalConfig: PortalConfig;
  updatePortalConfig: (updates: Partial<PortalConfig>) => void;

  // Toasts
  toasts: Toast[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  dismissToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('certverify_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return 'light';
  });

  useEffect(() => {
    localStorage.setItem('certverify_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Portal configuration state (allows full customization)
  const [portalConfig, setPortalConfig] = useState<PortalConfig>(() => {
    const saved = localStorage.getItem('certverify_portal_config');
    if (saved) {
      try {
        return { ...DEFAULT_PORTAL_CONFIG, ...JSON.parse(saved) };
      } catch {
        return DEFAULT_PORTAL_CONFIG;
      }
    }
    return DEFAULT_PORTAL_CONFIG;
  });

  const updatePortalConfig = (updates: Partial<PortalConfig>) => {
    setPortalConfig((prev) => {
      const next = { ...prev, ...updates };
      localStorage.setItem('certverify_portal_config', JSON.stringify(next));
      return next;
    });
    showToast('Portal configuration saved successfully', 'success');
  };

  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('certverify_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('certverify_users');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_USERS;
      }
    }
    return INITIAL_USERS;
  });

  useEffect(() => {
    localStorage.setItem('certverify_users', JSON.stringify(users));
  }, [users]);

  // Certificates state
  const [certificates, setCertificates] = useState<Certificate[]>(() => {
    const saved = localStorage.getItem('certverify_certificates');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_CERTIFICATES;
      }
    }
    return INITIAL_CERTIFICATES;
  });

  useEffect(() => {
    localStorage.setItem('certverify_certificates', JSON.stringify(certificates));
  }, [certificates]);

  // Scan logs
  const [scanLogs, setScanLogs] = useState<ScanLog[]>(() => {
    const saved = localStorage.getItem('certverify_scan_logs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_SCAN_LOGS;
      }
    }
    return INITIAL_SCAN_LOGS;
  });

  useEffect(() => {
    localStorage.setItem('certverify_scan_logs', JSON.stringify(scanLogs));
  }, [scanLogs]);

  // View & Search state
  const [currentView, setCurrentView] = useState<AppView>('verify_home');
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(INITIAL_CERTIFICATES[0]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [nameSearchResults, setNameSearchResults] = useState<Certificate[]>([]);

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      dismissToast(id);
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Auth handlers
  const login = (email: string): boolean => {
    const user = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (user && user.status === 'active') {
      const updatedUser = {
        ...user,
        lastLogin: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
      };
      setCurrentUser(updatedUser);
      localStorage.setItem('certverify_user', JSON.stringify(updatedUser));
      showToast(`Welcome back, ${user.name} (${user.role === 'super_admin' ? 'Super Admin' : 'Issuer'})`, 'success');
      setCurrentView('admin_dashboard');
      return true;
    }
    showToast('Invalid credentials or account inactive', 'error');
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('certverify_user');
    showToast('You have been logged out securely.', 'info');
    setCurrentView('verify_home');
  };

  // Record a scan log
  const logScan = (
    cert: Certificate,
    method: 'qr_scan' | 'number_lookup' | 'name_search'
  ) => {
    const cities = [
      { city: 'Panama City', country: 'Panama (Port of Balboa)' },
      { city: 'Rotterdam', country: 'Netherlands (Port of Rotterdam)' },
      { city: 'Singapore', country: 'Singapore (Jurong Port Vetting)' },
      { city: 'Piraeus', country: 'Greece (Port Authority)' },
      { city: 'Baku', country: 'Azerbaijan (Maritime Agency)' },
      { city: 'Dubai', country: 'UAE (Jebel Ali Terminal)' },
      { city: 'Houston', country: 'USA (Port of Houston Coast Guard)' },
    ];
    const randomLoc = cities[Math.floor(Math.random() * cities.length)];
    const devices: ScanLog['deviceType'][] = [
      'Mobile (iOS)',
      'Mobile (Android)',
      'Desktop (Windows)',
      'Desktop (macOS)',
    ];
    const randomDevice = devices[Math.floor(Math.random() * devices.length)];

    const now = new Date();
    const utcTimestamp = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

    const newLog: ScanLog = {
      id: `scan-${Date.now()}`,
      certificateUniqueNumber: cert.uniqueNumber,
      certificateId: cert.certificateId,
      traineeName: cert.traineeName,
      timestamp: utcTimestamp,
      ipAddress: `190.${Math.floor(Math.random() * 200 + 50)}.${Math.floor(Math.random() * 254 + 1)}.${Math.floor(Math.random() * 254 + 1)}`,
      locationCity: randomLoc.city,
      locationCountry: randomLoc.country,
      deviceType: randomDevice,
      searchMethod: method,
    };

    setScanLogs((prev) => [newLog, ...prev.slice(0, 199)]);

    // Update certificate scan count
    setCertificates((prev) =>
      prev.map((c) =>
        c.uniqueNumber === cert.uniqueNumber
          ? { ...c, scanCount: c.scanCount + 1, lastScannedAt: now.toISOString() }
          : c
      )
    );
  };

  // Verification methods
  const verifyByNumber = (num: string) => {
    const cleaned = num.replace(/\s+/g, '').trim();
    setSearchQuery(cleaned);
    
    // Look for exact 14-digit match or certificateId match
    const found = certificates.find(
      (c) => c.uniqueNumber === cleaned || c.certificateId.toLowerCase() === cleaned.toLowerCase()
    );

    if (found) {
      setSelectedCert(found);
      logScan(found, 'number_lookup');
      setCurrentView('cert_details');
    } else {
      setSelectedCert(null);
      setCurrentView('invalid_cert');
    }
  };

  const verifyByName = (name: string) => {
    const q = name.trim().toLowerCase();
    setSearchQuery(name);
    if (!q) return;

    const matches = certificates.filter(
      (c) =>
        c.traineeName.toLowerCase().includes(q) ||
        c.courseTitle.toLowerCase().includes(q)
    );

    setNameSearchResults(matches);
    setCurrentView('search_results');
  };

  const openCertificateById = (uniqueNumber: string) => {
    const found = certificates.find((c) => c.uniqueNumber === uniqueNumber);
    if (found) {
      setSelectedCert(found);
      logScan(found, 'qr_scan');
      setCurrentView('cert_details');
    } else {
      setCurrentView('invalid_cert');
    }
  };

  // Admin CRUD operations
  const addCertificate = (certData: Partial<Certificate>): Certificate => {
    const now = new Date().toISOString();
    const newCert: Certificate = {
      id: `cert-${Date.now()}`,
      uniqueNumber: certData.uniqueNumber || Math.floor(10000000000000 + Math.random() * 90000000000000).toString(),
      certificateId: certData.certificateId || `UAG-TC-26-${Math.floor(Math.random() * 9000 + 1000)}`,
      status: (certData.status as CertificateStatus) || 'valid',
      traineeTitle: certData.traineeTitle || 'Mr.',
      traineeName: (certData.traineeName || 'UNKNOWN SEAFARER').toUpperCase(),
      passportNumber: certData.passportNumber || 'N/A',
      courseTitle: certData.courseTitle || 'STCW Maritime Training Course',
      stcwRegulation: certData.stcwRegulation || 'STCW 1978 as amended, Regulation VI/2',
      approvalResolution: certData.approvalResolution || 'Resolution No. DGGM-CFM-005-2024',
      approvalAuthority: certData.approvalAuthority || 'Government of Panama, Directorate General of Merchant Marine',
      approvalDate: certData.approvalDate || '2024-02-06',
      approvalValidUntil: certData.approvalValidUntil || '2026-06-12',
      trainingStartDate: certData.trainingStartDate || new Date().toISOString().substring(0, 10),
      trainingEndDate: certData.trainingEndDate || new Date().toISOString().substring(0, 10),
      trainingMode: certData.trainingMode || 'Presential',
      trainingLocation: certData.trainingLocation || 'Panama Maritime Academy, Balboa',
      issueDate: certData.issueDate || new Date().toISOString().substring(0, 10),
      expiryDate: certData.expiryDate || new Date(Date.now() + 5 * 365 * 24 * 3600 * 1000).toISOString().substring(0, 10),
      validityYears: certData.validityYears || 5,
      signatoryName: certData.signatoryName || 'Claudia Galeano',
      signatoryTitle: certData.signatoryTitle || 'CTC General Manager',
      documentName: certData.documentName || `${certData.certificateId || 'CERT'}.pdf`,
      documentSize: certData.documentSize || '1.5 MB',
      createdAt: now,
      updatedAt: now,
      scanCount: 0,
    };

    setCertificates((prev) => [newCert, ...prev]);
    showToast(`Certificate ${newCert.certificateId} created successfully.`, 'success');
    return newCert;
  };

  const updateCertificate = (id: string, updates: Partial<Certificate>) => {
    setCertificates((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
      )
    );
    showToast('Certificate updated successfully.', 'success');
  };

  const revokeCertificate = (id: string, reason: string, notes: string) => {
    const cert = certificates.find((c) => c.id === id);
    if (!cert) return;

    const now = new Date().toISOString();
    const updated: Certificate = {
      ...cert,
      status: 'revoked',
      revocationReason: reason as any,
      revocationNotes: notes,
      revokedAt: now,
      revokedBy: currentUser ? `${currentUser.name} (${currentUser.role === 'super_admin' ? 'Super Admin' : 'Issuer'})` : 'Administrative Authority',
      updatedAt: now,
    };

    setCertificates((prev) => prev.map((c) => (c.id === id ? updated : c)));
    if (selectedCert?.id === id) {
      setSelectedCert(updated);
    }
    showToast(`Certificate ${cert.certificateId} has been officially REVOKED.`, 'error');
  };

  const deleteCertificate = (id: string) => {
    setCertificates((prev) => prev.filter((c) => c.id !== id));
    showToast('Certificate deleted from database.', 'info');
  };

  const bulkImportCertificates = (certs: Partial<Certificate>[]): number => {
    const newItems: Certificate[] = certs.map((item, idx) => ({
      id: `cert-import-${Date.now()}-${idx}`,
      uniqueNumber: item.uniqueNumber || Math.floor(10000000000000 + Math.random() * 90000000000000).toString(),
      certificateId: item.certificateId || `UAG-TC-26-${Math.floor(Math.random() * 9000 + 1000)}`,
      status: item.status || 'valid',
      traineeTitle: item.traineeTitle || 'Mr.',
      traineeName: (item.traineeName || 'IMPORTED TRAINEE').toUpperCase(),
      passportNumber: item.passportNumber || 'N/A',
      courseTitle: item.courseTitle || 'STCW Approved Maritime Training',
      stcwRegulation: item.stcwRegulation || 'STCW 1978 as amended, Regulation VI/1',
      approvalResolution: 'Resolution No. DGGM-CFM-005-2024',
      approvalAuthority: 'Government of Panama, Directorate General of Merchant Marine',
      approvalDate: '2024-02-06',
      approvalValidUntil: '2026-06-12',
      trainingStartDate: item.trainingStartDate || '2026-01-10',
      trainingEndDate: item.trainingEndDate || '2026-01-15',
      trainingMode: item.trainingMode || 'Presential',
      trainingLocation: item.trainingLocation || 'Panama Maritime Academy',
      issueDate: item.issueDate || '2026-01-20',
      expiryDate: item.expiryDate || '2031-01-19',
      validityYears: 5,
      signatoryName: 'Claudia Galeano',
      signatoryTitle: 'CTC General Manager',
      documentName: `${item.certificateId || 'CERT'}.pdf`,
      documentSize: '1.4 MB',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      scanCount: 0,
    }));

    setCertificates((prev) => [...newItems, ...prev]);
    showToast(`Successfully imported ${newItems.length} certificates.`, 'success');
    return newItems.length;
  };

  const addUser = (userData: Omit<User, 'id' | 'lastLogin'>) => {
    const newUser: User = {
      ...userData,
      id: `user-${Date.now()}`,
      lastLogin: 'Never',
    };
    setUsers((prev) => [...prev, newUser]);
    showToast(`User ${newUser.name} added as ${newUser.role === 'super_admin' ? 'Super Admin' : 'Issuer'}.`, 'success');
  };

  const updateUserStatus = (id: string, status: 'active' | 'inactive') => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, status } : u))
    );
    showToast('User status updated.', 'info');
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
