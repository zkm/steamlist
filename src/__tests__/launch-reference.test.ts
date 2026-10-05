import { describe, it, expect } from '@jest/globals';
import {
  BACKUP_FORMAT,
  DEFAULT_SETTINGS,
  buildLaunch,
  makeOverride,
  parseBackup,
  parseFlags,
  resolveGame,
  selectRows,
  type Filters,
  type LaunchEntry,
  type LaunchReferenceData,
  type Row,
} from '../lib/launchReference';
import sample from '../../public/launch_reference.sample.json';

function entry(overrides: Partial<LaunchEntry>): LaunchEntry {
  return {
    appid: 1,
    name: 'Game',
    win: 'Y',
    mac: 'N',
    linux: 'N',
    works: 'Y',
    runtime: 'Proton Experimental',
    protondb: 'gold',
    full: 'gamemoderun mangohud %command%',
    opt: '',
    notes: '',
    ...overrides,
  };
}

const rows = [
  entry({ appid: 1, name: 'Portal 2', runtime: 'Native', linux: 'Y', protondb: 'platinum' }),
  entry({ appid: 2, name: 'apex', works: 'N', runtime: 'N/A', full: '—', protondb: 'borked' }),
  entry({
    appid: 3,
    name: 'Doom',
    notes: 'Vulkan renderer',
    protondb: 'silver',
    status: 'Verified',
  }),
  entry({ appid: 4, name: 'Portal', runtime: 'Proton 9.0', protondb: '—' }),
];

const none: Filters = { query: '', status: [], os: [], runtime: [] };
const names = (list: Row[]) => list.map((r) => r.entry.name);
const select = (filters: Partial<Filters>, key: Parameters<typeof selectRows>[4] = 'name') =>
  names(selectRows(rows, DEFAULT_SETTINGS, {}, { ...none, ...filters }, key, 1));

const fallout = entry({
  full: 'gamemoderun mangohud bash -c \'exec "${@/A.exe/B.exe}"\' -- %command%',
  opt: 'bash -c \'exec "${@/A.exe/B.exe}"\' --',
});
const l4d2 = entry({ full: 'gamemoderun mangohud %command% -novid -vulkan', opt: '-novid' });
const rocksmith = entry({ full: 'PIPEWIRE_LATENCY=256/48000 gamemoderun mangohud %command%' });

describe('parseFlags', () => {
  it('keeps values with their flag and bash wrappers whole', () => {
    expect(parseFlags(' -novid +fps_max 64 -w 1920 ')).toEqual([
      '-novid',
      '+fps_max 64',
      '-w 1920',
    ]);
    expect(parseFlags(fallout.opt)).toEqual([fallout.opt]);
  });
});

describe('buildLaunch', () => {
  it('rebuilds each stored string from the default settings', () => {
    for (const e of [fallout, l4d2, rocksmith, ...rows]) {
      expect(buildLaunch(e, DEFAULT_SETTINGS)).toBe(e.full);
    }
  });

  it('applies the settings around the game-specific parts', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      gamescope: true,
      mangohud: false,
      optionalFlags: false,
    };
    expect(buildLaunch(l4d2, settings)).toBe(
      'gamescope -W 3840 -H 2160 -f --force-grab-cursor -- gamemoderun %command% -vulkan'
    );
    expect(
      buildLaunch(rocksmith, { ...settings, grabCursor: false, resolution: '2560x1440' })
    ).toBe('PIPEWIRE_LATENCY=256/48000 gamescope -W 2560 -H 1440 -f -- gamemoderun %command%');
    // The Fallout launcher-skip wrapper is an optional flag, so it goes too.
    expect(buildLaunch(fallout, settings)).toBe(
      'gamescope -W 3840 -H 2160 -f --force-grab-cursor -- gamemoderun %command%'
    );
    expect(buildLaunch(fallout, { ...DEFAULT_SETTINGS, mangohud: false })).toBe(
      `gamemoderun ${fallout.opt} %command%`
    );
  });

  it('leaves games without a launch string alone', () => {
    expect(buildLaunch(rows[1], { ...DEFAULT_SETTINGS, gamescope: true })).toBe('—');
  });
});

describe('overrides', () => {
  it('saves only what differs from the defaults', () => {
    const base = {
      status: 'Unverified' as const,
      notes: '',
      custom: true,
      settings: DEFAULT_SETTINGS,
    };
    expect(makeOverride(l4d2, DEFAULT_SETTINGS, { ...base, flags: ['-novid'] })).toEqual({});
    expect(
      makeOverride(l4d2, DEFAULT_SETTINGS, {
        ...base,
        status: 'Verified',
        notes: ' Fine ',
        custom: false,
        flags: [],
      })
    ).toEqual({ status: 'Verified', notes: 'Fine' });
  });

  it('builds a custom game from its own settings and flags', () => {
    const override = makeOverride(l4d2, DEFAULT_SETTINGS, {
      status: 'Unverified',
      notes: '',
      custom: true,
      settings: { ...DEFAULT_SETTINGS, mangohud: false },
      flags: ['-novid', '+fps_max 144'],
    });
    const view = resolveGame(l4d2, DEFAULT_SETTINGS, override);
    expect(view.custom).toBe(true);
    expect(view.launch).toBe('gamemoderun %command% -novid +fps_max 144 -vulkan');
  });

  it('restores only backups from this page and only known games', () => {
    const backup = {
      format: BACKUP_FORMAT,
      settings: {},
      games: { 1: { status: 'Verified' }, 99: {} },
    };
    expect(parseBackup(backup, rows)?.games).toEqual({ 1: { status: 'Verified' } });
    expect(parseBackup({ format: 'other', games: {} }, rows)).toBeNull();
  });
});

describe('selectRows', () => {
  it('sorts by name case-insensitively and reverses', () => {
    expect(select({})).toEqual(['apex', 'Doom', 'Portal', 'Portal 2']);
    expect(names(selectRows(rows, DEFAULT_SETTINGS, {}, none, 'name', -1))[0]).toBe('Portal 2');
  });

  it('filters by any selected runtime, OS and status', () => {
    expect(select({ runtime: ['Native'] })).toEqual(['Portal 2']);
    expect(select({ runtime: ['Proton', 'Blocked'] })).toEqual(['apex', 'Doom', 'Portal']);
    expect(select({ os: ['linux'] })).toEqual(['Portal 2']);
    expect(select({ status: ['Verified'] })).toEqual(['Doom']);
  });

  it('uses overridden statuses and notes', () => {
    const list = selectRows(
      rows,
      DEFAULT_SETTINGS,
      { 4: { status: 'Verified', notes: 'tested' } },
      { ...none, status: ['Verified'], query: 'tested' },
      'name',
      1
    );
    expect(names(list)).toEqual(['Portal']);
  });

  it('searches names, notes, App IDs and keywords', () => {
    expect(select({ query: '  vulkan ' })).toEqual(['Doom']);
    expect(select({ query: '4' })).toEqual(['Portal']);
    expect(select({ query: 'native linux' })).toEqual(['Portal 2']);
  });

  it('orders ProtonDB tiers best first with unrated last', () => {
    expect(select({}, 'protondb')).toEqual(['Portal 2', 'Doom', 'apex', 'Portal']);
  });
});

describe('launch_reference.sample.json', () => {
  const entries = (sample as LaunchReferenceData).games;

  it('has one row per appid', () => {
    expect(new Set(entries.map((e) => e.appid)).size).toBe(entries.length);
  });

  it('keeps blocked games without a launch string and runnable games with %command%', () => {
    for (const e of entries) {
      // runtime "—" marks rows that aren't launched on their own (expansions, bonus content).
      if (e.works === 'N' || e.runtime === '—') expect(e.full).toBe('—');
      else expect(e.full).toContain('%command%');
      if (e.opt) expect(e.full).toContain(e.opt);
      expect(buildLaunch(e, DEFAULT_SETTINGS)).toBe(e.full);
    }
  });
});
