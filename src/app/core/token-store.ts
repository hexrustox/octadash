import { Injectable, signal, computed, DestroyRef, inject } from '@angular/core';

const STORAGE_KEY = 'octadash.github-token';

@Injectable({ providedIn: 'root' })
export class TokenStore {
  readonly token = signal<string | null>(readFromStorage());
  readonly hasToken = computed(() => !!this.token());

  set(value: string | null): void {
    const trimmed = value?.trim() ? value.trim() : null;
    try {
      if (trimmed) window.localStorage.setItem(STORAGE_KEY, trimmed);
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage unavailable */
    }
    this.token.set(trimmed);
  }
}

function readFromStorage(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
