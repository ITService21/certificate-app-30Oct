import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../api';

let cache: string[] | null = null;

/** Nationality list seeded in the database (cached for the session). */
function useNationalities() {
  const [list, setList] = useState<string[]>(cache ?? []);
  useEffect(() => {
    if (cache) return;
    api.get<string[]>('/admin/nationalities').then((l) => { cache = l; setList(l); }).catch(() => {});
  }, []);
  return list;
}

interface Props { id?: string; value: string; onChange: (v: string) => void; className: string }

/** Pick-from-list nationality field with a search box (type to filter, click or Enter to choose). */
export const NationalitySelect: React.FC<Props> = ({ id, value, onChange, className }) => {
  const list = useNationalities();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  const q = query.trim().toUpperCase();
  const matches = useMemo(() => (q ? list.filter((n) => n.includes(q)) : list), [list, q]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) { setOpen(false); setQuery(''); } };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const choose = (n: string) => { onChange(n); setOpen(false); setQuery(''); };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, matches.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (matches[active]) choose(matches[active]); }
    else if (e.key === 'Escape') { setOpen(false); setQuery(''); }
  };

  return (
    <div className="relative" ref={box}>
      <button
        type="button" id={id} className={`${className} text-left flex items-center justify-between`}
        aria-haspopup="listbox" aria-expanded={open} onClick={() => { setOpen((o) => !o); setActive(0); }}
      >
        <span className={value ? 'uppercase' : 'text-slate-400'}>{value || 'Select nationality'}</span>
        <span aria-hidden className="text-slate-400 text-xs">▾</span>
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1A2644] shadow-lg">
          <input
            autoFocus value={query} onChange={(e) => { setQuery(e.target.value); setActive(0); }} onKeyDown={onKey}
            placeholder="Search country…" aria-label="Search nationality"
            className="w-full h-9 px-3 text-sm border-b border-slate-200 dark:border-slate-600 bg-transparent focus:outline-hidden"
          />
          <ul role="listbox" className="max-h-56 overflow-auto py-1 text-sm">
            {matches.length === 0 && <li className="px-3 py-2 text-slate-500">No match</li>}
            {matches.map((n, i) => (
              <li
                key={n} role="option" aria-selected={n === value}
                onMouseDown={(e) => { e.preventDefault(); choose(n); }} onMouseEnter={() => setActive(i)}
                className={`px-3 py-1.5 cursor-pointer ${i === active ? 'bg-sky-100 dark:bg-slate-700' : ''} ${n === value ? 'font-bold' : ''}`}
              >
                {n}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
