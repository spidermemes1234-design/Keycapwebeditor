// Keycap Web Editor — app logic. This file is auto-updated from GitHub.
// The launcher calls start(ctx) with { express, dataDir, runWrangler, version }.
const fs = require('fs');
const path = require('path');
const { build } = require('./build');

const PROJECT = 'keycapstudios'; // Cloudflare Pages project name

module.exports.start = function start(ctx) {
  const { express, dataDir, runWrangler, version } = ctx;
  const SITE = path.join(dataDir, 'site');
  const DIST = path.join(dataDir, 'dist');

  // First run: copy the default website content into the user's folder.
  if (!fs.existsSync(path.join(SITE, 'content.json'))) {
    fs.cpSync(path.join(__dirname, 'defaults'), SITE, { recursive: true });
  }
  fs.mkdirSync(path.join(SITE, 'assets'), { recursive: true });

  const app = express();
  app.use(express.json({ limit: '25mb' }));
  app.use('/', express.static(path.join(__dirname, 'editor'), { etag: false, maxAge: 0 }));

  app.get('/api/version', (req, res) => res.json({ version, dataDir }));

  app.use('/preview', (req, res, next) => {
    try { build(SITE, DIST); } catch (e) { return res.status(500).send(String(e)); }
    next();
  }, express.static(DIST, { etag: false, maxAge: 0 }));

  app.get('/api/content', (req, res) => {
    res.json({
      content: JSON.parse(fs.readFileSync(path.join(SITE, 'content.json'), 'utf8')),
      privacy: fs.readFileSync(path.join(SITE, 'pages', 'privacy.html'), 'utf8'),
      terms: fs.readFileSync(path.join(SITE, 'pages', 'terms.html'), 'utf8'),
    });
  });

  app.post('/api/content', (req, res) => {
    const { content, privacy, terms } = req.body;
    fs.writeFileSync(path.join(SITE, 'content.json'), JSON.stringify(content, null, 2));
    if (typeof privacy === 'string') fs.writeFileSync(path.join(SITE, 'pages', 'privacy.html'), privacy);
    if (typeof terms === 'string') fs.writeFileSync(path.join(SITE, 'pages', 'terms.html'), terms);
    res.json({ ok: true });
  });

  app.post('/api/upload', (req, res) => {
    const { name, data } = req.body;
    const m = /^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,(.+)$/.exec(data || '');
    if (!m) return res.status(400).json({ error: 'Not an image' });
    const ext = m[1].replace('jpeg', 'jpg').replace('svg+xml', 'svg');
    const base = path.parse(name || 'image').name.replace(/[^a-z0-9-_]/gi, '-').toLowerCase() || 'image';
    const safe = `${base}-${Date.now().toString(36)}.${ext}`;
    fs.writeFileSync(path.join(SITE, 'assets', safe), Buffer.from(m[2], 'base64'));
    res.json({ url: '/assets/' + safe });
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
    try { build(SITE, DIST); } catch (e) { return res.status(500).end('Build failed: ' + e); }
    res.write('Building site… done\nUploading to Cloudflare…\n');
    streamWrangler(['pages', 'deploy', DIST, '--project-name', PROJECT, '--branch', 'main', '--commit-dirty=true'], res,
      '\n✅ Published! Live at https://keycapstudios.com\n');
  });

  return new Promise(resolve => {
    const server = app.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`));
  });
};
