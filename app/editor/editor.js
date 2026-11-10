/* Keycap Web Editor v3 — page builder UI */
const $ = s => document.querySelector(s);
const h = (tag, attrs = {}, ...kids) => {
  if (attrs instanceof Node || Array.isArray(attrs) || typeof attrs === 'string') { kids.unshift(attrs); attrs = {}; }
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') e.className = v; else if (k === 'style') e.style.cssText = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v !== undefined && v !== null && v !== false) e[k] = v;
  }
  kids.flat().forEach(k => k != null && k !== false && e.append(k)); return e;
};
const clone = o => JSON.parse(JSON.stringify(o));
const uid = () => 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const api = (u, o = {}) => fetch(u, { headers: { 'Content-Type': 'application/json' }, ...o, body: o.body && typeof o.body !== 'string' ? JSON.stringify(o.body) : o.body });
const slugify = s => String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const setPath = (o, p, v) => { const ks = p.split('.'); const last = ks.pop(); const t = ks.reduce((a, k) => a[k], o); t[last] = v; };
const typing = () => /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || document.activeElement.isContentEditable;

let S;                 // the whole site
let cur = 'home';      // current page id
let curPost = null;    // post open in the Posts tab
let sel = null;        // selected block id
let tab = 'blocks', sub = 'content', testMode = false;
let saveTimer, histTimer, hist = [], hi = -1, saving = false, pendingSave = false;
let clip = null; try { clip = JSON.parse(localStorage.getItem('kwe-clip')); } catch {}
const openItems = new WeakSet();

const page = () => S.pages.find(p => p.id === cur) || S.pages[0];
const block = () => page().blocks.find(b => b.id === sel);
const pageFile = p => (!p.slug || p.slug === 'index' ? 'index' : p.slug) + '.html';
const newIds = b => { b.id = uid(); return b; };

function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2400); }
function status(txt, dirty) { const s = $('#status'); s.textContent = txt; s.classList.toggle('dirty', !!dirty); }

/* ---------- data upgrade (older versions) ---------- */
function ensure(S) {
  S.theme = Object.assign({ buttonShape: 'rounded', maxWidth: 1120, light: false }, S.theme);
  S.header = Object.assign({ sticky: true, transparent: false, ctaText: '', ctaLink: '' }, S.header);
  S.announcement = Object.assign({ enabled: false, text: '', link: '', bg: '' }, S.announcement);
  S.seo = Object.assign({ domain: 'https://keycapstudios.com', ogImage: '', lang: 'en', noindexAll: false }, S.seo);
  S.cookie = Object.assign({ enabled: false, text: '', link: '/privacy' }, S.cookie);
  S.blog = Object.assign({ title: 'News', path: 'news', description: '' }, S.blog);
  S.footer = Object.assign({ text: '', links: [], columns: [], tagline: '', social: [] }, S.footer);
  for (const k of ['posts', 'library', 'redirects', 'nav']) S[k] = S[k] || [];
  S.nav.forEach(n => n.children = n.children || []);
  S.bodyCode = S.bodyCode || '';
  return S;
}

/* ---------- history + saving ---------- */
function snapshot() { hist = hist.slice(0, hi + 1); hist.push(JSON.stringify({ S, cur })); if (hist.length > 200) hist.shift(); hi = hist.length - 1; updUndo(); }
function updUndo() { $('#undoBtn').disabled = hi <= 0; $('#redoBtn').disabled = hi >= hist.length - 1; }
function changed(structural) {
  status('Saving…', true);
  clearTimeout(histTimer); histTimer = setTimeout(snapshot, structural ? 0 : 500);
  clearTimeout(saveTimer); saveTimer = setTimeout(save, structural ? 50 : 600);
  if (structural) renderPanel();
}
async function save() {
  clearTimeout(saveTimer); saveTimer = null;
  if (saving) { pendingSave = true; return; }
  saving = true;
  try { await api('/api/site', { method: 'POST', body: S }); status('All changes saved'); refresh(); }
  catch { status('Save failed — retrying', true); setTimeout(save, 2000); }
  saving = false;
  if (pendingSave) { pendingSave = false; save(); }
}
function travel(d) {
  const n = hi + d; if (n < 0 || n >= hist.length) return;
  hi = n; const st = JSON.parse(hist[hi]); S = st.S; cur = st.cur;
  if (sel && !block()) sel = null;
  updUndo(); renderAll(); status('Saving…', true); save();
}

/* ---------- preview ---------- */
let lastSrc = '';
function previewSrc() { return tab === 'posts' && curPost ? `/preview/${S.blog.path || 'news'}/${curPost.slug}.html` : '/preview/' + pageFile(page()); }
function refresh(force) {
  const pv = $('#pv'), src = previewSrc();
  let y = 0; try { if (lastSrc === src) y = pv.contentWindow.scrollY; } catch {}
  pv.onload = () => { try { pv.contentWindow.scrollTo(0, y); } catch {} send({ t: 'mode', test: testMode }); highlight(false); };
  pv.src = src + '?t=' + Date.now(); lastSrc = src;
}
function send(m) { try { $('#pv').contentWindow.postMessage(Object.assign({ kws: 1 }, m), '*'); } catch {} }
function highlight(scroll) { send({ t: 'highlight', id: sel, scroll }); }
addEventListener('message', e => {
  const d = e.data; if (!d || !d.kws) return;
  if (d.t === 'select') { sel = d.id; tab = 'blocks'; sub = 'content'; renderAll(); highlight(false); }
  if (d.t === 'edit') {
    const b = page().blocks.find(x => x.id === d.id); if (!b) return;
    try { setPath(b.props, d.path, d.value); } catch { return; }
    sel = b.id; tab = 'blocks'; renderAll(); changed(false);
  }
  if (d.t === 'nav') navigateTest(d.href);
  if (d.t === 'key') handleKey({ key: d.key, ctrlKey: d.ctrl, metaKey: false, shiftKey: d.shift, preventDefault() {} }, false);
});
function navigateTest(href) {
  if (/^(https?:|mailto:|tel:)/.test(href)) { window.open(href); return; }
  const [p0, hash] = href.split('#');
  const pathOnly = (p0 || '/').replace(/\.html$/, '');
  const target = S.pages.find(p => (p.slug ? '/' + p.slug : '/') === (pathOnly || '/'));
  if (target) { cur = target.id; sel = null; renderTop(); renderPanel(); }
  $('#pv').src = (target ? '/preview/' + pageFile(target) : '/preview' + (pathOnly === '/' ? '/index' : pathOnly) + '.html') + '?t=' + Date.now() + (hash ? '#' + hash : '');
  $('#pv').onload = () => send({ t: 'mode', test: testMode });
}
function setMode(t) {
  testMode = t; document.querySelectorAll('#mode button').forEach(b => b.classList.toggle('on', (b.dataset.m === 'test') === t));
  send({ t: 'mode', test: t }); toast(t ? 'Test mode: buttons and links work. Switch back to Edit to change things.' : 'Edit mode: click to select, double-click text to edit');
}

/* ---------- fields ---------- */
function lbl(t) { return h('label', { class: 'f', textContent: t }); }
function linkOptions() {
  const list = [];
  S.pages.forEach(p => { const base = p.slug ? '/' + p.slug : '/'; list.push(base); (p.blocks || []).forEach(b => b.style && b.style.anchor && list.push((p.slug ? base : '/') + '#' + b.style.anchor)); });
  (S.posts || []).forEach(p => list.push(`/${S.blog.path || 'news'}/${p.slug}`));
  if ((S.posts || []).length) list.push('/' + (S.blog.path || 'news'));
  return [...new Set(list)];
}
function field(obj, f) {
  if (f.group) return h('h3', { class: 'ph sm', textContent: f.group });
  const w = h('div');
  const set = v => { obj[f.key] = v; changed(false); };
  const t = f.type || 'text';
  if (t === 'toggle') {
    const cb = h('input', { type: 'checkbox', checked: !!obj[f.key], onchange: () => { obj[f.key] = cb.checked; changed(true); } });
    return h('label', { class: 'tog' }, cb, f.label);
  }
  if (f.label) w.append(lbl(f.label));
  if (t === 'text' || t === 'link') {
    const i = h('input', { type: 'text', value: obj[f.key] ?? '', placeholder: f.placeholder || '', oninput: () => set(i.value) });
    if (t === 'link') { const id = 'dl' + Math.random().toString(36).slice(2); i.setAttribute('list', id); i.placeholder = '/page, /#anchor or https://…'; w.append(i, h('datalist', { id }, linkOptions().map(o => h('option', { value: o })))); }
    else w.append(i);
  } else if (t === 'textarea') {
    const i = h('textarea', { value: obj[f.key] ?? '', oninput: () => set(i.value) }); w.append(i);
  } else if (t === 'code') {
    const i = h('textarea', { class: 'code', value: obj[f.key] ?? '', spellcheck: false, oninput: () => set(i.value) });
    i.addEventListener('keydown', e => { if (e.key === 'Tab') { e.preventDefault(); document.execCommand('insertText', false, '  '); } });
    w.append(i);
  } else if (t === 'number') {
    const i = h('input', { type: 'number', value: obj[f.key] ?? '', oninput: () => set(i.value === '' ? '' : Number(i.value)) }); w.append(i);
  } else if (t === 'date') {
    const i = h('input', { type: 'date', value: obj[f.key] ?? '', oninput: () => set(i.value) }); w.append(i);
  } else if (t === 'select') {
    const s = h('select', { onchange: () => { obj[f.key] = f.options[s.selectedIndex][0]; changed(true); } },
      f.options.map(([v, l]) => h('option', { textContent: l, selected: String(obj[f.key] ?? '') === String(v) })));
    w.append(s);
  } else if (t === 'color') {
    const c = h('input', { type: 'color', value: obj[f.key] || '#ffffff', oninput: () => set(c.value) });
    const row = h('div', { class: 'row' }, c, h('input', { type: 'text', value: obj[f.key] || '', placeholder: f.clearable ? 'default' : '', style: 'width:100px', onchange: e => { obj[f.key] = e.target.value; changed(true); } }));
    if (f.clearable && obj[f.key]) row.append(h('button', { class: 'sm', textContent: 'Clear', onclick: () => { obj[f.key] = ''; changed(true); } }));
    w.append(row);
  } else if (t === 'image') {
    w.append(imageField(obj, f.key));
  } else if (t === 'rich') {
    w.append(richText(obj[f.key] || '', v => set(v)));
  } else if (t === 'list') {
    w.append(listField(obj, f));
  }
  if (f.hint) w.append(h('p', { class: 'hint', textContent: f.hint }));
  return w;
}
function fields(obj, list) { return list.filter(f => !f.when || f.when(obj)).map(f => field(obj, f)); }

function imageField(obj, key) {
  const row = h('div', { class: 'imgf' },
    obj[key] ? h('img', { src: obj[key] }) : h('div', { class: 'none', textContent: 'none' }),
    h('button', { class: 'sm', textContent: obj[key] ? 'Change' : 'Choose image', onclick: () => mediaPicker(u => { obj[key] = u; changed(true); }) }));
  if (obj[key]) row.append(h('button', { class: 'sm danger', textContent: 'Remove', onclick: () => { obj[key] = ''; changed(true); } }));
  return row;
}

function listField(obj, f) {
  const arr = obj[f.key] = obj[f.key] || [];
  const box = h('div', { class: 'lfield' });
  arr.forEach((it, i) => {
    const open = openItems.has(it);
    const title = (f.item && it[f.item]) || `${f.label.replace(/s$/, '')} ${i + 1}`;
    const head = h('div', { class: 'lh', onclick: e => { if (e.target.closest('button')) return; open ? openItems.delete(it) : openItems.add(it); renderPanel(); } },
      h('span', { textContent: (open ? '▾ ' : '▸ ') + String(title).replace(/<[^>]+>/g, '').slice(0, 40) }),
      h('button', { class: 'sm ghost', title: 'Move up', textContent: '↑', onclick: () => { if (i) { [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; changed(true); } } }),
      h('button', { class: 'sm ghost', title: 'Move down', textContent: '↓', onclick: () => { if (i < arr.length - 1) { [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; changed(true); } } }),
      h('button', { class: 'sm ghost', title: 'Duplicate', textContent: '⧉', onclick: () => { arr.splice(i + 1, 0, clone(it)); changed(true); } }),
      h('button', { class: 'sm ghost danger', title: 'Delete', textContent: '✕', onclick: () => { arr.splice(i, 1); changed(true); } }));
    const item = h('div', { class: 'litem' }, head);
    if (open) item.append(h('div', { class: 'lb' }, fields(it, f.fields)));
    box.append(item);
  });
  if (!f.max || arr.length < f.max) box.append(h('button', { class: 'sm', style: 'margin-top:8px', textContent: '+ Add ' + (f.addLabel || ''), onclick: () => { const n = clone(f.blank); openItems.add(n); arr.push(n); changed(true); } }));
  return box;
}

function richText(html, onChange) {
  const ed = h('div', { class: 'ed', contentEditable: true, innerHTML: html });
  const cmd = (c, v) => { ed.focus(); document.execCommand(c, false, v); onChange(ed.innerHTML); };
  const B = (label, title, fn) => h('button', { innerHTML: label, title, onmousedown: e => { e.preventDefault(); fn(); } });
  const tb = h('div', { class: 'tb' },
    B('<b>B</b>', 'Bold', () => cmd('bold')), B('<i>I</i>', 'Italic', () => cmd('italic')), B('<u>U</u>', 'Underline', () => cmd('underline')), B('<s>S</s>', 'Strikethrough', () => cmd('strikeThrough')),
    B('H2', 'Heading', () => cmd('formatBlock', 'h2')), B('H3', 'Small heading', () => cmd('formatBlock', 'h3')), B('¶', 'Paragraph', () => cmd('formatBlock', 'p')),
    B('• List', 'Bullet list', () => cmd('insertUnorderedList')), B('1. List', 'Numbered list', () => cmd('insertOrderedList')), B('❝', 'Quote', () => cmd('formatBlock', 'blockquote')),
    B('⇤', 'Align left', () => cmd('justifyLeft')), B('⇔', 'Centre', () => cmd('justifyCenter')),
    B('🎨', 'Text colour', () => { const c = prompt('Colour (e.g. #ff7a1a or red)', '#ff7a1a'); if (c) cmd('foreColor', c); }),
    B('🔗', 'Link', () => { const u = prompt('Link to (e.g. /privacy or https://…)'); if (u) cmd('createLink', u); }),
    B('⛓', 'Remove link', () => cmd('unlink')),
    B('🖼', 'Insert image', () => { const r = saveSel(); mediaPicker(u => { restoreSel(r); cmd('insertImage', u); }); }),
    B('―', 'Line', () => cmd('insertHorizontalRule')),
    B('⌫', 'Clear formatting', () => cmd('removeFormat')),
    B('&lt;/&gt;', 'Edit HTML', () => codePopup(ed.innerHTML, v => { ed.innerHTML = v; onChange(v); })));
  ed.addEventListener('input', () => onChange(ed.innerHTML));
  ed.addEventListener('paste', e => { e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain')); });
  return h('div', { class: 'rt' }, tb, ed);
}
function saveSel() { const s = getSelection(); return s.rangeCount ? s.getRangeAt(0).cloneRange() : null; }
function restoreSel(r) { if (!r) return; const s = getSelection(); s.removeAllRanges(); s.addRange(r); }

/* ---------- panels ---------- */
function renderAll() { renderTop(); renderPanel(); }
function renderTop() {
  const ps = $('#pageSel'); ps.innerHTML = '';
  S.pages.forEach(p => ps.append(h('option', { value: p.id, textContent: (p.draft ? '✎ ' : '📄 ') + p.title, selected: p.id === cur })));
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  $('#pasteHint').classList.toggle('hidden', !clip);
}
function renderPanel() {
  const P = $('#panel'); const st = P.scrollTop; P.innerHTML = '';
  if (tab === 'blocks') sel && block() ? inspector(P) : outline(P);
  if (tab === 'pages') pagesPanel(P);
  if (tab === 'posts') postsPanel(P);
  if (tab === 'site') sitePanel(P);
  if (tab === 'media') P.append(h('h3', { class: 'ph', textContent: 'Media library' }), mediaBrowser(null));
  P.scrollTop = st;
}

function summary(b) {
  const p = b.props || {};
  return String(p.title || p.text || p.html || p.url || p.address || p.code || (p.items && p.items[0] && (p.items[0].title || p.items[0].text || p.items[0].label)) || '').replace(/<[^>]+>/g, ' ').trim().slice(0, 60);
}
function insertBlock(at, b) { page().blocks.splice(at, 0, b); sel = b.id; sub = 'content'; tab = 'blocks'; changed(true); setTimeout(() => highlight(true), 450); }
function copyBlock(b) { clip = clone(b); try { localStorage.setItem('kwe-clip', JSON.stringify(clip)); } catch {} renderTop(); toast('Block copied — paste on any page with Ctrl+V'); }
function pasteBlock() {
  if (!clip) return toast('Nothing copied yet');
  const bl = page().blocks; const i = sel ? bl.findIndex(b => b.id === sel) + 1 : bl.length;
  insertBlock(i, newIds(clone(clip))); toast('Block pasted');
}
function saveToLibrary(b) {
  const name = prompt('Name for this saved block', (BLOCKS[b.type] || {}).name); if (!name) return;
  S.library.push({ id: uid(), name, block: clone(b) }); changed(false); toast('Saved to My blocks');
}

let dragIdx = null;
function outline(P) {
  const pg = page(), bl = pg.blocks;
  P.append(h('div', { class: 'row', style: 'justify-content:space-between' }, h('h3', { class: 'ph', style: 'margin:0', textContent: `Blocks on “${pg.title}”` }),
    clip ? h('button', { class: 'sm', textContent: '📋 Paste', title: 'Paste copied block (Ctrl+V)', onclick: pasteBlock }) : null));
  if (!bl.length) P.append(h('p', { class: 'hint', textContent: 'This page is empty. Add your first block.' }));
  const list = h('div', { class: 'blist' });
  const ins = i => {
    const z = h('div', { class: 'ins', style: 'position:relative' }, h('button', { textContent: '+', title: 'Add a block here', onclick: () => blockPicker(i) }));
    z.addEventListener('dragover', e => { e.preventDefault(); z.classList.add('drop'); });
    z.addEventListener('dragleave', () => z.classList.remove('drop'));
    z.addEventListener('drop', e => { e.preventDefault(); if (dragIdx == null) return; const [m] = bl.splice(dragIdx, 1); bl.splice(i > dragIdx ? i - 1 : i, 0, m); dragIdx = null; changed(true); });
    return z;
  };
  bl.forEach((b, i) => {
    const def = BLOCKS[b.type] || { name: b.type, icon: '?' }, s = b.style || {};
    list.append(ins(i));
    const badges = [s.animation ? '✨' : '', s.hideMobile ? '📵' : '', s.hideDesktop ? '🖥✕' : '', s.css ? '🎨' : ''].join('');
    const it = h('div', { class: 'bitem' + (b.id === sel ? ' sel' : ''), draggable: true,
      onclick: e => { if (e.target.closest('button')) return; sel = b.id; sub = 'content'; renderPanel(); highlight(true); } },
      h('span', { class: 'grip', textContent: '⋮⋮', title: 'Drag to move' }),
      h('span', { class: 'bi', textContent: def.icon }),
      h('div', { class: 'bt' }, h('b', { textContent: def.name + (badges ? '  ' + badges : '') }), h('small', { textContent: summary(b) || '—' })),
      h('button', { class: 'sm ghost', title: 'Copy', textContent: '⎘', onclick: () => copyBlock(b) }),
      h('button', { class: 'sm ghost', title: 'Duplicate', textContent: '⧉', onclick: () => { bl.splice(i + 1, 0, newIds(clone(b))); changed(true); } }),
      h('button', { class: 'sm ghost danger', title: 'Delete', textContent: '✕', onclick: () => { bl.splice(i, 1); changed(true); toast('Block deleted — Ctrl+Z to undo'); } }));
    it.addEventListener('dragstart', () => { dragIdx = i; it.classList.add('dragging'); });
    it.addEventListener('dragend', () => { it.classList.remove('dragging'); document.querySelectorAll('.ins.drop').forEach(x => x.classList.remove('drop')); });
    list.append(it);
  });
  list.append(ins(bl.length));
  P.append(list, h('button', { class: 'addbig', textContent: '+ Add block', onclick: () => blockPicker(bl.length) }),
    h('p', { class: 'hint', innerHTML: '<b>Click</b> anything in the preview to select it · <b>double-click</b> text to type straight into the page · drag <b>⋮⋮</b> to reorder · <b>Ctrl+C / Ctrl+V</b> copy blocks between pages · <b>Del</b> deletes · <b>Ctrl+D</b> duplicates' }));
}

function inspector(P) {
  const b = block(), def = BLOCKS[b.type] || { name: b.type, icon: '?', fields: [] }, bl = page().blocks, i = bl.indexOf(b);
  b.style = b.style || {}; b.props = b.props || {};
  P.append(h('div', { class: 'ihead' },
    h('button', { class: 'sm', textContent: '←', title: 'All blocks', onclick: () => { sel = null; renderPanel(); highlight(false); } }),
    h('strong', { textContent: def.icon + ' ' + def.name }),
    h('button', { class: 'sm', title: 'Move up', textContent: '↑', disabled: i === 0, onclick: () => { [bl[i - 1], bl[i]] = [bl[i], bl[i - 1]]; changed(true); setTimeout(() => highlight(true), 400); } }),
    h('button', { class: 'sm', title: 'Move down', textContent: '↓', disabled: i === bl.length - 1, onclick: () => { [bl[i + 1], bl[i]] = [bl[i], bl[i + 1]]; changed(true); setTimeout(() => highlight(true), 400); } }),
    h('button', { class: 'sm', title: 'Copy (Ctrl+C)', textContent: '⎘', onclick: () => copyBlock(b) }),
    h('button', { class: 'sm', title: 'Duplicate (Ctrl+D)', textContent: '⧉', onclick: () => { const c = newIds(clone(b)); bl.splice(i + 1, 0, c); sel = c.id; changed(true); } }),
    h('button', { class: 'sm', title: 'Save to My blocks (reuse anywhere)', textContent: '★', onclick: () => saveToLibrary(b) }),
    h('button', { class: 'sm danger', title: 'Delete (Del)', textContent: '✕', onclick: () => { bl.splice(i, 1); sel = null; changed(true); toast('Block deleted — Ctrl+Z to undo'); } })));
  P.append(h('div', { class: 'subtabs' },
    h('button', { textContent: 'Content', class: sub === 'content' ? 'on' : '', onclick: () => { sub = 'content'; renderPanel(); } }),
    h('button', { textContent: 'Style', class: sub === 'style' ? 'on' : '', onclick: () => { sub = 'style'; renderPanel(); } })));
  if (sub === 'content') {
    if (!def.fields.length) P.append(h('p', { class: 'hint', textContent: 'This block has no content settings. Try the Style tab.' }));
    P.append(...fields(b.props, def.fields));
    if (b.type === 'posts' || b.type === 'form' || b.type === 'newsletter') P.append(h('p', { class: 'hint', textContent: b.type === 'posts' ? 'Write posts in the Posts tab.' : 'Tip: for real email delivery, create a free form at formspree.io or web3forms.com and paste its URL above.' }));
  } else {
    P.append(...fields(b.style, STYLE_FIELDS));
  }
}

function blockPicker(at) {
  const groups = {};
  Object.entries(BLOCKS).forEach(([k, d]) => (groups[d.group] = groups[d.group] || []).push([k, d]));
  const order = ['Layout', 'Text', 'Media', 'Content', 'Forms', 'Advanced'];
  const search = h('input', { type: 'text', placeholder: 'Search blocks…', style: 'margin-bottom:12px' });
  const body = h('div');
  const draw = () => {
    body.innerHTML = ''; const q = search.value.toLowerCase();
    if (S.library.length) {
      const items = S.library.filter(l => !q || l.name.toLowerCase().includes(q));
      if (items.length) body.append(h('h3', { class: 'ph', textContent: '★ My saved blocks' }), h('div', { class: 'picker' }, items.map(l => h('div', { class: 'pick', onclick: e => {
        if (e.target.closest('.del')) return; closeModal(); insertBlock(at, newIds(clone(l.block)));
      } }, h('span', { class: 'pi', textContent: (BLOCKS[l.block.type] || {}).icon || '★' }), h('b', { textContent: l.name }), h('small', { textContent: (BLOCKS[l.block.type] || {}).name || '' }),
        h('button', { class: 'sm danger del', textContent: 'Remove', onclick: () => { if (confirm('Remove "' + l.name + '" from My blocks?')) { S.library.splice(S.library.indexOf(l), 1); changed(false); draw(); } } })))));
    }
    for (const g of order) {
      const items = (groups[g] || []).filter(([k, d]) => !q || (d.name + ' ' + d.desc).toLowerCase().includes(q)); if (!items.length) continue;
      body.append(h('h3', { class: 'ph', textContent: g }), h('div', { class: 'picker' }, items.map(([k, d]) =>
        h('div', { class: 'pick', onclick: () => { closeModal(); insertBlock(at, { id: uid(), type: k, ...clone(d.make()) }); } },
          h('span', { class: 'pi', textContent: d.icon }), h('b', { textContent: d.name }), h('small', { textContent: d.desc })))));
    }
  };
  search.addEventListener('input', draw); draw();
  openModal('Add a block', h('div', search, body)); setTimeout(() => search.focus(), 50);
}

function pagesPanel(P) {
  P.append(h('h3', { class: 'ph', textContent: 'Pages' }));
  S.pages.forEach((p, i) => {
    const open = openItems.has(p);
    const item = h('div', { class: 'litem' + (p.id === cur ? ' cur' : '') }, h('div', { class: 'lh', onclick: e => { if (e.target.closest('button')) return; open ? openItems.delete(p) : openItems.add(p); renderPanel(); } },
      h('span', { textContent: (open ? '▾ ' : '▸ ') + (p.draft ? '✎ ' : '') + p.title }), h('small', { textContent: p.slug ? '/' + p.slug : '/', style: 'color:var(--muted);margin-right:6px' }),
      h('button', { class: 'sm', textContent: 'Edit', onclick: () => { cur = p.id; sel = null; tab = 'blocks'; renderAll(); refresh(); } }),
      h('button', { class: 'sm ghost', title: 'Duplicate', textContent: '⧉', onclick: () => { const c = clone(p); c.id = uid(); c.title += ' copy'; c.slug = (p.slug || 'home') + '-copy'; c.blocks.forEach(newIds); S.pages.splice(i + 1, 0, c); changed(true); } }),
      p.id !== 'home' ? h('button', { class: 'sm ghost danger', title: 'Delete page', textContent: '✕', onclick: () => { if (confirm(`Delete the page “${p.title}”? (Ctrl+Z can bring it back)`)) { S.pages.splice(i, 1); if (cur === p.id) { cur = S.pages[0].id; refresh(); } changed(true); } } }) : null));
    if (open) {
      const slugBox = p.id === 'home' ? h('p', { class: 'hint', textContent: 'Home page (keycapstudios.com/)' }) : (() => {
        const w = field(p, { key: 'slug', label: 'Web address: keycapstudios.com/…' }); w.querySelector('input').addEventListener('change', e => { p.slug = slugify(e.target.value); e.target.value = p.slug; changed(false); }); return w; })();
      item.append(h('div', { class: 'lb' },
        field(p, { key: 'title', label: 'Page name' }), slugBox,
        field(p, { key: 'draft', label: 'Draft (hidden from the live site)', type: 'toggle' }),
        h('h3', { class: 'ph sm', textContent: 'SEO' }),
        field(p, { key: 'seoTitle', label: 'Google / tab title' }),
        field(p, { key: 'description', label: 'Google description', type: 'textarea' }),
        h('div', lbl('Share image (Discord/Twitter preview)'), imageField(p, 'ogImage')),
        field(p, { key: 'noindex', label: 'Hide from Google', type: 'toggle' }),
        h('h3', { class: 'ph sm', textContent: 'Advanced' }),
        field(p, { key: 'css', label: 'CSS for this page only', type: 'code' }),
        field(p, { key: 'headCode', label: 'Code in <head> for this page', type: 'code' }),
        h('button', { class: 'sm', style: 'margin-top:10px', textContent: '+ Add to menu', onclick: () => { S.nav.push({ label: p.title, link: p.slug ? '/' + p.slug : '/', children: [] }); changed(true); toast('Added to the menu'); } })));
    }
    P.append(item);
  });
  P.append(h('button', { class: 'addbig', textContent: '+ New page', onclick: newPageDialog }));
}
function newPageDialog() {
  const name = h('input', { type: 'text', placeholder: 'Page name, e.g. About, ForgeCut, Contact' });
  const body = h('div', lbl('Page name'), name, h('h3', { class: 'ph', textContent: 'Start from' }), h('div', { class: 'picker' }, Object.entries(TEMPLATES).map(([k, t]) => h('div', { class: 'pick', onclick: () => {
    const n = name.value.trim(); if (!n) { name.focus(); return toast('Give the page a name first'); }
    let slug = slugify(n) || 'page'; while (S.pages.some(p => p.slug === slug)) slug += '-2';
    const p = { id: uid(), title: n, slug, description: '', blocks: t.blocks(n).map(b => ({ id: uid(), ...b })) };
    S.pages.push(p); cur = p.id; sel = null; tab = 'blocks'; closeModal(); changed(true); renderTop(); refresh();
  } }, h('span', { class: 'pi', textContent: t.icon }), h('b', { textContent: t.name })))));
  openModal('New page', body); setTimeout(() => name.focus(), 50);
}

function postsPanel(P) {
  if (curPost && S.posts.includes(curPost)) {
    const po = curPost;
    P.append(h('div', { class: 'ihead' }, h('button', { class: 'sm', textContent: '← All posts', onclick: () => { curPost = null; renderPanel(); refresh(); } }), h('strong', { textContent: po.title || 'Post' }),
      h('button', { class: 'sm danger', textContent: 'Delete', onclick: () => { if (confirm('Delete this post?')) { S.posts.splice(S.posts.indexOf(po), 1); curPost = null; changed(true); refresh(); } } })));
    const slugW = field(po, { key: 'slug', label: `Address: /${S.blog.path}/…` });
    slugW.querySelector('input').addEventListener('change', e => { po.slug = slugify(e.target.value) || 'post'; e.target.value = po.slug; changed(true); refresh(); });
    P.append(field(po, { key: 'title', label: 'Title' }), slugW,
      h('div', { class: 'row2' }, field(po, { key: 'date', label: 'Date', type: 'date' }), field(po, { key: 'author', label: 'Author' })),
      field(po, { key: 'draft', label: 'Draft (not published)', type: 'toggle' }),
      h('div', lbl('Cover image'), imageField(po, 'cover')),
      field(po, { key: 'excerpt', label: 'Short summary (cards + Google)', type: 'textarea' }),
      field(po, { key: 'html', label: 'Post', type: 'rich' }));
    return;
  }
  P.append(h('h3', { class: 'ph', textContent: 'Blog / news posts' }),
    h('p', { class: 'hint', textContent: `Posts get their own page at /${S.blog.path}/post-name, a list page at /${S.blog.path}, and an RSS feed. Show them anywhere with the “Latest posts” block.` }));
  [...S.posts].sort((a, b) => String(b.date).localeCompare(String(a.date))).forEach(po => P.append(h('div', { class: 'bitem', onclick: () => { curPost = po; renderPanel(); refresh(); } },
    h('span', { class: 'bi', textContent: po.draft ? '✎' : '📰' }), h('div', { class: 'bt' }, h('b', { textContent: po.title }), h('small', { textContent: po.date + (po.draft ? ' · draft' : '') })))));
  P.append(h('button', { class: 'addbig', textContent: '+ New post', onclick: () => {
    const t = prompt('Post title'); if (!t) return;
    let slug = slugify(t) || 'post'; while (S.posts.some(p => p.slug === slug)) slug += '-2';
    const po = { id: uid(), title: t, slug, date: new Date().toISOString().slice(0, 10), author: S.theme.brand, cover: '', excerpt: '', html: '<p>Start writing…</p>', draft: false };
    S.posts.push(po); curPost = po; changed(true); refresh();
  } }),
    h('h3', { class: 'ph', textContent: 'Blog settings' }),
    field(S.blog, { key: 'title', label: 'Blog name (e.g. News, Devlog)' }),
    (() => { const w = field(S.blog, { key: 'path', label: 'Address: keycapstudios.com/…' }); w.querySelector('input').addEventListener('change', e => { S.blog.path = slugify(e.target.value) || 'news'; e.target.value = S.blog.path; changed(true); }); return w; })(),
    field(S.blog, { key: 'description', label: 'Description', type: 'textarea' }),
    field(S.blog, { key: 'enabled', label: 'Show the blog page even with no posts', type: 'toggle' }));
}

const THEMES = {
  'Ember': { light: false, accent: '#ff7a1a', accent2: '#ffb547', bg: '#0c0d10', bg2: '#13151a', card: '#181b21', text: '#e9eaee', muted: '#9aa0ad' },
  'Neon blue': { light: false, accent: '#3b82f6', accent2: '#22d3ee', bg: '#0a0d14', bg2: '#0f1420', card: '#141a28', text: '#e6ecf5', muted: '#94a0b8' },
  'Toxic green': { light: false, accent: '#22c55e', accent2: '#a3e635', bg: '#0b0e0c', bg2: '#111612', card: '#161d18', text: '#e7efe9', muted: '#93a399' },
  'Royal purple': { light: false, accent: '#8b5cf6', accent2: '#ec4899', bg: '#0d0b14', bg2: '#14111d', card: '#1a1626', text: '#ece9f5', muted: '#a09ab4' },
  'Blood red': { light: false, accent: '#ef4444', accent2: '#f97316', bg: '#0e0b0b', bg2: '#161111', card: '#1d1616', text: '#f0e9e9', muted: '#a89a9a' },
  'Clean light': { light: true, accent: '#ff6a00', accent2: '#ff9a3c', bg: '#ffffff', bg2: '#f5f6f8', card: '#ffffff', text: '#14161b', muted: '#5d6472' },
  'Paper': { light: true, accent: '#2563eb', accent2: '#7c3aed', bg: '#fbfaf7', bg2: '#f1efe9', card: '#ffffff', text: '#1d1b16', muted: '#6b665b' },
};
const LINK_FIELDS = [{ key: 'label', label: 'Text' }, { key: 'link', label: 'Link', type: 'link' }];
function section(title, open, ...kids) { const d = h('details', { class: 'sec', open }); d.append(h('summary', { textContent: title }), h('div', { class: 'secb' }, ...kids)); return d; }
function sitePanel(P) {
  const t = S.theme;
  P.append(
    section('Branding', true,
      field(t, { key: 'brand', label: 'Studio / site name' }),
      h('div', { class: 'row2' }, field(t, { key: 'logoIcon', label: 'Logo symbol (if no image)' }), h('div', field(t, { key: 'hideBrandText', label: 'Hide name next to logo', type: 'toggle' }))),
      lbl('Logo image'), imageField(t, 'logoImage'),
      lbl('Browser tab icon (favicon)'), imageField(t, 'favicon'),
      field(t, { key: 'description', label: 'Default Google description', type: 'textarea' })),
    section('Colours & style', false,
      h('div', { class: 'row', style: 'flex-wrap:wrap' }, Object.entries(THEMES).map(([n, v]) => h('button', { class: 'sm', innerHTML: `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${v.accent};border:2px solid ${v.bg};margin-right:5px"></span>${n}`, onclick: () => { Object.assign(t, v); changed(true); } }))),
      field(t, { key: 'light', label: 'Light theme (dark text on light background)', type: 'toggle' }),
      h('div', { class: 'row2' },
        field(t, { key: 'accent', label: 'Accent', type: 'color' }), field(t, { key: 'accent2', label: 'Accent 2', type: 'color' }),
        field(t, { key: 'bg', label: 'Background', type: 'color' }), field(t, { key: 'bg2', label: 'Panel background', type: 'color' }),
        field(t, { key: 'card', label: 'Cards', type: 'color' }), field(t, { key: 'text', label: 'Text', type: 'color' }),
        field(t, { key: 'muted', label: 'Soft text', type: 'color' }), field(t, { key: 'radius', label: 'Corner roundness (px)', type: 'number' })),
      h('div', { class: 'row2' },
        field(t, { key: 'buttonShape', label: 'Button shape', type: 'select', options: [['rounded', 'Rounded'], ['pill', 'Pill'], ['square', 'Square']] }),
        field(t, { key: 'maxWidth', label: 'Page width (px)', type: 'number' })),
      h('div', { class: 'row2' },
        field(t, { key: 'headingFont', label: 'Heading font', type: 'select', options: FONTS.map(f => [f, f]) }),
        field(t, { key: 'font', label: 'Body font', type: 'select', options: FONTS.map(f => [f, f]) }))),
    section('Header & menu', false,
      field(S.header, { key: 'sticky', label: 'Stick to top when scrolling', type: 'toggle' }),
      field(S.header, { key: 'transparent', label: 'See-through over the first block', type: 'toggle' }),
      h('div', { class: 'row2' }, field(S.header, { key: 'ctaText', label: 'Menu button text (optional)' }), field(S.header, { key: 'ctaLink', label: 'Menu button link', type: 'link' })),
      listField(S, { key: 'nav', label: 'Menu links', item: 'label', addLabel: 'menu link', fields: [...LINK_FIELDS, { key: 'children', label: 'Dropdown links', type: 'list', item: 'label', fields: LINK_FIELDS, blank: { label: 'Link', link: '/' }, addLabel: 'dropdown link' }], blank: { label: 'Link', link: '/', children: [] } })),
    section('Announcement bar', false,
      field(S.announcement, { key: 'enabled', label: 'Show a bar at the very top', type: 'toggle' }),
      field(S.announcement, { key: 'text', label: 'Text' }), field(S.announcement, { key: 'link', label: 'Link (optional)', type: 'link' }),
      field(S.announcement, { key: 'bg', label: 'Background colour (optional)', type: 'color', clearable: true })),
    section('Footer', false,
      field(S.footer, { key: 'tagline', label: 'Tagline under your name' }),
      lbl('Social icons'), listField(S.footer, { key: 'social', label: 'Social links', item: 'network', fields: [{ key: 'network', label: 'Network', type: 'select', options: SOCIALS }, { key: 'link', label: 'Link', type: 'link' }], blank: { network: 'youtube', link: '' } }),
      lbl('Link columns'), listField(S.footer, { key: 'columns', label: 'Columns', item: 'title', addLabel: 'column', fields: [{ key: 'title', label: 'Column title' }, { key: 'links', label: 'Links', type: 'list', item: 'label', fields: LINK_FIELDS, blank: { label: 'Link', link: '/' } }], blank: { title: 'Column', links: [] } }),
      field(S.footer, { key: 'text', label: 'Bottom text ({year} = current year)' }),
      lbl('Bottom links'), listField(S.footer, { key: 'links', label: 'Footer links', item: 'label', fields: LINK_FIELDS, blank: { label: 'Link', link: '/' } })),
    section('SEO & sharing', false,
      field(S.seo, { key: 'domain', label: 'Website address (for Google sitemap)' }),
      lbl('Default share image (1200×630 recommended)'), imageField(S.seo, 'ogImage'),
      field(S.seo, { key: 'lang', label: 'Language code', type: 'select', options: [['en', 'English'], ['af', 'Afrikaans'], ['en-ZA', 'English (South Africa)']] }),
      field(S.seo, { key: 'noindexAll', label: 'Hide the whole site from Google (while building)', type: 'toggle' }),
      h('p', { class: 'hint', textContent: 'sitemap.xml and robots.txt are made automatically when you publish.' })),
    section('Cookie notice', false,
      field(S.cookie, { key: 'enabled', label: 'Show a cookie notice', type: 'toggle' }),
      field(S.cookie, { key: 'text', label: 'Text' }), field(S.cookie, { key: 'link', label: '"Learn more" link', type: 'link' })),
    section('Redirects', false,
      h('p', { class: 'hint', textContent: 'Send old or short addresses somewhere else, e.g. /discord → https://discord.gg/…' }),
      listField(S, { key: 'redirects', label: 'Redirects', item: 'from', fields: [{ key: 'from', label: 'From (e.g. /discord)' }, { key: 'to', label: 'To', type: 'link' }, { key: 'code', label: 'Type', type: 'select', options: [[301, 'Permanent (301)'], [302, 'Temporary (302)']] }], blank: { from: '/', to: '', code: 301 } })),
    section('Custom code', false,
      field(S, { key: 'customCSS', label: 'Custom CSS (every page)', type: 'code' }),
      field(S, { key: 'headCode', label: 'Code in <head> (analytics, verification tags)', type: 'code' }),
      field(S, { key: 'bodyCode', label: 'Code at end of <body> (chat widgets, scripts)', type: 'code' })));
}

/* ---------- media ---------- */
async function optimise(file) {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size < 350e3) return file;
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise(r => c.toBlob(r, 'image/webp', 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.webp', { type: 'image/webp' });
  } catch { return file; }
}
function mediaBrowser(onPick) {
  const box = h('div');
  const input = h('input', { type: 'file', multiple: true, accept: 'image/*,video/mp4,application/pdf', style: 'display:none', onchange: () => upload([...input.files]) });
  const opt = h('input', { type: 'checkbox', checked: true });
  const zone = h('div', { class: 'drop-zone' }, 'Drag images here or ', h('button', { class: 'sm', textContent: 'Upload', onclick: () => input.click() }), input,
    h('label', { class: 'tog', style: 'justify-content:center;margin-top:8px;font-size:12px' }, opt, 'Optimise big images (resize + WebP, much faster site)'));
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('over'));
  zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('over'); upload([...e.dataTransfer.files]); });
  const grid = h('div', { class: 'mgrid' });
  async function load() {
    const files = await (await fetch('/api/media')).json();
    grid.innerHTML = '';
    if (!files.length) grid.append(h('p', { class: 'hint', textContent: 'No files yet.' }));
    files.forEach(f => {
      const isImg = /\.(png|jpe?g|webp|gif|svg|ico)$/i.test(f.name);
      grid.append(h('div', { class: 'mcell', title: `${f.name} (${Math.round(f.size / 1024)} KB)`, onclick: e => {
        if (e.target.closest('.del')) return;
        if (onPick) { onPick(f.url); closeModal(); } else { navigator.clipboard.writeText(f.url); toast('Link copied: ' + f.url); }
      } }, isImg ? h('img', { src: f.url, loading: 'lazy' }) : h('div', { class: 'none', style: 'aspect-ratio:4/3;display:grid;place-items:center', textContent: f.name.split('.').pop().toUpperCase() }),
        h('div', { class: 'nm', textContent: `${f.name} · ${Math.round(f.size / 1024)} KB` }),
        h('button', { class: 'sm danger del', textContent: '🗑', onclick: async () => { if (confirm('Delete ' + f.name + '? Anything using it will show a broken image.')) { await fetch('/api/media/' + encodeURIComponent(f.name), { method: 'DELETE' }); load(); } } })));
    });
  }
  async function upload(files) {
    for (let f of files) {
      if (opt.checked) f = await optimise(f);
      if (f.size > 40e6) { toast(f.name + ' is too big (max 40 MB)'); continue; }
      const data = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(f); });
      const r = await (await api('/api/upload', { method: 'POST', body: { name: f.name, data } })).json();
      if (r.error) toast(f.name + ': ' + r.error);
      else if (onPick && files.length === 1) { onPick(r.url); closeModal(); return; }
    }
    load();
  }
  box.append(zone, grid); load(); return box;
}
function mediaPicker(cb) { openModal('Choose an image', mediaBrowser(cb)); }
function codePopup(code, cb) {
  const ta = h('textarea', { class: 'code', value: code, style: 'min-height:50vh' });
  openModal('Edit HTML', h('div', ta, h('div', { class: 'row', style: 'justify-content:flex-end;margin-top:10px' }, h('button', { class: 'primary', textContent: 'Apply', onclick: () => { cb(ta.value); closeModal(); } }))));
}

/* ---------- modal / menu / publish ---------- */
function openModal(title, body) { $('#mtitle').textContent = title; const b = $('#mbody'); b.innerHTML = ''; b.append(body); $('#modal').classList.remove('hidden'); }
function closeModal() { $('#modal').classList.add('hidden'); }
$('#mclose').onclick = closeModal;
$('#modal').addEventListener('mousedown', e => { if (e.target.id === 'modal') closeModal(); });

async function stream(url, title) {
  const log = $('#log'), txt = $('#logtxt'); log.querySelector('strong').textContent = title; log.classList.remove('hidden'); txt.textContent = '';
  const res = await fetch(url, { method: 'POST' }); const rd = res.body.getReader(), dec = new TextDecoder();
  for (;;) { const { done, value } = await rd.read(); if (done) break; txt.textContent += dec.decode(value); txt.scrollTop = txt.scrollHeight; }
  return txt.textContent;
}
async function publish(draft) {
  if (!confirm(draft ? 'Publish a private test version? You get a secret link to check it; the real site is not changed.' : 'Publish all changes to keycapstudios.com now?')) return;
  if (saveTimer) await save();
  $('#pubBtn').disabled = true;
  const out = await stream('/api/publish' + (draft ? '?draft=1' : ''), draft ? 'Publishing test version' : 'Publishing');
  if (!/Published|Test version/.test(out) && /log ?in|authenticat|API_TOKEN/i.test(out)) $('#logtxt').textContent += '\n👉 Click ⋯ → "Cloudflare login (once)", then publish again.\n';
  $('#pubBtn').disabled = false;
}
async function backupsDialog() {
  const list = await (await fetch('/api/backups')).json();
  const body = h('div', h('p', { class: 'hint', textContent: 'A backup is made automatically every time you publish. Restoring replaces the current site (a backup of it is made first).' }));
  if (!list.length) body.append(h('p', { textContent: 'No backups yet.' }));
  list.forEach(n => body.append(h('div', { class: 'row', style: 'justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--line)' },
    h('span', { textContent: n.replace(/\.json$/, '').replace(/T(\d\d)-(\d\d)-(\d\d)-\d+Z/, ' $1:$2:$3 UTC') }),
    h('button', { class: 'sm', textContent: 'Restore', onclick: async () => { if (!confirm('Restore this backup?')) return; await fetch('/api/backups/restore/' + encodeURIComponent(n), { method: 'POST' }); closeModal(); await load(); toast('Backup restored'); } }))));
  openModal('Backups', body);
}
function shortcutsDialog() {
  const rows = [['Click', 'Select a block in the preview'], ['Double-click text', 'Type straight into the page (Enter or click away to finish)'], ['Ctrl + Z / Ctrl + Y', 'Undo / redo'], ['Ctrl + C / Ctrl + V', 'Copy / paste the selected block (works across pages)'], ['Ctrl + D', 'Duplicate block'], ['Delete', 'Delete block'], ['Ctrl + S', 'Save now'], ['Ctrl + K', 'Add a block'], ['Ctrl + Enter', 'Toggle Edit / Test mode'], ['Esc', 'Deselect / close']];
  openModal('Keyboard shortcuts', h('div', rows.map(([k, v]) => h('div', { class: 'row', style: 'padding:6px 0;border-bottom:1px solid var(--line)' }, h('b', { textContent: k, style: 'min-width:180px' }), h('span', { textContent: v })))));
}

$('#menuBtn').onclick = e => { e.stopPropagation(); $('#menu').classList.toggle('hidden'); };
document.addEventListener('click', () => $('#menu').classList.add('hidden'));
$('#menu').addEventListener('click', async e => {
  const a = e.target.dataset.act; if (!a) return;
  if (a === 'login') stream('/api/login', 'Cloudflare login');
  if (a === 'draft') publish(true);
  if (a === 'backup') { if (saveTimer) await save(); await fetch('/api/backups', { method: 'POST' }); toast('Backup saved'); }
  if (a === 'backups') backupsDialog();
  if (a === 'keys') shortcutsDialog();
  if (a === 'site') window.open('https://keycapstudios.com');
  if (a === 'folder') { const v = await (await fetch('/api/version')).json(); prompt('Your website is saved in this folder (copy it to back up):', v.dataDir); }
});
$('#pubBtn').onclick = () => publish(false);
$('#undoBtn').onclick = () => travel(-1);
$('#redoBtn').onclick = () => travel(1);
$('#pageSel').onchange = e => { cur = e.target.value; sel = null; if (tab === 'posts') tab = 'blocks'; renderAll(); refresh(); };
document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => { const was = tab; tab = b.dataset.tab; renderAll(); if ((was === 'posts') !== (tab === 'posts')) refresh(); });
document.querySelectorAll('#device button').forEach(b => b.onclick = () => {
  document.querySelectorAll('#device button').forEach(x => x.classList.remove('on')); b.classList.add('on'); $('#frameWrap').style.width = b.dataset.w;
});
document.querySelectorAll('#mode button').forEach(b => b.onclick = () => setMode(b.dataset.m === 'test'));
document.addEventListener('keydown', e => handleKey(e, typing()));
function handleKey(e, ty) {
  const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
  if (mod && k === 's') { e.preventDefault(); save(); }
  if (mod && k === 'k') { e.preventDefault(); const bl = page().blocks; blockPicker(sel ? bl.findIndex(b => b.id === sel) + 1 : bl.length); }
  if (mod && k === 'enter') { e.preventDefault(); setMode(!testMode); }
  if (ty) return;
  if (mod && k === 'z' && !e.shiftKey) { e.preventDefault(); travel(-1); }
  if (mod && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); travel(1); }
  if (mod && k === 'c' && block() && (!e.key || !getSelection().toString())) { e.preventDefault(); copyBlock(block()); }
  if (mod && k === 'v' && tab === 'blocks') { e.preventDefault(); pasteBlock(); }
  if (mod && k === 'd' && block()) { e.preventDefault(); const bl = page().blocks, i = bl.indexOf(block()), c = newIds(clone(block())); bl.splice(i + 1, 0, c); sel = c.id; changed(true); }
  if ((k === 'delete' || k === 'backspace') && block() && tab === 'blocks') { e.preventDefault(); const bl = page().blocks; bl.splice(bl.indexOf(block()), 1); sel = null; changed(true); toast('Block deleted — Ctrl+Z to undo'); }
  if (k === 'escape') { if (!$('#modal').classList.contains('hidden')) closeModal(); else if (sel) { sel = null; renderPanel(); highlight(false); } }
}
addEventListener('beforeunload', () => { if (saveTimer) navigator.sendBeacon && fetch('/api/site', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(S) }); });

async function load() {
  S = ensure(await (await fetch('/api/site')).json());
  if (!S.pages.find(p => p.id === cur)) cur = S.pages[0].id;
  hist = []; hi = -1; snapshot();
  renderAll(); refresh(); status('All changes saved');
}
fetch('/api/version').then(r => r.json()).then(v => $('#ver').textContent = 'v' + v.version);
load();
