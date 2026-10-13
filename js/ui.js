import { html } from 'htm/react';
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts';
export function Card({ title, sub, right, children, flush }) {
  return html`<section className="card">
    ${
      (title || right) &&
      html`<div className="card-head">
        <div>
          ${title && html`<h2 className="card-title">${title}</h2>`}${sub && html`<p className="card-sub">${sub}</p>`}
        </div>
        ${right}
      </div>`
    }
    <div className=${flush ? 'card-body flush' : 'card-body'}>${children}</div>
  </section>`;
}
export function Delta({ value, suffix = 'pt' }) {
  const cls = value > 0.05 ? 'up' : value < -0.05 ? 'down' : 'flat';
  // monotone convention: declines are rendered in full ink, improvements in mid grey
  const arrow = value > 0.05 ? '▲' : value < -0.05 ? '▼' : '■';
  return html`<span className=${`delta ${cls} num`}
    ><span className="arrow">${arrow}</span
    >${value > 0 ? '+' : ''}${value.toFixed(1)}${suffix}</span
  >`;
}

/** Monotone severity token: darker = worse. */
export function scoreShade(score) {
  if (score < 70)
    return {
      bg: 'var(--ink-900)',
      fg: '#fff',
      border: 'var(--ink-900)',
    };
  if (score < 80)
    return {
      bg: 'var(--ink-700)',
      fg: '#fff',
      border: 'var(--ink-700)',
    };
  if (score < 88)
    return {
      bg: 'var(--ink-300)',
      fg: 'var(--ink-900)',
      border: 'var(--ink-300)',
    };
  if (score < 94)
    return {
      bg: 'var(--ink-100)',
      fg: 'var(--ink-800)',
      border: 'var(--ink-200)',
    };
  return {
    bg: 'var(--surface)',
    fg: 'var(--ink-700)',
    border: 'var(--line)',
  };
}
export function SeverityChip({ level }) {
  const cls = level === 'Critical' ? 'chip solid' : level === 'High' ? 'chip mid' : 'chip hatch';
  return html`<span className=${cls}>${level}</span>`;
}
export function Meter({ value, muted, tone }) {
  return html`<div className="meter thin" aria-hidden>
    <i
      className=${[muted ? 'muted' : '', tone ?? ''].filter(Boolean).join(' ')}
      style=${{
        width: `${Math.max(2, Math.min(100, value))}%`,
      }}
    />
  </div>`;
}
export function Spark({ data }) {
  return html`<div style=${{
    height: 44,
  }}><${ResponsiveContainer} width="100%" height="100%"><${AreaChart} data=${data} margin=${{
    top: 3,
    right: 0,
    bottom: 0,
    left: 0,
  }}><${YAxis} hide domain=${['dataMin - 0.6', 'dataMax + 0.6']}/><defs><linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#111111" stopOpacity=${0.16}/><stop offset="100%" stopColor="#111111" stopOpacity=${0}/></linearGradient></defs><${Area} type="monotone" dataKey="value" stroke="#111111" strokeWidth=${1.6} fill="url(#sparkFill)" dot=${false} isAnimationActive=${false}/></${AreaChart}></${ResponsiveContainer}></div>`;
}
export function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return html`<div className="tip">
    <b>${label}</b
    >${payload.map((p) => html`<div key=${p.name}>${p.name}: ${typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</div>`)}
  </div>`;
}
export const fmt = (n) => n.toLocaleString('en-US');
