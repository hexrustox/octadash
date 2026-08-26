import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LimitScope, RateLimits } from '../core/rate-limits';
import { mmss } from '../core/format';

export type ScreenVariant = 'not-found' | 'offline' | 'quota' | 'invalid' | 'empty' | 'generic';

const ICONS: Record<ScreenVariant, string> = {
  'not-found': 'bi bi-binoculars',
  offline: 'bi bi-wifi-off',
  quota: 'bi bi-hourglass-split',
  invalid: 'bi bi-slash-circle',
  empty: 'bi bi-magic',
  generic: 'bi bi-bug',
};

@Component({
  selector: 'app-state-screen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="state-screen text-center py-5">
      <div class="glyph mx-auto d-flex align-items-center justify-content-center mb-4">
        <i class="{{ icon }}"></i>
      </div>
      <h2 class="h4 mb-2">{{ heading() }}</h2>
      @if (detail()) {
        <p class="text-secondary mb-4">{{ detail() }}</p>
      }

      @if (variant() === 'quota') {
        <p class="text-secondary">
          Quota resets in <strong>{{ mmss(limits.secondsLeft(quotaScope())) }}</strong>.
        </p>
        <button type="button" class="btn btn-accent" [disabled]="limits.isBlocked(quotaScope())" (click)="retry.emit()">
          <i class="bi bi-arrow-clockwise me-1"></i> Try again
        </button>
      }

      @if (showTokenHint()) {
        <p class="small text-secondary mt-3">
          A personal access token raises limits to 5,000 requests/hour — add it under
          <em>Access&nbsp;token</em> in the top bar.
        </p>
      }

      <div class="mt-4">
        <a routerLink="/" class="btn btn-outline-secondary btn-sm"><i class="bi bi-house-door me-1"></i> Back to Search</a>
      </div>
    </div>
  `,
  styles: `
    .glyph {
      width: 84px;
      height: 84px;
      font-size: 2rem;
      color: #9ec1ff;
      border-radius: 50%;
      background: radial-gradient(circle at 30% 30%, rgba(79, 124, 255, .25), rgba(79, 124, 255, .06));
      border: 1px solid rgba(110, 168, 254, .25);
    }
  `,
})
export class StateScreen {
  readonly variant = input.required<ScreenVariant>();
  readonly heading = input.required<string>();
  readonly detail = input<string | null>(null);
  readonly retry = output<void>();
  readonly showTokenHint = input(false);
  readonly quotaScope = input<LimitScope>('search');

  protected readonly limits = inject(RateLimits);
  protected readonly mmss = mmss;

  protected get icon(): string {
    return ICONS[this.variant()];
  }
}
