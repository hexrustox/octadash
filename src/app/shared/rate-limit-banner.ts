import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';

import { LimitScope, RateLimits } from '../core/rate-limits';
import { mmss } from '../core/format';

@Component({
  selector: 'app-rate-limit-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (limits.isBlocked(scope())) {
      <div class="alert alert-quota d-flex align-items-start gap-3" role="status">
        <i class="bi bi-hourglass-split fs-4"></i>
        <div>
          @if (scope() === 'search') {
            <strong>GitHub Search quota reached.</strong>
            Resets in <strong>{{ mmss(limits.secondsLeft('search')) }}</strong>.
            Anonymous search allows ~10 requests per minute — newer loads resume automatically.
          } @else {
            <strong>GitHub API quota reached.</strong>
            Resets in <strong>{{ mmss(limits.secondsLeft('core')) }}</strong>.
          }
          <div class="small mt-1 text-secondary">
            Bumping past these limits needs a GitHub token — add one in
            <em>Access&nbsp;token</em> up top. It stays in your browser and goes only to github.com.
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .alert-quota {
      background: rgba(242, 179, 108, .08);
      border: 1px solid rgba(242, 179, 108, .35);
      color: #f2d6b3;
      border-radius: var(--radius);
    }
  `,
})
export class RateLimitBanner {
  readonly scope = input.required<LimitScope>();
  protected readonly limits = inject(RateLimits);
  protected readonly mmss = mmss;
}
