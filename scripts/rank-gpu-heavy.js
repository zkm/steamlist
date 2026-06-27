#!/usr/bin/env node
/*
 Rank owned games by GPU intensity using Steam Store appdetails requirements text.
 Reads public/steam_games.json, fetches appdetails per game, parses min/recommended
 VRAM and GPU model mentions, and prints the most demanding games.

 Usage:
   node scripts/rank-gpu-heavy.js [--top=20] [--in=public/steam_games.json]
*/

const fs = require('fs');
const path = require('path');

function parseReqText(html) {
  const text = String(html || '')
    .replace(/<br\s*\/?>(?=.)/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .toLowerCase();
  const getNum = (s) => (s ? parseFloat(s.replace(',', '.')) : NaN);

  // Isolate the graphics line so VRAM/model numbers aren't confused with RAM/storage lines
  const graphicsLine = (text.match(/graphics:?\s*([^\n]+)/) || [])[1] || '';
  const gpuModels = new Set();
  const modelRe = /\b(gtx|rtx|rx|gt|radeon|arc)\s?(\d{3,4})\s?(ti|super|xt|xtx)?\b/gi;
  let m;
  while ((m = modelRe.exec(graphicsLine))) {
    gpuModels.add(m[0].trim().replace(/\s+/g, ' '));
  }

  // VRAM: explicit "X GB VRAM"/"video ram" labels, or a bare "XGB" trailing a GPU model
  let vramGB = null;
  const labeled = graphicsLine.match(/(\d+[.,]?\d*)\s*gb\s*(?:v(?:ideo)?\s*ram|vram)/);
  const labeledMb = graphicsLine.match(/(\d+[.,]?\d*)\s*mb\s*(?:v(?:ideo)?\s*ram|vram)/);
  if (labeled) {
    vramGB = getNum(labeled[1]);
  } else if (labeledMb) {
    vramGB = getNum(labeledMb[1]) / 1024;
  } else {
    // grab every bare "<n>gb" in the graphics line and take the max as the VRAM figure
    const bare = [...graphicsLine.matchAll(/\b(\d+[.,]?\d*)\s?gb\b/gi)].map((mm) =>
      getNum(mm[1])
    );
    if (bare.length) vramGB = Math.max(...bare);
  }

  return { vramGB, gpuModels: Array.from(gpuModels) };
}

// Score a GPU model by generation + tier within generation. Based on known
// generation ordering (RTX 30xx > RTX 20xx > GTX 16xx > GTX 10xx > GTX 9xx,
// RX 6000 > RX 5000 > RX 500/400), not a fabricated benchmark number.
function gpuTier(modelStr) {
  const m = String(modelStr)
    .toLowerCase()
    .match(/(gtx|rtx|rx|gt)\s?(\d{3,4})\s?(ti|super|xt|xtx)?/);
  if (!m) return 0;
  const brand = m[1];
  const num = parseInt(m[2], 10);
  const suffix = m[3] || '';

  let gen = 0;
  if (brand === 'gt') gen = 5;
  else if (brand === 'gtx') {
    if (num >= 1600 && num < 2000) gen = 25;
    else if (num >= 1000 && num < 1600) gen = 20;
    else if (num >= 900 && num < 1000) gen = 10;
    else gen = 15;
  } else if (brand === 'rtx') {
    if (num >= 5000) gen = 60;
    else if (num >= 4000) gen = 50;
    else if (num >= 3000) gen = 40;
    else gen = 30; // 20xx
  } else if (brand === 'rx') {
    if (num >= 7000) gen = 48;
    else if (num >= 6000) gen = 38;
    else if (num >= 5000) gen = 28;
    else gen = 15; // legacy 400/500 series (Polaris)
  }

  let suffixBonus = 0;
  if (suffix === 'ti') suffixBonus = 2;
  else if (suffix === 'super') suffixBonus = 3;
  else if (suffix === 'xt') suffixBonus = 2;
  else if (suffix === 'xtx') suffixBonus = 4;

  return gen * 100 + (num % 1000) / 10 + suffixBonus;
}

async function fetchAppDetails(appid, retries = 3) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appid}`);
      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      if (!res.ok) return null;
      const json = await res.json();
      const entry = json?.[String(appid)];
      return entry?.success ? entry.data : null;
    } catch {
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  return null;
}

async function main() {
  const args = process.argv.slice(2);
  const topArg = args.find((a) => a.startsWith('--top='));
  const top = topArg ? parseInt(topArg.split('=')[1], 10) : 20;
  const inArg = args.find((a) => a.startsWith('--in='));
  const inFile = inArg ? inArg.split('=')[1] : 'public/steam_games.json';

  const raw = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), inFile), 'utf8'));
  const games = raw.response?.games || [];
  if (!games.length) {
    console.error('No games found in input file.');
    process.exit(1);
  }

  console.error(`[rank-gpu-heavy] Checking ${games.length} games...`);
  const results = [];
  const skipped = [];
  const concurrency = 4;
  let idx = 0;

  async function worker() {
    while (idx < games.length) {
      const i = idx++;
      const g = games[i];
      try {
        const data = await fetchAppDetails(g.appid);
        const pc = data?.pc_requirements;
        const min = parseReqText(pc?.minimum || '');
        const rec = parseReqText(pc?.recommended || '');
        const vramGB =
          min.vramGB != null || rec.vramGB != null
            ? Math.max(min.vramGB ?? 0, rec.vramGB ?? 0)
            : null;
        // Prefer the recommended GPU listing for ranking; fall back to minimum if
        // a game has no recommended spec at all.
        const recModels = rec.gpuModels.length ? rec.gpuModels : min.gpuModels;
        const usedMinOnly = !rec.gpuModels.length && min.gpuModels.length > 0;
        let tier = 0;
        let topModel = null;
        for (const model of recModels) {
          const t = gpuTier(model);
          if (t > tier) {
            tier = t;
            topModel = model;
          }
        }
        if (tier > 0 || vramGB != null) {
          results.push({ appid: g.appid, name: g.name, vramGB, tier, topModel, usedMinOnly });
        } else {
          skipped.push(g.name);
        }
      } catch {
        skipped.push(g.name);
      }
      // light throttle to be polite to the Store API
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));

  // Rank primarily by recommended GPU generation/tier; VRAM only breaks ties
  // between games whose recommended GPU model didn't parse.
  results.sort((a, b) => b.tier - a.tier || (b.vramGB || 0) - (a.vramGB || 0));

  console.log(
    `\nTop ${Math.min(top, results.length)} most GPU-demanding games (ranked by recommended GPU tier):\n`
  );
  results.slice(0, top).forEach((r, n) => {
    const vram = r.vramGB != null ? `${r.vramGB}GB VRAM` : 'VRAM unlisted';
    const model = r.topModel
      ? `recommended: ${r.topModel}${r.usedMinOnly ? ' (min spec only)' : ''}`
      : 'no GPU model listed';
    console.log(`${n + 1}. ${r.name} (appid ${r.appid}) - ${model}, ${vram}`);
  });

  console.error(`\n[rank-gpu-heavy] ${results.length}/${games.length} games had parsable GPU requirement data. ${skipped.length} skipped (no data or no GPU info listed).`);
}

main();
