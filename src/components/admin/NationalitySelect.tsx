import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import { SearchableSelect } from './SearchableSelect';

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

/** Pick-from-list nationality field with a search box. */
export const NationalitySelect: React.FC<Props> = ({ id, value, onChange, className }) => {
  const list = useNationalities();
  const options = useMemo(() => {
    const o = list.map((n) => ({ value: n, label: n }));
    return value && !list.includes(value) ? [{ value, label: value }, ...o] : o; // keep an older free-typed value visible
  }, [list, value]);
  return (
    <SearchableSelect
      id={id} className={className} value={value} onChange={onChange} options={options} uppercase
      placeholder="Select nacionality" searchPlaceholder="Search country…" searchLabel="Search nacionality"
    />
  );
};
