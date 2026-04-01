'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface Badge {
  badgeid: number;
  level: number;
  completion_time: number;
  xp: number;
  scarcity: number;
  appid?: number;
  border_color?: number;
}

interface BadgesResponse {
  badges?: Badge[];
  player_xp?: number;
  player_level?: number;
  player_xp_needed_to_level_up?: number;
  player_xp_needed_current_level?: number;
}

function formatDate(timestamp: number) {
  if (!timestamp) return 'Unknown';
  return new Date(timestamp * 1000).toLocaleDateString();
}

function badgeImageUrl(badge: Badge): string {
  if (badge.appid) {
    return `https://cdn.cloudflare.steamstatic.com/steam/apps/${badge.appid}/header.jpg`;
  }
  // Community badge images hosted on Steam CDN
  return `https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/badges/${badge.badgeid}/${badge.level}.png`;
}

function badgeTitle(badge: Badge): string {
  if (badge.appid) return `App ${badge.appid}`;
  return `Badge #${badge.badgeid}`;
}

type SortKey = 'scarcity' | 'xp' | 'level' | 'date';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'scarcity', label: 'Rarest' },
  { key: 'xp', label: 'Most XP' },
  { key: 'level', label: 'Highest Level' },
  { key: 'date', label: 'Recently Earned' },
];

function sortBadges(badges: Badge[], sort: SortKey): Badge[] {
  return [...badges].sort((a, b) => {
    switch (sort) {
      case 'scarcity':
        return a.scarcity - b.scarcity;
      case 'xp':
        return b.xp - a.xp;
      case 'level':
        return b.level - a.level;
      case 'date':
        return b.completion_time - a.completion_time;
    }
  });
}

export default function BadgeLibrary() {
  const [data, setData] = useState<BadgesResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortKey>('scarcity');

  useEffect(() => {
    fetch('/api/badges')
      .then((res) => res.json())
      .then((json: BadgesResponse & { error?: string }) => {
        if (json.error) {
          setError(json.error);
        } else {
          setData(json);
        }
      })
      .catch(() => setError('Failed to load badges.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <p style={{ color: '#b5b5bf', textAlign: 'center', padding: '2rem' }}>Loading badges…</p>
    );
  }

  if (error) {
    return <p style={{ color: '#ff6b6b', textAlign: 'center', padding: '2rem' }}>{error}</p>;
  }

  const badges = sortBadges(data?.badges ?? [], sort);

  return (
    <div style={{ width: '100%', padding: '1rem 0' }}>
      {/* Player summary */}
      {data?.player_level != null && (
        <div
          style={{
            display: 'flex',
            gap: 32,
            justifyContent: 'center',
            marginBottom: 28,
            flexWrap: 'wrap',
          }}
        >
          <Stat label="Steam Level" value={data.player_level} />
          <Stat label="Total XP" value={data.player_xp?.toLocaleString() ?? '—'} />
          <Stat
            label="XP to Next Level"
            value={data.player_xp_needed_to_level_up?.toLocaleString() ?? '—'}
          />
          <Stat label="Badges" value={badges.length} />
        </div>
      )}

      {badges.length > 0 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 8,
            marginBottom: 20,
            flexWrap: 'wrap',
          }}
        >
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setSort(opt.key)}
              style={{
                padding: '0.35rem 0.9rem',
                borderRadius: 16,
                border: sort === opt.key ? '1px solid #3a86ff88' : '1px solid #2f2f37',
                background: sort === opt.key ? '#232633' : 'transparent',
                color: sort === opt.key ? '#e6f0ff' : '#b5b5bf',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {badges.length === 0 ? (
        <p style={{ color: '#b5b5bf', textAlign: 'center' }}>
          No badges found (profile may be private).
        </p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 16,
          }}
        >
          {badges.map((badge, index) => (
            <div
              key={index}
              style={{
                background: '#23232a',
                borderRadius: 10,
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                border: '1px solid #2f2f37',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: 80,
                  height: 60,
                  borderRadius: 6,
                  overflow: 'hidden',
                  background: '#18181b',
                }}
              >
                <Image
                  src={badgeImageUrl(badge)}
                  alt={badgeTitle(badge)}
                  fill
                  sizes="80px"
                  style={{ objectFit: 'cover' }}
                  unoptimized
                />
              </div>
              <span
                style={{
                  color: '#e6f0ff',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  textAlign: 'center',
                  lineHeight: 1.3,
                }}
              >
                {badgeTitle(badge)}
              </span>
              <span style={{ color: '#b5b5bf', fontSize: '0.78rem' }}>Level {badge.level}</span>
              <span style={{ color: '#3a86ff', fontSize: '0.78rem', fontWeight: 600 }}>
                {badge.xp} XP
              </span>
              <span style={{ color: '#888', fontSize: '0.72rem' }}>
                {formatDate(badge.completion_time)}
              </span>
              <span style={{ color: '#555', fontSize: '0.68rem' }}>
                Scarcity: {badge.scarcity.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number | undefined }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ color: '#3a86ff', fontSize: '1.5rem', fontWeight: 700 }}>{value}</div>
      <div style={{ color: '#b5b5bf', fontSize: '0.8rem' }}>{label}</div>
    </div>
  );
}
