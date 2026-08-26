export const SEARCH_SORTS = ['best', 'stars', 'forks', 'updated'] as const;
export type SearchSort = (typeof SEARCH_SORTS)[number];

export interface SearchParams {
  q: string;
  lang: string | null;
  minStars: number | null;
  license: string | null;
  sort: SearchSort;
}

export function normalizeSearchParams(
  input: Partial<Record<'q' | 'lang' | 'stars' | 'license' | 'sort', string | null | undefined>>,
): SearchParams {
  const sortCandidate = input.sort as SearchSort | null | undefined;
  const parsedStars =
    input.stars !== null && input.stars !== undefined && input.stars !== ''
      ? Number.parseInt(input.stars, 10)
      : NaN;
  return {
    q: (input.q ?? '').trim(),
    lang: clean(input.lang),
    minStars: Number.isFinite(parsedStars) && parsedStars >= 0 ? parsedStars : null,
    license: clean(input.license)?.toLowerCase() ?? null,
    sort: sortCandidate !== undefined && sortCandidate !== null && (SEARCH_SORTS as readonly string[]).includes(sortCandidate)
      ? sortCandidate
      : 'best',
  };
}

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function qualifiersFor(p: SearchParams): string {
  let q = p.q.replace(/\s+/g, ' ').trim();
  if (p.lang) q += ` language:${p.lang}`;
  if (p.minStars !== null) q += ` stars:>=${p.minStars}`;
  if (p.license) q += ` license:${p.license}`;
  return q.trim();
}

export function canonicalKey(p: SearchParams): string {
  return [p.q, p.lang ?? '', String(p.minStars ?? ''), p.license ?? '', p.sort].join('|');
}

export function paramsToQueryParams(p: SearchParams): Record<string, string> {
  const out: Record<string, string> = {};
  if (p.q) out['q'] = p.q;
  if (p.lang) out['lang'] = p.lang;
  if (p.minStars !== null) out['stars'] = String(p.minStars);
  if (p.license) out['license'] = p.license;
  if (p.sort !== 'best') out['sort'] = p.sort;
  return out;
}

export const LANGUAGES: readonly string[] = [
  'TypeScript', 'JavaScript', 'Python', 'Go', 'Rust', 'Java', 'C#', 'C++',
  'C', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'Dart', 'Scala', 'Haskell',
  'Elixir', 'Zig', 'Lua', 'Shell', 'HTML', 'CSS', 'Vue',
];

export const LICENSES: readonly string[] = [
  'mit', 'apache-2.0', 'gpl-3.0', 'agpl-3.0', 'lgpl-3.0', 'bsd-3-clause',
  'bsd-2-clause', 'mpl-2.0', 'unlicense', 'cc0-1.0', 'isc', 'eupl-1.2',
];

export const SORT_OPTIONS: ReadonlyArray<{ value: SearchSort; label: string }> = [
  { value: 'best', label: 'Best match' },
  { value: 'stars', label: 'Most stars' },
  { value: 'forks', label: 'Most forks' },
  { value: 'updated', label: 'Recently updated' },
];
