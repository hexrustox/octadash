const COMPACT = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const BYTES = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1, style: 'unit', unit: 'byte', unitDisplay: 'narrow' });

export function fmtCompact(n: number): string {
  return COMPACT.format(n);
}

export function fmtBytes(n: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v >= 100 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
}

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diffSeconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSeconds < 60) return 'just now';
  const minutes = Math.floor(diffSeconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 31) return `${days}d ago`;
  return shortDate(iso);
}

export function shortDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function mmss(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const LANG_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#e8c75a',
  Python: '#4584b6',
  Go: '#00ADD8',
  Rust: '#dea584',
  Java: '#c07a53',
  'C++': '#f34b7d',
  C: '#8a8a8a',
  'C#': '#68bf6a',
  Ruby: '#cc5b56',
  PHP: '#8993be',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Dart: '#00B4AB',
  Shell: '#89e051',
  HTML: '#e34c26',
  CSS: '#6a9fd8',
  Vue: '#41b883',
  Scala: '#c22d40',
  Haskell: '#8f7fc7',
  Elixir: '#8e6ff7',
  Zig: '#ec915c',
  Lua: '#4f5db0',
};

const FALLBACK_PALETTE = ['#6ea8fe', '#7bd3c0', '#f2b36c', '#e08bab', '#9dd67a', '#c39bff'];

export function langColor(name: string, index = 0): string {
  return LANG_COLORS[name] ?? FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
}
