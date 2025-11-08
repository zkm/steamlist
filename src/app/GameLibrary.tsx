
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
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


function formatPlaytime(minutes: number) {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins ? ` ${mins}m` : ""}`;
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
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [osFilter, setOsFilter] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [detectedOs, setDetectedOs] = useState<'windows' | 'mac' | 'linux' | null>(detectedOsFromUA);
  const [compat, setCompat] = useState<Record<number, boolean>>({});
  const [scanCount, setScanCount] = useState(0);
  const [scanTotal, setScanTotal] = useState(0);
  const abortRef = useRef<{aborted: boolean}>({ aborted: false });

  useEffect(() => {
    fetch("/steam_games.json")
      .then((res) => res.json())
      .then((data) => {
        const gameList = data.response?.games?.filter((g: { appid?: number; name?: string }) => g.appid && g.name) || [];
        setGames(gameList);
      })
      .catch(() => setError("Failed to load games."));
  }, []);

  // Scan Steam appdetails to see if a game claims support for the detected OS
  useEffect(() => {
    if (!osFilter || !detectedOs || games.length === 0) return;
    
    // Copy ref value at start of effect to avoid cleanup warning
    const abortController = abortRef.current;
    
    const maxScan = Math.min(300, games.length);
    const slice = games.slice(0, maxScan);
    
    // Set initial state - disabled lint rule as this is intentional initialization
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScanTotal(slice.length);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScanCount(0);
    abortController.aborted = false;
    
    (async () => {
      const results: Record<number, boolean> = {};
      const batchSize = 10;
      for (let i = 0; i < slice.length && !abortRef.current.aborted; i += batchSize) {
        const batch = slice.slice(i, i + batchSize);
        const settled = await Promise.allSettled(
          batch.map(g => fetch(`https://store.steampowered.com/api/appdetails?appids=${g.appid}`)
            .then(r => r.json())
            .then(json => {
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
        setCompat(prev => ({ ...prev, ...results }));
        setScanCount(prev => prev + batch.length);
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
      list = list.filter(g => compat[g.appid] !== false);
    }
    return list;
  }, [games, search, osFilter, detectedOs, compat]);

  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!games.length) return (
    <div role="status" aria-live="polite" style={{ textAlign: "center", margin: "2rem" }}>
      <span className="sr-only">Loading games...</span>
      <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true" style={{ animation: "spin 1s linear infinite" }}>
        <circle cx="20" cy="20" r="18" stroke="#888" strokeWidth="4" fill="none" />
      </svg>
      <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <section aria-labelledby="library-heading" style={{ width: "100%" }}>
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
        <label htmlFor="search-games" style={{ fontWeight: "bold", fontSize: '1.1rem', marginBottom: 8, color: '#e0e0e0' }}>
          Search games:
        </label>
        <input
          id="search-games"
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Type to filter..."
          style={{
            width: "100%",
            maxWidth: 400,
            padding: "0.75rem 1.25rem",
            borderRadius: 24,
            border: "none",
            background: "linear-gradient(90deg, #23232a 60%, #2c2c38 100%)",
            color: "#fff",
            fontSize: '1rem',
            boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
            outline: "none",
            marginBottom: 0,
            transition: "box-shadow 0.2s, background 0.2s",
          }}
          aria-label="Search games"
          onFocus={e => e.currentTarget.style.boxShadow = "0 0 0 3px #0078d4"}
          onBlur={e => e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.18)"}
        />
        <div style={{ marginTop: 12, display: 'flex', gap: 16, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#c7d2fe', fontSize: 14 }}>
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
      </div>
      <ul
        aria-labelledby="library-heading"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "2rem",
          listStyle: "none",
          padding: 0,
          margin: 'auto',
          maxWidth: '1750px',
          textAlign: 'left',
        }}
      >
        {filteredGames.map((game) => (
          <li
            key={game.appid}
            tabIndex={0}
            aria-label={`Game: ${game.name}, Playtime: ${formatPlaytime(game.playtime_forever)}`}
            style={{
              background: "linear-gradient(135deg, #23232a 60%, #35354a 100%)",
              borderRadius: 18,
              padding: 32,
              textAlign: "left",
              boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
              outline: "none",
              transition: "box-shadow 0.2s, border 0.2s, transform 0.2s",
              position: "relative",
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              height: 400,
              minWidth: 0,
              width: '100%',
              maxWidth: 220,
              transform: 'scale(1)',
            }}
            onFocus={e => {
              e.currentTarget.style.boxShadow = "0 0 0 4px #0078d4";
              e.currentTarget.style.transform = "scale(1.03)";
            }}
            onBlur={e => {
              e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.18)";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            {game.img_icon_url ? (
              <Image
                src={`https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`}
                alt={game.name}
                width={72}
                height={72}
                style={{ objectFit: 'cover', borderRadius: '8px', border: "3px solid #0078d4", background: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.10)" }}
                unoptimized
              />
            ) : (
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#444", display: "inline-block" }} aria-hidden="true" />
            )}
            <div style={{ marginTop: 16, marginBottom: 12, lineHeight: 1.25,fontWeight: "bold", fontSize: "1rem", color: '#e0e0e0' }}>{game.name}</div>
            <div style={{ fontSize: 14, color: "#aaa", marginBottom: 8 }}>Playtime: {formatPlaytime(game.playtime_forever)}</div>
            <div style={{ fontSize: 13, color: '#bbb', marginBottom: 4 }}>
              <strong>Last played:</strong> {formatDate(game.rtime_last_played ?? 0)}
            </div>
            <div style={{ fontSize: 13, color: '#bbb', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
              <strong style={{ marginRight: 8 }}>Platforms:</strong>
              <span title="Windows" style={{ display: 'inline-flex', alignItems: 'center' }}>
                <FontAwesomeIcon icon={faWindows} style={{ fontSize: 20, color: '#0078d4' }} />
              </span>
              <span title="Mac" style={{ display: 'inline-flex', alignItems: 'center' }}>
                <FontAwesomeIcon icon={faApple} style={{ fontSize: 20, color: '#aaa' }} />
              </span>
              <span title="Linux" style={{ display: 'inline-flex', alignItems: 'center' }}>
                <FontAwesomeIcon icon={faLinux} style={{ fontSize: 20, color: '#4caf50' }} />
              </span>
              <span title="Steam Deck" style={{ display: 'inline-flex', alignItems: 'center' }}>
                <FontAwesomeIcon icon={faGamepad} style={{ fontSize: 20, color: '#00b4d8' }} />
              </span>
            </div>
            <div style={{ fontSize: 13, color: '#bbb', marginBottom: 4 }}>
              <strong>Community Stats:</strong> {game.has_community_visible_stats ? 'Available' : 'No'}
            </div>
            <div style={{ fontSize: 13, color: '#bbb', marginBottom: 8 }}>
              <strong>Offline Playtime:</strong> {formatPlaytime(game.playtime_disconnected ?? 0)}
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'flex-end', marginBottom: 0 }}>
              <button
                style={{
                  padding: "0.5rem 1.25rem",
                  borderRadius: 24,
                  border: "2px solid #0078d4",
                  background: "transparent",
                  color: "#0078d4",
                  fontWeight: "bold",
                  fontSize: "1rem",
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
                  transition: "background 0.2s, box-shadow 0.2s, color 0.2s",
                  outline: "none",
                  whiteSpace: 'nowrap',
                }}
                aria-label={`View ${game.name} on Steam`}
                onMouseOver={e => {
                  e.currentTarget.style.background = '#0078d4';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#0078d4';
                }}
                onFocus={e => e.currentTarget.style.boxShadow = '0 0 0 3px #00b4d8'}
                onBlur={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.10)'}
                onClick={() => window.open(`https://store.steampowered.com/app/${game.appid}`, '_blank', 'noopener,noreferrer')}
              >
                View on Steam
              </button>
            </div>
          </li>
        ))}
      </ul>
      {filteredGames.length === 0 && (
        <p role="status" aria-live="polite" style={{ textAlign: "center", marginTop: 32 }}>
          No games found.
        </p>
      )}
    </section>
  );
}
