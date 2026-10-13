import { html } from 'htm/react';
import { useMemo, useState, Fragment } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { KPI_META } from '../data/demo.js';
import {
  auditRows,
  deptRows,
  distribution,
  kpiSummaries,
  months,
  RISK_THRESHOLD,
  serviceLabel,
  serviceRows,
  TARGETS,
} from '../data/select.js';
import { Card, Delta, Meter, SeverityChip, Spark, Tip, fmt, scoreShade } from '../ui.js';
const KPI = 'compliance';

/**
 * Compliance audits rarely fail outright — the executive signal is how much of the
 * department estate an audit is failing, plus whether the trend is going backwards.
 */
function auditSeverity(a, deptTotal) {
  const exposure = deptTotal ? a.deptsBelow / deptTotal : 0;
  if (exposure >= 0.2 || a.delta < -1.5) return 'Critical';
  if (exposure >= 0.15 || a.delta < 0) return 'High';
  return 'Medium';
}
export function Compliance({ rows, duration }) {
  const cRows = useMemo(() => rows.filter((r) => r.kpi === KPI), [rows]);
  const audits = useMemo(() => auditRows(cRows, duration), [cRows, duration]);
  const depts = useMemo(() => deptRows(cRows, duration), [cRows, duration]);
  const svcs = useMemo(() => serviceRows(cRows, duration), [cRows, duration]);
  const summary = useMemo(
    () => kpiSummaries(cRows, duration).find((k) => k.key === KPI),
    [cRows, duration],
  );
  const [openDept, setOpenDept] = useState(null);
  const target = TARGETS[KPI];
  const ms = months(duration);
  const dist = distribution(depts);
  const trend = summary.series.map((p, i) => ({
    month: ms[i] ?? p.month,
    Compliance: p.value,
    Target: target,
  }));
  const belowTarget = audits.filter((a) => a.score < target).length;
  const ranked = [...audits].sort((x, y) => y.deptsBelow - x.deptsBelow);
  const attention = ranked.filter((a) => auditSeverity(a, depts.length) !== 'Medium');
  const openFindings = cRows.reduce((a, r) => a + r.openFindings, 0);
  const slaBreaches = new Set(
    cRows.filter((r) => r.slaBreachDays > 0).map((r) => `${r.deptId}-${r.auditId}`),
  ).size;
  const deptsAtRisk = depts.filter((d) => d.overall < RISK_THRESHOLD).length;
  const band =
    summary.score >= 92
      ? 'Healthy'
      : summary.score >= 85
        ? 'Stable'
        : summary.score >= 78
          ? 'Watch'
          : 'Critical';
  const auditChart = audits.map((a) => ({
    code: a.audit.code,
    name: a.audit.name,
    score: a.score,
  }));
  return html`<${Fragment}><div className="grid g4"><section className="card kpi-card"><div className="kpi-top"><div><p className="eyebrow">Compliance health</p><div className="kpi-value num">${summary.score.toFixed(1)}<small>%</small></div><p className="kpi-blurb">${KPI_META.find((k) => k.key === KPI).blurb}</p></div><span className="chip soft">${band}</span></div><${Meter} value=${summary.score}/><div className="kpi-foot"><span>Target ${target}% · <b className="num">${summary.score - target >= 0 ? '+' : ''}${(summary.score - target).toFixed(1)}pt</b></span><${Delta} value=${summary.delta}/></div></section><section className="card kpi-card"><div className="kpi-top"><div><p className="eyebrow">Compliance audits</p><div className="kpi-value num">${audits.length}<small>in scope</small></div><p className="kpi-blurb"><b className="num">${belowTarget}</b> below the ${target}% target · <b className="num">${attention.length}</b> need attention</p></div></div><${Spark} data=${summary.series}/><div className="kpi-foot"><span>Weakest ${audits[0]?.audit.code ?? '—'}</span><span className="num">${audits[0] ? audits[0].score.toFixed(1) : '—'}</span></div></section><section className="card kpi-card"><div className="kpi-top"><div><p className="eyebrow">Departments at risk</p><div className="kpi-value num">${deptsAtRisk}<small>/${depts.length}</small></div><p className="kpi-blurb">Compliance score below the ${RISK_THRESHOLD}% risk threshold</p></div></div><${Meter} value=${depts.length ? (deptsAtRisk / depts.length) * 100 : 0} muted/><div className="kpi-foot"><span>Median department</span><span className="num">${depts.length ? depts[Math.floor(depts.length / 2)].overall.toFixed(1) : '—'}</span></div></section><section className="card kpi-card"><div className="kpi-top"><div><p className="eyebrow">Open policy findings</p><div className="kpi-value num">${fmt(openFindings)}</div><p className="kpi-blurb"><b className="num">${fmt(slaBreaches)}</b> department × audit combinations breaching remediation SLA</p></div></div><div className="kpi-foot"><span>CIs evaluated</span><span className="num">${fmt(cRows.reduce((a, r) => a + r.ciChecked, 0))}</span></div></section></div><div className="grid g21"><${Card} title="Compliance trend vs target" sub=${`Weighted compliance score across ${audits.length} audits · last ${duration} months`} right=${html`<div
    className="legend"
  >
    <span
      ><i
        style=${{
          background: 'var(--ink-900)',
        }}
      />Compliance</span
    ><span
      ><i
        style=${{
          background: 'var(--ink-300)',
        }}
      />Target ${target}%</span
    >
  </div>`}><div style=${{
    height: 232,
  }}><${ResponsiveContainer} width="100%" height="100%"><${LineChart} data=${trend} margin=${{
    top: 6,
    right: 8,
    bottom: 0,
    left: -18,
  }}><${CartesianGrid} stroke="#ebebeb" vertical=${false}/><${XAxis} dataKey="month" tickLine=${false} axisLine=${{
    stroke: '#e0e0e0',
  }}/><${YAxis} domain=${[70, 100]} tickLine=${false} axisLine=${false}/><${Tooltip} content=${html`<${Tip} />`}/><${ReferenceLine} y=${RISK_THRESHOLD} stroke="#cfcfcf" strokeDasharray="3 3"/><${Line} type="monotone" dataKey="Compliance" stroke="#111111" strokeWidth=${2} dot=${false}/><${Line} type="monotone" dataKey="Target" stroke="#cfcfcf" strokeWidth=${2} dot=${false} strokeDasharray="4 3"/></${LineChart}></${ResponsiveContainer}></div><table className="tbl nw" style=${{
    marginTop: 6,
  }}><thead><tr><th>Service</th><th className="r">Compliance audits</th><th className="r">Score</th><th className="r">Change</th><th className="r">Open findings</th><th className="r">Departments at risk</th></tr></thead><tbody>${svcs.map(
    (s) => {
      const sh = scoreShade(s.scores[KPI]);
      return html`<tr key=${s.service.id}>
        <td className="primary">${s.service.name}</td>
        <td className="r num muted">${s.audits}</td>
        <td className="r">
          <span
            className="chip num"
            style=${{
              background: sh.bg,
              color: sh.fg,
              borderColor: sh.border,
            }}
            >${s.scores[KPI].toFixed(1)}</span
          >
        </td>
        <td className="r"><${Delta} value=${s.delta} /></td>
        <td className="r num">${fmt(s.openFindings)}</td>
        <td className="r num">${s.deptsAtRisk}</td>
      </tr>`;
    },
  )}</tbody></table></${Card}><${Card} title="Attention required audits" sub="Ranked by share of the department estate failing the policy" right=${html`<span className="chip solid num">${attention.length}</span>`} flush><div className="attn-list">${ranked.map(
    (a, i) =>
      html`<div className="attn-row" key=${a.audit.id}>
        <span className="attn-rank">${String(i + 1).padStart(2, '0')}</span>
        <div>
          <div className="attn-title">${a.audit.name}</div>
          <div className="attn-meta">
            <span>${a.audit.code}</span><span>·</span
            ><${SeverityChip} level=${auditSeverity(a, depts.length)} />
          </div>
          <div className="attn-meta">
            <span className="num"
              >${a.deptsBelow} of ${depts.length} depts below ${RISK_THRESHOLD}</span
            ><span>·</span><span className="num">${fmt(a.openFindings)} findings</span>
          </div>
        </div>
        <div className="attn-score">
          <b className="num">${a.score.toFixed(1)}</b>
          <div><${Delta} value=${a.delta} /></div>
        </div>
      </div>`,
  )}</div></${Card}></div><${Card} title=${`Health of all compliance audits · ${audits.length}`} sub="Weakest first — score, trend, coverage and department spread for every policy audit" flush><div className="tbl-wrap"><table className="tbl nw"><thead><tr><th>Code</th><th>Audit</th><th>Service</th><th>Cadence</th><th className="r">Weight</th><th className="r">Score</th><th className="r">Change</th><th style=${{
    width: 110,
  }}>Trend</th><th className="r">Coverage</th><th className="r">${'Depts < 80'}</th><th className="r">Open findings</th><th className="r">Status</th></tr></thead><tbody>${audits.map(
    (a) => {
      const sh = scoreShade(a.score);
      return html`<tr key=${a.audit.id}>
        <td className="mono muted">${a.audit.code}</td>
        <td className="primary">${a.audit.name}</td>
        <td className="muted">${serviceLabel(a.audit.serviceIds)}</td>
        <td className="muted">${a.audit.cadence}</td>
        <td className="r num muted">×${a.audit.weight}</td>
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
        <td className="r num">${a.coverage}%</td>
        <td className="r num">${a.deptsBelow}</td>
        <td className="r num">${fmt(a.openFindings)}</td>
        <td className="r"><${SeverityChip} level=${auditSeverity(a, depts.length)} /></td>
      </tr>`;
    },
  )}</tbody></table></div></${Card}><div className="grid g21"><${Card} title="Department overview · weakest 15" sub="Compliance score per department — click a row for the department detail" flush><div className="tbl-wrap"><table className="tbl nw"><thead><tr><th>Department</th><th>Owner</th><th>Region</th><th className="r">Compliance</th><th className="r">Change</th><th className="r">Failed audits</th><th className="r">Open findings</th><th>Weakest audit</th></tr></thead><tbody>${depts
    .slice(0, 15)
    .map((d) => {
      const sh = scoreShade(d.overall);
      return html`<tr
        key=${d.dept.id}
        onClick=${() => setOpenDept(d)}
        style=${{
          cursor: 'pointer',
        }}
      >
        <td className="primary">${d.dept.name}</td>
        <td className="muted">${d.dept.owner}</td>
        <td className="muted">${d.dept.region}</td>
        <td className="r">
          <span
            className="chip num"
            style=${{
              background: sh.bg,
              color: sh.fg,
              borderColor: sh.border,
            }}
            >${d.overall.toFixed(1)}</span
          >
        </td>
        <td className="r"><${Delta} value=${d.delta} /></td>
        <td className="r num">${d.failedAudits}/${d.auditsInScope}</td>
        <td className="r num">${fmt(d.openFindings)}</td>
        <td className="muted">${d.worstAudit}</td>
      </tr>`;
    })}</tbody></table></div></${Card}><div style=${{
    display: 'grid',
    gap: 16,
    alignContent: 'start',
  }}><${Card} title="Compliance bands" sub="Departments per compliance score band"><div style=${{
    height: 190,
  }}><${ResponsiveContainer} width="100%" height="100%"><${BarChart} data=${dist} margin=${{
    top: 6,
    right: 8,
    bottom: 0,
    left: -22,
  }}><${CartesianGrid} stroke="#ebebeb" vertical=${false}/><${XAxis} dataKey="band" tickLine=${false} axisLine=${{
    stroke: '#e0e0e0',
  }}/><${YAxis} tickLine=${false} axisLine=${false}/><${Tooltip} content=${html`<${Tip} />`}/><${Bar} dataKey="count" name="Departments" radius=${[3, 3, 0, 0]}>${dist.map((d, i) => html`<${Cell} key=${d.band} fill=${['#111111', '#3d3d3d', '#a3a3a3', '#cfcfcf', '#e3e3e3'][i]} />`)}</${Bar}></${BarChart}></${ResponsiveContainer}></div><dl className="kv" style=${{
    marginTop: 12,
  }}><dt>Departments above target</dt><dd className="num">${depts.filter((d) => d.overall >= target).length}</dd><dt>Departments below 80</dt><dd className="num">${deptsAtRisk}</dd><dt>Bottom decile score</dt><dd className="num">${depts.length ? depts[Math.max(0, Math.floor(depts.length * 0.1) - 1)].overall.toFixed(1) : '—'}</dd></dl></${Card}><${Card} title="Audit score ranking" sub="Darker bars are further below target"><div style=${{
    height: 200,
  }}><${ResponsiveContainer} width="100%" height="100%"><${BarChart} data=${auditChart} margin=${{
    top: 6,
    right: 8,
    bottom: 0,
    left: -22,
  }}><${CartesianGrid} stroke="#ebebeb" vertical=${false}/><${XAxis} dataKey="code" tickLine=${false} axisLine=${{
    stroke: '#e0e0e0',
  }} interval=${0}/><${YAxis} domain=${[70, 100]} tickLine=${false} axisLine=${false}/><${Tooltip} content=${html`<${Tip} />`}/><${ReferenceLine} y=${target} stroke="#a3a3a3" strokeDasharray="3 3"/><${Bar} dataKey="score" name="Score" radius=${[3, 3, 0, 0]}>${auditChart.map((c) => html`<${Cell} key=${c.code} fill=${shadeHex(c.score)} />`)}</${Bar}></${BarChart}></${ResponsiveContainer}></div></${Card}></div></div>${
    openDept &&
    html`<div className="drawer-back" onClick=${() => setOpenDept(null)}>
      <aside className="drawer" onClick=${(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <div>
            <p className="eyebrow">${openDept.dept.unit} · ${openDept.dept.region}</p>
            <h3>${openDept.dept.name}</h3>
          </div>
          <button className="close" onClick=${() => setOpenDept(null)}>✕</button>
        </div>
        <dl className="kv">
          <dt>Compliance score</dt>
          <dd className="num">${openDept.overall.toFixed(1)}%</dd>
          <dt>Change in window</dt>
          <dd><${Delta} value=${openDept.delta} /></dd>
          <dt>Gap to target</dt>
          <dd className="num">${(openDept.overall - target).toFixed(1)}pt</dd>
          <dt>Failed audits</dt>
          <dd className="num">${openDept.failedAudits} of ${openDept.auditsInScope}</dd>
          <dt>Open findings</dt>
          <dd className="num">${fmt(openDept.openFindings)}</dd>
          <dt>Weakest audit</dt>
          <dd>${openDept.worstAudit}</dd>
          <dt>Department owner</dt>
          <dd>${openDept.dept.owner}</dd>
          <dt>CIs in scope</dt>
          <dd className="num">${fmt(openDept.dept.ciCount)}</dd>
        </dl>
        <div
          style=${{
            display: 'flex',
            gap: 8,
          }}
        >
          <button className="filter-btn on">Request attestation</button
          ><button className="filter-btn">Add to release</button>
        </div>
      </aside>
    </div>`
  }</${Fragment}>`;
}
function shadeHex(score) {
  if (score < 70) return '#111111';
  if (score < 80) return '#3d3d3d';
  if (score < 88) return '#7a7a7a';
  if (score < 94) return '#cfcfcf';
  return '#e3e3e3';
}
