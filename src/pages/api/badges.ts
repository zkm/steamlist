import type { NextApiRequest, NextApiResponse } from 'next';

const STEAM_API_KEY = process.env.STEAM_API_KEY;
const STEAM_ID64 = process.env.STEAM_ID64;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  if (!STEAM_API_KEY || !STEAM_ID64) {
    return res.status(500).json({ error: 'Missing Steam API credentials.' });
  }

  const url = `https://api.steampowered.com/IPlayerService/GetBadges/v1/?key=${encodeURIComponent(STEAM_API_KEY)}&steamid=${encodeURIComponent(STEAM_ID64)}`;

  const steamRes = await fetch(url);
  if (!steamRes.ok) {
    return res.status(502).json({ error: `Steam API error: HTTP ${steamRes.status}` });
  }

  const data = await steamRes.json();
  return res.status(200).json(data?.response ?? {});
}
