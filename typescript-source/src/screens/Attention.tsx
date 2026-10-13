import { useState } from 'react';
import { KPI_META } from '../data/demo';
import type { AttentionItem } from '../data/select';
import { Card, Delta, SeverityChip, fmt } from '../ui';

type Sev = 'All' | 'Critical' | 'High' | 'Medium';

export function Attention({ items }: { items: AttentionItem[] }) {
  const [sev, setSev] = useState<Sev>('All');
  const [kpi, setKpi] = useState<string>('all');
  const [selected, setSelected] = useState<AttentionItem | null>(null);

  const shown = items.filter(
    (i) => (sev === 'All' || i.severity === sev) && (kpi === 'all' || i.kpi === kpi),
  );

  const counts = {
    Critical: items.filter((i) => i.severity === 'Critical').length,
    High: items.filter((i) => i.severity === 'High').length,
    Medium: items.filter((i) => i.severity === 'Medium').length,
  };

  return (
    <>
      <div className="grid g4">
        {(
          [
            ['Critical', counts.Critical, 'Below 70% or falling fast'],
            ['High', counts.High, 'Below the 80% risk threshold'],
            ['Medium', counts.Medium, 'Below 85% or negative trend'],
            ['SLA breaches', items.filter((i) => i.slaBreachDays > 30).length, 'Open beyond 30 days'],
          ] as const
        ).map(([label, value, hint]) => (
          <section className="card kpi-card" key={label}>
            <div className="kpi-top">
              <div>
                <p className="eyebrow">{label}</p>
                <div className="kpi-value num">{value}</div>
                <p className="kpi-blurb">{hint}</p>
              </div>
            </div>
          </section>
        ))}
      </div>

      <Card
        title={`Ranked attention queue · ${shown.length} items`}
        sub="Department × audit combinations that need an owner decision"
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="seg">
              {(['All', 'Critical', 'High', 'Medium'] as Sev[]).map((s) => (
                <button key={s} className={sev === s ? 'on' : ''} onClick={() => setSev(s)}>
                  {s}
                </button>
              ))}
            </div>
            <div className="seg">
              <button className={kpi === 'all' ? 'on' : ''} onClick={() => setKpi('all')}>
                All KPIs
              </button>
              {KPI_META.map((k) => (
                <button key={k.key} className={kpi === k.key ? 'on' : ''} onClick={() => setKpi(k.key)}>
                  {k.label}
                </button>
              ))}
            </div>
          </div>
        }
        flush
      >
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Audit</th>
                <th>Department</th>
                <th>Service</th>
                <th>KPI</th>
                <th className="r">Score</th>
                <th className="r">Trend</th>
                <th className="r">Open findings</th>
                <th className="r">SLA age</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {shown.slice(0, 120).map((i) => (
                <tr key={i.id}>
                  <td>
                    <SeverityChip level={i.severity} />
                  </td>
                  <td className="primary">{i.audit.name}</td>
                  <td>{i.dept.name}</td>
                  <td className="muted">{i.serviceName}</td>
                  <td className="muted">{KPI_META.find((k) => k.key === i.kpi)!.label}</td>
                  <td className="r num primary">{i.score.toFixed(1)}</td>
                  <td className="r">
                    <Delta value={i.delta} />
                  </td>
                  <td className="r num">{fmt(i.openFindings)}</td>
                  <td className="r num muted">{i.slaBreachDays ? `${i.slaBreachDays}d` : '—'}</td>
                  <td className="r">
                    <button className="link-btn" onClick={() => setSelected(i)}>
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {selected && (
        <div className="drawer-back" onClick={() => setSelected(null)}>
          <aside className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <div>
                <p className="eyebrow">{selected.audit.code} · {selected.serviceName}</p>
                <h3>{selected.audit.name}</h3>
                <p className="card-sub">{selected.dept.name}</p>
              </div>
              <button className="close" onClick={() => setSelected(null)}>
                ✕
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <SeverityChip level={selected.severity} />
              <span className="chip soft">{selected.audit.cadence}</span>
              <span className="chip soft">Ruleset {selected.audit.rulesetVersion}</span>
            </div>
            <dl className="kv">
              <dt>Current score</dt>
              <dd className="num">{selected.score.toFixed(1)}%</dd>
              <dt>Change in window</dt>
              <dd>
                <Delta value={selected.delta} />
              </dd>
              <dt>Open findings</dt>
              <dd className="num">{fmt(selected.openFindings)}</dd>
              <dt>SLA age</dt>
              <dd className="num">{selected.slaBreachDays ? `${selected.slaBreachDays} days` : 'within SLA'}</dd>
              <dt>Department owner</dt>
              <dd>{selected.dept.owner}</dd>
              <dt>Region / unit</dt>
              <dd>
                {selected.dept.region} · {selected.dept.unit}
              </dd>
              <dt>Last run</dt>
              <dd>{selected.lastRun}</dd>
            </dl>
            <div>
              <p className="eyebrow" style={{ marginBottom: 8 }}>
                Suggested action
              </p>
              <p style={{ fontSize: 12.5, color: 'var(--ink-600)', lineHeight: 1.6, margin: 0 }}>
                Assign a remediation owner, set a 30-day target of{' '}
                <b className="num">{Math.min(95, Math.round(selected.score + 8))}%</b> and link the fix to the
                current release in the Delivery Portal. Escalate to the service owner if the score does not
                improve by the next audit run.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="filter-btn on">Assign owner</button>
              <button className="filter-btn">Add to release</button>
              <button className="filter-btn">Accept risk</button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
