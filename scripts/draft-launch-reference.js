#!/usr/bin/env node
/*
 Add draft rows to public/launch_reference.json (gitignored) for owned games that don't have
 one yet; the file is created on the first run.
 Reads public/steam_games.json (run `yarn steam:games` first). Platforms come from the Steam
 store, the rating from ProtonDB, and anti-cheat status from AreWeAntiCheatYet. Drafts are
 marked "Draft" in their notes so you can find and finish them.

 Usage:
   node scripts/draft-launch-reference.js [--dry-run]
*/

const fs = require('fs');
const path = require('path');

const LIBRARY = path.resolve(process.cwd(), 'public/steam_games.json');
const REFERENCE = path.resolve(process.cwd(), 'public/launch_reference.json');
const DEFAULT_SETUP =
  'Describe your distro, desktop, GPU and display here. Launch strings assume gamemode and MangoHud are installed.';
const AWACY_URL =
  'https://raw.githubusercontent.com/AreWeAntiCheatYet/AreWeAntiCheatYet/master/games.json';
const BASE_COMMAND = 'gamemoderun mangohud %command%';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getJson(url) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(url).catch(() => null);
    if (res?.ok) return res.json();
    if (res?.status === 404) return null;
    await sleep(10000 * attempt); // Steam store rate-limits at roughly 200 requests / 5 min
  }
  return null;
}

function draftEntry(game, store, protondb, anticheat) {
  const platforms = store?.platforms ?? {};
  const yn = (v) => (v ? 'Y' : 'N');
  const blocked = anticheat && ['Denied', 'Broken'].includes(anticheat.status);
  const notes = ['Draft: verify and replace this note.'];
  if (anticheat) {
    notes.push(`Anti-cheat: ${anticheat.anticheats.join(', ')} (${anticheat.status}).`);
  }
  return {
    appid: game.appid,
    name: game.name,
    win: yn(platforms.windows),
    mac: yn(platforms.mac),
    linux: yn(platforms.linux),
    works: blocked ? 'N' : 'Y',
    runtime: blocked ? 'N/A' : platforms.linux ? 'Native' : 'Proton Experimental',
    protondb: protondb?.tier ?? '—',
    full: blocked ? '—' : BASE_COMMAND,
    opt: '',
    notes: notes.join(' '),
  };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  if (!fs.existsSync(LIBRARY)) {
    console.error('[steam:launch] public/steam_games.json not found. Run `yarn steam:games`.');
    process.exit(1);
  }
  const games = JSON.parse(fs.readFileSync(LIBRARY, 'utf8'))?.response?.games ?? [];
  const reference = fs.existsSync(REFERENCE)
    ? JSON.parse(fs.readFileSync(REFERENCE, 'utf8'))
    : { setup: DEFAULT_SETUP, games: [] };
  const known = new Set(reference.games.map((e) => e.appid));
  const missing = games.filter((g) => g.appid && g.name && !known.has(g.appid));

  if (!missing.length) {
    console.error('[steam:launch] Every owned game already has a row.');
    return;
  }
  console.error(`[steam:launch] Drafting ${missing.length} new game(s)...`);

  const awacy = (await getJson(AWACY_URL)) ?? [];
  const anticheatById = new Map(
    awacy.filter((g) => g.storeIds?.steam).map((g) => [Number(g.storeIds.steam), g])
  );

  for (const game of missing) {
    const details = await getJson(
      `https://store.steampowered.com/api/appdetails?appids=${game.appid}&filters=platforms`
    );
    const store = details?.[game.appid]?.success ? details[game.appid].data : null;
    const protondb = await getJson(
      `https://www.protondb.com/api/v1/reports/summaries/${game.appid}.json`
    );
    const entry = draftEntry(game, store, protondb, anticheatById.get(game.appid));
    reference.games.push(entry);
    console.error(`  ${entry.name}: ${entry.runtime}, ProtonDB ${entry.protondb}`);
    await sleep(1500);
  }

  if (dryRun) {
    console.error('[steam:launch] Dry run; nothing written.');
    return;
  }
  reference.games.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  fs.writeFileSync(REFERENCE, JSON.stringify(reference, null, 2) + '\n', 'utf8');
  console.error(
    `[steam:launch] Wrote ${reference.games.length} rows to public/launch_reference.json`
  );
}

main().catch((err) => {
  console.error('[steam:launch] Error:', err.message || err);
  process.exit(1);
});
