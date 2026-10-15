import {
  ALL_AUDITS,
  ALL_AUDITS_AUDIT,
  AUDITS,
  DEPARTMENTS,
  KPI_META,
  MEASUREMENTS,
  MONTHS,
  SERVICES,
  type Audit,
  type Department,
  type KpiKey,
  type Measurement,
} from './demo';

export type Duration = 3 | 6 | 12;

export type Filters = {
  departments: string[]; // empty = all
  owners: string[]; // empty = all
  services: string[]; // empty = all
  duration: Duration;
};

export const EMPTY_FILTERS: Filters = { departments: [], owners: [], services: [], duration: 12 };

export const deptById = new Map(DEPARTMENTS.map((d) => [d.id, d]));
export const auditById = new Map(AUDITS.map((a) => [a.id, a]));
export const serviceById = new Map(SERVICES.map((s) => [s.id, s]));

export function months(duration: Duration): string[] {
  return MONTHS.slice(MONTHS.length - duration);
}

export function applyFilters(f: Filters): Measurement[] {
  const deptSet = new Set(f.departments);
  const ownerSet = new Set(f.owners);
  const svcSet = new Set(f.services);
  return MEASUREMENTS.filter((m) => {
    if (deptSet.size && !deptSet.has(m.deptId)) return false;
    if (svcSet.size && !svcSet.has(m.serviceId)) return false;
    if (ownerSet.size) {
      const dept = deptById.get(m.deptId) as Department;
      if (!ownerSet.has(dept.owner)) return false;
    }
    return true;
  });
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** Weighted score of a measurement slice at a given month offset from the end. */
function scoreAt(rows: Measurement[], fromEnd: number): number {
  if (!rows.length) return 0;
  let num = 0;
  let den = 0;
  for (const r of rows) {
    const w = auditById.get(r.auditId)!.weight;
    num += r.scores[r.scores.length - 1 - fromEnd] * w;
    den += w;
  }
  return num / den;
}

export type KpiSummary = {
  key: KpiKey;
  label: string;
  blurb: string;
  score: number;
  delta: number;
  target: number;
  series: { month: string; value: number }[];
  audits: number;
  atRisk: number; // departments below threshold
};

export const TARGETS: Record<KpiKey, number> = { compliance: 95, completeness: 92, correctness: 90 };
export const RISK_THRESHOLD = 80;

export function kpiSummaries(rows: Measurement[], duration: Duration): KpiSummary[] {
  const ms = months(duration);
  return KPI_META.map(({ key, label, blurb }) => {
    const slice = rows.filter((r) => r.kpi === key);
    const series = ms.map((month, i) => ({
      month,
      value: Number(scoreAt(slice, ms.length - 1 - i).toFixed(1)),
    }));
    const score = series.length ? series[series.length - 1].value : 0;
    const delta = series.length > 1 ? Number((score - series[0].value).toFixed(1)) : 0;
    const byDept = new Map<string, number[]>();
    for (const r of slice) {
      const arr = byDept.get(r.deptId) ?? [];
      arr.push(r.scores[r.scores.length - 1]);
      byDept.set(r.deptId, arr);
    }
    let atRisk = 0;
    byDept.forEach((v) => {
      if (avg(v) < RISK_THRESHOLD) atRisk += 1;
    });
    return {
      key,
      label,
      blurb,
      score,
      delta,
      target: TARGETS[key],
      series,
      audits: new Set(slice.map((r) => r.auditId)).size,
      atRisk,
    };
  });
}

export function healthIndex(summaries: KpiSummary[]): { score: number; delta: number; band: string } {
  const score = avg(summaries.map((s) => s.score));
  const delta = avg(summaries.map((s) => s.delta));
  const band = score >= 92 ? 'Healthy' : score >= 85 ? 'Stable' : score >= 78 ? 'Watch' : 'Critical';
  return { score: Number(score.toFixed(1)), delta: Number(delta.toFixed(1)), band };
}

export type ServiceRow = {
  service: (typeof SERVICES)[number];
  scores: Record<KpiKey, number>;
  overall: number;
  delta: number;
  audits: number;
  openFindings: number;
  deptsAtRisk: number;
};

export function serviceRows(rows: Measurement[], duration: Duration): ServiceRow[] {
  return SERVICES.map((service) => {
    const slice = rows.filter((r) => r.serviceId === service.id);
    const scores = {} as Record<KpiKey, number>;
    for (const { key } of KPI_META) {
      const s = slice.filter((r) => r.kpi === key);
      scores[key] = Number(scoreAt(s, 0).toFixed(1));
    }
    const overall = Number(scoreAt(slice, 0).toFixed(1));
    const prev = scoreAt(slice, Math.min(duration - 1, 11));
    const deptScores = new Map<string, number[]>();
    for (const r of slice) {
      const arr = deptScores.get(r.deptId) ?? [];
      arr.push(r.scores[r.scores.length - 1]);
      deptScores.set(r.deptId, arr);
    }
    let deptsAtRisk = 0;
    deptScores.forEach((v) => {
      if (avg(v) < RISK_THRESHOLD) deptsAtRisk += 1;
    });
    return {
      service,
      scores,
      overall,
      delta: Number((overall - prev).toFixed(1)),
      audits: new Set(slice.map((r) => r.auditId)).size,
      openFindings: slice.reduce((a, r) => a + r.openFindings, 0),
      deptsAtRisk,
    };
  });
}

export type AuditRow = {
  audit: Audit;
  score: number;
  delta: number;
  coverage: number;
  ciChecked: number;
  nonCompliantPct: number;
  openFindings: number;
  newFindings: number;
  deptsBelow: number;
  series: { month: string; value: number }[];
};

export function auditRows(rows: Measurement[], duration: Duration): AuditRow[] {
  const ms = months(duration);
  const present = new Set(rows.map((r) => r.auditId));
  const totalDepts = new Set(rows.map((r) => r.deptId)).size;
  return AUDITS.filter((a) => present.has(a.id)).map((audit) => {
    const slice = rows.filter((r) => r.auditId === audit.id);
    const depts = new Map<string, number[]>();
    for (const row of slice) {
      const scores = depts.get(row.deptId) ?? [];
      scores.push(row.scores[row.scores.length - 1]);
      depts.set(row.deptId, scores);
    }
    const score = Number(scoreAt(slice, 0).toFixed(1));
    const prev = scoreAt(slice, Math.min(duration - 1, 11));
    return {
      audit,
      score,
      delta: Number((score - prev).toFixed(1)),
      coverage: totalDepts ? Number(((depts.size / totalDepts) * 100).toFixed(0)) : 0,
      ciChecked: slice.reduce((a, r) => a + r.ciChecked, 0),
      nonCompliantPct: Number((100 - score).toFixed(1)),
      openFindings: slice.reduce((a, r) => a + r.openFindings, 0),
      newFindings: Math.round(slice.reduce((a, r) => a + r.findings, 0) / duration),
      deptsBelow: [...depts.values()].filter((scores) => avg(scores) < RISK_THRESHOLD).length,
      series: ms.map((month, i) => ({ month, value: Number(scoreAt(slice, ms.length - 1 - i).toFixed(1)) })),
    };
  }).sort((a, b) => a.score - b.score);
}

export type DeptRow = {
  dept: Department;
  scores: Record<KpiKey, number>;
  overall: number;
  delta: number;
  openFindings: number;
  failedAudits: number;
  auditsInScope: number;
  worstAudit: string;
};

export function deptRows(rows: Measurement[], duration: Duration): DeptRow[] {
  const byDept = new Map<string, Measurement[]>();
  for (const r of rows) {
    const arr = byDept.get(r.deptId) ?? [];
    arr.push(r);
    byDept.set(r.deptId, arr);
  }
  const out: DeptRow[] = [];
  byDept.forEach((slice, deptId) => {
    const scores = {} as Record<KpiKey, number>;
    for (const { key } of KPI_META) {
      scores[key] = Number(scoreAt(slice.filter((r) => r.kpi === key), 0).toFixed(1));
    }
    const overall = Number(scoreAt(slice, 0).toFixed(1));
    const prev = scoreAt(slice, Math.min(duration - 1, 11));
    const byAudit = new Map<string, number[]>();
    for (const row of slice) {
      const scores = byAudit.get(row.auditId) ?? [];
      scores.push(row.scores[row.scores.length - 1]);
      byAudit.set(row.auditId, scores);
    }
    const worst = [...byAudit.entries()].sort(([, a], [, b]) => avg(a) - avg(b))[0];
    out.push({
      dept: deptById.get(deptId)!,
      scores,
      overall,
      delta: Number((overall - prev).toFixed(1)),
      openFindings: slice.reduce((a, r) => a + r.openFindings, 0),
      failedAudits: [...byAudit.values()].filter((scores) => avg(scores) < RISK_THRESHOLD).length,
      auditsInScope: byAudit.size,
      worstAudit: worst ? auditById.get(worst[0])!.name : '—',
    });
  });
  return out.sort((a, b) => a.overall - b.overall);
}

export type AttentionItem = {
  id: string;
  dept: Department;
  audit: Audit;
  serviceName: string;
  kpi: KpiKey;
  score: number;
  delta: number;
  openFindings: number;
  slaBreachDays: number;
  severity: 'Critical' | 'High' | 'Medium';
  lastRun: string;
};

export function serviceLabel(serviceIds: string[]): string {
  if (serviceIds.length === SERVICES.length && SERVICES.every((service) => serviceIds.includes(service.id))) {
    return 'All services';
  }
  return serviceIds
    .map((id) => serviceById.get(id)?.short)
    .filter((short): short is string => Boolean(short))
    .join(' · ');
}

export function attentionItems(rows: Measurement[], duration: Duration): AttentionItem[] {
  const items: AttentionItem[] = rows.map((r) => {
    const latest = r.scores[r.scores.length - 1];
    const prev = r.scores[Math.max(0, r.scores.length - Math.min(duration, 12))];
    const delta = Number((latest - prev).toFixed(1));
    const severity: AttentionItem['severity'] =
      latest < 70 || (latest < 80 && delta < -3) ? 'Critical' : latest < 80 ? 'High' : 'Medium';
    return {
      id: `${r.deptId}-${r.auditId}-${r.serviceId}-${r.kpi}`,
      dept: deptById.get(r.deptId)!,
      audit: auditById.get(r.auditId)!,
      serviceName: serviceById.get(r.serviceId)!.short,
      kpi: r.kpi,
      score: latest,
      delta,
      openFindings: r.openFindings,
      slaBreachDays: r.slaBreachDays,
      severity,
      lastRun: r.lastRun,
    };
  });
  return items
    .filter((i) => i.score < 85 || i.delta < -4)
    .sort((a, b) => a.score - b.score || a.delta - b.delta);
}

/** Per-service card for the executive dashboard, scoped to one KPI. */
export type ServiceCard = {
  service: (typeof SERVICES)[number];
  score: number;
  delta: number;
  target: number;
  audits: number;
  failing: number; // audits below target
  compliantCis: number;
  nonCompliantCis: number;
  deptsAtRisk: number;
  depts: number;
  rank: number;
};

export function serviceCards(rows: Measurement[], duration: Duration, kpi: KpiKey): ServiceCard[] {
  const cards = SERVICES.map((service) => {
    const slice = rows.filter((r) => r.serviceId === service.id && r.kpi === kpi);
    const score = Number(scoreAt(slice, 0).toFixed(1));
    const prev = scoreAt(slice, Math.min(duration - 1, 11));
    const byAudit = new Map<string, number[]>();
    const byDept = new Map<string, number[]>();
    for (const r of slice) {
      const latest = r.scores[r.scores.length - 1];
      byAudit.set(r.auditId, [...(byAudit.get(r.auditId) ?? []), latest]);
      byDept.set(r.deptId, [...(byDept.get(r.deptId) ?? []), latest]);
    }
    let failing = 0;
    byAudit.forEach((v) => {
      if (avg(v) < TARGETS[kpi]) failing += 1;
    });
    let deptsAtRisk = 0;
    byDept.forEach((v) => {
      if (avg(v) < RISK_THRESHOLD) deptsAtRisk += 1;
    });
    return {
      service,
      score,
      delta: Number((score - prev).toFixed(1)),
      target: TARGETS[kpi],
      audits: byAudit.size,
      failing,
      compliantCis: slice.reduce((a, r) => a + r.compliantCis, 0),
      nonCompliantCis: slice.reduce((a, r) => a + r.nonCompliantCis, 0),
      deptsAtRisk,
      depts: byDept.size,
      rank: 0,
    };
  });
  const ordered = [...cards].sort((a, b) => b.score - a.score);
  ordered.forEach((c, i) => {
    c.rank = i + 1;
  });
  return cards;
}

/** Everything the service drill-down page shows for one service on one KPI. */
export type ServiceDrill = {
  service: (typeof SERVICES)[number];
  score: number;
  monthDelta: number;
  ciChecked: number;
  compliantCis: number;
  nonCompliantCis: number;
  newFindings: number;
  audits: AuditRow[];
  depts: DeptRow[];
  auditsBelowTarget: number;
  deptsAtRisk: number;
};

export function serviceDrill(
  rows: Measurement[],
  duration: Duration,
  kpi: KpiKey,
  serviceId: string,
): ServiceDrill {
  const service = serviceById.get(serviceId)!;
  const slice = rows.filter((r) => r.serviceId === serviceId && r.kpi === kpi);
  const audits = auditRows(slice, duration);
  const depts = deptRows(slice, duration);
  const score = Number(scoreAt(slice, 0).toFixed(1));
  return {
    service,
    score,
    monthDelta: Number((score - scoreAt(slice, 1)).toFixed(1)),
    ciChecked: slice.reduce((a, r) => a + r.ciChecked, 0),
    compliantCis: slice.reduce((a, r) => a + r.compliantCis, 0),
    nonCompliantCis: slice.reduce((a, r) => a + r.nonCompliantCis, 0),
    newFindings: Math.round(slice.reduce((a, r) => a + r.findings, 0) / duration),
    audits,
    depts,
    auditsBelowTarget: audits.filter((a) => a.score < TARGETS[kpi]).length,
    deptsAtRisk: depts.filter((d) => d.failedAudits >= 3 || d.overall < RISK_THRESHOLD).length,
  };
}

/** One department's standing on a single audit, across the services the audit covers. */
export type AuditDeptRow = {
  dept: Department;
  score: number;
  delta: number;
  openFindings: number;
  servicesInScope: number;
  servicesBelow: number;
  worstService: string;
};

/** One service's standing on a single audit. */
export type AuditServiceRow = {
  service: (typeof SERVICES)[number];
  score: number;
  delta: number;
  nonCompliantPct: number;
  openFindings: number;
  newFindings: number;
  ciChecked: number;
  nonCompliantCis: number;
  /** Audits in scope for this service (1 when a single audit is selected). */
  auditsInScope: number;
  /** Of those, how many sit at or above the KPI target. */
  auditsOnTarget: number;
  deptsBelow: number;
  depts: number;
  series: { month: string; value: number }[];
};

/** Everything the audit drill-down page shows for one audit on one KPI. */
export type AuditDrill = {
  audit: Audit;
  score: number;
  monthDelta: number;
  windowDelta: number;
  ciChecked: number;
  compliantCis: number;
  nonCompliantCis: number;
  newFindings: number;
  openFindings: number;
  coverage: number;
  series: { month: string; value: number }[];
  services: AuditServiceRow[];
  servicesBelowTarget: number;
  depts: AuditDeptRow[];
  deptsBelowTarget: number;
  deptsAtRisk: number;
};

export function auditDrill(
  rows: Measurement[],
  duration: Duration,
  kpi: KpiKey,
  auditId: string,
): AuditDrill {
  const isAll = auditId === ALL_AUDITS;
  const audit = isAll ? ALL_AUDITS_AUDIT : auditById.get(auditId)!;
  const ms = months(duration);
  const slice = rows.filter((r) => (isAll || r.auditId === auditId) && r.kpi === kpi);
  const score = Number(scoreAt(slice, 0).toFixed(1));
  const target = TARGETS[kpi];

  const services: AuditServiceRow[] = audit.serviceIds
    .map((id) => serviceById.get(id))
    .filter((s): s is (typeof SERVICES)[number] => Boolean(s))
    .map((service) => {
      const svcSlice = slice.filter((r) => r.serviceId === service.id);
      const svcScore = Number(scoreAt(svcSlice, 0).toFixed(1));
      const byDept = new Map<string, number[]>();
      const byAudit = new Map<string, number[]>();
      for (const r of svcSlice) {
        byDept.set(r.deptId, [...(byDept.get(r.deptId) ?? []), r.scores[r.scores.length - 1]]);
        byAudit.set(r.auditId, [...(byAudit.get(r.auditId) ?? []), r.scores[r.scores.length - 1]]);
      }
      return {
        service,
        score: svcScore,
        delta: Number((svcScore - scoreAt(svcSlice, Math.min(duration - 1, 11))).toFixed(1)),
        nonCompliantPct: Number((100 - svcScore).toFixed(1)),
        openFindings: svcSlice.reduce((a, r) => a + r.openFindings, 0),
        newFindings: Math.round(svcSlice.reduce((a, r) => a + r.findings, 0) / duration),
        ciChecked: svcSlice.reduce((a, r) => a + r.ciChecked, 0),
        nonCompliantCis: svcSlice.reduce((a, r) => a + r.nonCompliantCis, 0),
        auditsInScope: byAudit.size,
        auditsOnTarget: [...byAudit.values()].filter((v) => avg(v) >= target).length,
        deptsBelow: [...byDept.values()].filter((v) => avg(v) < RISK_THRESHOLD).length,
        depts: byDept.size,
        series: ms.map((month, i) => ({
          month,
          value: Number(scoreAt(svcSlice, ms.length - 1 - i).toFixed(1)),
        })),
      };
    })
    .sort((a, b) => a.score - b.score);

  const byDept = new Map<string, Measurement[]>();
  for (const r of slice) byDept.set(r.deptId, [...(byDept.get(r.deptId) ?? []), r]);
  const depts: AuditDeptRow[] = [];
  byDept.forEach((deptSlice, deptId) => {
    const deptScore = Number(scoreAt(deptSlice, 0).toFixed(1));
    const perService = deptSlice.map((r) => ({
      name: serviceById.get(r.serviceId)!.short,
      score: r.scores[r.scores.length - 1],
    }));
    const worst = [...perService].sort((a, b) => a.score - b.score)[0];
    depts.push({
      dept: deptById.get(deptId)!,
      score: deptScore,
      delta: Number((deptScore - scoreAt(deptSlice, Math.min(duration - 1, 11))).toFixed(1)),
      openFindings: deptSlice.reduce((a, r) => a + r.openFindings, 0),
      servicesInScope: perService.length,
      servicesBelow: perService.filter((p) => p.score < RISK_THRESHOLD).length,
      worstService: worst ? worst.name : '—',
    });
  });
  depts.sort((a, b) => a.score - b.score);

  const totalDepts = new Set(rows.map((r) => r.deptId)).size;
  return {
    audit,
    score,
    monthDelta: Number((score - scoreAt(slice, 1)).toFixed(1)),
    windowDelta: Number((score - scoreAt(slice, Math.min(duration - 1, 11))).toFixed(1)),
    ciChecked: slice.reduce((a, r) => a + r.ciChecked, 0),
    compliantCis: slice.reduce((a, r) => a + r.compliantCis, 0),
    nonCompliantCis: slice.reduce((a, r) => a + r.nonCompliantCis, 0),
    newFindings: Math.round(slice.reduce((a, r) => a + r.findings, 0) / duration),
    openFindings: slice.reduce((a, r) => a + r.openFindings, 0),
    coverage: totalDepts ? Number(((byDept.size / totalDepts) * 100).toFixed(0)) : 0,
    series: ms.map((month, i) => ({
      month,
      value: Number(scoreAt(slice, ms.length - 1 - i).toFixed(1)),
    })),
    services,
    servicesBelowTarget: services.filter((s) => s.score < target).length,
    depts,
    deptsBelowTarget: depts.filter((d) => d.score < target).length,
    deptsAtRisk: depts.filter((d) => d.score < RISK_THRESHOLD).length,
  };
}

const SCORE_BANDS: { band: string; test: (v: number) => boolean }[] = [
  { band: '<70', test: (v) => v < 70 },
  { band: '70–80', test: (v) => v >= 70 && v < 80 },
  { band: '80–90', test: (v) => v >= 80 && v < 90 },
  { band: '90–95', test: (v) => v >= 90 && v < 95 },
  { band: '95+', test: (v) => v >= 95 },
];

/** Score bands for the audit drill-down department distribution. */
export function auditDistribution(rows: AuditDeptRow[]): { band: string; count: number }[] {
  return SCORE_BANDS.map(({ band, test }) => ({
    band,
    count: rows.filter((r) => test(r.score)).length,
  }));
}

/** Monthly trend per department for the worst `limit` departments on a KPI. */
export type DeptTrend = {
  dept: Department;
  key: string;
  score: number;
  delta: number;
};

export function deptTrends(
  rows: Measurement[],
  duration: Duration,
  kpi: KpiKey,
  limit = 6,
  pick: 'worst' | 'best' = 'worst',
): { series: Record<string, number | string>[]; depts: DeptTrend[] } {
  const ms = months(duration);
  const slice = rows.filter((r) => r.kpi === kpi);
  const byDept = new Map<string, Measurement[]>();
  for (const r of slice) byDept.set(r.deptId, [...(byDept.get(r.deptId) ?? []), r]);

  const ranked: { deptId: string; rows: Measurement[]; score: number }[] = [];
  byDept.forEach((v, deptId) => ranked.push({ deptId, rows: v, score: scoreAt(v, 0) }));
  ranked.sort((a, b) => (pick === 'best' ? b.score - a.score : a.score - b.score));
  const picked = ranked.slice(0, limit);

  const depts: DeptTrend[] = picked.map((p) => {
    const score = Number(p.score.toFixed(1));
    const prev = scoreAt(p.rows, Math.min(duration - 1, 11));
    return {
      dept: deptById.get(p.deptId)!,
      key: deptById.get(p.deptId)!.code,
      score,
      delta: Number((score - prev).toFixed(1)),
    };
  });

  const series = ms.map((month, i) => {
    const point: Record<string, number | string> = { month };
    for (const p of picked) {
      const d = deptById.get(p.deptId)!;
      point[d.code] = Number(scoreAt(p.rows, ms.length - 1 - i).toFixed(1));
    }
    point.Estate = Number(scoreAt(slice, ms.length - 1 - i).toFixed(1));
    return point;
  });

  return { series, depts };
}

/** Monthly trend per audit for the strongest `limit` audits on a KPI. */
export type AuditTrend = {
  audit: Audit;
  key: string;
  score: number;
  delta: number;
};

export function auditTrends(
  audits: AuditRow[],
  limit = 10,
): { series: Record<string, number | string>[]; audits: AuditTrend[] } {
  const picked = [...audits].sort((a, b) => b.score - a.score).slice(0, limit);
  const ms = picked[0]?.series.map((p) => p.month) ?? [];
  const series = ms.map((month, i) => {
    const point: Record<string, number | string> = { month };
    for (const a of picked) point[a.audit.name] = a.series[i].value;
    return point;
  });
  return {
    series,
    audits: picked.map((a) => ({
      audit: a.audit,
      key: a.audit.name,
      score: a.score,
      delta: a.delta,
    })),
  };
}

const swing = (a: AuditRow) => {
  const vs = a.series.map((p) => p.value);
  return vs.length ? Number((Math.max(...vs) - Math.min(...vs)).toFixed(1)) : 0;
};

export type TrendInsights = {
  avgAuditChange: number;
  mostImproved: AuditRow | null;
  mostCritical: AuditRow | null;
  strongest: AuditRow | null;
  mostVolatile: AuditRow | null;
  volatility: number;
  cycles: number;
  stableDepts: number;
  totalDepts: number;
  passedAudits: number;
  failedAudits: number;
};

export function trendInsights(audits: AuditRow[], depts: DeptRow[], kpi: KpiKey): TrendInsights {
  const target = TARGETS[kpi];
  const sortedByDelta = [...audits].sort((a, b) => b.delta - a.delta);
  return {
    avgAuditChange: Number(avg(audits.map((a) => a.delta)).toFixed(1)),
    mostImproved: sortedByDelta[0] ?? null,
    mostCritical: [...audits].sort((a, b) => a.score - b.score)[0] ?? null,
    strongest: [...audits].sort((a, b) => b.score - a.score)[0] ?? null,
    mostVolatile: [...audits].sort((a, b) => swing(b) - swing(a))[0] ?? null,
    volatility: audits.length ? swing([...audits].sort((a, b) => swing(b) - swing(a))[0]) : 0,
    cycles: audits[0]?.series.length ?? 0,
    stableDepts: depts.filter((d) => Math.abs(d.delta) <= 1 && d.overall >= RISK_THRESHOLD).length,
    totalDepts: depts.length,
    passedAudits: audits.filter((a) => a.score >= target).length,
    failedAudits: audits.filter((a) => a.score < target).length,
  };
}

export function distribution(rows: DeptRow[]): { band: string; count: number }[] {
  const bands = [
    { band: '<70', test: (v: number) => v < 70 },
    { band: '70–80', test: (v: number) => v >= 70 && v < 80 },
    { band: '80–90', test: (v: number) => v >= 80 && v < 90 },
    { band: '90–95', test: (v: number) => v >= 90 && v < 95 },
    { band: '95+', test: (v: number) => v >= 95 },
  ];
  return bands.map(({ band, test }) => ({ band, count: rows.filter((r) => test(r.overall)).length }));
}
