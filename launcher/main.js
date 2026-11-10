// Keycap Web Editor — launcher. Checks GitHub for a newer app version on every start,
// installs it, then runs it. Your website content lives in Documents\Keycap Web Editor.
const { app, BrowserWindow, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { spawn } = require('child_process');

const OWNER = 'spidermemes1234-design';
const REPO = 'Keycapwebeditor';
const BRANCH = 'main';

const BUNDLED = path.join(__dirname, 'bundled-app');          // shipped with the exe (fallback)
const CODE_ROOT = () => path.join(app.getPath('userData'), 'app-code');
const DATA_DIR = () => path.join(app.getPath('documents'), 'Keycap Web Editor');

const readJSON = p => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } };
const newer = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); } return false; };

let splash;
function status(msg) { if (splash && !splash.isDestroyed()) splash.webContents.executeJavaScript(`document.getElementById('m').textContent=${JSON.stringify(msg)}`).catch(() => {}); }

function activeCode() {
  const installed = readJSON(path.join(CODE_ROOT(), 'current', 'version.json'));
  const bundled = readJSON(path.join(BUNDLED, 'version.json'));
  if (installed && (!bundled || !newer(bundled.version, installed.version))) return { dir: path.join(CODE_ROOT(), 'current'), version: installed.version };
  return { dir: BUNDLED, version: bundled ? bundled.version : '0.0.0' };
}

async function fetchWithTimeout(url, ms = 8000) {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
  try { const r = await fetch(url, { signal: c.signal, headers: { 'User-Agent': 'KeycapWebEditor' } }); if (!r.ok) throw new Error(`${r.status} ${url}`); return r; }
  finally { clearTimeout(t); }
}

async function checkForUpdate(current) {
  status('Checking for updates…');
  // Pin to the latest commit so we never get a half-cached mix of files.
  // If the GitHub API is unavailable (e.g. rate limited), fall back to the branch directly.
  let ref = BRANCH;
  try {
    const commit = await (await fetchWithTimeout(`https://api.github.com/repos/${OWNER}/${REPO}/commits/${BRANCH}`, 5000)).json();
    if (commit && commit.sha) ref = commit.sha;
  } catch {}
  const raw = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${ref}/app/`;
  const manifest = await (await fetchWithTimeout(raw + 'version.json')).json();
  if (!newer(manifest.version, current.version)) return null;

  status(`Updating to v${manifest.version}…`);
  const staging = path.join(CODE_ROOT(), 'staging');
  fs.rmSync(staging, { recursive: true, force: true });
  let i = 0;
  for (const f of manifest.files) {
    status(`Updating to v${manifest.version}… (${++i}/${manifest.files.length})`);
    const buf = Buffer.from(await (await fetchWithTimeout(raw + f.path.split('/').map(encodeURIComponent).join('/'), 20000)).arrayBuffer());
    if (crypto.createHash('sha256').update(buf).digest('hex') !== f.sha256) throw new Error('Checksum mismatch on ' + f.path);
    const dest = path.join(staging, ...f.path.split('/'));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buf);
  }
  fs.writeFileSync(path.join(staging, 'version.json'), JSON.stringify(manifest, null, 2));
  const cur = path.join(CODE_ROOT(), 'current');
  fs.rmSync(cur + '.old', { recursive: true, force: true });
  if (fs.existsSync(cur)) fs.renameSync(cur, cur + '.old');
  fs.renameSync(staging, cur);
  fs.rmSync(cur + '.old', { recursive: true, force: true });
  return manifest.version;
}

function runWrangler(args, cwd) {
  const bin = path.join(__dirname, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
  return spawn(process.execPath, [bin, ...args], {
    cwd, windowsHide: true,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', WRANGLER_SEND_METRICS: 'false', NO_COLOR: '1', FORCE_COLOR: '0' },
  });
}

async function boot() {
  splash = new BrowserWindow({ width: 380, height: 170, frame: false, resizable: false, backgroundColor: '#0e0f12', show: true });
  splash.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(
    `<body style="margin:0;background:#0e0f12;color:#e9eaee;font:14px system-ui,Segoe UI;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh">
     <div style="font-size:18px;font-weight:800;margin-bottom:10px"><span style="color:#ff7a1a">⌘</span> Keycap Web Editor</div>
     <div id="m" style="color:#9aa0ad">Starting…</div></body>`));

  let current = activeCode();
  try {
    const updated = await checkForUpdate(current);
    if (updated) current = activeCode();
  } catch (e) {
    status('Offline — opening current version'); // keep going with what we have
    await new Promise(r => setTimeout(r, 700));
  }

  status('Opening…');
  fs.mkdirSync(DATA_DIR(), { recursive: true });
  let url;
  try {
    const server = require(path.join(current.dir, 'server.js'));
    url = await server.start({ express: require('express'), dataDir: DATA_DIR(), runWrangler, version: current.version });
  } catch (e) {
    // A broken update should never lock you out: fall back to the version shipped with the app.
    if (current.dir !== BUNDLED) {
      fs.rmSync(path.join(CODE_ROOT(), 'current'), { recursive: true, force: true });
      const server = require(path.join(BUNDLED, 'server.js'));
      const v = readJSON(path.join(BUNDLED, 'version.json'));
      url = await server.start({ express: require('express'), dataDir: DATA_DIR(), runWrangler, version: v ? v.version : '?' });
    } else { dialog.showErrorBox('Keycap Web Editor', 'Could not start:\n' + e.stack); app.quit(); return; }
  }

  const win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 960, minHeight: 600, show: false, backgroundColor: '#0e0f12',
    title: 'Keycap Web Editor', autoHideMenuBar: true,
  });
  win.webContents.setWindowOpenHandler(({ url: u }) => { shell.openExternal(u); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, u) => { if (!u.startsWith(url)) { e.preventDefault(); shell.openExternal(u); } });
  win.once('ready-to-show', () => { win.show(); if (splash && !splash.isDestroyed()) splash.close(); });
  win.loadURL(url);
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.whenReady().then(boot);
  app.on('window-all-closed', () => app.quit());
}
