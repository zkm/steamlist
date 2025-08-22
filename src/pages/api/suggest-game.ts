import type { NextApiRequest, NextApiResponse } from 'next';

const STEAM_API_KEY = process.env.STEAM_API_KEY;
const STEAM_ID64 = process.env.STEAM_ID64;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!STEAM_API_KEY || !STEAM_ID64) {
    return res.status(500).json({ error: 'Missing Steam API credentials.' });
  }

  try {
  const os = (req.query.os as string | undefined)?.toLowerCase();
    const validOs = os === 'windows' || os === 'mac' || os === 'linux' ? os : undefined;
  const ramGB = req.query.ramGB ? Number(req.query.ramGB) : undefined;
  const cores = req.query.cores ? Number(req.query.cores) : undefined;
  const cpuGHz = req.query.cpuGHz ? Number(req.query.cpuGHz) : undefined;
  const gpuVendorQ = (req.query.gpuVendor as string | undefined)?.toLowerCase();
  const gpuVendor = gpuVendorQ === 'nvidia' || gpuVendorQ === 'amd' || gpuVendorQ === 'intel' ? gpuVendorQ : undefined;
  const vramGB = req.query.vramGB ? Number(req.query.vramGB) : undefined;
  const storageGB = req.query.storageGB ? Number(req.query.storageGB) : undefined;
  const wantsAdvancedCheck = [cores, cpuGHz, gpuVendor, vramGB, storageGB].some(v => v !== undefined) || (typeof ramGB === 'number' && !Number.isNaN(ramGB));
  const wantsReqCheck = typeof ramGB === 'number' && !Number.isNaN(ramGB) && ramGB > 0;
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

    // If OS filtering or requirement checks requested, query appdetails for extra data
    let pool = games;
    if (validOs || wantsReqCheck || wantsAdvancedCheck) {
      // Check a reasonable chunk from the least-played list to limit requests
      const chunk = games.slice(0, Math.min(50, games.length));
      const details = await Promise.allSettled(
        chunk.map((g: any) =>
          fetch(`https://store.steampowered.com/api/appdetails?appids=${g.appid}`)
            .then(r => r.json())
            .then((json) => {
              const key = String(g.appid);
              const entry = json?.[key];
              const data = entry?.success ? entry?.data : null;
              const platforms = data?.platforms || null;

              // Helper to normalize requirement text and parse fields
              const parseReqs = (html: string) => {
                const text = String(html)
                  .replace(/<br\s*\/?>(?=.)/gi, '\n')
                  .replace(/<[^>]+>/g, '')
                  .toLowerCase();
                const getNum = (s?: string | null) => s ? parseFloat(s.replace(',', '.')) : NaN;
                // RAM
                let minRamGB: number | null = null;
                const gbRam = text.match(/(\d+[\.,]?\d*)\s*gb\s*ram/);
                const mbRam = text.match(/(\d+[\.,]?\d*)\s*mb\s*ram/);
                if (gbRam) minRamGB = getNum(gbRam[1]);
                else if (mbRam) minRamGB = getNum(mbRam[1]) / 1024;
                // VRAM
                let vramGBReq: number | null = null;
                const gbVram = text.match(/(\d+[\.,]?\d*)\s*gb\s*(?:v(?:ideo)?\s*ram|vram)/);
                if (gbVram) {
                  vramGBReq = getNum(gbVram[1]);
                } else {
                  const mbVram = text.match(/(\d+[\.,]?\d*)\s*mb\s*(?:v(?:ideo)?\s*ram|vram)/);
                  if (mbVram) vramGBReq = getNum(mbVram[1]) / 1024;
                }
                // Storage
                let storageGBReq: number | null = null;
                const gbStorage = text.match(/(\d+[\.,]?\d*)\s*gb\s*(?:available\s*)?(?:space|storage)/);
                const mbStorage = text.match(/(\d+[\.,]?\d*)\s*mb\s*(?:available\s*)?(?:space|storage)/);
                if (gbStorage) storageGBReq = getNum(gbStorage[1]);
                else if (mbStorage) storageGBReq = getNum(mbStorage[1]) / 1024;
                // Cores
                let minCores: number | null = null;
                if (/\bdual\s*-?\s*core\b/.test(text)) minCores = Math.max(minCores ?? 0, 2);
                if (/\bquad\s*-?\s*core\b/.test(text)) minCores = Math.max(minCores ?? 0, 4);
                if (/(hexa|six)[-\s]*core|\b6\s*core\b/.test(text)) minCores = Math.max(minCores ?? 0, 6);
                if (/(octa|eight)[-\s]*core|\b8\s*core\b/.test(text)) minCores = Math.max(minCores ?? 0, 8);
                const numericCores = text.match(/(\d+)\s*(?:core|cores)/);
                if (numericCores) minCores = Math.max(minCores ?? 0, parseInt(numericCores[1], 10));
                // CPU GHz
                let minGHz: number | null = null;
                const ghz = text.match(/(\d+[\.,]?\d*)\s*ghz/);
                if (ghz) minGHz = getNum(ghz[1]);
                // GPU vendor mentions
                const vendors = new Set<'nvidia' | 'amd' | 'intel'>();
                if (/nvidia|geforce/.test(text)) vendors.add('nvidia');
                if (/amd|radeon|ati/.test(text)) vendors.add('amd');
                if (/intel/.test(text)) vendors.add('intel');
                return { minRamGB, vramGBReq, storageGBReq, minCores, minGHz, vendors };
              };

              let reqOk = true;
              if (wantsReqCheck && validOs) {
                // Parse minimum RAM from OS-specific requirements HTML
                const reqFieldMap: Record<'windows' | 'mac' | 'linux', 'pc_requirements' | 'mac_requirements' | 'linux_requirements'> = {
                  windows: 'pc_requirements',
                  mac: 'mac_requirements',
                  linux: 'linux_requirements',
                };
                const fieldName = reqFieldMap[validOs];
                const reqObj = data?.[fieldName];
                const html = reqObj?.minimum || reqObj?.recommended || '';
                const parsed = parseReqs(html);

                if (parsed.minRamGB != null && typeof ramGB === 'number') {
                  reqOk &&= ramGB >= parsed.minRamGB - 0.25;
                }
                if (parsed.minCores != null && typeof cores === 'number') {
                  reqOk &&= cores >= parsed.minCores;
                }
                if (parsed.minGHz != null && typeof cpuGHz === 'number') {
                  reqOk &&= cpuGHz + 0.1 >= parsed.minGHz; // small tolerance
                }
                if (parsed.vramGBReq != null && typeof vramGB === 'number') {
                  reqOk &&= vramGB + 0.1 >= parsed.vramGBReq;
                }
                if (parsed.storageGBReq != null && typeof storageGB === 'number') {
                  reqOk &&= storageGB + 0.1 >= parsed.storageGBReq;
                }
                if (gpuVendor && parsed.vendors && parsed.vendors.size === 1) {
                  // Only enforce when a single vendor is explicitly required
                  reqOk &&= parsed.vendors.has(gpuVendor);
                }
              }

              const platformOk = validOs ? Boolean(platforms?.[validOs]) : true;
              return { appid: g.appid, ok: platformOk && reqOk };
            })
        )
      );
      const okSet = new Set<number>();
      for (const d of details) {
        if (d.status === 'fulfilled' && d.value.ok) okSet.add(d.value.appid);
      }
      const compatible = chunk.filter((g: any) => okSet.has(g.appid));
      // Fallback: if nothing compatible in the chunk, keep original list to still return something
      pool = compatible.length ? compatible : chunk;
    } else {
      // Default: consider the least played group
      pool = games.slice(0, Math.min(10, games.length));
    }

    // Pick a random game among the pool
    const suggestion = pool[Math.floor(Math.random() * pool.length)];
    res.status(200).json({ suggestion, filteredByOs: Boolean(validOs), requirementsChecked: Boolean(wantsReqCheck) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch games.' });
  }
}
