'use client';

import Link from 'next/link';
import GameLibrary from '../GameLibrary';

export default function GameLibraryPage() {
  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        minHeight: '100vh',
        background: '#18181b',
        color: '#fff',
        paddingTop: 40,
        paddingBottom: 56,
      }}
    >
      <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem' }}>Steam Game App</h1>
      <nav aria-label="Main tabs" style={{ marginBottom: 32 }}>
        <ul style={{ display: 'flex', gap: 16, listStyle: 'none', padding: 0, margin: 0 }}>
          <li>
            <Link
              href="/"
              style={{
                display: 'inline-block',
                padding: '0.6rem 1.25rem',
                borderRadius: 20,
                border: '1px solid #2f2f37',
                background: 'transparent',
                color: '#b5b5bf',
                fontWeight: 600,
                fontSize: '1rem',
                cursor: 'pointer',
                boxShadow: 'none',
                outline: 'none',
                textDecoration: 'none',
                transition: 'background 0.15s, color 0.15s, border-color 0.15s',
              }}
            >
              Suggest a Game
            </Link>
          </li>
          <li>
            <span
              aria-current="page"
              style={{
                display: 'inline-block',
                padding: '0.6rem 1.25rem',
                borderRadius: 20,
                border: '1px solid #3a86ff55',
                background: '#232633',
                color: '#e6f0ff',
                fontWeight: 600,
                fontSize: '1rem',
              }}
            >
              Game Library
            </span>
          </li>
          <li>
            <Link
              href="/badges"
              style={{
                display: 'inline-block',
                padding: '0.6rem 1.25rem',
                borderRadius: 20,
                border: '1px solid #2f2f37',
                background: 'transparent',
                color: '#b5b5bf',
                fontWeight: 600,
                fontSize: '1rem',
                cursor: 'pointer',
                boxShadow: 'none',
                outline: 'none',
                textDecoration: 'none',
                transition: 'background 0.15s, color 0.15s, border-color 0.15s',
              }}
            >
              Badges
            </Link>
          </li>
        </ul>
      </nav>
      <section style={{ width: '100%', maxWidth: 1400 }}>
        <GameLibrary />
      </section>
    </main>
  );
}
