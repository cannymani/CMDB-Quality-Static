import { useEffect, useMemo, useState } from 'react';
import './styles.css';
import {
  ALL_AUDITS,
  AUDITS,
  DEPARTMENTS,
  KPI_META,
  SERVICES,
  type KpiKey,
} from './data/demo';
import {
  applyFilters,
  attentionItems,
  EMPTY_FILTERS,
  kpiSummaries,
  type Duration,
  type Filters,
} from './data/select';
import { PILLARS, completenessOverall, type PillarId } from './data/completeness';
import { FilterBar } from './components/FilterBar';
import { GlobalSearch } from './components/GlobalSearch';
import { Overview } from './screens/Overview';
import { Attention } from './screens/Attention';
import { Services } from './screens/Services';
import { Audits } from './screens/Audits';
import { Departments } from './screens/Departments';
import { Portal } from './screens/Portal';
import { Compliance } from './screens/Compliance';
import { Dashboard } from './screens/Dashboard';
import { Completeness } from './screens/Completeness';
import { ServiceDrill } from './screens/ServiceDrill';
import { AuditDrill } from './screens/AuditDrill';
import { PillarDrill } from './screens/PillarDrill';
import { Delta } from './ui';

type ScreenId =
  | 'dashboard'
  | 'servicedrill'
  | 'auditdrill'
  | 'pillardrill'
  | 'overview'
  | 'compliance'
  | 'attention'
  | 'services'
  | 'audits'
  | 'departments'
  | 'portal';

/**
 * Only the compliance home page is active; the remaining screens stay in the codebase
 * but are switched off until they are reactivated.
 */
const SCREENS: { id: ScreenId; label: string; title: string; sub: string; active: boolean }[] = [
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

const isActive = (id: ScreenId) => SCREENS.some((s) => s.id === id && s.active);

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
  return PILLARS.some((pillar) => pillar.id === id) ? (id as PillarId) : null;
};

export default function App() {
  const initialService = serviceFromHash();
  const initialAudit = auditFromHash();
  const initialPillar = pillarFromHash();
  const [screen, setScreen] = useState<ScreenId>(
    initialService
      ? 'servicedrill'
      : initialAudit
        ? 'auditdrill'
        : initialPillar
          ? 'pillardrill'
          : 'dashboard',
  );
  const [kpi, setKpi] = useState<KpiKey>(initialPillar ? 'completeness' : 'compliance');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [drillService, setDrillService] = useState<string>(initialService ?? SERVICES[0].id);
  const [drillAudit, setDrillAudit] = useState<string>(initialAudit ?? ALL_AUDITS);
  const [drillPillar, setDrillPillar] = useState<PillarId>(initialPillar ?? 'pil-network');
  const [drillCategory, setDrillCategory] = useState<string | null>(null);

  useEffect(() => {
    const onHash = () => {
      const serviceId = serviceFromHash();
      const auditId = auditFromHash();
      const pillarId = pillarFromHash();
      if (serviceId) {
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
    () => completenessOverall(filters.duration).score,
    [filters.duration],
  );
  const attention = useMemo(() => attentionItems(rows, filters.duration), [rows, filters.duration]);

  const meta = SCREENS.find((s) => s.id === screen)!;

  /** Opening a service page also narrows the Services filter to that service. */
  const openService = (id: string) => {
    setDrillService(id);
    setScreen('servicedrill');
    setFilters((f) => (f.services.length === 1 && f.services[0] === id ? f : { ...f, services: [id] }));
    window.location.hash = `#/service/${id}`;
  };

  const openAudit = (id: string) => {
    setDrillAudit(id);
    setScreen('auditdrill');
    window.location.hash = `#/audit/${id}`;
  };

  const openPillar = (id: PillarId, categoryId?: string) => {
    setDrillPillar(id);
    setDrillCategory(categoryId ?? null);
    setKpi('completeness');
    setScreen('pillardrill');
    window.location.hash = `#/pillar/${id}`;
  };

  const openDepartment = (id: string) => {
    setFilters((current) => ({ ...current, departments: [id] }));
    setScreen('dashboard');
    window.location.hash = '';
  };

  const openOwner = (owner: string) => {
    setFilters((current) => ({ ...current, owners: [owner] }));
    setScreen('dashboard');
    window.location.hash = '';
  };

  /** The View selector keeps the URL in sync so drill-downs stay addressable. */
  const goTo = (id: ScreenId) => {
    if (!isActive(id)) return;
    if (id === 'servicedrill') return openService(drillService);
    if (id === 'auditdrill') return openAudit(drillAudit);
    if (id === 'pillardrill') return openPillar(drillPillar);
    setScreen(id);
    window.location.hash = '';
  };

  const closeService = () => {
    setScreen('dashboard');
    setFilters((f) => (f.services.length === 1 ? { ...f, services: [] } : f));
    window.location.hash = '';
  };

  const closePillar = () => {
    setScreen('dashboard');
    window.location.hash = '';
  };

  /** On a service page the Services filter is the service selector: single-select. */
  const changeFilters = (next: Filters) => {
    if (screen !== 'servicedrill') return setFilters(next);
    const picked = next.services.find((id) => id !== drillService) ?? drillService;
    setFilters({ ...next, services: [picked] });
    if (picked !== drillService) {
      setDrillService(picked);
      window.location.hash = `#/service/${picked}`;
    }
  };

  return (
    <div className="app">
      <div className="appbar">
        <button className="logo" onClick={closeService} title="CMDB Quality">
          <span className="logo-mark">CMDB</span>
          <span className="logo-text">Quality</span>
        </button>

        <div className="kpipills">
          {kpis.map((k) => (
            <button
              key={k.key}
              className={`kpipill ${k.key === kpi ? 'on' : ''}`}
              onClick={() => {
                setKpi(k.key);
                closeService();
              }}
            >
              {KPI_META.find((m) => m.key === k.key)!.label}
              <span className="kpipill-badge num">
                {(k.key === 'completeness' ? completenessScore : k.score).toFixed(1)}%
              </span>
            </button>
          ))}
        </div>

        <div className="appbar-right">
          <GlobalSearch
            onAudit={openAudit}
            onService={openService}
            onPillar={openPillar}
            onDepartment={openDepartment}
            onOwner={openOwner}
          />
          <label className="viewsel">
            <span>View</span>
            <select value={screen} onChange={(e) => goTo(e.target.value as ScreenId)}>
              {SCREENS.map((s) => (
                <option key={s.id} value={s.id} disabled={!s.active}>
                  {s.active ? s.label : `${s.label} — inactive`}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <FilterBar filters={filters} onChange={changeFilters} />

      <main className="content">
        {screen !== 'dashboard' &&
          screen !== 'servicedrill' &&
          screen !== 'auditdrill' &&
          screen !== 'pillardrill' && (
          <div className="view-head">
            <div>
              <h1>{meta.title}</h1>
              <p>{meta.sub}</p>
            </div>
            <div className="view-head-kpi">
              {kpis.map((k) => (
                <span key={k.key}>
                  {k.label} <b className="num">{k.score.toFixed(1)}%</b> <Delta value={k.delta} />
                </span>
              ))}
            </div>
          </div>
        )}

        {screen === 'dashboard' && kpi === 'completeness' && (
          <Completeness
            duration={filters.duration}
            pillarId={drillPillar}
            onPillar={openPillar}
          />
        )}
        {screen === 'dashboard' && kpi !== 'completeness' && (
          <Dashboard
            rows={rows}
            kpis={kpis}
            duration={filters.duration}
            kpi={kpi}
            onService={openService}
            onAudit={openAudit}
          />
        )}
        {screen === 'servicedrill' && (
          <ServiceDrill
            rows={rows}
            duration={filters.duration}
            kpi={kpi}
            serviceId={drillService}
            onAudit={openAudit}
            onBack={closeService}
          />
        )}
        {screen === 'auditdrill' && (
          <AuditDrill
            rows={rows}
            duration={filters.duration}
            kpi={kpi}
            auditId={drillAudit}
            onAudit={openAudit}
            onService={openService}
            onBack={closeService}
          />
        )}
        {screen === 'pillardrill' && (
          <PillarDrill
            pillarId={drillPillar}
            duration={filters.duration}
            focusCategory={drillCategory}
            onBack={closePillar}
            onPillar={openPillar}
          />
        )}
        {screen === 'overview' && (
          <Overview rows={rows} kpis={kpis} attention={attention} duration={filters.duration} />
        )}
        {screen === 'compliance' && <Compliance rows={rows} duration={filters.duration} />}
        {screen === 'attention' && <Attention items={attention} />}
        {screen === 'services' && <Services rows={rows} duration={filters.duration} />}
        {screen === 'audits' && <Audits rows={rows} duration={filters.duration} />}
        {screen === 'departments' && <Departments rows={rows} duration={filters.duration} />}
        {screen === 'portal' && <Portal />}
      </main>
    </div>
  );
}

export type { Duration, ScreenId };
