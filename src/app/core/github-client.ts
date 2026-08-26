import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { lastValueFrom } from 'rxjs';

import { TokenStore } from './token-store';
import { RateLimits } from './rate-limits';
import {
  CommitWeek, Contributor, ReleaseInfo, Repo, SearchResultPage,
} from './models';
import { qualifiersFor, SearchParams } from './search-params';

const API_BASE = 'https://api.github.com';

export class RequestFailure extends Error {}

export class NotFound extends RequestFailure {
  constructor() {
    super('Not found on GitHub.');
  }
}

export class Offline extends RequestFailure {
  constructor() {
    super('Could not reach api.github.com.');
  }
}

export class QuotaExceeded extends RequestFailure {
  constructor(readonly scope: 'core' | 'search') {
    super('GitHub rate limit exhausted.');
  }
}

export const STATS_PENDING = { statsPending: true } as const;

interface RawSearchPayload {
  total_count?: number;
  incomplete_results?: boolean;
  items?: Repo[];
}

@Injectable({ providedIn: 'root' })
export class GitHubClient {
  private readonly http = inject(HttpClient);
  private readonly limits = inject(RateLimits);
  private readonly tokens = inject(TokenStore);
  private readonly cache = new Map<string, { etag: string; body: unknown }>();

  async searchRepositories(p: SearchParams, page: number): Promise<SearchResultPage> {
    let params = new HttpParams()
      .set('q', qualifiersFor(p))
      .set('per_page', '30')
      .set('page', String(page))
      .set('order', 'desc');
    if (p.sort !== 'best') params = params.set('sort', p.sort);
    const payload = await this.request<RawSearchPayload>('/search/repositories', { scope: 'search', params });
    return {
      totalCount: payload.total_count ?? payload.items?.length ?? 0,
      incomplete: payload.incomplete_results ?? false,
      repos: Array.isArray(payload.items) ? payload.items : [],
    };
  }

  repository(owner: string, name: string): Promise<Repo> {
    return this.request<Repo>(`/repos/${enc(owner)}/${enc(name)}`, { scope: 'core' });
  }

  languages(owner: string, name: string): Promise<Record<string, number>> {
    return this.request<Record<string, number>>(`/repos/${enc(owner)}/${enc(name)}/languages`, { scope: 'core' });
  }

  async contributors(owner: string, name: string): Promise<Contributor[]> {
    const params = new HttpParams().set('per_page', '10');
    const payload = await this.request<Contributor[] | null>(`/repos/${enc(owner)}/${enc(name)}/contributors`, {
      scope: 'core',
      allowNoContent: true,
      params,
    });
    return Array.isArray(payload) ? payload : [];
  }

  async latestRelease(owner: string, name: string): Promise<ReleaseInfo | null> {
    try {
      return await this.request<ReleaseInfo>(`/repos/${enc(owner)}/${enc(name)}/releases/latest`, { scope: 'core' });
    } catch (err) {
      if (err instanceof NotFound) return null;
      throw err;
    }
  }

  /** GitHub computes stats lazily and answers `202` until ready; retries, then gives up with `null`. */
  async commitActivity(owner: string, name: string): Promise<CommitWeek[] | null> {
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const weeks = await this.request<CommitWeek[] | null>(`/repos/${enc(owner)}/${enc(name)}/stats/commit_activity`, {
          scope: 'core',
          allowNoContent: true,
        });
        return Array.isArray(weeks) ? weeks : [];
      } catch (err) {
        if (err !== STATS_PENDING) throw err;
        await sleep(1200 * (attempt + 1));
      }
    }
    return null;
  }

  private request<T>(
    path: string,
    opts: {
      scope: 'core' | 'search';
      params?: HttpParams;
      allowNoContent?: boolean;
    },
  ): Promise<T> {
    const key = path + (opts.params ? '?' + opts.params.toString() : '');
    let headers = new HttpHeaders({ Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' });
    const token = this.tokens.token();
    if (token) headers = headers.set('Authorization', `Bearer ${token}`);
    const cached = this.cache.get(key);
    if (cached) headers = headers.set('If-None-Match', cached.etag);

    return lastValueFrom(
      this.http.get<T>(API_BASE + path, { headers, params: opts.params, observe: 'response' }),
    ).then(
      (resp) => {
        this.limits.record(opts.scope, resp.headers);
        if (resp.status === 304 && cached) return cached.body as T;
        const etag = resp.headers.get('ETag');
        if (etag && resp.body != null) this.cache.set(key, { etag, body: resp.body });
        if (resp.body == null) {
          if (opts.allowNoContent || resp.status === 202) throw STATS_PENDING;
          throw new NotFound();
        }
        return resp.body;
      },
      (err: unknown) => {
        // HttpClient surfaces HTTP 304 as an HttpErrorResponse: serve the cached body instead.
        if (err instanceof HttpErrorResponse && err.status === 304 && cached) {
          this.limits.record(opts.scope, err.headers ?? null);
          return cached.body as T;
        }
        throw this.asFailure(err, opts.scope);
      },
    );
  }

  private asFailure(err: unknown, scope: 'core' | 'search'): RequestFailure | typeof STATS_PENDING {
    if (err === STATS_PENDING) return STATS_PENDING;
    if (!(err instanceof HttpErrorResponse)) {
      return new RequestFailure(err instanceof Error ? err.message : String(err));
    }
    this.limits.record(scope, err.headers ?? null);
    const remaining = err.headers?.get('x-ratelimit-remaining');
    if (err.status === 429 || (err.status === 403 && remaining === '0')) {
      if (!err.headers?.get('x-ratelimit-reset')) this.limits.forceBlock(scope, 60);
      return new QuotaExceeded(scope);
    }
    if (err.status === 404) return new NotFound();
    if (err.status === 0) return new Offline();
    const apiMessage =
      typeof err.error === 'object' && err.error !== null && 'message' in err.error
        ? String((err.error as { message: unknown }).message)
        : `GitHub responded ${err.status}.`;
    return new RequestFailure(apiMessage);
  }
}

function enc(part: string): string {
  return encodeURIComponent(part);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
