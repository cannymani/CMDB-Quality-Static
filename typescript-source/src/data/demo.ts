// Deterministic demo dataset for the CMDB KPI executive dashboard prototype.
// 4 CMDB services, one audit per mandatory attribute per service, 120 departments,
// 12 owners, 12 months of history.

export type KpiKey = "compliance" | "completeness" | "correctness";

export const KPI_META: { key: KpiKey; label: string; blurb: string }[] = [
  {
    key: "compliance",
    label: "Compliance",
    blurb: "CIs meeting mandatory policy & audit rules",
  },
  {
    key: "completeness",
    label: "Completeness",
    blurb: "Required attributes & relationships populated",
  },
  {
    key: "correctness",
    label: "Correctness",
    blurb: "Attribute values verified against source of truth",
  },
];

export type Service = {
  id: string;
  name: string;
  short: string;
  owner: string;
  ciCount: number;
};

export const SERVICES: Service[] = [
  {
    id: "svc-bapp",
    name: "Business Applications",
    short: "Business Apps",
    owner: "A. Brandt",
    ciCount: 184320,
  },
  {
    id: "svc-appsvc",
    name: "Application Services",
    short: "App Services",
    owner: "M. Ito",
    ciCount: 142870,
  },
  {
    id: "svc-offering",
    name: "Service Offering",
    short: "Service Offering",
    owner: "S. Keller",
    ciCount: 96540,
  },
  {
    id: "svc-bsvc",
    name: "Business Services",
    short: "Business Services",
    owner: "R. Nagel",
    ciCount: 61230,
  },
];

export const OWNERS = [
  "A. Brandt",
  "S. Keller",
  "M. Ito",
  "R. Nagel",
  "L. Duarte",
  "P. Okonkwo",
  "J. Vasquez",
  "H. Lindqvist",
  "T. Nakamura",
  "D. Rossi",
  "K. Ahmed",
  "C. Weber",
];

/**
 * Audit catalogue — 19 unique audits, each aligned to the services it applies to.
 * Every audit is scored against all three KPI pillars.
 */
type AuditDef = {
  name: string;
  serviceIds: string[];
  cadence: "Daily" | "Weekly" | "Monthly" | "Quarterly";
  weight: number;
  /** How well the estate maintains this audit today, in score points around the mean. */
  bias: number;
};

const ALL_SERVICES = ["svc-bapp", "svc-appsvc", "svc-offering", "svc-bsvc"];

const AUDIT_CATALOGUE: AuditDef[] = [
  {
    name: "Approval Group – Active",
    serviceIds: ALL_SERVICES,
    cadence: "Weekly",
    weight: 2,
    bias: -3,
  },
  {
    name: "Business Owner",
    serviceIds: ["svc-bapp", "svc-offering", "svc-bsvc"],
    cadence: "Daily",
    weight: 3,
    bias: 2,
  },
  {
    name: "Business Owner – Active",
    serviceIds: ["svc-bapp", "svc-offering", "svc-bsvc"],
    cadence: "Weekly",
    weight: 2,
    bias: -1,
  },
  {
    name: "Change Group – Active",
    serviceIds: ALL_SERVICES,
    cadence: "Weekly",
    weight: 2,
    bias: -6,
  },
  {
    name: "Company – Active",
    serviceIds: ALL_SERVICES,
    cadence: "Weekly",
    weight: 2,
    bias: 9,
  },
  {
    name: "Consumes",
    serviceIds: ["svc-appsvc", "svc-offering"],
    cadence: "Monthly",
    weight: 1,
    bias: -5,
  },
  {
    name: "Department",
    serviceIds: ALL_SERVICES,
    cadence: "Weekly",
    weight: 2,
    bias: 8,
  },
  {
    name: "Department – Active",
    serviceIds: ALL_SERVICES,
    cadence: "Weekly",
    weight: 2,
    bias: -8,
  },
  {
    name: "Department – Hierarchy Level",
    serviceIds: ["svc-offering", "svc-bsvc"],
    cadence: "Monthly",
    weight: 1,
    bias: -4,
  },
  {
    name: "IT Application Owner",
    serviceIds: ["svc-bapp", "svc-appsvc"],
    cadence: "Daily",
    weight: 3,
    bias: 3,
  },
  {
    name: "IT Application Owner – Active",
    serviceIds: ["svc-bapp", "svc-appsvc"],
    cadence: "Weekly",
    weight: 2,
    bias: 0,
  },
  {
    name: "Maintenance Schedule",
    serviceIds: ["svc-appsvc", "svc-offering"],
    cadence: "Monthly",
    weight: 1,
    bias: -7,
  },
  {
    name: "Managed By",
    serviceIds: ALL_SERVICES,
    cadence: "Daily",
    weight: 3,
    bias: 3,
  },
  {
    name: "Managed By – Active",
    serviceIds: ALL_SERVICES,
    cadence: "Weekly",
    weight: 2,
    bias: -2,
  },
  {
    name: "Owned By – Active",
    serviceIds: ALL_SERVICES,
    cadence: "Weekly",
    weight: 2,
    bias: 0,
  },
  {
    name: "Parent",
    serviceIds: ["svc-appsvc", "svc-offering", "svc-bsvc"],
    cadence: "Monthly",
    weight: 1,
    bias: -4,
  },
  {
    name: "Parent – Operational Status",
    serviceIds: ["svc-appsvc", "svc-offering"],
    cadence: "Monthly",
    weight: 1,
    bias: -9,
  },
  {
    name: "Plant – Status",
    serviceIds: ["svc-appsvc", "svc-offering"],
    cadence: "Daily",
    weight: 3,
    bias: -6,
  },
  {
    name: "Support Group – Active",
    serviceIds: ALL_SERVICES,
    cadence: "Daily",
    weight: 3,
    bias: 6,
  },
];

/** KPI pillar difficulty, in score points around the mean. */
const KPI_BIAS: Record<KpiKey, number> = {
  compliance: 0,
  completeness: 3,
  correctness: -6,
};

export type Audit = {
  id: string;
  code: string;
  name: string;
  serviceIds: string[];
  weight: number;
  cadence: "Daily" | "Weekly" | "Monthly" | "Quarterly";
  rulesetVersion: string;
};

/** Sentinel audit id for the aggregate "All audits" overview. */
export const ALL_AUDITS = "all";

// --- deterministic pseudo random ------------------------------------------------
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const rand = rng(20260826);

/** Maturity of each service's data stewardship, in score points around the mean. */
const SERVICE_BIAS: Record<string, number> = {
  "svc-bapp": 5,
  "svc-appsvc": -2,
  "svc-offering": 1,
  "svc-bsvc": -5,
};

const AUDIT_BIAS = new Map<string, number>();

export const AUDITS: Audit[] = AUDIT_CATALOGUE.map((def, i) => {
  const code = `A-${String(i + 1).padStart(2, "0")}`;
  AUDIT_BIAS.set(code, def.bias);
  return {
    id: code,
    code,
    name: def.name,
    serviceIds: def.serviceIds,
    weight: def.weight,
    cadence: def.cadence,
    rulesetVersion: `v${2 + (i % 3)}.${1 + (i % 7)}`,
  };
});

/** Synthetic audit used by the aggregate "All audits" overview. */
export const ALL_AUDITS_AUDIT: Audit = {
  id: ALL_AUDITS,
  code: ALL_AUDITS,
  name: "All audits",
  serviceIds: SERVICES.map((s) => s.id),
  weight: 1,
  cadence: "Weekly",
  rulesetVersion: "—",
};

const DEPT_UNITS = [
  "Manufacturing",
  "Powertrain",
  "Sales",
  "After Sales",
  "Finance",
  "Procurement",
  "HR",
  "Legal",
  "IT Infrastructure",
  "Digital Products",
  "Quality",
  "Logistics",
  "R&D",
  "Marketing",
  "Corporate Audit",
  "Treasury",
  "Plant Engineering",
  "Customer Care",
  "Data Platform",
  "Cyber Defence",
];
const DEPT_REGIONS = ["EMEA", "NAFTA", "APAC", "LATAM", "DACH", "India"];

export type Department = {
  id: string;
  name: string;
  code: string;
  unit: string;
  region: string;
  owner: string;
  ciCount: number;
};

const REGION_CODE: Record<string, string> = {
  EMEA: "EM",
  NAFTA: "NA",
  APAC: "AP",
  LATAM: "LA",
  DACH: "DE",
  India: "IN",
};

export const DEPARTMENTS: Department[] = (() => {
  const out: Department[] = [];
  const usedCodes = new Set<string>();
  let n = 0;
  for (const unit of DEPT_UNITS) {
    for (const region of DEPT_REGIONS) {
      if (out.length >= 120) break;
      n += 1;
      const initials = unit
        .split(/[\s&/-]+/)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 3);
      let code = `${initials}/${REGION_CODE[region]}`;
      for (let suffix = 2; usedCodes.has(code); suffix += 1) {
        code = `${initials}${suffix}/${REGION_CODE[region]}`;
      }
      usedCodes.add(code);
      out.push({
        id: `dep-${String(n).padStart(3, "0")}`,
        name: `${unit} · ${region}`,
        code,
        unit,
        region,
        owner: OWNERS[Math.floor(rand() * OWNERS.length)],
        ciCount: 400 + Math.floor(rand() * 6200),
      });
    }
  }
  return out;
})();

export const MONTHS = [
  "Sep 25",
  "Oct 25",
  "Nov 25",
  "Dec 25",
  "Jan 26",
  "Feb 26",
  "Mar 26",
  "Apr 26",
  "May 26",
  "Jun 26",
  "Jul 26",
  "Aug 26",
];

/** One measurement: department x attribute audit, with 12 monthly scores (0-100). */
export type Measurement = {
  deptId: string;
  auditId: string;
  serviceId: string;
  kpi: KpiKey;
  scores: number[]; // length 12, index 11 = latest
  ciChecked: number;
  compliantCis: number;
  nonCompliantCis: number;
  findings: number;
  openFindings: number;
  slaBreachDays: number;
  lastRun: string;
};

const clamp = (v: number) => Math.max(38, Math.min(99.6, v));

export const MEASUREMENTS: Measurement[] = (() => {
  const rows: Measurement[] = [];
  for (const dept of DEPARTMENTS) {
    const deptBias = (rand() - 0.45) * 16;
    for (const audit of AUDITS) {
      for (const serviceId of audit.serviceIds) {
        for (const { key } of KPI_META) {
          const base =
            88 +
            deptBias +
            AUDIT_BIAS.get(audit.id)! +
            SERVICE_BIAS[serviceId] +
            KPI_BIAS[key] +
            (rand() - 0.5) * 6;
          const drift = (rand() - 0.35) * 0.9; // most series slowly improve
          const scores: number[] = [];
          let v = base - drift * 11;
          for (let m = 0; m < 12; m += 1) {
            v = v + drift + (rand() - 0.5) * 2.4;
            scores.push(Number(clamp(v).toFixed(1)));
          }
          const latest = scores[11];
          const ciChecked = Math.round(
            (dept.ciCount / audit.serviceIds.length) * (0.25 + rand() * 0.7),
          );
          const compliantCis = Math.round(ciChecked * (latest / 100));
          const findings = Math.round(
            (ciChecked - compliantCis) * (0.45 + rand() * 0.4),
          );
          rows.push({
            deptId: dept.id,
            auditId: audit.id,
            serviceId,
            kpi: key,
            scores,
            ciChecked,
            compliantCis,
            nonCompliantCis: ciChecked - compliantCis,
            findings,
            openFindings: Math.round(findings * (0.15 + rand() * 0.55)),
            slaBreachDays: latest < 75 ? Math.round(rand() * 46) : 0,
            lastRun: `${1 + Math.floor(rand() * 26)} Aug 2026`,
          });
        }
      }
    }
  }
  return rows;
})();

// --- delivery portal (development process) --------------------------------------
export type WorkItem = {
  id: string;
  title: string;
  stream:
    "Data Model" | "Automation" | "Reporting" | "Governance" | "Integration";
  status: "Backlog" | "Discovery" | "In Build" | "In Validation" | "Live";
  owner: string;
  kpi: KpiKey;
  impact: "High" | "Medium" | "Low";
  effortDays: number;
  targetUplift: number;
  due: string;
  progress: number;
};

export const WORK_ITEMS: WorkItem[] = [
  {
    id: "W-101",
    title: "Support Group – Active enforcement at intake",
    stream: "Governance",
    status: "In Build",
    owner: "A. Brandt",
    kpi: "compliance",
    impact: "High",
    effortDays: 18,
    targetUplift: 4.2,
    due: "30 Sep 2026",
    progress: 62,
  },
  {
    id: "W-102",
    title: "Auto-correct Plant – Status from plant master",
    stream: "Automation",
    status: "In Validation",
    owner: "M. Ito",
    kpi: "correctness",
    impact: "High",
    effortDays: 24,
    targetUplift: 5.6,
    due: "15 Sep 2026",
    progress: 84,
  },
  {
    id: "W-103",
    title: "Managed by / Owned by backfill — APAC plants",
    stream: "Integration",
    status: "In Build",
    owner: "T. Nakamura",
    kpi: "completeness",
    impact: "High",
    effortDays: 40,
    targetUplift: 7.1,
    due: "31 Oct 2026",
    progress: 45,
  },
  {
    id: "W-104",
    title: "Parent – Operational Status reconciliation job (App Services)",
    stream: "Automation",
    status: "Discovery",
    owner: "R. Nagel",
    kpi: "correctness",
    impact: "Medium",
    effortDays: 12,
    targetUplift: 2.4,
    due: "14 Nov 2026",
    progress: 15,
  },
  {
    id: "W-105",
    title: "Quarterly owner attestation for Business Services",
    stream: "Governance",
    status: "Live",
    owner: "C. Weber",
    kpi: "compliance",
    impact: "Medium",
    effortDays: 16,
    targetUplift: 3.0,
    due: "01 Aug 2026",
    progress: 100,
  },
  {
    id: "W-106",
    title: "Department – Active reference repair assistant",
    stream: "Automation",
    status: "Backlog",
    owner: "L. Duarte",
    kpi: "correctness",
    impact: "High",
    effortDays: 30,
    targetUplift: 4.8,
    due: "20 Dec 2026",
    progress: 0,
  },
  {
    id: "W-107",
    title: "Executive KPI export to board pack",
    stream: "Reporting",
    status: "In Validation",
    owner: "P. Okonkwo",
    kpi: "compliance",
    impact: "Low",
    effortDays: 6,
    targetUplift: 0.4,
    due: "05 Sep 2026",
    progress: 78,
  },
  {
    id: "W-108",
    title: "Company & plant feed from procurement suite",
    stream: "Integration",
    status: "In Build",
    owner: "S. Keller",
    kpi: "completeness",
    impact: "Medium",
    effortDays: 22,
    targetUplift: 3.6,
    due: "18 Oct 2026",
    progress: 51,
  },
  {
    id: "W-109",
    title: "Service Offering parent hierarchy refactor",
    stream: "Data Model",
    status: "Discovery",
    owner: "K. Ahmed",
    kpi: "correctness",
    impact: "High",
    effortDays: 55,
    targetUplift: 6.2,
    due: "31 Jan 2027",
    progress: 8,
  },
  {
    id: "W-110",
    title: "Change group (change_grp) auto-derivation policy",
    stream: "Governance",
    status: "Backlog",
    owner: "H. Lindqvist",
    kpi: "compliance",
    impact: "Medium",
    effortDays: 10,
    targetUplift: 2.1,
    due: "12 Dec 2026",
    progress: 0,
  },
  {
    id: "W-111",
    title: "Department scorecard self-service view",
    stream: "Reporting",
    status: "In Build",
    owner: "J. Vasquez",
    kpi: "compliance",
    impact: "Medium",
    effortDays: 14,
    targetUplift: 1.2,
    due: "25 Sep 2026",
    progress: 37,
  },
  {
    id: "W-112",
    title: "Approval group suggestions from CI ownership graph",
    stream: "Data Model",
    status: "Backlog",
    owner: "D. Rossi",
    kpi: "compliance",
    impact: "Low",
    effortDays: 35,
    targetUplift: 3.9,
    due: "28 Feb 2027",
    progress: 0,
  },
];

export const RELEASES = [
  { name: "R26.09", window: "01–14 Sep", items: 4, status: "Locked" },
  { name: "R26.10", window: "01–14 Oct", items: 5, status: "Planning" },
  { name: "R26.11", window: "01–14 Nov", items: 3, status: "Planning" },
  { name: "R26.12", window: "01–14 Dec", items: 6, status: "Open" },
];
