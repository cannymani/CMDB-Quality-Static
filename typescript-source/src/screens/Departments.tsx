import { useMemo, useState } from 'react';
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
import { auditById, deptRows, distribution, type DeptRow, type Duration } from '../data/select';
import { Card, Delta, Meter, Tip, fmt, scoreShade } from '../ui';

type SortKey = 'overall' | 'delta' | 'openFindings' | 'name' | KpiKey;

export function Departments({ rows, duration }: { rows: Measurement[]; duration: Duration }) {
  const all = useMemo(() => deptRows(rows, duration), [rows, duration]);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortKey>('overall');
  const [open, setOpen] = useState<DeptRow | null>(null);
  const dist = distribution(all);

  const shown = useMemo(() => {
    const filtered = q
      ? all.filter(
          (d) =>
            d.dept.name.toLowerCase().includes(q.toLowerCase()) ||
            d.dept.owner.toLowerCase().includes(q.toLowerCase()),
        )
      : all;
    const sorted = [...filtered].sort((a, b) => {
      if (sort === 'name') return a.dept.name.localeCompare(b.dept.name);
      if (sort === 'delta') return a.delta - b.delta;
      if (sort === 'openFindings') return b.openFindings - a.openFindings;
      if (sort === 'overall') return a.overall - b.overall;
      return a.scores[sort] - b.scores[sort];
    });
    return sorted;
  }, [all, q, sort]);

  const openDetail = open
    ? rows
        .filter((r) => r.deptId === open.dept.id)
        .map((r) => ({ row: r, audit: auditById.get(r.auditId)! }))
        .sort((a, b) => a.row.scores[a.row.scores.length - 1] - b.row.scores[b.row.scores.length - 1])
    : [];

  return (
    <>
      <div className="grid g21">
        <Card
          title={`Department ranking · ${shown.length} in scope`}
          sub="Weakest first · click a row for the department scorecard"
          right={
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                className="filter-search"
                style={{ width: 210, margin: 0 }}
                placeholder="Search department or owner…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <div className="seg">
                {(
                  [
                    ['overall', 'Score'],
                    ['delta', 'Trend'],
                    ['openFindings', 'Findings'],
                    ['name', 'A–Z'],
                  ] as [SortKey, string][]
                ).map(([k, label]) => (
                  <button key={k} className={sort === k ? 'on' : ''} onClick={() => setSort(k)}>
                    {label}
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
                  <th>Department</th>
                  <th>Owner</th>
                  {KPI_META.map((k) => (
                    <th className="r" key={k.key}>
                      {k.label}
                    </th>
                  ))}
                  <th className="r">Overall</th>
                  <th className="r">Change</th>
                  <th className="r nw">Failed audits</th>
                  <th className="r nw">Open findings</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((d) => (
                  <tr key={d.dept.id} onClick={() => setOpen(d)} style={{ cursor: 'pointer' }}>
                    <td className="primary nw">
                      {d.dept.name}
                      <div style={{ fontSize: 11, color: 'var(--ink-500)' }}>{fmt(d.dept.ciCount)} CIs</div>
                    </td>
                    <td className="muted nw">{d.dept.owner}</td>
                    {KPI_META.map((k) => {
                      const sh = scoreShade(d.scores[k.key]);
                      return (
                        <td className="r" key={k.key}>
                          <span
                            className="chip num"
                            style={{ background: sh.bg, color: sh.fg, borderColor: sh.border }}
                          >
                            {d.scores[k.key].toFixed(1)}
                          </span>
                        </td>
                      );
                    })}
                    <td className="r num primary">
                      {d.overall.toFixed(1)}
                      <Meter value={d.overall} />
                    </td>
                    <td className="r nw">
                      <Delta value={d.delta} />
                    </td>
                    <td className="r num">{d.failedAudits}</td>
                    <td className="r num">{fmt(d.openFindings)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card title="Score bands" sub="Departments per overall band">
            <div style={{ height: 170 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dist} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 6 }}>
                  <CartesianGrid stroke="#ebebeb" horizontal={false} />
                  <XAxis type="number" tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="band" tickLine={false} axisLine={false} width={52} />
                  <Tooltip content={<Tip />} />
                  <Bar dataKey="count" name="Departments" radius={[0, 3, 3, 0]}>
                    {dist.map((d, i) => (
                      <Cell key={d.band} fill={['#111111', '#3d3d3d', '#a3a3a3', '#cfcfcf', '#e3e3e3'][i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card title="Owner load" sub="Open findings by department owner">
            <table className="tbl">
              <tbody>
                {ownerLoad(all)
                  .slice(0, 8)
                  .map((o) => (
                    <tr key={o.owner}>
                      <td style={{ paddingLeft: 0 }}>{o.owner}</td>
                      <td style={{ width: 90 }}>
                        <Meter value={(o.findings / ownerLoad(all)[0].findings) * 100} />
                      </td>
                      <td className="r num" style={{ paddingRight: 0 }}>
                        {fmt(o.findings)}
                      </td>
                      <td className="r num muted" style={{ paddingRight: 0 }}>
                        {o.depts} dept
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </Card>
        </div>
      </div>

      {open && (
        <div className="drawer-back" onClick={() => setOpen(null)}>
          <aside className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <div>
                <p className="eyebrow">
                  {open.dept.unit} · {open.dept.region}
                </p>
                <h3>{open.dept.name}</h3>
                <p className="card-sub">
                  Owner {open.dept.owner} · {fmt(open.dept.ciCount)} CIs
                </p>
              </div>
              <button className="close" onClick={() => setOpen(null)}>
                ✕
              </button>
            </div>
            <div className="grid g3" style={{ gap: 8 }}>
              {KPI_META.map((k) => (
                <div className="card" style={{ padding: 12 }} key={k.key}>
                  <p className="eyebrow">{k.label}</p>
                  <div style={{ fontSize: 20, fontWeight: 400 }} className="num">
                    {open.scores[k.key].toFixed(1)}
                  </div>
                  <Meter value={open.scores[k.key]} />
                </div>
              ))}
            </div>
            <div>
              <p className="eyebrow" style={{ marginBottom: 8 }}>
                Weakest audits
              </p>
              <table className="tbl">
                <tbody>
                  {openDetail.slice(0, 8).map(({ row, audit }) => (
                    <tr key={audit.id}>
                      <td style={{ paddingLeft: 0 }}>
                        {audit.name}
                      </td>
                      <td className="r num" style={{ paddingRight: 0 }}>
                        {row.scores[row.scores.length - 1].toFixed(1)}
                      </td>
                      <td className="r num muted" style={{ paddingRight: 0 }}>
                        {fmt(row.openFindings)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="filter-btn on">Request remediation plan</button>
              <button className="filter-btn">Share scorecard</button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

function ownerLoad(rows: DeptRow[]) {
  const map = new Map<string, { owner: string; findings: number; depts: number }>();
  for (const r of rows) {
    const cur = map.get(r.dept.owner) ?? { owner: r.dept.owner, findings: 0, depts: 0 };
    cur.findings += r.openFindings;
    cur.depts += 1;
    map.set(r.dept.owner, cur);
  }
  return [...map.values()].sort((a, b) => b.findings - a.findings);
}
