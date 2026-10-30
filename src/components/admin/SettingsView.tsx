import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Settings, ShieldCheck, Building, QrCode, RefreshCcw, Save, Check, Globe, Mail, Phone, MapPin } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { portalConfig, updatePortalConfig, resetDemoData, showToast } = useApp();

  const [companyName, setCompanyName] = useState(portalConfig.companyName);
  const [companyGroup, setCompanyGroup] = useState(portalConfig.companyGroup);
  const [resolutionNumber, setResolutionNumber] = useState(portalConfig.resolutionNumber);
  const [accreditationAuthority, setAccreditationAuthority] = useState(portalConfig.accreditationAuthority);
  const [headquartersAddress, setHeadquartersAddress] = useState(portalConfig.headquartersAddress);
  const [contactEmail, setContactEmail] = useState(portalConfig.contactEmail);
  const [contactPhone, setContactPhone] = useState(portalConfig.contactPhone);
  const [websiteUrl, setWebsiteUrl] = useState(portalConfig.websiteUrl);
  const [defaultSignatoryName, setDefaultSignatoryName] = useState(portalConfig.defaultSignatoryName);
  const [defaultSignatoryTitle, setDefaultSignatoryTitle] = useState(portalConfig.defaultSignatoryTitle);
  const [showWatermark, setShowWatermark] = useState(portalConfig.showWatermark);
  const [maskPassportByDefault, setMaskPassportByDefault] = useState(portalConfig.maskPassportByDefault);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updatePortalConfig({
      companyName,
      companyGroup,
      resolutionNumber,
      accreditationAuthority,
      headquartersAddress,
      contactEmail,
      contactPhone,
      websiteUrl,
      defaultSignatoryName,
      defaultSignatoryTitle,
      showWatermark,
      maskPassportByDefault,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleResetData = async () => {
    if (confirm('This wipes ALL certificates, users and scan logs in the database and restores the demo dataset. Continue?')) {
      if (await resetDemoData()) {
        showToast('Database reset to demo data. Please sign in again.', 'info');
        setTimeout(() => {
          window.location.reload();
        }, 800);
      }
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-[#0B1F4B] dark:text-white">
          Portal & Registry Customization
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Customize institutional branding, accreditation citations, signatory credentials, and privacy policies
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        
        {/* Institutional Branding */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#131F37] border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0B1F4B] dark:text-sky-300 flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-[#0A7AC1]" />
            <span>1. Institutional Identity & Group</span>
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Company Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1A2644] text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Parent Group
              </label>
              <input
                type="text"
                value={companyGroup}
                onChange={(e) => setCompanyGroup(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1A2644] text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Accreditation Resolution */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#131F37] border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0B1F4B] dark:text-sky-300 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0A7AC1]" />
            <span>2. Panama Maritime Accreditation Defaults</span>
          </span>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Resolution Citation
              </label>
              <input
                type="text"
                value={resolutionNumber}
                onChange={(e) => setResolutionNumber(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1A2644] text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Accreditation Authority
              </label>
              <input
                type="text"
                value={accreditationAuthority}
                onChange={(e) => setAccreditationAuthority(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1A2644] text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Default Signatory */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#131F37] border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0B1F4B] dark:text-sky-300 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0A7AC1]" />
            <span>3. Default Certificate Signatory</span>
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Signatory Name
              </label>
              <input
                type="text"
                value={defaultSignatoryName}
                onChange={(e) => setDefaultSignatoryName(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1A2644] text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Signatory Title
              </label>
              <input
                type="text"
                value={defaultSignatoryTitle}
                onChange={(e) => setDefaultSignatoryTitle(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1A2644] text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#131F37] border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0B1F4B] dark:text-sky-300 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#0A7AC1]" />
            <span>4. Issuer Headquarters & Contact</span>
          </span>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Headquarters Address
              </label>
              <input
                type="text"
                value={headquartersAddress}
                onChange={(e) => setHeadquartersAddress(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1A2644] text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1A2644] text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Telephone
                </label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1A2644] text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Official Website
                </label>
                <input
                  type="text"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1A2644] text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Security & Watermark Toggles */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#131F37] border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0B1F4B] dark:text-sky-300 flex items-center gap-1.5">
            <QrCode className="w-3.5 h-3.5 text-[#0A7AC1]" />
            <span>5. Security & Privacy Defaults</span>
          </span>

          <label className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-[#1A2644] border border-slate-200 dark:border-slate-700 cursor-pointer">
            <div>
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                Auto-Mask Passport Numbers on Public View
              </span>
              <span className="text-[11px] text-slate-500">
                Displays Z60****52 with user View toggle
              </span>
            </div>
            <input
              type="checkbox"
              checked={maskPassportByDefault}
              onChange={(e) => setMaskPassportByDefault(e.target.checked)}
              className="w-4 h-4 text-[#0A7AC1] rounded"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-[#1A2644] border border-slate-200 dark:border-slate-700 cursor-pointer">
            <div>
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                Security Watermark on Certificate Downloads
              </span>
              <span className="text-[11px] text-slate-500">
                Renders translucent Panama maritime seal
              </span>
            </div>
            <input
              type="checkbox"
              checked={showWatermark}
              onChange={(e) => setShowWatermark(e.target.checked)}
              className="w-4 h-4 text-[#0A7AC1] rounded"
            />
          </label>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleResetData}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors cursor-pointer"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            <span>Restore Benchmark Data</span>
          </button>

          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-[#0B1F4B] hover:bg-[#0A7AC1] rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            {saved ? <Check className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
            <span>{saved ? 'Settings Saved' : 'Save Configuration'}</span>
          </button>
        </div>

      </form>
    </div>
  );
};
