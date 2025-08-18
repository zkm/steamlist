import type { NextApiRequest, NextApiResponse } from 'next';

const STEAM_API_KEY = process.env.STEAM_API_KEY;
const STEAM_ID64 = process.env.STEAM_ID64;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!STEAM_API_KEY || !STEAM_ID64) {
    return res.status(500).json({ error: 'Missing Steam API credentials.' });
  }

  try {
    const response = await fetch(
      `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${STEAM_API_KEY}&steamid=${STEAM_ID64}&include_appinfo=true&include_played_free_games=true`
    );
    const data = await response.json();
    const games = data.response?.games || [];
    if (games.length === 0) {
      return res.status(404).json({ error: 'No games found.' });
    }
    // Sort by least playtime
    games.sort((a: any, b: any) => a.playtime_forever - b.playtime_forever);
    // Pick a random game among the least played (lowest 10)
    const leastPlayed = games.slice(0, Math.min(10, games.length));
    const suggestion = leastPlayed[Math.floor(Math.random() * leastPlayed.length)];
    res.status(200).json({ suggestion });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch games.' });
  }
}
