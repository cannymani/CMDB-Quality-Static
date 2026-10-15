import type { ReactNode } from 'react';
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts';

export function Card({
  title,
  sub,
  right,
  children,
  flush,
}: {
  title?: string;
  sub?: string;
  right?: ReactNode;
  children: ReactNode;
  flush?: boolean;
}) {
  return (
    <section className="card">
      {(title || right) && (
        <div className="card-head">
          <div>
            {title && <h2 className="card-title">{title}</h2>}
            {sub && <p className="card-sub">{sub}</p>}
          </div>
          {right}
        </div>
      )}
      <div className={flush ? 'card-body flush' : 'card-body'}>{children}</div>
    </section>
  );
}

export function Delta({ value, suffix = 'pt' }: { value: number; suffix?: string }) {
  const cls = value > 0.05 ? 'up' : value < -0.05 ? 'down' : 'flat';
  // monotone convention: declines are rendered in full ink, improvements in mid grey
  const arrow = value > 0.05 ? '▲' : value < -0.05 ? '▼' : '■';
  return (
    <span className={`delta ${cls} num`}>
      <span className="arrow">{arrow}</span>
      {value > 0 ? '+' : ''}
      {value.toFixed(1)}
      {suffix}
    </span>
  );
}

/** Monotone severity token: darker = worse. */
export function scoreShade(score: number): { bg: string; fg: string; border: string } {
  if (score < 70) return { bg: 'var(--ink-900)', fg: '#fff', border: 'var(--ink-900)' };
  if (score < 80) return { bg: 'var(--ink-700)', fg: '#fff', border: 'var(--ink-700)' };
  if (score < 88) return { bg: 'var(--ink-300)', fg: 'var(--ink-900)', border: 'var(--ink-300)' };
  if (score < 94) return { bg: 'var(--ink-100)', fg: 'var(--ink-800)', border: 'var(--ink-200)' };
  return { bg: 'var(--surface)', fg: 'var(--ink-700)', border: 'var(--line)' };
}

export function SeverityChip({ level }: { level: 'Critical' | 'High' | 'Medium' }) {
  const cls = level === 'Critical' ? 'chip solid' : level === 'High' ? 'chip mid' : 'chip hatch';
  return <span className={cls}>{level}</span>;
}

export function Meter({
  value,
  muted,
  tone,
}: {
  value: number;
  muted?: boolean;
  tone?: 'ok' | 'bad';
}) {
  return (
    <div className="meter thin" aria-hidden>
      <i
        className={[muted ? 'muted' : '', tone ?? ''].filter(Boolean).join(' ')}
        style={{ width: `${Math.max(2, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export function Spark({ data }: { data: { month: string; value: number }[] }) {
  return (
    <div style={{ height: 44 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 3, right: 0, bottom: 0, left: 0 }}>
          <YAxis hide domain={['dataMin - 0.6', 'dataMax + 0.6']} />
          <defs>
            <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#111111" stopOpacity={0.16} />
              <stop offset="100%" stopColor="#111111" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke="#111111"
            strokeWidth={1.6}
            fill="url(#sparkFill)"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Tip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="tip">
      <b>{label}</b>
      {payload.map((p: any) => (
        <div key={p.name}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
        </div>
      ))}
    </div>
  );
}

export const fmt = (n: number) => n.toLocaleString('en-US');
