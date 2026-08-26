import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  WritableSignal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import type { ChartDataset, ChartOptions } from 'chart.js';

import { CommitWeek, Contributor, ReleaseInfo, Repo } from '../../core/models';
import { fmtBytes, langColor, shortDate, timeAgo } from '../../core/format';
import { Offline, QuotaExceeded, RequestFailure, GitHubClient } from '../../core/github-client';
import { ScreenVariant, StateScreen } from '../../shared/state-screen';
import { WidgetBusy, WidgetFailed } from '../../shared/widget-states';

type WidgetState = 'idle' | 'busy' | 'ready' | 'failed';

interface DashboardId {
  owner: string | null;
  name: string | null;
}

@Component({
  selector: 'app-repo-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, BaseChartDirective, StateScreen, WidgetBusy, WidgetFailed],
  templateUrl: './repo-dashboard.page.html',
  styleUrl: './repo-dashboard.page.css',
})
export class RepoDashboardPage {
  private readonly route = inject(ActivatedRoute);
  private readonly gh = inject(GitHubClient);
  private readonly titleSvc = inject(Title);

  protected readonly compactTimeAgo = timeAgo;
  protected readonly shortDate = shortDate;
  protected readonly fmtBytes = fmtBytes;
  protected readonly langColor = langColor;

  protected readonly repo = signal<Repo | null>(null);
  protected readonly fatal = signal<ScreenVariant | null>(null);
  protected readonly fatalDetail = signal<string | null>(null);

  protected readonly langs = signal<[string, number][] | null>(null);
  protected readonly langsState = signal<WidgetState>('idle');

  protected readonly contribs = signal<Contributor[] | null>(null);
  protected readonly contribsState = signal<WidgetState>('idle');

  protected readonly release = signal<ReleaseInfo | null>(null);
  protected readonly releaseState = signal<WidgetState>('idle');

  protected readonly weeks = signal<CommitWeek[] | null>(null);
  protected readonly commitsState = signal<WidgetState>('idle');
  protected readonly statsComputing = computed(
    () => this.commitsState() === 'ready' && this.weeks() === null,
  );

  private readonly paramMap = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });

  private gen = 0;
  private loadedKey: string | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.gen++;
    });

    effect(() => {
      const pm = this.paramMap();
      const id: DashboardId = { owner: pm.get('owner'), name: pm.get('name') };
      if (!id.owner || !id.name || /[^a-z0-9_.-]/i.test(id.owner) || /[^a-z0-9_.-]/i.test(id.name)) {
        this.fatal.set('invalid');
        return;
      }
      const key = `${id.owner}/${id.name}`;
      if (key === this.loadedKey) return;
      this.loadedKey = key;
      void this.load(id.owner, id.name);
    });
  }

  protected retry(): void {
    if (!this.loadedKey) return;
    const [owner, name] = this.loadedKey.split('/');
    this.loadedKey = null;
    void this.load(owner, name);
  }

  protected get langLegendTotal(): number {
    const pairs = this.langs();
    return pairs ? pairs.reduce((sum, [, b]) => sum + b, 0) : 0;
  }

  protected readonly commitLabels = computed(() => {
    const weeks = this.weeks() ?? [];
    return weeks.map((w) =>
      new Date(w.week * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    );
  });

  protected readonly commitChartData = computed<{ labels: string[]; datasets: ChartDataset<'bar', number[]>[] }>(() => ({
    labels: this.commitLabels(),
    datasets: [
      {
        data: (this.weeks() ?? []).map((w) => w.total),
        label: 'Commits',
        backgroundColor: 'rgba(110, 168, 254, 0.6)',
        hoverBackgroundColor: '#9ec1ff',
        borderRadius: 3,
        borderWidth: 0,
        barPercentage: 0.9,
      },
    ],
  }));

  protected readonly commitOptions: ChartOptions<'bar'> = {
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        ticks: { color: '#6b7691', maxTicksLimit: 10, maxRotation: 0, font: { size: 10 } },
        grid: { display: false },
        border: { display: false },
      },
      y: {
        ticks: { color: '#6b7691', precision: 0, font: { size: 10 } },
        grid: { color: 'rgba(148, 163, 184, 0.08)' },
        border: { display: false },
      },
    },
  };

  protected readonly langChartData = computed<{ labels: string[]; datasets: ChartDataset<'doughnut', number[]>[] }>(() => {
    const pairs = this.langs() ?? [];
    return {
      labels: pairs.map(([name]) => name),
      datasets: [
        {
          data: pairs.map(([, bytes]) => bytes),
          backgroundColor: pairs.map(([name], i) => langColor(name, i)),
          borderColor: '#10152a',
          borderWidth: 2,
          hoverOffset: 6,
        },
      ],
    };
  });

  protected readonly langOptions: ChartOptions<'doughnut'> = {
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: '#aab3c7', boxWidth: 10, usePointStyle: true, font: { size: 11 } },
      },
    },
  };

  protected readonly maxContrib = computed(() => {
    const c = this.contribs();
    return c?.length ? Math.max(...c.map((x) => x.contributions)) : 1;
  });

  protected displayHomepage(url: string): string {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return url.replace(/^https?:\/\//, '');
    }
  }

  private langPairsFrom(raw: Record<string, number>): [string, number][] {
    const entries = Object.entries(raw).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((s, [, b]) => s + b, 0);
    if (!total) return [];
    const kept: [string, number][] = [];
    let other = 0;
    for (const entry of entries) {
      if (entry[1] / total >= 0.01) kept.push(entry);
      else other += entry[1];
    }
    if (other > 0) kept.push(['Other', other]);
    return kept.slice(0, 12);
  }

  private async load(owner: string, name: string): Promise<void> {
    const g = ++this.gen;

    this.repo.set(null);
    this.fatal.set(null);
    this.fatalDetail.set(null);
    this.langs.set(null);
    this.langsState.set('busy');
    this.contribs.set(null);
    this.contribsState.set('busy');
    this.release.set(null);
    this.releaseState.set('busy');
    this.weeks.set(null);
    this.commitsState.set('busy');

    let head: Repo;
    try {
      head = await this.gh.repository(owner, name);
    } catch (err) {
      if (g !== this.gen) return;
      this.langsState.set('failed');
      this.contribsState.set('failed');
      this.releaseState.set('failed');
      this.commitsState.set('failed');
      this.markFatal(err);
      return;
    }
    if (g !== this.gen) return;

    this.repo.set(head);
    this.titleSvc.setTitle(`${head.name} · octadash`);
    window.scrollTo({ top: 0 });

    const widgets: Promise<void>[] = [
      this.widget(g, this.langsState, () => this.gh.languages(owner, name), (d) => this.langs.set(this.langPairsFrom(d))),
      this.widget(g, this.contribsState, () => this.gh.contributors(owner, name), (d) => this.contribs.set(d)),
      this.widget(g, this.releaseState, () => this.gh.latestRelease(owner, name), (d) => this.release.set(d)),
      this.widget(g, this.commitsState, () => this.gh.commitActivity(owner, name), (d) => this.weeks.set(d)),
    ];
    await Promise.allSettled(widgets);
  }

  private async widget<T>(
    g: number,
    state: WritableSignal<WidgetState>,
    fn: () => Promise<T>,
    apply: (data: T) => void,
  ): Promise<void> {
    state.set('busy');
    try {
      const data = await fn();
      if (g !== this.gen) return;
      apply(data);
      state.set('ready');
    } catch {
      if (g !== this.gen) return;
      state.set('failed');
    }
  }

  private markFatal(err: unknown): void {
    if (err instanceof QuotaExceeded) {
      this.fatal.set('quota');
    } else if (err instanceof Offline) {
      this.fatal.set('offline');
    } else if (err instanceof RequestFailure && err.message.includes('Not found')) {
      this.fatal.set('not-found');
    } else {
      this.fatal.set('generic');
      this.fatalDetail.set(err instanceof Error ? err.message : null);
    }
  }
}
