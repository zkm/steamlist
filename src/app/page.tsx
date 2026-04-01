'use client';

import Link from 'next/link';
import SuggestGame from './SuggestGame';

export default function Home() {
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
              Suggest a Game
            </span>
          </li>
          <li>
            <Link
              href="/game-library"
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
              Game Library
            </Link>
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
      <section style={{ width: '100%', maxWidth: 400 }}>
        <div
          style={{
            background: '#23232a',
            borderRadius: 12,
            padding: '2rem',
            boxShadow: '0 2px 16px rgba(0,0,0,0.2)',
          }}
        >
          <SuggestGame />
        </div>
      </section>
    </main>
  );
}
