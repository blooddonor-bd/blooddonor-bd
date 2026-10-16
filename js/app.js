const Pages = {}, Acts = {}, Forms = {}, Changes = {};
const ROUTES = [
  ['/', 'home'], ['/donors', 'donors'], ['/donors/(\\d+)', 'donor'], ['/directory', 'directory'],
  ['/requests', 'requests'], ['/requests/new', 'requestNew', { auth: true }], ['/requests/(\\d+)', 'request'],
  ['/login', 'login'], ['/register', 'register'], ['/forgot', 'forgot'], ['/reset', 'reset'],
  ['/dashboard', 'dashboard', { auth: true }], ['/requester', 'requester', { auth: true }], ['/admin', 'admin', { admin: true }],
  ['/certificate/(\\d+)', 'certificate', { auth: true }],
  ['/contact', 'contact'], ['/faq', 'faq'], ['/privacy', 'privacy'], ['/terms', 'terms'], ['/help', 'help']
];

/* Keeps what the user typed across a language re-render (language switching must not lose form data). */
const Snap = {
  take(root) {
    const s = { v: {}, focus: null };
    $$('input,select,textarea', root).forEach(e => {
      const k = e.id || e.name; if (!k || e.type === 'file') return;
      s.v[k] = e.type === 'checkbox' || e.type === 'radio' ? e.checked : e.value;
    });
    const a = document.activeElement;
    if (a && root.contains(a) && a.id) s.focus = { id: a.id, start: a.selectionStart, end: a.selectionEnd };
    return s;
  },
  restore(root, s) {
    $$('input,select,textarea', root).forEach(e => {
      const k = e.id || e.name; if (!k || !(k in s.v) || e.type === 'file') return;
      if (e.type === 'checkbox' || e.type === 'radio') e.checked = s.v[k]; else e.value = s.v[k];
    });
    if (s.focus) { const f = document.getElementById(s.focus.id); if (f) { f.focus({ preventScroll: true }); try { f.setSelectionRange(s.focus.start, s.focus.end); } catch (_) {} } }
  }
};

const App = {
  user: null, rt: 0, cleanups: [], page: null, ctx: null,

  async boot() {
    await I18n.init();
    if (Api.token) {
      try {
        this.user = (await Api.get('/me')).user;
        if (!localStorage.getItem('lang') && this.user.lang !== I18n.lang) { I18n.lang = this.user.lang; localStorage.setItem('lang', I18n.lang); I18n.apply(); }
      } catch (e) { if (e.status === 401) Api.setToken(null); }
    }
    this.renderChrome();
    window.addEventListener('hashchange', () => this.navigate());
    document.addEventListener('click', ev => this.onClick(ev));
    document.addEventListener('submit', ev => this.onSubmit(ev));
    document.addEventListener('change', ev => this.onChange(ev));
    setInterval(() => this.tick(), 30000);
    setInterval(() => this.pollNotif(), 60000);
    await this.navigate();
    this.pollNotif();
  },

  async refreshUser() { this.user = (await Api.get('/me')).user; this.renderChrome(); return this.user; },
  signedOut() { this.user = null; this.renderChrome(); if (this.ctx && this.page && this.page.auth) location.hash = '#/login'; },

  async navigate({ preserve = false, restore = true } = {}) {
    const raw = location.hash.slice(1) || '/', [path, qs] = raw.split('?'), query = new URLSearchParams(qs || '');
    let m = null;
    for (const [re, name, o] of ROUTES) { const r = path.match(new RegExp('^' + re + '$')); if (r) { m = { name, params: r.slice(1), o: o || {} }; break; } }
    const page = m ? Pages[m.name] : Pages.notfound;
    const o = m ? m.o : {};
    if ((o.auth || o.admin) && !this.user) { sessionStorage.setItem('after_login', raw); location.hash = '#/login'; return; }
    if (o.admin && this.user.role !== 'admin') { location.hash = '#/'; return; }
    this.page = { ...page, auth: !!(o.auth || o.admin) };
    this.ctx = { params: m ? m.params : [], query, path };
    await this.draw(preserve, restore);
  },

  async draw(preserve, restore) {
    const token = ++this.rt, view = $('#view'), ctx = this.ctx, page = this.page;
    const snap = preserve && restore ? Snap.take(view) : null, sy = window.scrollY;
    this.cleanups.forEach(f => f()); this.cleanups = [];
    if (!preserve) view.innerHTML = spinner();
    let html;
    try { html = await page.render(ctx); }
    catch (e) { html = `<div class="container py-5"><div class="alert alert-danger d-flex justify-content-between align-items-center"><span>${esc(errMsg(e))}</span><button class="btn btn-sm btn-outline-danger" data-act="reload">${esc(t('common.retry'))}</button></div></div>`; page.mount = null; }
    if (token !== this.rt) return;
    view.innerHTML = html;
    if (snap) Snap.restore(view, snap);
    if (page.mount) page.mount(ctx, view);
    document.title = (page.title ? t(page.title) + ' — ' : '') + t('app.name');
    this.highlightNav(); this.tick();
    if (preserve) window.scrollTo(0, sy); else { window.scrollTo(0, 0); view.focus({ preventScroll: true }); }
  },
  reload() { return this.navigate({ preserve: true, restore: false }); },

  highlightNav() {
    const p = '#' + (location.hash.slice(1).split('?')[0] || '/');
    $$('#mainNav a.nav-link').forEach(a => { const h = a.getAttribute('href'); const on = h === p || (h !== '#/' && p.startsWith(h)); a.classList.toggle('active', on); on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'); });
  },

  renderChrome() {
    const u = this.user, box = $('#authArea');
    if (!u) {
      box.innerHTML = `<a class="btn btn-outline-danger btn-sm" href="#/login">${esc(t('nav.login'))}</a><a class="btn btn-danger btn-sm" href="#/register">${esc(t('nav.register'))}</a>`;
    } else {
      box.innerHTML = `<a class="btn btn-link position-relative nav-bell px-2" href="#/dashboard?tab=notifications" aria-label="${esc(t('nav.notifications'))}">&#128276;<span id="bellBadge" class="badge rounded-pill text-bg-danger position-absolute top-0 start-100 translate-middle d-none"></span></a>
      <div class="dropdown"><button class="btn btn-outline-danger btn-sm dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">${esc((u.full_name || '').split(' ')[0])}</button>
      <ul class="dropdown-menu dropdown-menu-end">
        <li><a class="dropdown-item" href="#/dashboard">${esc(t('nav.dashboard'))}</a></li>
        <li><a class="dropdown-item" href="#/requester">${esc(t('nav.my_requests'))}</a></li>
        ${u.role === 'admin' ? `<li><a class="dropdown-item" href="#/admin">${esc(t('nav.admin'))}</a></li>` : ''}
        <li><hr class="dropdown-divider"></li>
        <li><button class="dropdown-item" data-act="logout">${esc(t('nav.logout'))}</button></li></ul></div>`;
    }
    I18n.apply($('header'));
    this.highlightNav();
  },

  async pollNotif() {
    const b = $('#bellBadge'); if (!this.user) return;
    try { const r = await Api.get('/notifications/count'); const el = $('#bellBadge'); if (el) { el.textContent = r.unread > 99 ? '99+' : I18n.num(r.unread); el.classList.toggle('d-none', !r.unread); } } catch (_) {}
  },

  /* live timers (time since last donation, time until eligible) */
  tick() {
    $$('[data-since]').forEach(e => { e.textContent = span(0, Date.now() - new Date(e.dataset.since)); });
    $$('[data-until]').forEach(e => { const ms = new Date(e.dataset.until) - Date.now(); e.textContent = ms <= 0 ? t('elig.now') : span(0, ms); });
  },

  /* ---- delegated events ---- */
  async onClick(ev) {
    const b = ev.target.closest('[data-act]'); if (b) {
      ev.preventDefault();
      if (b.dataset.busy) return; b.dataset.busy = 1;
      try { await (Acts[b.dataset.act] || (() => {}))(b, ev); } catch (e) { toast(errMsg(e), 'danger'); } finally { delete b.dataset.busy; }
      return;
    }
    const l = ev.target.closest('[data-lang]'); if (l) { I18n.set(l.dataset.lang); const nav = $('#navMenu'); if (nav && nav.classList.contains('show')) bootstrap.Collapse.getOrCreateInstance(nav).hide(); return; }
    if (ev.target.closest('#navMenu a.nav-link')) { const nav = $('#navMenu'); if (nav.classList.contains('show')) bootstrap.Collapse.getOrCreateInstance(nav).hide(); }
  },
  async onSubmit(ev) {
    const f = ev.target.closest('form[data-form]'); if (!f) return;
    ev.preventDefault();
    const btn = $('[type=submit]', f); if (btn) btn.disabled = true;
    try { await Forms[f.dataset.form](f, ev); }
    catch (e) { if (e.code === 'validation' && e.fields) { Form.show(f, e.fields); toast(t('err.validation'), 'danger'); } else toast(errMsg(e), 'danger'); }
    finally { if (btn) btn.disabled = false; }
  },
  async onChange(ev) {
    const el = ev.target.closest('[data-change]'); if (!el) return;
    try { await Changes[el.dataset.change](el, ev); } catch (e) { toast(errMsg(e), 'danger'); }
  }
};

Acts.reload = () => App.reload();
Acts.logout = async () => {
  try { await Api.post('/auth/logout'); } catch (_) {}
  Api.setToken(null); App.user = null; App.renderChrome(); location.hash = '#/'; toast(t('msg.logged_out'));
};

Pages.notfound = { title: 'common.not_found', async render() { return `<div class="container py-5 text-center"><h1 class="display-5">404</h1><p>${esc(t('common.not_found'))}</p><a class="btn btn-danger" href="#/">${esc(t('nav.home'))}</a></div>`; } };

document.addEventListener('DOMContentLoaded', () => App.boot());
