#!/usr/bin/env node
/*
 Export public/launch_reference.json as one self-contained HTML file you can send to someone.
 No server or network needed to view it (fonts fall back to system fonts offline).
 The output contains your library, so it is written to the gitignored exports/ folder.

 The page uses the same launch-string, filter and sort logic as /launch-reference:
 src/lib/launchReference.ts is transpiled into it, so the two can't drift apart.
 Viewers' settings, notes and statuses are saved in their own browser.

 Usage:
   node scripts/export-launch-reference.js [--out=exports/launch-reference.html]
*/

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const SOURCE = path.resolve(process.cwd(), 'public/launch_reference.json');
const LIB = path.resolve(process.cwd(), 'src/lib/launchReference.ts');

const STYLE = `
:root{--bg:#F3F5F8;--panel:#FFF;--ink:#1C2430;--muted:#5F6B7B;--line:#DCE2EA;--accent:#2F5D8A;--accent-soft:#E1EAF4;
--y:#17633E;--y-bg:#D9F0E3;--n:#9B2226;--n-bg:#F8DCDC;--warn:#8A5A00;--code-bg:#EEF2F7;--row-alt:#F8FAFC}
@media (prefers-color-scheme:dark){:root{--bg:#121821;--panel:#18202B;--ink:#E4E9F0;--muted:#97A3B4;--line:#2A3442;
--accent:#7FA9D6;--accent-soft:#1E2E42;--y:#7DD3A3;--y-bg:#173526;--n:#F2A0A2;--n-bg:#3A1C1E;--warn:#E5C07B;--code-bg:#1F2833;--row-alt:#1B2430}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 "Atkinson Hyperlegible",system-ui,-apple-system,"Segoe UI",sans-serif}
header{padding:2rem clamp(1rem,3vw,2.5rem) 1rem;max-width:80rem}
h1{font-size:clamp(1.6rem,3vw,2.2rem);line-height:1.15;margin:0 0 .4rem}
header p{color:var(--muted);margin:.3rem 0;max-width:75ch}
.actions{display:flex;gap:.6rem;align-items:center;flex-wrap:wrap;margin-top:1rem}
.toolbar{position:sticky;top:0;z-index:3;background:var(--bg);display:flex;flex-wrap:wrap;gap:.75rem;align-items:center;
padding:.75rem clamp(1rem,3vw,2.5rem);border-bottom:1px solid var(--line)}
.search{flex:1 1 16rem;max-width:24rem;padding:.55rem .8rem;border:1px solid var(--line);border-radius:.5rem;background:var(--panel);color:var(--ink);font:inherit}
.filters{display:flex;flex-wrap:wrap;gap:.6rem}
.ms{position:relative;font-size:.9rem}
.ms summary{list-style:none;cursor:pointer;color:var(--muted);background:var(--panel);border:1px solid var(--line);border-radius:.45rem;padding:.4rem .6rem}
.ms summary::-webkit-details-marker{display:none}
.ms summary::after{content:" ▾"}
.ms-val{color:var(--ink)}
.ms-menu{position:absolute;z-index:5;top:calc(100% + .3rem);left:0;background:var(--panel);border:1px solid var(--line);border-radius:.45rem;padding:.4rem;display:grid;gap:.2rem;min-width:11rem;box-shadow:0 6px 18px rgb(0 0 0 / .12)}
.ms-menu label{display:flex;gap:.5rem;align-items:center;padding:.3rem .4rem;border-radius:.3rem;cursor:pointer}
.ms-menu label:hover{background:var(--row-alt)}
.count{color:var(--muted);font-size:.9rem;margin-left:auto}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.wrap{overflow-x:auto;padding:0 clamp(1rem,3vw,2.5rem) 3rem}
table{border-collapse:collapse;width:100%;min-width:84rem;background:var(--panel);font-size:.92rem}
thead th{background:var(--panel);text-align:left;padding:.7rem .6rem;border-bottom:2px solid var(--ink);white-space:nowrap}
thead th button{all:unset;cursor:pointer;font-weight:700}
th[aria-sort="ascending"] button::after{content:" ▲"}th[aria-sort="descending"] button::after{content:" ▼"}
td{padding:.6rem;border-bottom:1px solid var(--line);vertical-align:top}
tbody tr:nth-child(even){background:var(--row-alt)}
td.c{text-align:center}
.game{font-weight:700;min-width:12rem}.game a{color:inherit;text-decoration:none}.game a:hover{text-decoration:underline}
.game small{display:block;font-weight:400;color:var(--muted)}
.custom{margin-left:.35rem;font-size:.72rem;font-weight:700;color:var(--accent);background:var(--accent-soft);padding:0 .35rem;border-radius:.3rem;vertical-align:middle}
.yn{display:inline-block;min-width:1.8rem;padding:.1rem .4rem;border-radius:.35rem;font-weight:700;text-align:center}
.yn.Y{color:var(--y);background:var(--y-bg)}.yn.N{color:var(--n);background:var(--n-bg)}.yn.d{color:var(--muted)}
.chip{display:inline-block;padding:.1rem .5rem;border-radius:.35rem;font-weight:700;font-size:.82rem;white-space:nowrap;color:var(--ink);background:var(--code-bg)}
.chip.Native,.chip.Verified{color:var(--y);background:var(--y-bg)}.chip.Proton{color:var(--accent);background:var(--accent-soft)}
.chip.Blocked{color:var(--n);background:var(--n-bg)}.chip.Unverified{color:var(--muted)}
.force{display:block;font-size:.78rem;color:var(--warn);margin-top:.25rem}
.tier{white-space:nowrap}.tier a{color:var(--accent);text-transform:capitalize}
.cmd{display:flex;gap:.5rem;align-items:flex-start;min-width:24rem}.cmd.opt{min-width:10rem}
code{font-family:ui-monospace,"JetBrains Mono","SFMono-Regular",Menlo,monospace;font-size:.82rem;background:var(--code-bg);
padding:.35rem .5rem;border-radius:.35rem;display:block;white-space:pre-wrap;overflow-wrap:break-word;flex:1}
.btn,.copy,.edit{font:inherit;border-radius:.4rem;border:1px solid var(--line);background:var(--panel);color:var(--accent);cursor:pointer;white-space:nowrap}
.btn{font-size:.9rem;padding:.45rem .8rem;color:var(--ink)}.btn.primary{background:var(--accent);border-color:var(--accent);color:var(--panel)}
.btn:disabled{opacity:.5;cursor:not-allowed}
.copy,.edit{font-size:.8rem;padding:.3rem .6rem}
.copy.done{background:var(--y-bg);color:var(--y);border-color:transparent}
.notes{min-width:22rem;max-width:36rem}
.warn{color:var(--warn);font-size:.9rem}
.legend{max-width:80rem;padding:0 clamp(1rem,3vw,2.5rem) 2.5rem;color:var(--muted);font-size:.92rem}
.legend p{max-width:75ch;margin:.4rem 0}
dialog{border:1px solid var(--line);border-radius:.7rem;background:var(--panel);color:var(--ink);padding:0;width:min(42rem,calc(100vw - 2rem));max-height:calc(100dvh - 2rem)}
dialog::backdrop{background:rgb(10 15 25 / .45)}
.dlg-head{padding:1rem 1.25rem .5rem;border-bottom:1px solid var(--line)}
.dlg-head h2{margin:0;font-size:1.25rem}.dlg-head p{margin:.2rem 0 .4rem;color:var(--muted);font-size:.88rem}
.dlg-body{padding:1rem 1.25rem;display:grid;gap:1rem}
.dlg-foot{display:flex;gap:.5rem;justify-content:flex-end;padding:.75rem 1.25rem;border-top:1px solid var(--line)}
.dlg-foot .left{margin-right:auto}
.opts{display:grid;grid-template-columns:repeat(auto-fit,minmax(15rem,1fr));gap:1rem 1.5rem}
.opt{display:grid;gap:.3rem;align-content:start}
.chk{display:inline-flex;align-items:center;gap:.5rem;font-weight:700;cursor:pointer}
.desc{margin:0;color:var(--muted);font-size:.88rem;max-width:44ch}
.sub{display:grid;gap:.3rem;font-size:.88rem;color:var(--muted)}
select,textarea,input[type=text]{font:inherit;color:var(--ink);background:var(--panel);border:1px solid var(--line);border-radius:.45rem;padding:.4rem .5rem}
select{max-width:14rem}textarea{min-height:6rem;resize:vertical}
fieldset{border:1px solid var(--line);border-radius:.5rem;padding:.75rem 1rem}fieldset:disabled{opacity:.55}
legend{color:var(--muted);font-size:.88rem}
.field{display:grid;gap:.3rem;font-weight:700}.field .hint{font-weight:400;color:var(--muted);font-size:.85rem}
.flag-in{display:flex;gap:.5rem}.flag-in input{flex:1;font-family:ui-monospace,monospace}
.flags{display:flex;flex-wrap:wrap;gap:.35rem}
.flags span{display:inline-flex;gap:.4rem;align-items:center;font-family:ui-monospace,monospace;font-size:.82rem;background:var(--code-bg);padding:.2rem .45rem;border-radius:.35rem}
.flags button{all:unset;cursor:pointer;color:var(--n)}
`;

const SETTINGS_FIELDS = (resolutions) => `<div class="opts">
<div class="opt"><label class="chk"><input type="checkbox" data-k="gamescope"> Use Gamescope</label>
<p class="desc">Runs the game in a gamescope window at a fixed size. Needed for sharp games under GNOME fractional scaling; on KDE, the Legacy Applications setting below does the same job.</p>
<label class="sub">Output resolution<select data-k="resolution">${resolutions
  .map((r) => `<option value="${r}">${r.replace('x', ' × ')}</option>`)
  .join('')}</select></label>
<label class="sub" style="display:flex;gap:.5rem"><input type="checkbox" data-k="grabCursor"> Force cursor grab</label></div>
<div class="opt"><label class="chk"><input type="checkbox" data-k="gamemode"> Use GameMode</label>
<p class="desc">Runs games through gamemoderun for CPU governor and priority tweaks.</p></div>
<div class="opt"><label class="chk"><input type="checkbox" data-k="mangohud"> Use MangoHud</label>
<p class="desc">Performance overlay: FPS, frame times, CPU/GPU load and temperatures.</p></div>
<div class="opt"><label class="chk"><input type="checkbox" data-k="optionalFlags"> Include Optional Flags</label>
<p class="desc">Adds each game's optional flags (intro and launcher skips, game tweaks) to its launch string.</p></div>
</div>`;

// Runs in the exported page; serialized with toString(), so it must not reference anything
// outside its arguments.
function page(LR, DATA, DEFAULTS) {
  const KEY = 'steamlist:launch-reference';
  const $ = (id) => document.getElementById(id);
  const esc = (s) =>
    String(s).replace(
      /[&<>"]/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]
    );
  const byId = Object.fromEntries(DATA.map((e) => [e.appid, e]));
  let saved;
  try {
    saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {};
  } catch {
    saved = {};
  }
  let settings = { ...LR.DEFAULT_SETTINGS, ...DEFAULTS, ...saved.settings };
  let overrides = saved.games || {};
  let sortKey = 'name';
  let dir = 1;

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ settings, games: overrides }));
      $('nosave').hidden = true;
    } catch {
      $('nosave').hidden = false;
    }
  }

  const yn = (v) => `<span class="yn ${v === 'Y' || v === 'N' ? v : 'd'}">${esc(v)}</span>`;
  const cmd = (v, cls) =>
    v && v !== '—'
      ? `<div class="cmd ${cls || ''}"><code>${esc(v)}</code><button class="copy" data-c="${esc(v)}">Copy</button></div>`
      : '<span class="yn d">—</span>';
  const picked = (id) => [...document.querySelectorAll(`#${id} input:checked`)].map((i) => i.value);

  function render() {
    const filters = {
      query: $('search').value,
      status: picked('f-status'),
      os: picked('f-os'),
      runtime: picked('f-runtime'),
    };
    const rows = LR.selectRows(DATA, settings, overrides, filters, sortKey, dir);
    $('rows').innerHTML = rows
      .map(({ entry: r, view: v }) => {
        const kind = LR.runtimeKind(r);
        const runtime = kind
          ? `<span class="chip ${kind}">${esc(kind === 'Proton' ? r.runtime : kind)}</span>${
              kind === 'Proton' && r.linux === 'Y' ? '<span class="force">Force Proton</span>' : ''
            }`
          : `<span class="yn d">${esc(r.runtime)}</span>`;
        return `<tr><td class="game"><a href="https://store.steampowered.com/app/${r.appid}">${esc(r.name)}</a>${
          v.custom ? '<span class="custom">Custom</span>' : ''
        }<small>App ID: ${r.appid}</small></td>
<td><span class="chip ${v.status}">${v.status}</span></td>
<td class="c">${yn(r.win)}</td><td class="c">${yn(r.mac)}</td><td class="c">${yn(r.linux)}</td>
<td>${runtime}</td><td class="tier"><a href="https://www.protondb.com/app/${r.appid}">${esc(r.protondb)}</a></td>
<td>${cmd(v.launch)}</td><td>${cmd(LR.isLaunchable(r) ? v.flags.join(' ') : '', 'opt')}</td>
<td class="notes">${esc(v.notes)}</td><td><button class="edit" data-id="${r.appid}" aria-label="Edit ${esc(r.name)}">Edit</button></td></tr>`;
      })
      .join('');
    $('count').textContent = `${rows.length} of ${DATA.length} games`;
  }

  // Settings fields share data-k names with LaunchSettings.
  function readSettings(root) {
    const out = {};
    root.querySelectorAll('[data-k]').forEach((el) => {
      out[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value;
    });
    return out;
  }
  function writeSettings(root, value) {
    root.querySelectorAll('[data-k]').forEach((el) => {
      if (el.type === 'checkbox') el.checked = !!value[el.dataset.k];
      else el.value = value[el.dataset.k];
    });
    syncDisabled(root);
  }
  function syncDisabled(root, off = false) {
    const gs = root.querySelector('[data-k="gamescope"]').checked;
    root.querySelectorAll('[data-k]').forEach((el) => {
      el.disabled =
        off || (!gs && (el.dataset.k === 'resolution' || el.dataset.k === 'grabCursor'));
    });
  }

  // Default Launch Parameters
  const gRoot = $('dlg-defaults').querySelector('.opts');
  $('open-defaults').addEventListener('click', () => {
    writeSettings(gRoot, settings);
    $('dlg-defaults').showModal();
  });
  gRoot.addEventListener('change', () => {
    syncDisabled(gRoot);
    settings = { ...settings, ...readSettings(gRoot) };
    persist();
    render();
  });

  // Per-game editor
  const eRoot = $('e-set').querySelector('.opts');
  let current = null;
  let flags = [];
  const flagsOn = () =>
    $('e-custom').checked && eRoot.querySelector('[data-k="optionalFlags"]').checked;
  function editorPreview() {
    const entry = byId[current];
    const override = $('e-custom').checked
      ? { launch: { ...settings, ...readSettings(eRoot), flags } }
      : undefined;
    $('e-preview').textContent = LR.resolveGame(entry, settings, override).launch;
  }
  function renderFlags() {
    const on = flagsOn();
    $('e-flag-in').disabled = !on;
    $('e-flag-add').disabled = !on;
    $('e-flags').innerHTML = flags
      .map(
        (f, i) =>
          `<span>${esc(f)}<button type="button" data-i="${i}" aria-label="Remove ${esc(f)}"${on ? '' : ' disabled'}>✕</button></span>`
      )
      .join('');
  }
  function addFlags() {
    for (const f of LR.parseFlags($('e-flag-in').value)) if (!flags.includes(f)) flags.push(f);
    $('e-flag-in').value = '';
    renderFlags();
    editorPreview();
  }
  function openEditor(id) {
    current = id;
    const entry = byId[id];
    const view = LR.resolveGame(entry, settings, overrides[id]);
    $('e-title').textContent = entry.name;
    $('e-sub').textContent = `App ID: ${entry.appid} · ${entry.runtime}`;
    $('e-status').value = view.status;
    $('e-launch').hidden = !LR.isLaunchable(entry);
    $('e-custom').checked = view.custom;
    writeSettings(eRoot, view.settings);
    syncDisabled(eRoot, !view.custom);
    flags = [...view.flags];
    $('e-flag-in').value = '';
    $('e-notes').value = view.notes;
    renderFlags();
    editorPreview();
    $('dlg-game').showModal();
  }
  function setOverride(next) {
    overrides = { ...overrides };
    if (Object.keys(next).length) overrides[current] = next;
    else delete overrides[current];
    persist();
    render();
    $('dlg-game').close();
  }
  $('e-custom').addEventListener('change', () => {
    syncDisabled(eRoot, !$('e-custom').checked);
    renderFlags();
    editorPreview();
  });
  eRoot.addEventListener('change', () => {
    syncDisabled(eRoot);
    renderFlags();
    editorPreview();
  });
  $('e-flag-add').addEventListener('click', addFlags);
  $('e-flag-in').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addFlags();
    }
  });
  $('e-flags').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-i]');
    if (!b || b.disabled) return;
    flags.splice(Number(b.dataset.i), 1);
    renderFlags();
    editorPreview();
  });
  $('e-save').addEventListener('click', () =>
    setOverride(
      LR.makeOverride(byId[current], settings, {
        status: $('e-status').value,
        notes: $('e-notes').value,
        custom: $('e-custom').checked,
        settings: { ...settings, ...readSettings(eRoot) },
        flags,
      })
    )
  );
  $('e-reset').addEventListener('click', () => setOverride({}));

  // Backup & Restore
  $('open-backup').addEventListener('click', () => {
    $('io-msg').textContent = '';
    $('dlg-backup').showModal();
  });
  $('export-btn').addEventListener('click', () => {
    const backup = {
      format: LR.BACKUP_FORMAT,
      version: 1,
      exported: new Date().toISOString(),
      settings,
      games: overrides,
    };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(
      new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    );
    a.download = 'steam-launch-settings.json';
    a.click();
    URL.revokeObjectURL(a.href);
    $('io-msg').textContent = 'Export ready.';
  });
  $('import-btn').addEventListener('click', () => $('import-file').click());
  $('import-file').addEventListener('change', async (ev) => {
    const file = ev.target.files[0];
    ev.target.value = '';
    if (!file) return;
    try {
      const restored = LR.parseBackup(JSON.parse(await file.text()), DATA);
      if (!restored) throw new Error('format');
      settings = { ...LR.DEFAULT_SETTINGS, ...DEFAULTS, ...restored.settings };
      overrides = restored.games;
      persist();
      render();
      $('io-msg').textContent = 'Restored.';
    } catch {
      $('io-msg').textContent = "That file isn't a backup from this page.";
    }
  });

  // Table: copy and edit buttons
  $('rows').addEventListener('click', async (e) => {
    const edit = e.target.closest('.edit');
    if (edit) return openEditor(Number(edit.dataset.id));
    const b = e.target.closest('.copy');
    if (!b) return;
    try {
      await navigator.clipboard.writeText(b.dataset.c);
    } catch {
      const t = document.createElement('textarea');
      t.value = b.dataset.c;
      document.body.appendChild(t);
      t.select();
      document.execCommand('copy');
      t.remove();
    }
    b.textContent = 'Copied';
    b.classList.add('done');
    setTimeout(() => {
      b.textContent = 'Copy';
      b.classList.remove('done');
    }, 1400);
  });

  // Filters and sorting
  const menus = [...document.querySelectorAll('.ms')];
  menus.forEach((m) => {
    m.addEventListener('change', () => {
      const labels = [...m.querySelectorAll('input:checked')].map((i) =>
        i.parentElement.textContent.trim()
      );
      m.querySelector('.ms-val').textContent = labels.length ? labels.join(', ') : 'All';
      render();
    });
    m.addEventListener('toggle', () => {
      if (m.open) menus.forEach((o) => o !== m && (o.open = false));
    });
  });
  document.addEventListener('click', (e) =>
    menus.forEach((m) => m.open && !m.contains(e.target) && (m.open = false))
  );
  $('search').addEventListener('input', render);
  document.querySelectorAll('th[data-k]').forEach((th) =>
    th.querySelector('button').addEventListener('click', () => {
      const k = th.dataset.k;
      if (sortKey === k) dir = -dir;
      else {
        sortKey = k;
        dir = 1;
      }
      document.querySelectorAll('th').forEach((t) => t.removeAttribute('aria-sort'));
      th.setAttribute('aria-sort', dir === 1 ? 'ascending' : 'descending');
      render();
    })
  );
  render();
}

const escapeHtml = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]
  );

/**
 * Transpile src/lib/launchReference.ts once: `script` defines `LR` in the exported page, and
 * `lib` is the same module loaded here.
 */
function loadLib() {
  const { outputText } = ts.transpileModule(fs.readFileSync(LIB, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const lib = {};
  new Function('exports', outputText)(lib);
  return { lib, script: `const LR=(()=>{const exports={};${outputText}\nreturn exports})();` };
}

function buildHtml({ setup, defaults, games }, { lib, script }) {
  // Escape "<" so no note can close the <script> tag early.
  const json = (v) => JSON.stringify(v ?? {}).replace(/</g, '\\u003c');
  const th = (key, label) =>
    `<th data-k="${key}"${key === 'name' ? ' aria-sort="ascending"' : ''}><button>${label}</button></th>`;
  const menu = (id, label, options) =>
    `<details class="ms" id="${id}"><summary>${label}: <span class="ms-val">All</span></summary><div class="ms-menu" role="group" aria-label="${label}">${options
      .map(([v, l]) => `<label><input type="checkbox" value="${v}"> ${l}</label>`)
      .join('')}</div></details>`;
  const fields = SETTINGS_FIELDS(lib.RESOLUTIONS);
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Linux Launch Reference</title>
<link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap" rel="stylesheet">
<style>${STYLE}</style></head><body>
<header>
<h1>Steam Library: Linux Launch Reference</h1>
<p>${escapeHtml(setup)}</p>
<p>Each launch string is built from your Default Launch Parameters. Copy it into the game's Properties → General → Launch Options in Steam. Use Edit to give a game its own settings, notes and status; Verified games have been tested on this setup.</p>
<div class="actions"><button class="btn" id="open-defaults">Default Launch Parameters</button>
<button class="btn" id="open-backup">Backup &amp; Restore</button>
<span class="warn" id="nosave" role="status" hidden>This browser isn't saving changes; they last until you close the page.</span></div>
</header>
<div class="toolbar">
<input class="search" id="search" type="search" placeholder="Search name, App ID, notes, status, OS or runtime" aria-label="Search by name, App ID, notes, status, OS or runtime">
<div class="filters">
${menu('f-status', 'Status', [
  ['Verified', 'Verified'],
  ['Unverified', 'Unverified'],
])}
${menu('f-os', 'OS', [
  ['win', 'Windows'],
  ['mac', 'Mac'],
  ['linux', 'Linux'],
])}
${menu('f-runtime', 'Linux Runtime', [
  ['Native', 'Native'],
  ['Proton', 'Proton'],
  ['Blocked', 'Blocked'],
])}
</div>
<span class="count" id="count" aria-live="polite"></span>
</div>
<div class="wrap"><table>
<thead><tr>
${th('name', 'Game')}${th('status', 'Status')}${th('win', 'Windows')}${th('mac', 'Mac')}${th('linux', 'Linux')}${th('runtime', 'Linux Runtime')}${th('protondb', 'ProtonDB')}
<th>Launch Options (Full)</th><th>Optional Flags</th><th>Notes</th><th><span style="position:absolute;width:1px;height:1px;overflow:hidden">Edit</span></th>
</tr></thead><tbody id="rows"></tbody></table></div>
<div class="legend">
<p>Windows, Mac and Linux show whether Steam offers a build for that system; Linux means a native build. ProtonDB is the community rating and links to the reports.</p>
<p>On KDE Plasma with fractional scaling, set System Settings → Display → Legacy Applications to “Apply scaling themselves” so XWayland games render at full native resolution without gamescope. Games marked “Force Proton” have a native build but run better through Proton; force it in Steam under Properties → Compatibility.</p>
<p>A game marked “Custom” uses its own settings from Edit. Your settings, notes and statuses are saved in this browser only; use Backup &amp; Restore to move them.</p>
<p>Exported ${new Date().toISOString().slice(0, 10)}.</p>
</div>

<dialog id="dlg-defaults" aria-labelledby="g-title"><form method="dialog">
<div class="dlg-head"><h2 id="g-title">Default Launch Parameters</h2><p>Used by every game without its own settings.</p></div>
<div class="dlg-body">${fields}</div>
<div class="dlg-foot"><button class="btn primary">Done</button></div>
</form></dialog>

<dialog id="dlg-backup" aria-labelledby="b-title"><form method="dialog">
<div class="dlg-head"><h2 id="b-title">Backup &amp; Restore</h2><p>Save your settings, notes and statuses to a JSON file, or restore them from one.</p></div>
<div class="dlg-body">
<div class="actions" style="margin:0"><button type="button" class="btn" id="export-btn">Export JSON</button>
<button type="button" class="btn" id="import-btn">Import JSON</button><input type="file" id="import-file" accept="application/json,.json" hidden></div>
<p class="desc" style="max-width:none">Importing replaces your current settings, notes and statuses.</p>
<p class="desc" id="io-msg" role="status"></p>
</div>
<div class="dlg-foot"><button class="btn primary">Done</button></div>
</form></dialog>

<dialog id="dlg-game" aria-labelledby="e-title"><form method="dialog">
<div class="dlg-head"><h2 id="e-title"></h2><p id="e-sub"></p></div>
<div class="dlg-body">
<label class="field">Status<select id="e-status"><option>Verified</option><option>Unverified</option></select></label>
<div id="e-launch" style="display:grid;gap:1rem">
<label class="chk"><input type="checkbox" id="e-custom"> Use custom launch settings for this game</label>
<fieldset id="e-set"><legend>Launch settings</legend>${fields}
<div class="opt" style="margin-top:1rem"><span class="chk">Optional flags</span>
<div class="flag-in"><input type="text" id="e-flag-in" placeholder="Add flags, e.g. -dx11 +fps_max 64" spellcheck="false" aria-label="Add optional flags">
<button type="button" class="btn" id="e-flag-add">Add</button></div>
<div class="flags" id="e-flags" aria-live="polite"></div></div>
</fieldset>
<div class="field">Launch Options (Full)<code id="e-preview"></code></div>
</div>
<label class="field">Notes<textarea id="e-notes"></textarea><span class="hint">Clear it and save to go back to the original note.</span></label>
</div>
<div class="dlg-foot"><button type="button" class="btn left" id="e-reset">Reset to defaults</button>
<button class="btn" value="cancel">Cancel</button><button type="button" class="btn primary" id="e-save">Save</button></div>
</form></dialog>

<script>
${script}
(${page.toString()})(LR, ${json(games)}, ${json(defaults)});
</script></body></html>
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
  fs.writeFileSync(outPath, buildHtml(reference, loadLib()), 'utf8');
  console.error(`[steam:launch:export] Wrote ${reference.games.length} games to ${outFile}`);
}

main();
