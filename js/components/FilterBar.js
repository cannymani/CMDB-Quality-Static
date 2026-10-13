import { html } from 'htm/react';
import { useState, Fragment } from 'react';
import { DEPARTMENTS, SERVICES } from '../data/demo.js';
const DURATIONS = [
  {
    value: 3,
    label: 'Last 3 months',
  },
  {
    value: 6,
    label: 'Last 6 months',
  },
  {
    value: 12,
    label: 'Last 12 months',
  },
];
function MultiSelect({ label, options, selected, onChange, searchable, icon }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const shown = q ? options.filter((o) => o.name.toLowerCase().includes(q.toLowerCase())) : options;
  const toggle = (id) =>
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  return html`<div className="filter">
    <button
      className=${`filter-btn ${selected.length ? 'on' : ''}`}
      onClick=${() => setOpen(!open)}
    >
      <span className="filter-ico" aria-hidden>${icon}</span
      >${label}${selected.length > 0 && html`<span className="count num">${selected.length}</span>`}<span
        style=${{
          fontSize: 9,
          opacity: 0.6,
        }}
        >▾</span
      ></button
    >${
      open &&
      html`<${Fragment}><div style=${{
        position: 'fixed',
        inset: 0,
        zIndex: 30,
      }} onClick=${() => setOpen(false)} aria-hidden/><div className="filter-pop">${searchable && html`<input className="filter-search" placeholder=${`Search ${label.toLowerCase()}…`} value=${q} onChange=${(e) => setQ(e.target.value)} />`}${
        selected.length > 0 &&
        html`<button
          className="link-btn"
          style=${{
            margin: '0 8px 6px',
          }}
          onClick=${() => onChange([])}
        >
          Clear ${selected.length} selected
        </button>`
      }${shown.slice(0, 60).map(
        (o) =>
          html`<label className=${`opt ${selected.includes(o.id) ? 'on' : ''}`} key=${o.id}
            ><input
              type="checkbox"
              checked=${selected.includes(o.id)}
              onChange=${() => toggle(o.id)}
            /><span
              style=${{
                flex: 1,
              }}
              >${o.name}</span
            >${
              o.hint &&
              html`<span
                style=${{
                  color: 'var(--ink-400)',
                  fontSize: 11,
                }}
                >${o.hint}</span
              >`
            }</label
          >`,
      )}${
        shown.length > 60 &&
        html`<p
          style=${{
            fontSize: 11,
            color: 'var(--ink-500)',
            padding: '4px 8px',
            margin: 0,
          }}
        >
          Showing first 60 of ${shown.length} — refine your search
        </p>`
      }</div></${Fragment}>`
    }
  </div>`;
}
export function FilterBar({ filters, onChange }) {
  const active =
    filters.departments.length + filters.owners.length + filters.services.length > 0 ||
    filters.duration !== 12;
  return html`<div className="filterbar">
    <span className="filterbar-lbl">Filters</span
    ><${MultiSelect}
      label="Departments"
      icon="◍"
      searchable
      options=${DEPARTMENTS.map((d) => ({
        id: d.id,
        name: d.name,
        hint: d.owner,
      }))}
      selected=${filters.departments}
      onChange=${(departments) =>
        onChange({
          ...filters,
          departments,
        })}
    /><span className="filterbar-div" aria-hidden />
    <div className="seg">
      ${DURATIONS.map(
        (d) =>
          html`<button
            key=${d.value}
            className=${filters.duration === d.value ? 'on' : ''}
            onClick=${() =>
              onChange({
                ...filters,
                duration: d.value,
              })}
          >
            ${d.label}
          </button>`,
      )}
    </div>
    <div className="filters-spacer" />
    <span className="filterbar-scope"
      ><b className="num">${filters.departments.length || DEPARTMENTS.length}</b> departments</span
    >${filters.owners.length > 0 &&
    html`<button className="filterbar-chip" aria-label="Clear owner filter" onClick=${() => onChange({ ...filters, owners: [] })}>
      Owner: ${filters.owners.join(', ')} <span aria-hidden="true">✕</span></button>`}${filters.services.length > 0 &&
    html`<span className="filterbar-chip">
      Service: ${filters.services.map((id) => SERVICES.find((s) => s.id === id)?.short ?? id).join(', ')}</span>`}${
      active &&
      html`<button
        className="link-btn"
        onClick=${() =>
          onChange({
            departments: [],
            owners: [],
            services: [],
            duration: 12,
          })}
      >
        Reset filters
      </button>`
    }<button
      className="filter-btn"
      onClick=${() => window.print()}
      title="Print or save the current view as PDF"
    >
      Export board pack
    </button>
  </div>`;
}
