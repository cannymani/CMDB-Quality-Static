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
import { ALL_AUDITS, AUDITS, KPI_META, type KpiKey, type Measurement } from '../data/demo';
import {
  RISK_THRESHOLD,
  TARGETS,
  auditDistribution,
  auditDrill,
  auditRows,
  deptTrends,
  serviceLabel,
  type Duration,
} from '../data/select';
import { Delta, fmt, Tip } from '../ui';

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
const dashFor = (i: number) => (i >= 9 ? ('5 3' as const) : undefined);
const Y_TICKS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const TREND_LIMIT = 10;

type Sort = 'score-asc' | 'score-desc' | 'findings' | 'name';

const SORTS: { id: Sort; label: string }[] = [
  { id: 'score-asc', label: 'Sort by Score — lowest first' },
  { id: 'score-desc', label: 'Sort by Score — highest first' },
  { id: 'findings', label: 'Sort by Open findings' },
  { id: 'name', label: 'Sort by Department' },
];

const PAGE_SIZES = [10, 25, 50];

export function AuditDrill({
  rows,
  duration,
  kpi,
  auditId,
  onAudit,
  onService,
  onBack,
}: {
  rows: Measurement[];
  duration: Duration;
  kpi: KpiKey;
  auditId: string;
  onAudit: (id: string) => void;
  onService?: (id: string) => void;
  onBack: () => void;
}) {
  const target = TARGETS[kpi];
  const kpiLabel = KPI_META.find((k) => k.key === kpi)?.label ?? 'Compliance';
  const isAll = auditId === ALL_AUDITS;
  const data = useMemo(() => auditDrill(rows, duration, kpi, auditId), [
    rows,
    duration,
    kpi,
    auditId,
  ]);

  const [view, setView] = useState<'report' | 'analytics'>('report');
  const [sort, setSort] = useState<Sort>('score-asc');
  const [size, setSize] = useState(10);
  const [page, setPage] = useState(0);
  const [deptSort, setDeptSort] = useState<'desc' | 'asc'>('asc');
  const [hidden, setHidden] = useState<string[]>([]);

  const scopeLabel = isAll
    ? `${AUDITS.length} audits in scope`
    : `${data.audit.cadence} cadence`;

  const auditRowsForKpi = useMemo(
    () => rows.filter((r) => isAll || r.auditId === auditId),
    [rows, auditId, isAll],
  );
  const trends = useMemo(
    () =>
      deptTrends(
        auditRowsForKpi,
        duration,
        kpi,
        TREND_LIMIT,
        deptSort === 'desc' ? 'best' : 'worst',
      ),
    [auditRowsForKpi, duration, kpi, deptSort],
  );
  const serviceSeries = useMemo(() => {
    const months = data.services[0]?.series.map((p) => p.month) ?? data.series.map((p) => p.month);
    return months.map((month, i) => {
      const point: Record<string, number | string> = { month };
      for (const s of data.services) point[s.service.short] = s.series[i]?.value ?? 0;
      return point;
    });
  }, [data.services, data.series]);
  const bands = useMemo(() => auditDistribution(data.depts), [data.depts]);
  const aligned = useMemo(() => {
    const all = auditRows(rows.filter((r) => r.kpi === kpi), duration);
    return isAll ? all : all.filter((a) => a.audit.id === auditId);
  }, [rows, kpi, duration, isAll, auditId]);

  const toggle = (k: string) =>
    setHidden(hidden.includes(k) ? hidden.filter((h) => h !== k) : [...hidden, k]);

  const sorted = useMemo(() => {
    const list = [...data.depts];
    if (sort === 'score-asc') list.sort((a, b) => a.score - b.score);
    if (sort === 'score-desc') list.sort((a, b) => b.score - a.score);
    if (sort === 'findings') list.sort((a, b) => b.openFindings - a.openFindings);
    if (sort === 'name') list.sort((a, b) => a.dept.name.localeCompare(b.dept.name));
    return list;
  }, [data.depts, sort]);

  const pages = Math.max(1, Math.ceil(sorted.length / size));
  const current = Math.min(page, pages - 1);
  const from = current * size;
  const visible = sorted.slice(from, from + size);

  const best = data.services[data.services.length - 1];
  const weakest = data.services[0];

  return (
    <div className="drill">
      <div className="drill-top">
        <button className="link-btn back" onClick={onBack}>
          ← Back
        </button>
        <div className="drill-views" role="tablist">
          <div className="seg">
            <button
              role="tab"
              aria-selected={view === 'report'}
              className={view === 'report' ? 'on' : ''}
              onClick={() => setView('report')}
            >
              Report
            </button>
            <button
              role="tab"
              aria-selected={view === 'analytics'}
              className={view === 'analytics' ? 'on' : ''}
              onClick={() => setView('analytics')}
            >
              Analytics
            </button>
          </div>
        </div>
        <label className="viewsel">
          <span>Audit</span>
          <select
            className="audit-select"
            value={auditId}
            onChange={(e) => onAudit(e.target.value)}
          >
            <option value={ALL_AUDITS}>All audits</option>
            {AUDITS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <header className="page-head">
        <h1 className="page-title">
          {view === 'analytics' ? 'Audit Analytics' : 'Audit Overview'}
          {!isAll && ` – ${data.audit.name}`}
        </h1>
        <p className="page-sub">
          {kpiLabel} · {serviceLabel(data.audit.serviceIds)} ·{' '}
          {scopeLabel} · {data.depts.length} departments
          · target {target}%
        </p>
      </header>

      {view === 'analytics' && (
        <section className="card">
          <div className="card-head">
            <div>
              <h2 className="card-title">
                {isAll ? 'All audits' : data.audit.name} — Analytics Report
              </h2>
              <p className="card-sub">
                {data.series.length} cycles: {data.series[0]?.month} →{' '}
                {data.series[data.series.length - 1]?.month} · {data.services.length} services ·{' '}
                {data.depts.length} departments
              </p>
            </div>
          </div>
          <div className="card-body">
            <div className="tiles">
              <div className="tile">
                <span className="lbl">Change over window</span>
                <b className="num">
                  {data.windowDelta >= 0 ? '+' : ''}
                  {data.windowDelta.toFixed(1)}pt
                </b>
                <span className="tile-foot">Last {duration} cycles</span>
              </div>
              <div className="tile">
                <span className="lbl">Strongest service</span>
                <b>{best?.service.name ?? '—'}</b>
                <span className="tile-foot num">{best ? `${best.score.toFixed(1)}%` : '—'}</span>
              </div>
              <div className="tile">
                <span className="lbl">Weakest service</span>
                <b>{weakest?.service.name ?? '—'}</b>
                <span className="tile-foot num">
                  {weakest ? `${weakest.score.toFixed(1)}%` : '—'}
                </span>
              </div>
              <div className="tile">
                <span className="lbl">Departments on target</span>
                <b className="num">
                  {data.depts.length - data.deptsBelowTarget}/{data.depts.length}
                </b>
                <span className="tile-foot">Target {target}%</span>
              </div>
            </div>

            <div className="chart-head">
              <p className="chart-title">{data.audit.name} compliance over time</p>
              <span className="chart-note num">
                now {data.score.toFixed(1)}% · <Delta value={data.monthDelta} />
              </span>
            </div>
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.series} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
                  <CartesianGrid stroke="var(--ink-100)" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis
                    domain={[0, 100]}
                    ticks={Y_TICKS}
                    tickFormatter={(v: number) => `${v}%`}
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                  />
                  <Tooltip content={<Tip />} />
                  <ReferenceLine
                    y={target}
                    stroke="var(--chart-axis)"
                    strokeDasharray="4 4"
                    label={{ value: `target ${target}%`, position: 'insideTopLeft', fontSize: 10 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={LINE_SHADES[2]}
                    strokeWidth={2.2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-head">
              <p className="chart-title">Service performance on this audit</p>
              <span className="chart-note">{serviceLabel(data.audit.serviceIds)}</span>
            </div>
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={serviceSeries} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
                  <CartesianGrid stroke="var(--ink-100)" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis
                    domain={[0, 100]}
                    ticks={Y_TICKS}
                    tickFormatter={(v: number) => `${v}%`}
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                  />
                  <Tooltip content={<Tip />} />
                  <ReferenceLine y={target} stroke="var(--chart-axis)" strokeDasharray="4 4" />
                  {data.services.map((s, i) => (
                    <Line
                      key={s.service.id}
                      type="monotone"
                      dataKey={s.service.short}
                      stroke={LINE_SHADES[i % LINE_SHADES.length]}
                      strokeWidth={1.8}
                      dot={false}
                      hide={hidden.includes(s.service.short)}
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-foot">
              {data.services.map((s, i) => (
                <label
                  key={s.service.id}
                  className={`legend-check ${hidden.includes(s.service.short) ? 'off' : ''}`}
                  title={`${s.service.name} · ${s.score.toFixed(1)}%`}
                >
                  <input
                    type="checkbox"
                    checked={!hidden.includes(s.service.short)}
                    onChange={() => toggle(s.service.short)}
                  />
                  <i style={{ background: LINE_SHADES[i % LINE_SHADES.length] }} />
                  {s.service.short}
                </label>
              ))}
            </div>

            <div className="chart-head">
              <p className="chart-title">Top 10 Department compliance over time</p>
              <div className="seg sm">
                <button
                  className={deptSort === 'desc' ? 'on' : ''}
                  onClick={() => setDeptSort('desc')}
                  title="Highest compliance first"
                >
                  ↓ Descending
                </button>
                <button
                  className={deptSort === 'asc' ? 'on' : ''}
                  onClick={() => setDeptSort('asc')}
                  title="Lowest compliance first"
                >
                  ↑ Ascending
                </button>
              </div>
            </div>
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends.series} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
                  <CartesianGrid stroke="var(--ink-100)" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis
                    domain={[0, 100]}
                    ticks={Y_TICKS}
                    tickFormatter={(v: number) => `${v}%`}
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                  />
                  <Tooltip content={<Tip />} />
                  <ReferenceLine y={target} stroke="var(--chart-axis)" strokeDasharray="4 4" />
                  {trends.depts.map((d, i) => (
                    <Line
                      key={d.key}
                      type="monotone"
                      dataKey={d.key}
                      stroke={LINE_SHADES[i % LINE_SHADES.length]}
                      strokeDasharray={dashFor(i)}
                      strokeWidth={1.8}
                      dot={false}
                      hide={hidden.includes(d.key)}
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-foot">
              {trends.depts.map((d, i) => (
                <label
                  key={d.key}
                  className={`legend-check ${hidden.includes(d.key) ? 'off' : ''}`}
                  title={`${d.dept.name} · ${d.score.toFixed(1)}%`}
                >
                  <input
                    type="checkbox"
                    checked={!hidden.includes(d.key)}
                    onChange={() => toggle(d.key)}
                  />
                  <i style={{ background: LINE_SHADES[i % LINE_SHADES.length] }} />
                  {d.key}
                </label>
              ))}
            </div>

            <div className="chart-head">
              <p className="chart-title">Department score distribution</p>
              <span className="chart-note num">
                {data.deptsAtRisk} of {data.depts.length} below {RISK_THRESHOLD}%
              </span>
            </div>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bands} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
                  <CartesianGrid stroke="var(--ink-100)" vertical={false} />
                  <XAxis dataKey="band" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} />
                  <Tooltip content={<Tip />} />
                  <Bar dataKey="count" fill={LINE_SHADES[0]} radius={[4, 4, 0, 0]} maxBarSize={64} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}

      <div className="drill-body" hidden={view !== 'report'}>
        <div className="rail">
          <section className="total-card">
            <p className="total-lbl">Total CIs checked</p>
            <span className="total-figure num">{fmt(data.ciChecked)}</span>
            <p className="total-new num">{fmt(data.newFindings)} New from last month</p>
            <div className="total-split">
              <span>
                <i className="lbl">Non-compliant</i>
                <b className="num">{fmt(data.nonCompliantCis)}</b>
              </span>
              <span>
                <i className="lbl">Compliant</i>
                <b className="num">{fmt(data.compliantCis)}</b>
              </span>
            </div>
          </section>

          <section className="attn">
            <header className="attn-head">
              <span className="attn-title">⚠ Attention Required</span>
            </header>
            <div className="attn-mini-stack">
              <article className="attn-mini">
                <span className="attn-mini-name">Departments below target</span>
                <span className="attn-mini-figure num">
                  {data.deptsBelowTarget}
                  <small>/{data.depts.length}</small>
                </span>
                <span className="attn-mini-foot num">Target {target}%</span>
              </article>
              <article className="attn-mini">
                <span className="attn-mini-name">Department at Risk</span>
                <span className="attn-mini-figure num">
                  {data.deptsAtRisk}
                  <small>/{data.depts.length}</small>
                </span>
                <span className="attn-mini-foot">Scoring below {RISK_THRESHOLD}% on this audit</span>
              </article>
              <article className="attn-mini">
                <span className="attn-mini-name">Open findings</span>
                <span className="attn-mini-figure num">{fmt(data.openFindings)}</span>
                <span className="attn-mini-foot num">
                  {data.servicesBelowTarget} of {data.services.length} services below target
                </span>
              </article>
            </div>
          </section>
        </div>

        <div className="rail">
          <section className="health">
            <header className="health-head">
              <span className={`health-badge num ${data.score >= target ? 'ok' : 'bad'}`}>
                {data.score.toFixed(0)}%
              </span>
              <div>
                <h2>Overall Health</h2>
                <p className={data.monthDelta >= 0 ? 'accent-ink' : 'bad'}>
                  {data.monthDelta >= 0 ? '+' : ''}
                  {data.monthDelta.toFixed(1)}% from last month
                </p>
              </div>
              <span className="health-scope">
                {serviceLabel(data.audit.serviceIds)} ·{' '}
                {scopeLabel} · coverage {data.coverage}%
                of departments
              </span>
            </header>
            <div className="health-tiles">
              {data.services.map((s) => (
                <article className="health-tile wide ref" key={s.service.id}>
                  <div className="health-tile-head">
                    <span className="health-tile-name">{s.service.name}</span>
                    {onService && (
                      <button
                        className="card-open"
                        title={`Open ${s.service.name} drill-down`}
                        aria-label={`Open ${s.service.name} drill-down`}
                        onClick={() => onService(s.service.id)}
                      >
                        →
                      </button>
                    )}
                  </div>
                  <div className="health-tile-top">
                    <span className={`health-tile-figure num ${s.score < target ? 'bad' : 'good'}`}>
                      {s.score.toFixed(1)}%
                    </span>
                    <Delta value={s.delta} />
                  </div>
                  <dl className="health-tile-list">
                    <div>
                      <dt>Open findings</dt>
                      <dd className="num">{fmt(s.openFindings)}</dd>
                    </div>
                    <div>
                      <dt>Non-compliant</dt>
                      <dd className="num">{s.nonCompliantPct.toFixed(1)}%</dd>
                    </div>
                    <div>
                      <dt>Audit Completed</dt>
                      <dd className="num">
                        {s.auditsOnTarget}/{s.auditsInScope}
                      </dd>
                    </div>
                    <div>
                      <dt>Department below target</dt>
                      <dd className="num">
                        {s.deptsBelow}/{s.depts}
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <div>
                <h2 className="card-title">Audits aligned</h2>
                <p className="card-sub">
                  {isAll
                    ? `${aligned.length} audits in scope · target ${target}% · click an audit to open it`
                    : `${data.audit.name} · ${serviceLabel(data.audit.serviceIds)} · target ${target}%`}
                </p>
              </div>
            </div>
            <div className="card-body flush">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Audit</th>
                    <th>Services aligned</th>
                    <th className="r">Score</th>
                    <th className="r">Trend</th>
                    <th className="r">Non-compliant</th>
                    <th className="r">Open findings</th>
                    <th className="r">New findings</th>
                  </tr>
                </thead>
                <tbody>
                  {aligned.map((a) => (
                    <tr
                      key={a.audit.id}
                      className={`row-link ${a.audit.id === auditId ? 'row-on' : ''}`}
                      onClick={() => onAudit(a.audit.id)}
                    >
                      <td className="primary">
                        <button className="link-btn" onClick={() => onAudit(a.audit.id)}>
                          {a.audit.name}
                        </button>
                      </td>
                      <td className="muted">{serviceLabel(a.audit.serviceIds)}</td>
                      <td className={`r num ${a.score < target ? 'bad' : 'good'}`}>
                        {a.score.toFixed(1)}%
                      </td>
                      <td className="r">
                        <Delta value={a.delta} />
                      </td>
                      <td className="r num">{a.nonCompliantPct.toFixed(1)}%</td>
                      <td className="r num">{fmt(a.openFindings)}</td>
                      <td className="r num">{fmt(a.newFindings)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <div>
                <h2 className="card-title">Audit Compliance Score Board</h2>
                <p className="card-sub">
                  {data.audit.name} · {data.depts.length} departments in scope · target {target}%
                </p>
              </div>
              <label className="viewsel">
                <span>↓</span>
                <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                  {SORTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="card-body flush">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th className="r">Score</th>
                    <th className="r">Services failing</th>
                    <th>Owner</th>
                    <th>Weakest service</th>
                    <th className="r">Open findings</th>
                    <th className="r">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((d) => (
                    <tr key={d.dept.id}>
                      <td className="primary">{d.dept.name}</td>
                      <td className={`r num ${d.score < RISK_THRESHOLD ? 'bad' : d.score >= target ? 'good' : ''}`}>
                        {d.score.toFixed(1)}%
                      </td>
                      <td className="r num">
                        {d.servicesBelow}/{d.servicesInScope}
                      </td>
                      <td className="muted">{d.dept.owner}</td>
                      <td className="muted">{d.worstService}</td>
                      <td className="r num">{fmt(d.openFindings)}</td>
                      <td className="r">
                        <Delta value={d.delta} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="pager">
                <label>
                  Rows per page:
                  <select
                    value={size}
                    onChange={(e) => {
                      setSize(Number(e.target.value));
                      setPage(0);
                    }}
                  >
                    {PAGE_SIZES.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <span className="num">
                  {sorted.length === 0 ? 0 : from + 1}-{Math.min(from + size, sorted.length)} of{' '}
                  {sorted.length}
                </span>
                <div className="pager-nav">
                  <button
                    onClick={() => setPage(Math.max(0, current - 1))}
                    disabled={current === 0}
                    aria-label="Previous page"
                  >
                    ‹
                  </button>
                  <button
                    onClick={() => setPage(Math.min(pages - 1, current + 1))}
                    disabled={current >= pages - 1}
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
    </div>
  );
}
