# CMDB Quality — Executive KPI Dashboard

Static HTML / CSS / JavaScript version of the CMDB quality dashboard for **Compliance**,
**Completeness** and **Correctness**. There is no build step and no backend: open it from any static
host, including GitHub Pages.

> **Demo data only.** All figures are produced in the browser by `js/data/demo.js` and
> `js/data/completeness.js` (19 audits, 4 services, 120 departments; Data Center: 40 classes / 40
> attributes, Network: 21 / 19, Workplace: 11 / 19). The dashboard is not connected to ServiceNow
> or any other CMDB.
>
> Per-class attribute mapping is not modelled yet; each class uses its pillar's full attribute list.
> Department completeness is a deterministic demo allocation because the completeness source data
> has no department dimension.
> Completeness targets 95%. Department filters and owner search links scope Completeness views;
> service navigation can set a Service chip, but services do not apply because there is no
> service-to-class mapping. Department allocations are deterministic and satisfy missing CIs ≤
> incomplete CIs ≤ total CIs per department. Trends use 12 monthly per-class demo snapshots; there
> are no CI-level records.
> The Completeness overview has four KPI cards (Overall completeness, Attribute completeness,
> Classes below target, Departments below target) and a Cross-category insight panel with one
> column each for Data Center, Network and Workplace, with insights computed from demo data.
> Attribute completeness = missing mandatory values ÷ (CIs × mandatory attributes of the class).

## Run locally

ES modules do not load from `file://`, so serve the folder over HTTP:

```bash
python3 -m http.server 8080        # or: npx serve .
# then open http://localhost:8080/
```

You don't need Node, npm or a bundler. To check the GitHub Pages sub-path locally, serve the parent
folder and open `http://localhost:8080/CMDB-Quality/`.

## Deploy to GitHub Pages

1. Push this folder to the repository's default branch (for example `main`).
2. Go to **Settings → Pages → Build and deployment**. Set **Source** to *Deploy from a branch*,
   **Branch** to `main`, and the folder to `/ (root)`.
3. The site is published at `https://<user>.github.io/CMDB-Quality/`.

You don't need a GitHub Actions workflow.

- `.nojekyll` turns off Jekyll processing.
- All asset, module and import-map paths are relative, so the app works under any repository
  sub-path.
- Routing uses the URL hash (`#/…`), so deep links and page refreshes work without server rewrites.

## Pages and routes

| Route | Page |
| --- | --- |
| `#/` | Home. Opens on **Overview** (enterprise view of all three factors). The pills Overview · Compliance · Completeness · Correctness pick the view: Compliance and Correctness use the KPI dashboard layout with their own scores and targets; Completeness shows the category-led overview. The logo returns to Overview. |
| `#/service/<id>` | Service drill-down (Report / Analytics). `svc-bapp`, `svc-appsvc`, `svc-offering`, `svc-bsvc` |
| `#/audit/all` | All-audits overview (Report / Analytics) |
| `#/audit/<id>` | Single-audit drill-down, `A-01` … `A-19` |
| `#/pillar/<id>` | Completeness pillar drill-down: categories, attributes and an attribute detail table. `pil-dc`, `pil-network`, `pil-workplace` |
| `#/attribute/<pillarId>/<attribute>[/<categoryId>]` | Attribute drill-down, optionally scoped to one class; attribute values are URL-encoded. |

Every page includes the global search (audits, services, pillars, categories, attributes, departments,
owners; ↑ ↓ Enter Esc), the **View** selector, and a filter bar with Departments and the reporting
period. Owner scopes are applied through owner search results, and service scopes through service
navigation; both appear as chips while active. There are no Department owner or Services filter-bar
dropdowns.

Pillar pages have a pillar selector instead of a Back link; the other-pillar shortcut cards have been
removed. Attribute cards and gap-table rows open the attribute drill-down. Its department breakdown
is allocated deterministically for demo purposes because the completeness source data has no
department dimension.

## Enterprise Overview

`js/screens/EnterpriseOverview.js` with data joins in `js/data/overview.js`. It reuses the existing
calculations: `kpiSummaries`, `auditRows`, `deptRows` (Compliance, Correctness; targets 95% / 90%) and
`completenessOverall`, `pillarViews`, `categoryViews`, `departmentSummary` (Completeness; target 95%).

- **Header and status card:** Enterprise CMDB Health shows an equal-weight simple average of the
  measured factor scores, averaged target, gap and change over the period, plus the count of factors
  meeting their own targets. It is an indicator alongside the individual scores, not a weighted health
  index: factors use different definitions and denominators (audit checks vs. distinct CIs).
- **Three factor cards:** each factor's score, target, gap, change over the period and vs. last month,
  plus passing/failing counts. Each card opens its dashboard.
- **Executive insight strip** surfaces the lead cross-factor insight and can expand to show more.
- **Trend and category comparison:** the shared trend chart sits beside the Completeness comparison
  for Data Center, Network and Workplace. Category bars and names filter the priority list; priority
  areas link to the affected category, class or department. Compliance and Correctness are not measured
  by category because their audits have no Data Center / Network / Workplace link.
- **Priority list and department/service table** are computed from the data. The priority rules are in
  `PRIORITY_RULES`: Critical ≥ 10 pts below target, High ≥ 5 pts below or declining, Medium below
  target. Both sections are collapsed by default, expand on click, and are always included in print.
- **Units differ by factor:** Compliance and Correctness counts are audit checks, so one CI is counted
  once per audit; Completeness counts distinct CIs. The Services filter does not apply to Completeness,
  and the Category selector applies only to Completeness.
- **Change** compares the start of the selected period with the latest month, as on the factor
  dashboards. A previous equivalent period would need more than 12 snapshots.

## Project structure

```
index.html              entry point: import map, font preload, #root
css/styles.css          design tokens and all component styles (plus print and tablet/mobile rules)
js/main.js              mounts the app
js/App.js               shell: KPI pills, filters, hash routing, screen registry
js/ui.js                shared primitives (Delta, Tip, number formatting)
js/components/          FilterBar, GlobalSearch
js/data/                demo.js (dataset), select.js (derived KPIs), completeness.js
js/screens/             Dashboard, Completeness, ServiceDrill, AuditDrill, PillarDrill, + inactive screens
js/vendor/              React 19.2.8, React DOM 19.2.8, Recharts 2.15.4, htm 3.1.1 (local ESM bundles + licenses)
assets/                 favicon, icon sprite, MB Corpo S Text font
typescript-source/      original React + TypeScript + Vite source, kept for reference only
```

The UI still uses React components and Recharts charts, loaded as local browser modules through the
import map in `index.html`. JSX has been replaced with [`htm`](https://github.com/developit/htm)
tagged templates (`html\`<div>…</div>\``), so browsers run the source files directly. See
`js/vendor/README.md` for how the vendor bundles were built and for their licenses.

## Connecting real data

All data access goes through `js/data/`. Screens only call the selector functions in `select.js` and
`completeness.js`, which read the dataset exported by `demo.js`. To connect a real CMDB, for example
the ServiceNow Table API, replace the dataset with fetched data of the same shape. Leave the screens
unchanged. Never put credentials in this static site: call the CMDB through a backend or proxy you
control.

## Known limitations

- **No backend.** All data is the demo data above, and nothing is saved.
- **Export board pack** opens the browser's print dialog for the current view (choose
  *Save as PDF*). It does not create a server-side report. In the original prototype this button
  did nothing.
- **Inactive screens.** KPI overview, Attention required, Audit explorer, Department explorer,
  Service scorecards, Compliance drill-down and Delivery portal are converted (`js/screens/`) but
  disabled in the **View** selector, as in the original. To turn one on, set `active: true` in
  `SCREENS` in `js/App.js`. Their action buttons (Assign owner, Notify owner, etc.) had no handlers
  in the original because they need a backend, and they still have none.
- **Mobile/tablet.** The original laid out badly below 900px. Responsive rules under
  `@media (max-width: 900px)` and `(max-width: 600px)` now handle that; the desktop layout is
  unchanged.
