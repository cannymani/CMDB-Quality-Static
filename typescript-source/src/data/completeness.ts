// Deterministic demo dataset for the Completeness KPI.
//
// Completeness is driven by three pillars — Data Center, Network and Workplace.
// Each pillar owns a set of CI categories; within a category every mandatory
// attribute must be populated for a CI to count as complete.
//
// Hierarchy used by the screen: Pillar > Category > CIs (incomplete of total)
// and attributes missing (of total).

import { MONTHS } from "./demo";

/** The 19 mandatory attributes scored for completeness in every category. */
export const COMPLETENESS_ATTRIBUTES = [
  "IP Address",
  "Serial number",
  "Location",
  "Service offering",
  "CPU count",
  "Environment",
  "Internet Facing",
  "Is Virtual",
  "Asset",
  "Category",
  "Change Group",
  "Closest App. Service",
  "Closest App. Service (Operational)",
  "Life Cycle Stage",
  "Life Cycle Stage Status",
  "Manufacturer",
  "Operational status",
  "Warranty expiration",
  "Classification",
] as const;

export const ATTRIBUTE_COUNT = COMPLETENESS_ATTRIBUTES.length;

export type PillarId = "pil-network" | "pil-dc" | "pil-workplace";

export type Pillar = {
  id: PillarId;
  name: string;
  short: string;
  owner: string;
};

export const PILLARS: Pillar[] = [
  { id: "pil-dc", name: "Data Center", short: "Data Center", owner: "A. Brandt" },
  { id: "pil-network", name: "Network", short: "Network", owner: "M. Ito" },
  { id: "pil-workplace", name: "Workplace", short: "Workplace", owner: "S. Keller" },
];

/** Category catalogue per pillar. Network is the list confirmed by the business. */
const CATEGORY_CATALOGUE: Record<PillarId, string[]> = {
  "pil-network": [
    "Cisco Firewall Device",
    "Citrix Netscaler",
    "F5 BIG-IP",
    "F5 BigIP GTM",
    "F5 BigIP LTM",
    "Firewall Device",
    "Fortinet Firewall Device",
    "IP Firewall",
    "IP Router",
    "IP Switch",
    "Load balancer",
    "Network Gear",
    "Palo Alto Firewall Device",
    "Provider Device",
    "UPS",
    "Wireless Access Point",
    "IoT Gateway",
    "Network Appliance Hardware",
    "DDI Appliance",
    "Check Point Firewall",
    "ISE Appliance",
  ],
  "pil-dc": [
    "Server",
    "Linux Server",
    "Windows Server",
    "ESX Server",
    "Virtual Machine Instance",
    "Storage Device",
    "Storage Array",
    "SAN Switch",
    "Rack",
    "Chassis",
    "Blade Enclosure",
    "Mainframe",
    "Backup Appliance",
    "Database Instance",
  ],
  "pil-workplace": [
    "Workstation",
    "Notebook",
    "Desktop",
    "Thin Client",
    "VDI Client",
    "Mobile Device",
    "Tablet",
    "Printer",
    "Monitor",
    "Conference Room Device",
    "Handheld Scanner",
  ],
};

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const rand = rng(20260901);

const PILLAR_BIAS: Record<PillarId, number> = {
  "pil-dc": 4,
  "pil-network": -3,
  "pil-workplace": 1,
};

const clamp = (v: number) => Math.max(41, Math.min(99.4, v));

/** Short chart/legend key, e.g. "Palo Alto Firewall Device" -> "PA/FD". */
const codeOf = (name: string) => {
  const words = name.split(/[\s&/.-]+/).filter(Boolean);
  const head = (words[0] ?? "").slice(0, 2).toUpperCase();
  const tail = words
    .slice(1)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 3);
  return tail ? `${head}/${tail}` : head;
};

export type AttributeGap = {
  attribute: string;
  /** CIs in this category with the attribute unpopulated. */
  missingCis: number;
};

export type CategoryRecord = {
  id: string;
  pillarId: PillarId;
  name: string;
  code: string;
  totalCis: number;
  /** 12 monthly completeness scores, index 11 = latest. */
  scores: number[];
  gaps: AttributeGap[];
};

export const CATEGORIES: CategoryRecord[] = (() => {
  const out: CategoryRecord[] = [];
  let n = 0;
  for (const pillar of PILLARS) {
    for (const name of CATEGORY_CATALOGUE[pillar.id]) {
      n += 1;
      const base =
        84 + PILLAR_BIAS[pillar.id] + (rand() - 0.5) * 18 + (rand() - 0.5) * 4;
      const drift = (rand() - 0.4) * 0.8;
      const scores: number[] = [];
      let v = base - drift * 11;
      for (let m = 0; m < MONTHS.length; m += 1) {
        v = v + drift + (rand() - 0.5) * 2.2;
        scores.push(Number(clamp(v).toFixed(1)));
      }
      const totalCis = 320 + Math.floor(rand() * 14800);
      const latest = scores[scores.length - 1];
      const incomplete = Math.round(totalCis * (1 - latest / 100));

      // Attribute gaps: a handful of attributes carry most of the gap, some are clean.
      const affected = 3 + Math.floor(rand() * (ATTRIBUTE_COUNT - 5));
      const picked = COMPLETENESS_ATTRIBUTES.map((attribute, i) => ({
        attribute,
        weight: i < affected ? 0.15 + rand() : 0,
      }));
      // rotate so the affected attributes differ per category
      const shift = Math.floor(rand() * ATTRIBUTE_COUNT);
      const weights = picked.map(
        (_, i) => picked[(i + shift) % ATTRIBUTE_COUNT].weight,
      );
      const weightSum = weights.reduce((a, b) => a + b, 0) || 1;
      // A CI is usually missing more than one attribute, so gaps exceed incomplete CIs.
      const gapBudget = Math.round(incomplete * (1.2 + rand() * 0.8));
      const gaps: AttributeGap[] = COMPLETENESS_ATTRIBUTES.map((attribute, i) => ({
        attribute,
        missingCis:
          weights[i] === 0
            ? 0
            : Math.min(incomplete, Math.round((weights[i] / weightSum) * gapBudget)),
      }));

      out.push({
        id: `cat-${String(n).padStart(3, "0")}`,
        pillarId: pillar.id,
        name,
        code: codeOf(name),
        totalCis,
        scores,
        gaps,
      });
    }
  }
  return out;
})();

export const categoriesOf = (pillarId: PillarId) =>
  CATEGORIES.filter((c) => c.pillarId === pillarId);

/** Completeness target: a category at or above this is treated as complete. */
export const COMPLETENESS_TARGET = 92;

// --- derived views ---------------------------------------------------------

const tail = <T,>(arr: T[], n: number) => arr.slice(Math.max(0, arr.length - n));

export type CategoryView = {
  category: CategoryRecord;
  pillar: Pillar;
  score: number;
  delta: number;
  totalCis: number;
  incompleteCis: number;
  completeCis: number;
  /** Attributes with at least one CI missing a value. */
  attributesMissing: number;
  attributesTotal: number;
  /** Sum of attribute-level gaps across the category. */
  attributeGapCis: number;
  worstAttribute: AttributeGap | null;
  series: { month: string; value: number }[];
  gaps: AttributeGap[];
};

export function categoryViews(
  duration: number,
  pillarId?: PillarId,
): CategoryView[] {
  const src = pillarId ? categoriesOf(pillarId) : CATEGORIES;
  return src.map((category) => {
    const scores = tail(category.scores, duration);
    const months = tail(MONTHS, duration);
    const score = scores[scores.length - 1];
    const delta = Number((score - scores[0]).toFixed(1));
    const incompleteCis = Math.round(category.totalCis * (1 - score / 100));
    const missing = category.gaps.filter((g) => g.missingCis > 0);
    return {
      category,
      pillar: PILLARS.find((p) => p.id === category.pillarId)!,
      score,
      delta,
      totalCis: category.totalCis,
      incompleteCis,
      completeCis: category.totalCis - incompleteCis,
      attributesMissing: missing.length,
      attributesTotal: ATTRIBUTE_COUNT,
      attributeGapCis: category.gaps.reduce((a, g) => a + g.missingCis, 0),
      worstAttribute:
        missing.slice().sort((a, b) => b.missingCis - a.missingCis)[0] ?? null,
      series: months.map((month, i) => ({ month, value: scores[i] })),
      gaps: category.gaps,
    };
  });
}

export type PillarView = {
  pillar: Pillar;
  score: number;
  delta: number;
  totalCis: number;
  completeCis: number;
  incompleteCis: number;
  categories: number;
  categoriesOnTarget: number;
  attributesMissing: number;
  attributesTotal: number;
  series: { month: string; value: number }[];
  views: CategoryView[];
};

const weighted = (views: CategoryView[], pick: (v: CategoryView) => number) => {
  const total = views.reduce((a, v) => a + v.totalCis, 0) || 1;
  return views.reduce((a, v) => a + pick(v) * v.totalCis, 0) / total;
};

export function pillarViews(duration: number): PillarView[] {
  return PILLARS.map((pillar) => {
    const views = categoryViews(duration, pillar.id);
    const months = tail(MONTHS, duration);
    const totalCis = views.reduce((a, v) => a + v.totalCis, 0);
    const incompleteCis = views.reduce((a, v) => a + v.incompleteCis, 0);
    const score = Number((weighted(views, (v) => v.score)).toFixed(1));
    const series = months.map((month, i) => ({
      month,
      value: Number(weighted(views, (v) => v.series[i]?.value ?? v.score).toFixed(1)),
    }));
    const attributesMissing = new Set(
      views.flatMap((v) => v.gaps.filter((g) => g.missingCis > 0).map((g) => g.attribute)),
    ).size;
    return {
      pillar,
      score,
      delta: Number((score - (series[0]?.value ?? score)).toFixed(1)),
      totalCis,
      completeCis: totalCis - incompleteCis,
      incompleteCis,
      categories: views.length,
      categoriesOnTarget: views.filter((v) => v.score >= COMPLETENESS_TARGET).length,
      attributesMissing,
      attributesTotal: ATTRIBUTE_COUNT,
      series,
      views,
    };
  });
}

export function pillarMonthDelta(duration: number, pillarId: PillarId): number {
  const series = pillarViews(duration).find((view) => view.pillar.id === pillarId)?.series ?? [];
  if (series.length < 2) return 0;
  return Number((series[series.length - 1].value - series[series.length - 2].value).toFixed(1));
}

export type CategoryInsights = {
  avgDelta: number;
  mostImproved: CategoryView | null;
  mostCritical: CategoryView | null;
};

export function categoryInsights(duration: number, pillarId: PillarId): CategoryInsights {
  const views = categoryViews(duration, pillarId);
  return {
    avgDelta: Number(
      (views.reduce((sum, view) => sum + view.delta, 0) / (views.length || 1)).toFixed(1),
    ),
    mostImproved: views.slice().sort((a, b) => b.delta - a.delta)[0] ?? null,
    mostCritical: views.slice().sort((a, b) => a.score - b.score)[0] ?? null,
  };
}

export type CompletenessOverall = {
  score: number;
  delta: number;
  totalCis: number;
  completeCis: number;
  incompleteCis: number;
  categories: number;
  categoriesBelowTarget: number;
  pillars: number;
  attributesTotal: number;
};

export function completenessOverall(duration: number): CompletenessOverall {
  const views = categoryViews(duration);
  const totalCis = views.reduce((a, v) => a + v.totalCis, 0);
  const incompleteCis = views.reduce((a, v) => a + v.incompleteCis, 0);
  const score = Number(weighted(views, (v) => v.score).toFixed(1));
  const first = Number(
    weighted(views, (v) => v.series[0]?.value ?? v.score).toFixed(1),
  );
  return {
    score,
    delta: Number((score - first).toFixed(1)),
    totalCis,
    completeCis: totalCis - incompleteCis,
    incompleteCis,
    categories: views.length,
    categoriesBelowTarget: views.filter((v) => v.score < COMPLETENESS_TARGET).length,
    pillars: PILLARS.length,
    attributesTotal: ATTRIBUTE_COUNT,
  };
}

/** Chart series for the worst/best N categories of a pillar. */
export function categoryTrends(
  duration: number,
  pillarId: PillarId,
  limit: number,
  order: "best" | "worst",
) {
  const views = categoryViews(duration, pillarId)
    .slice()
    .sort((a, b) => (order === "best" ? b.score - a.score : a.score - b.score))
    .slice(0, limit);
  const months = tail(MONTHS, duration);
  const series = months.map((month, i) => {
    const row: Record<string, string | number> = { month };
    for (const v of views) row[v.category.code] = v.series[i]?.value ?? v.score;
    return row;
  });
  return { series, categories: views };
}

/** Attribute-level gap roll-up across a pillar (or the whole estate). */
export function attributeGaps(duration: number, pillarId?: PillarId) {
  const views = categoryViews(duration, pillarId);
  return COMPLETENESS_ATTRIBUTES.map((attribute) => {
    const missingCis = views.reduce(
      (a, v) => a + (v.gaps.find((g) => g.attribute === attribute)?.missingCis ?? 0),
      0,
    );
    const categories = views.filter(
      (v) => (v.gaps.find((g) => g.attribute === attribute)?.missingCis ?? 0) > 0,
    ).length;
    return { attribute, missingCis, categories, totalCategories: views.length };
  }).sort((a, b) => b.missingCis - a.missingCis);
}
