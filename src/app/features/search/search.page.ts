import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewChild,
  effect,
  inject,
  signal,
  computed,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import {
  LANGUAGES,
  LICENSES,
  SORT_OPTIONS,
  SearchSort,
  canonicalKey,
  normalizeSearchParams,
  paramsToQueryParams,
} from '../../core/search-params';
import { Repo } from '../../core/models';
import { fmtCompact } from '../../core/format';
import { Offline, QuotaExceeded, RequestFailure, GitHubClient } from '../../core/github-client';
import { RateLimits } from '../../core/rate-limits';
import { ResultsMemory } from './results-memory';
import { RateLimitBanner } from '../../shared/rate-limit-banner';
import { RepoCard } from '../../shared/repo-card';
import { ScreenVariant, StateScreen } from '../../shared/state-screen';

const PAGE_SIZE = 30;

const QUICK_STARTS: ReadonlyArray<{ label: string; q: string; lang?: string; minStars?: number }> = [
  { label: 'star-studded CLIs', q: 'cli', minStars: 5000 },
  { label: 'TypeScript heavy hitters', q: '', lang: 'TypeScript', minStars: 10000 },
  { label: 'trending Rust games', q: 'game', lang: 'Rust', minStars: 500 },
  { label: 'fresh ML research code', q: 'machine learning', lang: 'Python' },
];

@Component({
  selector: 'app-search-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RepoCard, RateLimitBanner, StateScreen],
  templateUrl: './search.page.html',
  styleUrl: './search.page.css',
})
export class SearchPage implements AfterViewInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly gh = inject(GitHubClient);
  private readonly limits = inject(RateLimits);
  private readonly memory = inject(ResultsMemory);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly languages = LANGUAGES;
  protected readonly licenses = LICENSES;
  protected readonly sorts = SORT_OPTIONS;
  protected readonly quickStarts = QUICK_STARTS;
  protected readonly pageSize = PAGE_SIZE;
  protected readonly compact = fmtCompact;

  protected readonly q = signal('');
  protected readonly lang = signal<string | null>(null);
  protected readonly stars = signal('');
  protected readonly license = signal<string | null>(null);
  protected readonly sort = signal<SearchSort>('best');

  protected readonly params = computed(() =>
    normalizeSearchParams({
      q: this.q(),
      lang: this.lang(),
      stars: this.stars(),
      license: this.license(),
      sort: this.sort(),
    }),
  );

  protected readonly repos = signal<Repo[]>([]);
  protected readonly totalCount = signal<number | null>(null);
  protected readonly loadingFirst = signal(false);
  protected readonly loadingMore = signal(false);
  protected readonly reachedEnd = signal(false);
  protected readonly failure = signal<ScreenVariant | null>(null);
  protected readonly failureDetail = signal<string | null>(null);

  private readonly page = signal(0);

  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  private gen = 0;
  private lastKey: string | null = null;
  private observer?: IntersectionObserver;

  @ViewChild('sentinel') sentinel?: ElementRef<HTMLElement>;

  constructor() {
    effect(() => {
      const qp = this.queryParams();
      const urlParams = normalizeSearchParams({
        q: qp.get('q'),
        lang: qp.get('lang'),
        stars: qp.get('stars'),
        license: qp.get('license'),
        sort: qp.get('sort'),
      });
      this.q.set(urlParams.q);
      this.lang.set(urlParams.lang);
      this.stars.set(urlParams.minStars === null ? '' : String(urlParams.minStars));
      this.license.set(urlParams.license);
      this.sort.set(urlParams.sort);

      const key = canonicalKey(urlParams);
      if (key === this.lastKey) return;
      this.lastKey = key;
      this.restoreOrLoad(key);
    });

    this.destroyRef.onDestroy(() => {
      this.observer?.disconnect();
      if (!this.lastKey) return;
      this.memory.store({
        key: this.lastKey,
        repos: this.repos(),
        totalCount: this.totalCount(),
        page: this.page(),
        reachedEnd: this.reachedEnd(),
        scrollY: window.scrollY,
      });
    });
  }

  protected canSubmit(): boolean {
    const p = this.params();
    return !!p.q || p.lang !== null || p.minStars !== null || p.license !== null;
  }

  protected apply(): void {
    if (!this.canSubmit()) return;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: paramsToQueryParams(this.params()),
    });
  }

  protected clearText(): void {
    this.q.set('');
  }

  protected quickRun(entry: (typeof QUICK_STARTS)[number]): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: paramsToQueryParams(
        normalizeSearchParams({ q: entry.q, lang: entry.lang ?? null, stars: entry.minStars !== undefined ? String(entry.minStars) : null }),
      ),
    });
  }

  protected quickTopic(topic: string): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: { q: topic } });
  }

  protected retry(): void {
    void this.loadFirst();
  }

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void this.loadMore();
      },
      { rootMargin: '700px 0px' },
    );
    if (this.sentinel?.nativeElement) this.observer.observe(this.sentinel.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  private restoreOrLoad(key: string): void {
    this.gen++;
    const snapshot = this.memory.peek(key);
    if (snapshot) {
      this.repos.set(snapshot.repos);
      this.totalCount.set(snapshot.totalCount);
      this.page.set(snapshot.page);
      this.reachedEnd.set(snapshot.reachedEnd);
      this.loadingFirst.set(false);
      this.loadingMore.set(false);
      this.failure.set(null);
      const y = snapshot.scrollY;
      requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, y)));
      return;
    }
    this.resetFeed();
    if (!this.canSubmit()) return;
    void this.loadFirst();
  }

  private resetFeed(): void {
    this.repos.set([]);
    this.totalCount.set(null);
    this.page.set(0);
    this.reachedEnd.set(false);
    this.loadingMore.set(false);
    this.failure.set(null);
    this.failureDetail.set(null);
  }

  private async loadFirst(): Promise<void> {
    const g = ++this.gen;
    this.loadingFirst.set(true);
    this.failure.set(null);
    this.failureDetail.set(null);
    window.scrollTo(0, 0);
    try {
      const res = await this.gh.searchRepositories(this.params(), 1);
      if (g !== this.gen) return;
      this.repos.set(res.repos);
      this.totalCount.set(res.totalCount);
      this.page.set(1);
      this.reachedEnd.set(res.repos.length < PAGE_SIZE);
    } catch (err) {
      if (g !== this.gen) return;
      this.markFailure(err);
    } finally {
      if (g === this.gen) this.loadingFirst.set(false);
    }
  }

  protected async loadMore(): Promise<void> {
    if (
      this.loadingFirst() ||
      this.loadingMore() ||
      this.reachedEnd() ||
      this.limits.isBlocked('search')
    ) {
      return;
    }
    const nextPage = this.page() + 1;
    if (nextPage <= 1) return;

    const g = this.gen;
    this.loadingMore.set(true);
    try {
      const res = await this.gh.searchRepositories(this.params(), nextPage);
      if (g !== this.gen) return;
      const seen = new Set(this.repos().map((r) => r.id));
      const fresh = res.repos.filter((r) => !seen.has(r.id));
      this.repos.update((list) => [...list, ...fresh]);
      this.totalCount.set(res.totalCount);
      this.page.set(nextPage);
      this.reachedEnd.set(res.repos.length < PAGE_SIZE);
    } catch (err) {
      if (g !== this.gen) return;
      this.markFailure(err);
      this.reachedEnd.set(true);
    } finally {
      if (g === this.gen) this.loadingMore.set(false);
    }
  }

  private markFailure(err: unknown): void {
    if (err instanceof QuotaExceeded) {
      this.failure.set('quota');
    } else if (err instanceof Offline) {
      this.failure.set('offline');
    } else {
      this.failure.set('generic');
      this.failureDetail.set(err instanceof RequestFailure ? err.message : 'Something went wrong.');
    }
  }
}
