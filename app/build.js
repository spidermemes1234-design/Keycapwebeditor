// Renders site.json (pages of blocks, posts, settings) into a static website.
const fs = require('fs');
const path = require('path');

const esc = (s = '') => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const url = (s = '') => /^\s*javascript:/i.test(s) ? '#' : esc(s);
const rich = (s = '') => String(s ?? '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\son\w+="[^"]*"/gi, '');
const get = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);

const pageFile = p => (!p.slug || p.slug === 'index' ? 'index' : p.slug) + '.html';
const pageHref = p => (!p.slug || p.slug === 'index' ? '/' : '/' + p.slug);
const blogBase = site => '/' + ((site.blog && site.blog.path) || 'news');
const postHref = (site, p) => blogBase(site) + '/' + p.slug;
const fmtDate = d => { try { return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return d; } };
const sortedPosts = site => (site.posts || []).filter(p => !p.draft).sort((a, b) => String(b.date).localeCompare(String(a.date)));

function ytEmbed(u = '') {
  const m = /(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([\w-]{11})/.exec(u);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : null;
}
function embedSrc(u = '') {
  const yt = ytEmbed(u); if (yt) return { src: yt, ratio: '16/9' };
  let m;
  if ((m = /twitch\.tv\/videos\/(\d+)/.exec(u))) return { src: `https://player.twitch.tv/?video=${m[1]}&parent=keycapstudios.com&parent=www.keycapstudios.com&parent=127.0.0.1`, ratio: '16/9' };
  if ((m = /twitch\.tv\/([\w]+)\/?$/.exec(u))) return { src: `https://player.twitch.tv/?channel=${m[1]}&parent=keycapstudios.com&parent=www.keycapstudios.com&parent=127.0.0.1`, ratio: '16/9' };
  if ((m = /store\.steampowered\.com\/app\/(\d+)/.exec(u))) return { src: `https://store.steampowered.com/widget/${m[1]}/`, ratio: null, height: 190 };
  if ((m = /open\.spotify\.com\/(track|album|playlist|episode|show)\/(\w+)/.exec(u))) return { src: `https://open.spotify.com/embed/${m[1]}/${m[2]}`, ratio: null, height: m[1] === 'track' ? 152 : 352 };
  if ((m = /tiktok\.com\/@[\w.]+\/video\/(\d+)/.exec(u))) return { src: `https://www.tiktok.com/embed/v2/${m[1]}`, ratio: '9/16', max: 340 };
  if ((m = /vimeo\.com\/(\d+)/.exec(u))) return { src: `https://player.vimeo.com/video/${m[1]}`, ratio: '16/9' };
  return { src: u, ratio: '16/9' };
}

const SOCIAL = {
  youtube: ['YouTube', 'M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8zM9.7 15.1V8.9l5.8 3.1-5.8 3.1z'],
  twitch: ['Twitch', 'M3.5 1 2 4.8v15.5h5.3V23h3l2.8-2.7h4.3L23 14.7V1H3.5zm17.6 12.8-3.4 3.4h-5.3L9.5 20v-2.8H5V2.9h16.1v10.9zm-3.3-6.9h-1.9v5.6h1.9V6.9zm-5.2 0h-1.9v5.6h1.9V6.9z'],
  tiktok: ['TikTok', 'M19.6 6.7a4.8 4.8 0 0 1-3.8-4.2V2h-3.4v13.4a2.9 2.9 0 1 1-2-2.7V9.2a6.3 6.3 0 1 0 5.4 6.2V8.6a8.2 8.2 0 0 0 3.8 1V6.7z'],
  discord: ['Discord', 'M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.6 1.3a18.4 18.4 0 0 0-5.6 0L8.6 3a19.7 19.7 0 0 0-4.9 1.5C.6 9.1-.3 13.6.1 18.1a19.9 19.9 0 0 0 6 3l1.3-2a12.9 12.9 0 0 1-2-1l.5-.4a14.2 14.2 0 0 0 12.2 0l.5.4-2 1 1.3 2a19.8 19.8 0 0 0 6-3c.5-5.2-.9-9.7-3.6-13.7zM8 15.4c-1.2 0-2.2-1.1-2.2-2.4S6.8 10.6 8 10.6s2.2 1.1 2.2 2.4-1 2.4-2.2 2.4zm8 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4z'],
  x: ['X', 'M18.2 2h3.4l-7.4 8.5L23 22h-6.8l-5.3-7-6.1 7H1.4l7.9-9L1 2h7l4.8 6.4L18.2 2zm-1.2 18h1.9L7.1 4H5.1L17 20z'],
  instagram: ['Instagram', 'M12 2.2c3.2 0 3.6 0 4.8.1 3.2.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 3.2-1.7 4.8-4.9 4.9-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-3.3-.1-4.8-1.7-4.9-4.9C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8C2.4 3.9 3.9 2.4 7.2 2.3c1.2-.1 1.6-.1 4.8-.1zM12 0C8.7 0 8.3 0 7.1.1 2.7.3.3 2.7.1 7.1 0 8.3 0 8.7 0 12s0 3.7.1 4.9c.2 4.4 2.6 6.8 7 7 1.2.1 1.6.1 4.9.1s3.7 0 4.9-.1c4.4-.2 6.8-2.6 7-7 .1-1.2.1-1.6.1-4.9s0-3.7-.1-4.9c-.2-4.4-2.6-6.8-7-7C15.7 0 15.3 0 12 0zm0 5.8a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.4-11.8a1.4 1.4 0 1 0 0 2.9 1.4 1.4 0 0 0 0-2.9z'],
  steam: ['Steam', 'M12 0A12 12 0 0 0 .1 11l6.4 2.7a3.4 3.4 0 0 1 2.2-.6l2.9-4.2v-.1a4.5 4.5 0 1 1 4.5 4.5h-.1l-4.1 3a3.4 3.4 0 0 1-6.7.7L.6 15.2A12 12 0 1 0 12 0zM7.5 18.2l-1.5-.6a2.5 2.5 0 1 0 1.4-3.4l1.5.6a1.8 1.8 0 1 1-1.4 3.4zm11.1-9.3a3 3 0 1 0-6 0 3 3 0 0 0 6 0zm-5.3 0a2.3 2.3 0 1 1 4.6 0 2.3 2.3 0 0 1-4.6 0z'],
  github: ['GitHub', 'M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.6 18.3 5 18.3 5c.7 1.6.2 2.8.1 3.2.8.8 1.3 1.9 1.3 3.1 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3'],
  email: ['Email', 'M2 4h20a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm0 2v.5l10 6.3 10-6.3V6H2zm20 2.9-10 6.3L2 8.9V18h20V8.9z'],
};
const socialIcon = k => SOCIAL[k] ? `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="${SOCIAL[k][1]}"/></svg>` : '';

/* ---------- blocks ---------- */
function makeR(site, preview) {
  const T = (p, k) => preview ? `<span data-ed="${k}">${esc(get(p, k))}</span>` : esc(get(p, k));
  const H = (p, k) => preview ? `<div class="rich" data-edh="${k}">${rich(get(p, k))}</div>` : `<div class="rich">${rich(get(p, k))}</div>`;
  const ext = l => /^https?:/.test(l || '') ? ' target="_blank" rel="noopener"' : '';
  const buttons = (p, k = 'buttons') => {
    const list = p[k] || []; if (!list.length) return '';
    return `<div class="btns">${list.map((b, i) => `<a class="btn ${b.style === 'ghost' ? 'ghost' : b.style === 'link' ? 'tlink' : 'primary'}" href="${url(b.link)}"${ext(b.link)}>${T(p, `${k}.${i}.text`)}</a>`).join('')}</div>`;
  };
  const head = p => `${p.title ? `<h2 class="bh">${T(p, 'title')}</h2>` : ''}${p.subtitle ? `<p class="sub">${T(p, 'subtitle')}</p>` : ''}`;
  const tag = (p, k) => { const t = get(p, k); return t && t.tag ? `<span class="tag ${esc(t.tagColor || '')}">${T(p, k + '.tag')}</span>` : ''; };
  const postCard = (po, showImg = true) => `<a class="card link post" href="${url(postHref(site, po))}">${showImg && po.cover ? `<img class="shot" src="${url(po.cover)}" alt="" loading="lazy">` : ''}<span class="date">${esc(fmtDate(po.date))}</span><h3>${esc(po.title)}</h3><p>${esc(po.excerpt)}</p></a>`;

  return {
    hero: p => `
  ${p.eyebrow ? `<span class="eyebrow">${T(p, 'eyebrow')}</span>` : ''}
  <h1>${T(p, 'title')}${p.highlight ? `<br><span class="hl">${T(p, 'highlight')}</span>` : ''}</h1>
  ${p.text ? `<p class="lead">${T(p, 'text')}</p>` : ''}
  ${buttons(p)}
  ${p.image ? `<img class="hero-shot" src="${url(p.image)}" alt="">` : ''}`,
    heading: p => `<h${p.level || 2} class="bh">${T(p, 'text')}</h${p.level || 2}>${p.subtitle ? `<p class="sub">${T(p, 'subtitle')}</p>` : ''}`,
    text: p => H(p, 'html'),
    image: p => {
      const img = `<img src="${url(p.src)}" alt="${esc(p.alt)}" class="${p.rounded ? 'rounded' : ''}" style="max-width:${esc(p.maxWidth || '100%')}" loading="lazy">`;
      return `<figure class="bimg">${p.link ? `<a href="${url(p.link)}"${ext(p.link)}>${img}</a>` : img}${p.caption ? `<figcaption>${T(p, 'caption')}</figcaption>` : ''}</figure>`;
    },
    buttons: p => buttons(p),
    cards: p => `${head(p)}
  <div class="grid cols-${p.columns || 3}">${(p.items || []).map((c, i) => {
    const inner = `${c.image ? `<img class="shot" src="${url(c.image)}" alt="" loading="lazy">` : c.icon ? `<div class="ico">${esc(c.icon)}</div>` : ''}<h3>${T(p, `items.${i}.title`)}</h3><p>${T(p, `items.${i}.text`)}</p>${tag(p, 'items.' + i)}`;
    return c.link && !preview ? `<a class="card link" href="${url(c.link)}"${ext(c.link)}>${inner}</a>` : `<div class="card${c.link ? ' link' : ''}"${c.link ? ` data-href="${url(c.link)}"` : ''}>${inner}</div>`;
  }).join('')}</div>`,
    features: p => `${head(p)}
  <div class="feats cols-${p.columns || 4}">${(p.items || []).map((f, i) => `<div class="feat"><h4>${f.icon ? `<span class="fi">${esc(f.icon)}</span>` : ''}${T(p, `items.${i}.title`)}</h4><p>${T(p, `items.${i}.text`)}</p></div>`).join('')}</div>`,
    columns: p => `<div class="cols cols-${(p.cols || []).length || 2} va-${p.valign || 'top'}">${(p.cols || []).map((c, i) => H(p, `cols.${i}.html`)).join('')}</div>`,
    imagetext: p => `<div class="imgtext ${p.imageRight ? 'right' : ''}">${p.image ? `<img src="${url(p.image)}" alt="" class="rounded" loading="lazy">` : '<div class="ph-img">Add an image</div>'}<div>${p.title ? `<h2 class="bh">${T(p, 'title')}</h2>` : ''}${H(p, 'html')}${buttons(p)}</div></div>`,
    gallery: p => `<div class="gallery cols-${p.columns || 3}${p.lightbox !== false ? ' lb' : ''}">${(p.images || []).map((im, i) => `<figure><img src="${url(im.src)}" alt="${esc(im.caption)}" loading="lazy">${im.caption ? `<figcaption>${T(p, `images.${i}.caption`)}</figcaption>` : ''}</figure>`).join('')}</div>`,
    video: p => { const e = embedSrc(p.url); return `${p.title ? `<h2 class="bh">${T(p, 'title')}</h2>` : ''}${p.url ? `<div class="video"><iframe src="${url(e.src)}" title="${esc(p.title || 'Video')}" allowfullscreen loading="lazy" allow="accelerometer; encrypted-media; picture-in-picture"></iframe></div>` : '<div class="ph-img">Paste a YouTube link</div>'}`; },
    embed: p => { const e = embedSrc(p.url); return p.url ? `<div class="embed" style="${e.ratio ? `aspect-ratio:${e.ratio};` : `height:${e.height}px;`}${e.max ? `max-width:${e.max}px;margin:0 auto;` : ''}"><iframe src="${url(e.src)}" loading="lazy" allowfullscreen allow="autoplay; encrypted-media; picture-in-picture; clipboard-write"></iframe></div>` : '<div class="ph-img">Paste a Steam, Twitch, Spotify, TikTok, Vimeo or YouTube link</div>'; },
    cta: p => `<div class="cta"><h2>${T(p, 'title')}</h2>${p.text ? `<p>${T(p, 'text')}</p>` : ''}${buttons(p)}</div>`,
    faq: p => `${head(p)}<div class="faq">${(p.items || []).map((q, i) => `<details${i === 0 && p.openFirst ? ' open' : ''}><summary>${T(p, `items.${i}.q`)}</summary>${H(p, `items.${i}.a`)}</details>`).join('')}</div>`,
    pricing: p => `${head(p)}<div class="grid cols-${(p.plans || []).length || 3}">${(p.plans || []).map((pl, i) => `
    <div class="card plan ${pl.featured ? 'featured' : ''}">${pl.featured && pl.badge ? `<span class="badge">${esc(pl.badge)}</span>` : ''}<h3>${T(p, `plans.${i}.name`)}</h3><div class="price">${T(p, `plans.${i}.price`)}${pl.period ? `<small>${esc(pl.period)}</small>` : ''}</div><ul>${String(pl.features || '').split('\n').filter(Boolean).map(f => `<li>${esc(f)}</li>`).join('')}</ul>${pl.buttonText ? `<a class="btn ${pl.featured ? 'primary' : 'ghost'}" href="${url(pl.buttonLink)}"${ext(pl.buttonLink)}>${esc(pl.buttonText)}</a>` : ''}</div>`).join('')}</div>`,
    quote: p => `<blockquote class="quote"><p>“${T(p, 'text')}”</p>${p.author ? `<cite>— ${T(p, 'author')}</cite>` : ''}</blockquote>`,
    testimonials: p => `${head(p)}<div class="${p.layout === 'slider' ? 'slider' : 'grid cols-' + (p.columns || 3)}">${(p.items || []).map((t, i) => `<figure class="card testi">${t.rating ? `<div class="stars">${'★'.repeat(Math.min(5, t.rating))}${'☆'.repeat(5 - Math.min(5, t.rating))}</div>` : ''}<blockquote>“${T(p, `items.${i}.text`)}”</blockquote><figcaption>${t.avatar ? `<img src="${url(t.avatar)}" alt="">` : ''}<span><b>${T(p, `items.${i}.name`)}</b><small>${T(p, `items.${i}.role`)}</small></span></figcaption></figure>`).join('')}</div>`,
    stats: p => `${head(p)}<div class="stats cols-${(p.items || []).length || 4}">${(p.items || []).map((s, i) => `<div class="stat"><div class="num" data-count="${esc(s.value)}">${esc(s.value)}</div><div class="lbl">${T(p, `items.${i}.label`)}</div></div>`).join('')}</div>`,
    logos: p => `${p.title ? `<p class="logos-title">${T(p, 'title')}</p>` : ''}<div class="logos ${p.scroll ? 'marquee' : ''}"><div class="track">${[...(p.items || []), ...(p.scroll ? (p.items || []) : [])].map(l => { const im = `<img src="${url(l.src)}" alt="${esc(l.name)}" loading="lazy" style="height:${Number(p.height) || 40}px">`; return l.link ? `<a href="${url(l.link)}"${ext(l.link)}>${im}</a>` : im; }).join('')}</div></div>`,
    team: p => `${head(p)}<div class="grid cols-${p.columns || 4}">${(p.items || []).map((m, i) => `<div class="card member">${m.photo ? `<img src="${url(m.photo)}" alt="" loading="lazy">` : `<div class="avatar">${esc((m.name || '?')[0])}</div>`}<h3>${T(p, `items.${i}.name`)}</h3><p class="role">${T(p, `items.${i}.role`)}</p>${m.bio ? `<p>${T(p, `items.${i}.bio`)}</p>` : ''}${m.link ? `<a href="${url(m.link)}"${ext(m.link)}>${esc(m.linkText || 'Profile')} →</a>` : ''}</div>`).join('')}</div>`,
    timeline: p => `${head(p)}<ol class="timeline">${(p.items || []).map((t, i) => `<li class="${t.status || ''}"><span class="dot"></span><div><span class="when">${T(p, `items.${i}.when`)}</span><h3>${T(p, `items.${i}.title`)}</h3><p>${T(p, `items.${i}.text`)}</p></div></li>`).join('')}</ol>`,
    tabs: p => `${head(p)}<div class="tabs" data-tabs><div class="tablist">${(p.items || []).map((t, i) => `<button type="button" class="${i ? '' : 'on'}" data-tab="${i}">${esc(t.label)}</button>`).join('')}</div>${(p.items || []).map((t, i) => `<div class="tabpane ${i ? '' : 'on'}" data-pane="${i}">${t.image ? `<img src="${url(t.image)}" alt="" class="rounded" loading="lazy">` : ''}${H(p, `items.${i}.html`)}</div>`).join('')}</div>`,
    countdown: p => `${p.title ? `<h2 class="bh">${T(p, 'title')}</h2>` : ''}<div class="countdown" data-to="${esc(p.date)}" data-done="${esc(p.doneText || '')}">${['days', 'hours', 'minutes', 'seconds'].map(u => `<div><b data-u="${u}">00</b><span>${u}</span></div>`).join('')}</div>${buttons(p)}`,
    form: p => `${head(p)}<form class="kform" ${p.endpoint ? `action="${url(p.endpoint)}" method="POST"` : `data-mailto="${esc(p.email)}"`} data-ok="${esc(p.successText || 'Thanks! We got your message.')}">${(p.fields || []).map((f, i) => {
      const nm = esc(f.name || (f.label || 'field' + i).toLowerCase().replace(/[^a-z0-9]+/g, '_'));
      const req = f.required ? ' required' : '';
      const ctl = f.type === 'textarea' ? `<textarea name="${nm}" rows="5" placeholder="${esc(f.placeholder)}"${req}></textarea>`
        : f.type === 'select' ? `<select name="${nm}"${req}>${String(f.options || '').split('\n').filter(Boolean).map(o => `<option>${esc(o)}</option>`).join('')}</select>`
        : f.type === 'checkbox' ? `<label class="chk"><input type="checkbox" name="${nm}"${req}> ${esc(f.placeholder || f.label)}</label>`
        : `<input type="${f.type === 'email' ? 'email' : f.type === 'tel' ? 'tel' : 'text'}" name="${nm}" placeholder="${esc(f.placeholder)}"${req}>`;
      return `<div class="fld ${f.half ? 'half' : ''}">${f.type === 'checkbox' ? '' : `<label>${esc(f.label)}${f.required ? ' *' : ''}</label>`}${ctl}</div>`;
    }).join('')}<input type="text" name="_gotcha" class="hp" tabindex="-1" autocomplete="off"><button class="btn primary" type="submit">${T(p, 'button')}</button><p class="fmsg" hidden></p></form>`,
    newsletter: p => `<div class="newsletter"><div><h2 class="bh">${T(p, 'title')}</h2>${p.text ? `<p class="sub">${T(p, 'text')}</p>` : ''}</div><form class="kform inline" ${p.endpoint ? `action="${url(p.endpoint)}" method="POST"` : `data-mailto="${esc(p.email)}"`} data-ok="${esc(p.successText || "You're on the list!")}"><input type="email" name="email" placeholder="${esc(p.placeholder || 'you@email.com')}" required><input type="text" name="_gotcha" class="hp" tabindex="-1" autocomplete="off"><button class="btn primary" type="submit">${T(p, 'button')}</button><p class="fmsg" hidden></p></form></div>`,
    social: p => `${p.title ? `<h2 class="bh">${T(p, 'title')}</h2>` : ''}<div class="social ${p.size || ''}">${(p.items || []).filter(s => s.link).map(s => `<a href="${url(s.network === 'email' && !/^mailto:/.test(s.link) ? 'mailto:' + s.link : s.link)}"${ext(s.link)} title="${esc((SOCIAL[s.network] || [s.network])[0])}">${socialIcon(s.network)}${p.showLabels ? `<span>${esc((SOCIAL[s.network] || [s.network])[0])}</span>` : ''}</a>`).join('')}</div>`,
    iconlist: p => `${head(p)}<ul class="iconlist cols-${p.columns || 1}">${(p.items || []).map((it, i) => `<li><span class="li-ico">${esc(it.icon || '✓')}</span><span>${T(p, `items.${i}.text`)}</span></li>`).join('')}</ul>`,
    map: p => `${p.title ? `<h2 class="bh">${T(p, 'title')}</h2>` : ''}<div class="embed" style="aspect-ratio:${p.tall ? '4/3' : '16/7'}"><iframe loading="lazy" src="https://maps.google.com/maps?q=${encodeURIComponent(p.address || '')}&z=${Number(p.zoom) || 13}&output=embed"></iframe></div>`,
    posts: p => { const ps = sortedPosts(site).slice(0, Number(p.count) || 3); return `${head(p)}${ps.length ? `<div class="grid cols-${p.columns || 3}">${ps.map(po => postCard(po, p.images !== false)).join('')}</div>` : '<p class="sub">No posts yet. Add one in the Posts tab.</p>'}${p.allLink ? `<div class="btns" style="margin-top:24px"><a class="btn ghost" href="${url(blogBase(site))}">${esc(p.allLink)}</a></div>` : ''}`; },
    spacer: p => `<div style="height:${Number(p.height) || 40}px"></div>`,
    divider: p => `<hr class="div ${p.style || ''}">`,
    html: p => String(p.code || ''),
  };
}

function scopedCSS(id, css) {
  if (!css || !css.trim()) return '';
  const sel = `.kb-${id}`;
  return css.includes('{') ? css.replace(/&/g, sel) : `${sel}{${css}}`;
}

function blockHTML(R, b, preview) {
  const r = R[b.type]; if (!r) return '';
  const s = b.style || {};
  const cls = ['blk', 'b-' + b.type, 'kb-' + b.id, 'pad-' + (s.padding || 'm'), 'w-' + (s.width || 'normal'),
    s.align ? 'al-' + s.align : '', s.bg && !['custom', 'image', 'gradient'].includes(s.bg) ? 'bg-' + s.bg : '',
    s.hideMobile ? 'hide-m' : '', s.hideDesktop ? 'hide-d' : '', s.animation ? 'anim a-' + s.animation : '',
    s.divider ? 'sep-' + s.divider : '', s.className || ''].filter(Boolean).join(' ');
  const css = [];
  if (s.bg === 'custom' && s.bgColor) css.push(`background:${s.bgColor}`);
  if (s.bg === 'gradient') css.push(`background:linear-gradient(${Number(s.gradAngle ?? 135)}deg,${s.gradFrom || '#ff7a1a'},${s.gradTo || '#13151a'})`);
  if (s.bg === 'image' && s.bgImage) css.push(`background:linear-gradient(rgba(0,0,0,${(s.overlay ?? 55) / 100}),rgba(0,0,0,${(s.overlay ?? 55) / 100})),url('${url(s.bgImage)}') center/cover${s.parallax ? ' fixed' : ''}`);
  if (s.textColor) css.push(`color:${s.textColor}`);
  if (s.minHeight) css.push(`min-height:${Number(s.minHeight)}vh;display:flex;align-items:center`);
  const attrs = `${s.anchor ? ` id="${esc(s.anchor)}"` : ''}${css.length ? ` style="${esc(css.join(';'))}"` : ''}${preview ? ` data-bid="${esc(b.id)}"` : ''}${s.delay ? ` data-delay="${Number(s.delay)}"` : ''}`;
  return `<section class="${esc(cls)}"${attrs}><div class="wrap">${r(b.props || {})}</div></section>`;
}

const FONTS = { Inter: 'Inter:wght@400;600;700;800', Poppins: 'Poppins:wght@400;600;700;800', Montserrat: 'Montserrat:wght@400;600;700;800', 'Space Grotesk': 'Space+Grotesk:wght@400;600;700', Rajdhani: 'Rajdhani:wght@400;600;700', Orbitron: 'Orbitron:wght@500;700;800', Oswald: 'Oswald:wght@400;600;700', 'DM Sans': 'DM+Sans:wght@400;600;700;800', 'Bebas Neue': 'Bebas+Neue', Sora: 'Sora:wght@400;600;700;800', 'Plus Jakarta Sans': 'Plus+Jakarta+Sans:wght@400;600;700;800', Outfit: 'Outfit:wght@400;600;700;800', 'Press Start 2P': 'Press+Start+2P', Exo: 'Exo:wght@400;600;700;800', 'Chakra Petch': 'Chakra+Petch:wght@400;600;700', 'JetBrains Mono': 'JetBrains+Mono:wght@400;700' };

function navHTML(site) {
  const t = site.theme;
  const item = n => n.children && n.children.length
    ? `<div class="dd"><a href="${url(n.link || '#')}" class="ddt">${esc(n.label)} <span class="car">▾</span></a><div class="ddm">${n.children.map(c => `<a href="${url(c.link)}">${esc(c.label)}</a>`).join('')}</div></div>`
    : `<a href="${url(n.link)}">${esc(n.label)}</a>`;
  const logo = t.logoImage ? `<img src="${url(t.logoImage)}" alt="${esc(t.brand)}" class="logo-img">` : `<span class="key">${esc(t.logoIcon || '⌘')}</span>`;
  const cta = site.header && site.header.ctaText ? `<a class="btn primary sm nav-cta" href="${url(site.header.ctaLink)}">${esc(site.header.ctaText)}</a>` : '';
  return `<header class="nav${site.header && site.header.sticky === false ? ' static' : ''}${site.header && site.header.transparent ? ' clear' : ''}"><div class="wrap">
  <a class="logo" href="/">${logo}${t.hideBrandText ? '' : `<span>${esc(t.brand)}</span>`}</a>
  <input type="checkbox" id="mnav" hidden><label for="mnav" class="burger" aria-label="Menu">☰</label>
  <nav class="links">${(site.nav || []).map(item).join('')}${cta}</nav>
</div></header>`;
}

function footerHTML(site) {
  const f = site.footer || {};
  const cols = (f.columns || []).filter(c => c.links && c.links.length);
  return `<footer>${cols.length ? `<div class="wrap fcols"><div class="fbrand"><b>${esc(site.theme.brand)}</b>${f.tagline ? `<p>${esc(f.tagline)}</p>` : ''}${(f.social || []).length ? `<div class="social sm">${f.social.filter(s => s.link).map(s => `<a href="${url(s.link)}" target="_blank" rel="noopener" title="${esc((SOCIAL[s.network] || [s.network])[0])}">${socialIcon(s.network)}</a>`).join('')}</div>` : ''}</div>${cols.map(c => `<div><h4>${esc(c.title)}</h4>${c.links.map(l => `<a href="${url(l.link)}">${esc(l.label)}</a>`).join('')}</div>`).join('')}</div>` : ''}
<div class="wrap fbottom">
  <span>${esc((f.text || '').replace('{year}', new Date().getFullYear()))}</span>
  <span>${(f.links || []).map(l => `<a href="${url(l.link)}">${esc(l.label)}</a>`).join('')}</span>
</div></footer>`;
}

function renderPage(site, page, opts = {}) {
  const { preview } = opts;
  const t = site.theme, seo = site.seo || {};
  const R = makeR(site, preview);
  const fonts = [...new Set([t.font, t.headingFont])].filter(f => FONTS[f]).map(f => 'family=' + FONTS[f]).join('&');
  const title = page.seoTitle || (page.title + (page.slug ? ' — ' + t.brand : ''));
  const desc = page.description || t.description || '';
  const canonical = seo.domain ? seo.domain.replace(/\/$/, '') + (opts.href || pageHref(page)) : '';
  const og = page.ogImage || seo.ogImage;
  const ann = site.announcement && site.announcement.enabled && site.announcement.text
    ? `<div class="announce" style="${site.announcement.bg ? 'background:' + esc(site.announcement.bg) : ''}">${site.announcement.link ? `<a href="${url(site.announcement.link)}">${esc(site.announcement.text)} →</a>` : esc(site.announcement.text)}</div>` : '';
  const cookie = site.cookie && site.cookie.enabled ? `<div class="cookie" hidden><p>${esc(site.cookie.text || 'We use cookies to understand how the site is used.')}${site.cookie.link ? ` <a href="${url(site.cookie.link)}">Learn more</a>` : ''}</p><button class="btn primary sm" data-cookie="yes">Accept</button><button class="btn ghost sm" data-cookie="no">Decline</button></div>` : '';
  const blockCSS = (page.blocks || []).map(b => scopedCSS(b.id, b.style && b.style.css)).join('\n');
  return `<!doctype html>
<html lang="${esc(seo.lang || 'en')}" class="btn-${esc(t.buttonShape || 'rounded')}${t.light ? ' light' : ''}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
${page.noindex || seo.noindexAll ? '<meta name="robots" content="noindex">' : ''}
${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ''}
<meta property="og:type" content="${opts.post ? 'article' : 'website'}">
<meta property="og:title" content="${esc(page.seoTitle || page.title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:site_name" content="${esc(t.brand)}">
${canonical ? `<meta property="og:url" content="${esc(canonical)}">` : ''}
${og ? `<meta property="og:image" content="${esc((seo.domain || '').replace(/\/$/, '') + og)}"><meta name="twitter:card" content="summary_large_image">` : ''}
${t.favicon ? `<link rel="icon" href="${url(t.favicon)}">` : ''}
${(site.posts || []).length ? `<link rel="alternate" type="application/rss+xml" title="${esc(t.brand)}" href="${blogBase(site)}/feed.xml">` : ''}
${fonts ? `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?${fonts}&display=swap" rel="stylesheet">` : ''}
<link rel="stylesheet" href="/styles.css">
<style>:root{--ember:${esc(t.accent)};--ember2:${esc(t.accent2)};--bg:${esc(t.bg)};--bg2:${esc(t.bg2)};--card:${esc(t.card)};--text:${esc(t.text)};--muted:${esc(t.muted)};--font:'${esc(t.font)}';--hfont:'${esc(t.headingFont)}';--radius:${Number(t.radius) || 14}px;--max:${Number(t.maxWidth) || 1120}px}
${(site.customCSS || '').replace(/<\/style/gi, '')}
${(page.css || '').replace(/<\/style/gi, '')}
${blockCSS.replace(/<\/style/gi, '')}</style>
${site.headCode || ''}
${page.headCode || ''}
</head>
<body${preview ? ' class="kpreview"' : ''}>
${ann}
${navHTML(site)}
<main>
${(page.blocks || []).map(b => blockHTML(R, b, preview)).join('\n')}
</main>
${footerHTML(site)}
${cookie}
<script src="/site.js" defer></script>
${preview ? PREVIEW_SCRIPT : ''}
${site.bodyCode || ''}
</body>
</html>`;
}

// Editor preview: click selects, double-click edits text in place, and in Test mode links work.
const PREVIEW_SCRIPT = `<style>
.kpreview .anim{opacity:1!important;transform:none!important}
body:not(.ktest) [data-bid]{position:relative;cursor:pointer}
body:not(.ktest) [data-bid]:hover{outline:2px dashed rgba(255,122,26,.55);outline-offset:-2px}
body:not(.ktest) [data-bid].sel{outline:2px solid #ff7a1a;outline-offset:-2px}
body:not(.ktest) [data-ed]:hover,body:not(.ktest) [data-edh]:hover{box-shadow:0 0 0 1px rgba(255,122,26,.5);border-radius:3px}
[contenteditable=true]{outline:2px solid #ffb547!important;outline-offset:2px;cursor:text;border-radius:3px}
</style>
<script>
(function(){
let test=false;const P=m=>parent.postMessage(Object.assign({kws:1},m),'*');
const finish=el=>{if(el.getAttribute('contenteditable')!=='true')return;el.removeAttribute('contenteditable');const b=el.closest('[data-bid]');
 if(el.dataset.ed)P({t:'edit',id:b.dataset.bid,path:el.dataset.ed,value:el.innerText.replace(/\\n+$/,'')});else P({t:'edit',id:b.dataset.bid,path:el.dataset.edh,value:el.innerHTML,html:true});};
document.addEventListener('click',e=>{
 const a=e.target.closest('a,[data-href]');
 if(test){ if(!a)return; const h=a.getAttribute('href')||a.dataset.href||''; if(!h||h==='#')return;
   if(h.startsWith('#')){return}
   e.preventDefault(); P({t:'nav',href:h}); return; }
 if(e.target.closest('[contenteditable=true]'))return;
 if(a||e.target.closest('button,summary,input,select,textarea,label'))e.preventDefault();
 const b=e.target.closest('[data-bid]');if(b)P({t:'select',id:b.dataset.bid});
},true);
document.addEventListener('dblclick',e=>{if(test)return;const el=e.target.closest('[data-ed],[data-edh]');if(!el)return;e.preventDefault();
 el.setAttribute('contenteditable','true');el.focus();if(el.dataset.ed){const r=document.createRange();r.selectNodeContents(el);const s=getSelection();s.removeAllRanges();s.addRange(r);}});
document.addEventListener('focusout',e=>{const el=e.target;if(el.nodeType===1&&el.getAttribute('contenteditable')==='true')finish(el);});
document.addEventListener('keydown',e=>{const el=document.activeElement;
 if(!el||el.getAttribute('contenteditable')!=='true'){if(/INPUT|TEXTAREA|SELECT/.test(el&&el.tagName))return;const k=e.key.toLowerCase(),m=e.ctrlKey||e.metaKey;
  if((m&&'zyckdvse'.includes(k)&&k.length===1)||(m&&k==='enter')||k==='delete'||k==='backspace'||k==='escape'){e.preventDefault();P({t:'key',key:e.key,ctrl:m,shift:e.shiftKey});}return;}
 if(e.key==='Escape'||(e.key==='Enter'&&el.dataset.ed&&!e.shiftKey)){e.preventDefault();el.blur();}});
document.addEventListener('submit',e=>{if(!test){e.preventDefault();}},true);
addEventListener('message',e=>{const d=e.data||{};if(!d.kws)return;
 if(d.t==='highlight'){document.querySelectorAll('.sel').forEach(x=>x.classList.remove('sel'));const el=document.querySelector('[data-bid="'+d.id+'"]');if(el){el.classList.add('sel');if(d.scroll)el.scrollIntoView({behavior:'smooth',block:'center'})}}
 if(d.t==='mode'){test=d.test;document.body.classList.toggle('ktest',test);if(test)document.querySelectorAll('.anim').forEach(x=>x.classList.remove('in'));}
});
P({t:'ready'});
})();
</script>`;

/* ---------- posts ---------- */
function postPage(site, po) {
  const blocks = [
    { id: 'ph', type: 'html', props: { code: `<a class="back" href="${url(blogBase(site))}">← ${esc((site.blog && site.blog.title) || 'News')}</a><span class="date">${esc(fmtDate(po.date))}${po.author ? ' · ' + esc(po.author) : ''}</span><h1 class="bh post-title">${esc(po.title)}</h1>${po.excerpt ? `<p class="lead">${esc(po.excerpt)}</p>` : ''}${po.cover ? `<img class="cover rounded" src="${url(po.cover)}" alt="">` : ''}` }, style: { padding: 'm', width: 'narrow' } },
    { id: 'pb', type: 'text', props: { html: po.html }, style: { padding: 'none', width: 'narrow' } },
    { id: 'pf', type: 'spacer', props: { height: 60 }, style: { padding: 'none' } },
  ];
  return { title: po.title, slug: '', seoTitle: po.title + ' — ' + site.theme.brand, description: po.excerpt, ogImage: po.cover, blocks };
}
function blogIndexPage(site) {
  const b = site.blog || {};
  return { title: b.title || 'News', slug: (b.path || 'news'), description: b.description, blocks: [
    { id: 'bh', type: 'heading', props: { text: b.title || 'News', subtitle: b.description || '', level: 1 }, style: { padding: 'm' } },
    { id: 'bl', type: 'posts', props: { count: 999, columns: 3 }, style: { padding: 'none' } },
    { id: 'bs', type: 'spacer', props: { height: 80 }, style: { padding: 'none' } }] };
}
function rss(site) {
  const d = (site.seo && site.seo.domain || '').replace(/\/$/, '');
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${esc(site.theme.brand)}</title><link>${esc(d)}</link><description>${esc(site.theme.description)}</description>${sortedPosts(site).slice(0, 30).map(p => `<item><title>${esc(p.title)}</title><link>${esc(d + postHref(site, p))}</link><guid>${esc(d + postHref(site, p))}</guid><pubDate>${new Date(p.date + 'T12:00:00Z').toUTCString()}</pubDate><description>${esc(p.excerpt)}</description></item>`).join('')}</channel></rss>`;
}

function build(SITE, DIST, opts = {}) {
  const site = JSON.parse(fs.readFileSync(path.join(SITE, 'site.json'), 'utf8'));
  const preview = !!opts.preview;
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });
  const urls = [];
  for (const p of site.pages) {
    if (p.draft && !preview) continue;
    fs.writeFileSync(path.join(DIST, pageFile(p)), renderPage(site, p, { preview }));
    if (!p.noindex && p.slug !== '404') urls.push(pageHref(p));
  }
  const posts = preview ? (site.posts || []) : sortedPosts(site);
  if (posts.length || (site.blog && site.blog.enabled)) {
    const base = (site.blog && site.blog.path) || 'news';
    if (!site.pages.some(p => p.slug === base)) { fs.writeFileSync(path.join(DIST, base + '.html'), renderPage(site, blogIndexPage(site), { preview })); urls.push('/' + base); }
    fs.mkdirSync(path.join(DIST, base), { recursive: true });
    for (const po of posts) {
      fs.writeFileSync(path.join(DIST, base, po.slug + '.html'), renderPage(site, postPage(site, po), { preview, post: true, href: postHref(site, po) }));
      urls.push(postHref(site, po));
    }
    fs.writeFileSync(path.join(DIST, base, 'feed.xml'), rss(site));
  }
  fs.copyFileSync(path.join(__dirname, 'styles.css'), path.join(DIST, 'styles.css'));
  fs.copyFileSync(path.join(__dirname, 'site.js'), path.join(DIST, 'site.js'));
  fs.cpSync(path.join(SITE, 'assets'), path.join(DIST, 'assets'), { recursive: true });
  if (!site.pages.some(p => p.slug === '404')) fs.writeFileSync(path.join(DIST, '404.html'), renderPage(site, { title: 'Page not found', slug: '404', blocks: [{ id: 'nf', type: 'hero', props: { title: 'Page not found', text: "That page doesn't exist.", buttons: [{ text: 'Go home', link: '/' }] }, style: { padding: 'xl', align: 'center' } }] }));
  // SEO + hosting files
  const dom = (site.seo && site.seo.domain || '').replace(/\/$/, '');
  if (dom) fs.writeFileSync(path.join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u => `<url><loc>${esc(dom + u)}</loc></url>`).join('')}</urlset>`);
  fs.writeFileSync(path.join(DIST, 'robots.txt'), site.seo && site.seo.noindexAll ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\n${dom ? `Sitemap: ${dom}/sitemap.xml\n` : ''}`);
  const red = (site.redirects || []).filter(r => r.from && r.to).map(r => `${r.from} ${r.to} ${r.code || 301}`).join('\n');
  if (red) fs.writeFileSync(path.join(DIST, '_redirects'), red + '\n');
  return DIST;
}

module.exports = { build, pageFile, pageHref };
