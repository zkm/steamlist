export type YesNo = 'Y' | 'N';

export interface LaunchEntry {
  appid: number;
  name: string;
  /** Steam offers a build for this OS. Linux means a native build. */
  win: YesNo;
  mac: YesNo;
  linux: YesNo;
  /** Playable on this machine (N means blocked, usually by anti-cheat). */
  works: YesNo;
  /** "Native", a Proton version, or "N/A" when blocked. */
  runtime: string;
  /** ProtonDB summary tier, or "—" when there is none. */
  protondb: string;
  /** Full launch options string, or "—" when the game can't run. */
  full: string;
  /** The game-specific flags already included in `full`. */
  opt: string;
  notes: string;
}

/** Shape of public/launch_reference.json (and the committed .sample.json). */
export interface LaunchReferenceData {
  /** One-line description of the machine the launch strings are tuned for. */
  setup: string;
  games: LaunchEntry[];
}

export type LaunchFilter = 'all' | 'native' | 'proton' | 'blocked';
export type SortKey = 'name' | 'win' | 'mac' | 'linux' | 'works' | 'runtime' | 'protondb';

const TIER_ORDER = ['platinum', 'gold', 'silver', 'bronze', 'borked', 'pending'];

function tierRank(tier: string): number {
  const i = TIER_ORDER.indexOf(tier.toLowerCase());
  return i === -1 ? TIER_ORDER.length : i;
}

export function matchesFilter(entry: LaunchEntry, filter: LaunchFilter, query: string): boolean {
  if (filter === 'native' && entry.runtime !== 'Native') return false;
  if (filter === 'proton' && !entry.runtime.startsWith('Proton')) return false;
  if (filter === 'blocked' && entry.works !== 'N') return false;
  const q = query.trim().toLowerCase();
  return !q || `${entry.name} ${entry.notes}`.toLowerCase().includes(q);
}

export function compareEntries(a: LaunchEntry, b: LaunchEntry, key: SortKey): number {
  if (key === 'protondb') return tierRank(a.protondb) - tierRank(b.protondb);
  return String(a[key]).localeCompare(String(b[key]), undefined, {
    sensitivity: 'base',
    numeric: true,
  });
}

export function selectEntries(
  entries: LaunchEntry[],
  filter: LaunchFilter,
  query: string,
  sortKey: SortKey,
  direction: 1 | -1
): LaunchEntry[] {
  return entries
    .filter((e) => matchesFilter(e, filter, query))
    .sort((a, b) => compareEntries(a, b, sortKey) * direction || compareEntries(a, b, 'name'));
}
