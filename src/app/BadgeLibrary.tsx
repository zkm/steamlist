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
  app_names?: Record<number, string>;
  badge_names?: Record<number, string>;
}

interface SteamGamesResponse {
  response?: {
    games?: Array<{
      appid?: number;
      name?: string;
    }>;
  };
}

function formatDate(timestamp: number) {
  if (!timestamp) return 'Unknown';
  return new Date(timestamp * 1000).toLocaleDateString();
}

const KNOWN_BADGE_IMAGE_URLS: Record<number, string> = {
  1: 'https://community.fastly.steamstatic.com/public/images/badges/02_years/steamyears21_80.png',
  2: 'https://community.fastly.steamstatic.com/public/images/badges/01_community/communityleader_80.png',
  13: 'https://community.fastly.steamstatic.com/public/images/badges/13_gamecollector/100_80.png?v=4',
  49: 'https://community.fastly.steamstatic.com/public/images/badges/49_communitypatron/1_80.png?v=2',
  64: 'https://community.fastly.steamstatic.com/public/images/badges/generic/Replay2022_80.png',
  66: 'https://community.fastly.steamstatic.com/public/images/badges/generic/YIR2023_80.png',
  67: 'https://community.fastly.steamstatic.com/public/images/badges/67_steamawardnominations/level_04.png',
  68: 'https://community.fastly.steamstatic.com/public/images/badges/generic/YIR2024_80.png',
  69: 'https://community.fastly.steamstatic.com/public/images/badges/generic/YIR2025_80.png',
};

const APP_BADGE_IMAGE_URLS: Record<number, string> = {
  220: 'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/220/a4e1c060a5b728ded0d821f75c956c55335f6864.png',
  4000: 'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/4000/198c2dcc28e29422dbb95cb94b270b36105befaa.png',
  8870: 'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/8870/cdd4211ba543e77a176ae791fb26e698b003b2dd.png',
  300: 'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/300/4306915decadf90c7075de8745893f6b5bc701eb.png',
  550: 'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/550/9c05f08e59bd520e6136a980e35f7065ec88f5da.png',
  620: 'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/620/6e7f7d3e3d10ade95dc82b937ea23161500ebdca.png',
  2320: 'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/2320/c5c6c397788297d44852bc0ad224240d9a7dc573.png',
  49520:
    'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/49520/797d63328532b14b6a3a72b5ac1a482d9a7ccef8.png',
  98200:
    'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/98200/6f9ada4012a68ddccdfdfbbf1d10ffc475055a3e.png',
  105600:
    'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/105600/4cc825733e25d574c7935e53a68a4e5a5fd688ad.png',
  202990:
    'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/202990/f1c9e823a674cf27881b88bba4d0725d7de4a431.png',
  212910:
    'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/212910/039f72233f77291c0394bf69ecdfde3f37af0db2.png',
  221680:
    'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/221680/39f3e35910d40a6577ae0c8df21d58d76259556d.png',
  246620:
    'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/246620/20af3d896ecbc663bb760023ef7c70d453eda31e.png',
  252490:
    'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/252490/6a60438198b0c73b62669296aee3e3e0f64113b8.png',
  266840:
    'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/266840/5aeff922142f455a65416b0c515bdf6a18073635.png',
  275850:
    'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/275850/6bde2c643718f856b8e7613294e188f366bef1dd.png',
  282440:
    'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/282440/a045114845c414762e4884305e2d522717cffcb5.png',
  307780:
    'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/307780/7cde5a599250df3cb041c64ae8652a7ca8d18a0d.png',
  362890:
    'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/362890/4dc042827ba7304d55db9f825cfe7c12b62c8750.png',
  379720:
    'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/379720/f4f315a6b40a6cc9be29ce89a3316f4bf482b1a6.png',
  381210:
    'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/381210/71c1fe9ecaa101d28c2998fce8d35982f96e181d.png',
  397540:
    'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/397540/ccd87a19d399701c4204d097d3de5ae2d779e58b.png',
  409710:
    'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/409710/a1d5670e31b208e06893107c2308aac3f30002b6.png',
  409720:
    'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/409720/5c3754fa6b1b3c30bfa407ac98d9c392fd9e4c0b.png',
  413150:
    'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/413150/5aa283c2c2880fd1992cdc7944cf10c108cc6283.png',
  434050:
    'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/434050/c2d5710f4cc5b6433a90cbf133dd42023a7e6b52.png',
  460930:
    'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/460930/396af7c0908165e6305b5983618aa0b07d946cae.png',
  502400:
    'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/502400/ec6d18f8b2ee27d7ca50f58b6b78b06f3ba81e88.png',
  509920:
    'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/509920/5720f4f09a246e0ddd5b4d3031d58bf9cef34275.png',
  552520:
    'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/552520/c274163aff088a0ca80a28463fe9d41271ae3659.png',
  613830:
    'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/613830/94d24abae04da7435c3744968756efaa911fa3f7.png',
  636150:
    'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/636150/d00affdc6769dedab9d749c2059dd3c7da27a228.png',
  754120:
    'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/754120/ede24d6accff3c82c9df21a7a582bae6cc2f69d8.png',
  782330:
    'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/782330/53d8a3d72b16a18dbbc3bd213be7675460e6b1cb.png',
  976730:
    'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/976730/76eb196b1c8f4e361e5d10f2dd0f41a863f39f9b.png',
  1026680:
    'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/1026680/879903adf4e89c3948c6df7974e73b9e724b14c2.png',
  1091500:
    'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/1091500/d18d37dd5de324d9e25a32ad06db4585761dfb4a.png',
  1151340:
    'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/1151340/864d82ed4a8c969d5a578fe48dd1a2dd0bee68fc.png',
  1213210:
    'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/1213210/bf2426701d7b64c5ea7565529d50ae3efacd521f.png',
  1238810:
    'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/1238810/b7479150974d3ae6a0fa4d7a2ea00c69a52f3aa7.png',
  1238820:
    'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/1238820/b5dd25cceb90f2a681dc9b69abc8ee5c38fb8f41.png',
  1238840:
    'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/1238840/83973dff6805fd52991cda9f69c07a16c2568a98.png',
  1238860:
    'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/1238860/7e91429b7ca61e7e3e6a56c3b10f3e8a870bbaf8.png',
  1245620:
    'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/1245620/c89156280fffb2e75c4714e8a945ab921ebd3f62.png',
  1262560:
    'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/1262560/2a5bbe90050d8131607941c77dad8e515912e47d.png',
  1293830:
    'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/1293830/ecef819dd3441f8d6f6115104317064bf527cb2b.png',
  1364780:
    'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/1364780/74b49b67cccceb9a169793fd6e6b75f3407936aa.png',
  1462040:
    'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/1462040/4575e262333f53e5c0de6610b24dc380f4c5a2e6.png',
  1601580:
    'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/1601580/967557a41d0a110c35280afa21b7186b2e6f929d.png',
  1888930:
    'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/1888930/9f9adad854736a4abeda25cc18dbc975ccc04325.png',
  2131630:
    'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/2131630/edb29e30e46426f9b542df79dac1cb2a6d8fb57d.png',
  2131640:
    'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/2131640/9f510f05add6181bfd4c9029d47c6e0354fbba73.png',
  2131650:
    'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/2131650/61c650a51fca8e8c1161022c1ad0ddfe5404ceeb.png',
  2478970:
    'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/2478970/36e12f15928d00a1248a2aba3febc206090203df.png',
  2861720:
    'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/2861720/ab0e0b98e1fc6f53a1801d44393abab308261058.png',
  2909400:
    'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/2909400/0b5fea378feeefece665f6f727eb33549df2d801.png',
  3412320:
    'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/3412320/e8e230d4b8498a1a9cbf28a6c25ac0a82d3bfa7f.png',
  3837340:
    'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/3837340/78567feaf27f08b79750399ba46c9bba9fb4b8a1.png',
};

// App badge variants: maps appid to variants based on badge level
const APP_BADGE_VARIANTS: Record<number, { standard: string; foiled: string }> = {
  730: {
    standard: 'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/730/400f2cdf69db174f5616038edbb7a3f8e917ae00.png',
    foiled: 'https://cdn.fastly.steamstatic.com/steamcommunity/public/images/items/730/8203d824739e19c69aa4e33d761ce53a16159d19.png',
  },
};

function badgeImageUrl(badge: Badge): string {
  if (badge.appid) {
    const variant = APP_BADGE_VARIANTS[badge.appid];
    if (variant) {
      // For CS2: level 2+ shows standard, level 1 shows foiled
      return badge.level >= 2 ? variant.standard : variant.foiled;
    }
    if (APP_BADGE_IMAGE_URLS[badge.appid]) {
      return APP_BADGE_IMAGE_URLS[badge.appid];
    }
    return `https://cdn.cloudflare.steamstatic.com/steam/apps/${badge.appid}/header.jpg`;
  }
  if (KNOWN_BADGE_IMAGE_URLS[badge.badgeid]) {
    return KNOWN_BADGE_IMAGE_URLS[badge.badgeid];
  }
  // Community badge images hosted on Steam CDN
  return `https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/badges/${badge.badgeid}/${badge.level}.png`;
}

function badgeTitle(
  badge: Badge,
  appNames: Record<number, string>,
  badgeNames: Record<number, string>
): string {
  if (badge.appid) return appNames[badge.appid] ?? `App ${badge.appid}`;
  return badgeNames[badge.badgeid] ?? 'Steam Community Badge';
}

function BadgeImage({ badge, title }: { badge: Badge; title: string }) {
  const [failed, setFailed] = useState(false);
  const src = badgeImageUrl(badge);

  if (failed) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          background:
            'linear-gradient(135deg, rgba(58, 134, 255, 0.24) 0%, rgba(58, 134, 255, 0.05) 100%)',
          color: '#d7e7ff',
          textAlign: 'center',
          padding: 4,
        }}
      >
        <span style={{ fontSize: '0.6rem', letterSpacing: 0.5, opacity: 0.8 }}>FPO ART</span>
        <span
          style={{
            fontSize: '0.64rem',
            fontWeight: 600,
            lineHeight: 1.2,
            wordBreak: 'break-word',
          }}
        >
          {title}
        </span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={title}
      fill
      sizes="80px"
      style={{ objectFit: 'contain', objectPosition: 'center' }}
      unoptimized
      onError={() => setFailed(true)}
    />
  );
}

type SortKey = 'scarcity' | 'xp' | 'level' | 'date';
type ViewMode = 'grid' | 'list';

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
  const [appNames, setAppNames] = useState<Record<number, string>>({});
  const [badgeNames, setBadgeNames] = useState<Record<number, string>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortKey>('scarcity');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  useEffect(() => {
    fetch('/api/badges')
      .then((res) => res.json())
      .then((json: BadgesResponse & { error?: string }) => {
        if (json.error) {
          setError(json.error);
        } else {
          setData(json);
          if (json.app_names) {
            setAppNames((prev) => ({ ...json.app_names, ...prev }));
          }
          if (json.badge_names) {
            setBadgeNames((prev) => ({ ...json.badge_names, ...prev }));
          }
        }
      })
      .catch(() => setError('Failed to load badges.'))
      .finally(() => setLoading(false));

    fetch('/steam_games.json')
      .then((res) => res.json())
      .then((json: SteamGamesResponse) => {
        const names: Record<number, string> = {};
        for (const game of json.response?.games ?? []) {
          if (game.appid && game.name) {
            names[game.appid] = game.name;
          }
        }
        setAppNames((prev) => ({ ...names, ...prev }));
      })
      .catch(() => {
        // Keep fallback badge title when game name mapping isn't available.
      });
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
    <div style={{ width: '100%', maxWidth: 1080, margin: '0 auto', padding: '1rem 0' }}>
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
        <>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 8,
              marginBottom: 10,
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
                  border: '1px solid transparent',
                  background: 'transparent',
                  color: sort === opt.key ? '#c7d5e0' : '#8f98a0',
                  textDecoration: sort === opt.key ? 'underline' : 'none',
                  textUnderlineOffset: '2px',
                  fontWeight: 400,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 8,
              marginBottom: 20,
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
        </>
      )}

      {badges.length === 0 ? (
        <p style={{ color: '#b5b5bf', textAlign: 'center' }}>
          No badges found (profile may be private).
        </p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              viewMode === 'grid' ? 'repeat(auto-fill, minmax(220px, 1fr))' : 'minmax(0, 1fr)',
            gap: 16,
          }}
        >
          {badges.map((badge, index) =>
            (() => {
              const title = badgeTitle(badge, appNames, badgeNames);

              return (
                <div
                  key={index}
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
                        flexDirection: viewMode === 'grid' ? 'column' : 'row',
                        alignItems: viewMode === 'grid' ? 'center' : 'center',
                        justifyContent: viewMode === 'grid' ? 'flex-start' : 'space-between',
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          minWidth: 0,
                          width: viewMode === 'grid' ? 'auto' : '100%',
                        }}
                      >
                        <div
                          style={{
                            position: 'relative',
                            width: viewMode === 'grid' ? 80 : 78,
                            height: viewMode === 'grid' ? 60 : 78,
                            borderRadius: 4,
                            overflow: 'hidden',
                            background:
                              'radial-gradient(circle at 50% 35%, #3e4f66 0%, #2a3443 42%, #1a1f28 100%)',
                            flexShrink: 0,
                            border: '1px solid #3b4656',
                            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
                          }}
                        >
                          <BadgeImage badge={badge} title={title} />
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: viewMode === 'grid' ? 'center' : 'flex-start',
                            minWidth: 0,
                          }}
                        >
                          <span
                            style={{
                              color: '#ffffff',
                              fontWeight: 300,
                              fontSize: viewMode === 'grid' ? '0.9rem' : '1rem',
                              textAlign: viewMode === 'grid' ? 'center' : 'left',
                              lineHeight: 1.3,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '100%',
                            }}
                          >
                            {title}
                          </span>
                          <span style={{ color: '#7b7b7c', fontSize: '0.78rem' }}>
                            Level {badge.level}
                          </span>
                          <span style={{ color: '#8f98a0', fontSize: '0.72rem' }}>
                            {formatDate(badge.completion_time)}
                          </span>
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: viewMode === 'grid' ? 'center' : 'flex-end',
                          justifyContent: 'center',
                          minWidth: 92,
                          flexShrink: 0,
                          textAlign: viewMode === 'grid' ? 'center' : 'right',
                          marginTop: viewMode === 'grid' ? 2 : 0,
                        }}
                      >
                        <span style={{ color: '#5491cf', fontSize: '0.83rem', fontWeight: 600 }}>
                          {badge.xp} XP
                        </span>
                        <span style={{ color: '#6b6b6b', fontSize: '0.68rem' }}>
                          Scarcity: {badge.scarcity.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()
          )}
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
