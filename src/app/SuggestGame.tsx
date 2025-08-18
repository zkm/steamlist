
"use client";
import { useState } from "react";

function formatPlaytime(minutes: number) {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins ? ` ${mins}m` : ""}`;
  }
  return `${minutes} min`;
}

export default function SuggestGame() {
  const [game, setGame] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchSuggestion = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/suggest-game");
      const data = await res.json();
      if (data.suggestion) {
        setGame(data.suggestion);
      } else {
        setError(data.error || "No suggestion found.");
      }
    } catch (e) {
      setError("Failed to fetch suggestion.");
    }
    setLoading(false);
  };

  return (
    <section aria-labelledby="suggest-heading" style={{ width: '100%' }}>
      <h2 id="suggest-heading" style={{ fontSize: '1.5rem', marginBottom: 24, textAlign: 'center', color: '#e0e0e0' }}>
        Need help picking a game?
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <button
          onClick={fetchSuggestion}
          disabled={loading}
          style={{
            padding: '0.75rem 2rem',
            borderRadius: 24,
            border: 'none',
            background: loading
              ? 'linear-gradient(90deg, #b0b0b0 60%, #d0d0d0 100%)'
              : 'linear-gradient(90deg, #0078d4 60%, #00b4d8 100%)',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '1.1rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
            outline: 'none',
            marginBottom: 24,
            transition: 'background 0.2s, box-shadow 0.2s',
          }}
          aria-label="Suggest a game to play"
        >
          {loading ? "Loading..." : "Suggest a Game"}
        </button>
        {error && <p style={{ color: "#ff4d4f", marginBottom: 16 }}>{error}</p>}
        {game && (
          <div
            style={{
              background: 'linear-gradient(135deg, #23232a 60%, #35354a 100%)',
              borderRadius: 18,
              padding: 32,
              textAlign: 'center',
              boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
              marginTop: 8,
              width: '100%',
              maxWidth: 340,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
            }}
            aria-live="polite"
          >
            {game.img_icon_url ? (
              <img
                src={`https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`}
                alt={game.name}
                width={80}
                height={80}
                style={{ borderRadius: '50%', border: '3px solid #0078d4', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.10)' }}
              />
            ) : (
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#444', display: 'inline-block' }} aria-hidden="true" />
            )}
            <div style={{ fontWeight: 'bold', fontSize: '1.3rem', color: '#e0e0e0', marginTop: 8 }}>{game.name}</div>
            <div style={{ fontSize: 15, color: '#aaa' }}>Playtime: {formatPlaytime(game.playtime_forever)}</div>
            <button
              style={{
                marginTop: 8,
                padding: '0.5rem 1.25rem',
                borderRadius: 24,
                border: '2px solid #0078d4',
                background: 'transparent',
                color: '#0078d4',
                fontWeight: 'bold',
                fontSize: '1rem',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                transition: 'background 0.2s, box-shadow 0.2s, color 0.2s',
                outline: 'none',
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
        )}
      </div>
    </section>
  );
}
