import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Measurement } from '../data/demo';
import { AUDITS, KPI_META } from '../data/demo';
import {
  deptRows,
  distribution,
  healthIndex,
  months,
  serviceRows,
  type AttentionItem,
  type Duration,
  type KpiSummary,
} from '../data/select';
import { Card, Delta, Meter, SeverityChip, Spark, Tip, fmt, scoreShade } from '../ui';

export function Overview({
  rows,
  kpis,
  attention,
  duration,
}: {
  rows: Measurement[];
  kpis: KpiSummary[];
  attention: AttentionItem[];
  duration: Duration;
}) {
  const health = healthIndex(kpis);
  const svcs = serviceRows(rows, duration);
  const depts = deptRows(rows, duration);
  const dist = distribution(depts);
  const ms = months(duration);

  const trend = ms.map((month, i) => ({
    month,
    Compliance: kpis[0].series[i]?.value ?? 0,
    Completeness: kpis[1].series[i]?.value ?? 0,
    Correctness: kpis[2].series[i]?.value ?? 0,
  }));

  const totalCis = rows.reduce((a, r) => a + r.ciChecked, 0);
  const openFindings = rows.reduce((a, r) => a + r.openFindings, 0);
  const critical = attention.filter((a) => a.severity === 'Critical').length;
  const auditRuns = new Set(rows.map((r) => `${r.deptId}-${r.auditId}`)).size;

  return (
    <>
      {/* headline */}
      <div className="grid g4">
        <section className="card kpi-card">
          <div className="kpi-top">
            <div>
              <p className="eyebrow">CMDB Health Index</p>
              <div className="kpi-value num">
                {health.score.toFixed(1)}
                <small>/100</small>
              </div>
              <p className="kpi-blurb">Weighted across all {AUDITS.length} audits and 3 KPI pillars</p>
            </div>
            <span className="chip soft">{health.band}</span>
          </div>
          <Meter value={health.score} />
          <div className="kpi-foot">
            <span>vs. {duration}M start</span>
            <Delta value={health.delta} />
          </div>
        </section>

        {kpis.map((k) => {
          const gap = Number((k.score - k.target).toFixed(1));
          return (
            <section className="card kpi-card" key={k.key}>
              <div className="kpi-top">
                <div>
                  <p className="eyebrow">{k.label}</p>
                  <div className="kpi-value num">
                    {k.score.toFixed(1)}
                    <small>%</small>
                  </div>
                  <p className="kpi-blurb">{k.blurb}</p>
                </div>
                <Delta value={k.delta} />
              </div>
              <Spark data={k.series} />
              <div className="kpi-foot">
                <span>
                  Target {k.target}% · <b className="num">{gap >= 0 ? '+' : ''}{gap}pt</b>
                </span>
                <span className="num">{k.atRisk} depts at risk</span>
              </div>
            </section>
          );
        })}
      </div>

      {/* strip */}
      <section className="card">
        <div className="stat-strip">
          <div className="stat">
            <span>CIs evaluated in window</span>
            <b className="num">{fmt(totalCis)}</b>
            <i>across {new Set(rows.map((r) => r.deptId)).size} departments</i>
          </div>
          <div className="stat">
            <span>Open findings</span>
            <b className="num">{fmt(openFindings)}</b>
            <i>{fmt(Math.round(openFindings * 0.31))} breaching remediation SLA</i>
          </div>
          <div className="stat">
            <span>Critical attention items</span>
            <b className="num">{critical}</b>
            <i>{attention.length} items below 85% overall</i>
          </div>
          <div className="stat">
            <span>Audit runs completed</span>
            <b className="num">{fmt(auditRuns)}</b>
            <i>{AUDITS.length} audits × department scope</i>
          </div>
        </div>
      </section>

      {/* trend + attention */}
      <div className="grid g21">
        <Card
          title="KPI trend"
          sub={`Monthly weighted score · last ${duration} months`}
          right={
            <div className="legend">
              <span>
                <i style={{ background: 'var(--ink-900)' }} />
                Compliance
              </span>
              <span>
                <i style={{ background: 'var(--chart-axis)' }} />
                Completeness
              </span>
              <span>
                <i style={{ background: 'var(--ink-300)' }} />
                Correctness
              </span>
            </div>
          }
        >
          <div style={{ height: 268 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid stroke="#ebebeb" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={{ stroke: '#e0e0e0' }} />
                <YAxis domain={[70, 100]} tickLine={false} axisLine={false} />
                <Tooltip content={<Tip />} />
                <Line type="monotone" dataKey="Compliance" stroke="#111111" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Completeness" stroke="#7a7a7a" strokeWidth={2} dot={false} />
                <Line
                  type="monotone"
                  dataKey="Correctness"
                  stroke="#cfcfcf"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="4 3"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card
          title="Attention required"
          sub="Top 6 by lowest score"
          right={<span className="chip solid num">{critical} critical</span>}
          flush
        >
          <div className="attn-list">
            {attention.slice(0, 6).map((a, i) => (
              <div className="attn-row" key={a.id}>
                <span className="attn-rank">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <div className="attn-title">{a.audit.name}</div>
                  <div className="attn-meta">
                    <span>{a.dept.name}</span>
                    <SeverityChip level={a.severity} />
                  </div>
                </div>
                <div className="attn-score">
                  <b className="num">{a.score.toFixed(1)}</b>
                  <div>
                    <Delta value={a.delta} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* service matrix + distribution */}
      <div className="grid g21">
        <Card title="Service scorecard" sub="4 shared services × 3 common KPIs — darker means weaker">
          <div className="heat-head">
            <div>Service</div>
            {KPI_META.map((k) => (
              <div key={k.key}>{k.label}</div>
            ))}
            <div>Overall</div>
          </div>
          <div className="heat">
            {svcs.map((s) => (
              <div className="heat-row" key={s.service.id}>
                <div className="heat-name">
                  {s.service.name}
                  <small>
                    {s.audits} audits · {fmt(s.openFindings)} open findings
                  </small>
                </div>
                {KPI_META.map((k) => {
                  const v = s.scores[k.key];
                  const sh = scoreShade(v);
                  return (
                    <div
                      className="heat-cell num"
                      key={k.key}
                      style={{ background: sh.bg, color: sh.fg, borderColor: sh.border }}
                    >
                      {v.toFixed(1)}
                      <span>{k.label.slice(0, 4)}</span>
                    </div>
                  );
                })}
                <div className="heat-cell" style={{ background: 'var(--surface)' }}>
                  <b className="num">{s.overall.toFixed(1)}</b>
                  <Delta value={s.delta} />
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 11, color: 'var(--ink-500)', margin: '12px 0 0' }}>
            All 4 services are consumed by every department; scores are weighted by audit criticality.
          </p>
        </Card>

        <Card title="Department distribution" sub="Overall score bands across scope">
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dist} margin={{ top: 6, right: 8, bottom: 0, left: -22 }}>
                <CartesianGrid stroke="#ebebeb" vertical={false} />
                <XAxis dataKey="band" tickLine={false} axisLine={{ stroke: '#e0e0e0' }} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip content={<Tip />} />
                <Bar dataKey="count" name="Departments" radius={[3, 3, 0, 0]}>
                  {dist.map((d, i) => (
                    <Cell key={d.band} fill={['#111111', '#3d3d3d', '#a3a3a3', '#cfcfcf', '#e3e3e3'][i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <dl className="kv" style={{ marginTop: 14 }}>
            <dt>Median department score</dt>
            <dd className="num">
              {depts.length ? depts[Math.floor(depts.length / 2)].overall.toFixed(1) : '—'}
            </dd>
            <dt>Bottom decile</dt>
            <dd className="num">
              {depts.length ? depts[Math.max(0, Math.floor(depts.length * 0.1) - 1)].overall.toFixed(1) : '—'}
            </dd>
            <dt>Departments below 80</dt>
            <dd className="num">{depts.filter((d) => d.overall < 80).length}</dd>
          </dl>
        </Card>
      </div>
    </>
  );
}
