// Builds the website from site/content.json into the dist/ folder.
const fs = require('fs');
const path = require('path');


const esc = (s = '') => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function head(c, title) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(c.site.description)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css">
<style>:root{--ember:${esc(c.site.accentColor)};--ember2:${esc(c.site.accentColor2)}}</style>
</head>
<body>`;
}

function nav(c, home) {
  const links = home
    ? `<a href="#apps">Apps</a><a href="#features" class="hide-sm">Features</a>${c.news.length ? '<a href="#news" class="hide-sm">News</a>' : ''}<a href="#download">Download</a>`
    : `<a href="/">Home</a><a href="/privacy.html">Privacy</a><a href="/terms.html">Terms</a>`;
  return `<header class="nav"><div class="wrap">
  <a class="logo" href="/"><span class="key">⌘</span>${esc(c.site.brand)}</a>
  <nav class="links">${links}</nav>
</div></header>`;
}

function footer(c) {
  return `<footer><div class="wrap">
  <span>© ${new Date().getFullYear()} ${esc(c.site.brand)}. All rights reserved.</span>
  <span><a href="/privacy.html">Privacy Policy</a><a href="/terms.html">Terms of Service</a><a href="mailto:${esc(c.site.contactEmail)}">Contact</a></span>
</div></footer>
</body>
</html>`;
}

function home(c) {
  const h = c.hero;
  const apps = c.apps.map(a => `
    <div class="card">${a.image ? `<img class="shot" src="${esc(a.image)}" alt="${esc(a.name)}">` : `<div class="ico">${esc(a.icon)}</div>`}<h3>${esc(a.name)}</h3><p>${esc(a.text)}</p>${a.tag ? `<span class="tag ${esc(a.tagStyle)}">${esc(a.tag)}</span>` : ''}</div>`).join('');
  const feats = c.features.map(f => `
    <div class="feat"><h4>${esc(f.title)}</h4><p>${esc(f.text)}</p></div>`).join('');
  const news = c.news.length ? `
<section class="alt" id="news"><div class="wrap">
  <h2>News &amp; updates</h2>
  <div class="grid">${c.news.map(n => `
    <div class="card"><span class="tag">${esc(n.date)}</span><h3 style="margin-top:10px">${esc(n.title)}</h3><p>${esc(n.text)}</p></div>`).join('')}
  </div>
</div></section>` : '';

  return `${head(c, c.site.title)}
${nav(c, true)}
<section class="hero"><div class="wrap">
  <span class="eyebrow">${esc(h.eyebrow)}</span>
  <h1>${esc(h.titleLine1)}<br><span>${esc(h.titleLine2)}</span></h1>
  <p class="lead">${esc(h.lead)}</p>
  <div class="btns">
    <a class="btn primary" href="#download">${esc(h.primaryButton)}</a>
    <a class="btn ghost" href="#apps">${esc(h.secondaryButton)}</a>
  </div>
  ${h.image ? `<img class="hero-shot" src="${esc(h.image)}" alt="The Forge">` : ''}
</div></section>

<section class="alt" id="apps"><div class="wrap">
  <h2>${esc(c.appsSection.title)}</h2>
  <p class="sub">${esc(c.appsSection.subtitle)}</p>
  <div class="grid">${apps}
  </div>
</div></section>

<section id="features"><div class="wrap">
  <h2>${esc(c.featuresSection.title)}</h2>
  <p class="sub">${esc(c.featuresSection.subtitle)}</p>
  <div class="feats">${feats}
  </div>
</div></section>
${news}
<section id="download"><div class="wrap">
  <div class="cta">
    <h2>${esc(c.cta.title)}</h2>
    <p>${esc(c.cta.text)}</p>
    <div class="btns"><a class="btn primary" href="${esc(c.cta.buttonLink)}">${esc(c.cta.buttonText)}</a></div>
  </div>
</div></section>
${footer(c)}`;
}

function legal(SITE, c, title, file) {
  const body = fs.readFileSync(path.join(SITE, 'pages', file), 'utf8');
  return `${head(c, `${title} — ${c.site.brand}`)}
${nav(c, false)}
<main class="legal"><div class="wrap">
${body}
</div></main>
${footer(c)}`;
}

function build(SITE, DIST) {
  const c = JSON.parse(fs.readFileSync(path.join(SITE, 'content.json'), 'utf8'));
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });
  fs.writeFileSync(path.join(DIST, 'index.html'), home(c));
  fs.writeFileSync(path.join(DIST, 'privacy.html'), legal(SITE, c, 'Privacy Policy', 'privacy.html'));
  fs.writeFileSync(path.join(DIST, 'terms.html'), legal(SITE, c, 'Terms of Service', 'terms.html'));
  fs.copyFileSync(path.join(__dirname, 'styles.css'), path.join(DIST, 'styles.css'));
  fs.cpSync(path.join(SITE, 'assets'), path.join(DIST, 'assets'), { recursive: true });
  return DIST;
}

module.exports = { build };
