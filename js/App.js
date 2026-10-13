import { html } from 'htm/react';
import { useEffect, useMemo, useState } from 'react';
import { ALL_AUDITS, AUDITS, DEPARTMENTS, KPI_META, SERVICES } from './data/demo.js';
import { applyFilters, attentionItems, EMPTY_FILTERS, kpiSummaries } from './data/select.js';
import {
  PILLARS,
  attributeGaps,
  attributesOf,
  categoriesOf,
  completenessOverall,
  departmentScope,
} from './data/completeness.js';
import { FilterBar } from './components/FilterBar.js';
import { GlobalSearch } from './components/GlobalSearch.js';
import { Overview } from './screens/Overview.js';
import { Attention } from './screens/Attention.js';
import { Services } from './screens/Services.js';
import { Audits } from './screens/Audits.js';
import { Departments } from './screens/Departments.js';
import { Portal } from './screens/Portal.js';
import { Compliance } from './screens/Compliance.js';
import { Dashboard } from './screens/Dashboard.js';
import { Completeness } from './screens/Completeness.js';
import { EnterpriseOverview } from './screens/EnterpriseOverview.js';
import { AttributeDrill } from './screens/AttributeDrill.js';
import { ServiceDrill } from './screens/ServiceDrill.js';
import { AuditDrill } from './screens/AuditDrill.js';
import { PillarDrill } from './screens/PillarDrill.js';
import { Delta } from './ui.js';
/**
 * Only the compliance home page is active; the remaining screens stay in the codebase
 * but are switched off until they are reactivated.
 */
const SCREENS = [
  {
    id: 'dashboard',
    active: true,
    label: 'Compliance home',
    title: 'CMDB Data Integrity Dashboard',
    sub: `Compliance · Completeness · Correctness across ${AUDITS.length} audits, ${SERVICES.length} services and ${DEPARTMENTS.length} departments`,
  },
  {
    id: 'servicedrill',
    active: true,
    label: 'Service drill-down',
    title: 'Service Drill-down',
    sub: 'Total CIs, attention required, per-audit health and the department score board for one service',
  },
  {
    id: 'auditdrill',
    active: true,
    label: 'Audit drill-down',
    title: 'Audit Drill-down',
    sub: 'One audit across every aligned service and department — report and analytics',
  },
  {
    id: 'pillardrill',
    active: true,
    label: 'Pillar drill-down',
    title: 'Pillar Drill-down',
    sub: 'Completeness attention attributes, category health and pillar analytics',
  },
  {
    id: 'attributedrill',
    active: true,
    label: 'Attribute drill-down',
    title: 'Attribute Drill-down',
    sub: 'Attribute completeness by class and department',
  },
  {
    id: 'overview',
    active: false,
    label: 'KPI overview',
    title: 'CMDB Data Integrity — KPI Overview',
    sub: 'All three KPIs side by side, service scorecard matrix and department distribution',
  },
  {
    id: 'compliance',
    active: false,
    label: 'Compliance drill-down',
    title: 'Compliance — Drill-down',
    sub: 'Overall compliance health, audits needing attention, health of every policy audit and the department view',
  },
  {
    id: 'attention',
    active: false,
    label: 'Attention required',
    title: 'Attention Required',
    sub: 'Ranked breaches and negative trends that need an owner decision this month',
  },
  {
    id: 'services',
    active: false,
    label: 'Service scorecards',
    title: 'Service Scorecards',
    sub: `The ${SERVICES.length} shared CMDB services and their common KPI performance`,
  },
  {
    id: 'audits',
    active: false,
    label: 'Audit explorer',
    title: 'Audit Explorer',
    sub: `All ${AUDITS.length} audits — score, coverage, open findings and trend`,
  },
  {
    id: 'departments',
    active: false,
    label: 'Department explorer',
    title: 'Department Explorer',
    sub: `${DEPARTMENTS.length} departments ranked by weighted KPI score, drill into any one`,
  },
  {
    id: 'portal',
    active: false,
    label: 'Delivery portal',
    title: 'Delivery Portal',
    sub: 'Manage the dashboard & remediation development process — streams, releases, validation',
  },
];
const isActive = (id) => SCREENS.some((s) => s.id === id && s.active);

/** Each service drill-down is its own addressable page: #/service/<id>. */
const serviceFromHash = () => {
  const id = window.location.hash.replace('#/service/', '');
  return SERVICES.some((s) => s.id === id) ? id : null;
};

/** Each audit drill-down is its own addressable page: #/audit/<id>. */
const auditFromHash = () => {
  const id = window.location.hash.replace('#/audit/', '');
  if (id === ALL_AUDITS) return ALL_AUDITS;
  return AUDITS.some((a) => a.id === id) ? id : null;
};

/** Each completeness pillar drill-down is its own addressable page: #/pillar/<id>. */
const pillarFromHash = () => {
  const id = window.location.hash.replace('#/pillar/', '');
  return PILLARS.some((pillar) => pillar.id === id) ? id : null;
};

const attributeFromHash = () => {
  const match = window.location.hash.match(/^#\/attribute\/([^/]+)\/([^/]+)(?:\/([^/]+))?$/);
  if (!match) return null;

  try {
    const [, pillarId, encodedAttribute, requestedCategoryId] = match;
    const attribute = decodeURIComponent(encodedAttribute);
    if (!PILLARS.some((pillar) => pillar.id === pillarId)) return null;
    if (!attributesOf(pillarId).includes(attribute)) return null;
    const categoryId = categoriesOf(pillarId).some(
      (category) => category.id === requestedCategoryId,
    )
      ? requestedCategoryId
      : null;
    return { pillarId, attribute, categoryId };
  } catch {
    return null;
  }
};

export default function App() {
  const initialService = serviceFromHash();
  const initialAudit = auditFromHash();
  const initialPillar = pillarFromHash();
  const initialAttribute = attributeFromHash();
  const [screen, setScreen] = useState(
    initialAttribute
      ? 'attributedrill'
      : initialService
        ? 'servicedrill'
        : initialAudit
          ? 'auditdrill'
          : initialPillar
            ? 'pillardrill'
            : 'dashboard',
  );
  const [kpi, setKpi] = useState(initialPillar || initialAttribute ? 'completeness' : 'overview');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [overviewCategory, setOverviewCategory] = useState('all');
  const scope = useMemo(() => departmentScope(filters), [filters.departments, filters.owners]);
  const [drillService, setDrillService] = useState(initialService ?? SERVICES[0].id);
  const [drillAudit, setDrillAudit] = useState(initialAudit ?? ALL_AUDITS);
  const [drillPillar, setDrillPillar] = useState(
    initialAttribute?.pillarId ?? initialPillar ?? 'pil-network',
  );
  const [drillCategory, setDrillCategory] = useState(null);
  const [drillAttribute, setDrillAttribute] = useState(initialAttribute);
  useEffect(() => {
    const onHash = () => {
      const serviceId = serviceFromHash();
      const auditId = auditFromHash();
      const pillarId = pillarFromHash();
      const attributeRoute = attributeFromHash();
      if (attributeRoute) {
        setDrillAttribute(attributeRoute);
        setDrillPillar(attributeRoute.pillarId);
        setDrillCategory(attributeRoute.categoryId);
        setKpi('completeness');
        setScreen('attributedrill');
      } else if (serviceId) {
        setDrillService(serviceId);
        setScreen('servicedrill');
      } else if (auditId) {
        setDrillAudit(auditId);
        setScreen('auditdrill');
      } else if (pillarId) {
        setDrillPillar(pillarId);
        setKpi('completeness');
        setScreen('pillardrill');
      } else {
        setScreen('dashboard');
      }
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const rows = useMemo(() => applyFilters(filters), [filters]);
  const kpis = useMemo(() => kpiSummaries(rows, filters.duration), [rows, filters.duration]);
  const completenessScore = useMemo(
    () => completenessOverall(filters.duration, scope).score,
    [filters.duration, scope],
  );
  const attention = useMemo(() => attentionItems(rows, filters.duration), [rows, filters.duration]);
  const meta = SCREENS.find((s) => s.id === screen);

  /** Opening a service page also narrows the Services filter to that service. */
  /** Service and audit drills need a factor; from Overview they default to Compliance. */
  const factorKpi = kpi === 'overview' ? 'compliance' : kpi;
  const openService = (id, factor) => {
    if (factor) setKpi(factor);
    else if (kpi === 'overview') setKpi('compliance');
    setDrillService(id);
    setScreen('servicedrill');
    setFilters((f) =>
      f.services.length === 1 && f.services[0] === id
        ? f
        : {
            ...f,
            services: [id],
          },
    );
    window.location.hash = `#/service/${id}`;
  };
  const openAudit = (id, factor) => {
    if (factor) setKpi(factor);
    else if (kpi === 'overview') setKpi('compliance');
    setDrillAudit(id);
    setScreen('auditdrill');
    window.location.hash = `#/audit/${id}`;
  };
  const openPillar = (id, categoryId) => {
    setDrillPillar(id);
    setDrillCategory(categoryId ?? null);
    setDrillAttribute(null);
    setKpi('completeness');
    setScreen('pillardrill');
    window.location.hash = `#/pillar/${id}`;
  };
  const openAttribute = (pillarId, attribute, categoryId = null) => {
    if (!PILLARS.some((pillar) => pillar.id === pillarId)) return;
    if (!attributesOf(pillarId).includes(attribute)) return;
    const validCategoryId = categoriesOf(pillarId).some((category) => category.id === categoryId)
      ? categoryId
      : null;
    const route = { pillarId, attribute, categoryId: validCategoryId };
    setDrillAttribute(route);
    setDrillPillar(pillarId);
    setDrillCategory(validCategoryId);
    setKpi('completeness');
    setScreen('attributedrill');
    window.location.hash = `#/attribute/${pillarId}/${encodeURIComponent(attribute)}${
      validCategoryId ? `/${validCategoryId}` : ''
    }`;
  };
  const openDepartment = (id) => {
    setFilters((current) => ({
      ...current,
      departments: [id],
    }));
    setScreen('dashboard');
    window.location.hash = '';
  };
  const focusDepartment = (id) => {
    setFilters((current) => ({ ...current, departments: [id], owners: [] }));
  };
  const clearDepartmentScope = () => {
    setFilters((current) => ({ ...current, departments: [], owners: [] }));
  };
  const openOwner = (owner) => {
    setFilters((current) => ({
      ...current,
      owners: [owner],
    }));
    setScreen('dashboard');
    window.location.hash = '';
  };

  /** The View selector keeps the URL in sync so drill-downs stay addressable. */
  const goTo = (id) => {
    if (!isActive(id)) return;
    if (id === 'servicedrill') return openService(drillService);
    if (id === 'auditdrill') return openAudit(drillAudit);
    if (id === 'pillardrill') return openPillar(drillPillar);
    if (id === 'attributedrill') {
      const attribute = attributeGaps(12, drillPillar)[0]?.attribute;
      if (attribute) openAttribute(drillPillar, attribute);
      return;
    }
    setScreen(id);
    window.location.hash = '';
  };
  const closeService = () => {
    setScreen('dashboard');
    setFilters((f) =>
      f.services.length === 1
        ? {
            ...f,
            services: [],
          }
        : f,
    );
    window.location.hash = '';
  };
  const goHome = () => {
    closeService();
    setKpi('overview');
  };
  const openFactor = (key) => {
    setKpi(key);
    closeService();
  };
  const closePillar = () => {
    setDrillCategory(null);
    setDrillAttribute(null);
    setScreen('dashboard');
    window.location.hash = '';
  };

  /** On a service page the Services filter is the service selector: single-select. */
  const changeFilters = (next) => {
    if (screen !== 'servicedrill') return setFilters(next);
    const picked = next.services.find((id) => id !== drillService) ?? drillService;
    setFilters({
      ...next,
      services: [picked],
    });
    if (picked !== drillService) {
      setDrillService(picked);
      window.location.hash = `#/service/${picked}`;
    }
  };
  return html`<div className="app">
    <div className="appbar">
      <button className="logo" onClick=${goHome} title="CMDB Quality — Overview">
        <span className="logo-mark">CMDB</span><span className="logo-text">Quality</span>
      </button>
      <div className="kpipills">
        <button
          className=${`kpipill ${kpi === 'overview' ? 'on' : ''}`}
          aria-pressed=${kpi === 'overview'}
          onClick=${() => openFactor('overview')}
        >
          Overview
        </button>
        ${kpis.map(
          (k) =>
            html`<button
              key=${k.key}
              className=${`kpipill ${k.key === kpi ? 'on' : ''}`}
              aria-pressed=${k.key === kpi}
              onClick=${() => openFactor(k.key)}
            >
              ${KPI_META.find((m) => m.key === k.key).label}<span className="kpipill-badge num"
                >${(k.key === 'completeness' ? completenessScore : k.score).toFixed(1)}%</span
              >
            </button>`,
        )}
      </div>
      <div className="appbar-right">
        <${GlobalSearch}
          onAudit=${openAudit}
          onService=${openService}
          onPillar=${openPillar}
          onAttribute=${openAttribute}
          onDepartment=${openDepartment}
          onOwner=${openOwner}
        /><label className="viewsel"
          ><span>View</span
          ><select value=${screen} onChange=${(e) => goTo(e.target.value)}>
            ${SCREENS.map((s) => html`<option key=${s.id} value=${s.id} disabled=${!s.active}>${s.active ? s.label : `${s.label} — inactive`}</option>`)}
          </select></label
        >
      </div>
    </div>
    <${FilterBar} filters=${filters} onChange=${changeFilters} />
    <main className="content">
      ${
        screen !== 'dashboard' &&
        screen !== 'servicedrill' &&
        screen !== 'auditdrill' &&
        screen !== 'pillardrill' &&
        screen !== 'attributedrill' &&
        html`<div className="view-head">
          <div>
            <h1>${meta.title}</h1>
            <p>${meta.sub}</p>
          </div>
          <div className="view-head-kpi">
            ${kpis.map((k) => html`<span key=${k.key}>${k.label} <b className="num">${k.score.toFixed(1)}%</b> <${Delta} value=${k.delta} /></span>`)}
          </div>
        </div>`
      }${screen === 'dashboard' && kpi === 'overview' && html`<${EnterpriseOverview} rows=${rows} duration=${filters.duration} scope=${scope} filters=${filters} category=${overviewCategory} onCategory=${setOverviewCategory} onKpi=${openFactor} onAudit=${openAudit} onService=${openService} onPillar=${openPillar} onDepartment=${focusDepartment} onClearDepartments=${clearDepartmentScope} />`}${screen === 'dashboard' && kpi === 'completeness' && html`<${Completeness} duration=${filters.duration} scope=${scope} filters=${filters} pillarId=${drillPillar} onPillar=${openPillar} onAttribute=${openAttribute} onDepartment=${focusDepartment} onClearDepartments=${clearDepartmentScope} />`}${screen === 'dashboard' && kpi !== 'completeness' && kpi !== 'overview' && html`<${Dashboard} rows=${rows} kpis=${kpis} duration=${filters.duration} kpi=${factorKpi} onService=${openService} onAudit=${openAudit} />`}${screen === 'servicedrill' && html`<${ServiceDrill} rows=${rows} duration=${filters.duration} kpi=${factorKpi} serviceId=${drillService} onAudit=${openAudit} onBack=${closeService} />`}${screen === 'auditdrill' && html`<${AuditDrill} rows=${rows} duration=${filters.duration} kpi=${factorKpi} auditId=${drillAudit} onAudit=${openAudit} onService=${openService} onBack=${closeService} />`}${screen === 'pillardrill' && html`<${PillarDrill} key=${drillPillar} pillarId=${drillPillar} duration=${filters.duration} scope=${scope} focusCategory=${drillCategory} onPillar=${openPillar} onAttribute=${openAttribute} />`}${screen === 'attributedrill' && drillAttribute && html`<${AttributeDrill} key=${`${drillAttribute.pillarId}-${drillAttribute.attribute}`} pillarId=${drillAttribute.pillarId} attribute=${drillAttribute.attribute} categoryId=${drillAttribute.categoryId} duration=${filters.duration} scope=${scope} filters=${filters} onAttribute=${openAttribute} onPillar=${openPillar} onCompleteness=${closePillar} />`}${screen === 'overview' && html`<${Overview} rows=${rows} kpis=${kpis} attention=${attention} duration=${filters.duration} />`}${screen === 'compliance' && html`<${Compliance} rows=${rows} duration=${filters.duration} />`}${screen === 'attention' && html`<${Attention} items=${attention} />`}${screen === 'services' && html`<${Services} rows=${rows} duration=${filters.duration} />`}${screen === 'audits' && html`<${Audits} rows=${rows} duration=${filters.duration} />`}${screen === 'departments' && html`<${Departments} rows=${rows} duration=${filters.duration} />`}${screen === 'portal' && html`<${Portal} />`}
    </main>
  </div>`;
}
