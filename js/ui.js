const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const BLOOD = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const AVAIL = ['available', 'unavailable', 'temporarily_unavailable'];
const REQ_STATUS = ['pending', 'donor_found', 'fulfilled', 'cancelled'];
const COMPONENTS = ['whole_blood', 'plasma', 'platelets', 'red_cells'];

const distName = k => { const d = DISTRICTS.find(x => x[0] === k); return d ? (I18n.lang === 'bn' ? d[1] : d[2]) : (k || ''); };
const opt = (v, label, sel) => `<option value="${esc(v)}"${sel ? ' selected' : ''}>${esc(label)}</option>`;
const bloodOpts = (sel, all) => opt('', t(all ? 'common.all' : 'common.select')) + BLOOD.map(b => opt(b, b, b === sel)).join('');
const distOpts = (sel, all) => opt('', t(all ? 'common.all' : 'common.select')) +
  [...DISTRICTS].sort((a, b) => distName(a[0]).localeCompare(distName(b[0]), I18n.locale())).map(d => opt(d[0], distName(d[0]), d[0] === sel)).join('');
const enumOpts = (prefix, list, sel, all) => (all ? opt('', t('common.all')) : '') + list.map(v => opt(v, t(prefix + v), v === sel)).join('');

const bloodBadge = g => `<span class="blood-badge" aria-label="${esc(t('common.blood_group'))} ${esc(g)}">${esc(g)}</span>`;
const STATUS_CLASS = { available: 'success', unavailable: 'secondary', temporarily_unavailable: 'warning', pending: 'warning', donor_found: 'info', fulfilled: 'success', cancelled: 'secondary', approved: 'success', rejected: 'danger', open: 'warning', in_review: 'info', resolved: 'success', visible: 'success', flagged: 'warning', hidden: 'danger', active: 'success', suspended: 'danger', offered: 'secondary', accepted: 'success', declined: 'danger' };
const statusBadge = s => `<span class="badge text-bg-${STATUS_CLASS[s] || 'secondary'}">${esc(t('status.' + s))}</span>`;
const qty = (q, u) => `${I18n.num(q)} ${t('unit.' + u)}`;
const initials = n => esc((n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase());
const avatar = (url, name, size = 56) => url
  ? `<img class="avatar" src="${esc(url)}" width="${size}" height="${size}" alt="" loading="lazy">`
  : `<span class="avatar avatar-ph" style="width:${size}px;height:${size}px" aria-hidden="true">${initials(name)}</span>`;
const spinner = () => `<div class="text-center py-5" role="status"><div class="spinner-border text-danger"></div><span class="visually-hidden">${esc(t('common.loading'))}</span></div>`;
const empty = k => `<div class="text-center text-muted py-5">${esc(t(k || 'common.no_results'))}</div>`;
const errMsg = e => (e && I18n.has('err.' + e.code)) ? t('err.' + e.code) : (e && e.message) || t('err.server_error');

/* current Dhaka time in the format <input type="datetime-local"> expects */
function dhakaNowInput() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
function dhakaToday() { return dhakaNowInput().slice(0, 10); }

/* live "x days y hours" text, refreshed by App.tick() */
function span(parts, ms) {
  const m = Math.max(0, Math.floor(ms / 60000)), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mi = m % 60;
  return t('time.dhm', { d: I18n.num(d), h: I18n.num(h), m: I18n.num(mi) });
}
const since = iso => iso ? `<span data-since="${esc(iso)}">${span(0, Date.now() - new Date(iso))}</span>` : '—';
const until = iso => iso ? `<span data-until="${esc(iso)}">${new Date(iso) <= Date.now() ? esc(t('elig.now')) : span(0, new Date(iso) - Date.now())}</span>` : '—';

/* ---------- forms ---------- */
function fld(name, label, o = {}) {
  const id = 'f_' + name, type = o.type || 'text', req = o.required ? ' required' : '';
  let input;
  if (type === 'select') input = `<select class="form-select" id="${id}" name="${name}"${req}${o.attrs ? ' ' + o.attrs : ''}>${o.options || ''}</select>`;
  else if (type === 'textarea') input = `<textarea class="form-control" id="${id}" name="${name}" rows="${o.rows || 3}" maxlength="${o.max || 500}"${req}>${esc(o.value ?? '')}</textarea>`;
  else input = `<input class="form-control" id="${id}" name="${name}" type="${type}" value="${esc(o.value ?? '')}"${req}` +
    `${o.autocomplete ? ` autocomplete="${o.autocomplete}"` : ''}${o.max ? ` maxlength="${o.max}"` : ''}${o.attrs ? ' ' + o.attrs : ''}${o.inputmode ? ` inputmode="${o.inputmode}"` : ''}>`;
  return `<div class="${o.col || 'col-12'}"><label class="form-label" for="${id}">${esc(t(label))}${o.required ? ' <span class="text-danger" aria-hidden="true">*</span>' : ''}</label>${input}` +
    `${o.help ? `<div class="form-text">${esc(t(o.help))}</div>` : ''}<div class="invalid-feedback" data-for="${name}"></div></div>`;
}
const chk = (name, html, checked, required) => `<div class="col-12"><div class="form-check"><input class="form-check-input" type="checkbox" id="f_${name}" name="${name}"${checked ? ' checked' : ''}${required ? ' required' : ''}><label class="form-check-label" for="f_${name}">${html}</label><div class="invalid-feedback" data-for="${name}"></div></div></div>`;
const Form = {
  data(f) { const d = {}; new FormData(f).forEach((v, k) => { if (!(v instanceof File)) d[k] = v; }); $$('input[type=checkbox]', f).forEach(c => { d[c.name] = c.checked; }); return d; },
  clear(f) { $$('.is-invalid', f).forEach(e => e.classList.remove('is-invalid')); $$('.invalid-feedback[data-for]', f).forEach(e => { e.textContent = ''; }); },
  show(f, fields) {
    let first = null;
    for (const [k, code] of Object.entries(fields || {})) {
      const el = f.elements[k], fb = $(`.invalid-feedback[data-for="${k}"]`, f);
      if (el) { el.classList.add('is-invalid'); first = first || el; }
      if (fb) { fb.textContent = I18n.has('val.' + code) ? t('val.' + code) : t('val.invalid'); fb.style.display = 'block'; }
    }
    if (first) first.focus();
  },
  validate(f, rules) {
    this.clear(f); const d = this.data(f), errs = {};
    for (const [k, rs] of Object.entries(rules)) {
      for (const r of rs) {
        const [n, arg] = Array.isArray(r) ? r : [r];
        const isBool = typeof d[k] === 'boolean', v = isBool ? '' : String(d[k] ?? '').trim();
        if (n === 'required') { if (isBool ? !d[k] : v === '') { errs[k] = isBool ? 'must_accept' : 'required'; break; } continue; }
        if (v === '') break;
        if (n === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { errs[k] = 'invalid_email'; break; }
        if (n === 'phone' && !/^(?:\+?88)?01[3-9]\d{8}$/.test(v.replace(/[\s-]/g, ''))) { errs[k] = 'invalid_phone'; break; }
        if (n === 'min' && v.length < arg) { errs[k] = 'too_short'; break; }
        if (n === 'password' && !(v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v))) { errs[k] = 'password_weak'; break; }
        if (n === 'match' && v !== d[arg]) { errs[k] = 'mismatch'; break; }
      }
    }
    this.show(f, errs); return Object.keys(errs).length === 0;
  }
};

/* ---------- pagination ---------- */
function pager(page, pages) {
  if (pages <= 1) return '';
  const [path, qs] = location.hash.slice(1).split('?'); const q = new URLSearchParams(qs || '');
  const link = p => { q.set('page', p); return '#' + path + '?' + q.toString(); };
  const items = []; const from = Math.max(1, page - 2), to = Math.min(pages, page + 2);
  items.push(`<li class="page-item${page <= 1 ? ' disabled' : ''}"><a class="page-link" href="${link(page - 1)}" aria-label="${esc(t('common.prev'))}">&laquo;</a></li>`);
  for (let p = from; p <= to; p++) items.push(`<li class="page-item${p === page ? ' active' : ''}"><a class="page-link" href="${link(p)}"${p === page ? ' aria-current="page"' : ''}>${I18n.num(p)}</a></li>`);
  items.push(`<li class="page-item${page >= pages ? ' disabled' : ''}"><a class="page-link" href="${link(page + 1)}" aria-label="${esc(t('common.next'))}">&raquo;</a></li>`);
  return `<nav aria-label="${esc(t('common.pagination'))}" class="mt-4"><ul class="pagination justify-content-center flex-wrap">${items.join('')}</ul></nav>`;
}

/* ---------- toast & dialog ---------- */
function toast(msg, type = 'success') {
  const box = $('#toasts'), el = document.createElement('div');
  el.className = `alert alert-${type} shadow-sm py-2 px-3 mb-2`; el.textContent = msg; box.appendChild(el);
  setTimeout(() => el.remove(), 4500);
}
const Dlg = {
  /** ask({title, body, input:'textarea'|false, danger}) => Promise<true|string|null> */
  ask({ title, body = '', input = false, danger = false, label = '' }) {
    return new Promise(resolve => {
      const m = $('#dlg'); let done = false;
      $('#dlgTitle').textContent = t(title); $('#dlgBody').textContent = body ? t(body) : '';
      const ta = $('#dlgInput'); ta.classList.toggle('d-none', !input); ta.value = ''; ta.setAttribute('aria-label', label ? t(label) : t(title)); ta.placeholder = label ? t(label) : '';
      const ok = $('#dlgOk'); ok.className = 'btn ' + (danger ? 'btn-danger' : 'btn-primary'); ok.textContent = t('common.confirm');
      const inst = bootstrap.Modal.getOrCreateInstance(m);
      const finish = v => { if (done) return; done = true; m.removeEventListener('hidden.bs.modal', onHide); ok.onclick = null; resolve(v); };
      const onHide = () => finish(null);
      m.addEventListener('hidden.bs.modal', onHide);
      ok.onclick = () => { finish(input ? ta.value.trim() : true); inst.hide(); };
      inst.show();
    });
  }
};
