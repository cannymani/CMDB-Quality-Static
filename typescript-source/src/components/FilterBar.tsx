import { useState } from 'react';
import { DEPARTMENTS, OWNERS, SERVICES } from '../data/demo';
import type { Duration, Filters } from '../data/select';

const DURATIONS: { value: Duration; label: string }[] = [
  { value: 3, label: 'Last 3 months' },
  { value: 6, label: 'Last 6 months' },
  { value: 12, label: 'Last 12 months' },
];

function MultiSelect({
  label,
  options,
  selected,
  onChange,
  searchable,
  icon,
}: {
  label: string;
  icon: string;
  options: { id: string; name: string; hint?: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const shown = q
    ? options.filter((o) => o.name.toLowerCase().includes(q.toLowerCase()))
    : options;

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);

  return (
    <div className="filter">
      <button className={`filter-btn ${selected.length ? 'on' : ''}`} onClick={() => setOpen(!open)}>
        <span className="filter-ico" aria-hidden>
          {icon}
        </span>
        {label}
        {selected.length > 0 && <span className="count num">{selected.length}</span>}
        <span style={{ fontSize: 9, opacity: 0.6 }}>▾</span>
      </button>
      {open && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 30 }}
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="filter-pop">
            {searchable && (
              <input
                className="filter-search"
                placeholder={`Search ${label.toLowerCase()}…`}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            )}
            {selected.length > 0 && (
              <button className="link-btn" style={{ margin: '0 8px 6px' }} onClick={() => onChange([])}>
                Clear {selected.length} selected
              </button>
            )}
            {shown.slice(0, 60).map((o) => (
              <label className={`opt ${selected.includes(o.id) ? 'on' : ''}`} key={o.id}>
                <input type="checkbox" checked={selected.includes(o.id)} onChange={() => toggle(o.id)} />
                <span style={{ flex: 1 }}>{o.name}</span>
                {o.hint && <span style={{ color: 'var(--ink-400)', fontSize: 11 }}>{o.hint}</span>}
              </label>
            ))}
            {shown.length > 60 && (
              <p style={{ fontSize: 11, color: 'var(--ink-500)', padding: '4px 8px', margin: 0 }}>
                Showing first 60 of {shown.length} — refine your search
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function FilterBar({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
}) {
  const active =
    filters.departments.length + filters.owners.length + filters.services.length > 0 ||
    filters.duration !== 12;

  return (
    <div className="filterbar">
      <span className="filterbar-lbl">Filters</span>
      <MultiSelect
        label="Departments"
        icon="◍"
        searchable
        options={DEPARTMENTS.map((d) => ({ id: d.id, name: d.name, hint: d.owner }))}
        selected={filters.departments}
        onChange={(departments) => onChange({ ...filters, departments })}
      />
      <MultiSelect
        label="Department owner"
        icon="◉"
        options={OWNERS.map((o) => ({ id: o, name: o }))}
        selected={filters.owners}
        onChange={(owners) => onChange({ ...filters, owners })}
      />
      <MultiSelect
        label="Services"
        icon="◈"
        options={SERVICES.map((s) => ({ id: s.id, name: s.name }))}
        selected={filters.services}
        onChange={(services) => onChange({ ...filters, services })}
      />
      <span className="filterbar-div" aria-hidden />
      <div className="seg">
        {DURATIONS.map((d) => (
          <button
            key={d.value}
            className={filters.duration === d.value ? 'on' : ''}
            onClick={() => onChange({ ...filters, duration: d.value })}
          >
            {d.label}
          </button>
        ))}
      </div>
      <div className="filters-spacer" />
      <span className="filterbar-scope">
        <b className="num">{filters.departments.length || DEPARTMENTS.length}</b> departments ·{' '}
        <b className="num">{filters.services.length || SERVICES.length}</b> services ·{' '}
        <b className="num">{filters.owners.length || OWNERS.length}</b> owners
      </span>
      {active && (
        <button
          className="link-btn"
          onClick={() => onChange({ departments: [], owners: [], services: [], duration: 12 })}
        >
          Reset filters
        </button>
      )}
      <button className="filter-btn">Export board pack</button>
    </div>
  );
}
