import {
  ALL_AUDITS,
  ALL_AUDITS_AUDIT,
  AUDITS,
  DEPARTMENTS,
  KPI_META,
  MEASUREMENTS,
  MONTHS,
  SERVICES,
} from './demo.js';
export const EMPTY_FILTERS = {
  departments: [],
  owners: [],
  services: [],
  duration: 12,
};
export const deptById = new Map(DEPARTMENTS.map((d) => [d.id, d]));
export const auditById = new Map(AUDITS.map((a) => [a.id, a]));
export const serviceById = new Map(SERVICES.map((s) => [s.id, s]));
export function months(duration) {
  return MONTHS.slice(MONTHS.length - duration);
}
export function applyFilters(f) {
  const deptSet = new Set(f.departments);
  const ownerSet = new Set(f.owners);
  const svcSet = new Set(f.services);
  return MEASUREMENTS.filter((m) => {
    if (deptSet.size && !deptSet.has(m.deptId)) return false;
    if (svcSet.size && !svcSet.has(m.serviceId)) return false;
    if (ownerSet.size) {
      const dept = deptById.get(m.deptId);
      if (!ownerSet.has(dept.owner)) return false;
    }
    return true;
  });
}
const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** Weighted score of a measurement slice at a given month offset from the end. */
function scoreAt(rows, fromEnd) {
  if (!rows.length) return 0;
  let num = 0;
  let den = 0;
  for (const r of rows) {
    const w = auditById.get(r.auditId).weight;
    num += r.scores[r.scores.length - 1 - fromEnd] * w;
    den += w;
  }
  return num / den;
}
export const TARGETS = {
  compliance: 95,
  completeness: 92,
  correctness: 90,
};
export const RISK_THRESHOLD = 80;
export function kpiSummaries(rows, duration) {
  const ms = months(duration);
  return KPI_META.map(({ key, label, blurb }) => {
    const slice = rows.filter((r) => r.kpi === key);
    const series = ms.map((month, i) => ({
      month,
      value: Number(scoreAt(slice, ms.length - 1 - i).toFixed(1)),
    }));
    const score = series.length ? series[series.length - 1].value : 0;
    const delta = series.length > 1 ? Number((score - series[0].value).toFixed(1)) : 0;
    const byDept = new Map();
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
export function healthIndex(summaries) {
  const score = avg(summaries.map((s) => s.score));
  const delta = avg(summaries.map((s) => s.delta));
  const band =
    score >= 92 ? 'Healthy' : score >= 85 ? 'Stable' : score >= 78 ? 'Watch' : 'Critical';
  return {
    score: Number(score.toFixed(1)),
    delta: Number(delta.toFixed(1)),
    band,
  };
}
export function serviceRows(rows, duration) {
  return SERVICES.map((service) => {
    const slice = rows.filter((r) => r.serviceId === service.id);
    const scores = {};
    for (const { key } of KPI_META) {
      const s = slice.filter((r) => r.kpi === key);
      scores[key] = Number(scoreAt(s, 0).toFixed(1));
    }
    const overall = Number(scoreAt(slice, 0).toFixed(1));
    const prev = scoreAt(slice, Math.min(duration - 1, 11));
    const deptScores = new Map();
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
export function auditRows(rows, duration) {
  const ms = months(duration);
  const present = new Set(rows.map((r) => r.auditId));
  const totalDepts = new Set(rows.map((r) => r.deptId)).size;
  return AUDITS.filter((a) => present.has(a.id))
    .map((audit) => {
      const slice = rows.filter((r) => r.auditId === audit.id);
      const depts = new Map();
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
        series: ms.map((month, i) => ({
          month,
          value: Number(scoreAt(slice, ms.length - 1 - i).toFixed(1)),
        })),
      };
    })
    .sort((a, b) => a.score - b.score);
}
export function deptRows(rows, duration) {
  const byDept = new Map();
  for (const r of rows) {
    const arr = byDept.get(r.deptId) ?? [];
    arr.push(r);
    byDept.set(r.deptId, arr);
  }
  const out = [];
  byDept.forEach((slice, deptId) => {
    const scores = {};
    for (const { key } of KPI_META) {
      scores[key] = Number(
        scoreAt(
          slice.filter((r) => r.kpi === key),
          0,
        ).toFixed(1),
      );
    }
    const overall = Number(scoreAt(slice, 0).toFixed(1));
    const prev = scoreAt(slice, Math.min(duration - 1, 11));
    const byAudit = new Map();
    for (const row of slice) {
      const scores = byAudit.get(row.auditId) ?? [];
      scores.push(row.scores[row.scores.length - 1]);
      byAudit.set(row.auditId, scores);
    }
    const worst = [...byAudit.entries()].sort(([, a], [, b]) => avg(a) - avg(b))[0];
    out.push({
      dept: deptById.get(deptId),
      scores,
      overall,
      delta: Number((overall - prev).toFixed(1)),
      openFindings: slice.reduce((a, r) => a + r.openFindings, 0),
      failedAudits: [...byAudit.values()].filter((scores) => avg(scores) < RISK_THRESHOLD).length,
      auditsInScope: byAudit.size,
      worstAudit: worst ? auditById.get(worst[0]).name : '—',
    });
  });
  return out.sort((a, b) => a.overall - b.overall);
}
export function serviceLabel(serviceIds) {
  if (
    serviceIds.length === SERVICES.length &&
    SERVICES.every((service) => serviceIds.includes(service.id))
  ) {
    return 'All services';
  }
  return serviceIds
    .map((id) => serviceById.get(id)?.short)
    .filter((short) => Boolean(short))
    .join(' · ');
}
export function attentionItems(rows, duration) {
  const items = rows.map((r) => {
    const latest = r.scores[r.scores.length - 1];
    const prev = r.scores[Math.max(0, r.scores.length - Math.min(duration, 12))];
    const delta = Number((latest - prev).toFixed(1));
    const severity =
      latest < 70 || (latest < 80 && delta < -3) ? 'Critical' : latest < 80 ? 'High' : 'Medium';
    return {
      id: `${r.deptId}-${r.auditId}-${r.serviceId}-${r.kpi}`,
      dept: deptById.get(r.deptId),
      audit: auditById.get(r.auditId),
      serviceName: serviceById.get(r.serviceId).short,
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

export function serviceCards(rows, duration, kpi) {
  const cards = SERVICES.map((service) => {
    const slice = rows.filter((r) => r.serviceId === service.id && r.kpi === kpi);
    const score = Number(scoreAt(slice, 0).toFixed(1));
    const prev = scoreAt(slice, Math.min(duration - 1, 11));
    const byAudit = new Map();
    const byDept = new Map();
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

export function serviceDrill(rows, duration, kpi, serviceId) {
  const service = serviceById.get(serviceId);
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

/** One service's standing on a single audit. */

/** Everything the audit drill-down page shows for one audit on one KPI. */

export function auditDrill(rows, duration, kpi, auditId) {
  const isAll = auditId === ALL_AUDITS;
  const audit = isAll ? ALL_AUDITS_AUDIT : auditById.get(auditId);
  const ms = months(duration);
  const slice = rows.filter((r) => (isAll || r.auditId === auditId) && r.kpi === kpi);
  const score = Number(scoreAt(slice, 0).toFixed(1));
  const target = TARGETS[kpi];
  const services = audit.serviceIds
    .map((id) => serviceById.get(id))
    .filter((s) => Boolean(s))
    .map((service) => {
      const svcSlice = slice.filter((r) => r.serviceId === service.id);
      const svcScore = Number(scoreAt(svcSlice, 0).toFixed(1));
      const byDept = new Map();
      const byAudit = new Map();
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
  const byDept = new Map();
  for (const r of slice) byDept.set(r.deptId, [...(byDept.get(r.deptId) ?? []), r]);
  const depts = [];
  byDept.forEach((deptSlice, deptId) => {
    const deptScore = Number(scoreAt(deptSlice, 0).toFixed(1));
    const perService = deptSlice.map((r) => ({
      name: serviceById.get(r.serviceId).short,
      score: r.scores[r.scores.length - 1],
    }));
    const worst = [...perService].sort((a, b) => a.score - b.score)[0];
    depts.push({
      dept: deptById.get(deptId),
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
const SCORE_BANDS = [
  {
    band: '<70',
    test: (v) => v < 70,
  },
  {
    band: '70–80',
    test: (v) => v >= 70 && v < 80,
  },
  {
    band: '80–90',
    test: (v) => v >= 80 && v < 90,
  },
  {
    band: '90–95',
    test: (v) => v >= 90 && v < 95,
  },
  {
    band: '95+',
    test: (v) => v >= 95,
  },
];

/** Score bands for the audit drill-down department distribution. */
export function auditDistribution(rows) {
  return SCORE_BANDS.map(({ band, test }) => ({
    band,
    count: rows.filter((r) => test(r.score)).length,
  }));
}

/** Monthly trend per department for the worst `limit` departments on a KPI. */

export function deptTrends(rows, duration, kpi, limit = 6, pick = 'worst') {
  const ms = months(duration);
  const slice = rows.filter((r) => r.kpi === kpi);
  const byDept = new Map();
  for (const r of slice) byDept.set(r.deptId, [...(byDept.get(r.deptId) ?? []), r]);
  const ranked = [];
  byDept.forEach((v, deptId) =>
    ranked.push({
      deptId,
      rows: v,
      score: scoreAt(v, 0),
    }),
  );
  ranked.sort((a, b) => (pick === 'best' ? b.score - a.score : a.score - b.score));
  const picked = ranked.slice(0, limit);
  const depts = picked.map((p) => {
    const score = Number(p.score.toFixed(1));
    const prev = scoreAt(p.rows, Math.min(duration - 1, 11));
    return {
      dept: deptById.get(p.deptId),
      key: deptById.get(p.deptId).code,
      score,
      delta: Number((score - prev).toFixed(1)),
    };
  });
  const series = ms.map((month, i) => {
    const point = {
      month,
    };
    for (const p of picked) {
      const d = deptById.get(p.deptId);
      point[d.code] = Number(scoreAt(p.rows, ms.length - 1 - i).toFixed(1));
    }
    point.Estate = Number(scoreAt(slice, ms.length - 1 - i).toFixed(1));
    return point;
  });
  return {
    series,
    depts,
  };
}

/** Monthly trend per audit for the strongest `limit` audits on a KPI. */

export function auditTrends(audits, limit = 10) {
  const picked = [...audits].sort((a, b) => b.score - a.score).slice(0, limit);
  const ms = picked[0]?.series.map((p) => p.month) ?? [];
  const series = ms.map((month, i) => {
    const point = {
      month,
    };
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
const swing = (a) => {
  const vs = a.series.map((p) => p.value);
  return vs.length ? Number((Math.max(...vs) - Math.min(...vs)).toFixed(1)) : 0;
};
export function trendInsights(audits, depts, kpi) {
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
export function distribution(rows) {
  const bands = [
    {
      band: '<70',
      test: (v) => v < 70,
    },
    {
      band: '70–80',
      test: (v) => v >= 70 && v < 80,
    },
    {
      band: '80–90',
      test: (v) => v >= 80 && v < 90,
    },
    {
      band: '90–95',
      test: (v) => v >= 90 && v < 95,
    },
    {
      band: '95+',
      test: (v) => v >= 95,
    },
  ];
  return bands.map(({ band, test }) => ({
    band,
    count: rows.filter((r) => test(r.overall)).length,
  }));
}
