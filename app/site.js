/* Keycap site runtime: animations, counters, countdowns, tabs, forms, lightbox, cookie banner */
(function () {
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const preview = document.body.classList.contains('kpreview');

  // Scroll animations
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target; setTimeout(() => el.classList.add('in'), Number(el.dataset.delay) || 0); io.unobserve(el);
    $$('[data-count]', el).forEach(countUp);
  }), { threshold: 0.12 }) : null;
  $$('.anim').forEach(el => io ? io.observe(el) : el.classList.add('in'));
  $$('.b-stats').forEach(s => { if (!s.classList.contains('anim')) { if (io) io.observe(s); else $$('[data-count]', s).forEach(countUp); } });

  function countUp(el) {
    if (el._done || preview) return; el._done = true;
    const raw = el.dataset.count, m = /^([^\d-]*)(-?[\d,.]+)(.*)$/.exec(raw); if (!m) return;
    const target = parseFloat(m[2].replace(/,/g, '')), dec = (m[2].split('.')[1] || '').length, comma = m[2].includes(',');
    const t0 = performance.now(), dur = 1400;
    const step = now => {
      const k = Math.min(1, (now - t0) / dur), v = target * (1 - Math.pow(1 - k, 3));
      let s = v.toFixed(dec); if (comma) s = Number(s).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
      el.textContent = m[1] + s + m[3]; if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // Countdown
  $$('.countdown').forEach(cd => {
    const to = new Date(cd.dataset.to).getTime(); if (isNaN(to)) return;
    const tick = () => {
      let d = Math.max(0, to - Date.now());
      if (!d && cd.dataset.done) { cd.innerHTML = '<p class="cd-done">' + cd.dataset.done.replace(/</g, '&lt;') + '</p>'; return; }
      const u = { days: 864e5, hours: 36e5, minutes: 6e4, seconds: 1e3 };
      for (const k in u) { const v = Math.floor(d / u[k]); d -= v * u[k]; const b = cd.querySelector(`[data-u="${k}"]`); if (b) b.textContent = String(v).padStart(2, '0'); }
      setTimeout(tick, 1000);
    };
    tick();
  });

  // Tabs
  $$('[data-tabs]').forEach(t => t.addEventListener('click', e => {
    const b = e.target.closest('[data-tab]'); if (!b) return;
    $$('[data-tab]', t).forEach(x => x.classList.toggle('on', x === b));
    $$('[data-pane]', t).forEach(p => p.classList.toggle('on', p.dataset.pane === b.dataset.tab));
  }));

  // Clickable cards rendered as divs in preview
  document.addEventListener('click', e => { const c = e.target.closest('.card[data-href]'); if (c && !preview) location.href = c.dataset.href; });

  // Forms: post to endpoint (Formspree, Web3Forms, etc.) or fall back to email
  $$('form.kform').forEach(f => f.addEventListener('submit', async e => {
    e.preventDefault();
    const msg = f.querySelector('.fmsg'), btn = f.querySelector('button[type=submit]');
    if (f.querySelector('.hp') && f.querySelector('.hp').value) return;
    const data = new FormData(f); data.delete('_gotcha');
    if (!f.getAttribute('action')) {
      const body = [...data].map(([k, v]) => `${k}: ${v}`).join('\n');
      location.href = `mailto:${f.dataset.mailto}?subject=${encodeURIComponent('Website message')}&body=${encodeURIComponent(body)}`;
      return;
    }
    btn.disabled = true;
    try {
      const r = await fetch(f.action, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
      if (!r.ok) throw 0;
      f.reset(); msg.textContent = f.dataset.ok; msg.className = 'fmsg ok';
    } catch { msg.textContent = 'Something went wrong. Please try again.'; msg.className = 'fmsg err'; }
    msg.hidden = false; btn.disabled = false;
  }));

  // Gallery lightbox
  $$('.gallery.lb img').forEach(img => img.addEventListener('click', () => {
    if (preview && !document.body.classList.contains('ktest')) return;
    const o = document.createElement('div'); o.className = 'lightbox';
    o.innerHTML = `<img src="${img.src}" alt="">`; o.onclick = () => o.remove(); document.body.append(o);
  }));

  // Close mobile menu after tapping a link
  $$('nav.links a').forEach(a => a.addEventListener('click', () => { const m = document.getElementById('mnav'); if (m) m.checked = false; }));

  // Transparent header becomes solid on scroll
  const hdr = document.querySelector('header.nav.clear');
  if (hdr) { const f = () => hdr.classList.toggle('solid', scrollY > 30); addEventListener('scroll', f, { passive: true }); f(); }

  // Cookie banner
  const ck = document.querySelector('.cookie');
  if (ck && !preview) {
    let v = null; try { v = localStorage.getItem('kc-cookie'); } catch {}
    if (!v) ck.hidden = false;
    ck.addEventListener('click', e => { const b = e.target.dataset.cookie; if (!b) return; try { localStorage.setItem('kc-cookie', b); } catch {} ck.hidden = true; });
  }
})();
