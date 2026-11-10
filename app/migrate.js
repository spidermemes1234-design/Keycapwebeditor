// Converts the v1 editor format (content.json + pages/*.html) to the v2 page builder (site.json).
const fs = require('fs');
const path = require('path');

let n = 0;
const id = () => 'b' + Date.now().toString(36) + (n++).toString(36);

function fromV1(SITE) {
  const c = JSON.parse(fs.readFileSync(path.join(SITE, 'content.json'), 'utf8'));
  const page = f => { try { return fs.readFileSync(path.join(SITE, 'pages', f), 'utf8'); } catch { return ''; } };
  const legal = html => {
    // v1 legal pages start with <h1> and a date line; keep those as a heading block.
    const m = /<h1>(.*?)<\/h1>\s*(<p class="date">(.*?)<\/p>)?/s.exec(html);
    const rest = m ? html.slice(m.index + m[0].length) : html;
    return [
      { id: id(), type: 'heading', props: { text: m ? m[1] : '', level: 1, subtitle: m && m[3] ? m[3] : '' }, style: { padding: 's', width: 'narrow' } },
      { id: id(), type: 'text', props: { html: rest.trim() }, style: { padding: 's', width: 'narrow' } },
    ];
  };

  const home = [
    { id: id(), type: 'hero', props: { eyebrow: c.hero.eyebrow, title: c.hero.titleLine1, highlight: c.hero.titleLine2, text: c.hero.lead,
      buttons: [{ text: c.hero.primaryButton, link: '#download', style: 'primary' }, { text: c.hero.secondaryButton, link: '#apps', style: 'ghost' }], image: c.hero.image || '' },
      style: { padding: 'xl', align: 'center', bg: 'glow' } },
    { id: id(), type: 'cards', props: { title: c.appsSection.title, subtitle: c.appsSection.subtitle, columns: 3,
      items: c.apps.map(a => ({ icon: a.icon, image: a.image || '', title: a.name, text: a.text, tag: a.tag, tagColor: a.tagStyle, link: '' })) },
      style: { padding: 'l', bg: 'alt', anchor: 'apps' } },
    { id: id(), type: 'features', props: { title: c.featuresSection.title, subtitle: c.featuresSection.subtitle, columns: 4, items: c.features }, style: { padding: 'l', anchor: 'features' } },
  ];
  if (c.news && c.news.length) home.push({ id: id(), type: 'cards', props: { title: 'News & updates', columns: 3, items: c.news.map(x => ({ title: x.title, text: x.text, tag: x.date, tagColor: '' })) }, style: { padding: 'l', bg: 'alt', anchor: 'news' } });
  home.push({ id: id(), type: 'cta', props: { title: c.cta.title, text: c.cta.text, buttons: [{ text: c.cta.buttonText, link: c.cta.buttonLink, style: 'primary' }] }, style: { padding: 'l', anchor: 'download' } });

  return {
    theme: {
      brand: c.site.brand, description: c.site.description, logoIcon: '⌘', logoImage: '', favicon: '', hideBrandText: false,
      accent: c.site.accentColor || '#ff7a1a', accent2: c.site.accentColor2 || '#ffb547',
      bg: '#0c0d10', bg2: '#13151a', card: '#181b21', text: '#e9eaee', muted: '#9aa0ad',
      font: 'Inter', headingFont: 'Inter', radius: 14,
    },
    nav: [{ label: 'Apps', link: '/#apps' }, { label: 'Features', link: '/#features' }, { label: 'Download', link: '/#download' }],
    footer: { text: `© {year} ${c.site.brand}. All rights reserved.`, links: [
      { label: 'Privacy Policy', link: '/privacy' }, { label: 'Terms of Service', link: '/terms' }, { label: 'Contact', link: 'mailto:' + c.site.contactEmail }] },
    customCSS: '', headCode: '',
    pages: [
      { id: 'home', title: 'Home', slug: '', seoTitle: c.site.title, description: c.site.description, blocks: home },
      { id: 'privacy', title: 'Privacy Policy', slug: 'privacy', description: '', blocks: legal(page('privacy.html')) },
      { id: 'terms', title: 'Terms of Service', slug: 'terms', description: '', blocks: legal(page('terms.html')) },
    ],
  };
}

module.exports = { fromV1 };
