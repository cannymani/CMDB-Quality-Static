import { html } from 'htm/react';
import { useState, Fragment } from 'react';
import { KPI_META, RELEASES, WORK_ITEMS } from '../data/demo.js';
import { Card, Meter, fmt } from '../ui.js';
const COLUMNS = ['Backlog', 'Discovery', 'In Build', 'In Validation', 'Live'];
export function Portal() {
  const [stream, setStream] = useState('All');
  const items = stream === 'All' ? WORK_ITEMS : WORK_ITEMS.filter((w) => w.stream === stream);
  const streams = ['All', 'Data Model', 'Automation', 'Reporting', 'Governance', 'Integration'];
  const uplift = items.reduce((a, w) => a + w.targetUplift, 0);
  const effort = items.reduce((a, w) => a + w.effortDays, 0);
  const live = WORK_ITEMS.filter((w) => w.status === 'Live').length;
  return html`<${Fragment}><div className="grid g4"><section className="card kpi-card"><div className="kpi-top"><div><p className="eyebrow">Initiatives in flight</p><div className="kpi-value num">${WORK_ITEMS.filter((w) => w.status !== 'Live').length}</div><p className="kpi-blurb">${live} delivered this year · 5 delivery stages</p></div></div></section><section className="card kpi-card"><div className="kpi-top"><div><p className="eyebrow">Forecast KPI uplift</p><div className="kpi-value num">+${uplift.toFixed(1)}<small>pt</small></div><p className="kpi-blurb">Combined target uplift across selected streams</p></div></div></section><section className="card kpi-card"><div className="kpi-top"><div><p className="eyebrow">Committed effort</p><div className="kpi-value num">${fmt(effort)}</div><p className="kpi-blurb">Person-days planned across the portfolio</p></div></div></section><section className="card kpi-card"><div className="kpi-top"><div><p className="eyebrow">Next release</p><div className="kpi-value">R26.09</div><p className="kpi-blurb">Window 01–14 Sep · 4 items · scope locked</p></div></div></section></div><${Card} title="Development board" sub="Remediation and dashboard build items moving through the delivery process" right=${html`<div className="seg">${streams.map((s) => html`<button key=${s} className=${stream === s ? 'on' : ''} onClick=${() => setStream(s)}>${s}</button>`)}</div>`}><div className="kanban">${COLUMNS.map(
    (col) => {
      const colItems = items.filter((w) => w.status === col);
      return html`<div className="col" key=${col}>
        <div className="col-head"><b>${col}</b><span className="num">${colItems.length}</span></div>
        ${colItems.map(
          (w) =>
            html`<article className="ticket" key=${w.id}>
              <div className="ticket-id">${w.id} · ${w.stream}</div>
              <p className="ticket-title">${w.title}</p>
              <${Meter} value=${w.progress} muted=${w.status === 'Backlog'} />
              <div
                className="ticket-foot"
                style=${{
                  marginTop: 8,
                }}
              >
                <span>${w.owner}</span
                ><span className=${w.impact === 'High' ? 'chip solid' : 'chip soft'}
                  >${w.impact}</span
                >
              </div>
              <div
                className="ticket-foot"
                style=${{
                  marginTop: 6,
                }}
              >
                <span>${KPI_META.find((k) => k.key === w.kpi).label}</span
                ><span className="num">+${w.targetUplift}pt · ${w.due}</span>
              </div>
            </article>`,
        )}${
          colItems.length === 0 &&
          html`<p
            style=${{
              fontSize: 11.5,
              color: 'var(--ink-500)',
              padding: '4px 6px',
            }}
          >
            No items
          </p>`
        }
      </div>`;
    },
  )}</div></${Card}><${Card} title="Portfolio detail" sub="All items with impact, effort and forecast uplift" flush><table className="tbl"><thead><tr><th>ID</th><th>Initiative</th><th>Stream</th><th>KPI</th><th>Owner</th><th>Status</th><th className="r">Effort</th><th className="r">Uplift</th><th style=${{
    width: 110,
  }}>Progress</th><th className="r">Due</th></tr></thead><tbody>${items.map(
    (w) =>
      html`<tr key=${w.id}>
        <td className="mono muted nw">${w.id}</td>
        <td className="primary nw">${w.title}</td>
        <td className="muted">${w.stream}</td>
        <td className="muted">${KPI_META.find((k) => k.key === w.kpi).label}</td>
        <td className="muted">${w.owner}</td>
        <td><span className=${w.status === 'Live' ? 'chip soft' : 'chip'}>${w.status}</span></td>
        <td className="r num">${w.effortDays}d</td>
        <td className="r num">+${w.targetUplift}pt</td>
        <td><${Meter} value=${w.progress} /></td>
        <td className="r muted nw">${w.due}</td>
      </tr>`,
  )}</tbody></table></${Card}><div className="grid g21"><${Card} title="Release plan" sub="Two-week delivery windows"><table className="tbl"><tbody>${RELEASES.map(
    (r) =>
      html`<tr key=${r.name}>
        <td
          style=${{
            paddingLeft: 0,
          }}
          className="primary"
        >
          ${r.name}
          <div
            style=${{
              fontSize: 11,
              color: 'var(--ink-500)',
            }}
          >
            ${r.window}
          </div>
        </td>
        <td className="r num">${r.items} items</td>
        <td
          className="r"
          style=${{
            paddingRight: 0,
          }}
        >
          <span className=${r.status === 'Locked' ? 'chip solid' : 'chip soft'}>${r.status}</span>
        </td>
      </tr>`,
  )}</tbody></table></${Card}><${Card} title="Process gates" sub="Definition of done for every KPI change"><ol style=${{
    margin: 0,
    paddingLeft: 18,
    fontSize: 12.5,
    color: 'var(--ink-600)',
    lineHeight: 1.9,
  }}><li>KPI definition signed off by service owner</li><li>Audit rule implemented & peer reviewed</li><li>Backtest on 3 months of CMDB history</li><li>Department pilot (5 departments) validated</li><li>Executive dashboard tile published</li><li>Post-release KPI review after 30 days</li></ol></${Card}></div></${Fragment}>`;
}
