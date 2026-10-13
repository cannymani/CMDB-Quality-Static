import { html } from 'htm/react';
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
import { useMemo } from 'react';
import {
  COMPLETENESS_TARGET,
  attributeCompleteness,
  attributeGaps,
  categoryViews,
  classesBelowTarget,
  completenessOverall,
  departmentImpact,
  departmentSummary,
  enterpriseInsights,
  pillarInsights,
  pillarViews,
} from '../data/completeness.js';
import { DEPARTMENTS } from '../data/demo.js';
import { Delta, Tip, fmt } from '../ui.js';

const TOP_N = 3;
const PILLAR_BLURB = {
  'pil-dc': 'Servers, databases, middleware, cloud and storage CI quality',
  'pil-network': 'Network device and connectivity CI quality',
  'pil-workplace': 'End-user device and workplace service CI quality',
};

const pct = (value) => `${value.toFixed(1)}%`;
const floorFor = (values) =>
  Math.max(0, Math.floor((Math.min(COMPLETENESS_TARGET, ...values) - 1) / 5) * 5);

export function StatusChip({ status }) {
  const cls = status === 'Improving' ? 'ok' : status === 'Declining' ? 'bad' : 'flat';
  return html`<span className=${`ov-status ${cls}`}>${status}</span>`;
}

function Expand({ label, onClick }) {
  return html`<button type="button" className="card-open ov-expand" aria-label=${label} title=${label} onClick=${onClick}>⤢</button>`;
}

function TargetMeter({ value, max = 100, bad = false }) {
  const width = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return html`<div className="ov-meter">
    <div className="meter"><i className=${bad ? 'bad' : 'ok'} style=${{ width: `${width}%` }}></i></div>
  </div>`;
}

function CountTip({ active, payload, label, unit = 'CIs missing' }) {
  if (!active || !payload?.length) return null;
  return html`<div className="tip"><b>${payload[0].payload.label ?? label}</b><div className="num">${fmt(payload[0].value)} ${unit}</div></div>`;
}

function Trend({ series, height = 180, name = 'Completeness' }) {
  const floor = floorFor(series.map((point) => point.value));
  return html`<div className="ov-trend" style=${{ height }}>
    <${ResponsiveContainer} width="100%" height="100%">
      <${LineChart} data=${series} margin=${{ top: 8, right: 12, bottom: 0, left: -18 }}>
        <${CartesianGrid} stroke="var(--ink-100)" vertical=${false} />
        <${XAxis} dataKey="month" tickLine=${false} axisLine=${false} fontSize=${10} />
        <${YAxis} domain=${[floor, 100]} allowDecimals=${false} tickCount=${5} tickFormatter=${(v) => `${v}%`} tickLine=${false} axisLine=${false} fontSize=${10} />
        <${Tooltip} content=${html`<${Tip} />`} />
        <${ReferenceLine} y=${COMPLETENESS_TARGET} stroke="var(--chart-axis)" strokeDasharray="4 4"
          label=${{ value: `target ${COMPLETENESS_TARGET}%`, position: 'insideTopLeft', fontSize: 10 }} />
        <${Line} type="monotone" dataKey="value" name=${name} stroke="var(--accent)" strokeWidth=${2} dot=${{ r: 2 }} isAnimationActive=${false} />
      </${LineChart}>
    </${ResponsiveContainer}>
  </div>`;
}

const NUMBER_RE = /(\d[\d,]*(?:\.\d+)?%?(?: CIs)?)/;

function Rich({ text }) {
  if (!text) return null;
  return text.split(NUMBER_RE).map((part, index) => (index % 2 ? html`<span key=${index} className="ov-em">${part}</span>` : part));
}

const INSIGHT_ICON = {
  'high-impact-classes': 'M8 2v6l4 2M8 14A6 6 0 1 1 8 2a6 6 0 0 1 0 12',
  'top-attribute': 'M6 13h4M6.5 10.5h3M8 2a4 4 0 0 0-2.2 7.3V10.5h4.4V9.3A4 4 0 0 0 8 2',
  'department-impact': 'M8 8V2a6 6 0 1 1-6 6h6',
};

export function InsightCard({ item, onTarget }) {
  if (!item) return null;
  const sev = item.severity?.toLowerCase() ?? 'low';
  return html`<div className=${`ov-insight ov-sev-${sev}`}>
    <div className="ov-insight-head">
      <svg className="ov-insight-icon" viewBox="0 0 16 16" aria-hidden="true"><path d=${INSIGHT_ICON[item.id] ?? 'M8 5v4M8 11v.5M8 14A6 6 0 1 1 8 2a6 6 0 0 1 0 12'}></path></svg>
      <span className="ov-insight-title">${item.title}</span>
      ${item.severity && html`<span className=${`ov-sev ${sev}`}>${item.severity}</span>`}
    </div>
    ${(item.evidence || item.impact) &&
    html`<p className="ov-insight-ev"><${Rich} text=${item.evidence} />${item.evidence && item.impact ? ' ' : ''}<${Rich} text=${item.impact} /></p>`}
    ${item.action &&
    html`<div className="ov-insight-foot"><span>→ ${item.action}</span>
      ${item.target && html`<button type="button" className="link-btn ov-open" onClick=${() => onTarget(item.target)}>Open</button>`}</div>`}
    ${item.demo && html`<p className="ov-demo">Department split is a demo allocation, not CMDB ownership data.</p>`}
  </div>`;
}

function GapCard({ item, view, onTarget }) {
  if (!item) return null;
  const sev = item.severity?.toLowerCase() ?? 'low';
  const below = view.score < COMPLETENESS_TARGET;
  return html`<div className=${`ov-gapcard ov-sev-${sev}`}>
    <div className="ov-gapcard-head">
      <span className="ov-gapcard-icon" aria-hidden="true">!</span>
      <span className="ov-gapcard-title">${item.title}</span>
      ${item.severity && html`<span className=${`ov-sev ${sev}`}>${item.severity}</span>`}
      ${view.cisToTarget > 0 && html`<span className="ov-gappill num">Gap: ${fmt(view.cisToTarget)} CIs</span>`}
    </div>
    <p className="ov-insight-ev"><${Rich} text=${item.evidence} />${item.impact ? ' ' : ''}<${Rich} text=${item.impact} /></p>
    <div className="ov-gapbar">
      <div className="ov-gapbar-legend">
        <span><i className=${`ov-dot ${below ? 'bad' : 'ok'}`}></i>Current Completeness: <span className="num ov-em">${pct(view.score)}</span></span>
        <span><i className="ov-dot target"></i>Target SLA: <span className="num ov-em">${COMPLETENESS_TARGET.toFixed(1)}%</span></span>
      </div>
      <div className="ov-gapbar-track" role="img" aria-label=${`${pct(view.score)} of ${COMPLETENESS_TARGET}% target`}>
        <i className=${below ? 'bad' : 'ok'} style=${{ width: `${Math.min(100, view.score)}%` }}></i>
        <span className="ov-gapbar-target" style=${{ left: `${COMPLETENESS_TARGET}%` }}></span>
      </div>
      <div className="ov-gapbar-axis num"><span>0%</span><span>Target ${COMPLETENESS_TARGET}%</span><span>100%</span></div>
    </div>
    ${item.action &&
    html`<div className="ov-insight-foot"><span>→ ${item.action}</span>
      ${item.target && html`<button type="button" className="link-btn ov-open" onClick=${() => onTarget(item.target)}>Open →</button>`}</div>`}
  </div>`;
}

function ListCard({ title, hint, aside, onAside, rows, empty }) {
  return html`<div className="ov-listcard">
    <div className="ov-list-head">
      <p className="ov-list-title">${title}${hint && html` <span className="ov-list-hint">${hint}</span>`}</p>
      ${onAside
        ? html`<button type="button" className="link-btn ov-list-aside" onClick=${onAside}>${aside}</button>`
        : aside && html`<span className="ov-list-aside">${aside}</span>`}
    </div>
    ${rows.length
      ? html`<ul className="ov-list">
          ${rows.map(
            (row) => html`<li key=${row.key}>
              <button type="button" className="ov-list-row" title=${row.title} onClick=${row.onClick}>
                <span className="ov-list-main">
                  <span className="ov-list-name">${row.name}</span>
                  ${row.bar != null && html`<span className="meter thin ov-list-bar"><i className=${row.bar < COMPLETENESS_TARGET ? 'bad' : 'ok'} style=${{ width: `${row.bar}%` }}></i></span>`}
                  ${row.sub && html`<span className="ov-list-sub">${row.sub}</span>`}
                </span>
                <span className="ov-list-figs">
                  <span className="num ov-list-val">${row.value}</span>
                  ${row.note && html`<span className="ov-list-sub num">${row.note}</span>`}
                </span>
                <span className="ov-list-chev" aria-hidden="true">›</span>
              </button>
            </li>`,
          )}
        </ul>`
      : html`<p className="muted ov-empty">${empty}</p>`}
  </div>`;
}

function OverallCard({ overall, depts, classes, onIncomplete }) {
  const bad = overall.score < COMPLETENESS_TARGET;
  return html`<section className="overall ov-card" aria-label="Overall completeness">
    <div className="ov-card-head">
      <p className="overall-lbl">Overall Completeness</p>
      <span className=${`overall-band ${overall.delta >= 0 ? 'ok' : 'bad'}`}>${overall.delta > 0 ? '+' : ''}${overall.delta.toFixed(1)} pts</span>
    </div>
    <div className="overall-figure"><span className="num">${pct(overall.score)}</span></div>
    <${TargetMeter} value=${overall.score} bad=${bad} />
    <p className="overall-delta">Target <b className="num">${COMPLETENESS_TARGET}%</b> · gap <b className="num">${overall.targetGap.toFixed(1)} pts</b></p>
    <dl className="overall-facts">
      <div><dt>Incomplete CIs</dt><dd className="num bad">${fmt(overall.incompleteCis)}</dd></div>
      <div><dt>Complete CIs</dt><dd className="num">${fmt(overall.completeCis)}</dd></div>
      <div><dt>Depts below ${COMPLETENESS_TARGET}%</dt><dd className="num">${depts.below}/${depts.total}</dd></div>
      <div><dt>Classes on target</dt><dd className="num">${classes.total - classes.below}/${classes.total}</dd></div>
    </dl>
    <button type="button" className="link-btn ov-card-link" onClick=${onIncomplete} title="Opens the category with the most incomplete CIs; CI-level records are not available">View incomplete CIs →</button>
  </section>`;
}

function AttributeCard({ attr, onAttribute }) {
  const top = attr.topAttributes.slice(0, 5).map((row) => ({ ...row, label: row.attribute }));
  const below = attr.score < COMPLETENESS_TARGET;
  return html`<section className="panel ov-card" aria-label="Attribute completeness">
    <div className="ov-card-head">
      <span className="ov-card-title">Attribute Completeness</span>
      ${top[0] && html`<${Expand} label=${`Open ${top[0].attribute} drill-down`} onClick=${() => onAttribute(top[0].pillarId, top[0].attribute)} />`}
    </div>
    <div className="ov-figure"><span className="num">${pct(attr.score)}</span><span className="ov-figure-note bad">${attr.missingPct.toFixed(1)}% of required values missing</span></div>
    <${TargetMeter} value=${attr.score} bad=${below} />
    <p className="ov-card-sub">${below ? `${attr.targetGap.toFixed(1)} pts below target` : `At or above the ${COMPLETENESS_TARGET}% target`} · ${fmt(attr.missingValues)} of ${fmt(attr.requiredValues)} values</p>
    <p className="ov-chart-title">Most frequently missing attributes</p>
    ${top.length
      ? html`<div className="ov-mini" style=${{ height: top.length * 26 + 24 }}>
          <${ResponsiveContainer} width="100%" height="100%">
            <${BarChart} data=${top} layout="vertical" margin=${{ top: 0, right: 8, bottom: 0, left: 0 }}>
              <${XAxis} type="number" tickLine=${false} axisLine=${false} fontSize=${10} tickFormatter=${fmt} />
              <${YAxis} type="category" dataKey="label" width=${96} tickLine=${false} axisLine=${false} fontSize=${10} interval=${0} />
              <${Tooltip} content=${html`<${CountTip} />`} cursor=${{ fill: 'var(--ink-100)' }} />
              <${Bar} dataKey="missingCis" name="CIs missing" fill="var(--accent)" radius=${[0, 3, 3, 0]} barSize=${12}
                isAnimationActive=${false} cursor="pointer"
                onClick=${(bar) => { const row = bar?.payload ?? bar; if (row?.attribute) onAttribute(row.pillarId, row.attribute); }} />
            </${BarChart}>
          </${ResponsiveContainer}>
        </div>`
      : html`<p className="muted ov-empty">No missing attributes.</p>`}
  </section>`;
}

function ClassesCard({ classes, onPillar }) {
  const rows = classes.byPillar.filter((row) => row.total > 0).map((row) => ({ ...row, id: row.pillar.id, label: row.pillar.name }));
  const worst = rows.slice().sort((a, b) => b.below - a.below)[0];
  const change = classes.change;
  return html`<section className="panel ov-card" aria-label="Classes below target">
    <div className="ov-card-head">
      <span className="ov-card-title">Classes Below Target</span>
      ${worst && html`<${Expand} label=${`Open ${worst.label}`} onClick=${() => onPillar(worst.id)} />`}
    </div>
    <div className="ov-figure"><span className="num">${classes.below} / ${classes.total}</span>
      <span className=${`ov-figure-note ${change < 0 ? 'good' : change > 0 ? 'bad' : ''}`}>${change === 0 ? 'no change' : `${Math.abs(change)} ${change < 0 ? 'fewer' : 'more'}`} vs period start</span></div>
    <${TargetMeter} value=${classes.below} max=${classes.total} bad=${classes.below > 0} />
    <p className="ov-card-sub">Classes below ${COMPLETENESS_TARGET}%, by category</p>
    <p className="ov-chart-title">Classes below target by category</p>
    <div className="ov-mini" style=${{ height: 130 }}>
      <${ResponsiveContainer} width="100%" height="100%">
        <${BarChart} data=${rows} margin=${{ top: 4, right: 4, bottom: 0, left: -24 }}>
          <${CartesianGrid} stroke="var(--ink-100)" vertical=${false} />
          <${XAxis} dataKey="label" tickLine=${false} axisLine=${false} fontSize=${10} interval=${0} />
          <${YAxis} allowDecimals=${false} tickLine=${false} axisLine=${false} fontSize=${10} />
          <${Tooltip} content=${html`<${CountTip} unit="classes below target" />`} cursor=${{ fill: 'var(--ink-100)' }} />
          <${Bar} dataKey="below" name="Classes below target" fill="var(--accent)" radius=${[3, 3, 0, 0]} barSize=${28}
            isAnimationActive=${false} cursor="pointer"
            onClick=${(bar) => { const id = bar?.payload?.id ?? bar?.id; if (id) onPillar(id); }} />
        </${BarChart}>
      </${ResponsiveContainer}>
    </div>
  </section>`;
}

function DepartmentsCard({ depts, onDepartment }) {
  const lowest = depts.rows.slice().sort((a, b) => a.score - b.score)[0];
  const share = depts.total > 0 ? (depts.below / depts.total) * 100 : 0;
  return html`<section className="panel ov-card" aria-label="Departments below target">
    <div className="ov-card-head">
      <span className="ov-card-title">Departments Below Target</span>
      ${lowest && depts.total > 1 && html`<${Expand} label=${`Focus lowest department: ${lowest.department.name}`} onClick=${() => onDepartment(lowest.department.id)} />`}
    </div>
    <div className="ov-figure"><span className="num">${depts.below} / ${depts.total}</span><span className="ov-figure-note bad">${share.toFixed(0)}% of departments</span></div>
    <${TargetMeter} value=${depts.below} max=${depts.total} bad=${depts.below > 0} />
    <p className="ov-card-sub">Average department completeness ${pct(depts.averageScore)} · <${Delta} value=${depts.averageDelta} /></p>
    <p className="ov-chart-title">Department completeness trend <span className="muted ov-tag">avg · demo allocation</span></p>
    <${Trend} series=${depts.averageSeries} height=${130} name="Avg department completeness" />
  </section>`;
}

function PillarColumn({ view, duration, scope, go, onPillar, onAttribute, onDepartment }) {
  const pid = view.pillar.id;
  const classes = useMemo(
    () => categoryViews(duration, pid, scope).sort((a, b) => a.score - b.score || b.incompleteCis - a.incompleteCis),
    [duration, pid, scope],
  );
  const attrs = useMemo(() => attributeGaps(duration, pid, scope).filter((g) => g.missingCis > 0), [duration, pid, scope]);
  const depts = useMemo(() => departmentImpact(duration, pid, scope), [duration, pid, scope]);
  const insights = useMemo(() => pillarInsights(duration, pid, scope), [duration, pid, scope]);
  const byId = (id) => insights.find((item) => item.id === id);
  const change = view.incompleteChangePct;

  return html`<article className="ov-col" id=${`ov-${pid}`} aria-label=${`${view.pillar.name} completeness`}>
    <div className="ov-col-head">
      <svg className="ov-icon" viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="2" width="12" height="5" rx="1"></rect><rect x="2" y="9" width="12" height="5" rx="1"></rect></svg>
      <button type="button" className="link-btn ov-col-name" onClick=${() => onPillar(pid)}>${view.pillar.name}</button>
      ${view.totalCis > 0 && html`<${StatusChip} status=${view.status} />`}
      <${Expand} label=${`Explore ${view.pillar.name} details`} onClick=${() => onPillar(pid)} />
    </div>
    <p className="ov-col-sub">${PILLAR_BLURB[pid]} · ${view.categories} classes · owner ${view.pillar.owner}</p>
    ${view.totalCis === 0
      ? html`<p className="muted ov-empty">No ${view.pillar.name} CIs in the selected departments.</p>`
      : html`
          <div className="ov-tiles">
            <div className="tile">
              <span className="lbl">Completeness</span>
              <b className="num ov-tile-num">${pct(view.score)}</b>
              <span className="tile-foot">Target gap ${view.targetGap.toFixed(1)} pts · <${Delta} value=${view.delta} /> ${duration}m</span>
            </div>
            <button type="button" className="tile ov-tile-btn" onClick=${() => onPillar(pid)} title=${`Open ${view.pillar.name} classes`}>
              <span className="lbl">Incomplete CIs</span>
              <b className="num ov-tile-num bad">${fmt(view.incompleteCis)}</b>
              <span className=${`tile-foot ${change > 0 ? 'bad' : change < 0 ? 'good' : ''}`}>${change > 0 ? '↑' : change < 0 ? '↓' : ''} ${Math.abs(change).toFixed(1)}% vs previous month</span>
            </button>
          </div>
          <div>
            <p className="ov-chart-title">Completeness trend · last ${duration} months</p>
            <p className="muted ov-chart-sub">Monthly CI-weighted category score (demo snapshots)</p>
            <${Trend} series=${view.series} />
          </div>
          <div className="ov-attn">
            <h3 className="ov-h3">What needs attention?</h3>
            <${GapCard} item=${byId('target-gap')} view=${view} onTarget=${go} />
            <${InsightCard} item=${byId('trend')} onTarget=${go} />
            <${ListCard}
              title="Lowest-performing classes"
              hint=${`(Bottom ${TOP_N} by Completeness %)`}
              aside="View all classes"
              onAside=${() => onPillar(pid)}
              empty="No classes in the selection."
              rows=${classes.slice(0, TOP_N).map((c) => ({
                key: c.category.id,
                name: c.category.name,
                bar: c.score,
                value: pct(c.score),
                note: `${fmt(c.incompleteCis)} incomplete`,
                title: 'Open the class on the pillar page',
                onClick: () => onPillar(pid, c.category.id),
              }))}
            />
            <${InsightCard} item=${byId('high-impact-classes')} onTarget=${go} />
            <${ListCard}
              title="Top missing attributes"
              hint="(Ranked by missing record count)"
              aside="Class coverage"
              empty="No missing attributes."
              rows=${attrs.slice(0, TOP_N).map((g) => ({
                key: g.attribute,
                name: g.attribute,
                sub: `${((g.missingCis / view.totalCis) * 100).toFixed(1)}% of ${view.pillar.name} CIs missing it`,
                value: fmt(g.missingCis),
                note: `${g.categories}/${g.totalCategories} classes`,
                title: 'Open the Attribute drill-down',
                onClick: () => onAttribute(pid, g.attribute),
              }))}
            />
            <${InsightCard} item=${byId('top-attribute')} onTarget=${go} />
            <${ListCard}
              title="Department impact"
              hint=${html`<span className="ov-list-tag">demo allocation</span>`}
              aside="Impact ratio"
              empty="No incomplete CIs by department."
              rows=${depts.totalIncomplete > 0
                ? depts.rows.slice(0, TOP_N).map((d) => ({
                    key: d.department.id,
                    name: d.department.name,
                    sub: `Owner ${d.department.owner} · ${d.department.code}`,
                    value: fmt(d.incompleteCis),
                    note: `${d.share.toFixed(1)}%`,
                    title: 'Filter the dashboard to this department',
                    onClick: () => onDepartment(d.department.id),
                  }))
                : []}
            />
            <${InsightCard} item=${byId('department-impact')} onTarget=${go} />
          </div>
        `}
  </article>`;
}

export function Completeness({ duration, scope = null, filters, onPillar, onAttribute, onDepartment, onClearDepartments }) {
  const overall = useMemo(() => completenessOverall(duration, scope), [duration, scope]);
  const pillars = useMemo(() => pillarViews(duration, scope), [duration, scope]);
  const enterprise = useMemo(() => enterpriseInsights(duration, scope), [duration, scope]);
  const attr = useMemo(() => attributeCompleteness(duration, scope), [duration, scope]);
  const classes = useMemo(() => classesBelowTarget(duration, scope), [duration, scope]);
  const depts = useMemo(() => departmentSummary(duration, scope), [duration, scope]);
  const go = (t) => {
    if (!t) return;
    if (t.type === 'attribute') onAttribute(t.pillarId, t.attribute, t.categoryId);
    else if (t.type === 'department') onDepartment(t.departmentId);
    else onPillar(t.pillarId, t.type === 'class' ? t.categoryId : undefined);
  };
  const mostIncomplete = pillars.slice().sort((a, b) => b.incompleteCis - a.incompleteCis)[0];
  const services = filters?.services?.length ?? 0;

  return html`<div className="ov">
    ${(scope || services > 0) &&
    html`<div className="ov-scope" role="status">
      ${scope &&
      html`<span>Completeness scoped to <b>${scope.length}</b> of ${DEPARTMENTS.length} departments (Departments / Department owner filter).
        <button type="button" className="link-btn" onClick=${onClearDepartments}>Clear</button></span>`}
      ${services > 0 &&
      html`<span>The Services filter does not apply to Completeness: the data has no link between services and CI classes.</span>`}
    </div>`}

    ${overall.totalCis === 0
      ? html`<p className="panel muted ov-empty">No CIs in the selected departments.</p>`
      : html`
          <div className="ov-top">
            <${OverallCard} overall=${overall} depts=${depts} classes=${classes}
              onIncomplete=${() => mostIncomplete && onPillar(mostIncomplete.pillar.id)} />
            <${AttributeCard} attr=${attr} onAttribute=${onAttribute} />
            <${ClassesCard} classes=${classes} onPillar=${onPillar} />
            <${DepartmentsCard} depts=${depts} onDepartment=${onDepartment} />
          </div>

          <section className="panel ov-cross" aria-label="Cross-category insight">
            <header className="panel-head ov-cross-head">
              <div>
                <h2>Cross-category insight</h2>
                <p className="panel-sub">Last ${duration} months · target ${COMPLETENESS_TARGET}% · weighted by CI count</p>
              </div>
            </header>
            <div className="ov-cross-insights">
              ${enterprise.map((item) => html`<${InsightCard} key=${item.id} item=${item} onTarget=${go} />`)}
            </div>
            <div className="ov-cols">
              ${pillars.map(
                (view) => html`<${PillarColumn} key=${view.pillar.id} view=${view} duration=${duration} scope=${scope}
                  go=${go} onPillar=${onPillar} onAttribute=${onAttribute} onDepartment=${onDepartment} />`,
              )}
            </div>
          </section>
        `}

    <p className="muted ov-note">
      Demo data: scores and trends come from 12 generated monthly snapshots per class, not live CMDB history; there are no CI-level
      records to list. Attribute completeness = missing mandatory values ÷ (CIs × mandatory attributes of the class); attributes not
      mandatory for a class are excluded. Department figures are a deterministic demo allocation of each class's CIs
      (missing ≤ incomplete ≤ CIs per department).
    </p>
  </div>`;
}
