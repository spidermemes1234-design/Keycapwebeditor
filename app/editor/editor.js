/* Keycap Web Editor v2 — page builder UI */
const $ = s => document.querySelector(s);
const h = (tag, attrs = {}, ...kids) => {
  if (attrs instanceof Node || Array.isArray(attrs) || typeof attrs === 'string') { kids.unshift(attrs); attrs = {}; }
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v; else if (k === 'style') e.style.cssText = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v !== undefined && v !== null && v !== false) e[k] = v;
  }
  kids.flat().forEach(k => k != null && e.append(k)); return e;
};
const clone = o => JSON.parse(JSON.stringify(o));
const uid = () => 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const api = (u, o = {}) => fetch(u, { headers: { 'Content-Type': 'application/json' }, ...o, body: o.body && typeof o.body !== 'string' ? JSON.stringify(o.body) : o.body });

let S;                 // the whole site
let cur = 'home';      // current page id
let sel = null;        // selected block id
let tab = 'blocks', sub = 'content';
let saveTimer, histTimer, hist = [], hi = -1, saving = false, pendingSave = false;
const openItems = new WeakSet();

const page = () => S.pages.find(p => p.id === cur) || S.pages[0];
const block = () => page().blocks.find(b => b.id === sel);
const pageFile = p => (!p.slug || p.slug === 'index' ? 'index' : p.slug) + '.html';

function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2200); }
function status(txt, dirty) { const s = $('#status'); s.textContent = txt; s.classList.toggle('dirty', !!dirty); }

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
  clearTimeout(saveTimer);
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
let lastFile = '';
function refresh() {
  const pv = $('#pv'), file = pageFile(page());
  let y = 0; try { if (lastFile === file) y = pv.contentWindow.scrollY; } catch {}
  pv.onload = () => { try { pv.contentWindow.scrollTo(0, y); } catch {} highlight(false); };
  pv.src = '/preview/' + file + '?t=' + Date.now(); lastFile = file;
}
function highlight(scroll) { try { $('#pv').contentWindow.postMessage({ kws: 'highlight', id: sel, scroll }, '*'); } catch {} }
addEventListener('message', e => {
  if (e.data && e.data.kws === 'select') { sel = e.data.id; tab = 'blocks'; sub = 'content'; renderAll(); highlight(false); }
});

/* ---------- fields ---------- */
function lbl(t) { return h('label', { class: 'f', textContent: t }); }
function linkOptions() {
  const list = [];
  S.pages.forEach(p => { list.push(p.slug ? '/' + p.slug : '/'); (p.blocks || []).forEach(b => b.style && b.style.anchor && list.push((p.slug ? '/' + p.slug : '/') + '#' + b.style.anchor)); });
  return [...new Set(list)];
}
function field(obj, f, onStruct) {
  const w = h('div');
  const set = v => { obj[f.key] = v; changed(false); };
  const t = f.type || 'text';
  if (t === 'toggle') {
    const cb = h('input', { type: 'checkbox', checked: !!obj[f.key], onchange: () => { obj[f.key] = cb.checked; changed(!!f.structural); } });
    return h('label', { class: 'tog' }, cb, f.label);
  }
  w.append(lbl(f.label));
  if (t === 'text' || t === 'link') {
    const i = h('input', { type: 'text', value: obj[f.key] ?? '', oninput: () => set(i.value) });
    if (t === 'link') { const id = 'dl' + Math.random().toString(36).slice(2); i.setAttribute('list', id); w.append(i, h('datalist', { id }, linkOptions().map(o => h('option', { value: o })))); i.placeholder = '/page, /#anchor or https://…'; }
    else w.append(i);
  } else if (t === 'textarea') {
    const i = h('textarea', { value: obj[f.key] ?? '', oninput: () => set(i.value) }); w.append(i);
  } else if (t === 'code') {
    const i = h('textarea', { class: 'code', value: obj[f.key] ?? '', spellcheck: false, oninput: () => set(i.value) }); w.append(i);
  } else if (t === 'number') {
    const i = h('input', { type: 'number', value: obj[f.key] ?? '', oninput: () => set(i.value === '' ? '' : Number(i.value)) }); w.append(i);
  } else if (t === 'select') {
    const s = h('select', { onchange: () => { const o = f.options[s.selectedIndex][0]; obj[f.key] = o; changed(true); } },
      f.options.map(([v, l]) => h('option', { textContent: l, selected: String(obj[f.key] ?? '') === String(v) })));
    w.append(s);
  } else if (t === 'color') {
    const c = h('input', { type: 'color', value: obj[f.key] || '#ffffff', oninput: () => set(c.value) });
    const row = h('div', { class: 'row' }, c);
    if (f.clearable) row.append(h('button', { class: 'sm', textContent: obj[f.key] ? 'Clear' : 'Default', onclick: () => { obj[f.key] = ''; changed(true); } }));
    w.append(row);
  } else if (t === 'image') {
    w.append(imageField(obj, f.key));
  } else if (t === 'rich') {
    w.append(richText(obj[f.key] || '', v => set(v)));
  } else if (t === 'list') {
    w.append(listField(obj, f));
  }
  return w;
}

function imageField(obj, key) {
  const row = h('div', { class: 'imgf' },
    obj[key] ? h('img', { src: obj[key] }) : h('div', { class: 'none', textContent: 'none' }),
    h('button', { class: 'sm', textContent: obj[key] ? 'Change' : 'Choose image', onclick: () => mediaPicker(u => { obj[key] = u; changed(true); }) }));
  if (obj[key]) row.append(h('button', { class: 'sm danger', textContent: 'Remove', onclick: () => { obj[key] = ''; changed(true); } }));
  return row;
}

function listField(obj, f) {
  const arr = obj[f.key] = obj[f.key] || [];
  const box = h('div');
  arr.forEach((it, i) => {
    const open = openItems.has(it);
    const title = (f.item && it[f.item]) || `${f.label.replace(/s$/, '')} ${i + 1}`;
    const head = h('div', { class: 'lh', onclick: e => { if (e.target.tagName === 'BUTTON') return; open ? openItems.delete(it) : openItems.add(it); renderPanel(); } },
      h('span', { textContent: (open ? '▾ ' : '▸ ') + String(title).replace(/<[^>]+>/g, '').slice(0, 40) }),
      h('button', { class: 'sm ghost', title: 'Move up', textContent: '↑', onclick: () => { if (i) { [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; changed(true); } } }),
      h('button', { class: 'sm ghost', title: 'Move down', textContent: '↓', onclick: () => { if (i < arr.length - 1) { [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; changed(true); } } }),
      h('button', { class: 'sm ghost', title: 'Duplicate', textContent: '⧉', onclick: () => { arr.splice(i + 1, 0, clone(it)); changed(true); } }),
      h('button', { class: 'sm ghost danger', title: 'Delete', textContent: '✕', onclick: () => { arr.splice(i, 1); changed(true); } }));
    const item = h('div', { class: 'litem' }, head);
    if (open) item.append(h('div', { class: 'lb' }, f.fields.map(ff => field(it, ff))));
    box.append(item);
  });
  if (!f.max || arr.length < f.max) box.append(h('button', { class: 'sm', style: 'margin-top:8px', textContent: '+ Add', onclick: () => { const n = clone(f.blank); openItems.add(n); arr.push(n); changed(true); } }));
  return box;
}

function richText(html, onChange) {
  const ed = h('div', { class: 'ed', contentEditable: true, innerHTML: html });
  const cmd = (c, v) => { ed.focus(); document.execCommand(c, false, v); onChange(ed.innerHTML); };
  const tb = h('div', { class: 'tb' },
    h('button', { innerHTML: '<b>B</b>', title: 'Bold', onmousedown: e => { e.preventDefault(); cmd('bold'); } }),
    h('button', { innerHTML: '<i>I</i>', title: 'Italic', onmousedown: e => { e.preventDefault(); cmd('italic'); } }),
    h('button', { innerHTML: '<u>U</u>', title: 'Underline', onmousedown: e => { e.preventDefault(); cmd('underline'); } }),
    h('button', { textContent: 'H2', title: 'Heading', onmousedown: e => { e.preventDefault(); cmd('formatBlock', 'h2'); } }),
    h('button', { textContent: 'H3', title: 'Small heading', onmousedown: e => { e.preventDefault(); cmd('formatBlock', 'h3'); } }),
    h('button', { textContent: '¶', title: 'Paragraph', onmousedown: e => { e.preventDefault(); cmd('formatBlock', 'p'); } }),
    h('button', { textContent: '• List', onmousedown: e => { e.preventDefault(); cmd('insertUnorderedList'); } }),
    h('button', { textContent: '1. List', onmousedown: e => { e.preventDefault(); cmd('insertOrderedList'); } }),
    h('button', { textContent: '❝', title: 'Quote', onmousedown: e => { e.preventDefault(); cmd('formatBlock', 'blockquote'); } }),
    h('button', { textContent: '🔗', title: 'Link', onmousedown: e => { e.preventDefault(); const u = prompt('Link to (e.g. /privacy or https://…)'); if (u) cmd('createLink', u); } }),
    h('button', { textContent: '⛓️‍💥', title: 'Remove link', onmousedown: e => { e.preventDefault(); cmd('unlink'); } }),
    h('button', { textContent: '🖼', title: 'Insert image', onmousedown: e => { e.preventDefault(); const r = saveSel(); mediaPicker(u => { restoreSel(r); cmd('insertImage', u); }); } }),
    h('button', { textContent: '⌫', title: 'Clear formatting', onmousedown: e => { e.preventDefault(); cmd('removeFormat'); } }),
    h('button', { textContent: '</>', title: 'Edit HTML', onmousedown: e => { e.preventDefault(); codePopup(ed.innerHTML, v => { ed.innerHTML = v; onChange(v); }); } }));
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
  S.pages.forEach(p => ps.append(h('option', { value: p.id, textContent: '📄 ' + p.title, selected: p.id === cur })));
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
}
function renderPanel() {
  const P = $('#panel'); const st = P.scrollTop; P.innerHTML = '';
  if (tab === 'blocks') sel && block() ? inspector(P) : outline(P);
  if (tab === 'pages') pagesPanel(P);
  if (tab === 'site') sitePanel(P);
  if (tab === 'media') mediaPanel(P);
  P.scrollTop = st;
}

function summary(b) {
  const p = b.props || {};
  return String(p.title || p.text || p.html || p.q || p.code || (p.items && p.items[0] && p.items[0].title) || '').replace(/<[^>]+>/g, ' ').trim().slice(0, 60);
}

let dragIdx = null;
function outline(P) {
  const pg = page(), bl = pg.blocks;
  P.append(h('h3', { class: 'ph', textContent: `Blocks on “${pg.title}”` }));
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
    const def = BLOCKS[b.type] || { name: b.type, icon: '?' };
    list.append(ins(i));
    const it = h('div', { class: 'bitem' + (b.id === sel ? ' sel' : ''), draggable: true,
      onclick: e => { if (e.target.tagName === 'BUTTON') return; sel = b.id; sub = 'content'; renderPanel(); highlight(true); } },
      h('span', { class: 'grip', textContent: '⋮⋮', title: 'Drag to move' }),
      h('span', { class: 'bi', textContent: def.icon }),
      h('div', { class: 'bt' }, h('b', { textContent: def.name }), h('small', { textContent: summary(b) || '—' })),
      h('button', { class: 'sm ghost', title: 'Duplicate', textContent: '⧉', onclick: () => { const c = clone(b); c.id = uid(); bl.splice(i + 1, 0, c); changed(true); } }),
      h('button', { class: 'sm ghost danger', title: 'Delete', textContent: '✕', onclick: () => { if (confirm(`Delete this ${def.name} block?`)) { bl.splice(i, 1); changed(true); } } }));
    it.addEventListener('dragstart', () => { dragIdx = i; it.classList.add('dragging'); });
    it.addEventListener('dragend', () => { it.classList.remove('dragging'); document.querySelectorAll('.ins.drop').forEach(x => x.classList.remove('drop')); });
    list.append(it);
  });
  list.append(ins(bl.length));
  P.append(list, h('button', { class: 'addbig', textContent: '+ Add block', onclick: () => blockPicker(bl.length) }),
    h('p', { class: 'hint', textContent: 'Tip: click anything in the preview to edit it. Drag ⋮⋮ to reorder. Hover between blocks for a + to insert.' }));
}

function inspector(P) {
  const b = block(), def = BLOCKS[b.type], bl = page().blocks, i = bl.indexOf(b);
  b.style = b.style || {}; b.props = b.props || {};
  P.append(h('div', { class: 'ihead' },
    h('button', { class: 'sm', textContent: '← All blocks', onclick: () => { sel = null; renderPanel(); highlight(false); } }),
    h('strong', { textContent: def.icon + ' ' + def.name }),
    h('button', { class: 'sm', title: 'Move up', textContent: '↑', disabled: i === 0, onclick: () => { [bl[i - 1], bl[i]] = [bl[i], bl[i - 1]]; changed(true); } }),
    h('button', { class: 'sm', title: 'Move down', textContent: '↓', disabled: i === bl.length - 1, onclick: () => { [bl[i + 1], bl[i]] = [bl[i], bl[i + 1]]; changed(true); } }),
    h('button', { class: 'sm', title: 'Duplicate', textContent: '⧉', onclick: () => { const c = clone(b); c.id = uid(); bl.splice(i + 1, 0, c); sel = c.id; changed(true); } }),
    h('button', { class: 'sm danger', title: 'Delete', textContent: '✕', onclick: () => { if (confirm('Delete this block?')) { bl.splice(i, 1); sel = null; changed(true); } } })));
  P.append(h('div', { class: 'subtabs' },
    h('button', { textContent: 'Content', class: sub === 'content' ? 'on' : '', onclick: () => { sub = 'content'; renderPanel(); } }),
    h('button', { textContent: 'Style', class: sub === 'style' ? 'on' : '', onclick: () => { sub = 'style'; renderPanel(); } })));
  if (sub === 'content') {
    if (!def.fields.length) P.append(h('p', { class: 'hint', textContent: 'This block has no content settings. Try the Style tab.' }));
    def.fields.forEach(f => P.append(field(b.props, f)));
  } else {
    STYLE_FIELDS.forEach(f => { if (!f.when || f.when(b.style)) P.append(field(b.style, f)); });
  }
}

function blockPicker(at) {
  const groups = {};
  Object.entries(BLOCKS).forEach(([k, d]) => (groups[d.group] = groups[d.group] || []).push([k, d]));
  const body = h('div');
  for (const [g, items] of Object.entries(groups)) {
    body.append(h('h3', { class: 'ph', textContent: g }), h('div', { class: 'picker' }, items.map(([k, d]) =>
      h('button', { class: 'pick', onclick: () => {
        const nb = { id: uid(), type: k, ...clone(d.make()) };
        page().blocks.splice(at, 0, nb); sel = nb.id; sub = 'content'; tab = 'blocks'; closeModal(); changed(true);
        setTimeout(() => highlight(true), 400);
      } }, h('span', { class: 'pi', textContent: d.icon }), h('b', { textContent: d.name }), h('small', { textContent: d.desc })))));
  }
  openModal('Add a block', body);
}

function pagesPanel(P) {
  P.append(h('h3', { class: 'ph', textContent: 'Pages' }));
  S.pages.forEach((p, i) => {
    const open = openItems.has(p);
    const item = h('div', { class: 'litem' }, h('div', { class: 'lh', onclick: e => { if (e.target.tagName === 'BUTTON') return; open ? openItems.delete(p) : openItems.add(p); renderPanel(); } },
      h('span', { textContent: (open ? '▾ ' : '▸ ') + p.title + '  ' }), h('small', { textContent: p.slug ? '/' + p.slug : '/ (home)', style: 'color:var(--muted)' }),
      h('button', { class: 'sm', textContent: 'Edit', onclick: () => { cur = p.id; sel = null; tab = 'blocks'; renderAll(); refresh(); } }),
      h('button', { class: 'sm ghost', title: 'Duplicate', textContent: '⧉', onclick: () => { const c = clone(p); c.id = uid(); c.title += ' copy'; c.slug = (p.slug || 'home') + '-copy'; c.blocks.forEach(b => b.id = uid()); S.pages.splice(i + 1, 0, c); changed(true); } }),
      p.slug ? h('button', { class: 'sm ghost danger', title: 'Delete page', textContent: '✕', onclick: () => { if (confirm(`Delete the page “${p.title}”? (Undo can bring it back)`)) { S.pages.splice(i, 1); if (cur === p.id) { cur = S.pages[0].id; refresh(); } changed(true); } } }) : null));
    if (open) {
      const slugF = { key: 'slug', label: 'Web address: keycapstudios.com/…' };
      item.append(h('div', { class: 'lb' },
        field(p, { key: 'title', label: 'Page name' }),
        p.id === 'home' ? h('p', { class: 'hint', textContent: 'This is your home page (keycapstudios.com/).' }) : (() => {
          const w = field(p, slugF); w.querySelector('input').addEventListener('change', e => { p.slug = e.target.value.toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, ''); e.target.value = p.slug; changed(false); }); return w; })(),
        field(p, { key: 'seoTitle', label: 'Browser tab / Google title (optional)' }),
        field(p, { key: 'description', label: 'Google description', type: 'textarea' }),
        h('button', { class: 'sm', style: 'margin-top:10px', textContent: '+ Add to menu', onclick: () => { S.nav.push({ label: p.title, link: p.slug ? '/' + p.slug : '/' }); changed(true); toast('Added to the menu'); } })));
    }
    P.append(item);
  });
  P.append(h('button', { class: 'addbig', textContent: '+ New page', onclick: () => {
    const name = prompt('Page name (e.g. About, News, ForgeCut)'); if (!name) return;
    let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'page';
    while (S.pages.some(p => p.slug === slug)) slug += '-2';
    const p = { id: uid(), title: name, slug, description: '', blocks: [{ id: uid(), type: 'heading', props: { text: name, level: 1, subtitle: '' }, style: { padding: 'l' } }] };
    S.pages.push(p); cur = p.id; sel = null; tab = 'blocks'; changed(true); renderTop(); refresh();
  } }));
}

const THEMES = {
  'Ember (dark)': { accent: '#ff7a1a', accent2: '#ffb547', bg: '#0c0d10', bg2: '#13151a', card: '#181b21', text: '#e9eaee', muted: '#9aa0ad' },
  'Neon blue': { accent: '#3b82f6', accent2: '#22d3ee', bg: '#0a0d14', bg2: '#0f1420', card: '#141a28', text: '#e6ecf5', muted: '#94a0b8' },
  'Toxic green': { accent: '#22c55e', accent2: '#a3e635', bg: '#0b0e0c', bg2: '#111612', card: '#161d18', text: '#e7efe9', muted: '#93a399' },
  'Royal purple': { accent: '#8b5cf6', accent2: '#ec4899', bg: '#0d0b14', bg2: '#14111d', card: '#1a1626', text: '#ece9f5', muted: '#a09ab4' },
  'Blood red': { accent: '#ef4444', accent2: '#f97316', bg: '#0e0b0b', bg2: '#161111', card: '#1d1616', text: '#f0e9e9', muted: '#a89a9a' },
};
function sitePanel(P) {
  const t = S.theme;
  P.append(h('h3', { class: 'ph', textContent: 'Branding' }),
    field(t, { key: 'brand', label: 'Studio / site name' }),
    h('div', { class: 'row2' }, field(t, { key: 'logoIcon', label: 'Logo emoji/symbol' }), h('div', field(t, { key: 'hideBrandText', label: 'Hide name next to logo', type: 'toggle' }))),
    lbl('Logo image (replaces symbol)'), imageField(t, 'logoImage'),
    lbl('Browser tab icon (favicon)'), imageField(t, 'favicon'),
    field(t, { key: 'description', label: 'Default Google description', type: 'textarea' }),
    h('h3', { class: 'ph', textContent: 'Colours' }),
    h('div', { class: 'row', style: 'flex-wrap:wrap' }, Object.entries(THEMES).map(([n, v]) => h('button', { class: 'sm', innerHTML: `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${v.accent};margin-right:5px"></span>${n}`, onclick: () => { Object.assign(t, v); changed(true); } }))),
    h('div', { class: 'row2' },
      field(t, { key: 'accent', label: 'Accent', type: 'color' }), field(t, { key: 'accent2', label: 'Accent 2', type: 'color' }),
      field(t, { key: 'bg', label: 'Background', type: 'color' }), field(t, { key: 'bg2', label: 'Panel background', type: 'color' }),
      field(t, { key: 'card', label: 'Cards', type: 'color' }), field(t, { key: 'text', label: 'Text', type: 'color' }),
      field(t, { key: 'muted', label: 'Soft text', type: 'color' }), field(t, { key: 'radius', label: 'Corner roundness (px)', type: 'number' })),
    h('h3', { class: 'ph', textContent: 'Fonts' }),
    h('div', { class: 'row2' },
      field(t, { key: 'headingFont', label: 'Headings', type: 'select', options: FONTS.map(f => [f, f]) }),
      field(t, { key: 'font', label: 'Body text', type: 'select', options: FONTS.map(f => [f, f]) })),
    h('h3', { class: 'ph', textContent: 'Top menu' }),
    listField(S, { key: 'nav', label: 'Menu links', item: 'label', fields: [{ key: 'label', label: 'Text' }, { key: 'link', label: 'Link', type: 'link' }], blank: { label: 'Link', link: '/' } }),
    h('h3', { class: 'ph', textContent: 'Footer' }),
    field(S.footer, { key: 'text', label: 'Footer text ({year} = current year)' }),
    listField(S.footer, { key: 'links', label: 'Footer links', item: 'label', fields: [{ key: 'label', label: 'Text' }, { key: 'link', label: 'Link', type: 'link' }], blank: { label: 'Link', link: '/' } }),
    h('h3', { class: 'ph', textContent: 'Advanced' }),
    field(S, { key: 'customCSS', label: 'Custom CSS (applies to every page)', type: 'code' }),
    field(S, { key: 'headCode', label: 'Code in <head> (analytics, verification tags)', type: 'code' }));
}

async function mediaPanel(P) {
  P.append(h('h3', { class: 'ph', textContent: 'Media library' }));
  P.append(mediaBrowser(null));
}
function mediaBrowser(onPick) {
  const box = h('div');
  const input = h('input', { type: 'file', multiple: true, accept: 'image/*,video/mp4,application/pdf', style: 'display:none', onchange: () => upload([...input.files]) });
  const zone = h('div', { class: 'drop-zone' }, 'Drag images here or ', h('button', { class: 'sm', textContent: 'Upload', onclick: () => input.click() }), input);
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
      grid.append(h('div', { class: 'mcell', title: f.name, onclick: e => {
        if (e.target.classList.contains('del')) return;
        if (onPick) { onPick(f.url); closeModal(); } else { navigator.clipboard.writeText(f.url); toast('Link copied: ' + f.url); }
      } }, isImg ? h('img', { src: f.url, loading: 'lazy' }) : h('div', { class: 'none', style: 'aspect-ratio:4/3;display:grid;place-items:center', textContent: f.name.split('.').pop().toUpperCase() }),
        h('div', { class: 'nm', textContent: f.name }),
        h('button', { class: 'sm danger del', textContent: '🗑', onclick: async () => { if (confirm('Delete ' + f.name + '? Anything using it will show a broken image.')) { await fetch('/api/media/' + encodeURIComponent(f.name), { method: 'DELETE' }); load(); } } })));
    });
  }
  async function upload(files) {
    for (const f of files) {
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

/* ---------- modal / menu ---------- */
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
async function publish() {
  if (!confirm('Publish all pages to keycapstudios.com now?')) return;
  await save(); $('#pubBtn').disabled = true;
  const out = await stream('/api/publish', 'Publishing');
  if (!/Published!/.test(out) && /log ?in|authenticat|API_TOKEN/i.test(out)) $('#logtxt').textContent += '\n👉 Click ⋯ → "Cloudflare login (once)", then Publish again.\n';
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

$('#menuBtn').onclick = e => { e.stopPropagation(); $('#menu').classList.toggle('hidden'); };
document.addEventListener('click', () => $('#menu').classList.add('hidden'));
$('#menu').addEventListener('click', async e => {
  const a = e.target.dataset.act; if (!a) return;
  if (a === 'login') stream('/api/login', 'Cloudflare login');
  if (a === 'backup') { await save(); await fetch('/api/backups', { method: 'POST' }); toast('Backup saved'); }
  if (a === 'backups') backupsDialog();
  if (a === 'site') window.open('https://keycapstudios.com');
  if (a === 'folder') { const v = await (await fetch('/api/version')).json(); prompt('Your website is saved in this folder (copy it to back up):', v.dataDir); }
});
$('#pubBtn').onclick = publish;
$('#undoBtn').onclick = () => travel(-1);
$('#redoBtn').onclick = () => travel(1);
$('#pageSel').onchange = e => { cur = e.target.value; sel = null; renderPanel(); refresh(); };
document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => { tab = b.dataset.tab; renderAll(); });
document.querySelectorAll('#device button').forEach(b => b.onclick = () => {
  document.querySelectorAll('#device button').forEach(x => x.classList.remove('on')); b.classList.add('on'); $('#frameWrap').style.width = b.dataset.w;
});
document.addEventListener('keydown', e => {
  const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
  const typing = /INPUT|TEXTAREA/.test(document.activeElement.tagName) || document.activeElement.isContentEditable;
  if (mod && k === 's') { e.preventDefault(); save(); }
  if (mod && k === 'z' && !e.shiftKey && !typing) { e.preventDefault(); travel(-1); }
  if (mod && (k === 'y' || (k === 'z' && e.shiftKey)) && !typing) { e.preventDefault(); travel(1); }
  if (k === 'escape') { closeModal(); }
});
addEventListener('beforeunload', () => { if (saveTimer) save(); });

async function load() {
  S = await (await fetch('/api/site')).json();
  if (!S.pages.find(p => p.id === cur)) cur = S.pages[0].id;
  hist = []; hi = -1; snapshot();
  renderAll(); refresh(); status('All changes saved');
}
fetch('/api/version').then(r => r.json()).then(v => $('#ver').textContent = 'v' + v.version);
load();
