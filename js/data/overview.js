// Enterprise Overview: joins the three factor models without merging their definitions.
// Compliance and Correctness come from the audit measurements (department x audit x service);
// Completeness comes from the class model in completeness.js. The status card uses an equal-weight average of factor scores.
import { KPI_META, SERVICES } from './demo.js';
import { TARGETS, auditRows, deptById, deptRows, kpiSummaries, months } from './select.js';
import {
  COMPLETENESS_TARGET,
  categoryViews,
  completenessOverall,
  departmentSummary,
  pillarViews,
} from './completeness.js';

const round1 = (value) => Math.round(value * 10) / 10;
const AUDIT_FACTORS = ['compliance', 'correctness'];

export const FACTORS = ['compliance', 'completeness', 'correctness'];
export const FACTOR_LABEL = Object.fromEntries(KPI_META.map((meta) => [meta.key, meta.label]));
export const FACTOR_TARGET = {
  compliance: TARGETS.compliance,
  completeness: COMPLETENESS_TARGET,
  correctness: TARGETS.correctness,
};

/** Transparent, configurable priority rules (percentage points below target). */
export const PRIORITY_RULES = { criticalGap: 10, highGap: 5, trendThreshold: 0.1 };
export const SEVERITY_ORDER = ['Critical', 'High', 'Medium', 'On target'];
export const PRIORITY_RULE_TEXT = `Critical: ≥${PRIORITY_RULES.criticalGap} pts below target · High: ≥${PRIORITY_RULES.highGap} pts below or declining · Medium: below target. Ranked by priority, then gap, then affected count.`;

export function trendStatus(delta) {
  if (delta > PRIORITY_RULES.trendThreshold) return 'Improving';
  if (delta < -PRIORITY_RULES.trendThreshold) return 'Declining';
  return 'Stable';
}

export function priorityOf(gap, delta) {
  if (gap <= 0) return 'On target';
  if (gap >= PRIORITY_RULES.criticalGap) return 'Critical';
  if (gap >= PRIORITY_RULES.highGap || delta < -PRIORITY_RULES.trendThreshold) return 'High';
  return 'Medium';
}

const gapOf = (score, target) => round1(Math.max(0, target - score));
const monthDeltaOf = (series) =>
  series.length < 2 ? 0 : round1(series[series.length - 1].value - series[series.length - 2].value);
const fmt = (n) => n.toLocaleString('en-US');

function auditFactor(rows, duration, key) {
  const summary = kpiSummaries(rows, duration).find((item) => item.key === key);
  const slice = rows.filter((row) => row.kpi === key);
  const target = FACTOR_TARGET[key];
  const gap = gapOf(summary.score, target);
  return {
    key,
    label: FACTOR_LABEL[key],
    available: slice.length > 0,
    score: summary.score,
    delta: summary.delta,
    monthDelta: monthDeltaOf(summary.series),
    target,
    gap,
    series: summary.series,
    passing: slice.reduce((sum, row) => sum + row.compliantCis, 0),
    failing: slice.reduce((sum, row) => sum + row.nonCompliantCis, 0),
    passLabel: key === 'compliance' ? 'Compliant checks' : 'Valid checks',
    failLabel: key === 'compliance' ? 'Non-compliant checks' : 'Invalid checks',
    note: `${summary.audits} audit rules · counts are audit checks, not distinct CIs`,
    audits: summary.audits,
    blurb: KPI_META.find((meta) => meta.key === key)?.blurb ?? '',
    status: trendStatus(summary.delta),
    priority: priorityOf(gap, summary.delta),
  };
}

/** One summary per factor, each computed with that factor's existing logic. */
export function factorSummaries(rows, duration, scope = null) {
  const completeness = completenessOverall(duration, scope);
  return {
    compliance: auditFactor(rows, duration, 'compliance'),
    completeness: {
      key: 'completeness',
      label: FACTOR_LABEL.completeness,
      available: completeness.totalCis > 0,
      score: completeness.score,
      delta: completeness.delta,
      monthDelta: completeness.monthDelta,
      target: COMPLETENESS_TARGET,
      gap: completeness.targetGap,
      series: completeness.series,
      passing: completeness.completeCis,
      failing: completeness.incompleteCis,
      passLabel: 'Complete CIs',
      failLabel: 'Incomplete CIs',
      note: `${completeness.categories} CI classes · distinct CIs`,
      classes: completeness.categories,
      classesOnTarget: completeness.categoriesOnTarget,
      blurb: KPI_META.find((meta) => meta.key === 'completeness')?.blurb ?? '',
      status: trendStatus(completeness.delta),
      priority: priorityOf(completeness.targetGap, completeness.delta),
    },
    correctness: auditFactor(rows, duration, 'correctness'),
  };
}

/** Equal-weight simple average of the measured factor scores (approved by the dashboard owner); not a weighted health index. */
export function averageHealth(factors) {
  const measured = FACTORS.map((key) => factors[key]).filter((factor) => factor.available);
  if (!measured.length) return null;
  const mean = (pick) => round1(measured.reduce((sum, factor) => sum + pick(factor), 0) / measured.length);
  const score = mean((factor) => factor.score);
  const target = mean((factor) => factor.target);
  return {
    score,
    target,
    gap: gapOf(score, target),
    delta: mean((factor) => factor.delta),
    count: measured.length,
    onTarget: measured.filter((factor) => factor.score >= factor.target).length,
  };
}

/** Month-aligned series for the shared chart, with month-over-month change per factor. */
export function combinedTrend(factors, duration) {
  return months(duration).map((month, index) => {
    const point = { month };
    for (const key of FACTORS) {
      const factor = factors[key];
      if (!factor.available) continue;
      const value = factor.series[index]?.value;
      if (value == null) continue;
      point[key] = value;
      const prev = factor.series[index - 1]?.value;
      point[`${key}Change`] = prev == null ? null : round1(value - prev);
    }
    return point;
  });
}

/** Category comparison. Only Completeness is measured per category. */
export function categoryHealth(duration, scope = null) {
  return pillarViews(duration, scope).map((view) => ({
    pillar: view.pillar,
    available: view.totalCis > 0,
    completeness: {
      score: view.score,
      gap: view.targetGap,
      delta: view.delta,
      monthDelta: view.monthDelta,
      status: view.status,
      incompleteCis: view.incompleteCis,
      totalCis: view.totalCis,
      categories: view.categories,
      categoriesOnTarget: view.categoriesOnTarget,
    },
    compliance: null,
    correctness: null,
    priority: view.totalCis > 0 ? priorityOf(view.targetGap, view.delta) : 'On target',
  }));
}

/** Ranked issues: audit rules below target (Compliance, Correctness) and classes below target (Completeness). */
export function priorityItems(rows, duration, scope = null) {
  const items = [];
  for (const key of AUDIT_FACTORS) {
    const target = FACTOR_TARGET[key];
    const kpiRows = rows.filter((row) => row.kpi === key);
    for (const audit of auditRows(kpiRows, duration)) {
      if (audit.score >= target) continue;
      const slice = kpiRows.filter((row) => row.auditId === audit.audit.id);
      const byDept = new Map();
      for (const row of slice) {
        const scores = byDept.get(row.deptId) ?? [];
        scores.push(row.scores[row.scores.length - 1]);
        byDept.set(row.deptId, scores);
      }
      let worstId = null;
      let worstScore = Infinity;
      byDept.forEach((scores, deptId) => {
        const avg = scores.reduce((sum, value) => sum + value, 0) / scores.length;
        if (avg < worstScore) {
          worstScore = avg;
          worstId = deptId;
        }
      });
      const dept = worstId ? deptById.get(worstId) : null;
      const gap = round1(target - audit.score);
      items.push({
        id: `${key}-${audit.audit.id}`,
        factor: key,
        pillarId: null,
        categoryLabel: 'Not mapped',
        name: audit.audit.name,
        kind: 'Audit rule',
        affected: slice.reduce((sum, row) => sum + row.nonCompliantCis, 0),
        unit: key === 'compliance' ? 'non-compliant checks' : 'invalid checks',
        score: audit.score,
        goal: target,
        gap,
        delta: audit.delta,
        status: trendStatus(audit.delta),
        severity: priorityOf(gap, audit.delta),
        persistent: audit.series.every((point) => point.value < target),
        owner: dept ? dept.owner : '—',
        ownerNote: dept ? `Lowest: ${dept.name}` : '',
        action:
          audit.delta < -PRIORITY_RULES.trendThreshold
            ? `Review the decline with ${dept?.owner ?? 'the audit owner'}`
            : `Fix failing checks, starting with ${dept?.name ?? 'the lowest department'}`,
        target: { type: 'audit', kpi: key, id: audit.audit.id },
      });
    }
  }
  for (const view of categoryViews(duration, null, scope)) {
    if (view.score >= COMPLETENESS_TARGET) continue;
    const gap = round1(COMPLETENESS_TARGET - view.score);
    items.push({
      id: `completeness-${view.category.id}`,
      factor: 'completeness',
      pillarId: view.pillar.id,
      categoryLabel: view.pillar.name,
      name: view.category.name,
      kind: 'CI class',
      affected: view.incompleteCis,
      unit: 'incomplete CIs',
      score: view.score,
      goal: COMPLETENESS_TARGET,
      gap,
      delta: view.delta,
      status: trendStatus(view.delta),
      severity: priorityOf(gap, view.delta),
      persistent: view.series.every((point) => point.value < COMPLETENESS_TARGET),
      owner: view.pillar.owner,
      ownerNote: 'Category owner',
      action: view.worstAttribute
        ? `Populate ${view.worstAttribute.attribute} (${fmt(view.worstAttribute.missingCis)} CIs missing)`
        : 'Review missing mandatory attributes',
      target: { type: 'class', pillarId: view.pillar.id, categoryId: view.category.id },
    });
  }
  const rank = (severity) => SEVERITY_ORDER.indexOf(severity);
  return items.sort(
    (a, b) => rank(a.severity) - rank(b.severity) || b.gap - a.gap || b.affected - a.affected,
  );
}

function factorCell(score, delta, failing, target) {
  return { score, delta, failing, below: score < target };
}

function withBelow(row) {
  const measured = FACTORS.filter((key) => row.factors[key]);
  const belowKeys = measured.filter((key) => row.factors[key].below);
  return {
    ...row,
    measured: measured.length,
    below: belowKeys.length,
    belowKeys,
    totalGap: round1(
      belowKeys.reduce((sum, key) => sum + (FACTOR_TARGET[key] - row.factors[key].score), 0),
    ),
  };
}

/** Per-department scores, kept separate per factor. Completeness uses the demo department allocation. */
export function departmentQuality(rows, duration, scope = null) {
  const byId = new Map();
  const ensure = (dept) => {
    if (!byId.has(dept.id)) {
      byId.set(dept.id, {
        id: dept.id,
        name: dept.name,
        code: dept.code,
        owner: dept.owner,
        factors: { compliance: null, completeness: null, correctness: null },
      });
    }
    return byId.get(dept.id);
  };
  for (const key of AUDIT_FACTORS) {
    const kpiRows = rows.filter((row) => row.kpi === key);
    const failing = new Map();
    for (const row of kpiRows) failing.set(row.deptId, (failing.get(row.deptId) ?? 0) + row.nonCompliantCis);
    for (const dept of deptRows(kpiRows, duration)) {
      ensure(dept.dept).factors[key] = factorCell(
        dept.scores[key],
        dept.delta,
        failing.get(dept.dept.id) ?? 0,
        FACTOR_TARGET[key],
      );
    }
  }
  for (const dept of departmentSummary(duration, scope).rows) {
    const series = dept.series;
    ensure(dept.department).factors.completeness = factorCell(
      dept.score,
      round1((series[series.length - 1]?.value ?? dept.score) - (series[0]?.value ?? dept.score)),
      dept.incompleteCis,
      COMPLETENESS_TARGET,
    );
  }
  return [...byId.values()].map(withBelow);
}

/** Per-service scores. Completeness has no service relationship, so it stays empty. */
export function serviceQuality(rows, duration) {
  return SERVICES.map((service) => {
    const slice = rows.filter((row) => row.serviceId === service.id);
    if (!slice.length) return null;
    const summaries = kpiSummaries(slice, duration);
    const factors = { compliance: null, completeness: null, correctness: null };
    for (const key of AUDIT_FACTORS) {
      const summary = summaries.find((item) => item.key === key);
      const failing = slice
        .filter((row) => row.kpi === key)
        .reduce((sum, row) => sum + row.nonCompliantCis, 0);
      factors[key] = factorCell(summary.score, summary.delta, failing, FACTOR_TARGET[key]);
    }
    return withBelow({ id: service.id, name: service.name, code: service.short, owner: service.owner, factors });
  }).filter(Boolean);
}

/** Insights computed from the joined data; none of the wording or rankings is fixed. */
export function crossFactorInsights({ factors, categories, items, departments, services, duration, scope = null }) {
  const out = [];
  const available = FACTORS.map((key) => factors[key]).filter((factor) => factor.available);
  const period = `the last ${duration} months`;

  const gaps = available.filter((factor) => factor.gap > 0).sort((a, b) => b.gap - a.gap);
  if (gaps.length) {
    const top = gaps[0];
    const others = gaps.slice(1).map((factor) => `${factor.label} ${factor.gap.toFixed(1)} pts`);
    out.push({
      id: 'largest-gap',
      severity: top.priority === 'Critical' || top.priority === 'High' ? 'High' : 'Medium',
      title: `${top.label} has the largest gap: ${top.gap.toFixed(1)} pts below its ${top.target}% target`,
      evidence: `${top.label} is at ${top.score.toFixed(1)}%.${others.length ? ` Other gaps: ${others.join(', ')}.` : ' The other factors meet their targets.'}`,
      action: `Open the ${top.label} dashboard`,
      target: { type: 'kpi', key: top.key },
    });
  } else if (available.length) {
    out.push({
      id: 'largest-gap',
      severity: 'Low',
      title: 'All measured factors meet their targets',
      evidence: available.map((factor) => `${factor.label} ${factor.score.toFixed(1)}%`).join(', '),
    });
  }

  const measuredCats = categories.filter((cat) => cat.available);
  const worstCat = measuredCats.slice().sort((a, b) => b.completeness.gap - a.completeness.gap)[0];
  if (worstCat && worstCat.completeness.gap > 0) {
    out.push({
      id: 'category-gap',
      severity: worstCat.priority === 'Critical' || worstCat.priority === 'High' ? 'High' : 'Medium',
      title: `${worstCat.pillar.name} has the largest category gap in Completeness`,
      evidence: `${worstCat.completeness.score.toFixed(1)}% (${worstCat.completeness.gap.toFixed(1)} pts below ${COMPLETENESS_TARGET}%), ${fmt(worstCat.completeness.incompleteCis)} incomplete CIs.`,
      impact: 'Compliance and Correctness are not measured by category.',
      action: `Open ${worstCat.pillar.name}`,
      target: { type: 'pillar', pillarId: worstCat.pillar.id },
    });
  }

  const declining = [
    ...available.filter((factor) => factor.status === 'Declining').map((factor) => ({
      label: factor.label,
      delta: factor.delta,
      target: { type: 'kpi', key: factor.key },
    })),
    ...measuredCats
      .filter((cat) => cat.completeness.status === 'Declining')
      .map((cat) => ({
        label: `${cat.pillar.name} Completeness`,
        delta: cat.completeness.delta,
        target: { type: 'pillar', pillarId: cat.pillar.id },
      })),
  ].sort((a, b) => a.delta - b.delta);
  if (declining.length) {
    out.push({
      id: 'declining',
      severity: 'Medium',
      title: `${declining.length} ${declining.length === 1 ? 'area' : 'areas'} declined over ${period}`,
      evidence: declining.map((item) => `${item.label} ${item.delta.toFixed(1)} pts`).join(', ') + '.',
      action: `Review ${declining[0].label} first`,
      target: declining[0].target,
    });
  } else if (available.length) {
    out.push({
      id: 'declining',
      severity: 'Low',
      title: `No factor or category declined over ${period}`,
      evidence: available.map((factor) => `${factor.label} ${factor.delta >= 0 ? '+' : ''}${factor.delta.toFixed(1)} pts`).join(', ') + '.',
    });
  }

  const multi = departments
    .filter((dept) => dept.below >= 2)
    .sort((a, b) => b.below - a.below || b.totalGap - a.totalGap);
  if (departments.length) {
    const all = multi.filter((dept) => dept.below === 3).length;
    const lead = multi[0];
    out.push({
      id: 'shared-departments',
      severity: multi.length / departments.length >= 0.25 ? 'High' : multi.length ? 'Medium' : 'Low',
      title: `${multi.length} of ${departments.length} departments are below target in 2 or more factors`,
      evidence: lead
        ? `${all} are below in all three. Largest combined gap: ${lead.name} (${lead.belowKeys
            .map((key) => `${FACTOR_LABEL[key]} ${lead.factors[key].score.toFixed(1)}%`)
            .join(', ')}).`
        : 'No department is below target in more than one factor.',
      impact:
        'These issues occur together; the data does not show that one causes another. Completeness by department is a demo allocation.',
      action: lead ? `Scope the dashboard to ${lead.name}` : undefined,
      target: lead ? { type: 'department', id: lead.id } : undefined,
    });
  }

  if (services.length) {
    const both = services
      .filter((svc) => svc.factors.compliance?.below && svc.factors.correctness?.below)
      .sort((a, b) => b.totalGap - a.totalGap);
    out.push({
      id: 'service-impact',
      severity: both.length ? 'Medium' : 'Low',
      title: `${both.length} of ${services.length} services are below target in both Compliance and Correctness`,
      evidence: (both.length ? both : services)
        .map(
          (svc) =>
            `${svc.code} ${svc.factors.compliance.score.toFixed(1)}% / ${svc.factors.correctness.score.toFixed(1)}%`,
        )
        .join(', ') + ' (Compliance / Correctness). Completeness has no service link.',
      action: both.length ? `Open ${both[0].name}` : undefined,
      target: both.length ? { type: 'service', id: both[0].id } : undefined,
    });
  }

  let bestDept = null;
  for (const dept of departments) {
    for (const key of AUDIT_FACTORS) {
      const cell = dept.factors[key];
      if (cell && (!bestDept || cell.delta > bestDept.delta)) bestDept = { dept, key, delta: cell.delta };
    }
  }
  const bestClass = categoryViews(duration, null, scope).sort((a, b) => b.delta - a.delta)[0];
  if ((bestDept && bestDept.delta > 0) || (bestClass && bestClass.delta > 0)) {
    const parts = [];
    if (bestDept && bestDept.delta > 0)
      parts.push(`${bestDept.dept.name} ${FACTOR_LABEL[bestDept.key]} +${bestDept.delta.toFixed(1)} pts`);
    if (bestClass && bestClass.delta > 0)
      parts.push(`${bestClass.category.name} (${bestClass.pillar.name}) Completeness +${bestClass.delta.toFixed(1)} pts`);
    out.push({
      id: 'improvement',
      severity: 'Low',
      title: `Largest improvements over ${period}`,
      evidence: parts.join('; ') + '.',
      action: bestClass && bestClass.delta > 0 ? `Open ${bestClass.category.name}` : `Scope to ${bestDept.dept.name}`,
      target:
        bestClass && bestClass.delta > 0
          ? { type: 'class', pillarId: bestClass.pillar.id, categoryId: bestClass.category.id }
          : { type: 'department', id: bestDept.dept.id },
    });
  }

  const persistent = items.filter((item) => item.persistent);
  if (persistent.length) {
    const rules = persistent.filter((item) => item.kind === 'Audit rule').length;
    const classes = persistent.length - rules;
    const worst = persistent.slice().sort((a, b) => b.gap - a.gap)[0];
    out.push({
      id: 'persistent',
      severity: 'Medium',
      title: `${rules} audit rules and ${classes} classes were below target in every month of ${period}`,
      evidence: `Largest: ${worst.name} (${FACTOR_LABEL[worst.factor]}, ${worst.score.toFixed(1)}%, ${worst.gap.toFixed(1)} pts below).`,
      action: `Open ${worst.name}`,
      target: worst.target,
    });
  }
  return out;
}
