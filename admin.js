/* Admin: sign-in, visitor statistics, and the door to the editor. Loaded only when needed. */
(() => {
  const cfg = window.WF_FIREBASE, V = 'https://www.gstatic.com/firebasejs/10.12.2/';
  let ready;
  const load = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load ' + src)); document.head.append(s); });
  const init = () => (ready = ready || (async () => {
    for (const f of ['firebase-app-compat.js', 'firebase-auth-compat.js', 'firebase-firestore-compat.js']) await load(V + f);
    firebase.initializeApp(cfg); return firebase;
  })());
  const user = async () => { const fb = await init(); return new Promise(r => { const off = fb.auth().onAuthStateChanged(u => { off(); r(u); }); }); };
  const flag = on => { try { on ? localStorage.setItem('wf-admin', '1') : localStorage.removeItem('wf-admin'); } catch { } };
  const site = async () => (await init()).firestore().collection('private').doc('site');
  const getSite = async () => { try { const d = await (await site()).get(); return d.exists ? d.data() : null; } catch { return null; } };
  const saveSite = async data => (await site()).set(data, { merge: true });
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const day = t => new Date(t).toISOString().slice(0, 10);
  const count = (list, key) => { const m = new Map(); list.forEach(e => m.set(e[key] || '(none)', (m.get(e[key] || '(none)') || 0) + 1)); return [...m].sort((a, b) => b[1] - a[1]); };
  const table = (title, rows, head, empty) => `<div class="ad-card"><h3>${title}</h3>${rows.length ? `<table class="ad-table"><thead><tr><th>${head[0]}</th><th>${head[1]}</th></tr></thead><tbody>${rows.slice(0, 12).map(r => `<tr><td>${esc(r[0])}</td><td>${r[1]}</td></tr>`).join('')}</tbody></table>` : `<p class="ad-muted">${empty}</p>`}</div>`;

  async function mount(el, api) {
    el.innerHTML = '<p class="ad-muted">Loading…</p>';
    let u; try { u = await user(); } catch (e) { el.innerHTML = `<p class="ad-muted">The admin tools could not load. Check your connection and reload. (${esc(e.message)})</p>`; return; }
    flag(!!u);
    if (!u) return login(el, api);
    dashboard(el, api, u, 30);
  }

  function login(el, api) {
    el.innerHTML = `<form class="ad-login" id="ad-form"><h1 class="ad-h">Admin sign-in</h1><p class="ad-muted">For the site owner. Visitors don't need an account.</p>
      <label>Email<input id="ad-email" type="email" autocomplete="username" required></label>
      <label>Password<input id="ad-pass" type="password" autocomplete="current-password" required></label>
      <button class="btn btn-primary" type="submit">Sign in</button><button class="textlink ad-link" type="button" id="ad-reset">Email me a password reset link</button>
      <p class="ad-msg" id="ad-msg" role="status"></p></form>`;
    const msg = t => (el.querySelector('#ad-msg').textContent = t);
    el.querySelector('#ad-form').addEventListener('submit', async e => {
      e.preventDefault(); msg('Signing in…');
      try { await (await init()).auth().signInWithEmailAndPassword(el.querySelector('#ad-email').value.trim(), el.querySelector('#ad-pass').value); mount(el, api); }
      catch (err) { msg(/network/i.test(err.code || '') ? 'Could not reach the sign-in service. Check your connection.' : 'That email and password did not match. Try again or reset the password.'); }
    });
    el.querySelector('#ad-reset').addEventListener('click', async () => {
      const em = el.querySelector('#ad-email').value.trim(); if (!em) return msg('Type your email above first.');
      try { await (await init()).auth().sendPasswordResetEmail(em); } catch { }
      msg('If that email has an admin account, a reset link is on its way.');
    });
  }

  async function dashboard(el, api, u, days) {
    el.innerHTML = `<div class="ad-top"><div><h1 class="ad-h">Site admin</h1><p class="ad-muted">Signed in as ${esc(u.email)}</p></div>
      <div class="btns"><button class="btn btn-primary" id="ad-edit">Open the editor</button><button class="btn" id="ad-pub">See the public site</button><button class="btn" id="ad-out">Sign out</button></div></div>
      <p class="ad-muted ad-note">${api.hasDraft() ? 'You have unpublished changes on this device. "See the public site" shows the site without them, exactly as visitors see it now.' : '"See the public site" shows the site exactly as visitors see it now.'}</p>
      <div class="ad-filter" role="group" aria-label="Time range">${[7, 30, 90].map(d => `<button class="chip" data-days="${d}" aria-pressed="${d === days}">Last ${d} days</button>`).join('')}</div>
      <div id="ad-body"><p class="ad-muted">Loading statistics…</p></div>`;
    el.querySelector('#ad-edit').onclick = () => api.edit();
    el.querySelector('#ad-pub').onclick = () => api.publicView();
    el.querySelector('#ad-out').onclick = async () => { await (await init()).auth().signOut(); flag(false); mount(el, api); };
    el.querySelectorAll('[data-days]').forEach(b => (b.onclick = () => dashboard(el, api, u, +b.dataset.days)));
    const body = el.querySelector('#ad-body');
    let ev;
    try {
      const snap = await (await init()).firestore().collection('events').where('day', '>=', day(Date.now() - (days - 1) * 864e5)).orderBy('day').limit(20000).get();
      ev = snap.docs.map(d => d.data());
    } catch (e) {
      body.innerHTML = `<p class="ad-muted">${e.code === 'permission-denied' ? 'This account is signed in but is not set as the site admin, so it cannot read statistics.' : 'Statistics could not be loaded. Reload to try again.'}</p>`; return;
    }
    const views = ev.filter(e => e.type === 'view'), buys = ev.filter(e => e.type === 'buy'), prods = ev.filter(e => e.type === 'product'), clicks = ev.filter(e => e.type === 'click' || e.type === 'preview' || e.type === 'details');
    const visits = new Set(views.map(e => e.sid)).size;
    const tile = (n, label, note) => `<div class="ad-tile"><b>${n.toLocaleString()}</b><span>${label}</span><small>${note}</small></div>`;
    const series = []; for (let i = days - 1; i >= 0; i--) { const d = day(Date.now() - i * 864e5); series.push([d, views.filter(e => e.day === d).length]); }
    const max = Math.max(1, ...series.map(s => s[1]));
    const fmt = d => new Date(d + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const pm = new Map(); const row = k => pm.get(k) || pm.set(k, [0, 0]).get(k);
    prods.forEach(e => row(e.label)[0]++); buys.forEach(e => row(e.label)[1]++);
    const prodRows = [...pm].sort((a, b) => b[1][1] - a[1][1] || b[1][0] - a[1][0]);
    body.innerHTML = `
      <div class="ad-tiles">${tile(visits, 'Visits', 'Separate browsing sessions')}${tile(views.length, 'Page views', 'Home, store and product pages')}${tile(prods.length, 'Product page views', 'Someone opened a product')}${tile(buys.length, 'Buy and download clicks', 'Sent to your checkout or file')}</div>
      <div class="ad-card"><h3>Page views per day</h3>${views.length ? `<div class="ad-chart" role="img" aria-label="Page views per day for the last ${days} days">${series.map(s => `<div class="ad-col" tabindex="0"><i style="height:${Math.round(s[1] / max * 100)}%"></i><span class="ad-tip">${fmt(s[0])}: ${s[1]} view${s[1] === 1 ? '' : 's'}</span></div>`).join('')}</div><div class="ad-axis"><span>${fmt(series[0][0])}</span><span>Busiest day: ${max}</span><span>${fmt(series.at(-1)[0])}</span></div>` : '<p class="ad-muted">No visits recorded in this period yet. Your own visits are not counted while you are signed in.</p>'}</div>
      <div class="ad-grid">
        <div class="ad-card"><h3>Products</h3>${prodRows.length ? `<table class="ad-table"><thead><tr><th>Product</th><th>Page views</th><th>Buy clicks</th></tr></thead><tbody>${prodRows.slice(0, 20).map(r => `<tr><td>${esc(r[0])}</td><td>${r[1][0]}</td><td>${r[1][1]}</td></tr>`).join('')}</tbody></table>` : '<p class="ad-muted">No product activity yet.</p>'}</div>
        ${table('Buttons clicked', count(clicks, 'label'), ['Button', 'Clicks'], 'No button clicks yet.')}
        ${table('Pages', count(views, 'page'), ['Page', 'Views'], 'No page views yet.')}
        ${table('Where visitors came from', count(views.filter(e => e.ref), 'ref'), ['Site', 'Views'], 'No outside referrals yet. Direct visits and typed addresses have no source.')}
        ${table('Devices', count(views, 'dev'), ['Device', 'Views'], 'No page views yet.')}
      </div>
      <p class="ad-muted">Buy clicks count people sent to your checkout. Completed sales and file downloads are reported by the checkout service itself. No cookies are used and no personal details are stored.</p>`;
  }

  window.WF_ADMIN = { user, mount, getSite, saveSite };
})();
