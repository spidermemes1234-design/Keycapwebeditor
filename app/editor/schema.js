// Block library: what can be added to a page, and the fields each block has.
const BTN_FIELDS = [
  { key: 'text', label: 'Text' }, { key: 'link', label: 'Link', type: 'link' },
  { key: 'style', label: 'Style', type: 'select', options: [['primary', 'Filled'], ['ghost', 'Outline'], ['link', 'Text link']] },
];
const TAG_COLORS = [['', 'Grey'], ['free', 'Green'], ['pro', 'Accent']];

window.BLOCKS = {
  hero: { name: 'Hero banner', icon: '🦸', group: 'Layout', desc: 'Big title, intro text and buttons',
    fields: [
      { key: 'eyebrow', label: 'Small label above title' }, { key: 'title', label: 'Title' },
      { key: 'highlight', label: 'Highlighted second line' }, { key: 'text', label: 'Intro text', type: 'textarea' },
      { key: 'buttons', label: 'Buttons', type: 'list', item: 'text', fields: BTN_FIELDS, blank: { text: 'Button', link: '#', style: 'primary' } },
      { key: 'image', label: 'Screenshot under the banner', type: 'image' }],
    make: () => ({ props: { eyebrow: 'New', title: 'A big bold headline', highlight: 'with a highlight.', text: 'Say what this is about in a sentence or two.', buttons: [{ text: 'Get started', link: '#', style: 'primary' }], image: '' }, style: { padding: 'xl', align: 'center', bg: 'glow' } }) },
  heading: { name: 'Heading', icon: '🔠', group: 'Text', desc: 'A section title',
    fields: [{ key: 'text', label: 'Heading' }, { key: 'subtitle', label: 'Subtitle', type: 'textarea' },
      { key: 'level', label: 'Size', type: 'select', options: [[1, 'Huge (H1)'], [2, 'Large (H2)'], [3, 'Medium (H3)']] }],
    make: () => ({ props: { text: 'Section heading', subtitle: '', level: 2 }, style: { padding: 's' } }) },
  text: { name: 'Text', icon: '📝', group: 'Text', desc: 'Paragraphs, lists, links, formatting',
    fields: [{ key: 'html', label: 'Text', type: 'rich' }],
    make: () => ({ props: { html: '<p>Write something here. Select text to make it <strong>bold</strong> or add a link.</p>' }, style: { padding: 's', width: 'narrow' } }) },
  columns: { name: 'Columns', icon: '▥', group: 'Layout', desc: '2–4 columns of text side by side',
    fields: [{ key: 'cols', label: 'Columns', type: 'list', item: null, max: 4, fields: [{ key: 'html', label: 'Content', type: 'rich' }], blank: { html: '<h3>Column</h3><p>Text</p>' } }],
    make: () => ({ props: { cols: [{ html: '<h3>Left</h3><p>Some text.</p>' }, { html: '<h3>Right</h3><p>Some text.</p>' }] }, style: { padding: 'm' } }) },
  imagetext: { name: 'Image + text', icon: '🖼️', group: 'Media', desc: 'Picture beside text and buttons',
    fields: [{ key: 'image', label: 'Image', type: 'image' }, { key: 'imageRight', label: 'Image on the right', type: 'toggle' },
      { key: 'title', label: 'Title' }, { key: 'html', label: 'Text', type: 'rich' },
      { key: 'buttons', label: 'Buttons', type: 'list', item: 'text', fields: BTN_FIELDS, blank: { text: 'Learn more', link: '#', style: 'ghost' } }],
    make: () => ({ props: { image: '', imageRight: false, title: 'Show it off', html: '<p>Describe the feature next to a screenshot.</p>', buttons: [] }, style: { padding: 'l' } }) },
  image: { name: 'Image', icon: '🏞️', group: 'Media', desc: 'A single picture',
    fields: [{ key: 'src', label: 'Image', type: 'image' }, { key: 'alt', label: 'Description (for accessibility)' },
      { key: 'caption', label: 'Caption' }, { key: 'link', label: 'Link when clicked', type: 'link' },
      { key: 'maxWidth', label: 'Max width', type: 'select', options: [['100%', 'Full'], ['800px', 'Large'], ['560px', 'Medium'], ['320px', 'Small']] },
      { key: 'rounded', label: 'Rounded corners', type: 'toggle' }],
    make: () => ({ props: { src: '', alt: '', caption: '', link: '', maxWidth: '100%', rounded: true }, style: { padding: 's' } }) },
  gallery: { name: 'Gallery', icon: '🗂️', group: 'Media', desc: 'Grid of images',
    fields: [{ key: 'columns', label: 'Columns', type: 'select', options: [[2, '2'], [3, '3'], [4, '4']] },
      { key: 'images', label: 'Images', type: 'list', item: 'caption', fields: [{ key: 'src', label: 'Image', type: 'image' }, { key: 'caption', label: 'Caption' }], blank: { src: '', caption: '' } }],
    make: () => ({ props: { columns: 3, images: [] }, style: { padding: 'm' } }) },
  video: { name: 'Video', icon: '▶️', group: 'Media', desc: 'Embed a YouTube video',
    fields: [{ key: 'title', label: 'Title (optional)' }, { key: 'url', label: 'YouTube link' }],
    make: () => ({ props: { title: '', url: '' }, style: { padding: 'm', width: 'narrow' } }) },
  cards: { name: 'Cards', icon: '🃏', group: 'Content', desc: 'Grid of cards: apps, products, news',
    fields: [{ key: 'title', label: 'Title' }, { key: 'subtitle', label: 'Subtitle', type: 'textarea' },
      { key: 'columns', label: 'Columns', type: 'select', options: [[1, '1'], [2, '2'], [3, '3'], [4, '4']] },
      { key: 'items', label: 'Cards', type: 'list', item: 'title', fields: [
        { key: 'title', label: 'Title' }, { key: 'text', label: 'Text', type: 'textarea' },
        { key: 'icon', label: 'Emoji icon' }, { key: 'image', label: 'Image (replaces icon)', type: 'image' },
        { key: 'tag', label: 'Badge' }, { key: 'tagColor', label: 'Badge colour', type: 'select', options: TAG_COLORS },
        { key: 'link', label: 'Link (whole card)', type: 'link' }],
        blank: { title: 'New card', text: '', icon: '✨', image: '', tag: '', tagColor: '', link: '' } }],
    make: () => ({ props: { title: 'Cards', subtitle: '', columns: 3, items: [1, 2, 3].map(i => ({ title: 'Card ' + i, text: 'Short description.', icon: '✨', image: '', tag: '', tagColor: '', link: '' })) }, style: { padding: 'l' } }) },
  features: { name: 'Feature list', icon: '✅', group: 'Content', desc: 'Short points with titles',
    fields: [{ key: 'title', label: 'Title' }, { key: 'subtitle', label: 'Subtitle', type: 'textarea' },
      { key: 'columns', label: 'Columns', type: 'select', options: [[2, '2'], [3, '3'], [4, '4']] },
      { key: 'items', label: 'Features', type: 'list', item: 'title', fields: [{ key: 'icon', label: 'Emoji icon (optional)' }, { key: 'title', label: 'Title' }, { key: 'text', label: 'Text', type: 'textarea' }], blank: { icon: '', title: 'Feature', text: '' } }],
    make: () => ({ props: { title: 'Why it rocks', subtitle: '', columns: 3, items: [{ title: 'Fast', text: 'Text' }, { title: 'Simple', text: 'Text' }, { title: 'Yours', text: 'Text' }] }, style: { padding: 'l' } }) },
  pricing: { name: 'Pricing', icon: '💲', group: 'Content', desc: 'Plans side by side',
    fields: [{ key: 'title', label: 'Title' }, { key: 'subtitle', label: 'Subtitle', type: 'textarea' },
      { key: 'plans', label: 'Plans', type: 'list', item: 'name', fields: [
        { key: 'name', label: 'Plan name' }, { key: 'price', label: 'Price' }, { key: 'period', label: 'After price (e.g. /month)' }, { key: 'badge', label: 'Badge when highlighted (e.g. Popular)' }, { key: 'features', label: 'Features (one per line)', type: 'textarea' },
        { key: 'buttonText', label: 'Button text' }, { key: 'buttonLink', label: 'Button link', type: 'link' }, { key: 'featured', label: 'Highlight this plan', type: 'toggle' }],
        blank: { name: 'Plan', price: '$0', features: '', buttonText: 'Choose', buttonLink: '#', featured: false } }],
    make: () => ({ props: { title: 'Pricing', subtitle: '', plans: [
      { name: 'Free', price: '$0', features: 'ForgeCut editor\nAuto-updates', buttonText: 'Get it', buttonLink: '#', featured: false },
      { name: 'Pro', price: '$9.99', features: 'Everything in Free\nAI Edit', buttonText: 'Upgrade', buttonLink: '#', featured: true }] }, style: { padding: 'l', align: 'center' } }) },
  faq: { name: 'FAQ', icon: '❓', group: 'Content', desc: 'Questions that expand on click',
    fields: [{ key: 'title', label: 'Title' }, { key: 'items', label: 'Questions', type: 'list', item: 'q', fields: [{ key: 'q', label: 'Question' }, { key: 'a', label: 'Answer', type: 'rich' }], blank: { q: 'Question?', a: '<p>Answer.</p>' } }],
    make: () => ({ props: { openFirst: false, title: 'FAQ', items: [{ q: 'Is it free?', a: '<p>The base editor is free.</p>' }] }, style: { padding: 'l', width: 'narrow' } }) },
  quote: { name: 'Quote', icon: '💬', group: 'Text', desc: 'Testimonial or big quote',
    fields: [{ key: 'text', label: 'Quote', type: 'textarea' }, { key: 'author', label: 'Who said it' }],
    make: () => ({ props: { text: 'This changed how I edit.', author: 'A happy creator' }, style: { padding: 'l' } }) },
  cta: { name: 'Call to action', icon: '📣', group: 'Layout', desc: 'Highlighted box with a button',
    fields: [{ key: 'title', label: 'Title' }, { key: 'text', label: 'Text', type: 'textarea' },
      { key: 'buttons', label: 'Buttons', type: 'list', item: 'text', fields: BTN_FIELDS, blank: { text: 'Button', link: '#', style: 'primary' } }],
    make: () => ({ props: { title: 'Ready?', text: 'Get The Forge today.', buttons: [{ text: 'Wishlist on Steam', link: '#', style: 'primary' }] }, style: { padding: 'l' } }) },
  buttons: { name: 'Buttons', icon: '🔘', group: 'Text', desc: 'One or more buttons',
    fields: [{ key: 'buttons', label: 'Buttons', type: 'list', item: 'text', fields: BTN_FIELDS, blank: { text: 'Button', link: '#', style: 'primary' } }],
    make: () => ({ props: { buttons: [{ text: 'Button', link: '#', style: 'primary' }] }, style: { padding: 's' } }) },
  spacer: { name: 'Spacer', icon: '↕️', group: 'Layout', desc: 'Empty space',
    fields: [{ key: 'height', label: 'Height (px)', type: 'number' }], make: () => ({ props: { height: 40 }, style: { padding: 'none' } }) },
  divider: { name: 'Divider', icon: '➖', group: 'Layout', desc: 'A thin line', fields: [], make: () => ({ props: {}, style: { padding: 's' } }) },
  html: { name: 'Custom HTML', icon: '</>', group: 'Advanced', desc: 'Paste any code: embeds, widgets, forms',
    fields: [{ key: 'code', label: 'HTML / embed code', type: 'code' }], make: () => ({ props: { code: '<div style="text-align:center">Your HTML here</div>' }, style: { padding: 'm' } }) },
};

window.STYLE_FIELDS = [
  { group: 'Background' },
  { key: 'bg', label: 'Background', type: 'select', options: [['', 'None'], ['alt', 'Panel'], ['card', 'Card'], ['glow', 'Accent glow'], ['accent', 'Accent colour'], ['gradient', 'Gradient'], ['custom', 'Custom colour'], ['image', 'Image']] },
  { key: 'bgColor', label: 'Background colour', type: 'color', when: s => s.bg === 'custom' },
  { key: 'gradFrom', label: 'Gradient from', type: 'color', when: s => s.bg === 'gradient' },
  { key: 'gradTo', label: 'Gradient to', type: 'color', when: s => s.bg === 'gradient' },
  { key: 'gradAngle', label: 'Gradient angle (0–360)', type: 'number', when: s => s.bg === 'gradient' },
  { key: 'bgImage', label: 'Background image', type: 'image', when: s => s.bg === 'image' },
  { key: 'overlay', label: 'Image darkness (0–90)', type: 'number', when: s => s.bg === 'image' },
  { key: 'parallax', label: 'Parallax (image stays still while scrolling)', type: 'toggle', when: s => s.bg === 'image' },
  { key: 'textColor', label: 'Text colour (optional)', type: 'color', clearable: true },
  { group: 'Layout' },
  { key: 'padding', label: 'Spacing above/below', type: 'select', options: [['none', 'None'], ['s', 'Small'], ['m', 'Medium'], ['l', 'Large'], ['xl', 'Extra large']] },
  { key: 'width', label: 'Content width', type: 'select', options: [['narrow', 'Narrow'], ['normal', 'Normal'], ['wide', 'Wide'], ['full', 'Edge to edge']] },
  { key: 'align', label: 'Alignment', type: 'select', options: [['', 'Left'], ['center', 'Centre'], ['right', 'Right']] },
  { key: 'minHeight', label: 'Minimum height (% of screen, e.g. 100 = full screen)', type: 'number' },
  { group: 'Motion' },
  { key: 'animation', label: 'Animate when scrolled into view', type: 'select', options: [['', 'None'], ['fade', 'Fade in'], ['fade-up', 'Fade up'], ['fade-down', 'Fade down'], ['slide-left', 'Slide from right'], ['slide-right', 'Slide from left'], ['zoom', 'Zoom in'], ['blur', 'Blur in']] },
  { key: 'delay', label: 'Animation delay (ms)', type: 'number', when: s => !!s.animation },
  { group: 'Visibility' },
  { key: 'hideMobile', label: 'Hide on phones', type: 'toggle' },
  { key: 'hideDesktop', label: 'Hide on computers', type: 'toggle' },
  { group: 'Advanced' },
  { key: 'anchor', label: 'Anchor name (link to it with #name)' },
  { key: 'className', label: 'Extra CSS classes' },
  { key: 'css', label: 'Custom CSS for this block (use & for the block, e.g. & h2 { color: red })', type: 'code' },
];

window.FONTS = ['Inter', 'Poppins', 'Montserrat', 'DM Sans', 'Plus Jakarta Sans', 'Outfit', 'Sora', 'Space Grotesk', 'Exo', 'Chakra Petch', 'Rajdhani', 'Orbitron', 'Oswald', 'Bebas Neue', 'Press Start 2P', 'JetBrains Mono'];

// ---- v3 blocks ----
const SOCIALS = [['youtube', 'YouTube'], ['twitch', 'Twitch'], ['tiktok', 'TikTok'], ['discord', 'Discord'], ['x', 'X / Twitter'], ['instagram', 'Instagram'], ['steam', 'Steam'], ['github', 'GitHub'], ['email', 'Email']];
window.SOCIALS = SOCIALS;
BLOCKS.faq.fields.splice(1, 0, { key: 'openFirst', label: 'First question open', type: 'toggle' });
Object.assign(BLOCKS, {
  testimonials: { name: 'Testimonials', icon: '⭐', group: 'Content', desc: 'Reviews with stars, grid or slider',
    fields: [{ key: 'title', label: 'Title' }, { key: 'subtitle', label: 'Subtitle', type: 'textarea' },
      { key: 'layout', label: 'Layout', type: 'select', options: [['grid', 'Grid'], ['slider', 'Swipe slider']] },
      { key: 'columns', label: 'Columns (grid)', type: 'select', options: [[2, '2'], [3, '3'], [4, '4']] },
      { key: 'items', label: 'Testimonials', type: 'list', item: 'name', fields: [{ key: 'text', label: 'Quote', type: 'textarea' }, { key: 'name', label: 'Name' }, { key: 'role', label: 'Role / channel' }, { key: 'avatar', label: 'Photo', type: 'image' }, { key: 'rating', label: 'Stars (0–5)', type: 'number' }], blank: { text: 'Great!', name: 'Name', role: '', avatar: '', rating: 5 } }],
    make: () => ({ props: { title: 'Creators love it', subtitle: '', layout: 'grid', columns: 3, items: [1, 2, 3].map(i => ({ text: 'ForgeCut cut my editing time in half.', name: 'Creator ' + i, role: 'YouTuber', avatar: '', rating: 5 })) }, style: { padding: 'l' } }) },
  stats: { name: 'Stats / counters', icon: '🔢', group: 'Content', desc: 'Big numbers that count up',
    fields: [{ key: 'title', label: 'Title' }, { key: 'items', label: 'Stats', type: 'list', item: 'label', max: 6, fields: [{ key: 'value', label: 'Number (e.g. 10,000+ or 4.9)' }, { key: 'label', label: 'Label' }], blank: { value: '100+', label: 'Label' } }],
    make: () => ({ props: { title: '', items: [{ value: '6', label: 'Apps in one suite' }, { value: '10,000+', label: 'Hours saved' }, { value: '4.9', label: 'Average rating' }, { value: '24/7', label: 'Auto-updates' }] }, style: { padding: 'l', align: 'center' } }) },
  logos: { name: 'Logo strip', icon: '🏷️', group: 'Media', desc: 'Partner / platform logos, optional scrolling',
    fields: [{ key: 'title', label: 'Small title above' }, { key: 'scroll', label: 'Scroll continuously', type: 'toggle' }, { key: 'height', label: 'Logo height (px)', type: 'number' },
      { key: 'items', label: 'Logos', type: 'list', item: 'name', fields: [{ key: 'src', label: 'Logo', type: 'image' }, { key: 'name', label: 'Name' }, { key: 'link', label: 'Link', type: 'link' }], blank: { src: '', name: 'Logo', link: '' } }],
    make: () => ({ props: { title: 'Works with', scroll: false, height: 40, items: [] }, style: { padding: 'm' } }) },
  team: { name: 'Team', icon: '👥', group: 'Content', desc: 'People with photos and roles',
    fields: [{ key: 'title', label: 'Title' }, { key: 'subtitle', label: 'Subtitle', type: 'textarea' }, { key: 'columns', label: 'Columns', type: 'select', options: [[2, '2'], [3, '3'], [4, '4']] },
      { key: 'items', label: 'People', type: 'list', item: 'name', fields: [{ key: 'name', label: 'Name' }, { key: 'role', label: 'Role' }, { key: 'photo', label: 'Photo', type: 'image' }, { key: 'bio', label: 'Bio', type: 'textarea' }, { key: 'link', label: 'Link', type: 'link' }, { key: 'linkText', label: 'Link text' }], blank: { name: 'Name', role: 'Role', photo: '', bio: '', link: '', linkText: 'Profile' } }],
    make: () => ({ props: { title: 'The team', subtitle: '', columns: 3, items: [{ name: 'Spoeder', role: 'Founder', photo: '', bio: '', link: '', linkText: 'YouTube' }] }, style: { padding: 'l', align: 'center' } }) },
  timeline: { name: 'Timeline / roadmap', icon: '🗺️', group: 'Content', desc: 'Steps or roadmap with status',
    fields: [{ key: 'title', label: 'Title' }, { key: 'subtitle', label: 'Subtitle', type: 'textarea' },
      { key: 'items', label: 'Steps', type: 'list', item: 'title', fields: [{ key: 'when', label: 'When (e.g. Q1 2027)' }, { key: 'title', label: 'Title' }, { key: 'text', label: 'Text', type: 'textarea' }, { key: 'status', label: 'Status', type: 'select', options: [['', 'Planned'], ['now', 'In progress'], ['done', 'Done']] }], blank: { when: '', title: 'Step', text: '', status: '' } }],
    make: () => ({ props: { title: 'Roadmap', subtitle: '', items: [{ when: 'Now', title: 'ForgeCut beta', text: 'Core editor.', status: 'now' }, { when: 'Next', title: 'ForgeCast', text: 'Multistreaming.', status: '' }] }, style: { padding: 'l' } }) },
  tabs: { name: 'Tabs', icon: '🗂', group: 'Content', desc: 'Switchable panels with text and image',
    fields: [{ key: 'title', label: 'Title' }, { key: 'subtitle', label: 'Subtitle', type: 'textarea' },
      { key: 'items', label: 'Tabs', type: 'list', item: 'label', fields: [{ key: 'label', label: 'Tab name' }, { key: 'html', label: 'Content', type: 'rich' }, { key: 'image', label: 'Image', type: 'image' }], blank: { label: 'Tab', html: '<p>Content</p>', image: '' } }],
    make: () => ({ props: { title: '', subtitle: '', items: [{ label: 'Edit', html: '<h3>Edit</h3><p>Fast timeline.</p>', image: '' }, { label: 'Stream', html: '<h3>Stream</h3><p>Go live everywhere.</p>', image: '' }] }, style: { padding: 'l' } }) },
  countdown: { name: 'Countdown', icon: '⏳', group: 'Content', desc: 'Timer to a launch date',
    fields: [{ key: 'title', label: 'Title' }, { key: 'date', label: 'Date & time (YYYY-MM-DDTHH:MM, e.g. 2027-03-01T18:00)' }, { key: 'doneText', label: 'Text when finished' },
      { key: 'buttons', label: 'Buttons', type: 'list', item: 'text', fields: BTN_FIELDS, blank: { text: 'Wishlist', link: '#', style: 'primary' } }],
    make: () => ({ props: { title: 'Launching in', date: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 16), doneText: "We're live!", buttons: [] }, style: { padding: 'l', align: 'center' } }) },
  form: { name: 'Contact form', icon: '✉️', group: 'Forms', desc: 'Any fields, sends to your email',
    fields: [{ key: 'title', label: 'Title' }, { key: 'subtitle', label: 'Subtitle', type: 'textarea' },
      { key: 'endpoint', label: 'Form service URL (Formspree / Web3Forms). Leave empty to open the visitor\'s email app.', type: 'text' },
      { key: 'email', label: 'Your email (used when no service URL)' }, { key: 'button', label: 'Button text' }, { key: 'successText', label: 'Message after sending' },
      { key: 'fields', label: 'Fields', type: 'list', item: 'label', fields: [{ key: 'label', label: 'Label' }, { key: 'type', label: 'Type', type: 'select', options: [['text', 'Text'], ['email', 'Email'], ['tel', 'Phone'], ['textarea', 'Long text'], ['select', 'Dropdown'], ['checkbox', 'Checkbox']] }, { key: 'placeholder', label: 'Placeholder' }, { key: 'options', label: 'Dropdown options (one per line)', type: 'textarea' }, { key: 'required', label: 'Required', type: 'toggle' }, { key: 'half', label: 'Half width', type: 'toggle' }], blank: { label: 'Field', type: 'text', placeholder: '', options: '', required: false, half: false } }],
    make: () => ({ props: { title: 'Get in touch', subtitle: '', endpoint: '', email: 'hello@keycapstudios.com', button: 'Send message', successText: 'Thanks! We got your message.', fields: [
      { label: 'Name', type: 'text', placeholder: '', required: true, half: true }, { label: 'Email', type: 'email', placeholder: '', required: true, half: true },
      { label: 'Message', type: 'textarea', placeholder: '', required: true, half: false }] }, style: { padding: 'l', width: 'narrow' } }) },
  newsletter: { name: 'Newsletter signup', icon: '📬', group: 'Forms', desc: 'Email capture box',
    fields: [{ key: 'title', label: 'Title' }, { key: 'text', label: 'Text', type: 'textarea' }, { key: 'placeholder', label: 'Placeholder' }, { key: 'button', label: 'Button text' },
      { key: 'endpoint', label: 'Form service URL (Formspree / Mailchimp / Web3Forms)' }, { key: 'email', label: 'Your email (fallback)' }, { key: 'successText', label: 'Message after signup' }],
    make: () => ({ props: { title: 'Get launch updates', text: 'No spam. Just big news.', placeholder: 'you@email.com', button: 'Notify me', endpoint: '', email: 'hello@keycapstudios.com', successText: "You're on the list!" }, style: { padding: 'l' } }) },
  social: { name: 'Social links', icon: '🔗', group: 'Text', desc: 'YouTube, Twitch, Discord… icons',
    fields: [{ key: 'title', label: 'Title' }, { key: 'showLabels', label: 'Show names', type: 'toggle' }, { key: 'size', label: 'Size', type: 'select', options: [['sm', 'Small'], ['', 'Medium'], ['lg', 'Large']] },
      { key: 'items', label: 'Links', type: 'list', item: 'network', fields: [{ key: 'network', label: 'Network', type: 'select', options: SOCIALS }, { key: 'link', label: 'Link', type: 'link' }], blank: { network: 'youtube', link: '' } }],
    make: () => ({ props: { title: '', showLabels: true, size: '', items: [{ network: 'youtube', link: 'https://youtube.com/@IamSpoeder' }, { network: 'twitch', link: 'https://twitch.tv/IamSpoeder' }] }, style: { padding: 'm', align: 'center' } }) },
  iconlist: { name: 'Checklist', icon: '☑️', group: 'Text', desc: 'List with icons or ticks',
    fields: [{ key: 'title', label: 'Title' }, { key: 'subtitle', label: 'Subtitle', type: 'textarea' }, { key: 'columns', label: 'Columns', type: 'select', options: [[1, '1'], [2, '2'], [3, '3']] },
      { key: 'items', label: 'Items', type: 'list', item: 'text', fields: [{ key: 'icon', label: 'Icon (emoji or ✓)' }, { key: 'text', label: 'Text' }], blank: { icon: '✓', text: 'Item' } }],
    make: () => ({ props: { title: '', subtitle: '', columns: 2, items: ['No subscription', 'Free updates', 'Works offline', 'Made for creators'].map(t => ({ icon: '✓', text: t })) }, style: { padding: 'm' } }) },
  embed: { name: 'Embed (Steam, Twitch…)', icon: '🧩', group: 'Media', desc: 'Steam widget, Twitch, Spotify, TikTok, Vimeo',
    fields: [{ key: 'url', label: 'Paste a link (Steam store page, Twitch channel/video, Spotify, TikTok video, Vimeo, YouTube)' }],
    make: () => ({ props: { url: '' }, style: { padding: 'm', width: 'narrow' } }) },
  map: { name: 'Map', icon: '📍', group: 'Media', desc: 'Google map of an address',
    fields: [{ key: 'title', label: 'Title' }, { key: 'address', label: 'Address or place' }, { key: 'zoom', label: 'Zoom (1–20)', type: 'number' }, { key: 'tall', label: 'Taller map', type: 'toggle' }],
    make: () => ({ props: { title: '', address: 'Kroonstad, South Africa', zoom: 12, tall: false }, style: { padding: 'm' } }) },
  posts: { name: 'Latest posts', icon: '📰', group: 'Content', desc: 'Your newest blog/news posts',
    fields: [{ key: 'title', label: 'Title' }, { key: 'subtitle', label: 'Subtitle', type: 'textarea' }, { key: 'count', label: 'How many', type: 'number' }, { key: 'columns', label: 'Columns', type: 'select', options: [[1, '1'], [2, '2'], [3, '3']] }, { key: 'images', label: 'Show cover images', type: 'toggle' }, { key: 'allLink', label: '"See all" button text (empty = hide)' }],
    make: () => ({ props: { title: 'Latest news', subtitle: '', count: 3, columns: 3, images: true, allLink: 'All news' }, style: { padding: 'l' } }) },
});
BLOCKS.divider.fields = [];
BLOCKS.video.desc = 'Embed a YouTube video';
BLOCKS.gallery.fields.push({ key: 'lightbox', label: 'Click to enlarge', type: 'toggle' });
BLOCKS.columns.fields.unshift({ key: 'valign', label: 'Vertical alignment', type: 'select', options: [['top', 'Top'], ['center', 'Middle'], ['bottom', 'Bottom']] });
BLOCKS.gallery.make = () => ({ props: { columns: 3, lightbox: true, images: [] }, style: { padding: 'm' } });

// ---- page templates ----
window.TEMPLATES = {
  blank: { name: 'Blank', icon: '⬜', blocks: n => [{ type: 'heading', props: { text: n, level: 1, subtitle: '' }, style: { padding: 'l' } }] },
  landing: { name: 'Landing page', icon: '🚀', blocks: n => [
    { type: 'hero', props: { eyebrow: 'Introducing', title: n, highlight: 'built for creators.', text: 'One sentence that sells it.', buttons: [{ text: 'Get it', link: '#cta', style: 'primary' }, { text: 'Learn more', link: '#features', style: 'ghost' }], image: '' }, style: { padding: 'xl', align: 'center', bg: 'glow', animation: 'fade-up' } },
    { type: 'logos', props: { title: 'Works with', scroll: true, height: 36, items: [] }, style: { padding: 's' } },
    { type: 'imagetext', props: { image: '', imageRight: false, title: 'The main feature', html: '<p>Explain the biggest benefit.</p>', buttons: [] }, style: { padding: 'l', animation: 'fade-up', anchor: 'features' } },
    { type: 'imagetext', props: { image: '', imageRight: true, title: 'Another feature', html: '<p>And another.</p>', buttons: [] }, style: { padding: 'l', animation: 'fade-up' } },
    { type: 'stats', props: { title: '', items: [{ value: '10x', label: 'Faster' }, { value: '6', label: 'Apps' }, { value: '100%', label: 'Yours' }] }, style: { padding: 'l', align: 'center', bg: 'alt' } },
    { type: 'testimonials', props: { title: 'What creators say', subtitle: '', layout: 'grid', columns: 3, items: [1, 2, 3].map(i => ({ text: 'Love it.', name: 'Creator ' + i, role: '', avatar: '', rating: 5 })) }, style: { padding: 'l', animation: 'fade-up' } },
    { type: 'faq', props: { title: 'FAQ', openFirst: true, items: [{ q: 'How much is it?', a: '<p>Answer.</p>' }] }, style: { padding: 'l', width: 'narrow' } },
    { type: 'cta', props: { title: 'Ready?', text: '', buttons: [{ text: 'Wishlist on Steam', link: '#', style: 'primary' }] }, style: { padding: 'l', anchor: 'cta' } }] },
  app: { name: 'App / product page', icon: '🎬', blocks: n => [
    { type: 'hero', props: { eyebrow: 'The Forge', title: n, highlight: '', text: 'What this app does in one line.', buttons: [{ text: 'Get ' + n, link: '#', style: 'primary' }], image: '' }, style: { padding: 'xl', align: 'center', bg: 'glow' } },
    { type: 'video', props: { title: '', url: '' }, style: { padding: 'm', width: 'normal' } },
    { type: 'features', props: { title: 'Features', subtitle: '', columns: 3, items: [{ icon: '⚡', title: 'Fast', text: '' }, { icon: '🎯', title: 'Precise', text: '' }, { icon: '🔒', title: 'Private', text: '' }] }, style: { padding: 'l' } },
    { type: 'tabs', props: { title: 'How it works', subtitle: '', items: [{ label: 'Step 1', html: '<p>…</p>', image: '' }, { label: 'Step 2', html: '<p>…</p>', image: '' }] }, style: { padding: 'l', bg: 'alt' } },
    { type: 'gallery', props: { columns: 3, lightbox: true, images: [] }, style: { padding: 'l' } },
    { type: 'pricing', props: { title: 'Pricing', subtitle: '', plans: [{ name: 'Free', price: '$0', period: '', badge: '', features: 'Core features', buttonText: 'Download', buttonLink: '#', featured: false }, { name: 'Pro', price: '$9.99', period: '/one-time', badge: 'Best value', features: 'Everything\nAI Edit', buttonText: 'Buy', buttonLink: '#', featured: true }] }, style: { padding: 'l', align: 'center' } }] },
  about: { name: 'About', icon: '👋', blocks: n => [
    { type: 'heading', props: { text: n, level: 1, subtitle: 'Who we are and why we build.' }, style: { padding: 'l' } },
    { type: 'imagetext', props: { image: '', imageRight: true, title: 'Our story', html: '<p>Tell it here.</p>', buttons: [] }, style: { padding: 'm' } },
    { type: 'timeline', props: { title: 'Journey', subtitle: '', items: [{ when: '2024', title: 'Started', text: '', status: 'done' }, { when: '2026', title: 'The Forge', text: '', status: 'now' }] }, style: { padding: 'l' } },
    { type: 'team', props: { title: 'Team', subtitle: '', columns: 3, items: [{ name: 'Spoeder', role: 'Founder', photo: '', bio: '', link: '', linkText: '' }] }, style: { padding: 'l', align: 'center', bg: 'alt' } },
    { type: 'social', props: { title: 'Follow along', showLabels: true, size: '', items: [{ network: 'youtube', link: 'https://youtube.com/@IamSpoeder' }, { network: 'twitch', link: 'https://twitch.tv/IamSpoeder' }] }, style: { padding: 'l', align: 'center' } }] },
  contact: { name: 'Contact', icon: '✉️', blocks: n => [
    { type: 'heading', props: { text: n, level: 1, subtitle: "We'd love to hear from you." }, style: { padding: 'l', align: 'center' } },
    { type: 'form', props: { title: '', subtitle: '', endpoint: '', email: 'hello@keycapstudios.com', button: 'Send', successText: 'Thanks!', fields: [{ label: 'Name', type: 'text', required: true, half: true }, { label: 'Email', type: 'email', required: true, half: true }, { label: 'Topic', type: 'select', options: 'Support\nBusiness\nOther', half: false }, { label: 'Message', type: 'textarea', required: true }] }, style: { padding: 'm', width: 'narrow' } },
    { type: 'social', props: { title: '', showLabels: false, size: '', items: [{ network: 'discord', link: '' }, { network: 'email', link: 'hello@keycapstudios.com' }] }, style: { padding: 'm', align: 'center' } }] },
  legal: { name: 'Legal / text page', icon: '📜', blocks: n => [
    { type: 'heading', props: { text: n, level: 1, subtitle: 'Last updated: ' + new Date().toISOString().slice(0, 10) }, style: { padding: 's', width: 'narrow' } },
    { type: 'text', props: { html: '<h2>Section</h2><p>Text.</p>' }, style: { padding: 's', width: 'narrow' } }] },
};

// ---- v3.1: sizing controls ----
const RATIOS = [['16/9', 'Wide 16:9'], ['4/3', '4:3'], ['1/1', 'Square'], ['3/4', 'Tall 3:4'], ['auto', 'Original shape']];
BLOCKS.cards.fields.splice(3, 0,
  { group: 'Sizes (or drag the orange handle in the preview)' },
  { key: 'imageRatio', label: 'Image shape', type: 'select', options: RATIOS },
  { key: 'imageFit', label: 'Image fit', type: 'select', options: [['cover', 'Fill (crop edges)'], ['contain', 'Fit whole image (no crop)']] },
  { key: 'imageHeight', label: 'Image height (px, empty = automatic)', type: 'number' },
  { key: 'imagePad', label: 'Space around image when "Fit" (px)', type: 'number', when: p => p.imageFit === 'contain' },
  { key: 'iconSize', label: 'Emoji icon size (px, default 44)', type: 'number' },
  { group: 'Cards' });
BLOCKS.image.fields = BLOCKS.image.fields.map(f => f.key === 'maxWidth' ? { key: 'maxWidth', label: 'Width (e.g. 600 for 600px, or 100%) — or drag the handle', type: 'text' } : f);
BLOCKS.hero.fields.push({ key: 'imageWidth', label: 'Screenshot width (px, empty = full)', type: 'number' });
BLOCKS.imagetext.fields.splice(2, 0, { key: 'imageWidth', label: 'Image width (px, empty = half the row)', type: 'number' });
BLOCKS.team.fields.splice(3, 0, { key: 'photoSize', label: 'Photo size (px, default 96)', type: 'number' });
BLOCKS.gallery.fields.splice(1, 0, { key: 'imageRatio', label: 'Image shape', type: 'select', options: [['4/3', '4:3'], ['16/9', 'Wide 16:9'], ['1/1', 'Square'], ['3/4', 'Tall 3:4'], ['auto', 'Original shape']] });
STYLE_FIELDS.splice(STYLE_FIELDS.findIndex(f => f.key === 'minHeight') + 1, 0, { key: 'scale', label: 'Scale whole block (%, 100 = normal)', type: 'number' });

// ---- v3.2: per-card gradients ----
(() => {
  const items = BLOCKS.cards.fields.find(f => f.key === 'items');
  items.fields.push({ key: 'gradFrom', label: 'Gradient colour 1 (optional)', type: 'color', clearable: true }, { key: 'gradTo', label: 'Gradient colour 2', type: 'color', clearable: true });
})();
