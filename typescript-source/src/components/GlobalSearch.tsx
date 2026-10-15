import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AUDITS,
  DEPARTMENTS,
  OWNERS,
  SERVICES,
} from '../data/demo';
import {
  attributeGaps,
  CATEGORIES,
  COMPLETENESS_ATTRIBUTES,
  PILLARS,
  type PillarId,
} from '../data/completeness';

type HitKind =
  | 'Audit'
  | 'Service'
  | 'Pillar'
  | 'Category'
  | 'Attribute'
  | 'Department'
  | 'Owner';

type Hit = {
  id: string;
  kind: HitKind;
  label: string;
  sub: string;
  search: string;
  run: () => void;
};

const GROUP_ORDER: HitKind[] = [
  'Audit',
  'Service',
  'Pillar',
  'Category',
  'Attribute',
  'Department',
  'Owner',
];

const resultsId = 'global-search-results';

function matchQuality(hit: Hit, query: string) {
  const label = hit.label.toLocaleLowerCase();
  if (label === query) return 3;
  if (label.startsWith(query)) return 2;
  if (label.includes(query)) return 1;
  return 0;
}

export function GlobalSearch({
  onAudit,
  onService,
  onPillar,
  onDepartment,
  onOwner,
}: {
  onAudit: (id: string) => void;
  onService: (id: string) => void;
  onPillar: (id: PillarId, categoryId?: string) => void;
  onDepartment: (deptId: string) => void;
  onOwner: (owner: string) => void;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onAudit, onService, onPillar, onDepartment, onOwner });
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const index = useMemo<Hit[]>(
    () => [
      ...AUDITS.map((audit) => ({
        id: audit.id,
        kind: 'Audit' as const,
        label: audit.name,
        sub: audit.serviceIds
          .map((serviceId) => SERVICES.find((service) => service.id === serviceId)?.short)
          .filter(Boolean)
          .join(' · '),
        search: `${audit.name} ${audit.serviceIds
          .map((serviceId) => SERVICES.find((service) => service.id === serviceId)?.short)
          .filter(Boolean)
          .join(' · ')}`,
        run: () => callbacks.current.onAudit(audit.id),
      })),
      ...SERVICES.map((service) => ({
        id: service.id,
        kind: 'Service' as const,
        label: service.name,
        sub: service.short,
        search: `${service.name} ${service.short}`,
        run: () => callbacks.current.onService(service.id),
      })),
      ...PILLARS.map((pillar) => ({
        id: pillar.id,
        kind: 'Pillar' as const,
        label: pillar.name,
        sub: `${pillar.short} completeness`,
        search: `${pillar.name} ${pillar.short} completeness`,
        run: () => callbacks.current.onPillar(pillar.id),
      })),
      ...CATEGORIES.map((category) => ({
        id: category.id,
        kind: 'Category' as const,
        label: category.name,
        sub: `${PILLARS.find((pillar) => pillar.id === category.pillarId)?.name ?? ''} · ${category.code}`,
        search: `${category.name} ${PILLARS.find((pillar) => pillar.id === category.pillarId)?.name ?? ''} · ${category.code}`,
        run: () => callbacks.current.onPillar(category.pillarId, category.id),
      })),
      ...COMPLETENESS_ATTRIBUTES.map((attribute) => ({
        id: `attribute-${attribute}`,
        kind: 'Attribute' as const,
        label: attribute,
        sub: 'Mandatory attribute',
        search: attribute,
        run: () => {
          const pillar = PILLARS.map((candidate) => {
            const gap = attributeGaps(12, candidate.id).find((item) => item.attribute === attribute);
            return { id: candidate.id, missingCis: gap?.missingCis ?? 0 };
          }).sort((a, b) => b.missingCis - a.missingCis)[0];
          if (pillar) callbacks.current.onPillar(pillar.id);
        },
      })),
      ...DEPARTMENTS.map((department) => ({
        id: department.id,
        kind: 'Department' as const,
        label: department.name,
        sub: department.owner,
        search: `${department.name} ${department.owner}`,
        run: () => callbacks.current.onDepartment(department.id),
      })),
      ...OWNERS.map((owner) => ({
        id: `owner-${owner}`,
        kind: 'Owner' as const,
        label: owner,
        sub: 'Department owner',
        search: owner,
        run: () => callbacks.current.onOwner(owner),
      })),
    ],
    [],
  );

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const hitsByKind = useMemo(() => {
    if (!normalizedQuery) return new Map<HitKind, Hit[]>();
    const grouped = new Map<HitKind, Hit[]>();
    for (const hit of index) {
      const searchable = hit.search.toLocaleLowerCase();
      if (!searchable.includes(normalizedQuery)) continue;
      const list = grouped.get(hit.kind) ?? [];
      list.push(hit);
      grouped.set(hit.kind, list);
    }
    for (const [kind, hits] of grouped) {
      grouped.set(
        kind,
        hits
          .sort((a, b) => {
            const aQuality = matchQuality(a, normalizedQuery);
            const bQuality = matchQuality(b, normalizedQuery);
            if (aQuality !== bQuality) return bQuality - aQuality;
            return a.label.localeCompare(b.label);
          })
          .slice(0, 5),
      );
    }
    return grouped;
  }, [index, normalizedQuery]);

  const orderedKinds = GROUP_ORDER
    .filter((kind) => hitsByKind.has(kind))
    .sort((a, b) => {
      const aBest = Math.max(...(hitsByKind.get(a) ?? []).map((hit) => matchQuality(hit, normalizedQuery)));
      const bBest = Math.max(...(hitsByKind.get(b) ?? []).map((hit) => matchQuality(hit, normalizedQuery)));
      if (aBest !== bBest) return bBest - aBest;
      return GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b);
    });
  const hits = orderedKinds.flatMap((kind) => hitsByKind.get(kind) ?? []).slice(0, 20);
  const showPanel = isOpen && normalizedQuery.length > 0;

  useEffect(() => {
    callbacks.current = { onAudit, onService, onPillar, onDepartment, onOwner };
  }, [onAudit, onDepartment, onOwner, onPillar, onService]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  const closeAfterRun = (hit: Hit) => {
    hit.run();
    setQuery('');
    setIsOpen(false);
    setActiveIndex(-1);
  };

  return (
    <div className="gsearch" ref={wrapperRef}>
      <input
        className="gsearch-input"
        type="search"
        placeholder="Search audits, services, departments…"
        value={query}
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={resultsId}
        aria-activedescendant={showPanel && activeIndex >= 0 ? `global-search-option-${activeIndex}` : undefined}
        onChange={(event) => {
          const next = event.target.value;
          setQuery(next);
          setIsOpen(next.trim().length > 0);
          setActiveIndex(-1);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && showPanel && hits.length > 0) {
            event.preventDefault();
            setActiveIndex((current) => (current + 1) % hits.length);
          } else if (event.key === 'ArrowUp' && showPanel && hits.length > 0) {
            event.preventDefault();
            setActiveIndex((current) => (current <= 0 ? hits.length - 1 : current - 1));
          } else if (event.key === 'Enter' && showPanel && activeIndex >= 0 && hits[activeIndex]) {
            event.preventDefault();
            closeAfterRun(hits[activeIndex]);
          } else if (event.key === 'Escape') {
            setIsOpen(false);
            setActiveIndex(-1);
          } else if (event.key === 'Tab') {
            setIsOpen(false);
            setActiveIndex(-1);
          }
        }}
      />
      {showPanel && (
        <div className="gsearch-panel" id={resultsId} role="listbox" aria-label="Global search results">
          {hits.length === 0 ? (
            <p className="gsearch-empty">
              No matches for “{query.trim()}”
            </p>
          ) : (
            orderedKinds.map((kind) => {
              const groupHits = hitsByKind.get(kind)?.filter((hit) => hits.includes(hit)) ?? [];
              if (groupHits.length === 0) return null;
              return (
                <div className="gsearch-group" key={kind}>
                  <p className="gsearch-group-head">{kind}</p>
                  {groupHits.map((hit) => {
                    const hitIndex = hits.indexOf(hit);
                    return (
                      <button
                        className={`gsearch-row ${hitIndex === activeIndex ? 'on' : ''}`}
                        id={`global-search-option-${hitIndex}`}
                        key={`${hit.kind}-${hit.id}`}
                        role="option"
                        aria-selected={hitIndex === activeIndex}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => closeAfterRun(hit)}
                      >
                        <span className="gsearch-copy">
                          <span className="gsearch-label">{hit.label}</span>
                          <span className="gsearch-sub">{hit.sub}</span>
                        </span>
                        <span className="gsearch-kind">{hit.kind}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
