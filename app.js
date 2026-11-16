/* Worship Flow site: renders the page from content, and includes the built-in editor (open with #edit). */
(() => {
  const DEFAULT = window.WF_DEFAULT, BLANKS = window.WF_BLANKS;
  const KEY = 'wf-draft', GHKEY = 'wf-github', BASEKEY = 'wf-base';
  /* Three-way merge, so edits made in this browser combine with changes made elsewhere instead of overwriting them. */
  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const isObj = x => x && typeof x === 'object' && !Array.isArray(x);
  const cp = x => (x === undefined ? x : JSON.parse(JSON.stringify(x)));
  const sameItem = (a, b) => eq(a, b) || (isObj(a) && isObj(b) && (a.type !== undefined || b.type !== undefined ? a.type === b.type : ['title', 'name', 'label', 'caption', 'quote', 'when', 'cue'].some(k => a[k] !== undefined && a[k] === b[k])));
  function alignArr(base, other) { const map = []; let b = 0; for (const el of other) { let j = -1; for (let k = b; k < base.length; k++) if (sameItem(el, base[k])) { j = k; break; } map.push(j); if (j >= 0) b = j + 1; } return map; }
  function mergeList(base, mine, theirs) {
    const mM = alignArr(base, mine), mT = alignArr(base, theirs), tBy = new Map(), ins = new Map(); let last = -1;
    theirs.forEach((t, i) => { if (mT[i] >= 0) { last = mT[i]; tBy.set(last, t); } else { if (!ins.has(last)) ins.set(last, []); ins.get(last).push(t); } });
    const out = [], emit = j => { if (ins.has(j)) { ins.get(j).forEach(t => out.push(cp(t))); ins.delete(j); } }; let started = false;
    mine.forEach((m, k) => {
      const j = mM[k]; if (j < 0) { out.push(cp(m)); return; }
      if (!started) { emit(-1); started = true; }
      if (tBy.has(j)) out.push(merge3(base[j], m, tBy.get(j))); else if (!eq(m, base[j])) out.push(cp(m));
      emit(j);
    });
    [...ins.keys()].sort((x, y) => x - y).forEach(emit);
    return out;
  }
  function merge3(base, mine, theirs) {
    if (eq(mine, base)) return cp(theirs);
    if (eq(theirs, base) || eq(mine, theirs)) return cp(mine);
    if (isObj(base) && isObj(mine) && isObj(theirs)) {
      const out = {};
      for (const k of new Set([...Object.keys(mine), ...Object.keys(theirs)])) {
        const inB = k in base, inM = k in mine, inT = k in theirs;
        if (inM && inT) out[k] = merge3(inB ? base[k] : undefined, mine[k], theirs[k]);
        else if (inM) { if (!inB || !eq(mine[k], base[k])) out[k] = cp(mine[k]); }
        else if (!inB || !eq(theirs[k], base[k])) out[k] = cp(theirs[k]);
      }
      return out;
    }
    if (Array.isArray(base) && Array.isArray(mine) && Array.isArray(theirs)) {
      if (mine.length === base.length && theirs.length === base.length) return mine.map((m, i) => merge3(base[i], m, theirs[i]));
      return mergeList(base, mine, theirs);
    }
    return cp(mine);
  }
  const BUILD = 19;
  const FB = window.WF_FIREBASE && window.WF_FIREBASE.projectId ? window.WF_FIREBASE : null;
  let adminP; const loadAdmin = () => (adminP = adminP || new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = 'admin.js?v=' + BUILD; sc.onload = () => res(window.WF_ADMIN); sc.onerror = rej; document.head.append(sc); }));
  /* Anonymous visit and click counts for the admin page. No cookies, nothing personal. */
  const sid = (() => { try { return sessionStorage.getItem('wf-sid') || (sessionStorage.setItem('wf-sid', Math.random().toString(36).slice(2, 12)), sessionStorage.getItem('wf-sid')); } catch { return 'x'; } })();
  const isOwner = () => { try { return localStorage.getItem('wf-admin') === '1' || !!localStorage.getItem('wf-draft') || !!localStorage.getItem('wf-github'); } catch { return false; } };
  function track(type, label) {
    if (!FB || edit || ui.page === 'admin' || isOwner() || navigator.doNotTrack === '1') return;
    const now = new Date(), f = v => ({ stringValue: String(v ?? '').slice(0, 110) });
    let ref = ''; try { ref = document.referrer && new URL(document.referrer).host !== location.host ? new URL(document.referrer).host : ''; } catch { }
    const page = ui.page === 'product' ? 'Product: ' + (C.sections[ui.prod.si].items[ui.prod.i].title || '') : ui.page === 'shop' ? 'All products' : 'Home';
    fetch(`https://firestore.googleapis.com/v1/projects/${FB.projectId}/databases/(default)/documents/events?key=${FB.apiKey}`, { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { t: { timestampValue: now.toISOString() }, type: f(type), label: f(label), page: f(page), day: f(now.toISOString().slice(0, 10)), ref: f(ref), dev: f(innerWidth < 700 ? 'Phone' : innerWidth < 1100 ? 'Tablet' : 'Computer'), sid: f(sid) } }) }).catch(() => { });
  }
  let lastView = null;
  const trackView = () => { const k = ui.page + (ui.prod ? ui.prod.si + '.' + ui.prod.i : ''); if (k === lastView) return; lastView = k; if (ui.page === 'product') track('product', C.sections[ui.prod.si].items[ui.prod.i].title); track('view', ''); };
  /* If a newer version has been pushed, refresh this browser's saved copy and reload once. */
  (async () => { try { const v = +(await (await fetch('version.txt', { cache: 'no-store' })).text()); if (v > BUILD && sessionStorage.getItem('wf-upd') !== String(v)) { sessionStorage.setItem('wf-upd', String(v)); await Promise.all(['./', 'index.html'].map(u => fetch(u, { cache: 'reload' }))); location.reload(); } } catch { } })();
  const LABELS = { hero: 'Hero', clients: 'Client logos', services: 'Services', store: 'Media store', process: 'Weekly process', plans: 'Creative process', pricing: 'Pricing plans', extras: 'Price list', testimonials: 'Testimonials', about: 'About', contact: 'Contact', text: 'Text block', gallery: 'Gallery' };
  const DISPLAY_FONTS = ['Bricolage Grotesque', 'Archivo', 'Sora', 'Unbounded', 'Fraunces', 'DM Serif Display', 'Anton'];
  const BODY_FONTS = ['Instrument Sans', 'Figtree', 'DM Sans', 'IBM Plex Sans', 'Source Serif 4'];
  let C, published, edit = false, hasDraft = false, undo = [], redo = [], pre = null, pausedUntil = 0;
  const ui = { billing: 0, filter: 'All', live: 0, prod: null, page: 'home', plan: 0 };

  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clone = o => JSON.parse(JSON.stringify(o));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const get = p => p.split('.').reduce((a, k) => (a == null ? a : a[k]), C);
  const set = (p, v) => { const ks = p.split('.'), l = ks.pop(); ks.reduce((a, k) => a[k], C)[l] = v; };
  const lsGet = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
  const lsSet = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
  const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const safeUrl = u => {
    u = String(u || '').trim();
    if (!u) return '';
    if (/^(https?:|mailto:|tel:|#|\/|\.\/|media\/)/i.test(u)) return u;
    if (/^[\w-]+(\.[\w-]+)+(\/|$|\?)/.test(u)) return 'https://' + u;
    return '';
  };
  const safeImg = u => (/^(data:image\/|https?:|media\/|\/|\.\/)/i.test(String(u || '')) ? u : '');

  /* ---------- building blocks ---------- */
  const T = (p, tag = 'span', cls = '', ml = false) => `<${tag} class="${cls}" data-t="${p}"${ml ? ' data-ml' : ''}>${esc(get(p))}</${tag}>`;
  const L = (p, cls = '') => {
    const o = get(p) || {}, h = safeUrl(o.href), ext = /^https?:/i.test(h);
    return `<a class="${cls}" data-l="${p}" href="${esc(h || '#')}"${h ? '' : ' data-empty'}${ext ? ' target="_blank" rel="noopener"' : ''}>${esc(o.label)}</a>`;
  };
  const I = (p, cls, fallback = '', k = 0) => {
    const src = safeImg(get(p));
    return `<div class="img ${cls}" data-pic="${p}">${src ? `<img src="${esc(src)}" alt="${esc(fallback)}" loading="lazy">` : `<div class="art" style="--k:${k}">${esc(fallback)}</div>`}</div>`;
  };
  const head = p => `<div class="sec-head">${T(p + '.title', 'h2')}${T(p + '.body', 'p', 'lede', true)}</div>`;
  const slist = (p, cls) => `<ul class="${cls}" data-slist="${p}">${(get(p) || []).map((_, i) => (edit ? `<li>${T(`${p}.${i}`)}<button class="ed-x" data-act="s-del" data-p="${p}" data-i="${i}" aria-label="Remove this line">✕</button></li>` : T(`${p}.${i}`, 'li'))).join('')}</ul>`;
  const list = (p, cls, fn, extra = '') => `<div class="${cls}" data-list="${p}"${extra}>${(get(p) || []).map((it, i) => fn(it, `${p}.${i}`, i)).join('')}</div>`;

  const R = {
    hero: (s, p) => {
      const sl = s.slides || []; if (ui.live >= sl.length) ui.live = 0;
      return `<div class="wrap hero-grid">
        <div class="hero-copy">${T(p + '.kicker', 'p', 'kicker')}${T(p + '.title', 'h1')}${T(p + '.body', 'p', 'lede', true)}
          <div class="btns">${L(p + '.cta1', 'btn btn-primary')}${L(p + '.cta2', 'btn')}</div>${(() => { const ci = C.sections.findIndex(x => x.type === 'contact' && !x.hidden), h = safeUrl(s.noteHref !== undefined ? s.noteHref : (ci >= 0 ? '#' + secIds()[ci] : '')); return edit || !h || !s.note ? T(p + '.note', 'p', 'hero-note') : `<a class="hero-note hero-note-link" href="${esc(h)}">${esc(s.note)}</a>`; })()}</div>
        <div class="console"><div class="console-top"><i class="tally"></i>${T(p + '.consoleTitle', 'b')}<span>Live output</span></div>
          <div class="output"><div class="out-line" aria-live="off">${esc(sl[ui.live]?.line)}</div></div>
          ${list(p + '.slides', 'slides', (it, ip, i) => `<div class="slide ${i === ui.live ? 'live' : ''}" data-item="${i}" data-live="${i}" tabindex="0" role="button">${T(ip + '.cue', 'span', 'slide-cue')}${T(ip + '.line')}</div>`, ' data-compact')}
          ${T(p + '.consoleHint', 'p', 'console-hint')}</div></div>`;
    },
    clients: (s, p) => {
      if (edit) return `<div class="wrap">${list(p + '.items', 'clients-in', (it, ip, i) => {
        const src = safeImg(it.logo);
        return `<span class="client" data-item="${i}"><span class="client-logo" data-img="${ip}.logo">${src ? `<img src="${esc(src)}" alt="${esc(it.name)}">` : '<span class="logo-ph">Add logo</span>'}</span>${T(ip + '.name', 'span', 'client-name')}</span>`;
      }).replace('>', '>' + T(p + '.title', 'span', 'clients-title'))}</div>`;
      const logos = (s.items || []).filter(it => safeImg(it.logo));
      const set = hide => logos.map(it => `<span class="client"${hide ? ' aria-hidden="true"' : ''}><img src="${esc(it.logo)}" alt="${hide ? '' : esc(it.name)}"></span>`).join('');
      const reps = Math.max(1, Math.ceil(8 / Math.max(1, logos.length)));
      const half = hide => Array.from({ length: reps }, (_, k) => set(hide || k > 0)).join('');
      return `<div class="wrap">${T(p + '.title', 'p', 'clients-title')}</div><div class="marquee"><div class="marquee-track" style="--dur:${logos.length * reps * 4}s">${half(false)}${half(true)}</div></div>`;
    },
    services: (s, p) => `<div class="wrap">${head(p)}${list(p + '.items', 'bento', (it, ip, i) => `<article class="card" data-item="${i}">${T(ip + '.title', 'h3')}${T(ip + '.body', 'p', '', true)}${slist(ip + '.tags', 'tags')}</article>`)}</div>`,
    store: (s, p, full, homeId) => {
      const lim = full ? Infinity : (+s.limit || 6), live = (s.items || []).filter(x => edit || !x.draft), total = live.length; let shown = 0;
      const cats = ['All', ...new Set(live.map(x => x.category).filter(Boolean))];
      if (edit || !cats.includes(ui.filter)) ui.filter = 'All';
      return `<div class="wrap">${full ? `<a class="textlink back" href="#${homeId}">Back to the home page</a>` : ''}${head(p)}<div class="chips" role="group" aria-label="Filter by type">${cats.map(c => `<button class="chip" data-act="filter" data-v="${esc(c)}" aria-pressed="${c === ui.filter}">${esc(c)}</button>`).join('')}</div>
      ${list(p + '.items', 'grid3', (it, ip, i) => `<article class="product ${it.draft ? 'is-draft' : ''}" data-item="${i}"${(!edit && it.draft) || (ui.filter !== 'All' && it.category !== ui.filter) || ++shown > lim ? ' hidden' : ''}>${it.draft ? '<span class="draft-tag">Draft, hidden from visitors</span>' : ''}${I(ip + '.image', 'img-169', it.title, i % 4)}
        <div class="product-body"><div class="product-meta">${T(ip + '.category')}${T(ip + '.badge', 'span', 'badge')}</div>${T(ip + '.title', 'h3')}${T(ip + '.desc', 'p', 'product-desc', true)}</div>
        <div class="product-foot">${T(ip + '.price', 'span', 'price')}<a class="textlink" href="#p-${slug(it.title)}">Details</a>${L(ip + '.buy', 'btn btn-primary btn-small')}</div></article>`)}${!full && total > lim ? `<div class="after"><a class="btn" href="#shop">See all ${total} products</a></div>` : ''}</div>`;
    },
    process: (s, p) => `<div class="wrap">${head(p)}${list(p + '.items', 'week', (it, ip, i) => `<div class="day" data-item="${i}">${T(ip + '.when', 'span', 'day-when')}${T(ip + '.title', 'h3')}${T(ip + '.body', 'p', '', true)}</div>`)}</div>`,
    plans: (s, p) => {
      const tr = s.tracks || []; if (ui.plan >= tr.length) ui.plan = 0; const k = ui.plan;
      return `<div class="wrap">${head(p)}<div class="toggle" role="group" aria-label="Type of work">${tr.map((t, i) => `<button data-act="plan" data-v="${i}" aria-pressed="${i === k}">${esc(t.name)}</button>`).join('')}</div>
        ${tr[k] ? `${T(`${p}.tracks.${k}.intro`, 'p', 'lede plan-intro', true)}${list(`${p}.tracks.${k}.items`, 'week', (it, ip, i) => `<div class="day" data-item="${i}">${T(ip + '.when', 'span', 'day-when')}${T(ip + '.title', 'h3')}${T(ip + '.body', 'p', '', true)}</div>`)}` : ''}</div>`;
    },
    pricing: (s, p) => {
      const per = s.periods || []; if (ui.billing >= per.length) ui.billing = 0;
      return `<div class="wrap">${head(p)}${per.length > 1 ? `<div class="toggle" role="group" aria-label="Billing period">${per.map((x, i) => `<button data-act="billing" data-v="${i}" aria-pressed="${i === ui.billing}">${esc(x)}</button>`).join('')}</div>` : ''}
      ${list(p + '.items', 'plans', (it, ip, i) => `<article class="plan ${it.featured ? 'featured' : ''}" data-item="${i}">${T(ip + '.name', 'h3')}${T(ip + '.blurb', 'p', 'plan-blurb')}
        <div class="plan-price">${T(`${ip}.prices.${ui.billing}`, 'span', 'price')}${T(p + '.unit', 'span', 'plan-unit')}</div>${slist(ip + '.features', 'checks')}${formsOn() && !edit ? `<a class="btn ${it.featured ? 'btn-primary' : ''}" href="#signup-${slug(it.name)}">${esc(it.cta?.label)}</a>` : L(ip + '.cta', 'btn ' + (it.featured ? 'btn-primary' : ''))}</article>`)}${edit ? `<p class="ed-hint">${formsOn() ? 'These buttons open the built-in sign-up form for each plan. The link on each button is only a backup.' : 'Add your form email key under Look and fonts to switch these buttons to the built-in sign-up forms.'}</p>` : ''}</div>`;
    },
    extras: (s, p) => `<div class="wrap">${head(p)}${list(p + '.items', 'rows', (it, ip, i) => `<div class="row" data-item="${i}">${T(ip + '.name', 'b')}${T(ip + '.detail', 'span', 'row-detail', true)}${T(ip + '.price', 'span', 'row-price')}</div>`)}<div class="after">${formsOn() && !edit ? `<a class="btn" href="#request">${esc(s.cta?.label)}</a>` : L(p + '.cta', 'btn')}</div></div>`,
    testimonials: (s, p) => {
      if (edit) return R.testimonialsEdit(s, p);
      const q = (s.items || []).filter(it => it.quote || it.name); if (!q.length) return `<div class="wrap">${head(p)}</div>`;
      const set = hide => q.map(it => `<figure class="quote"${hide ? ' aria-hidden="true"' : ''}><blockquote>${esc(it.quote)}</blockquote><figcaption><b>${esc(it.name)}</b><span>${esc(it.org)}</span></figcaption></figure>`).join('');
      const reps = Math.max(1, Math.ceil(6 / q.length)), half = hide => Array.from({ length: reps }, (_, k) => set(hide || k > 0)).join('');
      return `<div class="wrap">${head(p)}</div><div class="marquee quotes-marquee" tabindex="0" aria-label="Testimonials, scrolling. Hover or focus to pause."><div class="marquee-track quotes-track" style="--dur:${q.length * reps * 9}s">${half(false)}${half(true)}</div></div>`;
    },
    testimonialsEdit: (s, p) => `<div class="wrap">${head(p)}${list(p + '.items', 'quotes', (it, ip, i) => `<figure class="quote" data-item="${i}">${T(ip + '.quote', 'blockquote', '', true)}<figcaption>${T(ip + '.name', 'b')}${T(ip + '.org')}</figcaption></figure>`)}</div>`,
    about: (s, p) => `<div class="wrap split">${I(p + '.image', 'img-45', '')}<div class="split-copy">${T(p + '.title', 'h2')}${T(p + '.body', 'p', 'lede', true)}${T(p + '.body2', 'p', 'motto')}${slist(p + '.facts', 'checks')}${L(p + '.cta', 'btn')}</div></div>`,
    contact: (s, p) => `<div class="wrap"><div class="contact-card">${T(p + '.title', 'h2')}${T(p + '.body', 'p', 'lede', true)}<div class="btns">${L(p + '.cta1', 'btn btn-primary')}${L(p + '.cta2', 'btn')}</div></div></div>`,
    text: (s, p) => `<div class="wrap"><div class="stack">${T(p + '.title', 'h2')}${T(p + '.body', 'p', 'lede', true)}${L(p + '.cta', 'btn btn-primary')}</div></div>`,
    gallery: (s, p) => `<div class="wrap">${head(p)}${list(p + '.items', 'grid3', (it, ip, i) => `<div class="shot" data-item="${i}">${I(ip + '.image', 'img-169', it.caption, i % 4)}<div class="shot-cap">${T(ip + '.caption')}${L(ip + '.link', 'textlink')}</div></div>`)}</div>`
  };

  const findProduct = () => {
    const h = location.hash.slice(1); if (!h.startsWith('p-')) { ui.prod = null; return null; }
    let hit = null;
    C.sections.forEach((s, si) => s.type === 'store' && (s.items || []).forEach((it, i) => { if (!hit && (edit || !it.draft) && 'p-' + slug(it.title) === h) hit = { si, i }; }));
    if (!hit && edit && ui.prod && C.sections[ui.prod.si]?.items?.[ui.prod.i]) { hit = ui.prod; history.replaceState(null, '', '#p-' + slug(C.sections[hit.si].items[hit.i].title)); }
    return (ui.prod = hit);
  };
  const productPage = ({ si, i }, ids) => {
    const p = `sections.${si}.items.${i}`, it = get(p);
    if (!Array.isArray(it.includes)) it.includes = []; if (!Array.isArray(it.gallery)) it.gallery = []; if (it.details == null) it.details = '';
    const yt = (String(it.preview?.href || '').match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/) || [])[1];
    const st = C.sections[si], lp = `sections.${si}.labels`; st.labels = Object.assign({ about: 'About this product', includes: "What's included", video: 'Preview', gallery: 'Inside this pack' }, st.labels);
    const hd = (k, hint) => `<div class="pp-hd">${T(`${lp}.${k}`, 'h3')}${edit ? `<button class="ed-b" data-act="pp-clear" data-p="${p}" data-k="${k}">Remove from this product</button><span class="ed-hint">${hint}</span>` : ''}</div>`;
    const empty = 'Visitors only see this block when it has content.';
    return `<section class="sec product-page"><div class="wrap"><a class="textlink back" href="#shop">Back to all products</a>
      ${edit ? `<div class="ed-note"><span>${it.draft ? 'This product is a draft. Visitors cannot see it.' : 'This product is live once you publish.'}</span><button class="ed-b" data-act="item-draft" data-p="sections.${si}.items" data-i="${i}">${it.draft ? 'Make it live' : 'Back to draft'}</button></div>` : ''}
      <div class="pp">${I(p + '.image', 'img-169 pp-img', it.title, i % 4)}
        <div class="pp-info"><div class="product-meta">${T(p + '.category')}${T(p + '.badge', 'span', 'badge')}</div>${T(p + '.title', 'h1', 'pp-title')}${T(p + '.price', 'span', 'price')}${T(p + '.desc', 'p', 'lede', true)}
        <div class="btns">${L(p + '.buy', 'btn btn-primary')}${L(p + '.preview', 'btn')}</div></div></div>
      ${edit || it.details ? `${hd('about', empty)}${T(p + '.details', 'p', 'lede', true)}` : ''}
      ${edit || it.includes.length ? `${hd('includes', empty)}${slist(p + '.includes', 'checks')}` : ''}
      ${edit || yt ? `${hd('video', 'Paste a YouTube link into the Preview button above to show a video here.')}${yt ? `<iframe class="pp-video" src="https://www.youtube-nocookie.com/embed/${yt}" title="Preview video" loading="lazy" allowfullscreen></iframe>` : ''}` : ''}
      ${edit || it.gallery.length ? `${hd('gallery', empty)}${list(p + '.gallery', 'grid3', (g, gp, k) => `<div class="shot" data-item="${k}">${I(gp + '.image', 'img-169', g.caption, k % 4)}<div class="shot-cap">${T(gp + '.caption')}</div></div>`)}` : ''}
    </div></section>`;
  };
  const formsOn = () => !!(C.meta && C.meta.formKey);
  const BILL_NOTES = ['Invoice me weekly', 'One invoice a month', 'Yearly rate, billed monthly'];
  const field = (name, label, o = {}) => `<label>${label}${o.req ? ' <span class="req">(required)</span>' : ''}${o.type === 'textarea' ? `<textarea name="${name}" id="f-${name}" rows="4"${o.req ? ' required' : ''}></textarea>` : o.options ? `<select name="${name}" id="f-${name}"${o.req ? ' required' : ''}>${o.options.map(x => `<option${x === o.value ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select>` : `<input name="${name}" id="f-${name}" type="${o.type || 'text'}"${o.auto ? ` autocomplete="${o.auto}"` : ''}${o.req ? ' required' : ''}>`}</label>`;
  const formRoute = () => {
    const h = location.hash.slice(1);
    if (h === 'request') return { kind: 'request' };
    if (h.startsWith('signup-')) for (const sec of C.sections) if (sec.type === 'pricing') { const plan = (sec.items || []).find(it => 'signup-' + slug(it.name) === h); if (plan) return { kind: 'signup', plan, sec }; }
    return null;
  };
  const formPage = (r, ids) => {
    const back = `<a class="textlink back" href="#${ids[C.sections.findIndex(x => x.type === (r.kind === 'signup' ? 'pricing' : 'extras'))] || 'top'}">Back</a>`;
    const common = `${field('first_name', 'First name', { req: 1, auto: 'given-name' })}${field('last_name', 'Last name', { req: 1, auto: 'family-name' })}${field('email', 'Email', { req: 1, type: 'email', auto: 'email' })}${field('church', 'Church name', { req: 1, auto: 'organization' })}`;
    const tail = `<input type="checkbox" name="botcheck" class="hp" tabindex="-1" autocomplete="off"><button class="btn btn-primary" type="submit">${r.kind === 'signup' ? 'Send my sign-up' : 'Send my request'}</button><p class="form-msg" role="status"></p>`;
    if (r.kind === 'signup') {
      const per = r.sec.periods || [], opts = per.map((x, i) => `${x}: ${r.plan.prices[i] || ''} ${r.sec.unit || ''} (${BILL_NOTES[i] || x})`);
      return `<section class="sec form-page"><div class="wrap">${back}<div class="form-grid"><div class="stack"><h1 class="pp-title">${esc(r.plan.name)} plan sign-up</h1><p class="lede">${esc(r.plan.blurb)}</p><ul class="checks">${(r.plan.features || []).map(f => `<li>${esc(f)}</li>`).join('')}</ul><p class="muted-note">No payment is taken here. We'll confirm the details with you and send your first invoice.</p></div>
        <form class="wf-form" data-form="signup" data-plan="${esc(r.plan.name)}">${common}${field('church_size', 'Church size')}${field('billing', 'Which option do you want for this plan?', { req: 1, options: opts, value: opts[ui.billing] })}${field('notes', 'Anything we should know?', { type: 'textarea' })}${tail}</form></div></div></section>`;
    }
    const ex = C.sections.find(x => x.type === 'extras'), names = [...(ex?.items || []).map(x => x.name), 'Something else'];
    return `<section class="sec form-page"><div class="wrap">${back}<div class="form-grid"><div class="stack"><h1 class="pp-title">Tell us about your project</h1><p class="lede">Events, livestreams, story videos, training and more. Send the details and we'll reply with next steps.</p></div>
      <form class="wf-form" data-form="request">${common}${field('service', 'What do you need?', { req: 1, options: names })}${field('date', 'Date or deadline, if you have one')}${field('details', 'Details', { req: 1, type: 'textarea' })}${tail}</form></div></div></section>`;
  };
  const secIds = () => { const seen = {}; return C.sections.map(s => { let id = slug(s.anchor) || slug(s.nav) || s.type; if (seen[id]) id += '-' + (++seen[id]); else seen[id] = 1; return id; }); };

  const socialIcon = u => { const m = String(u || '').toLowerCase().match(/(youtube|youtu\.be|instagram|facebook|fb\.com|tiktok|twitter|\/\/x\.com|\/\/www\.x\.com|vimeo|threads|spotify|linkedin)/); if (!m) return ''; const k = m[1]; return k === 'youtu.be' ? 'youtube' : k === 'fb.com' ? 'facebook' : /x\.com|twitter/.test(k) ? 'x' : k; };
  const gone = s => s.hidden || (!edit && s.type === 'store' && !(s.items || []).some(x => !x.draft)) || (!edit && s.type === 'clients' && !(s.items || []).some(x => safeImg(x.logo)));
  function render() {
    const ids = secIds(), prod = findProduct(), shopI = !prod && location.hash === '#shop' ? C.sections.findIndex(x => x.type === 'store') : -1;
    const adminOn = FB && location.hash === '#admin', fr = !adminOn && formsOn() ? formRoute() : null;
    if (adminOn && pubView) { if (work) C = work; work = null; pubView = false; try { sessionStorage.removeItem('wf-pub'); } catch { } }
    ui.page = adminOn ? 'admin' : fr ? 'form' : prod ? 'product' : shopI >= 0 ? 'shop' : 'home';
    const brand = safeImg(C.brand.logo) ? `<img src="${esc(C.brand.logo)}" alt="${esc(C.brand.name)}">` : `<i class="brand-mark"></i>${T('brand.name')}`;
    const links = C.sections.map((s, i) => (s.nav && !gone(s) ? `<a href="#${ids[i]}">${esc(s.nav)}</a>` : '')).join('');
    $('#app').innerHTML = `
      <header class="nav"><div class="wrap nav-in"><a class="brand" href="#top">${brand}</a>
        <nav class="nav-links" id="nav-links" aria-label="Main">${links}${L('nav.cta', 'btn btn-primary')}</nav>
        ${L('nav.cta', 'btn btn-primary btn-small nav-cta')}<button class="nav-toggle" data-act="menu" aria-controls="nav-links" aria-label="Menu">Menu</button></div></header>
      <main id="top">${adminOn ? '<section class="sec admin"><div class="wrap" id="admin-root"></div></section>' : fr ? formPage(fr, ids) : prod ? productPage(prod, ids) : shopI >= 0 ? `<section class="sec store">${R.store(C.sections[shopI], 'sections.' + shopI, true, ids[shopI])}</section>` : C.sections.map((s, i) => (R[s.type] ? `<section class="sec ${s.type} ${s.bg === 'tint' ? 'sec-tint' : ''} ${gone(s) ? 'is-hidden' : ''}" id="${ids[i]}" data-sec="${i}">${R[s.type](s, 'sections.' + i)}</section>` : '')).join('')}</main>
      <footer class="foot"><div class="wrap foot-in"><span class="brand"><i class="brand-mark"></i>${esc(C.brand.name)}</span>
        ${list('footer.socials', 'socials', (it, ip, i) => { const ic = socialIcon(it.href), h = safeUrl(it.href); return `<span data-item="${i}">${ic ? `<a class="soc" data-l="${ip}" href="${esc(h || '#')}"${h ? '' : ' data-empty'} target="_blank" rel="noopener" aria-label="${esc(it.label)}" title="${esc(it.label)}"><i style="--i:url(icons/${ic}.svg)"></i></a>` : L(ip)}</span>`; })}
        <span>© ${new Date().getFullYear()} ${T('footer.owner')}</span>${T('footer.note')}${FB ? '<a href="#admin">Admin</a>' : '<a href="#edit" data-act="edit-on">Edit site</a>'}</div></footer>`;
    if (adminOn) loadAdmin().then(A => A.mount($('#admin-root'), { edit: tryEnter, publicView: () => publicView(true), hasDraft: () => hasDraft })).catch(() => ($('#admin-root').textContent = 'The admin tools could not load. Reload to try again.'));
    applyTheme(); whitenLogos();
    document.body.classList.toggle('editing', edit);
    if (edit && !adminOn && !fr) decorate();
    chrome();
  }

  function applyTheme() {
    const t = C.theme, r = document.documentElement;
    r.dataset.mode = t.mode === 'light' ? 'light' : 'dark';
    r.style.setProperty('--accent', t.accent); r.style.setProperty('--accent2', t.accent2);
    r.style.setProperty('--radius', (+t.radius || 0) + 'px');
    r.style.setProperty('--font-display', `"${t.display}",system-ui,sans-serif`);
    r.style.setProperty('--font-body', `"${t.body}",system-ui,sans-serif`);
    const h = String(t.accent || '').replace('#', ''), n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16) || 0;
    const lum = (0.299 * (n >> 16 & 255) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) / 255;
    r.style.setProperty('--on-accent', lum > 0.55 ? '#141006' : '#ffffff');
    const fam = f => 'family=' + encodeURIComponent(f).replace(/%20/g, '+') + ':wght@400;500;600;700;800';
    const href = `https://fonts.googleapis.com/css2?${fam(t.display)}&${fam(t.body)}&display=swap`;
    const link = $('#wf-fonts'); if (link && link.getAttribute('href') !== href && (t.display !== DEFAULT.theme.display || t.body !== DEFAULT.theme.body || link.dataset.dyn)) { link.href = href; link.dataset.dyn = 1; }
    document.title = C.meta.title || C.brand.name;
    $('meta[name=description]')?.setAttribute('content', C.meta.description || '');
  }

  /* ---------- hero console ---------- */
  function setLive(i, byUser) {
    const sl = $$('.slide'); if (!sl.length) return;
    ui.live = i % sl.length;
    sl.forEach((el, k) => el.classList.toggle('live', k === ui.live));
    const hero = C.sections.find(s => s.type === 'hero'), out = $('.out-line');
    if (out && hero) out.textContent = hero.slides[ui.live]?.line || '';
    if (byUser) pausedUntil = Date.now() + 15000;
  }
  setInterval(() => {
    if (edit || Date.now() < pausedUntil || document.hidden || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setLive(ui.live + 1);
  }, 2800);

  /* ---------- editor ---------- */
  /* Public view: the published site exactly as visitors see it, with no unpublished changes. */
  let pubView = false, work = null;
  async function publicView(on) {
    if (on) {
      try { const r = await fetch('content.json', { cache: 'no-store' }); if (r.ok) { const j = await r.json(); if (Array.isArray(j.sections)) published = j; } } catch { }
      if (!pubView) work = C; C = clone(published); pubView = true; edit = false; closePanel();
      try { sessionStorage.setItem('wf-pub', '1'); sessionStorage.removeItem('wf-edit'); } catch { }
      history.replaceState(null, '', location.pathname + location.search); render(); scrollTo(0, 0);
    } else {
      if (work) C = work; work = null; pubView = false; try { sessionStorage.removeItem('wf-pub'); } catch { }
      if (FB && location.hash !== '#admin') location.hash = '#admin'; else render();
    }
  }
  const save = () => { if (pubView) return; if (!hasDraft) lsSet(BASEKEY, published); hasDraft = true; if (!lsSet(KEY, C)) toast('This draft is too large to autosave in the browser. Publish, or download a backup.'); };
  const mutate = fn => { undo.push(JSON.stringify(C)); if (undo.length > 60) undo.shift(); redo = []; fn(); save(); render(); };
  const begin = () => { undo.push(JSON.stringify(C)); redo = []; };
  let toastT; const toast = m => { let t = $('.ed-toast'); if (!t) { t = document.createElement('div'); t.className = 'ed-toast'; t.setAttribute('role', 'status'); document.body.append(t); } t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 4200); };

  function decorate() {
    $$('#app [data-t]').forEach(el => { el.contentEditable = 'plaintext-only'; if (el.contentEditable !== 'plaintext-only') el.contentEditable = 'true'; el.dataset.ph = 'Type here'; });
    $$('#app [data-sec]').forEach(el => {
      const i = +el.dataset.sec, s = C.sections[i];
      el.insertAdjacentHTML('afterbegin', `<div class="ed-sbar"><span>${LABELS[s.type] || s.type}</span>
        <button class="ed-s" data-act="sec-up" data-i="${i}" aria-label="Move section up">↑</button><button class="ed-s" data-act="sec-down" data-i="${i}" aria-label="Move section down">↓</button>
        <button class="ed-s" data-act="sec-set" data-i="${i}">Settings</button><button class="ed-s" data-act="sec-hide" data-i="${i}">${s.hidden ? 'Show' : 'Hide'}</button>
        <button class="ed-s" data-act="sec-copy" data-i="${i}">Copy</button><button class="ed-s" data-act="sec-del" data-i="${i}">Delete</button></div>`);
      el.insertAdjacentHTML('afterend', `<div class="ed-addsec"><button class="ed-add" data-act="addsec" data-i="${i + 1}">+ Add a section here</button></div>`);
    });
    $$('#app [data-list]').forEach(el => {
      const p = el.dataset.list, compact = el.hasAttribute('data-compact');
      $$(':scope > [data-item]', el).forEach(it => {
        const i = it.dataset.item, a = `data-p="${p}" data-i="${i}"`, star = get(`${p}.${i}`) && 'featured' in get(`${p}.${i}`), isProd = /^sections\.\d+\.items$/.test(p) && C.sections[p.split('.')[1]].type === 'store';
        it.insertAdjacentHTML('beforeend', `<div class="ed-ic">${compact ? '' : `<button class="ed-s" data-act="item-up" ${a} aria-label="Move earlier">‹</button><button class="ed-s" data-act="item-down" ${a} aria-label="Move later">›</button>${star ? `<button class="ed-s" data-act="item-star" ${a} aria-label="Highlight">★</button>` : ''}${isProd ? `<button class="ed-s" data-act="item-draft" ${a}>${get(`${p}.${i}`).draft ? 'Make live' : 'Draft'}</button>` : ''}<button class="ed-s" data-act="item-copy" ${a} aria-label="Duplicate">⧉</button>`}<button class="ed-s" data-act="item-del" ${a} aria-label="Delete">✕</button></div>`);
      });
      el.insertAdjacentHTML('beforeend', `<button class="ed-add" data-act="item-add" data-p="${p}">+ Add</button>`);
    });
    $$('#app [data-slist]').forEach(el => el.insertAdjacentHTML('beforeend', `<li class="ed-li"><button data-act="s-add" data-p="${el.dataset.slist}">+ Add line</button></li>`));
  }

  function chrome() {
    let bar = $('.ed-bar'), pill = $('.ed-pill');
    const fresh = edit && !bar;
    if (fresh) { bar = document.createElement('div'); bar.className = 'ed-bar'; document.body.prepend(bar); }
    if (!edit && bar) bar.remove();
    if (edit && !fresh) { $('[data-act=undo]', bar).disabled = !undo.length; $('[data-act=redo]', bar).disabled = !redo.length; $('[data-act=addsec]', bar).dataset.i = C.sections.length; }
    if (fresh) bar.innerHTML = `<strong>Editing. Click any text, button or image to change it.</strong><span class="ed-ver">Site version ${BUILD}</span>
      <button class="ed-b" data-act="undo" ${undo.length ? '' : 'disabled'}>Undo</button><button class="ed-b" data-act="redo" ${redo.length ? '' : 'disabled'}>Redo</button>
      <button class="ed-b" data-act="theme">Look and fonts</button><button class="ed-b" data-act="addsec" data-i="${C.sections.length}">Add section</button>
      <button class="ed-b" data-act="backup">Backup</button><button class="ed-b ed-go" data-act="publish">Publish</button><button class="ed-b" data-act="edit-off">Done</button>`;
    if (pill) { pill.remove(); pill = null; }
    if (pubView) { pill = document.createElement('div'); pill.className = 'ed-pill'; pill.innerHTML = `<span>Public view. This is what visitors see right now.</span><button class="ed-b" data-act="pub-off">${FB ? 'Back to admin' : 'Leave public view'}</button>`; document.body.append(pill); return; }
    const want = !edit && hasDraft && ui.page !== 'admin';
    if (want && !pill) { pill = document.createElement('div'); pill.className = 'ed-pill'; pill.innerHTML = `<span>Viewing your unpublished draft</span><button class="ed-b" data-act="edit-on">Keep editing</button><button class="ed-b" data-act="discard">Discard</button>`; document.body.append(pill); }
    if (!want && pill) pill.remove();
  }

  function panel(title, html) {
    closePanel();
    const el = document.createElement('div'); el.className = 'ed-panel'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', title);
    el.innerHTML = `<h4>${esc(title)}<button class="ed-b" data-act="close">Close</button></h4>${html}`;
    document.body.append(el); el.querySelector('input,select,textarea')?.focus({ preventScroll: true }); return el;
  }
  const closePanel = () => $('.ed-panel')?.remove();
  const bind = (el, fn) => el.addEventListener('input', e => { fn(e.target); save(); render(); });

  function linkForm(p) {
    const o = get(p); begin();
    const el = panel('Button or link', `<label>Text<input id="ed-l-label" value="${esc(o.label)}"></label><label>Where it goes<input id="ed-l-href" value="${esc(o.href)}" placeholder="https://… or #contact"></label>
      <p>Paste any link: a Stripe, Gumroad or Lemon Squeezy checkout, a YouTube video, a form, or #pricing to jump to a section. Leave it empty to hide the button.</p>`);
    bind(el, () => { o.label = $('#ed-l-label').value; o.href = $('#ed-l-href').value.trim(); });
  }
  function imageForm(p) {
    const el = panel('Image', `<label>Upload from this device<input id="ed-i-file" type="file" accept="image/*"></label><label>Or paste an image address<input id="ed-i-url" value="${esc(/^data:/.test(get(p) || '') ? '' : get(p))}" placeholder="https://…"></label>
      <div class="ed-row"><button class="ed-b" data-act="img-clear" data-p="${p}">Remove image</button></div><p>Large photos are resized to 1600px automatically.</p>`);
    $('#ed-i-file').addEventListener('change', async e => { const f = e.target.files[0]; if (!f) return; try { let u = await readImage(f); if (/^sections\.\d+\.items\.\d+\.logo$/.test(p)) u = await whiteLogo(u); mutate(() => set(p, u)); closePanel(); } catch { toast('That file could not be read as an image. Try a JPG, PNG or WebP.'); } });
    $('#ed-i-url').addEventListener('change', e => mutate(() => set(p, e.target.value.trim())));
  }
  /* Client logos: cut out a solid background, trim empty margins, and turn the artwork white. */
  function whiteLogo(url) {
    if (/^data:image\/svg/.test(url) || /\.svg(\?|$)/i.test(url)) return Promise.resolve(url);
    return new Promise(res => {
      const im = new Image(); im.onerror = () => res(url);
      im.onload = () => {
        try {
          const sc = Math.min(1, 900 / Math.max(im.width, im.height)), w = Math.max(1, Math.round(im.width * sc)), h = Math.max(1, Math.round(im.height * sc));
          const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.drawImage(im, 0, 0, w, h);
          const d = x.getImageData(0, 0, w, h), px = d.data, n = w * h, at = (X, Y) => (Y * w + X) * 4;
          const corners = [at(0, 0), at(w - 1, 0), at(0, h - 1), at(w - 1, h - 1)];
          const opaque = corners.every(i => px[i + 3] > 240);
          const bg = [0, 1, 2].map(k => corners.reduce((t, i) => t + px[i + k], 0) / 4);
          const A = new Float32Array(n), L = new Float32Array(n); let lo = 1, hi = 0, sum = 0, cnt = 0;
          for (let k = 0; k < n; k++) {
            const i = k * 4; let al = px[i + 3] / 255;
            if (opaque) al = Math.max(0, Math.min(1, (Math.hypot(px[i] - bg[0], px[i + 1] - bg[1], px[i + 2] - bg[2]) - 24) / 80));
            const lum = (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) / 255; A[k] = al; L[k] = lum;
            if (al > 0.5) { if (lum < lo) lo = lum; if (lum > hi) hi = lum; sum += lum; cnt++; }
          }
          if (!cnt) return res(url);
          /* Keep the logo's own light/dark detail: its main tone becomes white, the opposite tone is cut out. */
          const range = hi - lo, light = sum / cnt > 0.55;
          const V = new Float32Array(n).fill(1);
          if (range > 0.18) for (let k = 0; k < n; k++) { let v = (L[k] - lo) / range; if (!light) v = 1 - v; V[k] = Math.max(0, Math.min(1, (v - 0.25) / 0.5)); }
          /* Opposite-tone parts that stand on their own (not enclosed by the main shape) stay visible, e.g. a line of text under a seal. */
          const out = new Uint8Array(n), stack = [];
          const push = k => { if (!out[k] && !(A[k] > 0.3 && V[k] > 0.5)) { out[k] = 1; stack.push(k); } };
          for (let X = 0; X < w; X++) { push(X); push((h - 1) * w + X); } for (let Y = 0; Y < h; Y++) { push(Y * w); push(Y * w + w - 1); }
          while (stack.length) { const k = stack.pop(), X = k % w; if (X > 0) push(k - 1); if (X < w - 1) push(k + 1); if (k >= w) push(k - w); if (k < n - w) push(k + w); }
          let x0 = w, y0 = h, x1 = -1, y1 = -1;
          for (let k = 0; k < n; k++) {
            const al = out[k] ? A[k] : A[k] * V[k], i = k * 4; px[i] = px[i + 1] = px[i + 2] = 255; px[i + 3] = Math.round(al * 255);
            if (al > 0.1) { const X = k % w, Y = (k - X) / w; if (X < x0) x0 = X; if (X > x1) x1 = X; if (Y < y0) y0 = Y; if (Y > y1) y1 = Y; }
          }
          if (x1 < 0) return res(url);
          x.putImageData(d, 0, 0);
          const o = document.createElement('canvas'); o.width = x1 - x0 + 1; o.height = y1 - y0 + 1; o.getContext('2d').drawImage(c, x0, y0, o.width, o.height, 0, 0, o.width, o.height);
          /* Small source files: enlarge smoothly, then tighten the soft edges so the shape reads crisp on sharp screens. */
          let fin = o; const big = Math.max(o.width, o.height);
          if (big < 520) {
            const f = Math.min(4, Math.ceil(520 / big)), u = document.createElement('canvas'); u.width = o.width * f; u.height = o.height * f;
            const ux = u.getContext('2d'); ux.imageSmoothingEnabled = true; ux.imageSmoothingQuality = 'high'; ux.drawImage(o, 0, 0, u.width, u.height);
            const ud = ux.getImageData(0, 0, u.width, u.height), up = ud.data;
            for (let i = 3; i < up.length; i += 4) { let t = (up[i] / 255 - 0.22) / 0.4; t = t < 0 ? 0 : t > 1 ? 1 : t; up[i] = Math.round(t * t * (3 - 2 * t) * 255); up[i - 1] = up[i - 2] = up[i - 3] = 255; }
            ux.putImageData(ud, 0, 0); fin = u;
          }
          res(fin.toDataURL('image/png'));
        } catch { res(url); }
      };
      im.src = url;
    });
  }
  /* Convert every client logo on the page, including ones uploaded before this feature existed. */
  const logoCache = new Map();
  function whitenLogos() {
    $$('#app .client img').forEach(async img => {
      const key = img.getAttribute('src'); if (!logoCache.has(key)) logoCache.set(key, whiteLogo(key));
      const out = await logoCache.get(key);
      if (out !== key) img.src = out; else img.classList.add('logo-raw');
      img.classList.add('logo-ready');
    });
  }
  function readImage(file) {
    return new Promise((res, rej) => {
      const fr = new FileReader(); fr.onerror = rej;
      fr.onload = () => {
        if (/svg|gif/.test(file.type)) return res(fr.result);
        const im = new Image(); im.onerror = rej;
        im.onload = () => { const s = Math.min(1, 1600 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); let u = c.toDataURL('image/webp', 0.85); if (!u.startsWith('data:image/webp')) u = c.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.85); res(u); };
        im.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }
  function sectionForm(i) {
    const s = C.sections[i]; begin();
    const el = panel(LABELS[s.type] + ' settings', `<label>Name in the top menu (empty keeps it out of the menu)<input id="ed-s-nav" value="${esc(s.nav)}"></label>
      <label>Background<select id="ed-s-bg"><option value="">Page background</option><option value="tint" ${s.bg === 'tint' ? 'selected' : ''}>Raised panel</option></select></label>
      ${s.type === 'store' ? `<label>Products shown on the home page (newest first)<input id="ed-s-lim" type="number" min="1" max="60" value="${+s.limit || 6}"></label><p>The rest appear on the full store page, behind the "See all products" button. Drag order is newest first: new products are added at the front.</p>` : ''}
      ${s.type === 'hero' ? `<label>Where the small line under the buttons links to<input id="ed-s-note" value="${esc(s.noteHref !== undefined ? s.noteHref : '#contact')}" placeholder="#contact"></label><p>Use #contact to jump to your contact section, or tel:+18036067435 to start a call. Leave empty for plain text.</p>` : ''}
      ${s.tracks ? `<label>Tabs, separated by commas<input id="ed-s-tr" value="${esc(s.tracks.map(t => t.name).join(', '))}"></label><p>Rename a tab here, add a new one at the end, or remove one. Each tab has its own steps.</p>` : ''}
      ${s.periods ? `<label>Billing options, separated by commas<input id="ed-s-per" value="${esc(s.periods.join(', '))}"></label><p>Each plan keeps one price per option. Switch the toggle on the page, then click the price to change it.</p>` : ''}`);
    bind(el, () => { s.nav = $('#ed-s-nav').value; s.bg = $('#ed-s-bg').value; if (s.type === 'hero') s.noteHref = $('#ed-s-note').value.trim(); if (s.type === 'store') s.limit = Math.max(1, +$('#ed-s-lim').value || 6);
      if (s.tracks) { const names = $('#ed-s-tr').value.split(',').map(x => x.trim()).filter(Boolean); if (names.length) s.tracks = names.map((nm, i) => Object.assign(s.tracks[i] || { intro: '', items: [{ when: 'Step 1', title: 'First step', body: 'Describe what happens here.' }] }, { name: nm })); } if (s.periods) { s.periods = $('#ed-s-per').value.split(',').map(x => x.trim()).filter(Boolean); s.items.forEach(it => { while (it.prices.length < s.periods.length) it.prices.push(it.prices.at(-1) || '$0'); }); } });
  }
  function themeForm() {
    const t = C.theme; begin();
    const opt = (arr, v) => arr.map(f => `<option ${f === v ? 'selected' : ''}>${f}</option>`).join('');
    const el = panel('Look and fonts', `<label>Style<select id="ed-t-mode"><option value="dark">Dark stage</option><option value="light" ${t.mode === 'light' ? 'selected' : ''}>Light</option></select></label>
      <div class="ed-row"><label>Main color<input id="ed-t-a" type="color" value="${esc(t.accent)}"></label><label>Second color<input id="ed-t-b" type="color" value="${esc(t.accent2)}"></label></div>
      <label>Heading font<select id="ed-t-d">${opt(DISPLAY_FONTS, t.display)}</select></label><label>Text font<select id="ed-t-f">${opt(BODY_FONTS, t.body)}</select></label>
      <label>Corner roundness<input id="ed-t-r" type="range" min="0" max="28" value="${+t.radius}"></label>
      <div class="ed-row"><button class="ed-b" data-act="logo">Upload logo</button></div>
      <label>Form email key (from web3forms.com)<input id="ed-t-key" value="${esc(C.meta.formKey || '')}" autocomplete="off" placeholder="Paste the access key emailed to you"></label><p>With a key saved, plan sign-ups and project requests use the site's own forms and are emailed to the address you registered. Without one, the buttons use their backup links.</p>
      <label>Site title (browser tab and search results)<input id="ed-t-title" value="${esc(C.meta.title)}"></label><label>Search description<textarea id="ed-t-desc" rows="3">${esc(C.meta.description)}</textarea></label>`);
    bind(el, () => { t.mode = $('#ed-t-mode').value; t.accent = $('#ed-t-a').value; t.accent2 = $('#ed-t-b').value; t.display = $('#ed-t-d').value; t.body = $('#ed-t-f').value; t.radius = +$('#ed-t-r').value; C.meta.formKey = $('#ed-t-key').value.trim(); C.meta.title = $('#ed-t-title').value; C.meta.description = $('#ed-t-desc').value; });
  }
  function addForm(i) {
    panel('Add a section', `<p>The new section appears where you clicked. Every part of it is editable.</p><div class="ed-row">${Object.keys(LABELS).map(t => `<button class="ed-b" data-act="add-type" data-type="${t}" data-i="${i}">${LABELS[t]}</button>`).join('')}</div>`);
  }
  function backupForm() {
    const el = panel('Backup', `<p>A backup is one file with all of your text, links, settings and uploaded images.</p><div class="ed-row"><button class="ed-b" data-act="dl">Download backup</button><button class="ed-b" data-act="copy">Copy backup</button></div>
      <label>Restore from a backup file<input id="ed-b-file" type="file" accept=".json,application/json"></label><div class="ed-row"><button class="ed-b" data-act="discard">Discard draft, go back to the published site</button></div>`);
    $('#ed-b-file').addEventListener('change', async e => { try { const j = JSON.parse(await e.target.files[0].text()); if (!Array.isArray(j.sections)) throw 0; mutate(() => (C = j)); closePanel(); toast('Backup restored.'); } catch { toast('That file is not a site backup.'); } });
  }
  function publishForm() {
    const g = lsGet(GHKEY) || {};
    if (FB && !g.token) loadAdmin().then(A => A.getSite()).then(sv => { if (sv && sv.token && $('#ed-g-token') && !$('#ed-g-token').value) { $('#ed-g-owner').value = sv.owner || ''; $('#ed-g-repo').value = sv.repo || ''; $('#ed-g-branch').value = sv.branch || 'main'; $('#ed-g-token').value = sv.token; } }).catch(() => { });
    panel('Publish', `<p>Publishing saves your changes to your GitHub repository. Your host then updates the live site in about a minute.</p>
      <div class="ed-row"><label>GitHub username<input id="ed-g-owner" value="${esc(g.owner)}" autocomplete="off"></label><label>Repository<input id="ed-g-repo" value="${esc(g.repo)}" autocomplete="off"></label></div>
      <div class="ed-row"><label>Branch<input id="ed-g-branch" value="${esc(g.branch || 'main')}"></label><label>Access token<input id="ed-g-token" type="password" value="${esc(g.token)}" autocomplete="off"></label></div>
      <label style="display:flex;grid-auto-flow:column;gap:8px;align-items:center"><input id="ed-g-keep" type="checkbox" ${g.token ? 'checked' : ''}> Remember on this device</label>
      <button class="ed-b ed-go" data-act="publish-go">Publish</button><div class="ed-log" id="ed-g-log" hidden></div>
      <p>The token stays in this browser and is only sent to GitHub. README.md explains how to create one.</p>`);
  }
  async function publish() {
    const cfg = { owner: $('#ed-g-owner').value.trim(), repo: $('#ed-g-repo').value.trim(), branch: $('#ed-g-branch').value.trim() || 'main', token: $('#ed-g-token').value.trim() };
    const logEl = $('#ed-g-log'); logEl.hidden = false; logEl.textContent = '';
    const log = m => (logEl.textContent += m + '\n');
    if (!cfg.owner || !cfg.repo || !cfg.token) return log('Fill in your GitHub username, repository and access token first.');
    lsSet(GHKEY, $('#ed-g-keep').checked ? cfg : { owner: cfg.owner, repo: cfg.repo, branch: cfg.branch });
    const api = `https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/`;
    const H = { Authorization: 'Bearer ' + cfg.token, Accept: 'application/vnd.github+json' };
    const put = async (path, b64, msg, skipIfExists) => {
      let sha; const g = await fetch(`${api}${path}?ref=${encodeURIComponent(cfg.branch)}`, { headers: H, cache: 'no-store' });
      if (g.ok) { if (skipIfExists) return; sha = (await g.json()).sha; }
      else if (g.status !== 404) throw new Error(`GitHub answered ${g.status}. Check the username, repository name and token.`);
      const r = await fetch(api + path, { method: 'PUT', headers: H, body: JSON.stringify({ message: msg, content: b64, branch: cfg.branch, sha }) });
      if (!r.ok) throw new Error(`Could not save ${path} (${r.status}). ${(await r.json().catch(() => ({}))).message || ''}`);
    };
    const hash = s => { let h = 5381; for (let i = 0; i < s.length; i += Math.max(1, s.length >> 12)) h = (h * 33 ^ s.charCodeAt(i)) >>> 0; return h.toString(36) + s.length.toString(36); };
    try {
      const out = clone(C); let n = 0;
      const walk = async o => { for (const k of Object.keys(o)) { const v = o[k]; if (typeof v === 'string' && v.startsWith('data:image/')) { const m = v.match(/^data:image\/([a-z0-9]+)[^;]*;base64,(.+)$/i); if (!m) continue; const name = `media/${hash(m[2])}.${m[1].replace('jpeg', 'jpg')}`; log('Uploading image ' + (++n)); await put(name, m[2], 'Add image', true); o[k] = name; } else if (v && typeof v === 'object') await walk(v); } };
      await walk(out);
      log('Saving content');
      let final = out, sha;
      const cur = await fetch(`${api}content.json?ref=${encodeURIComponent(cfg.branch)}`, { headers: H, cache: 'no-store' });
      if (cur.ok) { const j = await cur.json(); sha = j.sha; try { const remote = JSON.parse(decodeURIComponent(escape(atob(String(j.content || '').replace(/\s/g, ''))))); if (Array.isArray(remote.sections) && !eq(remote, published)) { final = merge3(published, out, remote); log('Combined your edits with changes made elsewhere since you opened the editor.'); } } catch { } }
      else if (cur.status !== 404) throw new Error(`GitHub answered ${cur.status}. Check the username, repository name and token.`);
      const pr = await fetch(api + 'content.json', { method: 'PUT', headers: H, body: JSON.stringify({ message: 'Update site content', content: btoa(unescape(encodeURIComponent(JSON.stringify(final, null, 1)))), branch: cfg.branch, sha }) });
      if (!pr.ok) throw new Error(pr.status === 409 ? 'The site changed while you were publishing. Press Publish again.' : `Could not save the content (${pr.status}). ${(await pr.json().catch(() => ({}))).message || ''}`);
      published = cp(final); C = cp(final); hasDraft = false; lsSet(KEY, null); lsSet(BASEKEY, null); render();
      log('Saved. Going live now, usually within a minute or two…'); toast('Saved. Going live…');
      (async () => { for (let i = 0; i < 60; i++) { await new Promise(r => setTimeout(r, 5000)); try { const r = await fetch('content.json?t=' + Date.now(), { cache: 'no-store' }); if (r.ok && eq(await r.json(), final)) { if ($('#ed-g-log')) log('Live now. Visitors see your changes.'); toast('Your changes are live.'); return; } } catch { } } if ($('#ed-g-log')) log('Still not showing after 5 minutes. The save went through; the host is slow. Check again shortly.'); })();
      if (FB) loadAdmin().then(A => A.saveSite(cfg)).then(() => log('Publishing details saved to your admin account, so any device you sign in on can publish.')).catch(() => { });
    } catch (e) {
      log(e instanceof TypeError ? 'Could not reach GitHub from here. Publishing works once the site is on your own hosting, not inside this preview.' : e.message);
    }
  }
  const backupText = () => JSON.stringify(C, null, 1);

  const arr = d => get(d.p), idx = d => +d.i;
  const move = (a, i, j) => { if (j < 0 || j >= a.length) return; a.splice(j, 0, a.splice(i, 1)[0]); };
  const NEWPRODUCT = { title: 'New product', category: 'Graphics', desc: 'Describe it in one or two lines.', price: '$0', badge: 'New', draft: true, image: '', buy: { label: 'Buy and download', href: '' }, preview: { label: 'Preview', href: '' }, details: '', includes: [], gallery: [] };
  const blankItem = p => { const a = get(p); if (p.endsWith('.gallery')) return { image: '', caption: 'Add a caption' }; if (a.length) return clone(a.at(-1)); const [, si, key] = p.split('.'); const t = C.sections[si]?.type; const src = [...DEFAULT.sections, ...Object.values(BLANKS)].find(s => s.type === t); return clone(src?.[key]?.[0] ?? { label: 'Link', href: '' }); };
  const acts = {
    menu: () => $('#nav-links').classList.toggle('open'),
    filter: d => { ui.filter = d.v; render(); },
    billing: d => { ui.billing = +d.v; render(); },
    plan: d => { ui.plan = +d.v; render(); },
    'edit-on': () => tryEnter(), 'edit-off': () => leave(), 'pub-on': () => publicView(true), 'pub-off': () => publicView(false),
    undo: () => { if (!undo.length) return; redo.push(JSON.stringify(C)); C = JSON.parse(undo.pop()); save(); render(); },
    redo: () => { if (!redo.length) return; undo.push(JSON.stringify(C)); C = JSON.parse(redo.pop()); save(); render(); },
    theme: themeForm, backup: backupForm, publish: publishForm, 'publish-go': publish, close: closePanel,
    logo: () => imageForm('brand.logo'),
    addsec: d => addForm(+d.i),
    'add-type': d => { const src = BLANKS[d.type] || DEFAULT.sections.find(s => s.type === d.type); mutate(() => C.sections.splice(+d.i, 0, Object.assign(clone(src), { nav: '', hidden: false }))); closePanel(); toast(LABELS[d.type] + ' added.'); },
    'sec-up': d => mutate(() => move(C.sections, idx(d), idx(d) - 1)),
    'sec-down': d => mutate(() => move(C.sections, idx(d), idx(d) + 1)),
    'sec-hide': d => mutate(() => (C.sections[idx(d)].hidden = !C.sections[idx(d)].hidden)),
    'sec-copy': d => mutate(() => C.sections.splice(idx(d) + 1, 0, Object.assign(clone(C.sections[idx(d)]), { nav: '' }))),
    'sec-del': d => { mutate(() => C.sections.splice(idx(d), 1)); toast('Section deleted. Undo brings it back.'); },
    'sec-set': d => sectionForm(idx(d)),
    'item-up': d => mutate(() => move(arr(d), idx(d), idx(d) - 1)),
    'item-down': d => mutate(() => move(arr(d), idx(d), idx(d) + 1)),
    'item-copy': d => mutate(() => arr(d).splice(idx(d) + 1, 0, clone(arr(d)[idx(d)]))),
    'item-del': d => mutate(() => arr(d).splice(idx(d), 1)),
    'item-draft': d => mutate(() => (arr(d)[idx(d)].draft = !arr(d)[idx(d)].draft)),
    's-del': d => mutate(() => arr(d).splice(idx(d), 1)),
    'pp-clear': d => mutate(() => { const it = get(d.p); if (d.k === 'about') it.details = ''; if (d.k === 'includes') it.includes = []; if (d.k === 'gallery') it.gallery = []; if (d.k === 'video') it.preview.href = ''; }),
    'item-star': d => mutate(() => (arr(d)[idx(d)].featured = !arr(d)[idx(d)].featured)),
    'item-add': d => { const m = d.p.match(/^sections\.(\d+)\.items$/); if (m && C.sections[m[1]].type === 'store') { mutate(() => arr(d).unshift(clone(NEWPRODUCT))); toast('New product added at the front. Click Details to build its page.'); } else mutate(() => arr(d).push(blankItem(d.p))); },
    's-add': d => { mutate(() => arr(d).push('')); focusPath(`${d.p}.${arr(d).length - 1}`); },
    'img-clear': d => { mutate(() => set(d.p, '')); closePanel(); },
    discard: () => { lsSet(KEY, null); lsSet(BASEKEY, null); hasDraft = false; C = clone(published); undo = []; redo = []; closePanel(); render(); toast('Draft discarded.'); },
    dl: () => { try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([backupText()], { type: 'application/json' })); a.download = 'worshipflow-backup.json'; a.click(); } catch { toast('Download is blocked here. Use Copy backup instead.'); } },
    copy: async () => { try { await navigator.clipboard.writeText(backupText()); toast('Backup copied.'); } catch { toast('Copy was blocked by the browser.'); } }
  };
  const focusPath = p => { const el = $(`#app [data-t="${p}"]`); if (el) { el.focus(); getSelection().selectAllChildren(el); getSelection().collapseToEnd(); } };
  async function tryEnter() {
    if (pubView) { if (work) C = work; work = null; pubView = false; try { sessionStorage.removeItem('wf-pub'); } catch { } }
    if (FB) { try { const A = await loadAdmin(); if (!(await A.user())) { if (location.hash !== '#admin') location.hash = '#admin'; else render(); toast('Sign in to open the editor.'); return; } } catch { toast('The sign-in service could not load. Reload to try again.'); return; } }
    if (location.hash === '#admin') history.replaceState(null, '', '#edit');
    enter();
  }
  function enter() { edit = true; try { sessionStorage.setItem('wf-edit', '1'); } catch { } closePanel(); render(); if (ui.page === 'home' && location.hash !== '#edit') history.replaceState(null, '', '#edit'); }
  function leave() { edit = false; try { sessionStorage.removeItem('wf-edit'); } catch { } closePanel(); render(); if (location.hash === '#edit') history.replaceState(null, '', location.pathname + location.search); }

  document.addEventListener('click', e => {
    const a = e.target.closest('[data-act]');
    if (a) { e.preventDefault(); return acts[a.dataset.act]?.(a.dataset, a); }
    if (edit && !e.target.closest('.ed-panel,.ed-bar')) {
      const im = e.target.closest('[data-pic],[data-img]'); if (im) { e.preventDefault(); return imageForm(im.dataset.pic || im.dataset.img); }
      const l = e.target.closest('a[data-l]'); if (l) { e.preventDefault(); return linkForm(l.dataset.l); }
      const an = e.target.closest('a'); if (an && (!(an.getAttribute('href') || '').startsWith('#') || an.classList.contains('brand'))) e.preventDefault();
      return;
    }
    const sl = e.target.closest('[data-live]'); if (sl) setLive(+sl.dataset.live, true);
    const tl = e.target.closest('#app a, #app .chip, #app .toggle button');
    if (tl && !tl.closest('#admin-root')) { const dl = tl.dataset.l || '', pc = tl.closest('.product, .pp-info'), pt = pc ? (pc.querySelector('h3, h1')?.textContent || '').trim() : ''; const txt = tl.textContent.trim();
      if (dl.endsWith('.buy')) track('buy', pt); else if (dl.endsWith('.preview')) track('preview', 'Preview: ' + pt); else if (txt === 'Details' && pt) track('details', 'Details: ' + pt); else if (txt) track('click', (tl.closest('.nav') ? 'Menu: ' : tl.closest('.foot') ? 'Footer: ' : '') + txt); }
    if (e.target.closest('.nav-links a')) $('#nav-links').classList.remove('open');
  });
  document.addEventListener('keydown', e => {
    const el = e.target.closest?.('#app [data-t]');
    if (!edit) { if (e.key === 'Enter' && e.target.matches?.('[data-live]')) setLive(+e.target.dataset.live, true); return; }
    if (!el) return;
    const sl = el.closest('[data-slist]')?.dataset.slist;
    if (e.key === 'Enter' && sl) { e.preventDefault(); const i = +el.dataset.t.split('.').pop(); mutate(() => get(sl).splice(i + 1, 0, '')); focusPath(`${sl}.${i + 1}`); }
    else if (e.key === 'Enter' && !el.hasAttribute('data-ml')) { e.preventDefault(); el.blur(); }
    else if (e.key === 'Backspace' && sl && !el.textContent) { e.preventDefault(); const i = +el.dataset.t.split('.').pop(); mutate(() => get(sl).splice(i, 1)); focusPath(`${sl}.${Math.max(0, i - 1)}`); }
  });
  document.addEventListener('input', e => { const el = e.target.closest?.('#app [data-t]'); if (!edit || !el) return; set(el.dataset.t, el.innerText.replace(/ /g, ' ').replace(/\n+$/, '')); save(); });
  document.addEventListener('focusin', e => { if (edit && e.target.closest?.('#app [data-t]')) pre = JSON.stringify(C); });
  document.addEventListener('focusout', e => { if (edit && pre && e.target.closest?.('#app [data-t]') && pre !== JSON.stringify(C)) { undo.push(pre); redo = []; chrome(); } pre = null; });
  document.addEventListener('paste', e => { if (!edit || !e.target.closest?.('#app [data-t]')) return; e.preventDefault(); document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain')); });
  document.addEventListener('submit', async e => {
    const f = e.target.closest?.('.wf-form'); if (!f) return; e.preventDefault();
    const msg = f.querySelector('.form-msg'), btn = f.querySelector('button[type=submit]'), d = Object.fromEntries(new FormData(f).entries());
    if (d.botcheck) return; delete d.botcheck;
    const plan = f.dataset.plan, kind = f.dataset.form;
    const body = Object.assign({ access_key: C.meta.formKey, subject: kind === 'signup' ? `New ${plan} plan sign-up: ${d.church}` : `New project request: ${d.service} (${d.church})`, from_name: 'Worship Flow website', form: kind === 'signup' ? `${plan} plan sign-up` : 'Project request' }, kind === 'signup' ? { plan } : {}, d);
    btn.disabled = true; msg.textContent = 'Sending…';
    try {
      const r = await fetch('https://api.web3forms.com/submit', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) }), j = await r.json().catch(() => ({}));
      if (!r.ok || !j.success) throw new Error(j.message || 'send failed');
      track('signup', kind === 'signup' ? plan + ' plan' : 'Project request');
      f.innerHTML = `<div class="form-done"><h3>${kind === 'signup' ? 'Thanks, your sign-up is in.' : 'Thanks, your request is in.'}</h3><p>We'll reply to ${esc(d.email)} soon. If it's urgent, call or text using the number in the contact section.</p><a class="btn" href="#top">Back to the site</a></div>`;
    } catch { btn.disabled = false; msg.textContent = 'That did not send. Check your connection and try again, or call or text us instead.'; }
  });
  addEventListener('hashchange', () => {
    if (location.hash === '#edit') { if (!edit) tryEnter(); return; }
    const was = ui.page; render(); trackView();
    if (ui.page !== 'home') scrollTo(0, 0); else if (was !== 'home') { const el = document.getElementById(location.hash.slice(1)); el ? el.scrollIntoView() : scrollTo(0, 0); }
  });

  (async () => {
    let pub = null;
    try { const r = await Promise.race([fetch('content.json', { cache: 'no-store' }), new Promise((_, no) => setTimeout(no, 2500))]); if (r.ok) pub = await r.json(); } catch { }
    published = pub && Array.isArray(pub.sections) ? pub : clone(DEFAULT);
    const d = lsGet(KEY);
    if (d && Array.isArray(d.sections)) {
      const base = lsGet(BASEKEY); C = d; hasDraft = true;
      if (base && Array.isArray(base.sections) && !eq(base, published)) { C = merge3(base, d, published); lsSet(BASEKEY, published); lsSet(KEY, C); }
      else if (!base) lsSet(BASEKEY, published);
    } else C = clone(published);
    let want = location.hash === '#edit'; try { want = want || sessionStorage.getItem('wf-edit') === '1'; } catch { }
    render(); trackView();
    let wantPub = false; try { wantPub = sessionStorage.getItem('wf-pub') === '1'; } catch { }
    if (wantPub && location.hash !== '#admin') publicView(true); else if (want) tryEnter();
  })();
})();
