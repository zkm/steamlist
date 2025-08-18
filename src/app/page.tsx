

"use client";

import { useState } from 'react';
import GameLibrary from './GameLibrary';
import SuggestGame from './SuggestGame';

const tabs = [
  { label: 'Suggest a Game', key: 'suggest' },
  { label: 'Game Library', key: 'library' },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState('suggest');
  return (
    <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', minHeight: '100vh', background: '#18181b', color: '#fff', paddingTop: 40 }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem' }}>Steam Game App</h1>
      <nav aria-label="Main tabs" style={{ marginBottom: 32 }}>
        <ul style={{ display: 'flex', gap: 16, listStyle: 'none', padding: 0, margin: 0 }}>
          {tabs.map(tab => (
            <li key={tab.key}>
              <button
                type="button"
                onClick={() => setActiveTab(tab.key)}
                aria-selected={activeTab === tab.key}
                aria-controls={`tabpanel-${tab.key}`}
                style={{
                  padding: '0.75rem 2rem',
                  borderRadius: 24,
                  border: 'none',
                  background: activeTab === tab.key
                    ? 'linear-gradient(90deg, #0078d4 60%, #00b4d8 100%)'
                    : '#23232a',
                  color: activeTab === tab.key ? '#fff' : '#aaa',
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                  cursor: 'pointer',
                  boxShadow: activeTab === tab.key ? '0 2px 8px rgba(0,0,0,0.10)' : 'none',
                  outline: 'none',
                  transition: 'background 0.2s, color 0.2s',
                }}
                tabIndex={0}
              >
                {tab.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
  <section aria-labelledby={`tab-${activeTab}`} style={{ width: '100%', maxWidth: activeTab === 'library' ? 1400 : 400 }}>
        <div
          id="tabpanel-suggest"
          role="tabpanel"
          aria-hidden={activeTab !== 'suggest'}
          style={{ display: activeTab === 'suggest' ? 'block' : 'none', maxWidth: 400, margin: '0 auto' }}
        >
          <div style={{ background: '#23232a', borderRadius: 12, padding: '2rem', boxShadow: '0 2px 16px rgba(0,0,0,0.2)' }}>
            <SuggestGame />
          </div>
        </div>
        <div
          id="tabpanel-library"
          role="tabpanel"
          aria-hidden={activeTab !== 'library'}
          style={{ display: activeTab === 'library' ? 'block' : 'none', width: '100%' }}
        >
          <GameLibrary />
        </div>
      </section>
    </main>
  );
}
