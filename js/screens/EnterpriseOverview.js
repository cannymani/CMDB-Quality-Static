import { html } from 'htm/react';
import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DEPARTMENTS } from '../data/demo.js';
import { PILLARS } from '../data/completeness.js';
import { months } from '../data/select.js';
import {
  FACTORS,
  FACTOR_LABEL,
  FACTOR_TARGET,
  PRIORITY_RULE_TEXT,
  averageHealth,
  categoryHealth,
  combinedTrend,
  crossFactorInsights,
  departmentQuality,
  factorSummaries,
  priorityItems,
  serviceQuality,
  trendStatus,
} from '../data/overview.js';
import { Delta, fmt } from '../ui.js';
import { InsightCard, StatusChip } from './Completeness.js';

const COLORS = { compliance: '#003c6b', completeness: '#008dfc', correctness: '#48887a' };
const PAGE_SIZE = 10;
const pct = (value) => `${value.toFixed(1)}%`;

function PriorityChip({ level }) {
  const cls = { Critical: 'solid', High: 'mid', Medium: 'soft', 'On target': 'ok' }[level] ?? 'soft';
  return html`<span className=${`chip ${cls}`}>${level}</span>`;
}

function NotAvailable({ reason }) {
  return html`<span className="eo-na" title=${reason}>Not available<span className="sr-only">: ${reason}</span></span>`;
}

function Pager({ page, pages, total, onPage, label }) {
  if (total <= PAGE_SIZE) return null;
  return html`<div className="pager">
    <span className="num">${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} of ${total}</span>
    <div className="pager-nav">
      <button type="button" onClick=${() => onPage(page - 1)} disabled=${page === 0} aria-label=${`Previous ${label} page`}>‹</button>
      <button type="button" onClick=${() => onPage(page + 1)} disabled=${page >= pages - 1} aria-label=${`Next ${label} page`}>›</button>
    </div>
  </div>`;
}

function StatRows({ rows }) {
  return html`<dl className="eo-rows">
    ${rows.map((row) => html`<div key=${row.label}><dt>${row.label}</dt><dd className=${`num${row.bad ? ' eo-bad' : ''}`}>${row.value}</dd></div>`)}
  </dl>`;
}

const sign = (value) => `${value > 0 ? '+' : ''}${value.toFixed(1)}`;

function FactorCard({ factor, stats, duration, onOpen }) {
  const below = factor.available && factor.score < factor.target;
  return html`<article className=${`eo-card${below ? ' below' : ''}`} aria-label=${factor.label}>
    <div className="eo-card-head">
      <span className="eo-card-name">${factor.label}</span>
      ${factor.available && html`<${PriorityChip} level=${factor.priority} />`}
      <button type="button" className="eo-card-go" onClick=${onOpen} aria-label=${`Open the ${factor.label} dashboard`}>→</button>
    </div>
    ${factor.available
      ? html`
          <span className="num eo-card-score">${pct(factor.score)}</span>
          <p className="eo-card-blurb">${factor.blurb}</p>
          <p className="eo-card-meta">
            <span>Target ${factor.target}% · <span className=${below ? 'eo-bad' : 'eo-good'}>${below ? `gap ${factor.gap.toFixed(1)} pts` : 'on target'}</span></span>
            <span><${Delta} value=${factor.delta} /> over ${duration} months · <${Delta} value=${factor.monthDelta} /> vs last month</span>
          </p>
          <${StatRows} rows=${stats} />
          <div className="eo-card-foot"><${StatusChip} status=${factor.status} /><span className="eo-sub">${factor.note}</span></div>
          <button type="button" className="link-btn eo-card-link" onClick=${onOpen}>View ${factor.label.toLowerCase()} →</button>`
      : html`<p className="eo-sub">No ${factor.label} data for the current filters.</p>`}
  </article>`;
}

function ScopeCard({ factors, items, departments, services }) {
  const measured = FACTORS.filter((key) => factors[key].available);
  const avg = averageHealth(factors);
  const worst = measured.slice().sort((a, b) => factors[b].gap - factors[a].gap)[0];
  const audits = Math.max(factors.compliance.audits ?? 0, factors.correctness.audits ?? 0);
  const auditIds = new Set(items.filter((item) => item.factor !== 'completeness').map((item) => item.target?.id));
  const multiDept = departments.filter((row) => row.below >= 2).length;
  const bothSvc = services.filter((row) => row.below >= 2).length;
  const classes = factors.completeness.classes ?? 0;
  const classesOnTarget = factors.completeness.classesOnTarget ?? 0;
  return html`<article className="eo-scope" aria-label="CMDB health status">
    <span className="eo-scope-lbl">CMDB health status</span>
    <span className="num eo-scope-fig">${avg ? pct(avg.score) : '—'}</span>
    <span className="eo-scope-sub">${avg ? 'Average of Compliance, Completeness and Correctness (equal weights)' : 'No factor data in this scope'}</span>
    ${avg && html`<span className="eo-scope-meta">
      Avg target ${avg.target.toFixed(1)}% · <span className=${avg.gap > 0 ? 'eo-bad' : 'eo-good'}>${avg.gap > 0 ? `gap ${avg.gap.toFixed(1)} pts` : 'on target'}</span> · <${Delta} value=${avg.delta} /> over period · ${avg.onTarget} / ${avg.count} factors on target${worst && factors[worst].gap > 0 ? ` · largest gap: ${factors[worst].label}, ${factors[worst].gap.toFixed(1)} pts` : ''}
    </span>`}
    <${StatRows} rows=${[
      { label: 'Audit rules below target', value: `${auditIds.size} / ${audits}`, bad: auditIds.size > 0 },
      { label: 'Services below in Compliance & Correctness', value: `${bothSvc} / ${services.length}`, bad: bothSvc > 0 },
      { label: 'Departments below in 2+ factors', value: `${multiDept} / ${departments.length}`, bad: multiDept > 0 },
      { label: 'Classes on target', value: `${classesOnTarget} / ${classes}`, bad: classesOnTarget < classes },
    ]} />
  </article>`;
}

function TrendTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return html`<div className="eo-tip">
    <div className="eo-tip-head">${label}</div>
    ${payload.map((item) => {
      const change = point[`${item.dataKey}Change`];
      return html`<div key=${item.dataKey} className="eo-tip-row">
        <i style=${{ background: COLORS[item.dataKey] }}></i>
        <span>${FACTOR_LABEL[item.dataKey]}</span>
        <span className="num">${pct(item.value)}</span>
        <span className="num eo-sub">${change == null ? '—' : `${change > 0 ? '+' : ''}${change.toFixed(1)} pt vs prev.`}</span>
      </div>`;
    })}
  </div>`;
}

function TrendPanel({ factors, duration }) {
  const data = combinedTrend(factors, duration);
  const shown = FACTORS.filter((key) => factors[key].available);
  const missing = FACTORS.filter((key) => !factors[key].available);
  const values = data.flatMap((point) => shown.map((key) => point[key]).filter((v) => v != null));
  const targets = [...new Set(shown.map((key) => FACTOR_TARGET[key]))];
  const floor = values.length ? Math.max(0, Math.floor((Math.min(...values) - 2) / 2) * 2) : 0;
  const ceil = values.length ? Math.min(100, Math.ceil((Math.max(...values, ...targets) + 1) / 2) * 2) : 100;
  return html`<section className="panel eo-trend" aria-labelledby="eo-trend-h">
    <header className="panel-head">
      <div>
        <h2 id="eo-trend-h">The Three C's — performance over time</h2>
        <p className="panel-sub">Monthly score per factor, last ${duration} months. Each factor keeps its own definition and target.</p>
      </div>
      <div className="eo-legend">
        ${FACTORS.map((key) => html`<span key=${key} className="eo-legend-item">
          <i style=${{ background: COLORS[key] }}></i>${FACTOR_LABEL[key]}
          ${factors[key].available ? html`<${StatusChip} status=${trendStatus(factors[key].delta)} />` : html`<span className="eo-sub">no data</span>`}
        </span>`)}
      </div>
    </header>
    ${shown.length === 0
      ? html`<p className="eo-empty">No historical data for the current filters.</p>`
      : html`<div className="eo-chart">
          <${ResponsiveContainer} width="100%" height=${260}>
            <${LineChart} data=${data} margin=${{ top: 10, right: 16, bottom: 0, left: -8 }}>
              <${CartesianGrid} stroke="#ececec" vertical=${false} />
              <${XAxis} dataKey="month" tick=${{ fontSize: 11 }} tickLine=${false} axisLine=${false} />
              <${YAxis} domain=${[floor, ceil]} tick=${{ fontSize: 11 }} tickLine=${false} axisLine=${false} unit="%" width=${48} />
              <${Tooltip} content=${html`<${TrendTip} />`} />
              ${targets.map((target) => html`<${ReferenceLine} key=${target} y=${target} stroke="#9a9a9a" strokeDasharray="4 4"
                label=${{ value: `Target ${target}% · ${shown.filter((key) => FACTOR_TARGET[key] === target).map((key) => FACTOR_LABEL[key]).join(', ')}`, position: 'insideTopRight', fontSize: 10, fill: '#6b6b6b' }} />`)}
              ${shown.map((key) => html`<${Line} key=${key} type="monotone" dataKey=${key} name=${FACTOR_LABEL[key]} stroke=${COLORS[key]} strokeWidth=${2} dot=${{ r: 2.5 }} activeDot=${{ r: 4 }} isAnimationActive=${false} />`)}
            </${LineChart}>
          </${ResponsiveContainer}>
        </div>`}
    ${missing.length > 0 && html`<p className="eo-sub">${missing.map((key) => FACTOR_LABEL[key]).join(', ')}: no history for the current filters.</p>`}
  </section>`;
}

const NO_CATEGORY = 'Compliance and Correctness audits are measured per department, service and audit rule, with no link to Data Center, Network or Workplace.';

const AREA_ICON = {
  category: 'M8 2.5 14 13.5H2L8 2.5ZM8 7v3M8 11.8v.2',
  class: 'M8 2 13.5 5 8 8 2.5 5 8 2ZM2.5 8 8 11l5.5-3M2.5 11 8 14l5.5-3',
  department: 'M3 14V3h6v11M9 6h4v8M5 5.5h2M5 8h2M5 10.5h2M11 8.5v.2M11 11v.2M2 14h12',
};

function priorityAreas({ categories, items, departments, duration }) {
  const cats = categories
    .filter((cat) => cat.available && cat.completeness.gap > 0)
    .sort((a, b) => b.completeness.gap - a.completeness.gap);
  const cat = cats[0];
  const cls = items.find((item) => item.factor === 'completeness');
  const rule = items.find((item) => item.factor !== 'completeness');
  const dept = departments
    .filter((row) => row.below > 0)
    .sort((a, b) => b.below - a.below || b.totalGap - a.totalGap)[0];
  const multi = departments.filter((row) => row.below >= 2).length;
  return [
    {
      id: 'category',
      title: 'Highest-risk categories',
      text: cat
        ? `${cat.pillar.name}: Completeness ${pct(cat.completeness.score)}, ${cat.completeness.gap.toFixed(1)} pts below ${FACTOR_TARGET.completeness}%, ${sign(cat.completeness.delta)} pt over ${duration} months${cats.length > 1 ? `. Next: ${cats.slice(1).map((c) => `${c.pillar.name} (${c.completeness.gap.toFixed(1)} pts)`).join(', ')}` : ''}.`
        : `Every category meets the ${FACTOR_TARGET.completeness}% Completeness target.`,
      target: cat ? { type: 'pillar', pillarId: cat.pillar.id } : null,
    },
    {
      id: 'class',
      title: 'Classes driving quality issues',
      text: cls
        ? `${cls.name} (${cls.categoryLabel}): ${pct(cls.score)} complete, ${fmt(cls.affected)} ${cls.unit}.${rule ? ` Top audit rule: ${rule.name}, ${FACTOR_LABEL[rule.factor]} ${pct(rule.score)}.` : ''}`
        : 'No class is below the Completeness target.',
      target: cls?.target ?? null,
    },
    {
      id: 'department',
      title: 'Departments requiring action',
      text: dept
        ? `${dept.name} (${dept.owner}) is below target in ${dept.below} of ${dept.measured} factors; ${multi} of ${departments.length} departments are below target in 2 or more.`
        : 'No department is below target.',
      target: dept ? { type: 'department', id: dept.id } : null,
    },
  ];
}

function CatTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return html`<div className="eo-tip">
    <div className="eo-tip-head">${point.name}</div>
    <div className="eo-tip-row">
      <i style=${{ background: COLORS.completeness }}></i><span>Completeness</span>
      <span className="num">${pct(point.completeness)}</span>
      <span className="num eo-sub">${point.gap > 0 ? `${point.gap.toFixed(1)} pts below` : 'on target'}</span>
    </div>
    <div className="eo-sub">Compliance, Correctness: not measured by category</div>
  </div>`;
}

function CategoryPanel({ categories, selected, onSelect, onPillar, areas, onTarget, onFullList }) {
  const data = categories
    .filter((cat) => cat.available)
    .map((cat) => ({ id: cat.pillar.id, name: cat.pillar.name, completeness: cat.completeness.score, gap: cat.completeness.gap }));
  const pick = (id) => id && onSelect(selected === id ? 'all' : id);
  return html`<section className="panel eo-cat" aria-labelledby="eo-cat-h">
    <header className="panel-head">
      <div>
        <h2 id="eo-cat-h">Category health comparison</h2>
        <p className="panel-sub">Compare the three factors across Data Center, Network and Workplace. Select a category to focus the priority list.</p>
      </div>
      ${selected !== 'all' && html`<button type="button" className="link-btn" onClick=${() => onSelect('all')}>Show all categories</button>`}
    </header>
    <h3 className="eo-h3">Factor scores by category</h3>
    <p className="eo-sub">Only Completeness is measured by category. ${NO_CATEGORY}</p>
    ${data.length === 0
      ? html`<p className="eo-empty">No Completeness CIs in scope for the current filters.</p>`
      : html`<div className="eo-chart">
          <${ResponsiveContainer} width="100%" height=${220}>
            <${BarChart} data=${data} margin=${{ top: 20, right: 8, bottom: 0, left: -8 }}>
              <${CartesianGrid} stroke="#ececec" vertical=${false} />
              <${XAxis} dataKey="name" tick=${{ fontSize: 11 }} tickLine=${false} axisLine=${false} />
              <${YAxis} domain=${[0, 100]} ticks=${[0, 25, 50, 75, 100]} tick=${{ fontSize: 11 }} tickLine=${false} axisLine=${false} unit="%" width=${48} />
              <${Tooltip} content=${html`<${CatTip} />`} cursor=${{ fill: 'rgba(17, 17, 17, 0.04)' }} />
              <${ReferenceLine} y=${FACTOR_TARGET.completeness} stroke="#9a9a9a" strokeDasharray="4 4"
                label=${{ value: `Target ${FACTOR_TARGET.completeness}%`, position: 'insideTopRight', fontSize: 10, fill: '#6b6b6b' }} />
              <${Bar} dataKey="completeness" name="Completeness" barSize=${44} radius=${[4, 4, 0, 0]} isAnimationActive=${false} cursor="pointer"
                onClick=${(bar) => pick(bar?.payload?.id ?? bar?.id)}>
                ${data.map((d) => html`<${Cell} key=${d.id} fill=${COLORS.completeness} fillOpacity=${selected === 'all' || selected === d.id ? 1 : 0.35} />`)}
                <${LabelList} dataKey="completeness" position="top" formatter=${(v) => pct(v)} style=${{ fontSize: 11, fill: '#111' }} />
              </${Bar}>
            </${BarChart}>
          </${ResponsiveContainer}>
        </div>`}
    <div className="eo-legend eo-legend-c">
      ${FACTORS.map((key) => html`<span key=${key} className="eo-legend-item">
        <i style=${{ background: COLORS[key], opacity: key === 'completeness' ? 1 : 0.3 }}></i>${FACTOR_LABEL[key]}
        ${key !== 'completeness' && html`<span className="eo-sub">not available by category</span>`}
      </span>`)}
    </div>
    <div className="eo-cat-rows" role="group" aria-label="Categories">
      ${categories.map((cat) => {
        const c = cat.completeness;
        const on = selected === cat.pillar.id;
        return html`<div key=${cat.pillar.id} className=${`eo-cat-row${on ? ' on' : ''}`}>
          <button type="button" className="eo-name-btn" aria-pressed=${on} onClick=${() => onSelect(on ? 'all' : cat.pillar.id)}>${cat.pillar.name}</button>
          <span className="eo-sub">${cat.available
            ? html`<span className=${c.gap > 0 ? 'eo-bad' : 'eo-good'}>${c.gap > 0 ? `${c.gap.toFixed(1)} pts below` : 'On target'}</span> · <${Delta} value=${c.delta} /> · ${c.categoriesOnTarget}/${c.categories} classes on target`
            : 'No CIs in scope'}</span>
          <${PriorityChip} level=${cat.priority} />
          <button type="button" className="link-btn ov-open" aria-label=${`Open ${cat.pillar.name}`} onClick=${() => onPillar(cat.pillar.id)}>Open →</button>
        </div>`;
      })}
    </div>
    <h3 className="eo-h3 eo-areas-h">Priority areas</h3>
    <ul className="eo-areas">
      ${areas.map((area) => html`<li key=${area.id}>
        <button type="button" className="eo-area" disabled=${!area.target} onClick=${() => onTarget(area.target)}>
          <svg className="eo-area-icon" viewBox="0 0 16 16" aria-hidden="true"><path d=${AREA_ICON[area.id]}></path></svg>
          <span><span className="eo-area-title">${area.title}</span><span className="eo-area-text">${area.text}</span></span>
          ${area.target && html`<span className="eo-area-go" aria-hidden="true">›</span>`}
        </button>
      </li>`)}
    </ul>
    <button type="button" className="link-btn eo-more" onClick=${onFullList}>View full priority list ↓</button>
  </section>`;
}

function ExecutiveInsight({ insights, onTarget }) {
  const [open, setOpen] = useState(false);
  const [lead, ...rest] = insights;
  if (!lead) return null;
  return html`<section className="panel eo-exec ov-attn" aria-labelledby="eo-exec-h">
    <div className="eo-exec-head">
      <h2 id="eo-exec-h">Executive insight</h2>
      ${rest.length > 0 && html`<button type="button" className="link-btn" aria-expanded=${open} onClick=${() => setOpen(!open)}>
        ${open ? 'Hide' : 'Show'} ${rest.length} more cross-factor insights</button>`}
    </div>
    <${InsightCard} item=${lead} onTarget=${onTarget} />
    ${open && html`<div className="eo-insight-grid">${rest.map((item) => html`<${InsightCard} key=${item.id} item=${item} onTarget=${onTarget} />`)}</div>`}
    <p className="eo-sub">Calculated from the current data and filters. Issues that occur together are shown as co-occurrence, not cause.</p>
  </section>`;
}

function AccordionHead({ id, title, summary, sub, open, onToggle, children }) {
  return html`<header className=${`panel-head eo-acc-head${open ? ' open' : ''}`}>
    <div className="eo-acc-title">
      <h2 id=${`${id}-h`}>
        <button type="button" className="eo-acc-btn" aria-expanded=${open} aria-controls=${`${id}-body`} onClick=${onToggle}>
          <span className="eo-acc-chev" aria-hidden="true">›</span>${title}
        </button>
      </h2>
      <p className="panel-sub">${open ? sub : summary}</p>
    </div>
    ${open && html`<div className="eo-controls">${children}</div>`}
  </header>`;
}

function PriorityPanel({ items, category, onCategory, onTarget, open, onToggle }) {
  const [factor, setFactor] = useState('all');
  const [page, setPage] = useState(0);
  const filtered = items.filter(
    (item) =>
      (factor === 'all' || item.factor === factor) &&
      (category === 'all' || item.pillarId === category),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const visible = filtered.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
  const hidesAudits = category !== 'all' && factor !== 'completeness';
  const critical = filtered.filter((item) => item.severity === 'Critical').length;
  const scopeText = [
    factor === 'all' ? null : FACTOR_LABEL[factor],
    category === 'all' ? null : PILLARS.find((p) => p.id === category)?.name,
  ].filter(Boolean).join(', ');
  const summary = `${filtered.length} issues below target · ${critical} critical${scopeText ? ` · ${scopeText}` : ''}. Expand to see the ranked list and filter by factor and category.`;
  return html`<section className="panel eo-prio eo-acc" aria-labelledby="eo-prio-h">
    <${AccordionHead} id="eo-prio" title="Priority areas requiring attention" summary=${summary} sub=${PRIORITY_RULE_TEXT} open=${open} onToggle=${onToggle}>
        <div className="seg" role="group" aria-label="Factor">
          ${['all', ...FACTORS].map((key) => html`<button key=${key} type="button" className=${factor === key ? 'on' : ''} aria-pressed=${factor === key}
            onClick=${() => { setFactor(key); setPage(0); }}>${key === 'all' ? 'All factors' : FACTOR_LABEL[key]}</button>`)}
        </div>
        <label className="eo-select"><span>Category</span>
          <select value=${category} onChange=${(event) => { onCategory(event.target.value); setPage(0); }}>
            <option value="all">All categories</option>
            ${PILLARS.map((pillar) => html`<option key=${pillar.id} value=${pillar.id}>${pillar.name}</option>`)}
          </select>
        </label>
    </${AccordionHead}>
    <div id="eo-prio-body" className="eo-acc-body" hidden=${!open}>
    ${hidesAudits && html`<p className="eo-note">Compliance and Correctness rules are not mapped to categories, so only Completeness classes are listed for ${PILLARS.find((p) => p.id === category)?.name}.</p>`}
    ${filtered.length === 0
      ? html`<p className="eo-empty">No issues below target for this selection.</p>`
      : html`<div className="eo-tbl-scroll"><table className="tbl eo-tbl">
          <thead><tr>
            <th className="r">#</th><th>Priority</th><th>Factor</th><th>Category</th><th>Issue</th>
            <th className="r">Affected</th><th className="r">Gap</th><th className="r">Trend</th><th>Owner</th><th>Next action</th>
          </tr></thead>
          <tbody>
            ${visible.map((item, index) => html`<tr key=${item.id}>
              <td className="r num eo-sub">${current * PAGE_SIZE + index + 1}</td>
              <td><${PriorityChip} level=${item.severity} />${item.persistent && html`<span className="eo-sub eo-block">every month</span>`}</td>
              <td>${FACTOR_LABEL[item.factor]}</td>
              <td className=${item.pillarId ? '' : 'eo-sub'}>${item.categoryLabel}</td>
              <td>
                <button type="button" className="eo-name-btn" onClick=${() => onTarget(item.target)}>${item.name}</button>
                <span className="eo-sub">${item.kind} · ${pct(item.score)} vs ${item.goal}%</span>
              </td>
              <td className="r"><span className="num">${fmt(item.affected)}</span><span className="eo-sub">${item.unit}</span></td>
              <td className="r num eo-bad">${item.gap.toFixed(1)} pts</td>
              <td className="r"><${Delta} value=${item.delta} /></td>
              <td>${item.owner}<span className="eo-sub">${item.ownerNote}</span></td>
              <td className="eo-action">${item.action}</td>
            </tr>`)}
          </tbody>
        </table></div>
        <${Pager} page=${current} pages=${pages} total=${filtered.length} onPage=${setPage} label="priority" />`}
    </div>
  </section>`;
}

const SORTS = [
  { key: 'name', label: 'Name' },
  { key: 'compliance', label: 'Compliance', r: true },
  { key: 'completeness', label: 'Completeness', r: true },
  { key: 'correctness', label: 'Correctness', r: true },
  { key: 'below', label: 'Below target', r: true },
];

function sortValue(row, key) {
  if (key === 'name') return row.name;
  if (key === 'below') return row.below * 1000 + row.totalGap;
  return row.factors[key]?.score ?? null;
}

function FactorCell({ cell, unit, reason }) {
  if (!cell) return html`<${NotAvailable} reason=${reason} />`;
  return html`<span className=${`num ${cell.below ? 'eo-bad' : ''}`}>${pct(cell.score)}</span>
    <span className="eo-sub"><${Delta} value=${cell.delta} /> · ${fmt(cell.failing)} ${unit}</span>`;
}

const UNITS = { compliance: 'non-compliant', completeness: 'incomplete', correctness: 'invalid' };

function ImpactPanel({ departments, services, onTarget }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('departments');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState({ key: 'below', dir: 'desc' });
  const [page, setPage] = useState(0);
  const source = mode === 'departments' ? departments : services;
  const q = query.trim().toLowerCase();
  const rows = source
    .filter((row) => !q || `${row.name} ${row.code} ${row.owner}`.toLowerCase().includes(q))
    .slice()
    .sort((a, b) => {
      const av = sortValue(a, sort.key);
      const bv = sortValue(b, sort.key);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const visible = rows.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
  const toggleSort = (key) => {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'name' ? 'asc' : key === 'below' ? 'desc' : 'asc' }));
    setPage(0);
  };
  const reasons = {
    compliance: 'No Compliance measurements for this row under the current filters.',
    correctness: 'No Correctness measurements for this row under the current filters.',
    completeness: mode === 'services'
      ? 'Completeness has no link between services and CI classes.'
      : 'No Completeness CIs allocated to this department.',
  };
  const multiDept = departments.filter((row) => row.below >= 2).length;
  const bothSvc = services.filter((row) => row.below >= 2).length;
  const summary = `${departments.length} departments (${multiDept} below target in 2+ factors) · ${services.length} services (${bothSvc} below in Compliance and Correctness). Expand to search, sort and open rows.`;
  return html`<section className="panel eo-impact eo-acc" aria-labelledby="eo-imp-h">
    <${AccordionHead} id="eo-imp" title="Department and service impact" summary=${summary}
      sub="Scores are shown per factor and never combined. Counts: non-compliant and invalid audit checks; incomplete distinct CIs."
      open=${open} onToggle=${() => setOpen(!open)}>
        <div className="seg" role="group" aria-label="Rows">
          ${['departments', 'services'].map((key) => html`<button key=${key} type="button" className=${mode === key ? 'on' : ''} aria-pressed=${mode === key}
            onClick=${() => { setMode(key); setPage(0); }}>${key === 'departments' ? `Departments (${departments.length})` : `Services (${services.length})`}</button>`)}
        </div>
        <input type="search" className="eo-search" placeholder=${`Search ${mode}`} aria-label=${`Search ${mode}`} value=${query}
          onInput=${(event) => { setQuery(event.target.value); setPage(0); }} />
    </${AccordionHead}>
    <div id="eo-imp-body" className="eo-acc-body" hidden=${!open}>
    ${rows.length === 0
      ? html`<p className="eo-empty">No ${mode} match the current search and filters.</p>`
      : html`<div className="eo-tbl-scroll"><table className="tbl eo-tbl">
          <thead><tr>
            ${SORTS.map((col) => html`<th key=${col.key} className=${col.r ? 'r' : ''}
              aria-sort=${sort.key === col.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
              <button type="button" className="table-sort" onClick=${() => toggleSort(col.key)}>
                ${col.key === 'name' ? (mode === 'departments' ? 'Department' : 'Service') : col.label}${sort.key === col.key ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
              </button></th>`)}
            <th>Owner</th>
          </tr></thead>
          <tbody>
            ${visible.map((row) => html`<tr key=${row.id}>
              <td>
                <button type="button" className="eo-name-btn" onClick=${() => onTarget({ type: mode === 'departments' ? 'department' : 'service', id: row.id })}>${row.name}</button>
                <span className="eo-sub">${row.code}</span>
              </td>
              ${FACTORS.map((key) => html`<td key=${key} className="r"><${FactorCell} cell=${row.factors[key]} unit=${UNITS[key]} reason=${reasons[key]} /></td>`)}
              <td className="r"><span className=${`num ${row.below >= 2 ? 'eo-bad' : ''}`}>${row.below} / ${row.measured}</span>
                <span className="eo-sub">${row.belowKeys.map((key) => FACTOR_LABEL[key]).join(', ') || '—'}</span></td>
              <td>${row.owner}</td>
            </tr>`)}
          </tbody>
        </table></div>
        <${Pager} page=${current} pages=${pages} total=${rows.length} onPage=${setPage} label=${mode} />`}
    ${mode === 'departments'
      ? html`<p className="eo-note">Selecting a department applies the Departments filter to the whole dashboard. Completeness by department is a demo allocation of class totals, not CMDB ownership data.</p>`
      : html`<p className="eo-note">Selecting a service opens its Compliance service page. Completeness is not available by service.</p>`}
    </div>
  </section>`;
}

export function EnterpriseOverview({
  rows,
  duration,
  scope,
  filters,
  category,
  onCategory,
  onKpi,
  onAudit,
  onService,
  onPillar,
  onDepartment,
  onClearDepartments,
}) {
  const factors = useMemo(() => factorSummaries(rows, duration, scope), [rows, duration, scope]);
  const categories = useMemo(() => categoryHealth(duration, scope), [duration, scope]);
  const items = useMemo(() => priorityItems(rows, duration, scope), [rows, duration, scope]);
  const departments = useMemo(() => departmentQuality(rows, duration, scope), [rows, duration, scope]);
  const services = useMemo(() => serviceQuality(rows, duration), [rows, duration]);
  const insights = useMemo(
    () => crossFactorInsights({ factors, categories, items, departments, services, duration, scope }),
    [factors, categories, items, departments, services, duration, scope],
  );

  const go = (target) => {
    if (!target) return;
    if (target.type === 'kpi') onKpi(target.key);
    else if (target.type === 'audit') onAudit(target.id, target.kpi);
    else if (target.type === 'service') onService(target.id, 'compliance');
    else if (target.type === 'pillar') onPillar(target.pillarId);
    else if (target.type === 'class') onPillar(target.pillarId, target.categoryId);
    else if (target.type === 'department') {
      onDepartment(target.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const period = months(duration);
  const deptCount = filters.departments.length;
  const ownerCount = filters.owners.length;
  const areas = priorityAreas({ categories, items, departments, duration });
  const [priorityOpen, setPriorityOpen] = useState(false);
  const openFullList = () => {
    setPriorityOpen(true);
    requestAnimationFrame(() => document.getElementById('eo-prio-h')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  const deptBelow = (key) => {
    const measured = departments.filter((row) => row.factors[key]);
    return `${measured.filter((row) => row.factors[key].below).length} / ${measured.length}`;
  };
  const auditStats = (key) => [
    { label: factors[key].failLabel, value: fmt(factors[key].failing), bad: true },
    { label: factors[key].passLabel, value: fmt(factors[key].passing) },
    { label: `Audits below ${FACTOR_TARGET[key]}%`, value: `${items.filter((item) => item.factor === key).length} / ${factors[key].audits ?? 0}` },
    { label: `Departments below ${FACTOR_TARGET[key]}%`, value: deptBelow(key) },
  ];
  const stats = {
    compliance: auditStats('compliance'),
    completeness: [
      { label: factors.completeness.failLabel, value: fmt(factors.completeness.failing), bad: true },
      { label: factors.completeness.passLabel, value: fmt(factors.completeness.passing) },
      { label: `Departments below ${FACTOR_TARGET.completeness}%`, value: deptBelow('completeness') },
      { label: 'Classes on target', value: `${factors.completeness.classesOnTarget ?? 0} / ${factors.completeness.classes ?? 0}` },
    ],
    correctness: auditStats('correctness'),
  };

  return html`<div className="eo">
    <section className="panel eo-head" aria-labelledby="eo-title">
      <h1 id="eo-title" className="eo-title">Enterprise CMDB Health</h1>
      <div className="eo-context" role="status">
        <span><span className="eo-lbl">Reporting period</span> Last ${duration} months (${period[0]} – ${period[period.length - 1]})</span>
        <span><span className="eo-lbl">Departments</span> ${deptCount ? `${deptCount} selected` : ownerCount ? `${scope ? scope.length : DEPARTMENTS.length} via owner filter` : `All ${DEPARTMENTS.length}`}</span>
        <span><span className="eo-lbl">Category</span> ${category === 'all' ? 'All' : `${PILLARS.find((p) => p.id === category)?.name} (Completeness only)`}</span>
        ${(deptCount > 0 || ownerCount > 0) && html`<button type="button" className="link-btn" onClick=${onClearDepartments}>Clear department filter</button>`}
      </div>
      <div className="eo-cards">
        <${ScopeCard} factors=${factors} items=${items} departments=${departments} services=${services} />
        ${FACTORS.map((key) => html`<${FactorCard} key=${key} factor=${factors[key]} stats=${stats[key]} duration=${duration} onOpen=${() => onKpi(key)} />`)}
      </div>
      <p className="eo-note">CMDB health status is an equal-weight simple average of the three factor scores. The factors use different definitions and denominators (audit checks vs distinct CIs), so read it as an indicator alongside the individual scores; no weighted method has been approved.</p>
    </section>

    <${ExecutiveInsight} insights=${insights} onTarget=${go} />

    <div className="eo-split">
      <${TrendPanel} factors=${factors} duration=${duration} />
      <${CategoryPanel} categories=${categories} selected=${category} onSelect=${onCategory} onPillar=${onPillar} areas=${areas} onTarget=${go} onFullList=${openFullList} />
    </div>

    <${PriorityPanel} items=${items} category=${category} onCategory=${onCategory} onTarget=${go} open=${priorityOpen} onToggle=${() => setPriorityOpen(!priorityOpen)} />

    <${ImpactPanel} departments=${departments} services=${services} onTarget=${go} />

    <section className="panel eo-notes" aria-labelledby="eo-notes-h">
      <h2 id="eo-notes-h">Data sources and limits</h2>
      <ul>
        <li>All figures are deterministic demo data; no live CMDB or ServiceNow connection.</li>
        <li>Compliance and Correctness: audit measurements by department, service and audit rule. Counts are audit checks, so one CI can be counted once per audit. Targets ${FACTOR_TARGET.compliance}% and ${FACTOR_TARGET.correctness}%.</li>
        <li>Completeness: class model with distinct CI counts. Target ${FACTOR_TARGET.completeness}%. Department figures are a demo allocation; there is no service-to-class link.</li>
        <li>Not available: Compliance and Correctness by category or CI class; Completeness by service; comparing populated-but-invalid attribute values (audit rules and Completeness attributes don't overlap).</li>
        <li>Change is measured from the start of the selected period to the latest month, as on the factor dashboards. A previous equivalent period would need more than 12 monthly snapshots.</li>
      </ul>
    </section>
  </div>`;
}
