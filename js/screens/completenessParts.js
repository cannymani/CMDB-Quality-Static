import { html } from 'htm/react';
import { Fragment } from 'react';
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
  primaryPillarOf,
} from '../data/completeness.js';
import { fmt, Tip } from '../ui.js';
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
const dashFor = (i) => (i >= 9 ? '5 3' : undefined);
export function CategoryTrendChart({ duration, pillarId, scope = null, sort, hidden, onSort, onToggle }) {
  const trends = categoryTrends(duration, pillarId, 10, sort === 'desc' ? 'best' : 'worst', scope);
  return html`<${Fragment}><div className="chart-head"><p className="chart-title">Top 10 Category completeness over time</p><div className="seg sm"><button className=${sort === 'desc' ? 'on' : ''} onClick=${() => onSort('desc')}>↓ Descending</button><button className=${sort === 'asc' ? 'on' : ''} onClick=${() => onSort('asc')}>↑ Ascending</button></div></div><div style=${{
    height: 300,
  }}><${ResponsiveContainer} width="100%" height="100%"><${LineChart} data=${trends.series} margin=${{
    top: 8,
    right: 12,
    bottom: 0,
    left: -18,
  }}><${CartesianGrid} stroke="var(--ink-100)" vertical=${false}/><${XAxis} dataKey="month" tickLine=${false} axisLine=${false} fontSize=${11}/><${YAxis} domain=${[0, 100]} ticks=${Y_TICKS} tickFormatter=${(value) => `${value}%`} tickLine=${false} axisLine=${false} fontSize=${11}/><${Tooltip} content=${html`<${Tip} />`}/><${ReferenceLine} y=${COMPLETENESS_TARGET} stroke="var(--chart-axis)" strokeDasharray="4 4" label=${{
    value: `target ${COMPLETENESS_TARGET}%`,
    position: 'insideTopLeft',
    fontSize: 10,
  }}/>${trends.categories.map((view, i) => html`<${Line} key=${view.category.code} type="monotone" dataKey=${view.category.code} stroke=${LINE_SHADES[i % LINE_SHADES.length]} strokeDasharray=${dashFor(i)} strokeWidth=${1.8} dot=${false} hide=${hidden.includes(view.category.code)} isAnimationActive=${false} />`)}</${LineChart}></${ResponsiveContainer}></div><div className="chart-foot">${trends.categories.map(
    (view, i) =>
      html`<label
        key=${view.category.code}
        className=${`legend-check ${hidden.includes(view.category.code) ? 'off' : ''}`}
        title=${`${view.category.name} · ${view.score.toFixed(1)}%`}
        ><input
          type="checkbox"
          checked=${!hidden.includes(view.category.code)}
          onChange=${() => onToggle(view.category.code)}
        /><i
          style=${{
            background: LINE_SHADES[i % LINE_SHADES.length],
          }}
        />${view.category.code}</label
      >`,
  )}</div></${Fragment}>`;
}
export function AttributeGapTable({ duration, pillarId, scope = null, onAttribute }) {
  const gaps = attributeGaps(duration, pillarId, scope);
  return html`<table className="tbl">
    <thead>
      <tr>
        <th>Attribute</th>
        <th className="r">CIs missing</th>
        <th className="r">Categories affected</th>
      </tr>
    </thead>
    <tbody>
      ${gaps.map(
        (gap) =>
          html`<tr
            key=${gap.attribute}
            className=${onAttribute ? 'row-link' : ''}
            onClick=${onAttribute
              ? () => {
                  if (pillarId) onAttribute(gap.attribute);
                  else {
                    const destination = primaryPillarOf(gap.attribute);
                    if (destination) onAttribute(destination, gap.attribute);
                  }
                }
              : undefined}
          >
            <td className="primary">${gap.attribute}</td>
            <td className="r num">${fmt(gap.missingCis)}</td>
            <td className="r num">${gap.categories}/${gap.totalCategories}</td>
          </tr>`,
      )}
    </tbody>
  </table>`;
}
export function AttributeGapChart({ duration, pillarId, scope = null }) {
  const gaps = attributeGaps(duration, pillarId, scope);
  return html`<div className="completeness-gap-chart" style=${{
    height: 420,
  }}><${ResponsiveContainer} width="100%" height="100%"><${BarChart} data=${gaps} layout="vertical" margin=${{
    top: 8,
    right: 12,
    bottom: 0,
    left: 12,
  }}><${CartesianGrid} stroke="var(--ink-100)" horizontal=${false}/><${XAxis} type="number" tickLine=${false} axisLine=${false} fontSize=${11}/><${YAxis} type="category" dataKey="attribute" width=${170} tickLine=${false} axisLine=${false} fontSize=${11}/><${Tooltip} content=${html`<${Tip} />`}/><${Bar} dataKey="missingCis" fill="var(--accent)" radius=${[0, 4, 4, 0]} barSize=${14}/></${BarChart}></${ResponsiveContainer}></div>`;
}
export function PillarTrendChart({ duration, pillarId, scope = null }) {
  const view = pillarViews(duration, scope).find((item) => item.pillar.id === pillarId);
  return html`<div style=${{
    height: 300,
  }}><${ResponsiveContainer} width="100%" height="100%"><${LineChart} data=${view?.series ?? []} margin=${{
    top: 8,
    right: 12,
    bottom: 0,
    left: -18,
  }}><${CartesianGrid} stroke="var(--ink-100)" vertical=${false}/><${XAxis} dataKey="month" tickLine=${false} axisLine=${false} fontSize=${11}/><${YAxis} domain=${[0, 100]} ticks=${Y_TICKS} tickFormatter=${(value) => `${value}%`} tickLine=${false} axisLine=${false} fontSize=${11}/><${Tooltip} content=${html`<${Tip} />`}/><${ReferenceLine} y=${COMPLETENESS_TARGET} stroke="var(--chart-axis)" strokeDasharray="4 4" label=${{
    value: `target ${COMPLETENESS_TARGET}%`,
    position: 'insideTopLeft',
    fontSize: 10,
  }}/><${Line} type="monotone" dataKey="value" stroke=${LINE_SHADES[0]} strokeWidth=${2} dot=${false} isAnimationActive=${false}/></${LineChart}></${ResponsiveContainer}></div>`;
}
