import { useMemo, useState } from 'react';
import {
  ATTRIBUTE_COUNT,
  COMPLETENESS_TARGET,
  categoryInsights,
  categoryViews,
  completenessOverall,
  pillarMonthDelta,
  pillarViews,
  type PillarId,
} from '../data/completeness';
import { Delta, fmt } from '../ui';
import { AttributeGapTable, CategoryTrendChart } from './completenessParts';

const ATTN_PAGE_SIZE = 6;

type CategorySort = 'score' | 'incomplete' | 'attributes';
type SortDirection = 'asc' | 'desc';

export function Completeness({
  duration,
  pillarId,
  onPillar,
}: {
  duration: number;
  pillarId: PillarId;
  onPillar: (id: PillarId) => void;
}) {
  const overall = useMemo(() => completenessOverall(duration), [duration]);
  const pillars = useMemo(() => pillarViews(duration), [duration]);
  const activePillar = pillars.find((view) => view.pillar.id === pillarId) ?? pillars[0];
  const activePillarId = activePillar?.pillar.id ?? pillarId;
  const categories = useMemo(
    () => categoryViews(duration, activePillarId).sort((a, b) => a.score - b.score),
    [duration, activePillarId],
  );
  const attention = categories.filter((view) => view.score < COMPLETENESS_TARGET);
  const [attnPage, setAttnPage] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [panel, setPanel] = useState<'trends' | 'gaps'>('trends');
  const [trendSort, setTrendSort] = useState<'desc' | 'asc'>('desc');
  const [hidden, setHidden] = useState<string[]>([]);
  const [categorySort, setCategorySort] = useState<CategorySort>('score');
  const [categoryDirection, setCategoryDirection] = useState<SortDirection>('asc');
  const [categoryPage, setCategoryPage] = useState(0);

  const attnPages = Math.max(1, Math.ceil(attention.length / ATTN_PAGE_SIZE));
  const page = Math.min(attnPage, attnPages - 1);
  const visibleAttention = attention.slice(page * ATTN_PAGE_SIZE, (page + 1) * ATTN_PAGE_SIZE);
  const selected =
    (selectedCategory && categories.some((view) => view.category.id === selectedCategory)
      ? selectedCategory
      : null) ??
    attention[0]?.category.id ??
    categories[0]?.category.id;
  const insights = useMemo(
    () => categoryInsights(duration, activePillarId),
    [duration, activePillarId],
  );
  const sortedCategories = useMemo(() => {
    const sorted = [...categories].sort((a, b) => {
      if (categorySort === 'incomplete') return a.incompleteCis - b.incompleteCis;
      if (categorySort === 'attributes') return a.attributesMissing - b.attributesMissing;
      return a.score - b.score;
    });
    return categoryDirection === 'desc' ? sorted.reverse() : sorted;
  }, [categories, categoryDirection, categorySort]);
  const categoryPageSize = 10;
  const categoryPages = Math.max(1, Math.ceil(sortedCategories.length / categoryPageSize));
  const currentCategoryPage = Math.min(categoryPage, categoryPages - 1);
  const visibleCategories = sortedCategories.slice(
    currentCategoryPage * categoryPageSize,
    (currentCategoryPage + 1) * categoryPageSize,
  );
  const band =
    overall.score >= COMPLETENESS_TARGET
      ? 'On target'
      : overall.score >= COMPLETENESS_TARGET - 5
        ? 'Watch'
        : 'Off target';

  const toggleHidden = (key: string) =>
    setHidden(hidden.includes(key) ? hidden.filter((item) => item !== key) : [...hidden, key]);
  const sortCategories = (key: CategorySort) => {
    if (categorySort === key) {
      setCategoryDirection(categoryDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setCategorySort(key);
      setCategoryDirection(key === 'score' ? 'asc' : 'desc');
    }
    setCategoryPage(0);
  };

  return (
    <>
      <div className="dash-body">
        <div className="rail">
          <section className="overall">
            <p className="overall-lbl">Overall Completeness</p>
            <div className="overall-figure">
              <span className="num">{overall.score.toFixed(1)}%</span>
              <span
                className={`overall-band ${
                  band === 'On target' ? 'ok' : band === 'Watch' ? 'warn' : 'bad'
                }`}
              >
                {band}
              </span>
            </div>
            <p className="overall-delta">
              <Delta value={overall.delta} /> over last {duration} months · target{' '}
              <b className="num">{COMPLETENESS_TARGET}%</b>
            </p>
            <dl className="overall-facts">
              <div>
                <dt>Complete CIs</dt>
                <dd className="num">{fmt(overall.completeCis)}</dd>
              </div>
              <div>
                <dt>Incomplete CIs</dt>
                <dd className="num">{fmt(overall.incompleteCis)}</dd>
              </div>
              <div>
                <dt>Categories below target</dt>
                <dd className="num">
                  {overall.categoriesBelowTarget}/{overall.categories}
                </dd>
              </div>
              <div>
                <dt>Mandatory attributes</dt>
                <dd className="num">{ATTRIBUTE_COUNT}</dd>
              </div>
            </dl>
            <p className="overall-scope">
              {overall.pillars} pillars · {overall.categories} categories · {ATTRIBUTE_COUNT} mandatory attributes
            </p>
          </section>

          <div className="svc-stack">
            {pillars.map((view) => {
              const on = view.pillar.id === activePillarId;
              const delta = pillarMonthDelta(duration, view.pillar.id);
              return (
                <button
                  key={view.pillar.id}
                  className={`svc-card ${view.score < COMPLETENESS_TARGET ? 'weak' : ''} ${
                    on ? 'selected' : ''
                  }`}
                  onClick={() => onPillar(view.pillar.id)}
                >
                  <div className="svc-head">
                    <span className="svc-name">{view.pillar.name}</span>
                    <span className="card-open" aria-hidden>
                      →
                    </span>
                  </div>
                  <div className="svc-figure">
                    <span className={`num svc-score ${view.score < COMPLETENESS_TARGET ? 'bad' : 'good'}`}>
                      {view.score.toFixed(1)}%
                    </span>
                    <span className={`svc-trend num ${delta < 0 ? 'down' : ''}`}>
                      {delta >= 0 ? '↑' : '↓'}
                      {Math.abs(delta).toFixed(1)}% from last month
                    </span>
                  </div>
                  <div className="svc-split">
                    <span>
                      <i className="lbl">Incomplete CIs</i>
                      <b className="num bad">{fmt(view.incompleteCis)}</b>
                    </span>
                    <span>
                      <i className="lbl">Complete CIs</i>
                      <b className="num good">{fmt(view.completeCis)}</b>
                    </span>
                    <span>
                      <i className="lbl">Categories on target</i>
                      <b className={`num ${view.categoriesOnTarget < view.categories ? 'bad' : 'good'}`}>
                        {view.categoriesOnTarget}/{view.categories}
                      </b>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rail">
          <section className="attn">
            <header className="attn-head">
              <span className="attn-title">⚠ Attention Required · {activePillar?.pillar.name}</span>
            </header>
            <div className="attn-strip" key={page}>
              {visibleAttention.map((view) => (
                <article
                  className="attn-card"
                  key={view.category.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedCategory(view.category.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') setSelectedCategory(view.category.id);
                  }}
                >
                  <div className="attn-card-head">
                    <span className="attn-card-name">{view.category.name}</span>
                    <span className="card-open" aria-hidden>
                      →
                    </span>
                  </div>
                  <span className="attn-figure num">{fmt(view.incompleteCis)}</span>
                  <span className="attn-sub num">
                    {view.attributesMissing} of {ATTRIBUTE_COUNT} attributes missing
                  </span>
                  <span className="attn-foot num">{(100 - view.score).toFixed(1)}% incomplete</span>
                </article>
              ))}
              {attention.length === 0 && <p className="empty">All categories are at or above target.</p>}
            </div>
            <div className="attn-nav">
              <button
                onClick={() => setAttnPage(Math.max(0, page - 1))}
                disabled={page === 0}
                aria-label="Previous categories"
              >
                ‹
              </button>
              <button
                onClick={() => setAttnPage(Math.min(attnPages - 1, page + 1))}
                disabled={page >= attnPages - 1}
                aria-label="More categories"
              >
                ›
              </button>
            </div>
          </section>

          <section className="panel">
            <header className="panel-head">
              <div>
                <h2>Completeness Trends Analysis</h2>
                <p className="panel-sub">
                  {duration} cycles: {activePillar?.series[0]?.month} →{' '}
                  {activePillar?.series[activePillar.series.length - 1]?.month}
                </p>
              </div>
              <div className="seg">
                <button className={panel === 'trends' ? 'on' : ''} onClick={() => setPanel('trends')}>
                  Category trends
                </button>
                <button className={panel === 'gaps' ? 'on' : ''} onClick={() => setPanel('gaps')}>
                  Attribute gaps
                </button>
              </div>
            </header>

            <div className="grid g4 tiles">
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
              <div className="tile">
                <span className="lbl">Categories on target</span>
                <b className="num">
                  {activePillar?.categoriesOnTarget ?? 0} of {activePillar?.categories ?? 0}
                </b>
                <span className="tile-foot">at or above {COMPLETENESS_TARGET}%</span>
              </div>
            </div>

            {panel === 'trends' ? (
              <>
                <CategoryTrendChart
                  duration={duration}
                  pillarId={activePillarId}
                  sort={trendSort}
                  hidden={hidden}
                  onSort={setTrendSort}
                  onToggle={toggleHidden}
                />
              </>
            ) : (
              <>
                <div className="chart-head">
                  <p className="chart-title">Attribute gaps across {activePillar?.pillar.name}</p>
                </div>
                <AttributeGapTable duration={duration} pillarId={activePillarId} />
              </>
            )}
          </section>

          <section className="panel">
            <header className="panel-head">
              <div>
                <h2>{activePillar?.pillar.name} → Category breakdown</h2>
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
                    <button className="table-sort" onClick={() => sortCategories('attributes')}>
                      Attributes missing
                    </button>
                  </th>
                  <th>Worst attribute</th>
                </tr>
              </thead>
              <tbody>
                {visibleCategories.map((view) => (
                  <tr
                    key={view.category.id}
                    className={`row-link ${selected === view.category.id ? 'row-on' : ''}`}
                    onClick={() => setSelectedCategory(view.category.id)}
                  >
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
                    <td className="r num">
                      {view.attributesMissing} / {view.attributesTotal}
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
                ))}
              </tbody>
            </table>
            <div className="pager">
              <span className="num">
                {sortedCategories.length === 0 ? 0 : currentCategoryPage * categoryPageSize + 1}–
                {Math.min((currentCategoryPage + 1) * categoryPageSize, sortedCategories.length)} of{' '}
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
          </section>
        </div>
      </div>
    </>
  );
}
