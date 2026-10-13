import { html } from 'htm/react';
import { useState, Fragment } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { KPI_META } from '../data/demo.js';
import { auditRows, months, serviceRows } from '../data/select.js';
import { Card, Delta, Meter, Tip, fmt, scoreShade } from '../ui.js';
export function Services({ rows, duration }) {
  const svcs = serviceRows(rows, duration);
  const [activeId, setActiveId] = useState(svcs[0]?.service.id ?? '');
  const active = svcs.find((s) => s.service.id === activeId) ?? svcs[0];
  const ms = months(duration);
  const activeRows = rows.filter((r) => r.serviceId === active?.service.id);
  const activeAudits = auditRows(activeRows, duration);
  const trend = ms.map((month, i) => {
    const point = {
      month,
    };
    for (const s of svcs) {
      const slice = rows.filter((r) => r.serviceId === s.service.id);
      const vals = slice.map((r) => r.scores[r.scores.length - ms.length + i]);
      point[s.service.short] = Number(
        (vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length)).toFixed(1),
      );
    }
    return point;
  });
  const radar = KPI_META.map((k) => {
    const point = {
      kpi: k.label,
    };
    for (const s of svcs) point[s.service.short] = s.scores[k.key];
    return point;
  });
  const strokes = ['#111111', '#5c5c5c', '#a3a3a3', '#cfcfcf'];
  return html`<${Fragment}><div className="grid g4">${svcs.map((s) => {
    const on = s.service.id === activeId;
    return html`<button
      key=${s.service.id}
      className="card kpi-card"
      onClick=${() => setActiveId(s.service.id)}
      style=${{
        textAlign: 'left',
        border: on ? '1px solid var(--ink-900)' : '1px solid var(--line)',
        background: 'var(--surface)',
      }}
    >
      <div className="kpi-top">
        <div>
          <p className="eyebrow">${s.service.short}</p>
          <div className="kpi-value num">${s.overall.toFixed(1)}<small>%</small></div>
          <p className="kpi-blurb">
            ${s.audits} audits · ${fmt(s.service.ciCount)} CIs · owner ${s.service.owner}
          </p>
        </div>
        <${Delta} value=${s.delta} />
      </div>
      <${Meter} value=${s.overall} muted=${!on} />
      <div className="kpi-foot">
        <span className="num">${fmt(s.openFindings)} open findings</span
        ><span className="num">${s.deptsAtRisk} depts at risk</span>
      </div>
      <span
        className=${on ? 'chip solid' : 'chip soft'}
        style=${{
          marginRight: 'auto',
          fontSize: 10,
        }}
        >${on ? 'Selected' : 'Shared service'}</span
      >
    </button>`;
  })}</div><div className="grid g21"><${Card} title="Service trend comparison" sub=${`Average audit score · last ${duration} months`}><div style=${{
    height: 260,
  }}><${ResponsiveContainer} width="100%" height="100%"><${LineChart} data=${trend} margin=${{
    top: 6,
    right: 8,
    bottom: 0,
    left: -18,
  }}><${CartesianGrid} stroke="#ebebeb" vertical=${false}/><${XAxis} dataKey="month" tickLine=${false} axisLine=${{
    stroke: '#e0e0e0',
  }}/><${YAxis} domain=${[70, 100]} tickLine=${false} axisLine=${false}/><${Tooltip} content=${html`<${Tip} />`}/>${svcs.map((s, i) => html`<${Line} key=${s.service.id} type="monotone" dataKey=${s.service.short} stroke=${strokes[i]} strokeWidth=${s.service.id === activeId ? 2.4 : 1.4} dot=${false} />`)}</${LineChart}></${ResponsiveContainer}></div><div className="legend" style=${{
    marginTop: 10,
  }}>${svcs.map(
    (s, i) =>
      html`<span key=${s.service.id}
        ><i
          style=${{
            background: strokes[i],
          }}
        />${s.service.short}</span
      >`,
  )}</div></${Card}><${Card} title="KPI profile" sub="Where each service is strong or weak"><div style=${{
    height: 260,
  }}><${ResponsiveContainer} width="100%" height="100%"><${RadarChart} data=${radar} outerRadius="72%"><${PolarGrid} stroke="#e0e0e0"/><${PolarAngleAxis} dataKey="kpi" tick=${{
    fontSize: 11,
    fill: '#7a7a7a',
  }}/><${PolarRadiusAxis} domain=${[70, 92]} tick=${false} axisLine=${false}/><${Tooltip} content=${html`<${Tip} />`}/>${svcs.map((s, i) => html`<${Radar} key=${s.service.id} dataKey=${s.service.short} stroke=${strokes[i]} fill=${strokes[i]} fillOpacity=${s.service.id === activeId ? 0.16 : 0.04} strokeWidth=${s.service.id === activeId ? 2 : 1} />`)}</${RadarChart}></${ResponsiveContainer}></div></${Card}></div><${Card} title=${`${active?.service.name} — audit detail`} sub="Weakest audits first · click a service card above to switch" right=${html`<span className="chip soft">${activeAudits.length} audits</span>`} flush><table className="tbl"><thead><tr><th>Code</th><th>Audit</th><th>Cadence</th><th className="r">Score</th><th className="r">Change</th><th style=${{
    width: 140,
  }}>Distribution</th><th className="r">CIs checked</th><th className="r">Open findings</th><th className="r">Depts below 80</th></tr></thead><tbody>${activeAudits.map(
    (a) => {
      const sh = scoreShade(a.score);
      return html`<tr key=${a.audit.id}>
        <td className="mono muted">${a.audit.code}</td>
        <td className="primary">${a.audit.name}</td>
        <td className="muted">${a.audit.cadence}</td>
        <td className="r">
          <span
            className="chip num"
            style=${{
              background: sh.bg,
              color: sh.fg,
              borderColor: sh.border,
            }}
            >${a.score.toFixed(1)}</span
          >
        </td>
        <td className="r"><${Delta} value=${a.delta} /></td>
        <td><${Meter} value=${a.score} /></td>
        <td className="r num">${fmt(a.ciChecked)}</td>
        <td className="r num">${fmt(a.openFindings)}</td>
        <td className="r num">${a.deptsBelow}</td>
      </tr>`;
    },
  )}</tbody></table></${Card}></${Fragment}>`;
}
