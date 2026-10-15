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
import {
  COMPLETENESS_TARGET,
  attributeGaps,
  categoryTrends,
  pillarViews,
  type PillarId,
} from '../data/completeness';
import { fmt, Tip } from '../ui';

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
const Y_TICKS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const dashFor = (i: number) => (i >= 9 ? ('5 3' as const) : undefined);

export function CategoryTrendChart({
  duration,
  pillarId,
  sort,
  hidden,
  onSort,
  onToggle,
}: {
  duration: number;
  pillarId: PillarId;
  sort: 'desc' | 'asc';
  hidden: string[];
  onSort: (sort: 'desc' | 'asc') => void;
  onToggle: (key: string) => void;
}) {
  const trends = categoryTrends(duration, pillarId, 10, sort === 'desc' ? 'best' : 'worst');

  return (
    <>
      <div className="chart-head">
        <p className="chart-title">Top 10 Category completeness over time</p>
        <div className="seg sm">
          <button className={sort === 'desc' ? 'on' : ''} onClick={() => onSort('desc')}>
            ↓ Descending
          </button>
          <button className={sort === 'asc' ? 'on' : ''} onClick={() => onSort('asc')}>
            ↑ Ascending
          </button>
        </div>
      </div>
      <div style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trends.series} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
            <CartesianGrid stroke="var(--ink-100)" vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
            <YAxis
              domain={[0, 100]}
              ticks={Y_TICKS}
              tickFormatter={(value: number) => `${value}%`}
              tickLine={false}
              axisLine={false}
              fontSize={11}
            />
            <Tooltip content={<Tip />} />
            <ReferenceLine
              y={COMPLETENESS_TARGET}
              stroke="var(--chart-axis)"
              strokeDasharray="4 4"
              label={{
                value: `target ${COMPLETENESS_TARGET}%`,
                position: 'insideTopLeft',
                fontSize: 10,
              }}
            />
            {trends.categories.map((view, i) => (
              <Line
                key={view.category.code}
                type="monotone"
                dataKey={view.category.code}
                stroke={LINE_SHADES[i % LINE_SHADES.length]}
                strokeDasharray={dashFor(i)}
                strokeWidth={1.8}
                dot={false}
                hide={hidden.includes(view.category.code)}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-foot">
        {trends.categories.map((view, i) => (
          <label
            key={view.category.code}
            className={`legend-check ${hidden.includes(view.category.code) ? 'off' : ''}`}
            title={`${view.category.name} · ${view.score.toFixed(1)}%`}
          >
            <input
              type="checkbox"
              checked={!hidden.includes(view.category.code)}
              onChange={() => onToggle(view.category.code)}
            />
            <i style={{ background: LINE_SHADES[i % LINE_SHADES.length] }} />
            {view.category.code}
          </label>
        ))}
      </div>
    </>
  );
}

export function AttributeGapTable({
  duration,
  pillarId,
}: {
  duration: number;
  pillarId: PillarId;
}) {
  const gaps = attributeGaps(duration, pillarId);

  return (
    <table className="tbl">
      <thead>
        <tr>
          <th>Attribute</th>
          <th className="r">CIs missing</th>
          <th className="r">Categories affected</th>
        </tr>
      </thead>
      <tbody>
        {gaps.map((gap) => (
          <tr key={gap.attribute}>
            <td className="primary">{gap.attribute}</td>
            <td className="r num">{fmt(gap.missingCis)}</td>
            <td className="r num">
              {gap.categories}/{gap.totalCategories}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function AttributeGapChart({
  duration,
  pillarId,
}: {
  duration: number;
  pillarId: PillarId;
}) {
  const gaps = attributeGaps(duration, pillarId);

  return (
    <div className="completeness-gap-chart" style={{ height: 420 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={gaps}
          layout="vertical"
          margin={{ top: 8, right: 12, bottom: 0, left: 12 }}
        >
          <CartesianGrid stroke="var(--ink-100)" horizontal={false} />
          <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} />
          <YAxis
            type="category"
            dataKey="attribute"
            width={170}
            tickLine={false}
            axisLine={false}
            fontSize={11}
          />
          <Tooltip content={<Tip />} />
          <Bar dataKey="missingCis" fill="var(--accent)" radius={[0, 4, 4, 0]} barSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PillarTrendChart({
  duration,
  pillarId,
}: {
  duration: number;
  pillarId: PillarId;
}) {
  const view = pillarViews(duration).find((item) => item.pillar.id === pillarId);

  return (
    <div style={{ height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={view?.series ?? []} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="var(--ink-100)" vertical={false} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
          <YAxis
            domain={[0, 100]}
            ticks={Y_TICKS}
            tickFormatter={(value: number) => `${value}%`}
            tickLine={false}
            axisLine={false}
            fontSize={11}
          />
          <Tooltip content={<Tip />} />
          <ReferenceLine
            y={COMPLETENESS_TARGET}
            stroke="var(--chart-axis)"
            strokeDasharray="4 4"
            label={{
              value: `target ${COMPLETENESS_TARGET}%`,
              position: 'insideTopLeft',
              fontSize: 10,
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={LINE_SHADES[0]}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
