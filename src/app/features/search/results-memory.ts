import { Injectable } from '@angular/core';

import { Repo } from '../../core/models';

export interface FeedSnapshot {
  key: string;
  repos: Repo[];
  totalCount: number | null;
  page: number;
  reachedEnd: boolean;
  scrollY: number;
}

@Injectable({ providedIn: 'root' })
export class ResultsMemory {
  private snapshot: FeedSnapshot | null = null;

  peek(key: string): FeedSnapshot | null {
    return this.snapshot?.key === key ? this.snapshot : null;
  }

  store(snapshot: FeedSnapshot): void {
    this.snapshot = snapshot;
  }
}
