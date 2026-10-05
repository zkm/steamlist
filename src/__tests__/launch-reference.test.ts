import { describe, it, expect } from '@jest/globals';
import { selectEntries, type LaunchEntry, type LaunchReferenceData } from '../lib/launchReference';
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
  entry({ appid: 3, name: 'Doom', notes: 'Vulkan renderer', protondb: 'silver' }),
  entry({ appid: 4, name: 'Portal', runtime: 'Proton 9.0', protondb: '—' }),
];

const names = (list: LaunchEntry[]) => list.map((e) => e.name);

describe('selectEntries', () => {
  it('sorts by name case-insensitively and reverses', () => {
    expect(names(selectEntries(rows, 'all', '', 'name', 1))).toEqual([
      'apex',
      'Doom',
      'Portal',
      'Portal 2',
    ]);
    expect(names(selectEntries(rows, 'all', '', 'name', -1))[0]).toBe('Portal 2');
  });

  it('filters by runtime and blocked status', () => {
    expect(names(selectEntries(rows, 'native', '', 'name', 1))).toEqual(['Portal 2']);
    expect(names(selectEntries(rows, 'proton', '', 'name', 1))).toEqual(['Doom', 'Portal']);
    expect(names(selectEntries(rows, 'blocked', '', 'name', 1))).toEqual(['apex']);
  });

  it('searches names and notes', () => {
    expect(names(selectEntries(rows, 'all', '  vulkan ', 'name', 1))).toEqual(['Doom']);
  });

  it('orders ProtonDB tiers best first with unrated last', () => {
    expect(names(selectEntries(rows, 'all', '', 'protondb', 1))).toEqual([
      'Portal 2',
      'Doom',
      'apex',
      'Portal',
    ]);
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
    }
  });
});
