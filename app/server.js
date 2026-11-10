// Keycap Web Editor — app logic (auto-updated from GitHub).
// The launcher calls start(ctx) with { express, dataDir, runWrangler, version }.
const fs = require('fs');
const path = require('path');
const { build } = require('./build');
const { fromV1 } = require('./migrate');

const PROJECT = 'keycapstudios'; // Cloudflare Pages project name

module.exports.start = function start(ctx) {
  const { express, dataDir, runWrangler, version } = ctx;
  const SITE = path.join(dataDir, 'site');
  const DIST = path.join(dataDir, 'dist');
  const PREV = path.join(dataDir, 'preview');
  const BACKUPS = path.join(dataDir, 'backups');
  const SITE_JSON = path.join(SITE, 'site.json');
  const ASSETS = path.join(SITE, 'assets');

  // First run, or upgrade from the v1 editor.
  if (!fs.existsSync(SITE_JSON)) {
    if (fs.existsSync(path.join(SITE, 'content.json'))) {
      fs.writeFileSync(SITE_JSON, JSON.stringify(fromV1(SITE), null, 2));
    } else {
      fs.cpSync(path.join(__dirname, 'defaults'), SITE, { recursive: true });
    }
  }
  fs.mkdirSync(ASSETS, { recursive: true });
  fs.mkdirSync(BACKUPS, { recursive: true });

  const app = express();
  app.use(express.json({ limit: '60mb' }));
  app.use('/', express.static(path.join(__dirname, 'editor'), { etag: false, maxAge: 0 }));
  app.use('/assets', express.static(ASSETS));
  // Preview pages use root-relative links, so serve the site stylesheet at the root too.
  app.get('/styles.css', (req, res) => res.sendFile(path.join(__dirname, 'styles.css')));
  app.get('/site.js', (req, res) => res.sendFile(path.join(__dirname, 'site.js')));

  app.get('/api/me', (req, res) => res.status(401).json(null)); // Steam login is live-site only
  app.get('/api/version', (req, res) => res.json({ version, dataDir }));

  app.use('/preview', (req, res, next) => {
    if (req.path === '/' || req.path.endsWith('.html')) {
      try { build(SITE, PREV, { preview: true }); } catch (e) { return res.status(500).send('<pre>' + String(e.stack) + '</pre>'); }
    }
    next();
  }, express.static(PREV, { etag: false, maxAge: 0 }));

  app.get('/api/site', (req, res) => res.sendFile(SITE_JSON));

  app.post('/api/site', (req, res) => {
    const json = JSON.stringify(req.body, null, 2);
    fs.writeFileSync(SITE_JSON + '.tmp', json);
    fs.renameSync(SITE_JSON + '.tmp', SITE_JSON);
    res.json({ ok: true });
  });

  // Media library
  app.get('/api/media', (req, res) => {
    const files = fs.readdirSync(ASSETS).filter(f => !f.startsWith('.')).map(f => {
      const st = fs.statSync(path.join(ASSETS, f)); return { url: '/assets/' + f, name: f, size: st.size, time: st.mtimeMs };
    }).sort((a, b) => b.time - a.time);
    res.json(files);
  });
  app.post('/api/upload', (req, res) => {
    const { name, data } = req.body;
    const m = /^data:([\w/+.-]+);base64,(.+)$/.exec(data || '');
    const ok = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg', 'image/x-icon': 'ico', 'image/vnd.microsoft.icon': 'ico', 'video/mp4': 'mp4', 'application/pdf': 'pdf' };
    if (!m || !ok[m[1]]) return res.status(400).json({ error: 'Unsupported file type' });
    const base = path.parse(name || 'file').name.replace(/[^a-z0-9-_]/gi, '-').toLowerCase().slice(0, 40) || 'file';
    const safe = `${base}-${Date.now().toString(36)}.${ok[m[1]]}`;
    fs.writeFileSync(path.join(ASSETS, safe), Buffer.from(m[2], 'base64'));
    res.json({ url: '/assets/' + safe });
  });
  app.delete('/api/media/:name', (req, res) => {
    const f = path.join(ASSETS, path.basename(req.params.name));
    if (fs.existsSync(f)) fs.unlinkSync(f);
    res.json({ ok: true });
  });

  // Backups (made automatically before each publish, or on demand)
  const backup = label => {
    const name = new Date().toISOString().replace(/[:.]/g, '-') + (label ? '-' + label : '') + '.json';
    fs.copyFileSync(SITE_JSON, path.join(BACKUPS, name));
    const all = fs.readdirSync(BACKUPS).sort();
    while (all.length > 50) fs.unlinkSync(path.join(BACKUPS, all.shift()));
    return name;
  };
  app.get('/api/backups', (req, res) => res.json(fs.readdirSync(BACKUPS).sort().reverse()));
  app.post('/api/backups', (req, res) => res.json({ name: backup('manual') }));
  app.post('/api/backups/restore/:name', (req, res) => {
    const f = path.join(BACKUPS, path.basename(req.params.name));
    if (!fs.existsSync(f)) return res.status(404).json({ error: 'Not found' });
    backup('before-restore');
    fs.copyFileSync(f, SITE_JSON);
    res.json({ ok: true });
  });

  const streamWrangler = (args, res, okMsg) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    const p = runWrangler(args, dataDir);
    p.stdout.on('data', d => res.write(d));
    p.stderr.on('data', d => res.write(d));
    p.on('error', e => res.end('\n❌ ' + e.message + '\n'));
    p.on('close', code => res.end(code === 0 ? okMsg : `\n❌ Failed (code ${code}).\n`));
  };

  app.post('/api/login', (req, res) => {
    res.write('Opening Cloudflare login in your browser…\nLog in with keycapstudiosza@gmail.com and click Allow.\n\n');
    streamWrangler(['login'], res, '\n✅ Logged in to Cloudflare. You can publish now.\n');
  });

  app.post('/api/publish', (req, res) => {
    const draft = req.query.draft === '1';
    try { if (!draft) backup('publish'); build(SITE, DIST); } catch (e) { return res.status(500).end('Build failed: ' + e); }
    res.write('Building site… done\nUploading to Cloudflare…\n');
    streamWrangler(['pages', 'deploy', DIST, '--project-name', PROJECT, '--branch', draft ? 'preview' : 'main', '--commit-dirty=true'], res,
      draft ? '\n✅ Test version published! Open the https://…pages.dev link above to check it. The real site has not changed.\n'
            : '\n✅ Published! Live at https://keycapstudios.com\n');
  });

  return new Promise(resolve => {
    const server = app.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`));
  });
};
