'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWindows, faApple, faLinux } from '@fortawesome/free-brands-svg-icons';
import { faGamepad } from '@fortawesome/free-solid-svg-icons';

interface Game {
  appid: number;
  name: string;
  img_icon_url: string;
  playtime_forever: number;
  has_community_visible_stats?: boolean;
  playtime_windows_forever?: number;
  playtime_mac_forever?: number;
  playtime_linux_forever?: number;
  playtime_deck_forever?: number;
  rtime_last_played?: number;
  playtime_disconnected?: number;
}

type ViewMode = 'grid' | 'list';

function formatPlaytime(minutes: number) {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins ? ` ${mins}m` : ''}`;
  }
  return `${minutes} min`;
}

function formatDate(timestamp: number) {
  if (!timestamp) return 'Never';
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString();
}

export default function GameLibrary() {
  // Detect OS once using useMemo
  const detectedOsFromUA = useMemo(() => {
    if (typeof navigator === 'undefined') return null;
    const ua = navigator.userAgent;
    if (/Windows/i.test(ua)) return 'windows';
    if (/Macintosh|Mac OS X/i.test(ua)) return 'mac';
    if (/Linux/i.test(ua)) return 'linux';
    return null;
  }, []);

  const [games, setGames] = useState<Game[]>([]);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [osFilter, setOsFilter] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [detectedOs, setDetectedOs] = useState<'windows' | 'mac' | 'linux' | null>(
    detectedOsFromUA
  );
  const [compat, setCompat] = useState<Record<number, boolean>>({});
  const [scanCount, setScanCount] = useState(0);
  const [scanTotal, setScanTotal] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const abortRef = useRef<{ aborted: boolean }>({ aborted: false });

  useEffect(() => {
    fetch('/steam_games.json')
      .then((res) => res.json())
      .then((data) => {
        const gameList =
          data.response?.games?.filter(
            (g: { appid?: number; name?: string }) => g.appid && g.name
          ) || [];
        setGames(gameList);
      })
      .catch(() => setError('Failed to load games.'));
  }, []);

  // Scan Steam appdetails to see if a game claims support for the detected OS
  useEffect(() => {
    if (!osFilter || !detectedOs || games.length === 0) return;

    // Copy ref value at start of effect to avoid cleanup warning
    const abortController = abortRef.current;

    const maxScan = Math.min(300, games.length);
    const slice = games.slice(0, maxScan);

    // Set initial state
    setScanTotal(slice.length);
    setScanCount(0);
    abortController.aborted = false;

    (async () => {
      const results: Record<number, boolean> = {};
      const batchSize = 10;
      for (let i = 0; i < slice.length && !abortRef.current.aborted; i += batchSize) {
        const batch = slice.slice(i, i + batchSize);
        const settled = await Promise.allSettled(
          batch.map((g) =>
            fetch(`https://store.steampowered.com/api/appdetails?appids=${g.appid}`)
              .then((r) => r.json())
              .then((json) => {
                const key = String(g.appid);
                const entry = json?.[key];
                const platforms = entry?.success ? entry?.data?.platforms : null;
                return { appid: g.appid, ok: Boolean(platforms?.[detectedOs]) };
              })
          )
        );
        for (const s of settled) {
          if (s.status === 'fulfilled') results[s.value.appid] = s.value.ok;
        }
        setCompat((prev) => ({ ...prev, ...results }));
        setScanCount((prev) => prev + batch.length);
      }
    })();
    return () => {
      // Use copied ref value to avoid React hooks warning
      abortController.aborted = true;
    };
  }, [osFilter, detectedOs, games]);

  const filteredGames = useMemo(() => {
    const term = search.toLowerCase();
    let list = games.filter((g) => g.name.toLowerCase().includes(term));
    if (osFilter && detectedOs) {
      // While scanning, keep items with unknown status; only drop those known to be incompatible
      list = list.filter((g) => compat[g.appid] !== false);
    }
    return list;
  }, [games, search, osFilter, detectedOs, compat]);

  if (error) return <p style={{ color: 'red' }}>{error}</p>;
  if (!games.length)
    return (
      <div role="status" aria-live="polite" style={{ textAlign: 'center', margin: '2rem' }}>
        <span className="sr-only">Loading games...</span>
        <svg
          width="40"
          height="40"
          viewBox="0 0 40 40"
          aria-hidden="true"
          style={{ animation: 'spin 1s linear infinite' }}
        >
          <circle cx="20" cy="20" r="18" stroke="#888" strokeWidth="4" fill="none" />
        </svg>
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );

  return (
    <section aria-labelledby="library-heading" style={{ width: '100%' }}>
      <div
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}
      >
        <label
          htmlFor="search-games"
          style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: 8, color: '#e0e0e0' }}
        >
          Search games:
        </label>
        <input
          id="search-games"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Type to filter..."
          style={{
            width: '100%',
            maxWidth: 400,
            padding: '0.75rem 1.25rem',
            borderRadius: 24,
            border: 'none',
            background: 'linear-gradient(90deg, #23232a 60%, #2c2c38 100%)',
            color: '#fff',
            fontSize: '1rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
            outline: 'none',
            marginBottom: 0,
            transition: 'box-shadow 0.2s, background 0.2s',
          }}
          aria-label="Search games"
          onFocus={(e) => (e.currentTarget.style.boxShadow = '0 0 0 3px #0078d4')}
          onBlur={(e) => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.18)')}
        />
        <div style={{ marginTop: 12, display: 'flex', gap: 16, alignItems: 'center' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: '#c7d2fe',
              fontSize: 14,
            }}
          >
            <input
              type="checkbox"
              checked={osFilter}
              onChange={(e) => setOsFilter(e.target.checked)}
            />
            <span>Only show games that work on {detectedOs ?? 'my OS'}</span>
          </label>
          {osFilter && scanTotal > 0 && scanCount < scanTotal && (
            <span style={{ color: '#94a3b8', fontSize: 12 }}>
              Scanning compatibility {scanCount}/{scanTotal} — results will refine as we go
            </span>
          )}
          {osFilter && scanTotal > 0 && scanCount >= scanTotal && (
            <span style={{ color: '#94a3b8', fontSize: 12 }}>
              Compatibility scan complete for first {scanTotal} games
            </span>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 8,
            marginTop: 14,
          }}
        >
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            style={{
              padding: '0.35rem 0.9rem',
              borderRadius: 16,
              border: viewMode === 'grid' ? '1px solid #5491cf' : '1px solid #3a3d40',
              background:
                viewMode === 'grid'
                  ? 'linear-gradient(to bottom, #232424 5%, #141414 95%)'
                  : 'linear-gradient(to bottom, #1f2022 5%, #141414 95%)',
              color: viewMode === 'grid' ? '#c7d5e0' : '#8f98a0',
              fontWeight: 500,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            Grid
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            style={{
              padding: '0.35rem 0.9rem',
              borderRadius: 16,
              border: viewMode === 'list' ? '1px solid #5491cf' : '1px solid #3a3d40',
              background:
                viewMode === 'list'
                  ? 'linear-gradient(to bottom, #232424 5%, #141414 95%)'
                  : 'linear-gradient(to bottom, #1f2022 5%, #141414 95%)',
              color: viewMode === 'list' ? '#c7d5e0' : '#8f98a0',
              fontWeight: 500,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            List
          </button>
        </div>
      </div>
      <ul
        aria-labelledby="library-heading"
        style={{
          display: 'grid',
          gridTemplateColumns:
            viewMode === 'grid' ? 'repeat(auto-fill, minmax(280px, 1fr))' : 'minmax(0, 1fr)',
          gap: viewMode === 'grid' ? 16 : 8,
          listStyle: 'none',
          padding: 0,
          margin: 'auto',
          maxWidth: 1080,
          textAlign: 'left',
        }}
      >
        {filteredGames.map((game) => (
          <li
            key={game.appid}
            aria-label={`Game: ${game.name}, Playtime: ${formatPlaytime(game.playtime_forever)}`}
            style={{
              display: 'block',
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: 'block',
                position: 'relative',
                padding: 1,
                background: 'linear-gradient(to bottom, #383939 5%, #000000 95%)',
                borderRadius: 5,
                marginBottom: viewMode === 'list' ? 8 : 0,
                borderTop: '1px solid #2e2c2c',
                borderRight: '1px solid #242425',
                borderBottom: '1px solid transparent',
                borderLeft: '1px solid transparent',
              }}
            >
              <div
                style={{
                  background: 'linear-gradient(to bottom, #232424 5%, #141414 95%)',
                  borderRadius: 5,
                  padding: viewMode === 'grid' ? '1rem' : '0.75rem 0.85rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: viewMode === 'grid' ? 10 : 12,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: viewMode === 'grid' ? 'flex-start' : 'center',
                        gap: 12,
                        minWidth: 0,
                        width: '100%',
                      }}
                    >
                      <div
                        style={{
                          position: 'relative',
                          width: 78,
                          height: viewMode === 'grid' ? 64 : 78,
                          borderRadius: 4,
                          overflow: 'hidden',
                          background:
                            'radial-gradient(circle at 50% 35%, #3e4f66 0%, #2a3443 42%, #1a1f28 100%)',
                          flexShrink: 0,
                          border: '1px solid #3b4656',
                          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
                        }}
                      >
                        {game.img_icon_url ? (
                          <Image
                            src={`https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`}
                            alt={game.name}
                            fill
                            sizes="78px"
                            style={{ objectFit: 'contain', objectPosition: 'center' }}
                            unoptimized
                          />
                        ) : (
                          <div
                            style={{
                              width: '100%',
                              height: '100%',
                              background: 'linear-gradient(135deg, #3c3f42 0%, #1f2226 100%)',
                            }}
                            aria-hidden="true"
                          />
                        )}
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          minWidth: 0,
                          textAlign: 'left',
                        }}
                      >
                        <span
                          style={{
                            color: '#ffffff',
                            fontWeight: 300,
                            fontSize: viewMode === 'grid' ? '0.9rem' : '1rem',
                            textAlign: 'left',
                            lineHeight: 1.3,
                            whiteSpace: viewMode === 'grid' ? 'normal' : 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '100%',
                          }}
                        >
                          {game.name}
                        </span>
                        <span style={{ color: '#7b7b7c', fontSize: '0.78rem' }}>
                          Last Played: {formatDate(game.rtime_last_played ?? 0)}
                        </span>
                        <span style={{ color: '#8f98a0', fontSize: '0.72rem' }}>
                          Community Stats: {game.has_community_visible_stats ? 'Available' : 'No'}
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: viewMode === 'grid' ? 'flex-start' : 'flex-end',
                        justifyContent: 'center',
                        minWidth: 92,
                        flexShrink: 0,
                        textAlign: viewMode === 'grid' ? 'left' : 'right',
                      }}
                    >
                      <span style={{ color: '#5491cf', fontSize: '0.83rem', fontWeight: 600 }}>
                        {formatPlaytime(game.playtime_forever)}
                      </span>
                      <span style={{ color: '#6b6b6b', fontSize: '0.68rem' }}>
                        Offline: {formatPlaytime(game.playtime_disconnected ?? 0)}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        color: '#8f98a0',
                      }}
                    >
                      <span
                        title="Windows"
                        style={{ display: 'inline-flex', alignItems: 'center' }}
                      >
                        <FontAwesomeIcon
                          icon={faWindows}
                          style={{ fontSize: 16, color: '#5491cf' }}
                        />
                      </span>
                      <span title="Mac" style={{ display: 'inline-flex', alignItems: 'center' }}>
                        <FontAwesomeIcon
                          icon={faApple}
                          style={{ fontSize: 16, color: '#9aa3ab' }}
                        />
                      </span>
                      <span title="Linux" style={{ display: 'inline-flex', alignItems: 'center' }}>
                        <FontAwesomeIcon
                          icon={faLinux}
                          style={{ fontSize: 16, color: '#7bbf6a' }}
                        />
                      </span>
                      <span
                        title="Steam Deck"
                        style={{ display: 'inline-flex', alignItems: 'center' }}
                      >
                        <FontAwesomeIcon
                          icon={faGamepad}
                          style={{ fontSize: 16, color: '#5fb3c8' }}
                        />
                      </span>
                    </div>

                    <button
                      style={{
                        padding: '0.35rem 0.9rem',
                        borderRadius: 16,
                        border: '1px solid #3a3d40',
                        background: 'linear-gradient(to bottom, #1f2022 5%, #141414 95%)',
                        color: '#c7d5e0',
                        fontWeight: 500,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                      aria-label={`View ${game.name} on Steam`}
                      onClick={() =>
                        window.open(
                          `https://store.steampowered.com/app/${game.appid}`,
                          '_blank',
                          'noopener,noreferrer'
                        )
                      }
                    >
                      View on Steam
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {filteredGames.length === 0 && (
        <p role="status" aria-live="polite" style={{ textAlign: 'center', marginTop: 32 }}>
          No games found.
        </p>
      )}
    </section>
  );
}
