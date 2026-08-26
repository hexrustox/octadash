import { Injectable, signal, DestroyRef, inject } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';

export type LimitScope = 'core' | 'search';

interface ScopeState {
  remaining: number | null;
  limit: number | null;
  resetAt: number | null;
}

const EMPTY: ScopeState = { remaining: null, limit: null, resetAt: null };

@Injectable({ providedIn: 'root' })
export class RateLimits {
  private readonly now = signal(Date.now());
  private readonly state = signal<Record<LimitScope, ScopeState>>({ core: { ...EMPTY }, search: { ...EMPTY } });
  private readonly ticker = setInterval(() => this.now.set(Date.now()), 1000);

  constructor() {
    inject(DestroyRef).onDestroy(() => clearInterval(this.ticker));
  }

  isBlocked(scope: LimitScope): boolean {
    const s = this.state()[scope];
    this.now();
    return s.remaining === 0 && s.resetAt !== null && s.resetAt > Date.now();
  }

  secondsLeft(scope: LimitScope): number {
    if (!this.isBlocked(scope)) return 0;
    const resetAt = this.state()[scope].resetAt ?? 0;
    return Math.max(0, Math.ceil((resetAt - Date.now()) / 1000));
  }

  record(scope: LimitScope, headers: HttpHeaders | null): void {
    const remaining = intHeader(headers, 'x-ratelimit-remaining');
    const limit = intHeader(headers, 'x-ratelimit-limit');
    const reset = intHeader(headers, 'x-ratelimit-reset');
    if (remaining === null || reset === null) return;
    this.state.update((s) => ({ ...s, [scope]: { remaining, limit, resetAt: reset * 1000 } }));
  }

  /** Overrides state with a conservative synthetic block when GitHub omits headers on errors. */
  forceBlock(scope: LimitScope, seconds: number): void {
    const prev = this.state()[scope];
    this.state.update((s) => ({
      ...s,
      [scope]: { ...prev, remaining: 0, resetAt: Date.now() + seconds * 1000 },
    }));
  }
}

function intHeader(headers: HttpHeaders | null, name: string): number | null {
  const raw = headers?.get(name);
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}
