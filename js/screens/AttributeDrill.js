import { html } from 'htm/react';
import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  COMPLETENESS_TARGET,
  PILLARS,
  attributeDrill,
  attributeGaps,
  attributesOf,
} from '../data/completeness.js';
import { Delta, Tip, fmt } from '../ui.js';

const PAGE_SIZES = [10, 25, 50];
const SCOPE_SHADE = '#003c6b';
const SELECTION_SHADE = '#008dfc';
const MAX_QUERY = 80;

const bandFor = (score) =>
  score >= COMPLETENESS_TARGET
    ? 'On target'
    : score >= COMPLETENESS_TARGET - 5
      ? 'Watch'
      : 'Off target';
const pct = (value) => `${value.toFixed(1)}%`;
const short = (text, max = 28) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

function CountTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return html`<div className="tip">
    <b>${row.name}</b>
    <div>CIs missing: ${fmt(row.missingCis)}</div>
    <div>Populated: ${pct(row.score)}</div>
  </div>`;
}

/** Sortable table state: clicking the active column flips direction. */
function useSort(initialKey, initialDirection = 'desc') {
  const [sort, setSort] = useState({ key: initialKey, direction: initialDirection });
  const toggle = (key) =>
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: key === 'score' ? 'asc' : 'desc' },
    );
  const apply = (rows, pick) => {
    const sorted = [...rows].sort((a, b) => {
      const av = pick(a, sort.key);
      const bv = pick(b, sort.key);
      return typeof av === 'string' ? av.localeCompare(bv) : av - bv;
    });
    return sort.direction === 'desc' ? sorted.reverse() : sorted;
  };
  return { sort, toggle, apply };
}

function SortHead({ label, column, sorter, right = true }) {
  const on = sorter.sort.key === column;
  return html`<th className=${right ? 'r' : ''} aria-sort=${on ? (sorter.sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
    <button className="table-sort" onClick=${() => sorter.toggle(column)}>
      ${label}${on ? (sorter.sort.direction === 'asc' ? ' ↑' : ' ↓') : ''}
    </button>
  </th>`;
}

function GapBars({ rows, onPick, selectedId }) {
  return html`<div className="attr-bars" style=${{ height: Math.max(160, rows.length * 30 + 30) }}>
    <${ResponsiveContainer} width="100%" height="100%">
      <${BarChart} data=${rows} layout="vertical" margin=${{ top: 4, right: 16, bottom: 4, left: 0 }}>
        <${CartesianGrid} stroke="var(--ink-100)" horizontal=${false} />
        <${XAxis} type="number" tickLine=${false} axisLine=${false} fontSize=${11} tickFormatter=${fmt} />
        <${YAxis} type="category" dataKey="label" width=${180} tickLine=${false} axisLine=${false} fontSize=${11} interval=${0} />
        <${Tooltip} content=${html`<${CountTip} />`} cursor=${{ fill: 'var(--ink-100)' }} />
        <${Bar}
          dataKey="missingCis"
          name="CIs missing"
          fill="var(--accent)"
          radius=${[0, 4, 4, 0]}
          barSize=${14}
          isAnimationActive=${false}
          cursor="pointer"
          onClick=${(bar) => onPick(bar?.payload?.id ?? bar?.id)}
          shape=${(props) =>
            html`<rect
              x=${props.x}
              y=${props.y}
              width=${Math.max(0, props.width)}
              height=${props.height}
              rx=${3}
              fill=${props.payload.id === selectedId ? 'var(--accent-ink)' : 'var(--accent)'}
              opacity=${selectedId && props.payload.id !== selectedId ? 0.45 : 1}
            />`}
        />
      </${BarChart}>
    </${ResponsiveContainer}>
  </div>`;
}

export function AttributeDrill({
  pillarId,
  attribute,
  categoryId,
  duration,
  scope,
  filters,
  onAttribute,
  onPillar,
  onCompleteness,
}) {
  const [departmentId, setDepartmentId] = useState(null);
  const [query, setQuery] = useState('');
  const [deptSize, setDeptSize] = useState(10);
  const [deptPage, setDeptPage] = useState(0);
  const classSort = useSort('missing');
  const deptSort = useSort('missing');
  const regionSort = useSort('missing');

  const drill = useMemo(
    () => attributeDrill(duration, pillarId, attribute, { categoryId, departmentId, scope }),
    [duration, pillarId, attribute, categoryId, departmentId, scope],
  );
  const pillar = drill.pillar ?? PILLARS.find((item) => item.id === pillarId) ?? PILLARS[0];
  const selectedScopeCategory = drill.scopeCategory;
  const scopeLabel = selectedScopeCategory ? selectedScopeCategory.name : `All ${pillar.name} classes`;

  const filterDepartments = filters?.departments ?? [];
  const filterOwners = filters?.owners ?? [];
  const dashboardFiltered = filterDepartments.length > 0 || filterOwners.length > 0;
  const needle = query.trim().toLowerCase();
  const departments = useMemo(
    () =>
      drill.departments.filter(
        (row) =>
          (!needle ||
            `${row.department.name} ${row.department.code} ${row.department.owner}`
              .toLowerCase()
              .includes(needle)),
      ),
    [drill.departments, needle],
  );
  const pickDept = (row, key) =>
    key === 'name'
      ? row.department.name
      : key === 'owner'
        ? row.department.owner
        : key === 'total'
          ? row.totalCis
          : key === 'score'
            ? row.score
            : key === 'delta'
              ? row.delta
              : row.missingCis;
  const sortedDepartments = deptSort.apply(departments, pickDept);
  const deptPages = Math.max(1, Math.ceil(sortedDepartments.length / deptSize));
  const currentDeptPage = Math.min(deptPage, deptPages - 1);
  const visibleDepartments = sortedDepartments.slice(
    currentDeptPage * deptSize,
    (currentDeptPage + 1) * deptSize,
  );

  const pickClass = (row, key) =>
    key === 'name'
      ? row.category.name
      : key === 'total'
        ? row.totalCis
        : key === 'score'
          ? row.score
          : key === 'share'
            ? row.share
            : key === 'delta'
              ? row.delta
              : row.missingCis;
  const sortedClasses = classSort.apply(drill.categories, pickClass);
  const sortedRegions = regionSort.apply(drill.regions, (row, key) =>
    key === 'name' ? row.region : key === 'total' ? row.totalCis : key === 'score' ? row.score : row.missingCis,
  );

  const classBars = drill.categories
    .filter((row) => row.missingCis > 0)
    .slice(0, 10)
    .map((row) => ({
      id: row.category.id,
      name: row.category.name,
      label: short(row.category.name),
      missingCis: row.missingCis,
      score: row.score,
    }));
  const departmentBars = departments
    .slice()
    .sort((a, b) => b.missingCis - a.missingCis)
    .filter((row) => row.missingCis > 0)
    .slice(0, 10)
    .map((row) => ({
      id: row.department.id,
      name: row.department.name,
      label: short(row.department.name),
      missingCis: row.missingCis,
      score: row.score,
    }));

  const selection = drill.selection;
  const trend = drill.series.map((point, i) => ({
    month: point.month,
    [scopeLabel]: point.value,
    ...(selection ? { [selection.department.name]: selection.series[i]?.value } : {}),
  }));

  const trendValues = trend.flatMap((row) => Object.values(row).filter((value) => typeof value === 'number'));
  // Zoom the axis to the data (always keeping the target line visible) so small movements stay readable.
  const trendFloor = Math.max(
    0,
    Math.floor((Math.min(COMPLETENESS_TARGET, ...trendValues) - 2) / 2) * 2,
  );

  const worstClass = drill.categories.find((row) => row.missingCis > 0) ?? null;
  const improvedClass =
    drill.categories.slice().sort((a, b) => b.delta - a.delta)[0] ?? null;
  const worstDepartment =
    drill.departments.slice().sort((a, b) => a.score - b.score || b.missingCis - a.missingCis)[0] ??
    null;
  const worstRegion = drill.regions[0] ?? null;
  const classesOnTarget = drill.categories.filter((row) => row.score >= COMPLETENESS_TARGET).length;
  const classesAffected = drill.categories.filter((row) => row.missingCis > 0).length;
  const classCount = drill.categories.length;

  const setScope = (id) => {
    setDeptPage(0);
    onAttribute(pillarId, attribute, id && id !== categoryId ? id : null);
  };
  const toggleDepartment = (id) => setDepartmentId(id && id !== departmentId ? id : null);
  const switchPillar = (nextId) => {
    if (attributesOf(nextId).includes(attribute)) return onAttribute(nextId, attribute);
    const top = attributeGaps(duration, nextId)[0]?.attribute ?? attributesOf(nextId)[0];
    return onAttribute(nextId, top);
  };
  const band = bandFor(drill.score);

  return html`<div className="drill attr-drill">
    <div className="drill-top">
      <nav className="crumbs" aria-label="Breadcrumb">
        <button className="link-btn" onClick=${onCompleteness}>Completeness</button>
        <span aria-hidden="true">›</span>
        <button className="link-btn" onClick=${() => onPillar(pillar.id)}>${pillar.name}</button>
        <span aria-hidden="true">›</span>
        <span className="crumb-on" aria-current="page">${attribute}</span>
      </nav>
      <div className="attr-switches">
        <label className="pillar-switch"
          ><span className="lbl">Pillar</span
          ><select aria-label="Select pillar" value=${pillar.id} onChange=${(event) => switchPillar(event.target.value)}>
            ${PILLARS.map((item) => html`<option key=${item.id} value=${item.id}>${item.name}</option>`)}
          </select></label
        ><label className="pillar-switch"
          ><span className="lbl">Attribute</span
          ><select
            aria-label="Select attribute"
            value=${attribute}
            onChange=${(event) => onAttribute(pillar.id, event.target.value, categoryId)}
          >
            ${attributesOf(pillar.id).map((item) => html`<option key=${item} value=${item}>${item}</option>`)}
          </select></label
        ><label className="pillar-switch"
          ><span className="lbl">Class</span
          ><select
            aria-label="Select class"
            value=${categoryId ?? ''}
            onChange=${(event) => setScope(event.target.value || null)}
          >
            <option value="">All classes</option>
            ${drill.categories.map((row) => html`<option key=${row.category.id} value=${row.category.id}>${row.category.name}</option>`)}
          </select></label
        >
      </div>
    </div>
    <header className="page-head">
      <h1 className="page-title">${attribute} — Attribute Drill-down</h1>
      <p className="page-sub">
        ${pillar.name} · ${scopeLabel} · ${classesAffected} of ${classCount} classes affected ·
        ${' '}${drill.departmentsAffected} of ${drill.totalDepartments} departments affected · target ${COMPLETENESS_TARGET}%
      </p>
    </header>
    ${
      !drill.applicable
        ? html`<section className="panel"><p className="empty">${attribute} is not a mandatory attribute in ${pillar.name}.</p></section>`
        : html`<div className="attr-body">
            <section className="panel">
              <div className="tiles">
                <div className="tile">
                  <span className="lbl">Attribute completeness</span
                  ><b className=${`num ${drill.score >= COMPLETENESS_TARGET ? 'good' : 'bad'}`}>${pct(drill.score)}</b
                  ><span className="tile-foot">${band} · ${scopeLabel}</span>
                </div>
                <div className="tile">
                  <span className="lbl">CIs missing ${attribute}</span
                  ><b className="num bad">${fmt(drill.missingCis)}</b
                  ><span className="tile-foot">of ${fmt(drill.totalCis)} CIs in scope</span>
                </div>
                <div className="tile">
                  <span className="lbl">CIs populated</span
                  ><b className="num good">${fmt(drill.populatedCis)}</b
                  ><span className="tile-foot">${classesOnTarget} of ${classCount} classes on target</span>
                </div>
                <div className="tile">
                  <span className="lbl">Change over ${duration} months</span
                  ><b className="num accent-ink"><${Delta} value=${drill.delta} /></b
                  ><span className="tile-foot">${drill.monthDelta >= 0 ? '↑' : '↓'}${Math.abs(drill.monthDelta).toFixed(1)}pt from last month</span>
                </div>
                <div className="tile">
                  <span className="lbl">Most affected class</span
                  ><b className="bad">${worstClass?.category.name ?? '—'}</b
                  ><span className="tile-foot">${worstClass ? `${fmt(worstClass.missingCis)} CIs · ${worstClass.share.toFixed(1)}% of gap` : 'No gaps'}</span>
                </div>
                <div className="tile">
                  <span className="lbl">Most improved class</span
                  ><b className="accent-ink">${improvedClass?.category.name ?? '—'}</b
                  ><span className="tile-foot accent-ink">${improvedClass ? `${improvedClass.delta >= 0 ? '+' : ''}${improvedClass.delta.toFixed(1)}pt` : '—'}</span>
                </div>
                <div className="tile">
                  <span className="lbl">Lowest department</span
                  ><b className="bad">${worstDepartment?.department.name ?? '—'}</b
                  ><span className="tile-foot">${worstDepartment ? `${pct(worstDepartment.score)} · ${worstDepartment.department.owner}` : '—'}</span>
                </div>
                <div className="tile">
                  <span className="lbl">Most affected region</span
                  ><b>${worstRegion?.region ?? '—'}</b
                  ><span className="tile-foot">${worstRegion ? `${fmt(worstRegion.missingCis)} CIs missing · ${pct(worstRegion.score)}` : '—'}</span>
                </div>
              </div>
              <div className="chart-head">
                <p className="chart-title">${attribute} completeness over time</p>
                ${
                  selection &&
                  html`<button className="link-btn" onClick=${() => setDepartmentId(null)}>Clear department</button>`
                }
              </div>
              <p className="chart-note">
                ${duration} cycles: ${drill.series[0]?.month} → ${drill.series[drill.series.length - 1]?.month}.
                ${' '}${selection ? `Comparing ${scopeLabel} with ${selection.department.name}.` : 'Select a department below to compare its trend.'}
              </p>
              <div style=${{ height: 280 }}>
                <${ResponsiveContainer} width="100%" height="100%">
                  <${LineChart} data=${trend} margin=${{ top: 10, right: 16, bottom: 0, left: -10 }}>
                    <${CartesianGrid} stroke="var(--ink-100)" vertical=${false} />
                    <${XAxis} dataKey="month" tickLine=${false} axisLine=${false} fontSize=${11} />
                    <${YAxis} domain=${[trendFloor, 100]} allowDecimals=${false} tickCount=${6} tickFormatter=${(value) => `${value}%`} tickLine=${false} axisLine=${false} fontSize=${11} />
                    <${Tooltip} content=${html`<${Tip} />`} />
                    <${Legend} iconType="plainline" wrapperStyle=${{ fontSize: 11 }} />
                    <${ReferenceLine}
                      y=${COMPLETENESS_TARGET}
                      stroke="var(--chart-axis)"
                      strokeDasharray="4 4"
                      label=${{ value: `Target ${COMPLETENESS_TARGET}%`, position: 'insideTopRight', fontSize: 10, fill: 'var(--chart-axis)' }}
                    />
                    <${Line} type="monotone" dataKey=${scopeLabel} stroke=${SCOPE_SHADE} strokeWidth=${2} dot=${false} isAnimationActive=${false} />
                    ${
                      selection &&
                      html`<${Line}
                        type="monotone"
                        dataKey=${selection.department.name}
                        stroke=${SELECTION_SHADE}
                        strokeWidth=${2}
                        strokeDasharray="5 3"
                        dot=${false}
                        isAnimationActive=${false}
                      />`
                    }
                  </${LineChart}>
                </${ResponsiveContainer}>
              </div>
            </section>
            <div className="attr-split">
              <section className="panel">
                <header className="panel-head">
                  <div>
                    <h2>CIs missing by class</h2>
                    <p className="panel-sub">Top ${classBars.length} classes · click a bar to focus the page on that class</p>
                  </div>
                </header>
                ${
                  classBars.length
                    ? html`<${GapBars} rows=${classBars} selectedId=${categoryId} onPick=${setScope} />`
                    : html`<p className="empty">No class is missing ${attribute}.</p>`
                }
              </section>
              <section className="panel">
                <header className="panel-head">
                  <div>
                    <h2>CIs missing by department</h2>
                    <p className="panel-sub">Top ${departmentBars.length} departments in ${scopeLabel} · click a bar to compare its trend</p>
                  </div>
                </header>
                ${
                  departmentBars.length
                    ? html`<${GapBars} rows=${departmentBars} selectedId=${departmentId} onPick=${toggleDepartment} />`
                    : html`<p className="empty">No department in scope is missing ${attribute}.</p>`
                }
              </section>
            </div>
            <section className="panel">
              <header className="panel-head">
                <div>
                  <h2>${attribute} by class</h2>
                  <p className="panel-sub">
                    ${classesAffected} of ${classCount} classes affected · click a row to focus on that class
                  </p>
                </div>
                ${scope && html`<button className="link-btn" onClick=${() => setScope(null)}>Show all classes</button>`}
              </header>
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <${SortHead} label="Class" column="name" sorter=${classSort} right=${false} />
                      <${SortHead} label="CIs in class" column="total" sorter=${classSort} />
                      <${SortHead} label="CIs missing" column="missing" sorter=${classSort} />
                      <${SortHead} label="Populated" column="score" sorter=${classSort} />
                      <${SortHead} label="Share of gap" column="share" sorter=${classSort} />
                      <${SortHead} label="Trend" column="delta" sorter=${classSort} />
                      <th className="r">Pillar view</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${sortedClasses.map(
                      (row) =>
                        html`<tr
                          key=${row.category.id}
                          className=${`row-link ${row.category.id === categoryId ? 'row-on' : ''}`}
                          onClick=${() => setScope(row.category.id)}
                        >
                          <td className="primary">${row.category.name}<div className="muted">${row.category.code}</div></td>
                          <td className="r num">${fmt(row.totalCis)}</td>
                          <td className=${`r num ${row.missingCis > 0 ? 'bad' : 'good'}`}>${fmt(row.missingCis)}</td>
                          <td className=${`r num ${row.score >= COMPLETENESS_TARGET ? 'good' : 'bad'}`}>${pct(row.score)}</td>
                          <td className="r num">${row.share.toFixed(1)}%</td>
                          <td className="r"><${Delta} value=${row.delta} /></td>
                          <td className="r">
                            <button
                              className="link-btn"
                              onClick=${(event) => {
                                event.stopPropagation();
                                onPillar(pillar.id, row.category.id);
                              }}
                            >
                              Open →
                            </button>
                          </td>
                        </tr>`,
                    )}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="panel">
              <header className="panel-head">
                <div>
                  <h2>${attribute} by department</h2>
                  <p className="panel-sub">
                    ${departments.length} of ${drill.departments.length} departments in ${scopeLabel}${dashboardFiltered ? ' · narrowed by the dashboard Departments / Department owner filters' : ''} · click a row to compare its trend
                  </p>
                </div>
                <input
                  className="attr-search"
                  type="search"
                  placeholder="Search department, code or owner"
                  aria-label="Search departments"
                  maxLength=${MAX_QUERY}
                  value=${query}
                  onChange=${(event) => {
                    setQuery(event.target.value.slice(0, MAX_QUERY));
                    setDeptPage(0);
                  }}
                />
              </header>
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <${SortHead} label="Department" column="name" sorter=${deptSort} right=${false} />
                      <${SortHead} label="Owner" column="owner" sorter=${deptSort} right=${false} />
                      <${SortHead} label="CIs in scope" column="total" sorter=${deptSort} />
                      <${SortHead} label="CIs missing" column="missing" sorter=${deptSort} />
                      <${SortHead} label="Populated" column="score" sorter=${deptSort} />
                      <${SortHead} label="Trend" column="delta" sorter=${deptSort} />
                    </tr>
                  </thead>
                  <tbody>
                    ${visibleDepartments.map(
                      (row) =>
                        html`<tr
                          key=${row.department.id}
                          className=${`row-link ${row.department.id === departmentId ? 'row-on' : ''}`}
                          onClick=${() => toggleDepartment(row.department.id)}
                        >
                          <td className="primary">${row.department.name}<div className="muted">${row.department.code} · ${row.department.region}</div></td>
                          <td>${row.department.owner}</td>
                          <td className="r num">${fmt(row.totalCis)}</td>
                          <td className=${`r num ${row.missingCis > 0 ? 'bad' : 'good'}`}>${fmt(row.missingCis)}</td>
                          <td className=${`r num ${row.score >= COMPLETENESS_TARGET ? 'good' : 'bad'}`}>${pct(row.score)}</td>
                          <td className="r"><${Delta} value=${row.delta} /></td>
                        </tr>`,
                    )}
                    ${
                      visibleDepartments.length === 0 &&
                      html`<tr><td colSpan=${6} className="muted">No departments match.</td></tr>`
                    }
                  </tbody>
                </table>
              </div>
              <div className="pager">
                <label
                  >Rows per page:<select
                    value=${deptSize}
                    onChange=${(event) => {
                      setDeptSize(Number(event.target.value));
                      setDeptPage(0);
                    }}
                  >
                    ${PAGE_SIZES.map((size) => html`<option key=${size} value=${size}>${size}</option>`)}
                  </select></label
                ><span className="num"
                  >${sortedDepartments.length === 0 ? 0 : currentDeptPage * deptSize + 1}–${Math.min((currentDeptPage + 1) * deptSize, sortedDepartments.length)}
                  ${' '}of ${sortedDepartments.length}</span
                >
                <div className="pager-nav">
                  <button
                    onClick=${() => setDeptPage(Math.max(0, currentDeptPage - 1))}
                    disabled=${currentDeptPage === 0}
                    aria-label="Previous department page"
                  >
                    ‹</button
                  ><button
                    onClick=${() => setDeptPage(Math.min(deptPages - 1, currentDeptPage + 1))}
                    disabled=${currentDeptPage >= deptPages - 1}
                    aria-label="Next department page"
                  >
                    ›
                  </button>
                </div>
              </div>
            </section>
            <div className="attr-split">
              <section className="panel">
                <header className="panel-head">
                  <div>
                    <h2>${attribute} by region</h2>
                    <p className="panel-sub">${scopeLabel}</p>
                  </div>
                </header>
                <div className="tbl-wrap">
                  <table className="tbl compact">
                    <thead>
                      <tr>
                        <${SortHead} label="Region" column="name" sorter=${regionSort} right=${false} />
                        <${SortHead} label="CIs in scope" column="total" sorter=${regionSort} />
                        <${SortHead} label="CIs missing" column="missing" sorter=${regionSort} />
                        <${SortHead} label="Populated" column="score" sorter=${regionSort} />
                      </tr>
                    </thead>
                    <tbody>
                      ${sortedRegions.map(
                        (row) =>
                          html`<tr key=${row.region}>
                            <td className="primary">${row.region}</td>
                            <td className="r num">${fmt(row.totalCis)}</td>
                            <td className=${`r num ${row.missingCis > 0 ? 'bad' : 'good'}`}>${fmt(row.missingCis)}</td>
                            <td className=${`r num ${row.score >= COMPLETENESS_TARGET ? 'good' : 'bad'}`}>${pct(row.score)}</td>
                          </tr>`,
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
              <section className="panel">
                <header className="panel-head">
                  <div>
                    <h2>Other attribute gaps in ${pillar.name}</h2>
                    <p className="panel-sub">Open another attribute's drill-down</p>
                  </div>
                </header>
                <div className="tbl-wrap">
                  <table className="tbl compact">
                    <thead>
                      <tr>
                        <th>Attribute</th>
                        <th className="r">CIs missing</th>
                        <th className="r">Classes affected</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${drill.related.map(
                        (row) =>
                          html`<tr key=${row.attribute} className="row-link" onClick=${() => onAttribute(pillar.id, row.attribute)}>
                            <td className="primary">${row.attribute}</td>
                            <td className="r num">${fmt(row.missingCis)}</td>
                            <td className="r num">${row.categories}/${row.totalCategories}</td>
                          </tr>`,
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
            <p className="chart-note attr-note">
              Demo data. Class figures come from the ${pillar.name} completeness model; the department and region split is a
              deterministic demo allocation because the source data has no department dimension.
            </p>
          </div>`
    }
  </div>`;
}
