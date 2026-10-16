const ADMIN_TABS = ['overview', 'users', 'donations', 'verifications', 'requests', 'complaints', 'settings', 'audit'];
const bars = (rows, label) => { const mx = Math.max(1, ...rows.map(r => r.count)); return rows.length ? rows.map(r => `<div class="bar-row"><span style="min-width:5.5rem">${esc(label(r))}</span><div class="bar" style="width:${Math.round(r.count / mx * 60) + 1}%"></div><span>${num(r.count)}</span></div>`).join('') : empty(); };
const table = (heads, rows) => rows.length ? `<div class="table-responsive"><table class="table table-sm table-hover"><thead><tr>${heads.map(h => `<th>${esc(t(h))}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>` : empty();
const filterForm = (name, fields, q) => `<form class="row g-2 mb-3 align-items-end" data-form="${name}">${fields.map(([n, label, kind, extra]) => kind === 'text' ? fld(n, label, { value: q.get(n) || '', col: 'col-6 col-md-3', max: 80 }) : fld(n, label, { type: 'select', options: enumOpts(extra[0], extra[1], q.get(n) || '', true), col: 'col-6 col-md-3' })).join('')}<div class="col-6 col-md-2"><button class="btn btn-danger w-100" type="submit">${esc(t('common.search'))}</button></div></form>`;
const adminHash = (tab, o) => '#/admin' + Api.qs({ tab, ...o });
const setFilter = tab => f => { location.hash = adminHash(tab, Form.data(f)); };

Pages.admin = {
  title: 'nav.admin',
  async render(ctx) {
    const tab = ADMIN_TABS.includes(ctx.query.get('tab')) ? ctx.query.get('tab') : 'overview';
    const body = await Pages.admin['tab_' + tab](ctx);
    return `<div class="container py-4"><h1 class="h3 mb-3">${esc(t('nav.admin'))}</h1>${tabsNav('/admin', ADMIN_TABS, tab)}${body}</div>`;
  },
  async tab_overview() {
    const o = await Api.get('/admin/overview'), T = o.totals;
    const cards = [['users', T.users], ['suspended', T.suspended], ['verified', T.verified], ['pending_donations', T.pending_donations], ['approved_donations', T.approved_donations], ['pending_verifications', T.pending_verifications], ['open_complaints', T.open_complaints], ['flagged_requests', T.flagged_requests]];
    return `<div class="row g-3 mb-4">${cards.map(([k, v]) => `<div class="col-6 col-md-3"><div class="stat-card"><div class="n">${num(v)}</div><div class="small">${esc(t('adm.' + k))}</div></div></div>`).join('')}</div>
      <div class="row g-4"><div class="col-md-6"><h2 class="h6">${esc(t('adm.req_by_status'))}</h2>${bars(Object.entries(o.requests_by_status).map(([k, c]) => ({ k, count: c })), r => t('status.' + r.k))}</div>
      <div class="col-md-6"><h2 class="h6">${esc(t('adm.req_by_group'))}</h2>${bars(o.requests_by_group, r => r.blood_group)}</div>
      <div class="col-md-6"><h2 class="h6">${esc(t('adm.registrations'))}</h2>${bars(o.registrations, r => I18n.month(r.month))}</div>
      <div class="col-md-6"><h2 class="h6">${esc(t('adm.donations_month'))}</h2>${bars(o.donations, r => I18n.month(r.month))}<p class="mt-2 small">${esc(t('adm.total_ml'))}: <strong>${num(T.total_ml)} ${esc(t('unit.ml'))}</strong></p></div></div>`;
  },
  async tab_users(ctx) {
    const q = ctx.query, r = await Api.get('/admin/users', { q: q.get('q') || '', status: q.get('status') || '', role: q.get('role') || '', page: q.get('page') || 1 });
    return filterForm('adminUsers', [['q', 'adm.search_user', 'text'], ['status', 'req.status', 'sel', ['status.', ['active', 'suspended']]], ['role', 'adm.role', 'sel', ['role.', ['user', 'admin']]]], q) +
      table(['common.name', 'common.email', 'common.phone', 'common.blood_group', 'common.district', 'adm.role', 'req.status', 'donor.verified', ''], r.items.map(x => `<tr><td>${esc(x.full_name)}</td><td>${esc(x.email)}</td><td>${esc(x.phone)}</td><td>${esc(x.blood_group || '')}</td><td>${esc(distName(x.district))}</td><td>${esc(t('role.' + x.role))}</td><td>${statusBadge(x.status)}</td><td>${x.is_verified ? '&#10003;' : '—'}</td>
      <td class="text-nowrap"><button class="btn btn-sm btn-outline-secondary" data-act="admUser" data-op="${x.status === 'active' ? 'suspend' : 'activate'}" data-id="${x.id}">${esc(t(x.status === 'active' ? 'adm.suspend' : 'adm.activate'))}</button>
      <button class="btn btn-sm btn-outline-secondary" data-act="admUser" data-op="${x.role === 'admin' ? 'demote' : 'promote'}" data-id="${x.id}">${esc(t(x.role === 'admin' ? 'adm.demote' : 'adm.promote'))}</button>
      <button class="btn btn-sm btn-outline-secondary" data-act="admUser" data-op="${x.is_verified ? 'unverify' : 'verify'}" data-id="${x.id}">${esc(t(x.is_verified ? 'adm.unverify' : 'adm.verify'))}</button>
      <button class="btn btn-sm btn-outline-danger" data-act="admUser" data-op="delete" data-id="${x.id}">${esc(t('common.delete'))}</button></td></tr>`)) + pager(r.page, r.pages);
  },
  async tab_donations(ctx) {
    const q = ctx.query, r = await Api.get('/admin/donations', { status: q.get('status') || 'pending', page: q.get('page') || 1 });
    return filterForm('adminDonations', [['status', 'req.status', 'sel', ['status.', ['pending', 'approved', 'rejected']]]], new URLSearchParams({ status: q.get('status') || 'pending' })) +
      table(['common.name', 'common.blood_group', 'don.date', 'don.location', 'don.component', 'req.quantity', 'req.status', ''], r.items.map(x => `<tr><td>${esc(x.full_name)}</td><td>${esc(x.blood_group)}</td><td>${esc(I18n.dateTime(x.donated_at))}</td><td>${esc(x.location)}</td><td>${esc(t('comp.' + x.component))}</td><td>${esc(qty(x.quantity, x.quantity_unit))}</td><td>${statusBadge(x.status)}</td>
      <td class="text-nowrap">${x.status === 'pending' ? `<button class="btn btn-sm btn-success" data-act="admDonation" data-op="approved" data-id="${x.id}">${esc(t('adm.approve'))}</button> <button class="btn btn-sm btn-outline-danger" data-act="admDonation" data-op="rejected" data-id="${x.id}">${esc(t('adm.reject'))}</button>` : ''}</td></tr>`)) + pager(r.page, r.pages);
  },
  async tab_verifications(ctx) {
    const q = ctx.query, r = await Api.get('/admin/verifications', { status: q.get('status') || 'pending', page: q.get('page') || 1 });
    return `<div class="notice mb-3">${esc(t('adm.verif_note'))}</div>` + filterForm('adminVerifs', [['status', 'req.status', 'sel', ['status.', ['pending', 'approved', 'rejected']]]], new URLSearchParams({ status: q.get('status') || 'pending' })) +
      table(['common.name', 'common.email', 'verify.doc_type', 'don.date', 'req.status', ''], r.items.map(x => `<tr><td>${esc(x.full_name)}</td><td>${esc(x.email)}</td><td>${esc(t('doc.' + x.doc_type))}</td><td>${esc(I18n.dateTime(x.created_at))}</td><td>${statusBadge(x.status)}</td>
      <td class="text-nowrap"><button class="btn btn-sm btn-outline-secondary" data-act="admView" data-id="${x.id}">${esc(t('adm.view_doc'))}</button>${x.status === 'pending' ? ` <button class="btn btn-sm btn-success" data-act="admVerif" data-op="approved" data-id="${x.id}">${esc(t('adm.approve'))}</button> <button class="btn btn-sm btn-outline-danger" data-act="admVerif" data-op="rejected" data-id="${x.id}">${esc(t('adm.reject'))}</button>` : ''}</td></tr>`)) + pager(r.page, r.pages);
  },
  async tab_requests(ctx) {
    const q = ctx.query, r = await Api.get('/admin/requests', { moderation: q.get('moderation') || '', status: q.get('status') || '', page: q.get('page') || 1 });
    return filterForm('adminRequests', [['moderation', 'adm.moderation', 'sel', ['mod.', ['visible', 'flagged', 'hidden']]], ['status', 'req.status', 'sel', ['status.', REQ_STATUS]]], q) +
      table(['common.blood_group', 'req.hospital', 'common.district', 'req.needed_by', 'req.status', 'adm.moderation', 'adm.reports', ''], r.items.map(x => `<tr><td>${esc(x.blood_group)}</td><td><a href="#/requests/${x.id}">${esc(x.hospital)}</a><div class="small text-muted">${esc(x.requester)}</div></td><td>${esc(distName(x.district))}</td><td>${esc(I18n.dateTime(x.needed_by))}</td><td>${statusBadge(x.status)}</td><td>${statusBadge(x.moderation)}</td><td>${num(x.reports)}</td>
      <td class="text-nowrap">${['visible', 'flagged', 'hidden'].filter(m => m !== x.moderation).map(m => `<button class="btn btn-sm btn-outline-secondary" data-act="admMod" data-op="${m}" data-id="${x.id}">${esc(t('mod.' + m))}</button>`).join(' ')}</td></tr>`)) + pager(r.page, r.pages);
  },
  async tab_complaints(ctx) {
    const q = ctx.query, r = await Api.get('/admin/complaints', { status: q.get('status') || '', category: q.get('category') || '', page: q.get('page') || 1 });
    return filterForm('adminComplaints', [['status', 'req.status', 'sel', ['status.', ['open', 'in_review', 'resolved']]], ['category', 'contact.type', 'sel', ['cat.', ['contact', 'complaint', 'report_request', 'report_user']]]], q) +
      table(['don.date', 'contact.type', 'common.name', 'contact.subject', 'contact.message', 'req.status', ''], r.items.map(x => `<tr><td>${esc(I18n.dateTime(x.created_at))}</td><td>${esc(t('cat.' + x.category))}${x.target_id ? ` <a href="${x.category === 'report_request' ? '#/requests/' + x.target_id : '#/donors/' + x.target_id}">#${num(x.target_id)}</a>` : ''}</td><td>${esc(x.name)}<div class="small text-muted">${esc(x.email)}</div></td><td>${esc(x.subject)}</td><td style="max-width:320px">${esc(x.message)}${x.admin_note ? `<div class="small text-muted">${esc(x.admin_note)}</div>` : ''}</td><td>${statusBadge(x.status)}</td>
      <td class="text-nowrap">${['open', 'in_review', 'resolved'].filter(s => s !== x.status).map(s => `<button class="btn btn-sm btn-outline-secondary" data-act="admComplaint" data-op="${s}" data-id="${x.id}">${esc(t('status.' + s))}</button>`).join(' ')}</td></tr>`)) + pager(r.page, r.pages);
  },
  async tab_settings() {
    const r = await Api.get('/admin/settings');
    return `<div class="notice mb-3">${esc(t('adm.settings_note'))}</div><form class="card card-body" data-form="adminSettings" novalidate><div class="row g-3">
      ${Object.keys(r.settings).map(k => fld(k, 'set.' + k, { type: 'number', value: r.settings[k], col: 'col-md-4', attrs: `min="${r.ranges[k][0]}" max="${r.ranges[k][1]}"`, help: undefined })).join('')}
      <div class="col-12"><button class="btn btn-danger" type="submit">${esc(t('common.save'))}</button></div></div></form>`;
  },
  async tab_audit(ctx) {
    const r = await Api.get('/admin/audit', { page: ctx.query.get('page') || 1 });
    return table(['don.date', 'adm.actor', 'adm.action', 'adm.target', 'adm.details', 'IP'], r.items.map(x => `<tr><td>${esc(I18n.dateTime(x.created_at))}</td><td>${esc(x.actor || '—')}</td><td>${esc(I18n.has('audit.' + x.action) ? t('audit.' + x.action) : x.action)}</td><td>${esc(x.target_type || '')} ${x.target_id ? '#' + num(x.target_id) : ''}</td><td class="small text-break">${esc(x.details || '')}</td><td>${esc(x.ip || '')}</td></tr>`)) + pager(r.page, r.pages);
  }
};
ADMIN_TABS.slice(1).forEach(() => {});
Forms.adminUsers = setFilter('users'); Forms.adminDonations = setFilter('donations'); Forms.adminVerifs = setFilter('verifications');
Forms.adminRequests = setFilter('requests'); Forms.adminComplaints = setFilter('complaints');
Forms.adminSettings = async f => {
  const d = Form.data(f), body = {}; Object.keys(d).forEach(k => { body[k] = Number(d[k]); });
  await Api.put('/admin/settings', body); toast(t('msg.saved'));
};
Acts.admUser = async b => {
  const op = b.dataset.op, id = b.dataset.id;
  const map = { suspend: { status: 'suspended' }, activate: { status: 'active' }, promote: { role: 'admin' }, demote: { role: 'user' }, verify: { is_verified: true }, unverify: { is_verified: false } };
  if (op === 'delete') { if (!await Dlg.ask({ title: 'common.delete', body: 'adm.delete_user_confirm', danger: true })) return; await Api.del('/admin/users/' + id); }
  else { if (['suspend', 'promote', 'demote'].includes(op) && !await Dlg.ask({ title: 'adm.' + op, body: 'common.sure' })) return; await Api.put('/admin/users/' + id, map[op]); }
  toast(t('msg.saved')); App.reload();
};
Acts.admDonation = async b => {
  const note = b.dataset.op === 'rejected' ? await Dlg.ask({ title: 'adm.reject', input: true, label: 'adm.reason' }) : await Dlg.ask({ title: 'adm.approve', body: 'common.sure' });
  if (note === null) return;
  await Api.put('/admin/donations/' + b.dataset.id, { status: b.dataset.op, note: typeof note === 'string' ? note : '' }); toast(t('msg.saved')); App.reload();
};
Acts.admVerif = async b => {
  const note = b.dataset.op === 'rejected' ? await Dlg.ask({ title: 'adm.reject', input: true, label: 'adm.reason' }) : await Dlg.ask({ title: 'adm.approve', body: 'common.sure' });
  if (note === null) return;
  await Api.put('/admin/verifications/' + b.dataset.id, { status: b.dataset.op, note: typeof note === 'string' ? note : '' }); toast(t('msg.saved')); App.reload();
};
Acts.admView = async b => { const w = window.open('', '_blank'); try { const blob = await Api.get(`/admin/verifications/${b.dataset.id}/file`, null, { blob: true }); w.location = URL.createObjectURL(blob); } catch (e) { w.close(); throw e; } };
Acts.admMod = async b => { await Api.put('/admin/requests/' + b.dataset.id, { moderation: b.dataset.op }); toast(t('msg.saved')); App.reload(); };
Acts.admComplaint = async b => {
  const note = await Dlg.ask({ title: 'status.' + b.dataset.op, input: true, label: 'adm.note' }); if (note === null) return;
  await Api.put('/admin/complaints/' + b.dataset.id, { status: b.dataset.op, admin_note: note || '' }); toast(t('msg.saved')); App.reload();
};
