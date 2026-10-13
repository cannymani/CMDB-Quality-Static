import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { KPI_META, type KpiKey, type Measurement } from '../data/demo';
import { auditRows, serviceLabel, type AuditRow, type Duration } from '../data/select';
import { Card, Delta, Meter, Spark, Tip, fmt, scoreShade } from '../ui';

export function Audits({ rows, duration }: { rows: Measurement[]; duration: Duration }) {
  const all = auditRows(rows, duration);
  const [kpi, setKpi] = useState<'all' | KpiKey>('all');
  const [open, setOpen] = useState<AuditRow | null>(null);

  const shown = kpi === 'all' ? all : auditRows(rows.filter((r) => r.kpi === kpi), duration);
  const chart = [...shown].map((a) => ({
    code: a.audit.code,
    name: a.audit.name,
    score: a.score,
  }));

  return (
    <>
      <Card
        title="Audit score ranking"
        sub="All audits in scope, weakest on the left — darker bars are further below the 80% risk threshold"
        right={
          <div className="seg">
            <button className={kpi === 'all' ? 'on' : ''} onClick={() => setKpi('all')}>
              All {all.length}
            </button>
            {KPI_META.map((k) => (
              <button key={k.key} className={kpi === k.key ? 'on' : ''} onClick={() => setKpi(k.key)}>
                {k.label}
              </button>
            ))}
          </div>
        }
      >
        <div style={{ height: 250 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ top: 6, right: 8, bottom: 0, left: -22 }}>
              <CartesianGrid stroke="#ebebeb" vertical={false} />
              <XAxis dataKey="code" tickLine={false} axisLine={{ stroke: '#e0e0e0' }} interval={0} />
              <YAxis domain={[60, 100]} tickLine={false} axisLine={false} />
              <Tooltip content={<Tip />} />
              <Bar dataKey="score" name="Score" radius={[3, 3, 0, 0]}>
                {chart.map((c) => (
                  <Cell key={c.code} fill={scoreShade(c.score).bg === 'var(--surface)' ? '#e3e3e3' : shadeHex(c.score)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title={`Audit inventory · ${shown.length} audits`} sub="Click any row to inspect the audit" flush>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Code</th>
                <th>Audit</th>
                <th>Service</th>
                {kpi !== 'all' && <th>KPI</th>}
                <th>Weight</th>
                <th className="r">Score</th>
                <th className="r">Change</th>
                <th style={{ width: 120 }}>Trend</th>
                <th className="r">Coverage</th>
                <th className="r">Open findings</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((a) => {
                const sh = scoreShade(a.score);
                return (
                  <tr key={a.audit.id} onClick={() => setOpen(a)} style={{ cursor: 'pointer' }}>
                    <td className="mono muted">{a.audit.code}</td>
                    <td className="primary">{a.audit.name}</td>
                    <td className="muted">{serviceLabel(a.audit.serviceIds)}</td>
                    {kpi !== 'all' && <td className="muted">{KPI_META.find((item) => item.key === kpi)!.label}</td>}
                    <td className="num muted">×{a.audit.weight}</td>
                    <td className="r">
                      <span
                        className="chip num"
                        style={{ background: sh.bg, color: sh.fg, borderColor: sh.border }}
                      >
                        {a.score.toFixed(1)}
                      </span>
                    </td>
                    <td className="r">
                      <Delta value={a.delta} />
                    </td>
                    <td>
                      <Meter value={a.score} />
                    </td>
                    <td className="r num">{a.coverage}%</td>
                    <td className="r num">{fmt(a.openFindings)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {open && (
        <div className="drawer-back" onClick={() => setOpen(null)}>
          <aside className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <div>
                <p className="eyebrow">
                  {open.audit.code} · {serviceLabel(open.audit.serviceIds)}
                </p>
                <h3>{open.audit.name}</h3>
              </div>
              <button className="close" onClick={() => setOpen(null)}>
                ✕
              </button>
            </div>
            <Spark data={open.series} />
            <dl className="kv">
              <dt>Current score</dt>
              <dd className="num">{open.score.toFixed(1)}%</dd>
              <dt>Change in window</dt>
              <dd>
                <Delta value={open.delta} />
              </dd>
              <dt>KPI pillar</dt>
              <dd>{kpi === 'all' ? 'All pillars' : KPI_META.find((item) => item.key === kpi)!.label}</dd>
              <dt>Cadence</dt>
              <dd>{open.audit.cadence}</dd>
              <dt>Ruleset</dt>
              <dd>{open.audit.rulesetVersion}</dd>
              <dt>Criticality weight</dt>
              <dd className="num">×{open.audit.weight}</dd>
              <dt>CIs checked</dt>
              <dd className="num">{fmt(open.ciChecked)}</dd>
              <dt>Open findings</dt>
              <dd className="num">{fmt(open.openFindings)}</dd>
              <dt>Departments below 80</dt>
              <dd className="num">{open.deptsBelow}</dd>
            </dl>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="filter-btn on">Open findings list</button>
              <button className="filter-btn">Notify owner</button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

function shadeHex(score: number): string {
  if (score < 70) return '#111111';
  if (score < 80) return '#3d3d3d';
  if (score < 88) return '#7a7a7a';
  if (score < 94) return '#cfcfcf';
  return '#e3e3e3';
}
