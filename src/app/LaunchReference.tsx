'use client';
import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  selectEntries,
  type LaunchEntry,
  type LaunchReferenceData,
  type LaunchFilter,
  type SortKey,
} from '../lib/launchReference';

const FILTERS: { key: LaunchFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'native', label: 'Native' },
  { key: 'proton', label: 'Proton' },
  { key: 'blocked', label: 'Blocked' },
];

const COLUMNS: { key?: SortKey; label: string }[] = [
  { key: 'name', label: 'Game' },
  { key: 'win', label: 'Windows' },
  { key: 'mac', label: 'Mac' },
  { key: 'linux', label: 'Linux' },
  { key: 'works', label: 'Works on Linux' },
  { key: 'runtime', label: 'Runtime' },
  { key: 'protondb', label: 'ProtonDB' },
  { label: 'Launch options (full)' },
  { label: 'Optional flags' },
  { label: 'Notes' },
];

const TIER_COLORS: Record<string, string> = {
  platinum: '#b4c7dc',
  gold: '#cfb53b',
  silver: '#a6a6a6',
  bronze: '#cd7f32',
  borked: '#ff4d4f',
};

const cell: CSSProperties = {
  padding: '0.6rem',
  borderBottom: '1px solid #2a2d33',
  verticalAlign: 'top',
};

const code: CSSProperties = {
  flex: 1,
  display: 'block',
  fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
  fontSize: '0.8rem',
  background: '#101114',
  color: '#c7d5e0',
  padding: '0.35rem 0.5rem',
  borderRadius: 5,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
};

function pill(active: boolean): CSSProperties {
  return {
    padding: '0.35rem 0.9rem',
    borderRadius: 16,
    border: active ? '1px solid #5491cf' : '1px solid #3a3d40',
    background: active
      ? 'linear-gradient(to bottom, #232424 5%, #141414 95%)'
      : 'linear-gradient(to bottom, #1f2022 5%, #141414 95%)',
    color: active ? '#c7d5e0' : '#8f98a0',
    fontWeight: 500,
    fontSize: '0.82rem',
    cursor: 'pointer',
  };
}

function YesNoBadge({ value }: { value: string }) {
  const color = value === 'Y' ? '#7bbf6a' : value === 'N' ? '#ff7b7f' : '#8f98a0';
  const background = value === 'Y' ? '#1d3320' : value === 'N' ? '#3a1c1e' : 'transparent';
  return (
    <span
      style={{
        display: 'inline-block',
        minWidth: '1.8rem',
        padding: '0.1rem 0.4rem',
        borderRadius: 5,
        fontWeight: 700,
        textAlign: 'center',
        color,
        background,
      }}
    >
      {value}
    </span>
  );
}

function CopyCommand({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  if (!value || value === '—') return <span style={{ color: '#6b6b6b' }}>—</span>;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // Clipboard needs a secure context; the text stays selectable either way.
    }
  };

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <code style={code}>{value}</code>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy ${value}`}
        style={{
          ...pill(copied),
          padding: '0.25rem 0.6rem',
          fontSize: '0.75rem',
          whiteSpace: 'nowrap',
          color: copied ? '#7bbf6a' : '#5491cf',
        }}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

export default function LaunchReference() {
  const [filter, setFilter] = useState<LaunchFilter>('all');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [direction, setDirection] = useState<1 | -1>(1);
  const [data, setData] = useState<LaunchReferenceData | null>(null);
  const [isSample, setIsSample] = useState(false);
  const [error, setError] = useState('');

  // Your own rows live in the gitignored public/launch_reference.json; fall back to the sample.
  useEffect(() => {
    const load = (url: string) =>
      fetch(url).then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<LaunchReferenceData>;
      });
    load('/launch_reference.json')
      .catch(() => {
        setIsSample(true);
        return load('/launch_reference.sample.json');
      })
      .then(setData)
      .catch(() => setError('Failed to load the launch reference.'));
  }, []);

  const entries: LaunchEntry[] = useMemo(() => data?.games ?? [], [data]);
  const rows = useMemo(
    () => selectEntries(entries, filter, search, sortKey, direction),
    [entries, filter, search, sortKey, direction]
  );

  const sortBy = (key: SortKey) => {
    if (key === sortKey) setDirection((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(key);
      setDirection(1);
    }
  };

  if (error) return <p style={{ color: 'red' }}>{error}</p>;
  if (!data)
    return (
      <p role="status" aria-live="polite" style={{ textAlign: 'center', margin: '2rem' }}>
        Loading launch reference...
      </p>
    );

  return (
    <section aria-labelledby="launch-heading" style={{ width: '100%' }}>
      <h2 id="launch-heading" style={{ fontSize: '1.4rem', marginBottom: 8, padding: '0 16px' }}>
        Linux Launch Reference
      </h2>
      <p style={{ color: '#8f98a0', maxWidth: '75ch', marginBottom: 20, padding: '0 16px' }}>
        {data.setup}
      </p>
      {isSample && (
        <p style={{ color: '#cfb53b', maxWidth: '75ch', marginBottom: 20, padding: '0 16px' }}>
          Showing sample data. Run{' '}
          <code style={{ ...code, display: 'inline' }}>yarn steam:launch</code> to draft rows for
          your own library.
        </p>
      )}

      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 3,
          background: '#18181b',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          padding: '0.75rem 16px',
          borderBottom: '1px solid #2a2d33',
        }}
      >
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search games or notes"
          aria-label="Search games or notes"
          style={{
            flex: '1 1 16rem',
            maxWidth: 400,
            padding: '0.55rem 1rem',
            borderRadius: 24,
            border: 'none',
            background: 'linear-gradient(90deg, #23232a 60%, #2c2c38 100%)',
            color: '#fff',
            fontSize: '1rem',
          }}
        />
        <div role="group" aria-label="Filter" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
              style={pill(filter === f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span aria-live="polite" style={{ marginLeft: 'auto', color: '#8f98a0', fontSize: 14 }}>
          {rows.length} of {entries.length} games
        </span>
      </div>

      <div style={{ overflowX: 'auto', padding: '0 16px' }}>
        <table
          style={{
            borderCollapse: 'collapse',
            width: '100%',
            minWidth: '80rem',
            fontSize: '0.9rem',
            textAlign: 'left',
          }}
        >
          <thead>
            <tr>
              {COLUMNS.map((c) => (
                <th
                  key={c.label}
                  scope="col"
                  aria-sort={
                    c.key && c.key === sortKey
                      ? direction === 1
                        ? 'ascending'
                        : 'descending'
                      : undefined
                  }
                  style={{
                    ...cell,
                    borderBottom: '2px solid #5491cf',
                    whiteSpace: 'nowrap',
                    color: '#c7d5e0',
                  }}
                >
                  {c.key ? (
                    <button
                      type="button"
                      onClick={() => sortBy(c.key as SortKey)}
                      style={{
                        all: 'unset',
                        cursor: 'pointer',
                        fontWeight: 700,
                      }}
                    >
                      {c.label}
                      {c.key === sortKey ? (direction === 1 ? ' ▲' : ' ▼') : ''}
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.appid} style={{ background: i % 2 ? '#1c1d21' : 'transparent' }}>
                <td style={{ ...cell, fontWeight: 600, minWidth: '12rem' }}>
                  <a
                    href={`https://store.steampowered.com/app/${r.appid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#fff' }}
                  >
                    {r.name}
                  </a>
                  <small style={{ display: 'block', fontWeight: 400, color: '#7b7b7c' }}>
                    App {r.appid}
                  </small>
                </td>
                <td style={{ ...cell, textAlign: 'center' }}>
                  <YesNoBadge value={r.win} />
                </td>
                <td style={{ ...cell, textAlign: 'center' }}>
                  <YesNoBadge value={r.mac} />
                </td>
                <td style={{ ...cell, textAlign: 'center' }}>
                  <YesNoBadge value={r.linux} />
                </td>
                <td style={{ ...cell, textAlign: 'center' }}>
                  <YesNoBadge value={r.works} />
                </td>
                <td style={{ ...cell, whiteSpace: 'nowrap' }}>{r.runtime}</td>
                <td
                  style={{
                    ...cell,
                    textTransform: 'capitalize',
                    color: TIER_COLORS[r.protondb] ?? '#8f98a0',
                  }}
                >
                  <a
                    href={`https://www.protondb.com/app/${r.appid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {r.protondb}
                  </a>
                </td>
                <td style={{ ...cell, minWidth: '22rem' }}>
                  <CopyCommand value={r.full} />
                </td>
                <td style={{ ...cell, minWidth: '10rem' }}>
                  <CopyCommand value={r.opt} />
                </td>
                <td style={{ ...cell, minWidth: '22rem', maxWidth: '36rem', color: '#c7d5e0' }}>
                  {r.notes}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p role="status" style={{ textAlign: 'center', marginTop: 32 }}>
            No games found.
          </p>
        )}
      </div>

      <div
        style={{
          color: '#8f98a0',
          fontSize: '0.9rem',
          maxWidth: '75ch',
          padding: '1.5rem 16px 0',
          display: 'grid',
          gap: 8,
        }}
      >
        <p>
          Windows, Mac and Linux show whether Steam offers a build for that system; Linux means a
          native build. ProtonDB is the community rating and links to the reports.
        </p>
        <p>
          On KDE Plasma with fractional scaling, set System Settings → Display → Legacy Applications
          to “Apply scaling themselves” so XWayland games render at full native resolution without
          gamescope. For native-build games set to Proton, force it in Steam under Properties →
          Compatibility.
        </p>
        <p>
          Optional flags are already part of the full string. They skip intros and launchers and do
          nothing if a launcher is already disabled. Run{' '}
          <code style={{ ...code, display: 'inline' }}>yarn steam:launch</code> after buying games
          to add draft rows for them to public/launch_reference.json.
        </p>
      </div>
    </section>
  );
}
