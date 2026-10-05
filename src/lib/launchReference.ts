// Shared by the /launch-reference page and scripts/export-launch-reference.js, which transpiles
// this file into the exported HTML. Keep it free of imports so that works.

export type YesNo = 'Y' | 'N';
export type Status = 'Verified' | 'Unverified';
export type RuntimeKind = 'Native' | 'Proton' | 'Blocked';
export type Platform = 'win' | 'mac' | 'linux';

export interface LaunchEntry {
  appid: number;
  name: string;
  /** Steam offers a build for this OS. Linux means a native build. */
  win: YesNo;
  mac: YesNo;
  linux: YesNo;
  /** Playable on this machine (N means blocked, usually by anti-cheat). */
  works: YesNo;
  /** "Native", a Proton version, "N/A" when blocked, or "—" for rows not launched on their own. */
  runtime: string;
  /** ProtonDB summary tier, or "—" when there is none. */
  protondb: string;
  /** Full launch options string with the default settings, or "—" when the game can't run. */
  full: string;
  /** The game-specific optional flags already included in `full`. */
  opt: string;
  notes: string;
  /** Verified means tested on this setup. Missing means Unverified. */
  status?: Status;
}

/** Switches that build every launch string. `full` in the data reflects the defaults. */
export interface LaunchSettings {
  gamescope: boolean;
  /** gamescope output size, "WIDTHxHEIGHT". */
  resolution: string;
  grabCursor: boolean;
  gamemode: boolean;
  mangohud: boolean;
  optionalFlags: boolean;
}

export const DEFAULT_SETTINGS: LaunchSettings = {
  gamescope: false,
  resolution: '3840x2160',
  grabCursor: true,
  gamemode: true,
  mangohud: true,
  optionalFlags: true,
};

/** Shape of public/launch_reference.json (and the committed .sample.json). */
export interface LaunchReferenceData {
  /** One-line description of the machine the launch strings are tuned for. */
  setup: string;
  /** Starting Default Launch Parameters, over DEFAULT_SETTINGS; a viewer's saved ones win. */
  defaults?: Partial<LaunchSettings>;
  games: LaunchEntry[];
}

/** A viewer's own changes to one game, saved in their browser. */
export interface GameOverride {
  status?: Status;
  notes?: string;
  launch?: LaunchSettings & { flags: string[] };
}
export type Overrides = Record<number, GameOverride>;

export interface Filters {
  query: string;
  status: Status[];
  os: Platform[];
  runtime: RuntimeKind[];
}

export type SortKey = 'name' | 'status' | 'win' | 'mac' | 'linux' | 'runtime' | 'protondb';

export const RESOLUTIONS = [
  '3840x2160',
  '2560x1600',
  '5120x1440',
  '3440x1440',
  '2560x1440',
  '1920x1200',
  '2560x1080',
  '1920x1080',
  '1680x1050',
  '1600x900',
  '1440x900',
  '1366x768',
  '1280x800',
  '1280x720',
];

const TIER_ORDER = ['platinum', 'gold', 'silver', 'bronze', 'borked', 'pending'];
const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS) as (keyof LaunchSettings)[];

function tierRank(tier: string): number {
  const i = TIER_ORDER.indexOf(tier.toLowerCase());
  return i === -1 ? TIER_ORDER.length : i;
}

/** A `bash -c '...' --` wrapper runs before %command%; other flags go after it. */
export function isWrapper(flag: string): boolean {
  return flag.startsWith('bash ');
}

/**
 * Split a flag string into flags: "-novid +fps_max 64" -> ["-novid", "+fps_max 64"].
 * A word that doesn't start with - or + belongs to the flag before it, and a bash wrapper
 * stays whole through its closing "--".
 */
export function parseFlags(text: string): string[] {
  const out: string[] = [];
  const words = text.trim().split(/\s+/).filter(Boolean);
  for (let i = 0; i < words.length; i++) {
    if (words[i] === 'bash') {
      const end = words.indexOf('--', i);
      const stop = end === -1 ? words.length : end + 1;
      out.push(words.slice(i, stop).join(' '));
      i = stop - 1;
    } else if (/^[-+]/.test(words[i]) || !out.length) out.push(words[i]);
    else out[out.length - 1] += ` ${words[i]}`;
  }
  return out;
}

/** True when the game has a launch string at all (not blocked, not a bonus-content row). */
export function isLaunchable(entry: LaunchEntry): boolean {
  return entry.full.includes('%command%');
}

/**
 * The parts of `full` that belong to the game rather than the settings: leading environment
 * variables, anything else before %command%, and required arguments after it.
 */
export function splitLaunch(entry: LaunchEntry): { env: string; pre: string; args: string } {
  const at = entry.full.indexOf('%command%');
  if (at === -1) return { env: '', pre: '', args: '' };
  const remove = (text: string, part: string) => (part ? text.replace(part, ' ') : text);
  let before = entry.full
    .slice(0, at)
    .replace(/(^|\s)gamescope\s.*?\s--(?=\s|$)/, ' ')
    .replace(/(^|\s)(gamemoderun|mangohud)(?=\s|$)/g, ' ');
  let after = entry.full.slice(at + '%command%'.length);
  for (const flag of parseFlags(entry.opt)) {
    if (isWrapper(flag)) before = remove(before, flag);
    else after = remove(after, flag);
  }
  const env = before.match(/^\s*(?:[A-Za-z_]\w*=\S*\s+)*/)?.[0] ?? '';
  return {
    env: env.trim().replace(/\s+/g, ' '),
    pre: before.slice(env.length).trim(),
    args: after.trim().replace(/\s+/g, ' '),
  };
}

/** Build the launch string for `entry` from `settings` and the game's optional flags. */
export function buildLaunch(
  entry: LaunchEntry,
  settings: LaunchSettings,
  flags: string[] = parseFlags(entry.opt)
): string {
  if (!isLaunchable(entry)) return entry.full || '—';
  const { env, pre, args } = splitLaunch(entry);
  const [width, height] = settings.resolution.split('x');
  const extra = settings.optionalFlags ? flags : [];
  return [
    env,
    settings.gamescope &&
      `gamescope -W ${width} -H ${height} -f${settings.grabCursor ? ' --force-grab-cursor' : ''} --`,
    settings.gamemode && 'gamemoderun',
    settings.mangohud && 'mangohud',
    pre,
    ...extra.filter(isWrapper),
    '%command%',
    ...extra.filter((f) => !isWrapper(f)),
    args,
  ]
    .filter(Boolean)
    .join(' ');
}

export function runtimeKind(entry: LaunchEntry): RuntimeKind | null {
  if (entry.works === 'N') return 'Blocked';
  if (entry.runtime === 'Native') return 'Native';
  if (entry.runtime.startsWith('Proton')) return 'Proton';
  return null;
}

/** What a row shows once the viewer's settings and overrides are applied. */
export interface GameView {
  status: Status;
  notes: string;
  custom: boolean;
  settings: LaunchSettings;
  flags: string[];
  launch: string;
}

export function resolveGame(
  entry: LaunchEntry,
  settings: LaunchSettings,
  override: GameOverride = {}
): GameView {
  const custom = !!override.launch;
  const own = override.launch ? { ...settings, ...override.launch } : settings;
  const flags = override.launch ? override.launch.flags : parseFlags(entry.opt);
  return {
    status: override.status ?? entry.status ?? 'Unverified',
    notes: override.notes ?? entry.notes,
    custom,
    settings: own,
    flags,
    launch: buildLaunch(entry, own, flags),
  };
}

/** The override to save from the editor, leaving out anything that matches the defaults. */
export function makeOverride(
  entry: LaunchEntry,
  globalSettings: LaunchSettings,
  edit: {
    status: Status;
    notes: string;
    custom: boolean;
    settings: LaunchSettings;
    flags: string[];
  }
): GameOverride {
  const out: GameOverride = {};
  if (edit.status !== (entry.status ?? 'Unverified')) out.status = edit.status;
  const notes = edit.notes.trim();
  if (notes && notes !== entry.notes) out.notes = notes;
  if (edit.custom && isLaunchable(entry)) {
    const sameSettings = SETTING_KEYS.every((k) => edit.settings[k] === globalSettings[k]);
    const sameFlags = edit.flags.join('\n') === parseFlags(entry.opt).join('\n');
    if (!sameSettings || !sameFlags) {
      const picked = Object.fromEntries(SETTING_KEYS.map((k) => [k, edit.settings[k]]));
      out.launch = { ...(picked as unknown as LaunchSettings), flags: [...edit.flags] };
    }
  }
  return out;
}

const PLATFORM_NAMES: [Platform, string][] = [
  ['win', 'windows'],
  ['mac', 'mac'],
  ['linux', 'linux'],
];

export function matchesFilters(entry: LaunchEntry, view: GameView, filters: Filters): boolean {
  if (filters.status.length && !filters.status.includes(view.status)) return false;
  if (filters.os.length && !filters.os.some((k) => entry[k] === 'Y')) return false;
  const kind = runtimeKind(entry);
  if (filters.runtime.length && !(kind && filters.runtime.includes(kind))) return false;

  const q = filters.query.trim().toLowerCase();
  if (!q) return true;
  const text = `${entry.name} ${view.notes}`.toLowerCase();
  if (text.includes(q)) return true;
  // Otherwise every word must match a status, runtime or OS name, the App ID, or the text.
  const words = [
    view.status,
    kind ?? '',
    entry.runtime,
    ...PLATFORM_NAMES.filter(([k]) => entry[k] === 'Y').map(([, n]) => n),
  ].map((w) => w.toLowerCase());
  return q
    .split(/\s+/)
    .every((t) => words.includes(t) || String(entry.appid).startsWith(t) || text.includes(t));
}

export interface Row {
  entry: LaunchEntry;
  view: GameView;
}

function sortValue(row: Row, key: SortKey): string | number {
  if (key === 'status') return row.view.status;
  if (key === 'protondb') return tierRank(row.entry.protondb);
  return row.entry[key];
}

export function compareRows(a: Row, b: Row, key: SortKey): number {
  const x = sortValue(a, key);
  const y = sortValue(b, key);
  if (typeof x === 'number' && typeof y === 'number') return x - y;
  return String(x).localeCompare(String(y), undefined, { sensitivity: 'base', numeric: true });
}

export function selectRows(
  entries: LaunchEntry[],
  settings: LaunchSettings,
  overrides: Overrides,
  filters: Filters,
  sortKey: SortKey,
  direction: 1 | -1
): Row[] {
  return entries
    .map((entry) => ({ entry, view: resolveGame(entry, settings, overrides[entry.appid]) }))
    .filter((row) => matchesFilters(row.entry, row.view, filters))
    .sort((a, b) => compareRows(a, b, sortKey) * direction || compareRows(a, b, 'name'));
}

/** Format of the Backup & Restore JSON file. */
export const BACKUP_FORMAT = 'steamlist-launch-reference';

export interface Backup {
  format: typeof BACKUP_FORMAT;
  version: 1;
  exported: string;
  settings: LaunchSettings;
  games: Overrides;
}

/** Validate a restored backup, keeping only games in `entries`. Returns null if it isn't one. */
export function parseBackup(
  value: unknown,
  entries: LaunchEntry[]
): { settings: Partial<LaunchSettings>; games: Overrides } | null {
  const backup = value as Partial<Backup> | null;
  if (!backup || backup.format !== BACKUP_FORMAT || typeof backup.games !== 'object') return null;
  const known = new Set(entries.map((e) => e.appid));
  const games: Overrides = {};
  for (const [id, override] of Object.entries(backup.games ?? {})) {
    if (known.has(Number(id)) && override && typeof override === 'object') {
      games[Number(id)] = override;
    }
  }
  return { settings: backup.settings ?? {}, games };
}
