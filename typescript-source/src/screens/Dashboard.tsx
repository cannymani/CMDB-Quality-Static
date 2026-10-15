import { useMemo, useState } from 'react';
import {
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
  ALL_AUDITS,
  AUDITS,
  DEPARTMENTS,
  SERVICES,
  type KpiKey,
  type Measurement,
} from '../data/demo';
import {
  auditRows,
  auditTrends,
  deptRows,
  deptTrends,
  serviceCards,
  TARGETS,
  trendInsights,
  RISK_THRESHOLD,
  type Duration,
  type KpiSummary,
} from '../data/select';
import { Delta, fmt, Tip } from '../ui';

const ATTN_PAGE_SIZE = 6;

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

/** Palette has 9 colours; a 10th series reuses the first colour dashed. */
const dashFor = (i: number) => (i >= 9 ? ('5 3' as const) : undefined);

const TREND_LIMIT = 10;
const Y_TICKS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

export function Dashboard({
  rows,
  kpis,
  duration,
  kpi,
  onService,
  onAudit,
}: {
  rows: Measurement[];
  kpis: KpiSummary[];
  duration: Duration;
  kpi: KpiKey;
  onService: (serviceId: string) => void;
  onAudit: (auditId: string) => void;
}) {
  const target = TARGETS[kpi];
  const active = kpis.find((k) => k.key === kpi)!;

  const kpiRows = useMemo(() => rows.filter((r) => r.kpi === kpi), [rows, kpi]);
  const cards = useMemo(() => serviceCards(rows, duration, kpi), [rows, duration, kpi]);
  const audits = useMemo(() => auditRows(kpiRows, duration), [kpiRows, duration]);
  const depts = useMemo(() => deptRows(kpiRows, duration), [kpiRows, duration]);
  const insights = useMemo(() => trendInsights(audits, depts, kpi), [audits, depts, kpi]);

  const [attnPage, setAttnPage] = useState(0);
  const [hidden, setHidden] = useState<string[]>([]);
  const [panel, setPanel] = useState<'trends' | 'performance'>('trends');
  const [deptSort, setDeptSort] = useState<'desc' | 'asc'>('desc');

  const trends = useMemo(
    () => deptTrends(rows, duration, kpi, TREND_LIMIT, deptSort === 'desc' ? 'best' : 'worst'),
    [rows, duration, kpi, deptSort],
  );
  const auditTrend = useMemo(() => auditTrends(audits, TREND_LIMIT), [audits]);
  const cycleFrom = trends.series[0]?.month as string | undefined;
  const cycleTo = trends.series[trends.series.length - 1]?.month as string | undefined;

  const compliantCis = kpiRows.reduce((a, r) => a + r.compliantCis, 0);
  const nonCompliantCis = kpiRows.reduce((a, r) => a + r.nonCompliantCis, 0);
  const failed = audits.filter((a) => a.score < target);
  const band =
    active.score >= target ? 'On target' : active.score >= target - 5 ? 'Watch' : 'Off target';
  const worstRank = Math.max(...cards.map((c) => c.rank));

  const attnPages = Math.max(1, Math.ceil(failed.length / ATTN_PAGE_SIZE));
  const page = Math.min(attnPage, attnPages - 1);
  const visibleFailed = failed.slice(page * ATTN_PAGE_SIZE, (page + 1) * ATTN_PAGE_SIZE);
  const pageStep = (dir: -1 | 1) =>
    setAttnPage(Math.min(attnPages - 1, Math.max(0, page + dir)));

  const toggle = (k: string) =>
    setHidden(hidden.includes(k) ? hidden.filter((h) => h !== k) : [...hidden, k]);

  return (
    <>
      <div className="dash-body">
        {/* Left rail ------------------------------------------------------- */}
        <div className="rail">
          <section className="overall">
            <p className="overall-lbl">Overall {active.label}</p>
            <div className="overall-figure">
              <span className="num">{active.score.toFixed(1)}%</span>
              <span
                className={`overall-band ${
                  band === 'On target' ? 'ok' : band === 'Watch' ? 'warn' : 'bad'
                }`}
              >
                {band}
              </span>
            </div>
            <p className="overall-delta">
              <Delta value={active.delta} /> over last {duration} months · target{' '}
              <b className="num">{target}%</b>
            </p>
            <dl className="overall-facts">
              <div>
                <dt>Compliant CIs</dt>
                <dd className="num">{fmt(compliantCis)}</dd>
              </div>
              <div>
                <dt>Non-compliant CIs</dt>
                <dd className="num">{fmt(nonCompliantCis)}</dd>
              </div>
              <div>
                <dt>Audits below target</dt>
                <dd className="num">
                  {failed.length}/{audits.length}
                </dd>
              </div>
              <div>
                <dt>Depts below {RISK_THRESHOLD}%</dt>
                <dd className="num">
                  {active.atRisk}/{depts.length}
                </dd>
              </div>
            </dl>
            <p className="overall-scope">
              {AUDITS.length} audits · {SERVICES.length} services · {DEPARTMENTS.length} departments
            </p>
          </section>

          <div className="svc-stack">
            {cards.map((c) => (
              <button
                key={c.service.id}
                className={`svc-card ${c.rank === worstRank ? 'weak' : ''}`}
                onClick={() => onService(c.service.id)}
                title={`Open ${c.service.name} drill-down`}
              >
                <div className="svc-head">
                  <span className="svc-name">{c.service.name}</span>
                  <span className="card-open" aria-hidden>
                    →
                  </span>
                </div>
                <div className="svc-figure">
                  <span className="num svc-score">{c.score.toFixed(0)}%</span>
                  <span className={`svc-trend num ${c.delta < 0 ? 'down' : ''}`}>
                    {c.delta >= 0 ? '↑' : '↓'}
                    {Math.abs(c.delta).toFixed(0)}% from last month
                  </span>
                </div>
                <div className="svc-split">
                  <span>
                    <i className="lbl">Non-compliant</i>
                    <b className="num bad">{fmt(c.nonCompliantCis)}</b>
                  </span>
                  <span>
                    <i className="lbl">Compliant</i>
                    <b className="num good">{fmt(c.compliantCis)}</b>
                  </span>
                  <span>
                    <i className="lbl">Audits on target</i>
                    <b className={`num ${c.failing > 0 ? 'bad' : 'good'}`}>
                      {c.audits - c.failing}/{c.audits}
                    </b>
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right column ---------------------------------------------------- */}
        <div className="rail">
          <section className="attn">
            <header className="attn-head">
              <span className="attn-title">⚠ Attention Required</span>
              <button
                className="link-btn"
                onClick={() => onAudit(ALL_AUDITS)}
              >
                All audits →
              </button>
            </header>
            {/* keyed on the page so the cards re-enter with the stagger animation */}
            <div className="attn-strip" key={page}>
              {visibleFailed.map((a) => (
                <article
                  className="attn-card"
                  key={a.audit.id}
                  role="button"
                  tabIndex={0}
                  title={`Open ${a.audit.name} drill-down`}
                  onClick={() => onAudit(a.audit.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') onAudit(a.audit.id);
                  }}
                >
                  <div className="attn-card-head">
                    <span className="attn-card-name">{a.audit.name}</span>
                    <span className="card-open" aria-hidden>
                      →
                    </span>
                  </div>
                  <span className="attn-figure num">{fmt(a.openFindings)}</span>
                  <span className="attn-sub num">{fmt(a.newFindings)} New Findings</span>
                  <span className="attn-foot num">{a.nonCompliantPct.toFixed(1)}% non-compliant</span>
                </article>
              ))}
              {failed.length === 0 && (
                <p className="empty">All {active.label.toLowerCase()} audits are at or above target.</p>
              )}
            </div>
            <div className="attn-nav">
              <button onClick={() => pageStep(-1)} disabled={page === 0} aria-label="Previous audits">
                ‹
              </button>
              <button
                onClick={() => pageStep(1)}
                disabled={page >= attnPages - 1}
                aria-label="More audits"
              >
                ›
              </button>
            </div>
          </section>

          <section className="panel">
            <header className="panel-head">
              <div>
                <h2>Audit Trends Analysis</h2>
                <p className="panel-sub">
                  {duration} cycles: {cycleFrom} → {cycleTo}
                </p>
              </div>
              <div className="seg">
                <button
                  className={panel === 'trends' ? 'on' : ''}
                  onClick={() => setPanel('trends')}
                >
                  Department trends
                </button>
                <button
                  className={panel === 'performance' ? 'on' : ''}
                  onClick={() => setPanel('performance')}
                >
                  Audit performance
                </button>
              </div>
            </header>

            <div className="grid g4 tiles">
              <div className="tile">
                <span className="lbl">
                  {panel === 'trends' ? 'Avg audit change' : 'Avg audit improvement'}
                </span>
                <b className="num accent-ink">
                  {insights.avgAuditChange > 0 ? '+' : ''}
                  {insights.avgAuditChange.toFixed(1)}pt
                </b>
                <span className="tile-foot accent-ink">
                  {insights.avgAuditChange >= 0 ? '↑ improving' : '↓ declining'}
                </span>
              </div>

              {panel === 'trends' ? (
                <div className="tile">
                  <span className="lbl">Most improved</span>
                  <b className="accent-ink">{insights.mostImproved?.audit.name ?? '—'}</b>
                  <span className="tile-foot accent-ink">
                    {insights.mostImproved
                      ? `+${insights.mostImproved.delta.toFixed(1)}pt over ${duration} cycles`
                      : '—'}
                  </span>
                </div>
              ) : (
                <div className="tile">
                  <span className="lbl">Strongest audit</span>
                  <b className="accent-ink">{insights.strongest?.audit.name ?? '—'}</b>
                  <span className="tile-foot accent-ink">
                    {insights.strongest
                      ? `${insights.strongest.score.toFixed(1)}% · ${
                          insights.strongest.delta >= 0 ? '+' : ''
                        }${insights.strongest.delta.toFixed(1)}pt`
                      : '—'}
                  </span>
                </div>
              )}

              <div className="tile">
                <span className="lbl">{panel === 'trends' ? 'Most critical' : 'Weakest audit'}</span>
                <b className="bad">{insights.mostCritical?.audit.name ?? '—'}</b>
                <span className="tile-foot bad">
                  {insights.mostCritical
                    ? `${insights.mostCritical.score.toFixed(1)}% · ${
                        insights.mostCritical.delta >= 0 ? '+' : ''
                      }${insights.mostCritical.delta.toFixed(1)}pt`
                    : '—'}
                </span>
              </div>

              {panel === 'trends' ? (
                <div className="tile">
                  <span className="lbl">Stable departments</span>
                  <b className="num">{insights.stableDepts}</b>
                  <span className="tile-foot">Out of {insights.totalDepts} departments</span>
                </div>
              ) : (
                <div className="tile">
                  <span className="lbl">Most volatile audit</span>
                  <b>{insights.mostVolatile?.audit.name ?? '—'}</b>
                  <span className="tile-foot">
                    {insights.volatility.toFixed(1)}pt swing over {duration} cycles
                  </span>
                </div>
              )}
            </div>

            {panel === 'trends' ? (
              <>
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
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={trends.series}
                      margin={{ top: 8, right: 12, bottom: 0, left: -18 }}
                    >
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
              </>
            ) : (
              <>
                <div className="chart-head">
                  <p className="chart-title">Top 10 Audit type performance</p>
                  <button
                    className="link-btn"
                    onClick={() => onAudit(ALL_AUDITS)}
                  >
                    View all {audits.length} audits →
                  </button>
                </div>
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={auditTrend.series}
                      margin={{ top: 8, right: 12, bottom: 0, left: -18 }}
                    >
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
                      {auditTrend.audits.map((a, i) => (
                        <Line
                          key={a.key}
                          type="monotone"
                          dataKey={a.key}
                          stroke={LINE_SHADES[i % LINE_SHADES.length]}
                          strokeDasharray={dashFor(i)}
                          strokeWidth={1.8}
                          dot={false}
                          hide={hidden.includes(a.key)}
                          isAnimationActive={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="chart-foot">
                  {auditTrend.audits.map((a, i) => (
                    <label
                      key={a.key}
                      className={`legend-check ${hidden.includes(a.key) ? 'off' : ''}`}
                      title={`${a.audit.name} · ${a.score.toFixed(1)}%`}
                    >
                      <input
                        type="checkbox"
                        checked={!hidden.includes(a.key)}
                        onChange={() => toggle(a.key)}
                      />
                      <i style={{ background: LINE_SHADES[i % LINE_SHADES.length] }} />
                      {a.audit.name}
                    </label>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
