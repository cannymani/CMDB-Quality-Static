import { html } from 'htm/react';
import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  RISK_THRESHOLD,
  TARGETS,
  auditTrends,
  deptTrends,
  distribution,
  serviceDrill,
  trendInsights,
} from '../data/select.js';
import { Delta, fmt, Tip } from '../ui.js';

/** Same trend palette as the compliance home charts. */
const LINE_SHADES = [
  '#003c6b',
  '#2e5597',
  '#008dfc',
  '#7ab1f0',
  '#8d8d8d',
  '#2e5750',
  '#48887a',
  '#75d4c5',
  '#89b44e',
  '#003c6b',
];
const dashFor = (i) => (i >= 9 ? '5 3' : undefined);
const Y_TICKS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const TREND_LIMIT = 10;
const SORTS = [
  {
    id: 'score-asc',
    label: 'Sort by Score — lowest first',
  },
  {
    id: 'score-desc',
    label: 'Sort by Score — highest first',
  },
  {
    id: 'failing',
    label: 'Sort by Failing audits',
  },
  {
    id: 'name',
    label: 'Sort by Department',
  },
];
const PAGE_SIZES = [10, 25, 50];
export function ServiceDrill({ rows, duration, kpi, serviceId, onAudit, onBack }) {
  const target = TARGETS[kpi];
  const data = useMemo(
    () => serviceDrill(rows, duration, kpi, serviceId),
    [rows, duration, kpi, serviceId],
  );
  const [view, setView] = useState('report');
  const [sort, setSort] = useState('score-asc');
  const [size, setSize] = useState(10);
  const [page, setPage] = useState(0);
  const [deptSort, setDeptSort] = useState('asc');
  const [hidden, setHidden] = useState([]);
  const serviceRowsForKpi = useMemo(
    () => rows.filter((r) => r.serviceId === serviceId),
    [rows, serviceId],
  );
  const insights = useMemo(
    () => trendInsights(data.audits, data.depts, kpi),
    [data.audits, data.depts, kpi],
  );
  const auditTrend = useMemo(() => auditTrends(data.audits, TREND_LIMIT), [data.audits]);
  const trends = useMemo(
    () =>
      deptTrends(
        serviceRowsForKpi,
        duration,
        kpi,
        TREND_LIMIT,
        deptSort === 'desc' ? 'best' : 'worst',
      ),
    [serviceRowsForKpi, duration, kpi, deptSort],
  );
  const overallSeries = useMemo(() => {
    const months = data.audits[0]?.series.map((p) => p.month) ?? [];
    return months.map((month, i) => ({
      month,
      score: Number(
        (
          data.audits.reduce((a, r) => a + r.series[i].value, 0) / (data.audits.length || 1)
        ).toFixed(1),
      ),
    }));
  }, [data.audits]);
  const bands = useMemo(() => distribution(data.depts), [data.depts]);
  const toggle = (k) =>
    setHidden(hidden.includes(k) ? hidden.filter((h) => h !== k) : [...hidden, k]);
  const sorted = useMemo(() => {
    const list = [...data.depts];
    if (sort === 'score-asc') list.sort((a, b) => a.overall - b.overall);
    if (sort === 'score-desc') list.sort((a, b) => b.overall - a.overall);
    if (sort === 'failing') list.sort((a, b) => b.failedAudits - a.failedAudits);
    if (sort === 'name') list.sort((a, b) => a.dept.name.localeCompare(b.dept.name));
    return list;
  }, [data.depts, sort]);
  const auditsSorted = useMemo(
    () => [...data.audits].sort((a, b) => a.score - b.score),
    [data.audits],
  );
  const pages = Math.max(1, Math.ceil(sorted.length / size));
  const current = Math.min(page, pages - 1);
  const from = current * size;
  const visible = sorted.slice(from, from + size);
  return html`<div className="drill">
    <div className="drill-top">
      <button className="link-btn back" onClick=${onBack}>← Back</button>
      <div className="drill-views" role="tablist">
        <div className="seg">
          <button
            role="tab"
            aria-selected=${view === 'report'}
            className=${view === 'report' ? 'on' : ''}
            onClick=${() => setView('report')}
          >
            Report</button
          ><button
            role="tab"
            aria-selected=${view === 'analytics'}
            className=${view === 'analytics' ? 'on' : ''}
            onClick=${() => setView('analytics')}
          >
            Analytics
          </button>
        </div>
      </div>
    </div>
    <header className="page-head">
      <h1 className="page-title">
        ${view === 'analytics' ? 'Service Analytics' : 'Service Overview'} – ${data.service.name}
      </h1>
      <p className="page-sub">
        ${data.audits.length} audits · ${data.depts.length} departments · owner${' '}
        ${data.service.owner} · target ${target}%
      </p>
    </header>
    ${
      view === 'analytics' &&
      html`<section className="card"><div className="card-head"><div><h2 className="card-title">${data.service.name} — Analytics Report</h2><p className="card-sub">${insights.cycles} cycles: ${overallSeries[0]?.month} →  ${overallSeries[overallSeries.length - 1]?.month} · ${data.audits.length} audits · ${data.depts.length} departments</p></div></div><div className="card-body"><div className="tiles"><div className="tile"><span className="lbl">Avg audit change</span><b className="num">${insights.avgAuditChange >= 0 ? '+' : ''}${insights.avgAuditChange.toFixed(1)}pt</b><span className="tile-foot">Across ${data.audits.length} audits</span></div><div className="tile"><span className="lbl">Most improved audit</span><b>${insights.mostImproved?.audit.name ?? '—'}</b><span className="tile-foot num">${insights.mostImproved ? `${insights.mostImproved.delta >= 0 ? '+' : ''}${insights.mostImproved.delta.toFixed(1)}pt` : '—'}</span></div><div className="tile"><span className="lbl">Most critical audit</span><b>${insights.mostCritical?.audit.name ?? '—'}</b><span className="tile-foot num">${insights.mostCritical ? `${insights.mostCritical.score.toFixed(1)}%` : '—'}</span></div><div className="tile"><span className="lbl">Audits on target</span><b className="num">${insights.passedAudits}/${data.audits.length}</b><span className="tile-foot">Target ${target}%</span></div></div><div className="chart-head"><p className="chart-title">${data.service.name} compliance over time</p><span className="chart-note num">now ${data.score.toFixed(1)}% · <${Delta} value=${data.monthDelta}/></span></div><div style=${{
        height: 240,
      }}><${ResponsiveContainer} width="100%" height="100%"><${LineChart} data=${overallSeries} margin=${{
        top: 8,
        right: 12,
        bottom: 0,
        left: -18,
      }}><${CartesianGrid} stroke="var(--ink-100)" vertical=${false}/><${XAxis} dataKey="month" tickLine=${false} axisLine=${false} fontSize=${11}/><${YAxis} domain=${[0, 100]} ticks=${Y_TICKS} tickFormatter=${(v) => `${v}%`} tickLine=${false} axisLine=${false} fontSize=${11}/><${Tooltip} content=${html`<${Tip} />`}/><${ReferenceLine} y=${target} stroke="var(--chart-axis)" strokeDasharray="4 4" label=${{
        value: `target ${target}%`,
        position: 'insideTopLeft',
        fontSize: 10,
      }}/><${Line} type="monotone" dataKey="score" stroke=${LINE_SHADES[2]} strokeWidth=${2.2} dot=${false} isAnimationActive=${false}/></${LineChart}></${ResponsiveContainer}></div><div className="chart-head"><p className="chart-title">Top ${auditTrend.audits.length} audit performance</p></div><div style=${{
        height: 280,
      }}><${ResponsiveContainer} width="100%" height="100%"><${LineChart} data=${auditTrend.series} margin=${{
        top: 8,
        right: 12,
        bottom: 0,
        left: -18,
      }}><${CartesianGrid} stroke="var(--ink-100)" vertical=${false}/><${XAxis} dataKey="month" tickLine=${false} axisLine=${false} fontSize=${11}/><${YAxis} domain=${[0, 100]} ticks=${Y_TICKS} tickFormatter=${(v) => `${v}%`} tickLine=${false} axisLine=${false} fontSize=${11}/><${Tooltip} content=${html`<${Tip} />`}/><${ReferenceLine} y=${target} stroke="var(--chart-axis)" strokeDasharray="4 4"/>${auditTrend.audits.map((a, i) => html`<${Line} key=${a.key} type="monotone" dataKey=${a.key} stroke=${LINE_SHADES[i % LINE_SHADES.length]} strokeDasharray=${dashFor(i)} strokeWidth=${1.8} dot=${false} hide=${hidden.includes(a.key)} isAnimationActive=${false} />`)}</${LineChart}></${ResponsiveContainer}></div><div className="chart-foot">${auditTrend.audits.map(
        (a, i) =>
          html`<label
            key=${a.key}
            className=${`legend-check ${hidden.includes(a.key) ? 'off' : ''}`}
            title=${`${a.audit.name} · ${a.score.toFixed(1)}%`}
            ><input
              type="checkbox"
              checked=${!hidden.includes(a.key)}
              onChange=${() => toggle(a.key)}
            /><i
              style=${{
                background: LINE_SHADES[i % LINE_SHADES.length],
              }}
            />${a.audit.name}</label
          >`,
      )}</div><div className="chart-head"><p className="chart-title">Top 10 Department compliance over time</p><div className="seg sm"><button className=${deptSort === 'desc' ? 'on' : ''} onClick=${() => setDeptSort('desc')} title="Highest compliance first">↓ Descending</button><button className=${deptSort === 'asc' ? 'on' : ''} onClick=${() => setDeptSort('asc')} title="Lowest compliance first">↑ Ascending</button></div></div><div style=${{
        height: 280,
      }}><${ResponsiveContainer} width="100%" height="100%"><${LineChart} data=${trends.series} margin=${{
        top: 8,
        right: 12,
        bottom: 0,
        left: -18,
      }}><${CartesianGrid} stroke="var(--ink-100)" vertical=${false}/><${XAxis} dataKey="month" tickLine=${false} axisLine=${false} fontSize=${11}/><${YAxis} domain=${[0, 100]} ticks=${Y_TICKS} tickFormatter=${(v) => `${v}%`} tickLine=${false} axisLine=${false} fontSize=${11}/><${Tooltip} content=${html`<${Tip} />`}/><${ReferenceLine} y=${target} stroke="var(--chart-axis)" strokeDasharray="4 4"/>${trends.depts.map((d, i) => html`<${Line} key=${d.key} type="monotone" dataKey=${d.key} stroke=${LINE_SHADES[i % LINE_SHADES.length]} strokeDasharray=${dashFor(i)} strokeWidth=${1.8} dot=${false} hide=${hidden.includes(d.key)} isAnimationActive=${false} />`)}</${LineChart}></${ResponsiveContainer}></div><div className="chart-foot">${trends.depts.map(
        (d, i) =>
          html`<label
            key=${d.key}
            className=${`legend-check ${hidden.includes(d.key) ? 'off' : ''}`}
            title=${`${d.dept.name} · ${d.score.toFixed(1)}%`}
            ><input
              type="checkbox"
              checked=${!hidden.includes(d.key)}
              onChange=${() => toggle(d.key)}
            /><i
              style=${{
                background: LINE_SHADES[i % LINE_SHADES.length],
              }}
            />${d.key}</label
          >`,
      )}</div><div className="chart-head"><p className="chart-title">Department score distribution</p><span className="chart-note num">${data.deptsAtRisk} of ${data.depts.length} need attention</span></div><div style=${{
        height: 220,
      }}><${ResponsiveContainer} width="100%" height="100%"><${BarChart} data=${bands} margin=${{
        top: 8,
        right: 12,
        bottom: 0,
        left: -18,
      }}><${CartesianGrid} stroke="var(--ink-100)" vertical=${false}/><${XAxis} dataKey="band" tickLine=${false} axisLine=${false} fontSize=${11}/><${YAxis} tickLine=${false} axisLine=${false} fontSize=${11}/><${Tooltip} content=${html`<${Tip} />`}/><${Bar} dataKey="count" fill=${LINE_SHADES[0]} radius=${[4, 4, 0, 0]} maxBarSize=${64}/></${BarChart}></${ResponsiveContainer}></div></div></section>`
    }
    <div className="drill-body" hidden=${view !== 'report'}>
      <div className="rail">
        <section className="total-card">
          <p className="total-lbl">Total ${data.service.name}</p>
          <span className="total-figure num">${fmt(data.ciChecked)}</span>
          <p className="total-new num">${fmt(data.newFindings)} New from last month</p>
          <div className="total-split">
            <span
              ><i className="lbl">Non-compliant</i
              ><b className="num">${fmt(data.nonCompliantCis)}</b></span
            ><span
              ><i className="lbl">Compliant</i
              ><b className="num">${fmt(data.compliantCis)}</b></span
            >
          </div>
        </section>
        <section className="attn">
          <header className="attn-head">
            <span className="attn-title">⚠ Attention Required</span>
          </header>
          <div className="attn-mini-stack">
            <article className="attn-mini">
              <span className="attn-mini-name">Compliance Audit</span
              ><span className="attn-mini-figure num">${data.auditsBelowTarget}</span
              ><span className="attn-mini-foot num"
                >out of ${data.audits.length} need Attention</span
              >
            </article>
            <article className="attn-mini">
              <span className="attn-mini-name">Department at Risk</span
              ><span className="attn-mini-figure num"
                >${data.deptsAtRisk}<small>/${data.depts.length}</small></span
              ><span className="attn-mini-foot"
                >Missing audit fulfilments (3+ audits below ${RISK_THRESHOLD}%)</span
              >
            </article>
          </div>
        </section>
      </div>
      <div className="rail">
        <section className="health">
          <header className="health-head">
            <span className=${`health-badge num ${data.score >= target ? 'ok' : 'bad'}`}
              >${data.score.toFixed(0)}%</span
            >
            <div>
              <h2>Overall Health</h2>
              <p className=${data.monthDelta >= 0 ? 'accent-ink' : 'bad'}>
                ${data.monthDelta >= 0 ? '+' : ''}${data.monthDelta.toFixed(1)}% from last month
              </p>
            </div>
            <span className="health-scope"
              >${data.audits.length} audits in scope · ${data.auditsBelowTarget} below the
              ${' '}${target}% target</span
            >
          </header>
          <div className="health-tiles">
            ${auditsSorted.map(
              (a) =>
                html`<article
                  className="health-tile wide clickable"
                  key=${a.audit.id}
                  role="button"
                  tabIndex=${0}
                  title=${`Open ${a.audit.name} drill-down`}
                  onClick=${() => onAudit(a.audit.id)}
                  onKeyDown=${(e) => {
                    if (e.key === 'Enter' || e.key === ' ') onAudit(a.audit.id);
                  }}
                >
                  <div className="health-tile-head">
                    <span className="health-tile-name">${a.audit.name}</span
                    ><span className="card-open" aria-hidden>→</span>
                  </div>
                  <div className="health-tile-top">
                    <span className=${`health-tile-figure num ${a.score < target ? 'bad' : 'good'}`}
                      >${a.score.toFixed(1)}%</span
                    ><${Delta} value=${a.delta} />
                  </div>
                  <dl className="health-tile-list">
                    <div>
                      <dt>Non-compliant</dt>
                      <dd className="num">${a.nonCompliantPct.toFixed(1)}%</dd>
                    </div>
                    <div>
                      <dt>Open findings</dt>
                      <dd className="num">${fmt(a.openFindings)}</dd>
                    </div>
                    <div>
                      <dt>Depts below ${RISK_THRESHOLD}%</dt>
                      <dd className="num">${a.deptsBelow}/${data.depts.length}</dd>
                    </div>
                  </dl>
                </article>`,
            )}
          </div>
        </section>
        <section className="card">
          <div className="card-head">
            <div>
              <h2 className="card-title">Service Compliance Score Board</h2>
              <p className="card-sub">
                ${data.service.name} · ${data.depts.length} departments in scope · target ${target}%
              </p>
            </div>
            <label className="viewsel"
              ><span>↓</span
              ><select value=${sort} onChange=${(e) => setSort(e.target.value)}>
                ${SORTS.map((s) => html`<option key=${s.id} value=${s.id}>${s.label}</option>`)}
              </select></label
            >
          </div>
          <div className="card-body flush">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Department</th>
                  <th className="r">Score</th>
                  <th className="r">Failing</th>
                  <th>Owner</th>
                  <th>Top Issue</th>
                  <th className="r">Trend</th>
                </tr>
              </thead>
              <tbody>
                ${visible.map(
                  (d) =>
                    html`<tr key=${d.dept.id}>
                      <td className="primary">${d.dept.name}</td>
                      <td
                        className=${`r num ${d.overall < RISK_THRESHOLD ? 'bad' : d.overall >= target ? 'good' : ''}`}
                      >
                        ${d.overall.toFixed(1)}%
                      </td>
                      <td className="r num">${d.failedAudits}/${d.auditsInScope}</td>
                      <td className="muted">${d.dept.owner}</td>
                      <td className="muted">${d.worstAudit}</td>
                      <td className="r"><${Delta} value=${d.delta} /></td>
                    </tr>`,
                )}
              </tbody>
            </table>
            <div className="pager">
              <label
                >Rows per page:<select
                  value=${size}
                  onChange=${(e) => {
                    setSize(Number(e.target.value));
                    setPage(0);
                  }}
                >
                  ${PAGE_SIZES.map((n) => html`<option key=${n} value=${n}>${n}</option>`)}
                </select></label
              ><span className="num"
                >${sorted.length === 0 ? 0 : from + 1}-${Math.min(from + size, sorted.length)} of${' '}
                ${sorted.length}</span
              >
              <div className="pager-nav">
                <button
                  onClick=${() => setPage(Math.max(0, current - 1))}
                  disabled=${current === 0}
                  aria-label="Previous page"
                >
                  ‹</button
                ><button
                  onClick=${() => setPage(Math.min(pages - 1, current + 1))}
                  disabled=${current >= pages - 1}
                  aria-label="Next page"
                >
                  ›
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>`;
}
