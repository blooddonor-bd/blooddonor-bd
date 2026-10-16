/* Centralised Bangla/English system. Text lives ONLY in i18n/bn.json and i18n/en.json. */
const I18n = {
  lang: 'bn', dict: { bn: {}, en: {} },
  async init() {
    const saved = localStorage.getItem('lang');
    this.lang = saved === 'en' || saved === 'bn' ? saved : 'bn'; // first-time visitors: Bangla
    await Promise.all(['bn', 'en'].map(async l => {
      const r = await fetch(`i18n/${l}.json?v=1`); this.dict[l] = await r.json();
    }));
    this.apply();
  },
  has(k) { return k in this.dict[this.lang] || k in this.dict.en; },
  t(k, v) {
    let s = this.dict[this.lang][k] ?? this.dict.en[k] ?? k;
    if (v) s = s.replace(/\{(\w+)\}/g, (_, n) => (v[n] ?? ''));
    return s;
  },
  locale() { return this.lang === 'bn' ? 'bn-BD' : 'en-GB'; },
  num(n, o) { return new Intl.NumberFormat(this.locale(), o).format(Number(n) || 0); },
  _d(s) { return !s ? null : new Date(/^\d{4}-\d{2}-\d{2}$/.test(s) ? s + 'T00:00:00+06:00' : s); },
  date(s) { const d = this._d(s); return d ? new Intl.DateTimeFormat(this.locale(), { dateStyle: 'medium', timeZone: 'Asia/Dhaka' }).format(d) : '—'; },
  dateTime(s) { const d = this._d(s); return d ? new Intl.DateTimeFormat(this.locale(), { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Dhaka' }).format(d) : '—'; },
  month(ym) { return new Intl.DateTimeFormat(this.locale(), { month: 'short', year: 'numeric', timeZone: 'Asia/Dhaka' }).format(new Date(ym + '-15T00:00:00+06:00')); },
  /** Updates every static [data-i18n*] node in place (header, footer, switcher). */
  apply(root = document) {
    document.documentElement.lang = this.lang;
    root.querySelectorAll('[data-i18n]').forEach(e => { e.textContent = this.t(e.dataset.i18n); });
    root.querySelectorAll('[data-i18n-placeholder]').forEach(e => { e.placeholder = this.t(e.dataset.i18nPlaceholder); });
    root.querySelectorAll('[data-i18n-aria]').forEach(e => { e.setAttribute('aria-label', this.t(e.dataset.i18nAria)); });
    root.querySelectorAll('[data-lang]').forEach(b => { const on = b.dataset.lang === this.lang; b.classList.toggle('active', on); b.setAttribute('aria-pressed', on); });
  },
  /** Switch language without reloading: nothing is cleared, the page is re-drawn with form values restored. */
  async set(l, { persist = true } = {}) {
    if (l !== 'bn' && l !== 'en') return;
    if (l === this.lang && localStorage.getItem('lang') === l) return;
    this.lang = l; localStorage.setItem('lang', l);
    this.apply();
    if (persist && Api.token) Api.put('/me/lang', { lang: l }).catch(() => {});
    if (App.user) App.user.lang = l;
    App.renderChrome();
    App.navigate({ preserve: true });
  }
};
const t = (k, v) => I18n.t(k, v);
const num = n => I18n.num(n);
