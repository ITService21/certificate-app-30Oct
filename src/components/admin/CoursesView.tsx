import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, X, Search } from 'lucide-react';
import { api } from '../../api';
import { useApp } from '../../context/AppContext';

interface Course {
  code: string; title: string; stcwRegulation: string; approvalResolution: string; approvalAuthority: string;
  approvalDate: string; approvalValidUntil: string; validityYears: number; durationDays: number; sortOrder: number; active: boolean;
}

const INPUT = 'w-full h-10 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1A2644] text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#0A7AC1] disabled:opacity-60';
const LABEL = 'block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5';
const day = (s: string) => String(s ?? '').slice(0, 10);

const BLANK: Course = {
  code: '', title: '', stcwRegulation: '', approvalResolution: 'Resolution No. DGGM-CFM-005-2024',
  approvalAuthority: 'Government of Panama, Directorate General of Merchant Marine', approvalDate: '', approvalValidUntil: '',
  validityYears: 5, durationDays: 5, sortOrder: 100, active: true,
};

export const CoursesView: React.FC = () => {
  const { showToast, currentUser } = useApp();
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<{ course: Course; isNew: boolean } | null>(null);

  const load = () => {
    setError('');
    api.get<Course[]>('/admin/courses').then(setCourses).catch((e) => setError(e.message || 'Could not load the courses.'));
  };
  useEffect(load, []);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (courses ?? []).filter((c) => !q || `${c.code} ${c.title}`.toLowerCase().includes(q));
  }, [courses, search]);

  if (currentUser?.role !== 'super_admin') {
    return <p className="text-sm text-slate-500">Only a Super Admin can manage courses.</p>;
  }

  const remove = async (c: Course) => {
    if (!window.confirm(`Delete the course "${c.title}"?\n\nCertificates already issued are not changed.`)) return;
    try {
      await api.del(`/admin/courses/${encodeURIComponent(c.code)}`);
      showToast('Course deleted', 'success');
      load();
    } catch (e: any) { showToast(e.message || 'Could not delete the course', 'error'); }
  };

  const toggle = async (c: Course) => {
    try {
      await api.put(`/admin/courses/${encodeURIComponent(c.code)}`, { active: !c.active });
      load();
    } catch (e: any) { showToast(e.message || 'Could not update the course', 'error'); }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {editing && (
        <CourseModal
          initial={editing.course} isNew={editing.isNew} onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); showToast(editing.isNew ? 'Course added' : 'Course saved', 'success'); }}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0B1F4B] dark:text-white">Courses</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            The courses offered in Generate Certificate. Changes apply to new certificates only; issued certificates keep their printed wording.
          </p>
        </div>
        <button
          type="button" onClick={() => setEditing({ course: { ...BLANK, sortOrder: ((courses ?? []).reduce((m, c) => Math.max(m, c.sortOrder), 0) || 0) + 10 }, isNew: true })}
          className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-[#0B1F4B] hover:bg-[#12306e] text-white text-sm font-bold cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add course
        </button>
      </div>

      <div className="rounded-xl bg-white dark:bg-[#131F37] border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400" aria-hidden />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search courses…" aria-label="Search courses"
            className="flex-1 h-9 text-sm bg-transparent focus:outline-hidden"
          />
          <span className="text-xs text-slate-400">{courses ? `${shown.length} of ${courses.length}` : ''}</span>
        </div>

        {error && (
          <p role="alert" className="p-4 text-xs text-red-600 dark:text-red-400">
            {error} <button type="button" onClick={load} className="font-bold underline cursor-pointer">Retry</button>
          </p>
        )}
        {!courses && !error && <p className="p-4 text-xs text-slate-500">Loading courses…</p>}

        {courses && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#0E172A] border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Course title</th>
                  <th className="py-3 px-4 whitespace-nowrap">Days</th>
                  <th className="py-3 px-4 whitespace-nowrap">Valid (yrs)</th>
                  <th className="py-3 px-4 whitespace-nowrap">Approval until</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {shown.length === 0 && (
                  <tr><td colSpan={7} className="py-6 px-4 text-center text-slate-500">{courses.length ? 'No course matches your search.' : 'No courses yet. Click “Add course”.'}</td></tr>
                )}
                {shown.map((c) => (
                  <tr key={c.code} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold whitespace-nowrap">{c.code}</td>
                    <td className="py-3 px-4 text-[#0B1F4B] dark:text-white font-bold">{c.title}</td>
                    <td className="py-3 px-4">{c.durationDays}</td>
                    <td className="py-3 px-4">{c.validityYears}</td>
                    <td className="py-3 px-4 whitespace-nowrap">{day(c.approvalValidUntil)}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <button
                        type="button" onClick={() => toggle(c)} aria-label={`${c.active ? 'Hide' : 'Show'} ${c.title} in Generate Certificate`}
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold cursor-pointer ${c.active ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300' : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}
                      >
                        {c.active ? 'Active' : 'Hidden'}
                      </button>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-right">
                      <button type="button" onClick={() => setEditing({ course: { ...c, approvalDate: day(c.approvalDate), approvalValidUntil: day(c.approvalValidUntil) }, isNew: false })} className="p-1.5 text-slate-500 hover:text-[#0A7AC1] cursor-pointer" aria-label={`Edit ${c.title}`}><Pencil className="w-4 h-4" /></button>
                      <button type="button" onClick={() => remove(c)} className="p-1.5 text-slate-500 hover:text-red-600 cursor-pointer" aria-label={`Delete ${c.title}`}><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const CourseModal: React.FC<{ initial: Course; isNew: boolean; onClose: () => void; onSaved: () => void }> = ({ initial, isNew, onClose, onSaved }) => {
  const [f, setF] = useState<Course>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = <K extends keyof Course>(k: K, v: Course[K]) => setF((p) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const { code, ...body } = f;
      if (isNew) await api.post('/admin/courses', { code: code.trim().toUpperCase(), ...body });
      else await api.put(`/admin/courses/${encodeURIComponent(code)}`, body);
      onSaved();
    } catch (e2: any) {
      setErr(e2.message || 'Could not save the course');
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div role="dialog" aria-modal="true" aria-label={isNew ? 'Add course' : 'Edit course'} className="w-full max-w-2xl bg-white dark:bg-[#131F37] rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <span className="font-bold text-sm text-[#0B1F4B] dark:text-white">{isNew ? 'Add course' : `Edit course · ${initial.code}`}</span>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
            <div>
              <label className={LABEL} htmlFor="c-code">Code *</label>
              <input id="c-code" className={`${INPUT} uppercase font-mono`} value={f.code} disabled={!isNew} maxLength={20} required
                onChange={(e) => set('code', e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))} placeholder="e.g. PSSR" />
            </div>
            <div>
              <label className={LABEL} htmlFor="c-title">Course title *</label>
              <input id="c-title" className={INPUT} value={f.title} maxLength={255} required onChange={(e) => set('title', e.target.value)} />
            </div>
          </div>
          <div>
            <label className={LABEL} htmlFor="c-reg">Regulation wording (Enter = new line on the certificate) *</label>
            <textarea id="c-reg" rows={2} maxLength={400} required value={f.stcwRegulation} onChange={(e) => set('stcwRegulation', e.target.value)}
              className={`${INPUT} h-auto py-2`} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={LABEL} htmlFor="c-res">Approval resolution *</label>
              <input id="c-res" className={INPUT} value={f.approvalResolution} maxLength={160} required onChange={(e) => set('approvalResolution', e.target.value)} />
            </div>
            <div>
              <label className={LABEL} htmlFor="c-auth">Approval authority *</label>
              <input id="c-auth" className={INPUT} value={f.approvalAuthority} maxLength={255} required onChange={(e) => set('approvalAuthority', e.target.value)} />
            </div>
            <div>
              <label className={LABEL} htmlFor="c-date">Approved on *</label>
              <input id="c-date" type="date" className={INPUT} value={f.approvalDate} required onChange={(e) => set('approvalDate', e.target.value)} />
            </div>
            <div>
              <label className={LABEL} htmlFor="c-until">Approval valid until *</label>
              <input id="c-until" type="date" className={INPUT} value={f.approvalValidUntil} required onChange={(e) => set('approvalValidUntil', e.target.value)} />
            </div>
          </div>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            <div>
              <label className={LABEL} htmlFor="c-days">Duration (days) *</label>
              <input id="c-days" type="number" min={1} max={60} className={INPUT} value={f.durationDays} required onChange={(e) => set('durationDays', Number(e.target.value))} />
            </div>
            <div>
              <label className={LABEL} htmlFor="c-years">Valid (years) *</label>
              <input id="c-years" type="number" min={1} max={10} className={INPUT} value={f.validityYears} required onChange={(e) => set('validityYears', Number(e.target.value))} />
            </div>
            <div>
              <label className={LABEL} htmlFor="c-sort">Sort order</label>
              <input id="c-sort" type="number" min={0} className={INPUT} value={f.sortOrder} onChange={(e) => set('sortOrder', Number(e.target.value))} />
            </div>
            <label className="flex items-end gap-2 pb-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 cursor-pointer">
              <input type="checkbox" checked={f.active} onChange={(e) => set('active', e.target.checked)} className="w-4 h-4" /> Active
            </label>
          </div>

          {err && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{err}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="h-10 px-4 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-bold cursor-pointer">Cancel</button>
            <button type="submit" disabled={busy} className="h-10 px-5 rounded-lg bg-[#0B1F4B] hover:bg-[#12306e] text-white text-sm font-bold cursor-pointer disabled:opacity-60">
              {busy ? 'Saving…' : isNew ? 'Add course' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
