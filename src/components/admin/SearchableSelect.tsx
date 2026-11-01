import React, { useEffect, useMemo, useRef, useState } from 'react';

export interface SelectOption { value: string; label: string }

interface Props {
  id?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  className: string;
  placeholder: string;
  searchPlaceholder?: string;
  searchLabel?: string;
  disabled?: boolean;
  uppercase?: boolean;
}

/** Pick-from-list field with a search box (type to filter, arrows + Enter or click to choose). */
export const SearchableSelect: React.FC<Props> = ({
  id, value, options, onChange, className, placeholder, searchPlaceholder = 'Search…', searchLabel = 'Search', disabled, uppercase,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  const q = query.trim().toLowerCase();
  const matches = useMemo(() => (q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options), [options, q]);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) { setOpen(false); setQuery(''); } };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const choose = (v: string) => { onChange(v); setOpen(false); setQuery(''); };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, matches.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (matches[active]) choose(matches[active].value); }
    else if (e.key === 'Escape') { setOpen(false); setQuery(''); }
  };

  return (
    <div className="relative" ref={box}>
      <button
        type="button" id={id} disabled={disabled} className={`${className} text-left flex items-center justify-between gap-2`}
        aria-haspopup="listbox" aria-expanded={open} onClick={() => { setOpen((o) => !o); setActive(0); }}
      >
        <span className={`${selected ? (uppercase ? 'uppercase' : '') : 'text-slate-400'} truncate`}>{selected?.label ?? placeholder}</span>
        <span aria-hidden className="text-slate-400 text-xs shrink-0">▾</span>
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-[#1A2644] shadow-lg">
          <input
            autoFocus value={query} onChange={(e) => { setQuery(e.target.value); setActive(0); }} onKeyDown={onKey}
            placeholder={searchPlaceholder} aria-label={searchLabel}
            className="w-full h-9 px-3 text-sm border-b border-slate-200 dark:border-slate-600 bg-transparent focus:outline-hidden"
          />
          <ul role="listbox" className="max-h-56 overflow-auto py-1 text-sm">
            {matches.length === 0 && <li className="px-3 py-2 text-slate-500">No match</li>}
            {matches.map((o, i) => (
              <li
                key={o.value} role="option" aria-selected={o.value === value}
                onMouseDown={(e) => { e.preventDefault(); choose(o.value); }} onMouseEnter={() => setActive(i)}
                className={`px-3 py-1.5 cursor-pointer ${i === active ? 'bg-sky-100 dark:bg-slate-700' : ''} ${o.value === value ? 'font-bold' : ''}`}
              >
                {o.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
