
"use client";
import { useEffect, useState } from "react";
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
  const [games, setGames] = useState<Game[]>([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/steam_games.json")
      .then((res) => res.json())
      .then((data) => {
        const gameList = data.response?.games?.filter((g: any) => g.appid && g.name) || [];
        setGames(gameList);
      })
      .catch(() => setError("Failed to load games."));
  }, []);

  const filteredGames = games.filter((game) =>
    game.name.toLowerCase().includes(search.toLowerCase())
  );

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
              <img
                src={`https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`}
                alt={game.name}
                width={72}
                height={72}
                style={{ borderRadius: "50%", border: "3px solid #0078d4", background: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.10)" }}
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
