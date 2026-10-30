import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { User, UserRole } from '../../types';
import {
  UserPlus,
  ShieldCheck,
  Shield,
  CheckCircle2,
  XCircle,
  Mail,
  Building,
  KeyRound,
  X,
  AlertCircle,
} from 'lucide-react';

export const UsersRolesView: React.FC = () => {
  const { users, addUser, updateUserStatus, currentUser, showToast } = useApp();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [tempCred, setTempCred] = useState<{ email: string; password: string } | null>(null);

  const isSuperAdmin = currentUser?.role === 'super_admin';

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Invite Modal */}
      {inviteModalOpen && (
        <InviteUserModal
          onClose={() => setInviteModalOpen(false)}
          onInvite={async (userData) => {
            const password = await addUser(userData);
            if (password) {
              setTempCred({ email: userData.email, password });
              setInviteModalOpen(false);
            }
          }}
        />
      )}

      {tempCred && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 p-4 text-xs text-amber-900 dark:text-amber-200 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="font-bold">One-time temporary password for {tempCred.email}</div>
            <code className="inline-block px-2 py-1 rounded bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 text-sm select-all">{tempCred.password}</code>
            <div>Share it securely. It will not be shown again.</div>
          </div>
          <button onClick={() => setTempCred(null)} className="font-bold underline cursor-pointer">Dismiss</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0B1F4B] dark:text-white">
            Users & Role Permissions
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Role-Based Access Control (RBAC) governing Panama STCW certificate issuance and revocation
          </p>
        </div>

        <button
          onClick={() => {
            if (!isSuperAdmin) {
              showToast('Only Super Admin can invite and manage user credentials', 'error');
              return;
            }
            setInviteModalOpen(true);
          }}
          disabled={!isSuperAdmin}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-white bg-[#0B1F4B] hover:bg-[#0A7AC1] disabled:opacity-40 transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Invite Authorized User</span>
        </button>
      </div>

      {/* ROLE PERMISSIONS EXPLANATION MATRIX */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Super Admin Card */}
        <div className="p-5 rounded-xl bg-purple-50/70 dark:bg-[#1A162B] border border-purple-200 dark:border-purple-900/60 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="font-extrabold text-sm text-[#0B1F4B] dark:text-white">
                Super Admin Role
              </span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-200 dark:bg-purple-900 text-purple-900 dark:text-purple-200 uppercase tracking-wider">
              Full Authority
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300">
            Designated for CTC General Management and Executive Registrars. Full legal jurisdiction over the entire STCW registry.
          </p>

          <ul className="text-xs space-y-1.5 text-slate-700 dark:text-slate-300 pt-1">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
              <span>Issue & publish new STCW certificates</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
              <span><strong>Revoke & nullify certificates</strong> (with official audit reason)</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
              <span>Delete errant records from sovereign database</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
              <span>Invite, modify, and deactivate authorized user accounts</span>
            </li>
          </ul>
        </div>

        {/* Issuer Role Card */}
        <div className="p-5 rounded-xl bg-sky-50/70 dark:bg-[#0E1E38] border border-sky-200 dark:border-sky-900/60 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#0A7AC1] dark:text-sky-400" />
              <span className="font-extrabold text-sm text-[#0B1F4B] dark:text-white">
                Issuer Role
              </span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-200 dark:bg-sky-900 text-sky-900 dark:text-sky-200 uppercase tracking-wider">
              Restricted Scope
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300">
            For operational certification desk officers and examination proctors. Can prepare and publish training credentials.
          </p>

          <ul className="text-xs space-y-1.5 text-slate-700 dark:text-slate-300 pt-1">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Add, input, and publish certificates to public registry</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Edit trainee metadata and upload document attachments</span>
            </li>
            <li className="flex items-center gap-2 text-slate-400">
              <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span>Cannot revoke or nullify existing credentials</span>
            </li>
            <li className="flex items-center gap-2 text-slate-400">
              <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span>Cannot delete records or manage administrative accounts</span>
            </li>
          </ul>
        </div>
      </div>

      {/* USER TABLE */}
      <div className="bg-white dark:bg-[#131F37] border border-slate-200 dark:border-slate-700/80 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#0B1F4B] dark:text-white">
            Authorized Personnel Directory ({users.length})
          </h2>
          <span className="text-xs text-slate-400">Panama STCW Accredited Staff</span>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#0E172A] border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4">Officer Name</th>
                <th className="py-3 px-4">Role Badge</th>
                <th className="py-3 px-4">Official Email</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4">Last Activity</th>
                {isSuperAdmin && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-[#0B1F4B] dark:text-white">{u.name}</div>
                    <div className="text-[11px] text-slate-400">{u.title}</div>
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    {u.role === 'super_admin' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300">
                        <span>Super Admin</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300">
                        <span>Issuer</span>
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {u.email}
                  </td>

                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {u.department}
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    {u.status === 'active' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Active</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        <span>Inactive</span>
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4 font-mono tnum text-[11px] text-slate-400 whitespace-nowrap">
                    {u.lastLogin}
                  </td>

                  {isSuperAdmin && (
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {u.id !== currentUser?.id && (
                        <button
                          onClick={() => updateUserStatus(u.id, u.status === 'active' ? 'inactive' : 'active')}
                          className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-[#0A7AC1] cursor-pointer"
                        >
                          {u.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Stacked Card View */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800 p-2 space-y-2">
          {users.map((u) => (
            <div key={u.id} className="p-3 rounded-lg bg-slate-50/60 dark:bg-[#1A2644] space-y-2 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-sm text-[#0B1F4B] dark:text-white">{u.name}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">{u.title} · {u.department}</div>
                </div>
                {u.role === 'super_admin' ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300">
                    Super Admin
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300">
                    Issuer
                  </span>
                )}
              </div>

              <div className="font-mono text-[11px] text-slate-600 dark:text-slate-300 truncate">
                {u.email}
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700/60 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  <span className="capitalize text-slate-600 dark:text-slate-300 font-medium">{u.status}</span>
                  <span className="text-slate-400">· {u.lastLogin}</span>
                </div>

                {isSuperAdmin && u.id !== currentUser?.id && (
                  <button
                    onClick={() => updateUserStatus(u.id, u.status === 'active' ? 'inactive' : 'active')}
                    className="font-bold text-[#0A7AC1] dark:text-sky-300 cursor-pointer"
                  >
                    {u.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

/* Invite User Modal */
const InviteUserModal: React.FC<{
  onClose: () => void;
  onInvite: (user: Omit<User, 'id' | 'lastLogin'>) => void | Promise<void>;
}> = ({ onClose, onInvite }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('issuer');
  const [title, setTitle] = useState('Maritime Certification Officer');
  const [department, setDepartment] = useState('STCW Examination Desk');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    onInvite({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role,
      title,
      department,
      status: 'active',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white dark:bg-[#131F37] rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[#0A7AC1]" />
            <span className="font-bold text-sm text-[#0B1F4B] dark:text-white">
              Invite Authorized Personnel
            </span>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Officer Full Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sofia Delgado"
              className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1A2644] text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Official CTC Email *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="s.delgado@ctc.com.pa"
              className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1A2644] text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Assigned Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1A2644] text-slate-900 dark:text-white"
            >
              <option value="issuer">Issuer (Add & Edit Only, No Revocation)</option>
              <option value="super_admin">Super Admin (Full Authority + Revoke)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Job Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1A2644] text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Department
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full h-10 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1A2644] text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold uppercase tracking-wider text-white bg-[#0B1F4B] hover:bg-[#0A7AC1] rounded shadow-xs cursor-pointer"
            >
              Send Authorization Invite
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
