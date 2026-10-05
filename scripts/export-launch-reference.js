#!/usr/bin/env node
/*
 Export public/launch_reference.json as one self-contained HTML file you can send to someone.
 No server or network needed to view it (fonts fall back to system fonts offline).
 The output contains your library, so it is written to the gitignored exports/ folder.

 Usage:
   node scripts/export-launch-reference.js [--out=exports/launch-reference.html]
*/

const fs = require('fs');
const path = require('path');

const SOURCE = path.resolve(process.cwd(), 'public/launch_reference.json');

const STYLE = `
:root{--bg:#F3F5F8;--panel:#FFF;--ink:#1C2430;--muted:#5F6B7B;--line:#DCE2EA;--accent:#2F5D8A;
--y:#17633E;--y-bg:#D9F0E3;--n:#9B2226;--n-bg:#F8DCDC;--code-bg:#EEF2F7;--row-alt:#F8FAFC}
@media (prefers-color-scheme:dark){:root{--bg:#121821;--panel:#18202B;--ink:#E4E9F0;--muted:#97A3B4;
--line:#2A3442;--accent:#7FA9D6;--y:#7DD3A3;--y-bg:#173526;--n:#F2A0A2;--n-bg:#3A1C1E;--code-bg:#1F2833;--row-alt:#1B2430}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 "Atkinson Hyperlegible",system-ui,-apple-system,"Segoe UI",sans-serif}
header{padding:2rem clamp(1rem,3vw,2.5rem) 1rem;max-width:80rem}
h1{font-size:clamp(1.6rem,3vw,2.2rem);line-height:1.15;margin:0 0 .4rem}
.setup{color:var(--muted);margin:0;max-width:70ch}
.toolbar{position:sticky;top:0;z-index:3;background:var(--bg);display:flex;flex-wrap:wrap;gap:.75rem;align-items:center;
padding:.75rem clamp(1rem,3vw,2.5rem);border-bottom:1px solid var(--line)}
.search{flex:1 1 16rem;max-width:24rem;padding:.55rem .8rem;border:1px solid var(--line);border-radius:.5rem;background:var(--panel);color:var(--ink);font:inherit}
.filters{display:flex;flex-wrap:wrap;gap:.35rem}
.filters button{font:inherit;font-size:.9rem;padding:.4rem .75rem;border-radius:999px;border:1px solid var(--line);background:var(--panel);color:var(--ink);cursor:pointer}
.filters button[aria-pressed="true"]{background:var(--accent);border-color:var(--accent);color:var(--panel)}
.count{color:var(--muted);font-size:.9rem;margin-left:auto}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.wrap{overflow-x:auto;padding:0 clamp(1rem,3vw,2.5rem) 3rem}
table{border-collapse:collapse;width:100%;min-width:82rem;background:var(--panel);font-size:.92rem}
thead th{background:var(--panel);text-align:left;padding:.7rem .6rem;border-bottom:2px solid var(--ink);white-space:nowrap}
thead th button{all:unset;cursor:pointer;font-weight:700}
th[aria-sort="ascending"] button::after{content:" ▲"}th[aria-sort="descending"] button::after{content:" ▼"}
td{padding:.6rem;border-bottom:1px solid var(--line);vertical-align:top}
tbody tr:nth-child(even){background:var(--row-alt)}
td.c{text-align:center}
.game{font-weight:700;min-width:12rem}.game a{color:inherit;text-decoration:none}.game a:hover{text-decoration:underline}
.game small{display:block;font-weight:400;color:var(--muted)}
.yn{display:inline-block;min-width:1.8rem;padding:.1rem .4rem;border-radius:.35rem;font-weight:700;text-align:center}
.yn.Y{color:var(--y);background:var(--y-bg)}.yn.N{color:var(--n);background:var(--n-bg)}.yn.d{color:var(--muted)}
.rt,.tier{white-space:nowrap}.tier a{color:var(--accent);text-transform:capitalize}
.cmd{display:flex;gap:.5rem;align-items:flex-start;min-width:24rem}.cmd.opt{min-width:12rem}
code{font-family:ui-monospace,"JetBrains Mono","SFMono-Regular",Menlo,monospace;font-size:.82rem;background:var(--code-bg);
padding:.35rem .5rem;border-radius:.35rem;display:block;white-space:pre-wrap;overflow-wrap:break-word;flex:1}
.copy{font:inherit;font-size:.8rem;padding:.3rem .6rem;border-radius:.4rem;border:1px solid var(--line);background:var(--panel);color:var(--accent);cursor:pointer;white-space:nowrap}
.copy.done{background:var(--y-bg);color:var(--y);border-color:transparent}
.notes{min-width:22rem;max-width:36rem}
.legend{max-width:80rem;padding:0 clamp(1rem,3vw,2.5rem) 2.5rem;color:var(--muted);font-size:.92rem}
.legend p{max-width:75ch;margin:.4rem 0}
`;

// Runs in the exported page. Kept in sync by hand with src/lib/launchReference.ts.
const SCRIPT = `
const tbody=document.querySelector("tbody"),count=document.querySelector(".count"),search=document.querySelector(".search");
const TIERS=["platinum","gold","silver","bronze","borked","pending"];
const tier=t=>{const i=TIERS.indexOf(String(t).toLowerCase());return i<0?TIERS.length:i};
let filter="all",sortKey="name",dir=1;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const yn=v=>'<span class="yn '+(v==="Y"||v==="N"?v:"d")+'">'+esc(v)+'</span>';
const cmd=(v,cls)=>v&&v!=="—"?'<div class="cmd '+(cls||"")+'"><code>'+esc(v)+'</code><button class="copy" data-c="'+esc(v)+'">Copy</button></div>':'<span class="yn d">—</span>';
const cmp=(a,b,k)=>k==="protondb"?tier(a.protondb)-tier(b.protondb):String(a[k]).localeCompare(String(b[k]),undefined,{sensitivity:"base",numeric:true});
function pass(r){
 if(filter==="native"&&r.runtime!=="Native")return false;
 if(filter==="proton"&&!r.runtime.startsWith("Proton"))return false;
 if(filter==="blocked"&&r.works!=="N")return false;
 const q=search.value.trim().toLowerCase();
 return !q||(r.name+" "+r.notes).toLowerCase().includes(q);
}
function render(){
 const list=DATA.filter(pass).sort((a,b)=>cmp(a,b,sortKey)*dir||cmp(a,b,"name"));
 tbody.innerHTML=list.map(r=>'<tr><td class="game"><a href="https://store.steampowered.com/app/'+r.appid+'">'+esc(r.name)+'</a><small>App '+r.appid+'</small></td>'
  +'<td class="c">'+yn(r.win)+'</td><td class="c">'+yn(r.mac)+'</td><td class="c">'+yn(r.linux)+'</td><td class="c">'+yn(r.works)+'</td>'
  +'<td class="rt">'+esc(r.runtime)+'</td><td class="tier"><a href="https://www.protondb.com/app/'+r.appid+'">'+esc(r.protondb)+'</a></td>'
  +'<td>'+cmd(r.full)+'</td><td>'+cmd(r.opt,"opt")+'</td><td class="notes">'+esc(r.notes)+'</td></tr>').join("");
 count.textContent=list.length+" of "+DATA.length+" games";
}
document.querySelectorAll(".filters button").forEach(b=>b.addEventListener("click",()=>{
 document.querySelectorAll(".filters button").forEach(x=>x.setAttribute("aria-pressed","false"));
 b.setAttribute("aria-pressed","true");filter=b.dataset.f;render();}));
search.addEventListener("input",render);
document.querySelectorAll("th[data-k]").forEach(th=>th.querySelector("button").addEventListener("click",()=>{
 const k=th.dataset.k;if(sortKey===k){dir=-dir}else{sortKey=k;dir=1}
 document.querySelectorAll("th").forEach(t=>t.removeAttribute("aria-sort"));
 th.setAttribute("aria-sort",dir===1?"ascending":"descending");render();}));
tbody.addEventListener("click",async e=>{const b=e.target.closest(".copy");if(!b)return;
 try{await navigator.clipboard.writeText(b.dataset.c)}catch(err){const t=document.createElement("textarea");t.value=b.dataset.c;document.body.appendChild(t);t.select();try{document.execCommand("copy")}catch(_){}t.remove()}
 b.textContent="Copied";b.classList.add("done");setTimeout(()=>{b.textContent="Copy";b.classList.remove("done")},1400);});
render();
`;

const escapeHtml = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]
  );

function buildHtml({ setup, games }) {
  // Escape "<" so no note can close the <script> tag early.
  const data = JSON.stringify(games).replace(/</g, '\\u003c');
  const th = (key, label) =>
    `<th data-k="${key}"${key === 'name' ? ' aria-sort="ascending"' : ''}><button>${label}</button></th>`;
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Steam Library: Linux Launch Reference</title>
<link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap" rel="stylesheet">
<style>${STYLE}</style></head><body>
<header>
<h1>Steam Library: Linux Launch Reference</h1>
<p class="setup">${escapeHtml(setup)} Sorted by name; click a column heading to re-sort.</p>
</header>
<div class="toolbar">
<input class="search" type="search" placeholder="Search games or notes" aria-label="Search games or notes">
<div class="filters" role="group" aria-label="Filter">
<button data-f="all" aria-pressed="true">All</button>
<button data-f="native" aria-pressed="false">Native</button>
<button data-f="proton" aria-pressed="false">Proton</button>
<button data-f="blocked" aria-pressed="false">Blocked</button>
</div>
<span class="count" aria-live="polite"></span>
</div>
<div class="wrap"><table>
<thead><tr>
${th('name', 'Game')}${th('win', 'Windows')}${th('mac', 'Mac')}${th('linux', 'Linux')}${th('works', 'Works on Linux')}${th('runtime', 'Runtime')}${th('protondb', 'ProtonDB')}
<th>Launch options (full)</th><th>Optional flags</th><th>Notes</th>
</tr></thead><tbody></tbody></table></div>
<div class="legend">
<p>Windows, Mac and Linux show whether Steam offers a build for that system; Linux means a native build. ProtonDB is the community rating and links to the reports.</p>
<p>On KDE Plasma with fractional scaling, set System Settings → Display → Legacy Applications to “Apply scaling themselves” so XWayland games render at full native resolution without gamescope. For native-build games set to Proton, force it in Steam under Properties → Compatibility.</p>
<p>Optional flags are already part of the full string. They skip intros and launchers and do nothing if a launcher is already disabled.</p>
<p>Exported ${new Date().toISOString().slice(0, 10)}.</p>
</div>
<script>
const DATA=${data};
${SCRIPT}</script></body></html>
`;
}

function main() {
  const outArg = process.argv.slice(2).find((a) => a.startsWith('--out='));
  const outFile = outArg ? outArg.split('=')[1] : 'exports/launch-reference.html';
  if (!fs.existsSync(SOURCE)) {
    console.error(
      '[steam:launch:export] public/launch_reference.json not found. Run `yarn steam:launch`.'
    );
    process.exit(1);
  }
  const reference = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
  const outPath = path.resolve(process.cwd(), outFile);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, buildHtml(reference), 'utf8');
  console.error(`[steam:launch:export] Wrote ${reference.games.length} games to ${outFile}`);
}

main();
