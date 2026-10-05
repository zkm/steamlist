'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import {
  BACKUP_FORMAT,
  DEFAULT_SETTINGS,
  RESOLUTIONS,
  isLaunchable,
  makeOverride,
  parseBackup,
  parseFlags,
  resolveGame,
  runtimeKind,
  selectRows,
  type Backup,
  type Filters,
  type GameOverride,
  type LaunchEntry,
  type LaunchReferenceData,
  type LaunchSettings,
  type Overrides,
  type Platform,
  type RuntimeKind,
  type SortKey,
  type Status,
} from '../lib/launchReference';

// Settings, statuses and notes the viewer changes are kept in this browser only.
const STORAGE_KEY = 'steamlist:launch-reference';

interface Saved {
  settings?: Partial<LaunchSettings>;
  games?: Overrides;
}

function readSaved(): Saved {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') ?? {};
  } catch {
    return {};
  }
}

function writeSaved(saved: Saved): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    return true;
  } catch {
    return false;
  }
}

const COLUMNS: { key?: SortKey; label: string }[] = [
  { key: 'name', label: 'Game' },
  { key: 'status', label: 'Status' },
  { key: 'win', label: 'Windows' },
  { key: 'mac', label: 'Mac' },
  { key: 'linux', label: 'Linux' },
  { key: 'runtime', label: 'Linux Runtime' },
  { key: 'protondb', label: 'ProtonDB' },
  { label: 'Launch Options (Full)' },
  { label: 'Optional Flags' },
  { label: 'Notes' },
  { label: 'Edit' },
];

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: 'Verified', label: 'Verified' },
  { value: 'Unverified', label: 'Unverified' },
];
const OS_OPTIONS: { value: Platform; label: string }[] = [
  { value: 'win', label: 'Windows' },
  { value: 'mac', label: 'Mac' },
  { value: 'linux', label: 'Linux' },
];
const RUNTIME_OPTIONS: { value: RuntimeKind; label: string }[] = [
  { value: 'Native', label: 'Native' },
  { value: 'Proton', label: 'Proton' },
  { value: 'Blocked', label: 'Blocked' },
];

const TIER_COLORS: Record<string, string> = {
  platinum: '#b4c7dc',
  gold: '#cfb53b',
  silver: '#a6a6a6',
  bronze: '#cd7f32',
  borked: '#ff4d4f',
};

const CHIP_COLORS: Record<string, [string, string]> = {
  Native: ['#7bbf6a', '#1d3320'],
  Proton: ['#8fb8e6', '#1c2a3d'],
  Blocked: ['#ff7b7f', '#3a1c1e'],
  Verified: ['#7bbf6a', '#1d3320'],
  Unverified: ['#8f98a0', '#26282d'],
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
  overflowWrap: 'break-word',
};

const muted: CSSProperties = { color: '#8f98a0', fontSize: '0.85rem', margin: 0 };

const field: CSSProperties = {
  font: 'inherit',
  fontSize: '0.9rem',
  color: '#c7d5e0',
  background: '#101114',
  border: '1px solid #3a3d40',
  borderRadius: 6,
  padding: '0.4rem 0.5rem',
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

function Chip({ label, kind = label }: { label: string; kind?: string }) {
  const [color, background] = CHIP_COLORS[kind] ?? ['#c7d5e0', '#26282d'];
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0.1rem 0.5rem',
        borderRadius: 5,
        fontWeight: 700,
        fontSize: '0.8rem',
        whiteSpace: 'nowrap',
        color,
        background,
      }}
    >
      {label}
    </span>
  );
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

function MultiSelect<T extends string>({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  selected: T[];
  onChange: (next: T[]) => void;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current?.open && !ref.current.contains(e.target as Node)) ref.current.open = false;
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);
  const summary = options
    .filter((o) => selected.includes(o.value))
    .map((o) => o.label)
    .join(', ');

  return (
    <details ref={ref} style={{ position: 'relative' }}>
      <summary style={{ ...pill(selected.length > 0), listStyle: 'none' }}>
        {label}: <span style={{ color: '#c7d5e0' }}>{summary || 'All'}</span> ▾
      </summary>
      <div
        role="group"
        aria-label={label}
        style={{
          position: 'absolute',
          zIndex: 5,
          top: 'calc(100% + 4px)',
          left: 0,
          minWidth: '11rem',
          display: 'grid',
          gap: 2,
          padding: 6,
          background: '#1f2022',
          border: '1px solid #3a3d40',
          borderRadius: 8,
          boxShadow: '0 6px 18px rgb(0 0 0 / 0.4)',
        }}
      >
        {options.map((o) => (
          <label
            key={o.value}
            style={{ display: 'flex', gap: 8, padding: '0.3rem 0.4rem', cursor: 'pointer' }}
          >
            <input
              type="checkbox"
              checked={selected.includes(o.value)}
              onChange={(e) =>
                onChange(
                  e.target.checked ? [...selected, o.value] : selected.filter((v) => v !== o.value)
                )
              }
            />
            {o.label}
          </label>
        ))}
      </div>
    </details>
  );
}

function Dialog({
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      style={{
        width: 'min(42rem, calc(100vw - 2rem))',
        maxHeight: 'calc(100dvh - 2rem)',
        padding: 0,
        border: '1px solid #3a3d40',
        borderRadius: 10,
        background: '#18181b',
        color: '#c7d5e0',
      }}
    >
      <div style={{ padding: '1rem 1.25rem 0.6rem', borderBottom: '1px solid #2a2d33' }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>{title}</h3>
        {subtitle && <p style={{ ...muted, marginTop: 4 }}>{subtitle}</p>}
      </div>
      <div style={{ padding: '1rem 1.25rem', display: 'grid', gap: 16 }}>{children}</div>
      <div
        style={{
          display: 'flex',
          gap: 8,
          justifyContent: 'flex-end',
          padding: '0.75rem 1.25rem',
          borderTop: '1px solid #2a2d33',
        }}
      >
        {footer}
      </div>
    </dialog>
  );
}

function Toggle({
  label,
  description,
  checked,
  disabled,
  onChange,
  children,
}: {
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  children?: ReactNode;
}) {
  return (
    <div style={{ display: 'grid', gap: 4, opacity: disabled ? 0.5 : 1 }}>
      <label style={{ display: 'flex', gap: 8, fontWeight: 700, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        {label}
      </label>
      {description && <p style={{ ...muted, maxWidth: '44ch' }}>{description}</p>}
      {children}
    </div>
  );
}

function SettingsFields({
  value,
  onChange,
  disabled,
}: {
  value: LaunchSettings;
  onChange: (next: LaunchSettings) => void;
  disabled?: boolean;
}) {
  const set = <K extends keyof LaunchSettings>(key: K, v: LaunchSettings[K]) =>
    onChange({ ...value, [key]: v });
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(15rem, 1fr))',
        gap: '1rem 1.5rem',
      }}
    >
      <Toggle
        label="Use Gamescope"
        description="Runs the game in a gamescope window at a fixed size. Needed for sharp games under GNOME fractional scaling; on KDE, the Legacy Applications setting below does the same job."
        checked={value.gamescope}
        disabled={disabled}
        onChange={(v) => set('gamescope', v)}
      >
        <label style={{ ...muted, display: 'grid', gap: 4, marginTop: 4 }}>
          Output resolution
          <select
            value={value.resolution}
            disabled={disabled || !value.gamescope}
            onChange={(e) => set('resolution', e.target.value)}
            style={{ ...field, maxWidth: '14rem' }}
          >
            {RESOLUTIONS.map((r) => (
              <option key={r} value={r}>
                {r.replace('x', ' × ')}
              </option>
            ))}
          </select>
        </label>
        <label style={{ ...muted, display: 'flex', gap: 8, marginTop: 4 }}>
          <input
            type="checkbox"
            checked={value.grabCursor}
            disabled={disabled || !value.gamescope}
            onChange={(e) => set('grabCursor', e.target.checked)}
          />
          Force cursor grab
        </label>
      </Toggle>
      <Toggle
        label="Use GameMode"
        description="Runs games through gamemoderun for CPU governor and priority tweaks."
        checked={value.gamemode}
        disabled={disabled}
        onChange={(v) => set('gamemode', v)}
      />
      <Toggle
        label="Use MangoHud"
        description="Performance overlay: FPS, frame times, CPU/GPU load and temperatures."
        checked={value.mangohud}
        disabled={disabled}
        onChange={(v) => set('mangohud', v)}
      />
      <Toggle
        label="Include Optional Flags"
        description="Adds each game's optional flags (intro and launcher skips, game tweaks) to its launch string."
        checked={value.optionalFlags}
        disabled={disabled}
        onChange={(v) => set('optionalFlags', v)}
      />
    </div>
  );
}

function GameEditor({
  entry,
  settings,
  override,
  onSave,
  onClose,
}: {
  entry: LaunchEntry;
  settings: LaunchSettings;
  override: GameOverride | undefined;
  onSave: (next: GameOverride) => void;
  onClose: () => void;
}) {
  const view = resolveGame(entry, settings, override);
  const [status, setStatus] = useState<Status>(view.status);
  const [custom, setCustom] = useState(view.custom);
  const [own, setOwn] = useState<LaunchSettings>(view.settings);
  const [flags, setFlags] = useState<string[]>(view.flags);
  const [flagInput, setFlagInput] = useState('');
  const [notes, setNotes] = useState(view.notes);
  const launchable = isLaunchable(entry);
  const flagsOn = custom && own.optionalFlags;

  const preview = custom
    ? resolveGame(entry, settings, { launch: { ...own, flags } }).launch
    : resolveGame(entry, settings).launch;

  const addFlags = () => {
    const added = parseFlags(flagInput).filter((f) => !flags.includes(f));
    if (added.length) setFlags([...flags, ...added]);
    setFlagInput('');
  };

  const button: CSSProperties = { ...pill(false), color: '#c7d5e0' };
  return (
    <Dialog
      title={entry.name}
      subtitle={`App ID: ${entry.appid} · ${entry.runtime}`}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            style={{ ...button, marginRight: 'auto' }}
            onClick={() => onSave({})}
          >
            Reset to defaults
          </button>
          <button type="button" style={button} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            style={{ ...pill(true), color: '#fff', background: '#2f5d8a' }}
            onClick={() =>
              onSave(makeOverride(entry, settings, { status, notes, custom, settings: own, flags }))
            }
          >
            Save
          </button>
        </>
      }
    >
      <label style={{ display: 'grid', gap: 4, fontWeight: 700 }}>
        Status
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as Status)}
          style={{ ...field, maxWidth: '12rem' }}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value}>{o.value}</option>
          ))}
        </select>
      </label>

      {launchable && (
        <>
          <Toggle
            label="Use custom launch settings for this game"
            checked={custom}
            onChange={setCustom}
          />
          <fieldset
            disabled={!custom}
            style={{ border: '1px solid #2a2d33', borderRadius: 8, padding: '0.75rem 1rem' }}
          >
            <legend style={muted}>Launch settings</legend>
            <SettingsFields value={own} onChange={setOwn} disabled={!custom} />
            <div style={{ display: 'grid', gap: 6, marginTop: 14, opacity: flagsOn ? 1 : 0.5 }}>
              <span style={{ fontWeight: 700 }}>Optional flags</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={flagInput}
                  disabled={!flagsOn}
                  spellCheck={false}
                  placeholder="Add flags, e.g. -dx11 +fps_max 64"
                  aria-label="Add optional flags"
                  onChange={(e) => setFlagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addFlags();
                    }
                  }}
                  style={{ ...field, flex: 1, fontFamily: code.fontFamily }}
                />
                <button type="button" disabled={!flagsOn} onClick={addFlags} style={button}>
                  Add
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }} aria-live="polite">
                {flags.map((f) => (
                  <span
                    key={f}
                    style={{
                      ...code,
                      flex: 'none',
                      display: 'inline-flex',
                      gap: 6,
                      alignItems: 'center',
                    }}
                  >
                    {f}
                    <button
                      type="button"
                      disabled={!flagsOn}
                      aria-label={`Remove ${f}`}
                      onClick={() => setFlags(flags.filter((x) => x !== f))}
                      style={{ all: 'unset', cursor: 'pointer', color: '#ff7b7f' }}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </fieldset>
          <div style={{ display: 'grid', gap: 4 }}>
            <span style={{ fontWeight: 700 }}>Launch Options (Full)</span>
            <code style={code}>{preview}</code>
          </div>
        </>
      )}

      <label style={{ display: 'grid', gap: 4, fontWeight: 700 }}>
        Notes
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          style={{ ...field, fontWeight: 400, resize: 'vertical' }}
        />
        <span style={{ ...muted, fontWeight: 400 }}>
          Clear it and save to go back to the note from launch_reference.json.
        </span>
      </label>
    </Dialog>
  );
}

function BackupDialog({
  entries,
  saved,
  onRestore,
  onClose,
}: {
  entries: LaunchEntry[];
  saved: { settings: LaunchSettings; games: Overrides };
  onRestore: (restored: { settings: Partial<LaunchSettings>; games: Overrides }) => void;
  onClose: () => void;
}) {
  const [message, setMessage] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const exportJson = () => {
    const backup: Backup = {
      format: BACKUP_FORMAT,
      version: 1,
      exported: new Date().toISOString(),
      ...saved,
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'steam-launch-settings.json';
    a.click();
    URL.revokeObjectURL(url);
    setMessage('Export ready.');
  };

  const importJson = async (file: File | undefined) => {
    if (!file) return;
    try {
      const restored = parseBackup(JSON.parse(await file.text()), entries);
      if (!restored) throw new Error('format');
      onRestore(restored);
      setMessage('Restored.');
    } catch {
      setMessage("That file isn't a backup from this page.");
    }
  };

  const button: CSSProperties = { ...pill(false), color: '#c7d5e0' };
  return (
    <Dialog
      title="Backup & Restore"
      subtitle="Save your settings, notes and statuses to a JSON file, or restore them from one."
      onClose={onClose}
      footer={
        <button type="button" style={button} onClick={onClose}>
          Done
        </button>
      }
    >
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" style={button} onClick={exportJson}>
          Export JSON
        </button>
        <button type="button" style={button} onClick={() => fileRef.current?.click()}>
          Import JSON
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            importJson(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
      <p style={muted}>Importing replaces your current settings, notes and statuses.</p>
      {message && (
        <p role="status" style={{ ...muted, color: '#c7d5e0' }}>
          {message}
        </p>
      )}
    </Dialog>
  );
}

export default function LaunchReference() {
  const [filters, setFilters] = useState<Filters>({ query: '', status: [], os: [], runtime: [] });
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [direction, setDirection] = useState<1 | -1>(1);
  const [data, setData] = useState<LaunchReferenceData | null>(null);
  const [isSample, setIsSample] = useState(false);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState<LaunchSettings>(DEFAULT_SETTINGS);
  const [overrides, setOverrides] = useState<Overrides>({});
  const [canSave, setCanSave] = useState(true);
  const [dialog, setDialog] = useState<'defaults' | 'backup' | number | null>(null);

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
      .then((loaded) => {
        const saved = readSaved();
        setSettings({ ...DEFAULT_SETTINGS, ...loaded.defaults, ...saved.settings });
        setOverrides(saved.games ?? {});
        setData(loaded);
      })
      .catch(() => setError('Failed to load the launch reference.'));
  }, []);

  const save = (nextSettings: LaunchSettings, nextOverrides: Overrides) => {
    setSettings(nextSettings);
    setOverrides(nextOverrides);
    setCanSave(writeSaved({ settings: nextSettings, games: nextOverrides }));
  };

  const entries: LaunchEntry[] = useMemo(() => data?.games ?? [], [data]);
  const rows = useMemo(
    () => selectRows(entries, settings, overrides, filters, sortKey, direction),
    [entries, settings, overrides, filters, sortKey, direction]
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

  const editing = typeof dialog === 'number' ? entries.find((e) => e.appid === dialog) : undefined;
  const actionButton: CSSProperties = { ...pill(false), color: '#c7d5e0', fontSize: '0.9rem' };

  return (
    <section aria-labelledby="launch-heading" style={{ width: '100%' }}>
      <h2 id="launch-heading" style={{ fontSize: '1.4rem', marginBottom: 8, padding: '0 16px' }}>
        Linux Launch Reference
      </h2>
      <div
        style={{ color: '#8f98a0', maxWidth: '75ch', padding: '0 16px', display: 'grid', gap: 8 }}
      >
        <p>{data.setup}</p>
        <p>
          Each launch string is built from your Default Launch Parameters. Copy it into the
          game&apos;s Properties → General → Launch Options in Steam. Use Edit to give a game its
          own settings, notes and status; Verified games have been tested on this setup.
        </p>
      </div>
      {isSample && (
        <p style={{ color: '#cfb53b', maxWidth: '75ch', marginTop: 8, padding: '0 16px' }}>
          Showing sample data. Run{' '}
          <code style={{ ...code, display: 'inline' }}>yarn steam:launch</code> to draft rows for
          your own library.
        </p>
      )}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          alignItems: 'center',
          padding: '16px',
        }}
      >
        <button type="button" style={actionButton} onClick={() => setDialog('defaults')}>
          Default Launch Parameters
        </button>
        <button type="button" style={actionButton} onClick={() => setDialog('backup')}>
          Backup &amp; Restore
        </button>
        {!canSave && (
          <span role="status" style={{ color: '#cfb53b', fontSize: 14 }}>
            This browser isn&apos;t saving changes; they last until you close the page.
          </span>
        )}
      </div>

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
          value={filters.query}
          onChange={(e) => setFilters({ ...filters, query: e.target.value })}
          placeholder="Search name, App ID, notes, status, OS or runtime"
          aria-label="Search by name, App ID, notes, status, OS or runtime"
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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <MultiSelect
            label="Status"
            options={STATUS_OPTIONS}
            selected={filters.status}
            onChange={(status) => setFilters({ ...filters, status })}
          />
          <MultiSelect
            label="OS"
            options={OS_OPTIONS}
            selected={filters.os}
            onChange={(os) => setFilters({ ...filters, os })}
          />
          <MultiSelect
            label="Linux Runtime"
            options={RUNTIME_OPTIONS}
            selected={filters.runtime}
            onChange={(runtime) => setFilters({ ...filters, runtime })}
          />
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
                  ) : c.label === 'Edit' ? (
                    <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}>
                      Edit
                    </span>
                  ) : (
                    c.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ entry: r, view }, i) => {
              const kind = runtimeKind(r);
              return (
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
                    {view.custom && (
                      <span
                        style={{
                          marginLeft: 6,
                          padding: '0 0.35rem',
                          borderRadius: 4,
                          fontSize: '0.72rem',
                          color: '#8fb8e6',
                          background: '#1c2a3d',
                        }}
                      >
                        Custom
                      </span>
                    )}
                    <small style={{ display: 'block', fontWeight: 400, color: '#7b7b7c' }}>
                      App ID: {r.appid}
                    </small>
                  </td>
                  <td style={cell}>
                    <Chip label={view.status} />
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
                  <td style={cell}>
                    {kind ? (
                      <Chip label={kind === 'Proton' ? r.runtime : kind} kind={kind} />
                    ) : (
                      <span style={{ color: '#6b6b6b' }}>{r.runtime}</span>
                    )}
                    {kind === 'Proton' && r.linux === 'Y' && (
                      <small style={{ display: 'block', color: '#cfb53b', marginTop: 4 }}>
                        Force Proton
                      </small>
                    )}
                  </td>
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
                    <CopyCommand value={view.launch} />
                  </td>
                  <td style={{ ...cell, minWidth: '10rem' }}>
                    <CopyCommand value={isLaunchable(r) ? view.flags.join(' ') : ''} />
                  </td>
                  <td style={{ ...cell, minWidth: '22rem', maxWidth: '36rem', color: '#c7d5e0' }}>
                    {view.notes}
                  </td>
                  <td style={cell}>
                    <button
                      type="button"
                      aria-label={`Edit ${r.name}`}
                      onClick={() => setDialog(r.appid)}
                      style={{
                        ...pill(false),
                        padding: '0.25rem 0.6rem',
                        fontSize: '0.75rem',
                        color: '#5491cf',
                      }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })}
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
          gamescope. Games marked “Force Proton” have a native build but run better through Proton;
          force it in Steam under Properties → Compatibility.
        </p>
        <p>
          A game marked “Custom” uses its own settings from Edit. Your settings, notes and statuses
          are saved in this browser only; use Backup &amp; Restore to move them. Run{' '}
          <code style={{ ...code, display: 'inline' }}>yarn steam:launch</code> after buying games
          to add draft rows for them to public/launch_reference.json.
        </p>
      </div>

      {dialog === 'defaults' && (
        <Dialog
          title="Default Launch Parameters"
          subtitle="Used by every game without its own settings."
          onClose={() => setDialog(null)}
          footer={
            <button
              type="button"
              style={{ ...pill(true), color: '#fff', background: '#2f5d8a' }}
              onClick={() => setDialog(null)}
            >
              Done
            </button>
          }
        >
          <SettingsFields value={settings} onChange={(next) => save(next, overrides)} />
        </Dialog>
      )}
      {dialog === 'backup' && (
        <BackupDialog
          entries={entries}
          saved={{ settings, games: overrides }}
          onRestore={(restored) =>
            save({ ...DEFAULT_SETTINGS, ...data.defaults, ...restored.settings }, restored.games)
          }
          onClose={() => setDialog(null)}
        />
      )}
      {editing && (
        <GameEditor
          key={editing.appid}
          entry={editing}
          settings={settings}
          override={overrides[editing.appid]}
          onSave={(next) => {
            const rest = { ...overrides };
            if (Object.keys(next).length) rest[editing.appid] = next;
            else delete rest[editing.appid];
            save(settings, rest);
            setDialog(null);
          }}
          onClose={() => setDialog(null)}
        />
      )}
    </section>
  );
}
