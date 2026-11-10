// Run before every push: node tools/make-manifest.js [newVersion]
// Writes app/version.json listing every app file with its SHA-256 so the launcher can update safely.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const APP = path.join(__dirname, '..', 'app');
const MANIFEST = path.join(APP, 'version.json');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (p !== MANIFEST) out.push(p);
  }
  return out;
}

const old = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : { version: '1.0.0' };
let version = process.argv[2];
if (!version) { const v = old.version.split('.').map(Number); v[2]++; version = v.join('.'); }

const files = walk(APP).sort().map(p => ({
  path: path.relative(APP, p).split(path.sep).join('/'),
  sha256: crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'),
}));

fs.writeFileSync(MANIFEST, JSON.stringify({ version, released: new Date().toISOString(), files }, null, 2) + '\n');
console.log(`version.json -> ${version} (${files.length} files)`);
