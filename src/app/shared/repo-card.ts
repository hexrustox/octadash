import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Repo } from '../core/models';
import { fmtCompact, langColor, timeAgo } from '../core/format';

@Component({
  selector: 'app-repo-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <article class="card repo-card h-100">
      <div class="card-body d-flex flex-column gap-2">
        <div class="d-flex align-items-center gap-2 min-w-0">
          <img class="owner-avatar rounded-circle flex-shrink-0" [src]="r().owner.avatar_url" alt="" width="28" height="28" loading="lazy" />
          <a class="repo-link text-truncate" [routerLink]="target()">{{ r().full_name }}</a>
        </div>

        @if (r().description) {
          <p class="card-text description mb-0">{{ r().description }}</p>
        }

        @if ((r().topics ?? []).length) {
          <div class="d-flex flex-wrap gap-1">
            @for (t of visibleTopics(); track t) {
              <button type="button" class="topic-chip" (click)="topicSearch.emit(t)">#{{ t }}</button>
            }
          </div>
        }

        <div class="meta d-flex flex-wrap align-items-center gap-3 mt-auto small text-secondary">
          @if (r().language) {
            <span><span class="lang-dot align-middle" [style.background]="langColor(r().language!)"></span> {{ r().language }}</span>
          }
          <span title="Stars"><i class="bi bi-star me-1"></i>{{ compact(r().stargazers_count) }}</span>
          <span title="Forks"><i class="bi bi-diagram-2 me-1"></i>{{ compact(r().forks_count) }}</span>
          <span title="Open issues"><i class="bi bi-record-circle me-1"></i>{{ compact(r().open_issues_count) }}</span>
          <span class="ms-auto text-nowrap" title="Last push">updated {{ ago(r().pushed_at) }}</span>
        </div>
      </div>
    </article>
  `,
  styles: `
    .repo-card {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--radius);
      transition: transform .15s ease, border-color .15s ease, box-shadow .15s ease;
    }
    .repo-card:hover {
      transform: translateY(-2px);
      border-color: rgba(110, 168, 254, .45);
      box-shadow: 0 10px 30px -12px rgba(79, 124, 255, .35);
    }
    .owner-avatar { width: 28px; height: 28px; }
    .repo-link { color: #cfe0ff; font-weight: 600; text-decoration: none; }
    .repo-link:hover { color: #fff; text-decoration: underline; }
    .description {
      color: var(--muted);
      font-size: .875rem;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .topic-chip {
      font-size: .72rem;
      padding: .12rem .5rem;
      border-radius: 99px;
      color: #9ec1ff;
      background: rgba(110, 168, 254, .12);
      border: 1px solid transparent;
      cursor: pointer;
    }
    .topic-chip:hover { border-color: rgba(110, 168, 254, .4); color: #cfe0ff; }
    .lang-dot { width: .7rem; height: .7rem; border-radius: 50%; display: inline-block; }
    .meta i { opacity: .75; }
  `,
})
export class RepoCard {
  readonly repo = input.required<Repo>();
  readonly topicSearch = output<string>();

  protected readonly compact = fmtCompact;
  protected readonly ago = timeAgo;
  protected readonly langColor = langColor;

  protected readonly r = () => this.repo();

  protected target(): string[] {
    const fullName = this.repo().full_name;
    const idx = fullName.indexOf('/');
    return idx <= 0 ? ['/'] : ['/repo', fullName.slice(0, idx), fullName.slice(idx + 1)];
  }

  protected visibleTopics(): string[] {
    return (this.repo().topics ?? []).slice(0, 5);
  }
}
