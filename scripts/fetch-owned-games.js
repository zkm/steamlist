#!/usr/bin/env node
/*
 Fetch your Steam owned games and write to public/steam_games.json
 Requires STEAM_API_KEY and STEAM_ID64 (17-digit) in environment or .env.local

 Usage:
   node scripts/fetch-owned-games.js [--out=public/steam_games.json]
*/

const fs = require('fs');
const path = require('path');

function loadEnvFile(envFilePath) {
  try {
    const raw = fs.readFileSync(envFilePath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch (e) {
    // ignore missing file
  }
}

async function main() {
  const args = process.argv.slice(2);
  const outArg = args.find(a => a.startsWith('--out='));
  const outFile = outArg ? outArg.split('=')[1] : 'public/steam_games.json';

  // Load .env.local if present to populate process.env
  loadEnvFile(path.resolve(process.cwd(), '.env.local'));

  const STEAM_API_KEY = process.env.STEAM_API_KEY;
  const STEAM_ID64 = process.env.STEAM_ID64;

  if (!STEAM_API_KEY || !STEAM_ID64) {
    console.error('Missing STEAM_API_KEY or STEAM_ID64. Add them to .env.local or your environment.');
    process.exit(1);
  }

  const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${encodeURIComponent(STEAM_API_KEY)}&steamid=${encodeURIComponent(STEAM_ID64)}&include_appinfo=true&include_played_free_games=true`;

  console.error('[steam:games] Fetching owned games...');
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`[steam:games] Steam API error: HTTP ${res.status}`);
    process.exit(2);
  }
  const data = await res.json();
  const games = data?.response?.games || [];
  const count = Number(data?.response?.game_count ?? games.length);

  if (!games.length) {
    console.error('[steam:games] No games returned. If your profile or game details are private, consider making Game details public, or use the sample file:');
    console.error('  yarn steam:games:sample');
  }

  const outPath = path.resolve(process.cwd(), outFile);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8');
  console.error(`[steam:games] Wrote ${games.length} games (reported count: ${count}) to ${outFile}`);
}

main().catch(err => {
  console.error('[steam:games] Error:', err.message || err);
  process.exit(1);
});
