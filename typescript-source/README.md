# CMDB Quality — Executive KPI Dashboard (Prototype)

Standalone React + TypeScript + Vite prototype of an executive CMDB quality dashboard for
**Compliance**, **Completeness** and **Correctness**, built on demo data (19 audits, 4 services,
120 departments). No backend, no network calls — all data is generated locally in `src/data/demo.ts`.

## Quick start

```bash
npm install          # Node 20.19+ / 22+ recommended
npm run dev          # dev server on http://localhost:5173
```

Other scripts:

```bash
npm run build        # type-check (tsc -b) + production build to dist/
npm run preview      # serve the production build
npm run lint         # oxlint
```

## Screens and routes

The prototype is hash-routed, so it works from any static host:

| Route | Screen |
| --- | --- |
| `#/` | Compliance home — KPI pills, filters, service cards, Attention Required, Audit Trends Analysis |
| `#/service/<serviceId>` | Service drill-down (Report / Analytics). Service is chosen from the **Services** filter |
| `#/audit/all` | Audit overview across all 19 audits (Report / Analytics) |
| `#/audit/<auditId>` | Single-audit drill-down, scoped to that audit |

Service ids: `svc-bapp`, `svc-appsvc`, `svc-offering`, `svc-bsvc`. Audit ids: `A-01` … `A-19`.

Screens listed as “inactive” in the **View** selector (`src/App.tsx` → `SCREENS`) are kept in the
codebase but disabled; flip `active: true` to bring one back.

## Project structure

```
index.html                     app shell, font preload
public/fonts/                  MB Corpo S Text Office Regular (bundled locally)
src/App.tsx                    shell: KPI pills, filter bar, hash routing, screen registry
src/components/FilterBar.tsx   department / owner / service / duration filters
src/data/demo.ts               demo dataset: audits, services, departments, measurements, targets
src/data/select.ts             all derived data (KPI summaries, drill-downs, trends, distributions)
src/screens/                   Dashboard (compliance home), ServiceDrill, AuditDrill, + inactive screens
src/styles.css                 design tokens + all component styles
src/ui.tsx                     shared primitives (Delta, Tip, number formatting)
shots.mjs                      optional screenshot helper (drives a running preview over CDP)
```

## Design tokens

Defined once at the top of `src/styles.css`:

| Token | Value | Use |
| --- | --- | --- |
| `--accent` | `#0078d6` | primary |
| `--success` | `#0078db` | success / completed / on-target |
| `--danger` | `#d92121` | error / warning / below target |
| `--canvas` | `#f5f5f5` | page background |
| `--ink-900` … `--ink-500` | `#111111` | body and secondary text (100% opacity) |

Typography: MB Corpo S Text Office Regular only — every text 16px and above renders at weight 400.
Trend charts use the 10-shade palette in `LINE_SHADES` (`src/screens/Dashboard.tsx`,
`ServiceDrill.tsx`, `AuditDrill.tsx`); the 10th series repeats the first shade dashed.

## Demo data model

`src/data/demo.ts` is the single source of truth: 19 audits (each aligned to one or more of the
4 services), 120 departments with owners, and per-month measurement rows per
audit × service × department × KPI. Targets are `compliance 95`, `completeness 92`,
`correctness 90`; `RISK_THRESHOLD` (80) marks a department at risk. Every figure on screen is
derived in `src/data/select.ts` — nothing is hardcoded per screen.

## Publishing to GitHub

```bash
git init                      # already initialised if you received the zip with .git/
git add -A
git commit -m "CMDB KPI dashboard prototype"
git branch -M main
git remote add origin https://github.com/<org>/<repo>.git
git push -u origin main
```

`node_modules/`, `dist/` and `.env` are git-ignored. The font in `public/fonts/` is a
Mercedes-Benz corporate typeface — check licensing before publishing to a public repository.

### Static hosting

`npm run build` emits a fully static `dist/` (hash routing, no server routes required), deployable
to any internal static host or GitHub Pages via your organisation's approved pipeline.

## Notes

- `@oxlint/binding-linux-x64-gnu` is pinned as an optional dependency for Linux CI; on macOS or
  Windows npm installs the matching binding automatically.
- All KPI values, findings and department names are synthetic demo data.
