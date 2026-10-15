import { useMemo, useState } from 'react';
import {
  ATTRIBUTE_COUNT,
  COMPLETENESS_TARGET,
  attributeGaps,
  categoryInsights,
  categoryViews,
  pillarMonthDelta,
  pillarViews,
  PILLARS,
  type CategoryView,
  type PillarId,
} from '../data/completeness';
import { Delta, fmt } from '../ui';
import {
  AttributeGapChart,
  AttributeGapTable,
  CategoryTrendChart,
  PillarTrendChart,
} from './completenessParts';

const ATTN_PAGE_SIZE = 6;
const PAGE_SIZES = [10, 25, 50];

type CategorySort = 'score' | 'incomplete' | 'complete' | 'attributes';
type SortDirection = 'asc' | 'desc';

const bandFor = (score: number) =>
  score >= COMPLETENESS_TARGET
    ? 'On target'
    : score >= COMPLETENESS_TARGET - 5
      ? 'Watch'
      : 'Off target';

export function PillarDrill({
  pillarId,
  duration,
  focusCategory,
  onBack,
  onPillar,
}: {
  pillarId: PillarId;
  duration: number;
  focusCategory?: string | null;
  onBack: () => void;
  onPillar: (id: PillarId) => void;
}) {
  const pillar = PILLARS.find((item) => item.id === pillarId) ?? PILLARS[0];
  const pillarView = useMemo(
    () => pillarViews(duration).find((view) => view.pillar.id === pillar.id)!,
    [duration, pillar.id],
  );
  const categories = useMemo(
    () => categoryViews(duration, pillar.id),
    [duration, pillar.id],
  );
  const gaps = useMemo(() => attributeGaps(duration, pillar.id), [duration, pillar.id]);
  const insights = useMemo(() => categoryInsights(duration, pillar.id), [duration, pillar.id]);
  const [view, setView] = useState<'report' | 'analytics'>('report');
  const [attnPage, setAttnPage] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categorySort, setCategorySort] = useState<CategorySort>('score');
  const [categoryDirection, setCategoryDirection] = useState<SortDirection>('asc');
  const [categorySize, setCategorySize] = useState(10);
  const [categoryPage, setCategoryPage] = useState(0);
  const [trendSort, setTrendSort] = useState<'desc' | 'asc'>('desc');
  const [hidden, setHidden] = useState<string[]>([]);

  const attentionPages = Math.max(1, Math.ceil(gaps.length / ATTN_PAGE_SIZE));
  const attentionPage = Math.min(attnPage, attentionPages - 1);
  const visibleGaps = gaps.slice(
    attentionPage * ATTN_PAGE_SIZE,
    (attentionPage + 1) * ATTN_PAGE_SIZE,
  );
  const worstCategory = categories.slice().sort((a, b) => a.score - b.score)[0];
  const focusedCategory =
    focusCategory && categories.some((item) => item.category.id === focusCategory)
      ? focusCategory
      : null;
  const selectedId =
    selectedCategory && categories.some((item) => item.category.id === selectedCategory)
      ? selectedCategory
      : focusedCategory
        ? focusedCategory
        : worstCategory?.category.id;
  const selectedView =
    categories.find((item) => item.category.id === selectedId) ?? worstCategory;

  const sortedCategories = useMemo(() => {
    const sorted = [...categories].sort((a, b) => {
      if (categorySort === 'incomplete') return a.incompleteCis - b.incompleteCis;
      if (categorySort === 'complete') return a.completeCis - b.completeCis;
      if (categorySort === 'attributes') return a.attributesMissing - b.attributesMissing;
      return a.score - b.score;
    });
    return categoryDirection === 'desc' ? sorted.reverse() : sorted;
  }, [categories, categoryDirection, categorySort]);
  const categoryPages = Math.max(1, Math.ceil(sortedCategories.length / categorySize));
  const currentCategoryPage = Math.min(categoryPage, categoryPages - 1);
  const visibleCategories = sortedCategories.slice(
    currentCategoryPage * categorySize,
    (currentCategoryPage + 1) * categorySize,
  );
  const band = bandFor(pillarView.score);

  const sortCategories = (key: CategorySort) => {
    if (categorySort === key) {
      setCategoryDirection(categoryDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setCategorySort(key);
      setCategoryDirection(key === 'score' ? 'asc' : 'desc');
    }
    setCategoryPage(0);
  };
  const toggleHidden = (key: string) =>
    setHidden(hidden.includes(key) ? hidden.filter((item) => item !== key) : [...hidden, key]);

  return (
    <div className="drill">
      <div className="drill-top">
        <button className="link-btn back" onClick={onBack}>
          ← Back
        </button>
        <div className="drill-views" role="tablist">
          <div className="seg">
            <button
              role="tab"
              aria-selected={view === 'report'}
              className={view === 'report' ? 'on' : ''}
              onClick={() => setView('report')}
            >
              Report
            </button>
            <button
              role="tab"
              aria-selected={view === 'analytics'}
              className={view === 'analytics' ? 'on' : ''}
              onClick={() => setView('analytics')}
            >
              Analytics
            </button>
          </div>
        </div>
      </div>

      <header className="page-head">
        <h1 className="page-title">
          {pillar.name} — Pillar {view === 'report' ? 'Overview' : 'Analytics'}
        </h1>
        <p className="page-sub">
          {pillarView.categories} categories · {ATTRIBUTE_COUNT} mandatory attributes · target{' '}
          {COMPLETENESS_TARGET}%
        </p>
      </header>

      {view === 'analytics' ? (
        <section className="card">
          <div className="card-head">
            <div>
              <h2 className="card-title">{pillar.name} — Analytics Report</h2>
              <p className="card-sub">
                {duration} cycles: {pillarView.series[0]?.month} →{' '}
                {pillarView.series[pillarView.series.length - 1]?.month}
              </p>
            </div>
          </div>
          <div className="card-body">
            <div className="grid g4 tiles">
              <div className="tile">
                <span className="lbl">Pillar completeness</span>
                <b className={`num ${pillarView.score >= COMPLETENESS_TARGET ? 'good' : 'bad'}`}>
                  {pillarView.score.toFixed(1)}%
                </b>
                <span className="tile-foot">{band}</span>
              </div>
              <div className="tile">
                <span className="lbl">Avg category change</span>
                <b className="num accent-ink">
                  {insights.avgDelta >= 0 ? '+' : ''}
                  {insights.avgDelta.toFixed(1)}pt
                </b>
                <span className="tile-foot accent-ink">across all categories</span>
              </div>
              <div className="tile">
                <span className="lbl">Most improved category</span>
                <b className="accent-ink">{insights.mostImproved?.category.name ?? '—'}</b>
                <span className="tile-foot accent-ink">
                  {insights.mostImproved
                    ? `${insights.mostImproved.delta >= 0 ? '+' : ''}${insights.mostImproved.delta.toFixed(1)}pt`
                    : '—'}
                </span>
              </div>
              <div className="tile">
                <span className="lbl">Most critical category</span>
                <b className="bad">{insights.mostCritical?.category.name ?? '—'}</b>
                <span className="tile-foot bad">
                  {insights.mostCritical
                    ? `${insights.mostCritical.score.toFixed(1)}% · ${
                        insights.mostCritical.delta >= 0 ? '+' : ''
                      }${insights.mostCritical.delta.toFixed(1)}pt`
                    : '—'}
                </span>
              </div>
            </div>

            <div className="chart-head">
              <p className="chart-title">{pillar.name} completeness over time</p>
            </div>
            <PillarTrendChart duration={duration} pillarId={pillar.id} />

            <CategoryTrendChart
              duration={duration}
              pillarId={pillar.id}
              sort={trendSort}
              hidden={hidden}
              onSort={setTrendSort}
              onToggle={toggleHidden}
            />

            <div className="chart-head">
              <p className="chart-title">Attribute gaps across {pillar.name}</p>
            </div>
            <AttributeGapChart duration={duration} pillarId={pillar.id} />
            <AttributeGapTable duration={duration} pillarId={pillar.id} />
          </div>
        </section>
      ) : (
        <div className="drill-body">
          <div className="rail">
            <section className="total-card">
              <p className="total-lbl">Total {pillar.name} CIs</p>
              <span className="total-figure num">{fmt(pillarView.totalCis)}</span>
              <p className="total-new">Completeness score</p>
              <div className="overall-figure">
                <span className="num total-score">{pillarView.score.toFixed(1)}%</span>
                <span
                  className={`overall-band ${
                    band === 'On target' ? 'ok' : band === 'Off target' ? 'bad' : ''
                  }`}
                >
                  {band}
                </span>
              </div>
              <div className="total-split">
                <span>
                  <i className="lbl">Complete CIs</i>
                  <b className="num">{fmt(pillarView.completeCis)}</b>
                </span>
                <span>
                  <i className="lbl">Incomplete CIs</i>
                  <b className="num">{fmt(pillarView.incompleteCis)}</b>
                </span>
              </div>
              <p className="total-new">
                {pillarView.categories} categories · {ATTRIBUTE_COUNT} mandatory attributes
              </p>
            </section>
          </div>

          <div className="rail">
            <section className="attn">
              <header className="attn-head">
                <span className="attn-title">⚠ Attention Required · Attributes</span>
              </header>
              <div className="attn-strip" key={attentionPage}>
                {visibleGaps.map((gap) => (
                  <article className="attn-card" key={gap.attribute}>
                    <div className="attn-card-head">
                      <span className="attn-card-name">{gap.attribute}</span>
                      <span className="card-open" aria-hidden>
                        →
                      </span>
                    </div>
                    <span className="attn-figure num">{fmt(gap.missingCis)}</span>
                    <span className="attn-sub num">
                      {gap.categories} of {gap.totalCategories} categories affected
                    </span>
                    <span className="attn-foot num">
                      {pillarView.totalCis
                        ? ((gap.missingCis / pillarView.totalCis) * 100).toFixed(1)
                        : '0.0'}
                      % of CIs missing this attribute
                    </span>
                  </article>
                ))}
              </div>
              <div className="attn-nav">
                <button
                  onClick={() => setAttnPage(Math.max(0, attentionPage - 1))}
                  disabled={attentionPage === 0}
                  aria-label="Previous attributes"
                >
                  ‹
                </button>
                <button
                  onClick={() => setAttnPage(Math.min(attentionPages - 1, attentionPage + 1))}
                  disabled={attentionPage >= attentionPages - 1}
                  aria-label="More attributes"
                >
                  ›
                </button>
              </div>
            </section>

            <section className="panel">
              <header className="panel-head">
                <div>
                  <h2>Categories in {pillar.name}</h2>
                  <p className="panel-sub">
                    {pillarView.categories} categories · {ATTRIBUTE_COUNT} mandatory attributes
                  </p>
                </div>
              </header>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th className="r">
                      <button className="table-sort" onClick={() => sortCategories('score')}>
                        Completeness score
                      </button>
                    </th>
                    <th className="r">Trend</th>
                    <th className="r">
                      <button className="table-sort" onClick={() => sortCategories('incomplete')}>
                        CIs not complete
                      </button>
                    </th>
                    <th className="r">
                      <button className="table-sort" onClick={() => sortCategories('complete')}>
                        Complete CIs
                      </button>
                    </th>
                    <th className="r">
                      <button className="table-sort" onClick={() => sortCategories('attributes')}>
                        Attributes missing
                      </button>
                    </th>
                    <th>Worst attribute</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleCategories.map((item) => (
                    <CategoryRow
                      key={item.category.id}
                      view={item}
                      selected={item.category.id === selectedId}
                      onSelect={() => setSelectedCategory(item.category.id)}
                    />
                  ))}
                </tbody>
              </table>
              <div className="pager">
                <label>
                  Rows per page:
                  <select
                    value={categorySize}
                    onChange={(event) => {
                      setCategorySize(Number(event.target.value));
                      setCategoryPage(0);
                    }}
                  >
                    {PAGE_SIZES.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </label>
                <span className="num">
                  {sortedCategories.length === 0 ? 0 : currentCategoryPage * categorySize + 1}–
                  {Math.min((currentCategoryPage + 1) * categorySize, sortedCategories.length)} of{' '}
                  {sortedCategories.length}
                </span>
                <div className="pager-nav">
                  <button
                    onClick={() => setCategoryPage(Math.max(0, currentCategoryPage - 1))}
                    disabled={currentCategoryPage === 0}
                    aria-label="Previous category page"
                  >
                    ‹
                  </button>
                  <button
                    onClick={() => setCategoryPage(Math.min(categoryPages - 1, currentCategoryPage + 1))}
                    disabled={currentCategoryPage >= categoryPages - 1}
                    aria-label="Next category page"
                  >
                    ›
                  </button>
                </div>
              </div>
              {selectedView && (
                <section className="panel category-detail">
                  <header className="panel-head">
                    <div>
                      <h2>{selectedView.category.name} → attribute detail</h2>
                    </div>
                  </header>
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Attribute</th>
                        <th className="r">CIs missing</th>
                        <th className="r">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedView.gaps.map((gap) => (
                        <tr key={gap.attribute}>
                          <td className="primary">{gap.attribute}</td>
                          <td className="r num">{fmt(gap.missingCis)}</td>
                          <td className={`r ${gap.missingCis === 0 ? 'good' : 'bad'}`}>
                            {gap.missingCis === 0 ? 'Complete' : 'Missing'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              )}
            </section>
          </div>
        </div>
      )}

      {view === 'report' && (
        <div className="svc-stack pillar-shortcuts">
          {pillarViews(duration)
            .filter((item) => item.pillar.id !== pillar.id)
            .map((item) => (
              <button
                className="svc-card"
                key={item.pillar.id}
                onClick={() => onPillar(item.pillar.id)}
              >
                <div className="svc-head">
                  <span className="svc-name">{item.pillar.name}</span>
                  <span className="card-open" aria-hidden>
                    →
                  </span>
                </div>
                <div className="svc-figure">
                  <span className="num svc-score">{item.score.toFixed(1)}%</span>
                  <span className={`svc-trend num ${pillarMonthDelta(duration, item.pillar.id) < 0 ? 'down' : ''}`}>
                    {pillarMonthDelta(duration, item.pillar.id) >= 0 ? '↑' : '↓'}
                    {Math.abs(pillarMonthDelta(duration, item.pillar.id)).toFixed(1)}% from last month
                  </span>
                </div>
                <div className="svc-split">
                  <span>
                    <i className="lbl">Incomplete CIs</i>
                    <b className="num bad">{fmt(item.incompleteCis)}</b>
                  </span>
                  <span>
                    <i className="lbl">Complete CIs</i>
                    <b className="num good">{fmt(item.completeCis)}</b>
                  </span>
                  <span>
                    <i className="lbl">Categories on target</i>
                    <b className="num">{item.categoriesOnTarget}/{item.categories}</b>
                  </span>
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

function CategoryRow({
  view,
  selected,
  onSelect,
}: {
  view: CategoryView;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <tr className={`row-link ${selected ? 'row-on' : ''}`} onClick={onSelect}>
      <td className="primary">
        {view.category.name}
        <div className="muted">{view.category.code}</div>
      </td>
      <td className={`r num ${view.score < COMPLETENESS_TARGET ? 'bad' : 'good'}`}>
        {view.score.toFixed(1)}%
      </td>
      <td className="r">
        <Delta value={view.delta} />
      </td>
      <td className="r num">
        {fmt(view.incompleteCis)} / {fmt(view.totalCis)}
      </td>
      <td className="r num">{fmt(view.completeCis)}</td>
      <td className="r num">
        {view.attributesMissing} / {ATTRIBUTE_COUNT}
      </td>
      <td className="muted">
        {view.worstAttribute ? (
          <>
            {view.worstAttribute.attribute}
            <div className="muted">{fmt(view.worstAttribute.missingCis)} missing CIs</div>
          </>
        ) : (
          '—'
        )}
      </td>
    </tr>
  );
}
