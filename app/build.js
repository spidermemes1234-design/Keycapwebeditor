// Renders site.json (pages made of blocks) into static HTML.
const fs = require('fs');
const path = require('path');

const esc = (s = '') => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const url = (s = '') => /^\s*javascript:/i.test(s) ? '#' : esc(s);
// Rich text from the editor is HTML the site owner wrote; strip scripts/handlers defensively.
const rich = (s = '') => String(s ?? '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\son\w+="[^"]*"/gi, '');

const pageFile = p => (p.slug === '' || p.slug === 'index' ? 'index' : p.slug) + '.html';
const pageHref = p => (p.slug === '' || p.slug === 'index' ? '/' : '/' + p.slug);

function buttons(list = []) {
  if (!list.length) return '';
  return `<div class="btns">${list.map(b =>
    `<a class="btn ${b.style === 'ghost' ? 'ghost' : 'primary'}" href="${url(b.link)}"${/^https?:/.test(b.link || '') ? ' target="_blank" rel="noopener"' : ''}>${esc(b.text)}</a>`).join('')}</div>`;
}
function ytEmbed(u = '') {
  const m = /(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/.exec(u);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : u;
}
const tag = t => t.tag ? `<span class="tag ${esc(t.tagColor || '')}">${esc(t.tag)}</span>` : '';

const R = {
  hero: p => `
  ${p.eyebrow ? `<span class="eyebrow">${esc(p.eyebrow)}</span>` : ''}
  <h1>${esc(p.title)}${p.highlight ? `<br><span class="hl">${esc(p.highlight)}</span>` : ''}</h1>
  ${p.text ? `<p class="lead">${esc(p.text)}</p>` : ''}
  ${buttons(p.buttons)}
  ${p.image ? `<img class="hero-shot" src="${url(p.image)}" alt="">` : ''}`,
  heading: p => `<h${p.level || 2} class="bh">${esc(p.text)}</h${p.level || 2}>${p.subtitle ? `<p class="sub">${esc(p.subtitle)}</p>` : ''}`,
  text: p => `<div class="rich">${rich(p.html)}</div>`,
  image: p => {
    const img = `<img src="${url(p.src)}" alt="${esc(p.alt)}" class="${p.rounded ? 'rounded' : ''}" style="max-width:${esc(p.maxWidth || '100%')}">`;
    return `<figure class="bimg">${p.link ? `<a href="${url(p.link)}">${img}</a>` : img}${p.caption ? `<figcaption>${esc(p.caption)}</figcaption>` : ''}</figure>`;
  },
  buttons: p => buttons(p.buttons),
  cards: p => `
  ${p.title ? `<h2 class="bh">${esc(p.title)}</h2>` : ''}${p.subtitle ? `<p class="sub">${esc(p.subtitle)}</p>` : ''}
  <div class="grid cols-${p.columns || 3}">${(p.items || []).map(c => {
    const inner = `${c.image ? `<img class="shot" src="${url(c.image)}" alt="">` : c.icon ? `<div class="ico">${esc(c.icon)}</div>` : ''}<h3>${esc(c.title)}</h3><p>${esc(c.text)}</p>${tag(c)}`;
    return c.link ? `<a class="card link" href="${url(c.link)}">${inner}</a>` : `<div class="card">${inner}</div>`;
  }).join('')}</div>`,
  features: p => `
  ${p.title ? `<h2 class="bh">${esc(p.title)}</h2>` : ''}${p.subtitle ? `<p class="sub">${esc(p.subtitle)}</p>` : ''}
  <div class="feats cols-${p.columns || 4}">${(p.items || []).map(f => `<div class="feat"><h4>${esc(f.title)}</h4><p>${esc(f.text)}</p></div>`).join('')}</div>`,
  columns: p => `<div class="cols cols-${(p.cols || []).length || 2}">${(p.cols || []).map(c => `<div class="rich">${rich(c.html)}</div>`).join('')}</div>`,
  imagetext: p => `<div class="imgtext ${p.imageRight ? 'right' : ''}"><img src="${url(p.image)}" alt="" class="rounded"><div class="rich">${p.title ? `<h2 class="bh">${esc(p.title)}</h2>` : ''}${rich(p.html)}${buttons(p.buttons)}</div></div>`,
  gallery: p => `<div class="gallery cols-${p.columns || 3}">${(p.images || []).map(i => `<figure><img src="${url(i.src)}" alt="${esc(i.caption)}">${i.caption ? `<figcaption>${esc(i.caption)}</figcaption>` : ''}</figure>`).join('')}</div>`,
  video: p => `${p.title ? `<h2 class="bh">${esc(p.title)}</h2>` : ''}<div class="video"><iframe src="${url(ytEmbed(p.url))}" title="${esc(p.title || 'Video')}" allowfullscreen loading="lazy" allow="accelerometer; encrypted-media; picture-in-picture"></iframe></div>`,
  cta: p => `<div class="cta"><h2>${esc(p.title)}</h2>${p.text ? `<p>${esc(p.text)}</p>` : ''}${buttons(p.buttons)}</div>`,
  faq: p => `${p.title ? `<h2 class="bh">${esc(p.title)}</h2>` : ''}<div class="faq">${(p.items || []).map(q => `<details><summary>${esc(q.q)}</summary><div class="rich">${rich(q.a)}</div></details>`).join('')}</div>`,
  pricing: p => `${p.title ? `<h2 class="bh">${esc(p.title)}</h2>` : ''}${p.subtitle ? `<p class="sub">${esc(p.subtitle)}</p>` : ''}<div class="grid cols-${(p.plans || []).length || 3}">${(p.plans || []).map(pl => `
    <div class="card plan ${pl.featured ? 'featured' : ''}"><h3>${esc(pl.name)}</h3><div class="price">${esc(pl.price)}</div><ul>${String(pl.features || '').split('\n').filter(Boolean).map(f => `<li>${esc(f)}</li>`).join('')}</ul>${pl.buttonText ? `<a class="btn ${pl.featured ? 'primary' : 'ghost'}" href="${url(pl.buttonLink)}">${esc(pl.buttonText)}</a>` : ''}</div>`).join('')}</div>`,
  quote: p => `<blockquote class="quote"><p>“${esc(p.text)}”</p>${p.author ? `<cite>— ${esc(p.author)}</cite>` : ''}</blockquote>`,
  spacer: p => `<div style="height:${Number(p.height) || 40}px"></div>`,
  divider: () => `<hr class="div">`,
  html: p => String(p.code || ''),
};

function blockHTML(b, preview) {
  const r = R[b.type]; if (!r) return '';
  const s = b.style || {};
  const cls = ['blk', 'b-' + b.type, 'pad-' + (s.padding || 'm'), 'w-' + (s.width || 'normal'), s.align ? 'al-' + s.align : '', s.bg && s.bg !== 'custom' && s.bg !== 'image' ? 'bg-' + s.bg : '', s.hideMobile ? 'hide-m' : ''].filter(Boolean).join(' ');
  const css = [];
  if (s.bg === 'custom' && s.bgColor) css.push(`background:${s.bgColor}`);
  if (s.bg === 'image' && s.bgImage) css.push(`background:linear-gradient(rgba(0,0,0,${(s.overlay ?? 55) / 100}),rgba(0,0,0,${(s.overlay ?? 55) / 100})),url('${url(s.bgImage)}') center/cover`);
  if (s.textColor) css.push(`color:${s.textColor}`);
  const attrs = `${s.anchor ? ` id="${esc(s.anchor)}"` : ''}${css.length ? ` style="${esc(css.join(';'))}"` : ''}${preview ? ` data-bid="${esc(b.id)}"` : ''}`;
  return `<section class="${cls}"${attrs}><div class="wrap">${r(b.props || {})}</div></section>`;
}

const FONTS = { Inter: 'Inter:wght@400;600;700;800', Poppins: 'Poppins:wght@400;600;700;800', Montserrat: 'Montserrat:wght@400;600;700;800', 'Space Grotesk': 'Space+Grotesk:wght@400;600;700', Rajdhani: 'Rajdhani:wght@400;600;700', Orbitron: 'Orbitron:wght@500;700;800', Oswald: 'Oswald:wght@400;600;700', 'DM Sans': 'DM+Sans:wght@400;600;700;800' };

function renderPage(site, page, preview) {
  const t = site.theme;
  const fonts = [...new Set([t.font, t.headingFont])].filter(f => FONTS[f]).map(f => 'family=' + FONTS[f]).join('&');
  const nav = site.nav.map(n => `<a href="${url(n.link)}">${esc(n.label)}</a>`).join('');
  const logo = t.logoImage ? `<img src="${url(t.logoImage)}" alt="${esc(t.brand)}" class="logo-img">` : `<span class="key">${esc(t.logoIcon || '⌘')}</span>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(page.seoTitle || (page.title + (page.slug ? ' — ' + t.brand : '')))}</title>
<meta name="description" content="${esc(page.description || t.description)}">
<meta property="og:title" content="${esc(page.seoTitle || page.title)}">
<meta property="og:description" content="${esc(page.description || t.description)}">
${t.favicon ? `<link rel="icon" href="${url(t.favicon)}">` : ''}
${fonts ? `<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?${fonts}&display=swap" rel="stylesheet">` : ''}
<link rel="stylesheet" href="/styles.css">
<style>:root{--ember:${esc(t.accent)};--ember2:${esc(t.accent2)};--bg:${esc(t.bg)};--bg2:${esc(t.bg2)};--card:${esc(t.card)};--text:${esc(t.text)};--muted:${esc(t.muted)};--font:'${esc(t.font)}';--hfont:'${esc(t.headingFont)}';--radius:${Number(t.radius) || 14}px}${site.customCSS ? '\n' + site.customCSS.replace(/<\/style/gi, '') : ''}</style>
${site.headCode || ''}
</head>
<body>
<header class="nav"><div class="wrap">
  <a class="logo" href="/">${logo}${t.hideBrandText ? '' : esc(t.brand)}</a>
  <input type="checkbox" id="mnav" hidden><label for="mnav" class="burger">☰</label>
  <nav class="links">${nav}</nav>
</div></header>
<main>
${(page.blocks || []).map(b => blockHTML(b, preview)).join('\n')}
</main>
<footer><div class="wrap">
  <span>${esc((site.footer.text || '').replace('{year}', new Date().getFullYear()))}</span>
  <span>${site.footer.links.map(l => `<a href="${url(l.link)}">${esc(l.label)}</a>`).join('')}</span>
</div></footer>
${preview ? PREVIEW_SCRIPT : ''}
</body>
</html>`;
}

// In the editor preview: click a block to select it; links don't navigate away.
const PREVIEW_SCRIPT = `<style>[data-bid]{position:relative;cursor:pointer}[data-bid]:hover{outline:2px dashed rgba(255,122,26,.6);outline-offset:-2px}[data-bid].sel{outline:2px solid #ff7a1a;outline-offset:-2px}</style>
<script>
document.addEventListener('click',e=>{const a=e.target.closest('a');if(a)e.preventDefault();const b=e.target.closest('[data-bid]');if(b)parent.postMessage({kws:'select',id:b.dataset.bid},'*')},true);
addEventListener('message',e=>{if(!e.data||e.data.kws!=='highlight')return;document.querySelectorAll('.sel').forEach(x=>x.classList.remove('sel'));const el=document.querySelector('[data-bid="'+e.data.id+'"]');if(el){el.classList.add('sel');if(e.data.scroll)el.scrollIntoView({behavior:'smooth',block:'center'})}});
addEventListener('load',()=>parent.postMessage({kws:'ready'},'*'));
</script>`;

function build(SITE, DIST, opts = {}) {
  const site = JSON.parse(fs.readFileSync(path.join(SITE, 'site.json'), 'utf8'));
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });
  for (const p of site.pages) fs.writeFileSync(path.join(DIST, pageFile(p)), renderPage(site, p, opts.preview));
  fs.copyFileSync(path.join(__dirname, 'styles.css'), path.join(DIST, 'styles.css'));
  fs.cpSync(path.join(SITE, 'assets'), path.join(DIST, 'assets'), { recursive: true });
  const notFound = site.pages.find(p => p.slug === '404');
  if (!notFound) fs.writeFileSync(path.join(DIST, '404.html'), renderPage(site, { title: 'Page not found', slug: '404', blocks: [{ id: 'nf', type: 'hero', props: { title: 'Page not found', text: "That page doesn't exist.", buttons: [{ text: 'Go home', link: '/' }] } }] }, false));
  return DIST;
}

module.exports = { build, pageFile, pageHref };
