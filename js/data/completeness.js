// Deterministic demo dataset for the Completeness KPI.
//
// Completeness is driven by three pillars — Data Center, Network and Workplace.
// Each pillar owns CI categories and its mandatory attributes. Data Center has
// a dedicated attribute set; Network and Workplace share the base set.
//
// Hierarchy used by the screen: Pillar > Category > CIs (incomplete of total)
// and attributes missing (of total).

import { DEPARTMENTS, MONTHS } from './demo.js';

/** Base mandatory attributes shared by Network and Workplace. */
export const BASE_ATTRIBUTES = [
  'IP Address',
  'Serial number',
  'Location',
  'Service offering',
  'CPU count',
  'Environment',
  'Internet Facing',
  'Is Virtual',
  'Asset',
  'Category',
  'Change Group',
  'Closest App. Service',
  'Closest App. Service (Operational)',
  'Life Cycle Stage',
  'Life Cycle Stage Status',
  'Manufacturer',
  'Operational status',
  'Warranty expiration',
  'Classification',
];
export const DATA_CENTER_ATTRIBUTES = [
  'Class',
  'Classification',
  'Closest MBAG Application Service',
  'Correlation ID',
  'CPU core count',
  'CPU core thread',
  'CPU count',
  'CPU name',
  'CPU speed (MHz)',
  'CPU type',
  'Default Gateway',
  'Disk space (GB)',
  'DNS Domain',
  'Environment',
  'First discovered',
  'Fully qualified domain name',
  'Hardware Status',
  'Host name',
  'Install Status',
  'Internet Facing',
  'IP Address',
  'Location',
  'Model ID',
  'Model number',
  'Name',
  'Operating System',
  'Operational status',
  'OS Domain',
  'OS Service Pack',
  'OS Version',
  'RAM (MB)',
  'Serial number',
  'MBAG Service offering',
  'Used for',
  'Version',
  'Kubernetes UID',
  'Cluster Version',
  'Port',
  'Edition',
  'Is Virtual',
];
export const COMPLETENESS_ATTRIBUTES = [
  ...new Set([...DATA_CENTER_ATTRIBUTES, ...BASE_ATTRIBUTES]),
];
export const ATTRIBUTE_COUNT = COMPLETENESS_ATTRIBUTES.length;
export const ATTRIBUTES_BY_PILLAR = {
  'pil-dc': DATA_CENTER_ATTRIBUTES,
  'pil-network': BASE_ATTRIBUTES,
  'pil-workplace': BASE_ATTRIBUTES,
};
export const attributesOf = (pillarId) =>
  ATTRIBUTES_BY_PILLAR[pillarId] ?? COMPLETENESS_ATTRIBUTES;
export const attributeCountOf = (pillarId) => attributesOf(pillarId).length;
export const attributesOfCategory = (category) => attributesOf(category?.pillarId);
export const PILLARS = [
  {
    id: 'pil-dc',
    name: 'Data Center',
    short: 'Data Center',
    owner: 'A. Brandt',
  },
  {
    id: 'pil-network',
    name: 'Network',
    short: 'Network',
    owner: 'M. Ito',
  },
  {
    id: 'pil-workplace',
    name: 'Workplace',
    short: 'Workplace',
    owner: 'S. Keller',
  },
];

const LEGACY_DC_CLASSES = [
  'Server',
  'Linux Server',
  'Windows Server',
  'ESX Server',
  'Virtual Machine Instance',
  'Storage Device',
  'Storage Array',
  'SAN Switch',
  'Rack',
  'Chassis',
  'Blade Enclosure',
  'Mainframe',
  'Backup Appliance',
  'Database Instance',
];
const DATA_CENTER_CLASSES = [
  'AIX Server',
  'Apache Web Server',
  'Cassandra Cluster',
  'Cloud Database',
  'Cloud Function',
  'Cloud Load Balancer',
  'Cloud Object Storage',
  'Cloud Resource',
  'Cloud Storage account',
  'DB2 Subsystems',
  'ESX Server',
  'HSM Appliance',
  'Hyper V Server',
  'IBM Frame',
  'IBM LPAR Instance',
  'IBM MQ Manager',
  'IBM Websphere',
  'IBM zOS server',
  'Jboss',
  'Kubernetes Cluster',
  'Kubernetes Node',
  'Linux Server',
  'Microsoft IIS WebServer',
  'Mango DB Instance',
  'MSFT SQL Instance',
  'MY SQL Instance',
  'Nginx Web Server',
  'Oracle Instance',
  'PostgreSQL Instance',
  'Server',
  'Solaris Server',
  'Storage Cluster',
  'Storage Cluster Node',
  'Storage Node Element',
  'Storage Server',
  'Tomcat',
  'Unix Cluster',
  'Virtual Machine Instance',
  'Windows Cluster',
  'Windows Server',
];
/** Category catalogue per pillar. Network is the list confirmed by the business. */
const CATEGORY_CATALOGUE = {
  'pil-dc': DATA_CENTER_CLASSES,
  'pil-network': [
    'Cisco Firewall Device',
    'Citrix Netscaler',
    'F5 BIG-IP',
    'F5 BigIP GTM',
    'F5 BigIP LTM',
    'Firewall Device',
    'Fortinet Firewall Device',
    'IP Firewall',
    'IP Router',
    'IP Switch',
    'Load balancer',
    'Network Gear',
    'Palo Alto Firewall Device',
    'Provider Device',
    'UPS',
    'Wireless Access Point',
    'IoT Gateway',
    'Network Appliance Hardware',
    'DDI Appliance',
    'Check Point Firewall',
    'ISE Appliance',
  ],
  'pil-workplace': [
    'Workstation',
    'Notebook',
    'Desktop',
    'Thin Client',
    'VDI Client',
    'Mobile Device',
    'Tablet',
    'Printer',
    'Monitor',
    'Conference Room Device',
    'Handheld Scanner',
  ],
};
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const PILLAR_BIAS = {
  'pil-dc': 4,
  'pil-network': -3,
  'pil-workplace': 1,
};
const clamp = (v) => Math.max(41, Math.min(99.4, v));

/** Short chart/legend key, e.g. "Palo Alto Firewall Device" -> "PA/FD". */
const codeOf = (name) => {
  const words = name.split(/[\s&/.-]+/).filter(Boolean);
  const head = (words[0] ?? '').slice(0, 2).toUpperCase();
  const tail = words
    .slice(1)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 3);
  return tail ? `${head}/${tail}` : head;
};
function buildCategories(pillarId, names, attributes, rand, nStart) {
  return names.map((name, index) => {
    const n = nStart + index;
    const base = 84 + PILLAR_BIAS[pillarId] + (rand() - 0.5) * 18 + (rand() - 0.5) * 4;
    const drift = (rand() - 0.4) * 0.8;
    const scores = [];
    let v = base - drift * 11;
    for (let m = 0; m < MONTHS.length; m += 1) {
      v = v + drift + (rand() - 0.5) * 2.2;
      scores.push(Number(clamp(v).toFixed(1)));
    }
    const totalCis = 320 + Math.floor(rand() * 14800);
    const latest = scores[scores.length - 1];
    const incomplete = Math.round(totalCis * (1 - latest / 100));

    // Attribute gaps: a handful of attributes carry most of the gap, some are clean.
    const affected = 3 + Math.floor(rand() * (attributes.length - 5));
    const picked = attributes.map((attribute, i) => ({
      attribute,
      weight: i < affected ? 0.15 + rand() : 0,
    }));
    // rotate so the affected attributes differ per category
    const shift = Math.floor(rand() * attributes.length);
    const weights = picked.map((_, i) => picked[(i + shift) % attributes.length].weight);
    const weightSum = weights.reduce((a, b) => a + b, 0) || 1;
    // A CI is usually missing more than one attribute, so gaps exceed incomplete CIs.
    const gapBudget = Math.round(incomplete * (1.2 + rand() * 0.8));
    const gaps = attributes.map((attribute, i) => ({
      attribute,
      missingCis:
        weights[i] === 0
          ? 0
          : Math.min(incomplete, Math.round((weights[i] / weightSum) * gapBudget)),
    }));
    return {
      id: `cat-${String(n).padStart(3, '0')}`,
      pillarId,
      name,
      code: codeOf(name),
      totalCis,
      scores,
      gaps,
    };
  });
}
function uniqueCodesByPillar(categories) {
  const usedByPillar = new Map();
  return categories.map((category) => {
    const used = usedByPillar.get(category.pillarId) ?? new Set();
    let code = category.code;
    let suffix = 2;
    while (used.has(code)) {
      code = `${category.code}${suffix}`;
      suffix += 1;
    }
    used.add(code);
    usedByPillar.set(category.pillarId, used);
    return code === category.code ? category : { ...category, code };
  });
}

const legacyRand = rng(20260901);
// Consume the legacy Data Center stream so Network and Workplace figures stay stable.
buildCategories('pil-dc', LEGACY_DC_CLASSES, BASE_ATTRIBUTES, legacyRand, 1);
const networkNStart = LEGACY_DC_CLASSES.length + 1;
const workplaceNStart = networkNStart + CATEGORY_CATALOGUE['pil-network'].length;
const dataCenter = buildCategories(
  'pil-dc',
  CATEGORY_CATALOGUE['pil-dc'],
  DATA_CENTER_ATTRIBUTES,
  rng(20261009),
  1,
).map((category, index) => ({
  ...category,
  id: `cat-dc-${String(index + 1).padStart(3, '0')}`,
}));
const network = buildCategories(
  'pil-network',
  CATEGORY_CATALOGUE['pil-network'],
  BASE_ATTRIBUTES,
  legacyRand,
  networkNStart,
);
const workplace = buildCategories(
  'pil-workplace',
  CATEGORY_CATALOGUE['pil-workplace'],
  BASE_ATTRIBUTES,
  legacyRand,
  workplaceNStart,
);
export const CATEGORIES = uniqueCodesByPillar([...dataCenter, ...network, ...workplace]);
for (const pillar of PILLARS) {
  const codes = CATEGORIES.filter((category) => category.pillarId === pillar.id).map(
    (category) => category.code,
  );
  if (new Set(codes).size !== codes.length) {
    throw new Error(`Category chart codes must be unique within ${pillar.id}`);
  }
}
export const categoriesOf = (pillarId) => CATEGORIES.filter((c) => c.pillarId === pillarId);

/** Completeness target: a category at or above this is treated as complete. */
export const COMPLETENESS_TARGET = 95;

// --- derived views ---------------------------------------------------------

const tail = (arr, n) => arr.slice(Math.max(0, arr.length - n));
const round1 = (value) => Number(value.toFixed(1));
const incompleteOf = (category) =>
  Math.round(category.totalCis * (1 - category.scores[category.scores.length - 1] / 100));

export function departmentScope(filters = {}) {
  const departments = filters.departments ?? [];
  const owners = filters.owners ?? [];
  if (departments.length === 0 && owners.length === 0) return null;
  return DEPARTMENTS.reduce((indexes, department, index) => {
    if (
      (departments.length === 0 || departments.includes(department.id)) &&
      (owners.length === 0 || owners.includes(department.owner))
    ) {
      indexes.push(index);
    }
    return indexes;
  }, []);
}

const scopeIndexes = (scope) => scope ?? DEPARTMENTS.map((_, index) => index);
const normalizeScope = (scope) =>
  scope &&
  scope.length === DEPARTMENTS.length &&
  new Set(scope).size === DEPARTMENTS.length &&
  scope.every((index) => index >= 0 && index < DEPARTMENTS.length)
    ? null
    : scope;
const sumIndexes = (values, indexes) => indexes.reduce((sum, index) => sum + values[index], 0);
const scopedCis = (category, scope) => sumIndexes(categoryDepartmentCis(category), scopeIndexes(scope));
const scopedMissing = (category, attribute, scope) =>
  sumIndexes(categoryDepartmentMissing(category, attribute), scopeIndexes(scope));

function categoryIncompleteAt(category, monthIndex, scope) {
  if (scope === null) {
    return category.totalCis * (1 - category.scores[monthIndex] / 100);
  }
  const incompleteByDepartment = categoryDepartmentIncomplete(category);
  return scope.reduce(
    (sum, index) => sum + incompleteByDepartment[index] * missingRatio(category, monthIndex),
    0,
  );
}

export function categoryViews(duration, pillarId, scope = null) {
  scope = normalizeScope(scope);
  const src = pillarId ? categoriesOf(pillarId) : CATEGORIES;
  const months = tail(MONTHS, duration);
  const startIndex = MONTHS.length - months.length;
  return src
    .map((category) => {
      if (scope === null) {
        const scores = tail(category.scores, duration);
        const score = scores[scores.length - 1];
        const delta = round1(score - scores[0]);
        const incompleteCis = incompleteOf(category);
        const missing = category.gaps.filter((gap) => gap.missingCis > 0);
        return {
          category,
          pillar: PILLARS.find((item) => item.id === category.pillarId),
          score,
          delta,
          totalCis: category.totalCis,
          incompleteCis,
          completeCis: category.totalCis - incompleteCis,
          attributesMissing: missing.length,
          attributesTotal: attributeCountOf(category.pillarId),
          attributeGapCis: category.gaps.reduce((sum, gap) => sum + gap.missingCis, 0),
          worstAttribute: missing.slice().sort((a, b) => b.missingCis - a.missingCis)[0] ?? null,
          series: months.map((month, index) => ({ month, value: scores[index] })),
          gaps: category.gaps,
        };
      }

      const totalCis = scopedCis(category, scope);
      if (totalCis === 0) return null;
      const incompleteCis = sumIndexes(categoryDepartmentIncomplete(category), scope);
      const score = round1((1 - incompleteCis / totalCis) * 100);
      const series = months.map((month, index) => ({
        month,
        value: round1(
          (1 -
            categoryIncompleteAt(category, startIndex + index, scope) /
              totalCis) *
            100,
        ),
      }));
      const gaps = attributesOfCategory(category).map((attribute) => {
        const existing = category.gaps.find((gap) => gap.attribute === attribute);
        return {
          ...(existing ?? { attribute }),
          missingCis: scopedMissing(category, attribute, scope),
        };
      });
      const missing = gaps.filter((gap) => gap.missingCis > 0);
      return {
        category,
        pillar: PILLARS.find((item) => item.id === category.pillarId),
        score,
        delta: round1(score - (series[0]?.value ?? score)),
        totalCis,
        incompleteCis,
        completeCis: totalCis - incompleteCis,
        attributesMissing: missing.length,
        attributesTotal: attributeCountOf(category.pillarId),
        attributeGapCis: gaps.reduce((sum, gap) => sum + gap.missingCis, 0),
        worstAttribute: missing.slice().sort((a, b) => b.missingCis - a.missingCis)[0] ?? null,
        series,
        gaps,
      };
    })
    .filter(Boolean);
}

function categoryCountScore(totalCis, completeCis) {
  return totalCis > 0 ? round1((completeCis / totalCis) * 100) : 0;
}

function seriesMonthDelta(series) {
  return series.length < 2 ? 0 : round1(series[series.length - 1].value - series[series.length - 2].value);
}

function aggregateSeries(duration, views, scope) {
  const months = tail(MONTHS, duration);
  const startIndex = MONTHS.length - months.length;
  const totalCis = views.reduce((sum, view) => sum + view.totalCis, 0);
  return months.map((month, index) => {
    const incomplete = views.reduce(
      (sum, view) => sum + categoryIncompleteAt(view.category, startIndex + index, scope),
      0,
    );
    return {
      month,
      value: totalCis > 0 ? round1((1 - incomplete / totalCis) * 100) : 0,
    };
  });
}

export function pillarViews(duration, scope = null) {
  scope = normalizeScope(scope);
  return PILLARS.map((pillar) => {
    const views = categoryViews(duration, pillar.id, scope);
    const totalCis = views.reduce((sum, view) => sum + view.totalCis, 0);
    const incompleteCis = views.reduce((sum, view) => sum + view.incompleteCis, 0);
    const completeCis = totalCis - incompleteCis;
    const score = categoryCountScore(totalCis, completeCis);
    const series = aggregateSeries(duration, views, scope);
    const delta = round1(score - (series[0]?.value ?? score));
    const monthDelta = seriesMonthDelta(series);
    const prevIncompleteCis = Math.round(
      views.reduce(
        (sum, view) => sum + categoryIncompleteAt(view.category, MONTHS.length - 2, scope),
        0,
      ),
    );
    const attributesMissing = new Set(
      views.flatMap((view) =>
        view.gaps.filter((gap) => gap.missingCis > 0).map((gap) => gap.attribute),
      ),
    ).size;
    return {
      pillar,
      score,
      delta,
      monthDelta,
      targetGap: round1(Math.max(0, COMPLETENESS_TARGET - score)),
      cisToTarget: Math.max(
        0,
        Math.ceil((COMPLETENESS_TARGET / 100) * totalCis) - completeCis,
      ),
      status: delta > 0.1 ? 'Improving' : delta < -0.1 ? 'Declining' : 'Stable',
      totalCis,
      completeCis,
      incompleteCis,
      prevIncompleteCis,
      incompleteChangePct:
        prevIncompleteCis > 0
          ? round1(((incompleteCis - prevIncompleteCis) / prevIncompleteCis) * 100)
          : 0,
      categories: views.length,
      categoriesOnTarget: views.filter((view) => view.score >= COMPLETENESS_TARGET).length,
      attributesMissing,
      attributesTotal: attributeCountOf(pillar.id),
      series,
      views,
    };
  });
}

export function pillarMonthDelta(duration, pillarId, scope = null) {
  return pillarViews(duration, scope).find((view) => view.pillar.id === pillarId)?.monthDelta ?? 0;
}

export function categoryInsights(duration, pillarId, scope = null) {
  const views = categoryViews(duration, pillarId, scope);
  return {
    avgDelta: round1(views.reduce((sum, view) => sum + view.delta, 0) / (views.length || 1)),
    mostImproved: views.slice().sort((a, b) => b.delta - a.delta)[0] ?? null,
    mostCritical: views.slice().sort((a, b) => a.score - b.score)[0] ?? null,
  };
}

export function completenessOverall(duration, scope = null) {
  scope = normalizeScope(scope);
  const views = categoryViews(duration, null, scope);
  const totalCis = views.reduce((sum, view) => sum + view.totalCis, 0);
  const incompleteCis = views.reduce((sum, view) => sum + view.incompleteCis, 0);
  const completeCis = totalCis - incompleteCis;
  const score = categoryCountScore(totalCis, completeCis);
  const series = aggregateSeries(duration, views, scope);
  const delta = round1(score - (series[0]?.value ?? score));
  return {
    score,
    delta,
    monthDelta: seriesMonthDelta(series),
    targetGap: round1(Math.max(0, COMPLETENESS_TARGET - score)),
    cisToTarget: Math.max(
      0,
      Math.ceil((COMPLETENESS_TARGET / 100) * totalCis) - completeCis,
    ),
    status: delta > 0.1 ? 'Improving' : delta < -0.1 ? 'Declining' : 'Stable',
    series,
    totalCis,
    completeCis,
    incompleteCis,
    categories: views.length,
    categoriesBelowTarget: views.filter((view) => view.score < COMPLETENESS_TARGET).length,
    categoriesOnTarget: views.filter((view) => view.score >= COMPLETENESS_TARGET).length,
    pillars: PILLARS.length,
    attributesTotal: ATTRIBUTE_COUNT,
  };
}

/** Chart series for the worst/best N categories of a pillar. */
export function categoryTrends(duration, pillarId, limit, order, scope = null) {
  const views = categoryViews(duration, pillarId, scope)
    .slice()
    .sort((a, b) => (order === 'best' ? b.score - a.score : a.score - b.score))
    .slice(0, limit);
  const months = tail(MONTHS, duration);
  const series = months.map((month, index) => {
    const row = { month };
    for (const view of views) row[view.category.code] = view.series[index]?.value ?? view.score;
    return row;
  });
  return { series, categories: views };
}

/** Attribute-level gap roll-up across a pillar (or the whole estate). */
export function attributeGaps(duration, pillarId, scope = null) {
  scope = normalizeScope(scope);
  const views = categoryViews(duration, pillarId, scope);
  const attributes = pillarId ? attributesOf(pillarId) : COMPLETENESS_ATTRIBUTES;
  return attributes
    .map((attribute) => {
      const applicableViews = views.filter((view) =>
        attributesOfCategory(view.category).includes(attribute),
      );
      const missingCis = applicableViews.reduce(
        (sum, view) =>
          sum + (view.gaps.find((gap) => gap.attribute === attribute)?.missingCis ?? 0),
        0,
      );
      const categories = applicableViews.filter(
        (view) => (view.gaps.find((gap) => gap.attribute === attribute)?.missingCis ?? 0) > 0,
      ).length;
      return { attribute, missingCis, categories, totalCategories: applicableViews.length };
    })
    .sort((a, b) => b.missingCis - a.missingCis);
}

export function departmentImpact(duration, pillarId, scope = null) {
  const categories = categoriesOf(pillarId);
  const indexes = scopeIndexes(scope);
  const months = tail(MONTHS, duration);
  const startIndex = MONTHS.length - months.length;
  const rows = indexes
    .map((departmentIndex) => {
      const department = DEPARTMENTS[departmentIndex];
      if (!department) return null;
      const totalCis = categories.reduce(
        (sum, category) => sum + categoryDepartmentCis(category)[departmentIndex],
        0,
      );
      if (totalCis === 0) return null;
      const incompleteCis = categories.reduce(
        (sum, category) =>
          sum + categoryDepartmentIncomplete(category)[departmentIndex],
        0,
      );
      const series = months.map((month, index) => {
        const incomplete = categories.reduce(
          (sum, category) =>
            sum +
            categoryDepartmentIncomplete(category)[departmentIndex] *
              missingRatio(category, startIndex + index),
          0,
        );
        return {
          month,
          value: round1((1 - incomplete / totalCis) * 100),
        };
      });
      return {
        department,
        totalCis,
        incompleteCis,
        completeCis: totalCis - incompleteCis,
        score: categoryCountScore(totalCis, totalCis - incompleteCis),
        delta: round1((series[series.length - 1]?.value ?? 0) - (series[0]?.value ?? 0)),
        share: 0,
        _series: series,
      };
    })
    .filter(Boolean)
    .sort(
      (a, b) =>
        b.incompleteCis - a.incompleteCis ||
        a.department.name.localeCompare(b.department.name),
    );
  const totalIncomplete = rows.reduce((sum, row) => sum + row.incompleteCis, 0);
  for (const row of rows) {
    row.share = round1(totalIncomplete > 0 ? (row.incompleteCis / totalIncomplete) * 100 : 0);
    delete row._series;
  }
  const departmentsAffected = rows.filter((row) => row.incompleteCis > 0).length;
  const topCount = Math.max(1, Math.ceil(departmentsAffected * 0.1));
  const topShare = round1(
    totalIncomplete > 0
      ? (rows.slice(0, topCount).reduce((sum, row) => sum + row.incompleteCis, 0) /
          totalIncomplete) *
          100
      : 0,
  );
  return {
    rows,
    totalIncomplete,
    departmentsAffected,
    topCount,
    topShare,
    concentration: topShare >= 40 ? 'concentrated' : 'widespread',
  };
}

const fmtCount = (value) => value.toLocaleString('en-US');
const fmtPoints = (value) => value.toFixed(1);

export function pillarInsights(duration, pillarId, scope = null) {
  const pillarView = pillarViews(duration, scope).find((view) => view.pillar.id === pillarId);
  if (!pillarView) return [];
  const classes = categoryViews(duration, pillarId, scope);
  const insights = [];
  const score = pillarView.score;
  const gap = pillarView.targetGap;
  const target = { type: 'pillar', pillarId };

  if (score < COMPLETENESS_TARGET) {
    const severity = gap >= 5 ? 'High' : gap >= 2 ? 'Medium' : 'Low';
    insights.push({
      id: 'target-gap',
      severity,
      title: `${fmtPoints(gap)} pts below the ${COMPLETENESS_TARGET}% target`,
      evidence: `${fmtCount(pillarView.completeCis)} of ${fmtCount(pillarView.totalCis)} CIs are complete (${fmtPoints(score)}%).`,
      impact: `${fmtCount(pillarView.cisToTarget)} more CIs must be completed to reach ${COMPLETENESS_TARGET}%.`,
      action: 'Start with the lowest-performing classes.',
      target,
    });
  } else {
    insights.push({
      id: 'target-gap',
      severity: 'Low',
      title: `At or above the ${COMPLETENESS_TARGET}% target`,
      evidence: `${fmtCount(pillarView.completeCis)} of ${fmtCount(pillarView.totalCis)} CIs are complete (${fmtPoints(score)}%).`,
      impact: 'No gap to target.',
      action: 'Hold the line: watch classes that are declining.',
      target,
    });
  }

  if (pillarView.delta < 0) {
    const worst = classes.slice().sort((a, b) => a.delta - b.delta)[0];
    if (worst) {
      const declined = classes.filter((view) => view.delta < 0).length;
      const first = pillarView.series[0]?.value ?? score;
      insights.push({
        id: 'trend',
        severity: pillarView.delta <= -1 ? 'High' : 'Medium',
        title: 'Completeness declining',
        evidence: `${fmtPoints(first)}% → ${fmtPoints(score)}% over the last ${duration} months (${fmtPoints(pillarView.delta)} pts); ${declined} of ${classes.length} classes declined.`,
        impact: 'Incomplete CIs are being created faster than they are fixed.',
        action: `Review recent changes in ${worst.category.name} (${fmtPoints(worst.delta)} pts).`,
        target: { type: 'class', pillarId, categoryId: worst.category.id },
      });
    }
  }

  if (pillarView.incompleteCis > 0) {
    const topClasses = classes
      .slice()
      .sort(
        (a, b) =>
          b.incompleteCis - a.incompleteCis ||
          a.category.name.localeCompare(b.category.name),
      )
      .slice(0, 3);
    const topIncomplete = topClasses.reduce((sum, view) => sum + view.incompleteCis, 0);
    const share = round1((topIncomplete / pillarView.incompleteCis) * 100);
    const first = topClasses[0];
    insights.push({
      id: 'high-impact-classes',
      severity: share >= 40 ? 'Medium' : 'Low',
      title: `${topClasses.length} classes hold ${fmtPoints(share)}% of incomplete CIs`,
      evidence: `${topClasses.map((view) => `${view.category.name} (${fmtCount(view.incompleteCis)})`).join(', ')} incomplete CIs.`,
      impact: 'Fixing these classes closes the largest part of the gap.',
      action: `Assign remediation owners for ${first.category.name} first.`,
      target: { type: 'class', pillarId, categoryId: first.category.id },
    });
  }

  const topGap = attributeGaps(duration, pillarId, scope).find((gapItem) => gapItem.missingCis > 0);
  if (topGap) {
    const percent = round1((topGap.missingCis / pillarView.totalCis) * 100);
    insights.push({
      id: 'top-attribute',
      severity: percent >= 2 ? 'Medium' : 'Low',
      title: `${topGap.attribute} is the most frequently missing attribute`,
      evidence: `Missing in ${fmtCount(topGap.missingCis)} CIs across ${topGap.categories} of ${topGap.totalCategories} classes.`,
      impact: `${fmtPoints(percent)}% of ${pillarView.pillar.name} CIs lack this value.`,
      action: 'Open the attribute drill-down to see the classes and departments behind it.',
      target: { type: 'attribute', pillarId, attribute: topGap.attribute },
    });
  }

  const impact = departmentImpact(duration, pillarId, scope);
  if (impact.totalIncomplete > 0) {
    const top = impact.rows[0];
    const concentrated = impact.concentration === 'concentrated';
    insights.push({
      id: 'department-impact',
      severity: concentrated ? 'Medium' : 'Low',
      title: concentrated
        ? `${impact.topCount} departments hold ${fmtPoints(impact.topShare)}% of incomplete CIs`
        : `Gaps are spread across ${impact.departmentsAffected} departments`,
      evidence: concentrated
        ? `${top.department.name} alone has ${fmtCount(top.incompleteCis)} incomplete CIs (${fmtPoints(top.share)}%).`
        : `The top ${impact.topCount} departments hold only ${fmtPoints(impact.topShare)}% of incomplete CIs.`,
      impact: concentrated
        ? 'A few owners can close most of the gap.'
        : 'No single owner can close the gap.',
      action: concentrated
        ? `Engage ${top.department.owner} (${top.department.name}) first.`
        : 'Fix at class and attribute level rather than department by department.',
      target: { type: 'department', pillarId, departmentId: top.department.id },
      demo: true,
    });
  }
  const severityOrder = { High: 0, Medium: 1, Low: 2 };
  return insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

export function enterpriseInsights(duration, scope = null) {
  const views = pillarViews(duration, scope);
  const largestGap = views.slice().sort((a, b) => b.targetGap - a.targetGap)[0];
  const insights = [];
  if (largestGap) {
    insights.push({
      id: 'largest-target-gap',
      severity: largestGap.targetGap >= 5 ? 'High' : largestGap.targetGap >= 2 ? 'Medium' : 'Low',
      title: `${largestGap.pillar.name} has the largest target gap (${fmtPoints(largestGap.targetGap)} pts)`,
      evidence: `${fmtPoints(largestGap.score)}% vs ${COMPLETENESS_TARGET}% target; ${fmtCount(largestGap.cisToTarget)} CIs to complete.`,
      impact: `${fmtCount(largestGap.cisToTarget)} CIs remain to reach the enterprise target.`,
      action: 'Prioritise its lowest-performing classes and missing attributes.',
      target: { type: 'pillar', pillarId: largestGap.pillar.id },
    });
  }

  const declining = views.filter((view) => view.status === 'Declining');
  if (declining.length > 0) {
    insights.push({
      id: 'declining-pillars',
      severity: 'Medium',
      title: `${declining.map((view) => view.pillar.name).join(' and ')} ${declining.length === 1 ? 'is' : 'are'} declining`,
      evidence: declining
        .map((view) => `${view.pillar.name} ${fmtPoints(view.delta)} pts over ${duration} months`)
        .join('; '),
      impact: 'Declining completeness can increase the enterprise remediation gap.',
      action: 'Investigate the declining classes in each section below.',
      target: { type: 'pillar', pillarId: declining[0].pillar.id },
    });
  } else {
    insights.push({
      id: 'no-declining-pillars',
      severity: 'Low',
      title: 'No category is declining over the selected period',
      evidence: views
        .map((view) => `${view.pillar.name} ${fmtPoints(view.delta)} pts`)
        .join('; '),
      impact: 'No pillar is trending downward over the selected period.',
      action: 'Continue monitoring category and attribute trends.',
      target: null,
    });
  }
  return insights;
}

/** Value-level completeness: missing mandatory values / required values (CIs x applicable attributes). */
export function attributeCompleteness(duration, scope = null) {
  scope = normalizeScope(scope);
  const views = categoryViews(duration, null, scope);
  const startIndex = MONTHS.length - tail(MONTHS, duration).length;
  const requiredValues = views.reduce((sum, view) => sum + view.totalCis * view.attributesTotal, 0);
  const missingValues = views.reduce((sum, view) => sum + view.attributeGapCis, 0);
  const startMissing = views.reduce(
    (sum, view) => sum + view.attributeGapCis * missingRatio(view.category, startIndex),
    0,
  );
  const score = completenessScore(requiredValues, missingValues);
  const merged = new Map();
  for (const pillar of PILLARS) {
    for (const gap of attributeGaps(duration, pillar.id, scope)) {
      if (gap.missingCis === 0) continue;
      const row = merged.get(gap.attribute) ?? {
        attribute: gap.attribute,
        missingCis: 0,
        pillarId: pillar.id,
        pillarMissing: 0,
      };
      row.missingCis += gap.missingCis;
      if (gap.missingCis > row.pillarMissing) {
        row.pillarId = pillar.id;
        row.pillarMissing = gap.missingCis;
      }
      merged.set(gap.attribute, row);
    }
  }
  return {
    score,
    delta: round1(score - completenessScore(requiredValues, startMissing)),
    missingValues,
    requiredValues,
    missingPct: requiredValues > 0 ? round1((missingValues / requiredValues) * 100) : 0,
    targetGap: round1(Math.max(0, COMPLETENESS_TARGET - score)),
    topAttributes: [...merged.values()]
      .sort((a, b) => b.missingCis - a.missingCis)
      .map(({ pillarMissing, ...row }) => row),
  };
}

export function classesBelowTarget(duration, scope = null) {
  const views = categoryViews(duration, null, scope);
  const isBelow = (value) => value < COMPLETENESS_TARGET;
  const below = views.filter((view) => isBelow(view.score)).length;
  const belowAtStart = views.filter((view) => isBelow(view.series[0]?.value ?? view.score)).length;
  return {
    below,
    total: views.length,
    belowAtStart,
    change: below - belowAtStart,
    byPillar: PILLARS.map((pillar) => {
      const pillarViews = views.filter((view) => view.pillar.id === pillar.id);
      return {
        pillar,
        below: pillarViews.filter((view) => isBelow(view.score)).length,
        total: pillarViews.length,
      };
    }),
  };
}

/** Enterprise-wide completeness per department (all pillars), from the demo allocation. */
export function departmentSummary(duration, scope = null) {
  scope = normalizeScope(scope);
  const months = tail(MONTHS, duration);
  const startIndex = MONTHS.length - months.length;
  const rows = scopeIndexes(scope)
    .map((index) => {
      let totalCis = 0;
      let incompleteCis = 0;
      const monthly = months.map(() => 0);
      for (const category of CATEGORIES) {
        const cis = categoryDepartmentCis(category)[index];
        if (!cis) continue;
        const incomplete = categoryDepartmentIncomplete(category)[index];
        totalCis += cis;
        incompleteCis += incomplete;
        months.forEach((_, m) => {
          monthly[m] += incomplete * missingRatio(category, startIndex + m);
        });
      }
      if (totalCis === 0) return null;
      return {
        department: DEPARTMENTS[index],
        totalCis,
        incompleteCis,
        score: completenessScore(totalCis, incompleteCis),
        series: months.map((month, m) => ({ month, value: completenessScore(totalCis, monthly[m]) })),
      };
    })
    .filter(Boolean);
  const isBelow = (value) => value < COMPLETENESS_TARGET;
  const average = (values) =>
    values.length ? round1(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
  const averageSeries = months.map((month, m) => ({
    month,
    value: average(rows.map((row) => row.series[m].value)),
  }));
  return {
    rows,
    total: rows.length,
    below: rows.filter((row) => isBelow(row.score)).length,
    belowAtStart: rows.filter((row) => isBelow(row.series[0]?.value ?? row.score)).length,
    averageScore: average(rows.map((row) => row.score)),
    averageSeries,
    averageDelta: round1((averageSeries.at(-1)?.value ?? 0) - (averageSeries[0]?.value ?? 0)),
  };
}

export function primaryPillarOf(attribute) {
  const candidates = PILLARS.filter((pillar) => attributesOf(pillar.id).includes(attribute))
    .map((pillar) => ({
      pillar,
      missingCis:
        attributeGaps(12, pillar.id).find((gap) => gap.attribute === attribute)?.missingCis ?? 0,
    }))
    .sort((a, b) => b.missingCis - a.missingCis);
  return candidates[0]?.pillar.id ?? null;
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  }
  return hash >>> 0;
}

function allocateLargestRemainder(total, weights, caps = weights.map(() => Infinity)) {
  const allocation = weights.map(() => 0);
  let remaining = total;
  let active = weights
    .map((weight, index) => index)
    .filter((index) => weights[index] > 0 && caps[index] > 0);

  while (remaining > 0 && active.length > 0) {
    const weightTotal = active.reduce((sum, index) => sum + weights[index], 0);
    if (weightTotal <= 0) break;

    const quotas = active.map((index) => {
      const exact = (remaining * weights[index]) / weightTotal;
      return {
        index,
        exact,
        fraction: exact - Math.floor(exact),
        capacity: caps[index] - allocation[index],
      };
    });
    const saturated = quotas.filter(({ exact, capacity }) => exact >= capacity);

    if (saturated.length > 0) {
      const saturatedIndexes = new Set(saturated.map(({ index }) => index));
      for (const { index, capacity } of saturated) {
        allocation[index] += capacity;
        remaining -= capacity;
      }
      active = active.filter((index) => !saturatedIndexes.has(index));
      continue;
    }

    let allocated = 0;
    for (const { index, exact } of quotas) {
      const amount = Math.floor(exact);
      allocation[index] += amount;
      allocated += amount;
    }
    remaining -= allocated;

    for (const { index } of quotas.sort(
      (a, b) => b.fraction - a.fraction || a.index - b.index,
    )) {
      if (remaining === 0) break;
      if (allocation[index] >= caps[index]) continue;
      allocation[index] += 1;
      remaining -= 1;
    }
    active = active.filter((index) => allocation[index] < caps[index]);
  }

  if (remaining !== 0) {
    throw new Error(`Could not allocate ${total} across ${weights.length} departments`);
  }
  return allocation;
}

const departmentCisMemo = new Map();
const departmentIncompleteMemo = new Map();
const departmentMissingMemo = new Map();
function categoryDepartmentCis(category) {
  if (!departmentCisMemo.has(category.id)) {
    const random = rng(hashString(category.id));
    const weights = DEPARTMENTS.map((department) => department.ciCount * (0.5 + random()));
    departmentCisMemo.set(category.id, allocateLargestRemainder(category.totalCis, weights));
  }
  return departmentCisMemo.get(category.id);
}

function categoryDepartmentIncomplete(category) {
  if (!departmentIncompleteMemo.has(category.id)) {
    const cisByDepartment = categoryDepartmentCis(category);
    const random = rng(hashString(`${category.id}|incomplete`));
    const weights = cisByDepartment.map((cis) => cis * (0.4 + random()));
    departmentIncompleteMemo.set(
      category.id,
      allocateLargestRemainder(incompleteOf(category), weights, cisByDepartment),
    );
  }
  return departmentIncompleteMemo.get(category.id);
}

function categoryDepartmentMissing(category, attribute) {
  const key = `${category.id}|${attribute}`;
  if (!departmentMissingMemo.has(key)) {
    const missingCis = category.gaps.find((gap) => gap.attribute === attribute)?.missingCis ?? 0;
    const cisByDepartment = categoryDepartmentCis(category);
    const random = rng(hashString(key));
    const weights = cisByDepartment.map((cis) => cis * (0.4 + random()));
    departmentMissingMemo.set(
      key,
      allocateLargestRemainder(missingCis, weights, categoryDepartmentIncomplete(category)),
    );
  }
  return departmentMissingMemo.get(key);
}

const completenessScore = (totalCis, missingCis) =>
  round1(totalCis > 0 ? (1 - missingCis / totalCis) * 100 : 0);
const gapFor = (category, attribute) =>
  category.gaps.find((gap) => gap.attribute === attribute)?.missingCis ?? 0;

function completenessSeries(months, startIndex, totalCis, missingAtMonth) {
  return months.map((month, index) => ({
    month,
    value: completenessScore(totalCis, missingAtMonth(startIndex + index)),
  }));
}

function seriesDelta(series) {
  if (series.length < 2) return 0;
  return round1(series[series.length - 1].value - series[0].value);
}

export function attributeDrill(
  duration,
  pillarId,
  attribute,
  { categoryId = null, departmentId = null, scope = null } = {},
) {
  scope = normalizeScope(scope);
  const pillar = PILLARS.find((item) => item.id === pillarId) ?? null;
  const applicable = Boolean(pillar && attributesOf(pillarId).includes(attribute));
  const months = tail(MONTHS, duration);
  const startIndex = MONTHS.length - months.length;

  if (!applicable) {
    return {
      pillar,
      attribute,
      applicable: false,
      scopeCategory: null,
      totalCis: 0,
      missingCis: 0,
      populatedCis: 0,
      score: 0,
      delta: 0,
      monthDelta: 0,
      series: [],
      categories: [],
      categoriesAffected: 0,
      totalCategories: 0,
      departments: [],
      departmentsAffected: 0,
      totalDepartments: 0,
      regions: [],
      related: [],
      selection: null,
    };
  }

  const pillarCategories = categoriesOf(pillarId).filter((category) =>
    attributesOfCategory(category).includes(attribute),
  );
  const scopeCategory =
    categoryId === null
      ? null
      : pillarCategories.find((category) => category.id === categoryId) ?? null;
  const scopeCategories = scopeCategory ? [scopeCategory] : pillarCategories;
  const departmentIndexes = scope ?? DEPARTMENTS.map((_, index) => index);
  const categoryTotal = (category) =>
    scope === null ? category.totalCis : sumIndexes(categoryDepartmentCis(category), scope);
  const categoryMissing = (category) =>
    scope === null
      ? gapFor(category, attribute)
      : sumIndexes(categoryDepartmentMissing(category, attribute), scope);
  const categoryMissingAt = (category, monthIndex) =>
    scope === null
      ? gapFor(category, attribute) * missingRatio(category, monthIndex)
      : scope.reduce(
          (sum, departmentIndex) =>
            sum +
            categoryDepartmentMissing(category, attribute)[departmentIndex] *
              missingRatio(category, monthIndex),
          0,
        );
  const totalCis = scopeCategories.reduce((sum, category) => sum + categoryTotal(category), 0);
  const missingCis = scopeCategories.reduce((sum, category) => sum + categoryMissing(category), 0);
  const populatedCis = totalCis - missingCis;
  const series = completenessSeries(months, startIndex, totalCis, (monthIndex) =>
    scopeCategories.reduce((sum, category) => sum + categoryMissingAt(category, monthIndex), 0),
  );

  const pillarMissingCis = pillarCategories.reduce(
    (sum, category) => sum + categoryMissing(category),
    0,
  );
  const categories = pillarCategories
    .map((category) => {
      const categoryTotalCis = categoryTotal(category);
      if (categoryTotalCis === 0) return null;
      const categoryMissingCis = categoryMissing(category);
      const categorySeries = completenessSeries(
        months,
        startIndex,
        categoryTotalCis,
        (monthIndex) => categoryMissingAt(category, monthIndex),
      );
      return {
        category,
        totalCis: categoryTotalCis,
        missingCis: categoryMissingCis,
        populatedCis: categoryTotalCis - categoryMissingCis,
        score: completenessScore(categoryTotalCis, categoryMissingCis),
        delta: seriesDelta(categorySeries),
        share: round1(pillarMissingCis > 0 ? (categoryMissingCis / pillarMissingCis) * 100 : 0),
        series: categorySeries,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.missingCis - a.missingCis || a.category.name.localeCompare(b.category.name));

  const departments = departmentIndexes.map((departmentIndex) => {
    const department = DEPARTMENTS[departmentIndex];
    const departmentTotalCis = scopeCategories.reduce(
      (sum, category) => sum + categoryDepartmentCis(category)[departmentIndex],
      0,
    );
    if (departmentTotalCis === 0) return null;

    const departmentMissingCis = scopeCategories.reduce(
      (sum, category) =>
        sum + categoryDepartmentMissing(category, attribute)[departmentIndex],
      0,
    );
    const departmentSeries = completenessSeries(
      months,
      startIndex,
      departmentTotalCis,
        (monthIndex) =>
          scopeCategories.reduce(
            (sum, category) =>
              sum +
              categoryDepartmentMissing(category, attribute)[departmentIndex] *
                missingRatio(category, monthIndex),
            0,
          ),
    );
    return {
      department,
      totalCis: departmentTotalCis,
      missingCis: departmentMissingCis,
      populatedCis: departmentTotalCis - departmentMissingCis,
      score: completenessScore(departmentTotalCis, departmentMissingCis),
      delta: seriesDelta(departmentSeries),
      series: departmentSeries,
    };
  })
    .filter(Boolean)
    .sort((a, b) => b.missingCis - a.missingCis);

  const regionsByName = new Map();
  for (const item of departments) {
    const region = item.department.region;
    const totals = regionsByName.get(region) ?? { region, totalCis: 0, missingCis: 0 };
    totals.totalCis += item.totalCis;
    totals.missingCis += item.missingCis;
    regionsByName.set(region, totals);
  }
  const regions = [...regionsByName.values()]
    .map((region) => ({
      ...region,
      populatedCis: region.totalCis - region.missingCis,
      score: completenessScore(region.totalCis, region.missingCis),
    }))
    .sort((a, b) => b.missingCis - a.missingCis || a.region.localeCompare(b.region));
  const related = attributeGaps(duration, pillarId, scope)
    .filter((gap) => gap.attribute !== attribute)
    .slice(0, 6)
    .map(({ attribute: relatedAttribute, missingCis: relatedMissingCis, categories: affected, totalCategories: total }) => ({
      attribute: relatedAttribute,
      missingCis: relatedMissingCis,
      categories: affected,
      totalCategories: total,
    }));
  const selection = departmentId
    ? departments.find((item) => item.department.id === departmentId)
    : null;

  return {
    pillar,
    attribute,
    applicable: true,
    scopeCategory,
    totalCis,
    missingCis,
    populatedCis,
    score: completenessScore(totalCis, missingCis),
    delta: seriesDelta(series),
    monthDelta: seriesMonthDelta(series),
    series,
    categories,
    categoriesAffected: categories.filter((category) => category.missingCis > 0).length,
    totalCategories: categories.length,
    departments,
    departmentsAffected: departments.filter((department) => department.missingCis > 0).length,
    totalDepartments: departments.length,
    regions,
    related,
    selection: selection
      ? { kind: 'department', department: selection.department, series: selection.series }
      : null,
  };
}

function missingRatio(category, monthIndex) {
  const latestIncomplete =
    category.totalCis * (1 - category.scores[category.scores.length - 1] / 100);
  if (latestIncomplete === 0) return 0;
  const incomplete = category.totalCis * (1 - category.scores[monthIndex] / 100);
  return incomplete / latestIncomplete;
}
