#!/usr/bin/env node
/*
 Resolve SteamID64 from various inputs:
 - 17-digit SteamID64
 - STEAM_X:Y:Z (legacy)
 - [U:1:accountid] (steamID3)
 - Profile URL: https://steamcommunity.com/profiles/<steamid64>
 - Vanity URL:  https://steamcommunity.com/id/<vanity> or just the vanity name

 Uses STEAM_API_KEY from env or .env.local to resolve vanity names via ISteamUser/ResolveVanityURL.
 Options:
   node scripts/resolve-steamid.js <input> [--write-env] [--env-file=.env.local]
*/

const fs = require('fs');
const path = require('path');

const OFFSET = BigInt('76561197960265728');

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

function isSteamId64(input) {
  return /^\d{17}$/.test(input);
}

function isSteamIdLegacy(input) {
  return /^STEAM_\d+:([01]):(\d+)$/.test(input);
}

function isSteamId3(input) {
  return /^\[U:1:(\d+)\]$/.test(input);
}

function fromLegacyTo64(legacy) {
  const m = legacy.match(/^STEAM_\d+:([01]):(\d+)$/);
  if (!m) throw new Error('Invalid legacy SteamID');
  const Y = BigInt(m[1]);
  const Z = BigInt(m[2]);
  return (Z * 2n + Y + OFFSET).toString();
}

function fromId3To64(id3) {
  const m = id3.match(/^\[U:1:(\d+)\]$/);
  if (!m) throw new Error('Invalid SteamID3');
  const accountId = BigInt(m[1]);
  return (accountId + OFFSET).toString();
}

function parseUrl(input) {
  try {
    const u = new URL(input);
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts[0] === 'profiles' && parts[1] && isSteamId64(parts[1])) {
      return { type: 'steamid64', value: parts[1] };
    }
    if (parts[0] === 'id' && parts[1]) {
      return { type: 'vanity', value: parts[1] };
    }
  } catch {}
  return null;
}

async function resolveVanity(vanity, apiKey) {
  if (!apiKey) throw new Error('STEAM_API_KEY is required to resolve vanity URLs.');
  const url = `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=${encodeURIComponent(apiKey)}&vanityurl=${encodeURIComponent(vanity)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Steam API error: HTTP ${res.status}`);
  const data = await res.json();
  if (data?.response?.success === 1 && data.response.steamid) return data.response.steamid;
  const msg = data?.response?.message || 'Unknown error';
  throw new Error(`Failed to resolve vanity: ${msg}`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    console.log(`Usage: node scripts/resolve-steamid.js <input> [--write-env] [--env-file=.env.local]

Input can be:
  - 17-digit SteamID64
  - Legacy format: STEAM_X:Y:Z
  - SteamID3 format: [U:1:accountid]
  - Profile URL: https://steamcommunity.com/profiles/<steamid64>
  - Vanity URL: https://steamcommunity.com/id/<vanity> or just <vanity>
`);
    process.exit(0);
  }

  const input = args.find(a => !a.startsWith('--'));
  const writeEnv = args.includes('--write-env');
  const envFileArg = args.find(a => a.startsWith('--env-file='));
  const envFile = envFileArg ? envFileArg.split('=')[1] : '.env.local';

  loadEnvFile(path.resolve(process.cwd(), envFile));
  const apiKey = process.env.STEAM_API_KEY;

  let steamid64 = null;

  // Direct patterns first
  if (isSteamId64(input)) {
    steamid64 = input;
  } else if (isSteamIdLegacy(input)) {
    steamid64 = fromLegacyTo64(input);
  } else if (isSteamId3(input)) {
    steamid64 = fromId3To64(input);
  } else {
    // URL or vanity
    const parsed = parseUrl(input);
    if (parsed?.type === 'steamid64') {
      steamid64 = parsed.value;
    } else {
      const vanity = parsed?.type === 'vanity' ? parsed.value : input;
      steamid64 = await resolveVanity(vanity, apiKey);
    }
  }

  if (!steamid64) throw new Error('Unable to resolve SteamID64');

  console.log(steamid64);

  if (writeEnv) {
    const envPath = path.resolve(process.cwd(), envFile);
    let content = '';
    try { content = fs.readFileSync(envPath, 'utf8'); } catch {}
    const lines = content ? content.split(/\r?\n/) : [];
    let found = false;
    const updated = lines.map(line => {
      if (line.startsWith('STEAM_ID64=')) {
        found = true;
        return `STEAM_ID64=${steamid64}`;
      }
      return line;
    });
    if (!found) updated.push(`STEAM_ID64=${steamid64}`);
    fs.writeFileSync(envPath, updated.join('\n'), 'utf8');
    console.error(`Wrote STEAM_ID64=${steamid64} to ${envFile}`);
  }
}

main().catch(err => {
  console.error('[resolve-steamid] Error:', err.message || err);
  process.exit(1);
});
