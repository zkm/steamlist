
"use client";
import { useMemo, useState } from "react";
import Image from "next/image";

function formatPlaytime(minutes: number) {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins ? ` ${mins}m` : ""}`;
  }
  return `${minutes} min`;
}

interface Game {
  appid: number;
  name: string;
  playtime_forever: number;
  img_icon_url?: string;
}

export default function SuggestGame() {
  // Detect OS once using useMemo
  const detectedOsFromUA = useMemo(() => {
    if (typeof navigator === 'undefined') return null;
    const ua = navigator.userAgent;
    if (/Windows/i.test(ua)) return 'windows';
    if (/Macintosh|Mac OS X/i.test(ua)) return 'mac';
    if (/Linux/i.test(ua)) return 'linux';
    return null;
  }, []);

  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [osFilter, setOsFilter] = useState(false);
  const [detectedOs, setDetectedOs] = useState<'windows' | 'mac' | 'linux' | null>(detectedOsFromUA);
  const [advFilter, setAdvFilter] = useState(false);
  // Detect hardware capabilities using useMemo
  const detectedCores = useMemo(() => {
    if (typeof navigator === 'undefined') return '';
    const hc = (navigator as { hardwareConcurrency?: number })?.hardwareConcurrency;
    return (typeof hc === 'number' && hc > 0) ? hc : '';
  }, []);

  // Detect GPU vendor using useMemo
  const detectedGpuVendor = useMemo(() => {
    if (typeof navigator === 'undefined' || typeof document === 'undefined') return '';
    try {
      const canvas = document.createElement('canvas');
      const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
      if (gl) {
        const ext = (gl as WebGLRenderingContext & { getExtension(name: string): unknown }).getExtension('WEBGL_debug_renderer_info');
        if (ext && typeof ext === 'object' && ext !== null) {
          const rendererKey = (ext as { UNMASKED_RENDERER_WEBGL?: number }).UNMASKED_RENDERER_WEBGL;
          if (rendererKey) {
            const vendorStr = (gl as WebGLRenderingContext & { getParameter(param: number): unknown }).getParameter(rendererKey) as string;
            const s = (vendorStr || '').toLowerCase();
            if (/nvidia|geforce/.test(s)) return 'nvidia';
            if (/amd|radeon|ati/.test(s)) return 'amd';
            if (/intel/.test(s)) return 'intel';
          }
        }
      }
    } catch (error) {
      console.debug('WebGL GPU detection failed:', error);
    }
    return '';
  }, []);

  const [cores, setCores] = useState<number | ''>(detectedCores);
  const [cpuGHz, setCpuGHz] = useState<number | ''>('');
  const [gpuVendor, setGpuVendor] = useState<'' | 'nvidia' | 'amd' | 'intel'>(detectedGpuVendor);
  const [vramGB, setVramGB] = useState<number | ''>('');
  const [storageGB, setStorageGB] = useState<number | ''>('');

  const fetchSuggestion = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (osFilter && detectedOs) params.set('os', detectedOs);
      // Device Memory API returns approximate RAM in GB (e.g., 8, 16)
      const dm = (navigator as Navigator & { deviceMemory?: number })?.deviceMemory;
      if (osFilter && dm && typeof dm === 'number') params.set('ramGB', String(dm));
      if (advFilter) {
        if (cores !== '' && !Number.isNaN(cores)) params.set('cores', String(cores));
        if (cpuGHz !== '' && !Number.isNaN(cpuGHz)) params.set('cpuGHz', String(cpuGHz));
        if (gpuVendor) params.set('gpuVendor', gpuVendor);
        if (vramGB !== '' && !Number.isNaN(vramGB)) params.set('vramGB', String(vramGB));
        if (storageGB !== '' && !Number.isNaN(storageGB)) params.set('storageGB', String(storageGB));
      }
  const query = params.toString();
  const res = await fetch(`/api/suggest-game${query ? `?${query}` : ''}`);
      const data = await res.json();
      if (data.suggestion) {
        setGame(data.suggestion);
      } else {
        setError(data.error || "No suggestion found.");
      }
    } catch (error) {
      console.error('Failed to fetch suggestion:', error);
      setError("Failed to fetch suggestion.");
    }
    setLoading(false);
  };

  const applyMySpecsPreset = () => {
    // Based on user's neofetch for ThinkPad T480
    setOsFilter(true);
    if (!detectedOs) setDetectedOs('linux');
    setAdvFilter(true);
    setCores(8);
    setCpuGHz(4.2);
    setGpuVendor('intel');
    setVramGB(1.5);
    setStorageGB(80);
  };

  return (
    <section aria-labelledby="suggest-heading" style={{ width: '100%' }}>
      <h2 id="suggest-heading" style={{ fontSize: '1.5rem', marginBottom: 24, textAlign: 'center', color: '#e0e0e0' }}>
        Need help picking a game?
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#c7d2fe', fontSize: 14 }}>
            <input
              type="checkbox"
              checked={osFilter}
              onChange={(e) => setOsFilter(e.target.checked)}
            />
            <span>
              Only show games that work on {detectedOs ? detectedOs : 'my OS'}
            </span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#c7d2fe', fontSize: 14 }}>
            <input
              type="checkbox"
              checked={advFilter}
              onChange={(e) => setAdvFilter(e.target.checked)}
            />
            <span>Check system requirements (CPU/GPU/Storage)</span>
          </label>
        </div>
        {advFilter && (
          <div style={{
            width: '100%',
            maxWidth: 360,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
            marginBottom: 12,
            color: '#cbd5e1',
            fontSize: 14,
          }}>
            <div style={{ gridColumn: '1 / span 2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#94a3b8', fontSize: 12 }}>Optional: enter rough values for stricter filtering</span>
              <button
                type="button"
                onClick={applyMySpecsPreset}
                style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0b1220', color: '#e5e7eb', cursor: 'pointer' }}
                title="Use my laptop's approximate specs"
              >
                Use my specs
              </button>
            </div>
            <div>
              <label>CPU Cores</label>
              <input
                type="number"
                min={1}
                value={cores}
                onChange={(e) => setCores(e.target.value === '' ? '' : Number(e.target.value))}
                style={{ width: '100%', borderRadius: 8, padding: '6px 8px', background: '#111827', border: '1px solid #334155', color: '#e5e7eb' }}
              />
            </div>
            <div>
              <label>CPU GHz</label>
              <input
                type="number"
                step="0.1"
                min={0}
                value={cpuGHz}
                onChange={(e) => setCpuGHz(e.target.value === '' ? '' : Number(e.target.value))}
                style={{ width: '100%', borderRadius: 8, padding: '6px 8px', background: '#111827', border: '1px solid #334155', color: '#e5e7eb' }}
              />
            </div>
            <div>
              <label>GPU Vendor</label>
              <select
                value={gpuVendor}
                onChange={(e) => setGpuVendor(e.target.value as 'nvidia' | 'amd' | 'intel' | '')}
                style={{ width: '100%', borderRadius: 8, padding: '6px 8px', background: '#111827', border: '1px solid #334155', color: '#e5e7eb' }}
              >
                <option value="">(any)</option>
                <option value="nvidia">NVIDIA</option>
                <option value="amd">AMD</option>
                <option value="intel">Intel</option>
              </select>
            </div>
            <div>
              <label>VRAM (GB)</label>
              <input
                type="number"
                step="0.5"
                min={0}
                value={vramGB}
                onChange={(e) => setVramGB(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g., 6"
                style={{ width: '100%', borderRadius: 8, padding: '6px 8px', background: '#111827', border: '1px solid #334155', color: '#e5e7eb' }}
              />
            </div>
            <div style={{ gridColumn: '1 / span 2' }}>
              <label>Available Storage (GB)</label>
              <input
                type="number"
                step="1"
                min={0}
                value={storageGB}
                onChange={(e) => setStorageGB(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Approximate free space"
                style={{ width: '100%', borderRadius: 8, padding: '6px 8px', background: '#111827', border: '1px solid #334155', color: '#e5e7eb' }}
              />
            </div>
            <div style={{ gridColumn: '1 / span 2', color: '#94a3b8', fontSize: 12 }}>
              Tip: Some values can’t be detected by the browser—enter rough numbers if you want stricter filtering.
            </div>
          </div>
        )}
        <button
          onClick={fetchSuggestion}
          disabled={loading}
          style={{
            padding: '0.9rem 1.5rem',
            borderRadius: 14,
            border: '1px solid #0ea5e955',
            background: loading
              ? 'linear-gradient(90deg, #6b7280 0%, #9ca3af 100%)'
              : 'linear-gradient(90deg, #0ea5e9 0%, #22d3ee 100%)',
            color: '#0b1220',
            fontWeight: 800,
            letterSpacing: 0.2,
            fontSize: '1rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 8px 24px rgba(34,211,238,0.18)',
            outline: 'none',
            marginBottom: 24,
            transition: 'transform 0.06s ease, background 0.2s, box-shadow 0.2s',
          }}
          aria-label="Suggest a game to play"
        >
          {loading ? "Finding a pick…" : "Get Suggestion"}
        </button>
        {error && <p style={{ color: "#ff4d4f", marginBottom: 16 }}>{error}</p>}
        {game && (
          <div
            style={{
              background: 'linear-gradient(135deg, #23232a 60%, #35354a 100%)',
              borderRadius: 18,
              padding: 32,
              textAlign: 'center',
              boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
              marginTop: 8,
              width: '100%',
              maxWidth: 340,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
            }}
            aria-live="polite"
          >
            {game.img_icon_url ? (
              <Image
                src={`https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`}
                alt={game.name}
                width={72}
                height={72}
                style={{ objectFit: 'cover', borderRadius: '8px', border: "3px solid #0078d4", background: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.10)" }}
                unoptimized
              />
            ) : (
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#444', display: 'inline-block' }} aria-hidden="true" />
            )}
            <div style={{ fontWeight: 'bold', fontSize: '1.3rem', color: '#e0e0e0', marginTop: 8 }}>{game.name}</div>
            <div style={{ fontSize: 15, color: '#aaa' }}>Playtime: {formatPlaytime(game.playtime_forever)}</div>
            <button
              style={{
                marginTop: 8,
                padding: '0.5rem 1.25rem',
                borderRadius: 24,
                border: '2px solid #0078d4',
                background: 'transparent',
                color: '#0078d4',
                fontWeight: 'bold',
                fontSize: '1rem',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                transition: 'background 0.2s, box-shadow 0.2s, color 0.2s',
                outline: 'none',
              }}
              aria-label={`View ${game.name} on Steam`}
              onMouseOver={e => {
                e.currentTarget.style.background = '#0078d4';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#0078d4';
              }}
              onFocus={e => e.currentTarget.style.boxShadow = '0 0 0 3px #00b4d8'}
              onBlur={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.10)'}
              onClick={() => window.open(`https://store.steampowered.com/app/${game.appid}`, '_blank', 'noopener,noreferrer')}
            >
              View on Steam
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
