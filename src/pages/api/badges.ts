import type { NextApiRequest, NextApiResponse } from 'next';

const STEAM_API_KEY = process.env.STEAM_API_KEY;
const STEAM_ID64 = process.env.STEAM_ID64;

const KNOWN_BADGE_NAMES: Record<number, string> = {
  1: 'Years of Service',
  2: 'Community Leader',
  13: 'Power Player',
  49: 'Community Patron - Legacy',
  64: 'Steam Replay 2022',
  66: 'Steam Replay 2023',
  67: 'Steam Awards Nomination Committee 2024',
  68: 'Steam Replay 2024',
  69: 'Steam Replay 2025',
};

const APP_NAME_OVERRIDES: Record<number, string> = {
  3412320: 'Winter Collection - 2024',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  if (!STEAM_API_KEY || !STEAM_ID64) {
    return res.status(500).json({ error: 'Missing Steam API credentials.' });
  }

  const badgesUrl = `https://api.steampowered.com/IPlayerService/GetBadges/v1/?key=${encodeURIComponent(STEAM_API_KEY)}&steamid=${encodeURIComponent(STEAM_ID64)}`;
  const ownedGamesUrl = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${encodeURIComponent(STEAM_API_KEY)}&steamid=${encodeURIComponent(STEAM_ID64)}&include_appinfo=true&include_played_free_games=true`;

  const [badgesRes, ownedGamesRes] = await Promise.all([fetch(badgesUrl), fetch(ownedGamesUrl)]);

  if (!badgesRes.ok) {
    return res.status(502).json({ error: `Steam API error: HTTP ${badgesRes.status}` });
  }

  const badgesData = await badgesRes.json();
  const response = badgesData?.response ?? {};
  const badges = Array.isArray(response?.badges) ? response.badges : [];

  let appNames: Record<number, string> = {};
  if (ownedGamesRes.ok) {
    const ownedGamesData = await ownedGamesRes.json();
    for (const game of ownedGamesData?.response?.games ?? []) {
      if (game?.appid && game?.name) {
        appNames[game.appid] = game.name;
      }
    }
  }

  const unresolvedAppIds = [
    ...new Set(badges.map((b: { appid?: number }) => b.appid).filter(Boolean)),
  ].filter((appid): appid is number => typeof appid === 'number' && !appNames[appid]);

  if (unresolvedAppIds.length > 0) {
    const resolved = await Promise.allSettled(
      unresolvedAppIds.map(async (appid) => {
        const appRes = await fetch(
          `https://store.steampowered.com/api/appdetails?appids=${encodeURIComponent(String(appid))}&filters=basic`
        );
        if (!appRes.ok) return null;
        const appJson = await appRes.json();
        const appData = appJson?.[String(appid)];
        const name = appData?.success ? appData?.data?.name : null;
        if (!name) return null;
        return { appid, name };
      })
    );

    for (const entry of resolved) {
      if (entry.status === 'fulfilled' && entry.value) {
        appNames[entry.value.appid] = entry.value.name;
      }
    }
  }

  appNames = { ...appNames, ...APP_NAME_OVERRIDES };

  const badgeNames: Record<number, string> = {};
  for (const badge of badges) {
    if (!badge?.appid && badge?.badgeid && KNOWN_BADGE_NAMES[badge.badgeid]) {
      badgeNames[badge.badgeid] = KNOWN_BADGE_NAMES[badge.badgeid];
    }
  }

  return res.status(200).json({ ...response, app_names: appNames, badge_names: badgeNames });
}
