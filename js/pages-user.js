const tabsNav = (base, tabs, cur) => `<ul class="nav nav-pills flex-wrap gap-1 mb-4" role="tablist">${tabs.map(k => `<li class="nav-item"><a class="nav-link${k === cur ? ' active' : ''}" href="#${base}?tab=${k}"${k === cur ? ' aria-current="page"' : ''}>${esc(t('tab.' + k))}</a></li>`).join('')}</ul>`;

function notifText(n) {
  const d = { ...n.data }; if (d.district) d.district = distName(d.district);
  return t('notif.' + n.type, d);
}
function notifLink(n) {
  const d = n.data || {};
  if (d.request_id) return `#/requests/${d.request_id}`;
  if (n.type.startsWith('donation')) return '#/dashboard?tab=donations';
  if (n.type.startsWith('verification')) return '#/dashboard?tab=profile';
  return '#/dashboard';
}
const intervalFor = (comp) => (App.settings || {})['interval_' + comp];

Pages.dashboard = {
  title: 'nav.dashboard',
  async render(ctx) {
    const tab = ['overview', 'profile', 'donations', 'requests', 'notifications'].includes(ctx.query.get('tab')) ? ctx.query.get('tab') : 'overview';
    const u = await App.refreshUser();
    if (!App.settings) { try { App.settings = (await Api.get('/settings/public')).settings; } catch (_) { App.settings = {}; } }
    const body = await Pages.dashboard['tab_' + tab](ctx, u);
    return `<div class="container py-4"><div class="d-flex align-items-center gap-3 mb-3">${avatar(u.photo_url, u.full_name, 56)}<div><h1 class="h4 mb-0">${esc(t('dash.hello', { name: u.full_name }))}</h1><span class="text-muted small">${esc(t('dash.donor_title'))} · ${bloodBadge(u.blood_group)} ${u.is_verified ? `<span class="badge text-bg-primary">&#10003; ${esc(t('donor.verified'))}</span>` : ''}</span></div></div>
      ${tabsNav('/dashboard', ['overview', 'profile', 'donations', 'requests', 'notifications'], tab)}${body}</div>`;
  },

  async tab_overview(ctx, u) {
    const cards = [['donor.donations', num(u.donation_count)], ['dash.total_ml', `${num(u.total_ml)} ${t('unit.ml')}`], ['dash.total_units', `${num(u.total_units)} ${t('unit.unit')}`]];
    return `<div class="row g-3 mb-4">${cards.map(([l, v]) => `<div class="col-6 col-md-4"><div class="stat-card"><div class="n">${v}</div><div class="small">${esc(t(l))}</div></div></div>`).join('')}
      <div class="col-12 col-md-4"><div class="stat-card"><div class="n fs-5">${esc(t('status.' + u.availability))}</div><div class="small">${esc(t('donor.availability'))}</div></div></div></div>
      <div class="row g-3"><div class="col-lg-6"><div class="card h-100"><div class="card-body"><h2 class="h5">${esc(t('elig.title'))}</h2>
        ${u.last_donation_at ? `<p class="mb-1">${esc(t('donor.last_donation'))}: <strong>${esc(I18n.date(u.last_donation_at))}</strong></p><p class="mb-1">${esc(t('elig.elapsed'))}: <strong>${since(u.last_donation_at)}</strong></p><p>${esc(t('elig.estimated'))}: <strong>${esc(I18n.date(u.next_eligible_at))}</strong> — <span class="text-danger">${until(u.next_eligible_at)}</span></p>` : `<p>${esc(t('elig.no_record'))}</p>`}
        <div class="notice">${esc(t('elig.disclaimer'))}</div></div></div></div>
      <div class="col-lg-6"><form class="card h-100" data-form="availability"><div class="card-body"><h2 class="h5">${esc(t('donor.availability'))}</h2><div class="row g-3">
        ${fld('availability', 'donor.availability', { type: 'select', options: enumOpts('status.', AVAIL, u.availability_raw), col: 'col-md-6' })}
        ${fld('unavailable_until', 'donor.until', { type: 'date', value: u.unavailable_until || '', col: 'col-md-6', help: 'donor.until_help' })}
        <div class="col-12"><button class="btn btn-danger" type="submit">${esc(t('common.save'))}</button></div></div></div></form></div></div>`;
  },

  async tab_profile(ctx, u) {
    const v = (await Api.get('/me/verification')).items, pending = v.some(x => x.status === 'pending');
    return `<div class="row g-4"><div class="col-lg-8"><form class="card card-body" data-form="profile" novalidate><h2 class="h5 mb-3">${esc(t('tab.profile'))}</h2><div class="row g-3">
      ${fld('full_name', 'common.full_name', { value: u.full_name, required: true, max: 120, col: 'col-md-6' })}${fld('phone', 'common.phone', { value: u.phone, type: 'tel', required: true, max: 16, col: 'col-md-6' })}
      ${fld('dob', 'common.dob', { type: 'date', value: u.date_of_birth, required: true, col: 'col-md-4', attrs: `max="${dhakaToday()}"` })}
      ${fld('blood_group', 'common.blood_group', { type: 'select', options: bloodOpts(u.blood_group), col: 'col-md-4', attrs: u.is_verified ? 'disabled' : '' })}${fld('district', 'common.district', { type: 'select', options: distOpts(u.district), required: true, col: 'col-md-4' })}
      ${fld('upazila', 'common.upazila', { value: u.upazila, required: true, max: 80, col: 'col-md-6' })}${fld('address', 'common.address', { value: u.address, required: true, max: 255, col: 'col-md-6', help: 'reg.address_help' })}
      ${chk('show_in_directory', esc(t('reg.consent_directory')), u.show_in_directory)}${chk('share_phone', esc(t('reg.consent_phone')), u.share_phone)}${chk('email_notifications', esc(t('profile.email_notif')), u.email_notifications)}
      <div class="col-12 small text-muted">${esc(t('profile.lang_note'))}</div>
      <div class="col-12"><button class="btn btn-danger" type="submit">${esc(t('common.save'))}</button></div></div></form></div>
      <div class="col-lg-4"><form class="card card-body mb-3" data-form="photo"><h2 class="h6">${esc(t('profile.photo'))}</h2><input class="form-control mb-2" type="file" name="photo" id="f_photo" accept="image/jpeg,image/png,image/webp" required aria-label="${esc(t('profile.photo'))}"><button class="btn btn-outline-danger btn-sm" type="submit">${esc(t('common.upload'))}</button></form>
      <div class="card card-body mb-3"><h2 class="h6">${esc(t('verify.title'))}</h2><p class="small text-muted">${esc(t('verify.sub'))}</p>
        ${v.map(x => `<div class="small mb-1">${esc(t('doc.' + x.doc_type))} ${statusBadge(x.status)} ${x.review_note ? `<span class="text-muted">${esc(x.review_note)}</span>` : ''}</div>`).join('')}
        ${u.is_verified ? `<div class="alert alert-success py-1 mb-0">${esc(t('verify.done'))}</div>` : pending ? `<div class="notice">${esc(t('verify.pending'))}</div>` : `<form data-form="verify" class="mt-2"><select class="form-select mb-2" name="doc_type" aria-label="${esc(t('verify.doc_type'))}">${['nid', 'passport', 'driving_license', 'student_id'].map(k => opt(k, t('doc.' + k))).join('')}</select><input class="form-control mb-2" type="file" name="document" id="f_document" accept="image/jpeg,image/png,application/pdf" required aria-label="${esc(t('verify.title'))}"><button class="btn btn-outline-danger btn-sm" type="submit">${esc(t('common.upload'))}</button></form>`}</div>
      <form class="card card-body mb-3" data-form="password" novalidate><h2 class="h6">${esc(t('profile.change_password'))}</h2><div class="row g-2">${fld('current_password', 'profile.current_password', { type: 'password', required: true, autocomplete: 'current-password', max: 72 })}${fld('new_password', 'auth.new_password', { type: 'password', required: true, autocomplete: 'new-password', max: 72, help: 'val.password_rule' })}<div class="col-12"><button class="btn btn-outline-danger btn-sm" type="submit">${esc(t('common.save'))}</button></div></div></form>
      <form class="card card-body border-danger" data-form="deleteAccount" novalidate><h2 class="h6 text-danger">${esc(t('profile.delete_title'))}</h2><p class="small">${esc(t('profile.delete_warn'))}</p><div class="row g-2">${fld('password', 'common.password', { type: 'password', required: true, autocomplete: 'current-password', max: 72 })}<div class="col-12"><button class="btn btn-danger btn-sm" type="submit">${esc(t('profile.delete_btn'))}</button></div></div></form></div></div>`;
  },

  async tab_donations(ctx, u) {
    const page = ctx.query.get('page') || 1, r = await Api.get('/donations', { page });
    return `<div class="row g-4"><div class="col-lg-7"><h2 class="h5">${esc(t('don.history'))}</h2>
      ${r.items.length ? `<div class="table-responsive"><table class="table"><thead><tr><th>${esc(t('don.date'))}</th><th>${esc(t('don.location'))}</th><th>${esc(t('don.component'))}</th><th>${esc(t('req.quantity'))}</th><th>${esc(t('req.status'))}</th><th></th></tr></thead><tbody>
      ${r.items.map(x => `<tr><td>${esc(I18n.dateTime(x.donated_at))}</td><td>${esc(x.location)}</td><td>${esc(t('comp.' + x.component))}</td><td>${esc(qty(x.quantity, x.quantity_unit))}</td><td>${statusBadge(x.status)}${x.review_note ? `<div class="small text-muted">${esc(x.review_note)}</div>` : ''}</td>
      <td class="text-nowrap">${x.status === 'approved' ? `<a class="btn btn-sm btn-outline-danger" href="#/certificate/${x.id}">${esc(t('don.certificate'))}</a>` : ''}${x.status === 'pending' ? `<button class="btn btn-sm btn-outline-secondary" data-act="delDonation" data-id="${x.id}">${esc(t('common.delete'))}</button>` : ''}</td></tr>`).join('')}</tbody></table></div>${pager(r.page, r.pages)}` : empty('don.none')}</div>
      <div class="col-lg-5"><form class="card card-body" data-form="donation" novalidate><h2 class="h5">${esc(t('don.add'))}</h2><p class="small text-muted">${esc(t('don.add_note'))}</p><div class="row g-3">
      ${fld('donated_at', 'don.datetime', { type: 'datetime-local', required: true, attrs: `max="${dhakaNowInput()}"` })}${fld('location', 'don.location', { required: true, max: 190 })}
      ${fld('component', 'don.component', { type: 'select', options: enumOpts('comp.', COMPONENTS, 'whole_blood'), col: 'col-12' })}
      ${fld('quantity', 'req.quantity', { type: 'number', required: true, col: 'col-6', attrs: 'step="0.5" min="0.5"', inputmode: 'decimal' })}${fld('quantity_unit', 'don.unit', { type: 'select', options: enumOpts('unit.', ['ml', 'unit'], 'ml'), col: 'col-6' })}
      ${fld('notes', 'don.notes', { max: 255 })}<div class="col-12"><button class="btn btn-danger" type="submit">${esc(t('common.save'))}</button></div></div></form></div></div>`;
  },

  async tab_requests() {
    const [m, r] = await Promise.all([Api.get('/my/matching'), Api.get('/my/responses')]);
    return `<h2 class="h5">${esc(t('dash.matching'))}</h2>${m.items.length ? `<div class="row g-3 mb-4">${m.items.map(requestCard).join('')}</div>` : `<div class="mb-4">${empty('dash.no_matching')}</div>`}
      <h2 class="h5">${esc(t('dash.my_responses'))}</h2>${r.items.length ? `<div class="table-responsive"><table class="table"><thead><tr><th>${esc(t('common.blood_group'))}</th><th>${esc(t('req.hospital'))}</th><th>${esc(t('req.needed_by'))}</th><th>${esc(t('req.status'))}</th><th>${esc(t('dash.my_response'))}</th></tr></thead><tbody>${r.items.map(x => `<tr><td>${bloodBadge(x.request.blood_group)}</td><td><a href="#/requests/${x.request.id}">${esc(x.request.hospital)}</a></td><td>${esc(I18n.dateTime(x.request.needed_by))}</td><td>${statusBadge(x.request.status)}</td><td>${statusBadge(x.response_status)}</td></tr>`).join('')}</tbody></table></div>` : empty('dash.no_responses')}`;
  },

  async tab_notifications(ctx) {
    const page = ctx.query.get('page') || 1, r = await Api.get('/notifications', { page });
    return `<div class="d-flex justify-content-between align-items-center mb-3"><h2 class="h5 mb-0">${esc(t('tab.notifications'))}</h2>${r.unread ? `<button class="btn btn-sm btn-outline-danger" data-act="readAll">${esc(t('notif.mark_all'))}</button>` : ''}</div>
      ${r.items.length ? `<div class="list-group">${r.items.map(n => `<a class="list-group-item list-group-item-action ${n.is_read ? '' : 'fw-semibold border-start border-danger border-4'}" href="${notifLink(n)}" data-act="readOne" data-id="${n.id}"><div>${esc(notifText(n))}</div><small class="text-muted">${esc(I18n.dateTime(n.created_at))}</small></a>`).join('')}</div>${pager(r.page, r.pages)}` : empty('notif.none')}`;
  }
};

Forms.availability = async f => {
  const d = Form.data(f);
  await Api.put('/me', { availability: d.availability, unavailable_until: d.availability === 'temporarily_unavailable' ? d.unavailable_until : '' });
  toast(t('msg.saved')); App.reload();
};
Forms.profile = async f => {
  if (!Form.validate(f, { full_name: ['required', ['min', 2]], phone: ['required', 'phone'], dob: ['required'], district: ['required'], upazila: ['required', ['min', 2]], address: ['required', ['min', 5]] })) return;
  await Api.put('/me', Form.data(f)); await App.refreshUser(); toast(t('msg.saved')); App.reload();
};
Forms.photo = async f => { const file = f.elements.photo.files[0]; if (!file) { toast(t('err.file_required'), 'danger'); return; } const fd = new FormData(); fd.append('photo', file); await Api.req('POST', '/me/photo', fd); toast(t('msg.saved')); App.reload(); };
Forms.verify = async f => { const file = f.elements.document.files[0]; if (!file) { toast(t('err.file_required'), 'danger'); return; } const fd = new FormData(); fd.append('doc_type', f.elements.doc_type.value); fd.append('document', file); await Api.req('POST', '/me/verification', fd); toast(t('msg.verify_sent')); App.reload(); };
Forms.password = async f => {
  if (!Form.validate(f, { current_password: ['required'], new_password: ['required', 'password'] })) return;
  await Api.put('/me/password', Form.data(f)); f.reset(); toast(t('msg.saved'));
};
Forms.deleteAccount = async f => {
  if (!Form.validate(f, { password: ['required'] })) return;
  if (!await Dlg.ask({ title: 'profile.delete_title', body: 'profile.delete_confirm', danger: true })) return;
  await Api.del('/me', { password: Form.data(f).password });
  Api.setToken(null); App.user = null; App.renderChrome(); location.hash = '#/'; toast(t('msg.account_deleted'));
};
Forms.donation = async f => {
  if (!Form.validate(f, { donated_at: ['required'], location: ['required', ['min', 2]], quantity: ['required'] })) return;
  await Api.post('/donations', Form.data(f)); toast(t('msg.donation_added')); App.reload();
};
Acts.delDonation = async b => { if (!await Dlg.ask({ title: 'common.delete', body: 'common.sure', danger: true })) return; await Api.del('/donations/' + b.dataset.id); App.reload(); };
Acts.readAll = async () => { await Api.post('/notifications/read', { all: true }); App.pollNotif(); App.reload(); };
Acts.readOne = async b => { try { await Api.post('/notifications/read', { ids: [+b.dataset.id] }); App.pollNotif(); } catch (_) {} location.hash = b.getAttribute('href'); };

/* ---------- requester dashboard ---------- */
Pages.requester = {
  title: 'nav.my_requests',
  async render() {
    const r = (await Api.get('/my/requests')).items;
    const cnt = s => r.filter(x => x.status === s).length;
    return `<div class="container py-4"><div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3"><h1 class="h3 mb-0">${esc(t('nav.my_requests'))}</h1><a class="btn btn-danger" href="#/requests/new">${esc(t('home.request_blood'))}</a></div>
      <div class="row g-3 mb-4">${REQ_STATUS.map(s => `<div class="col-6 col-md-3"><div class="stat-card"><div class="n">${num(cnt(s))}</div><div class="small">${esc(t('status.' + s))}</div></div></div>`).join('')}</div>
      ${r.length ? `<div class="table-responsive"><table class="table"><thead><tr><th>${esc(t('common.blood_group'))}</th><th>${esc(t('req.hospital'))}</th><th>${esc(t('req.needed_by'))}</th><th>${esc(t('req.responses'))}</th><th>${esc(t('req.status'))}</th><th></th></tr></thead><tbody>
      ${r.map(x => `<tr><td>${bloodBadge(x.blood_group)}</td><td>${esc(x.hospital)}<div class="small text-muted">${esc(distName(x.district))}</div>${x.moderation !== 'visible' ? `<span class="badge text-bg-warning">${esc(t('mod.' + x.moderation))}</span>` : ''}</td><td>${esc(I18n.dateTime(x.needed_by))}</td><td>${num(x.responses_count)}</td>
      <td><select class="form-select form-select-sm" data-change="reqStatus" data-id="${x.id}" aria-label="${esc(t('req.status'))}">${enumOpts('status.', REQ_STATUS, x.status)}</select></td><td><a class="btn btn-sm btn-outline-danger" href="#/requests/${x.id}">${esc(t('common.details'))}</a></td></tr>`).join('')}</tbody></table></div>` : empty('req.none_mine')}</div>`;
  }
};

Pages.requestNew = {
  title: 'req.new',
  async render() {
    const u = App.user;
    return `<div class="container py-4" style="max-width:820px"><h1 class="h3">${esc(t('req.new'))}</h1><div class="notice mb-3">${esc(t('req.new_note'))}</div>
      <form class="card card-body" data-form="requestNew" novalidate><div class="row g-3">
      ${fld('patient_name', 'req.patient', { required: true, max: 120, col: 'col-md-6' })}${fld('blood_group', 'common.blood_group', { type: 'select', required: true, options: bloodOpts(''), col: 'col-md-6' })}
      ${fld('quantity', 'req.quantity', { type: 'number', required: true, col: 'col-6', attrs: 'step="0.5" min="0.5"', inputmode: 'decimal', value: '1' })}${fld('quantity_unit', 'don.unit', { type: 'select', options: enumOpts('unit.', ['unit', 'ml'], 'unit'), col: 'col-6' })}
      ${fld('hospital', 'req.hospital', { required: true, max: 190 })}
      ${fld('district', 'common.district', { type: 'select', required: true, options: distOpts(u.district), col: 'col-md-6' })}${fld('upazila', 'common.upazila', { max: 80, col: 'col-md-6' })}
      ${fld('location_details', 'req.location', { max: 255 })}${fld('needed_by', 'req.needed_by', { type: 'datetime-local', required: true, col: 'col-md-6', attrs: `min="${dhakaNowInput()}"` })}
      ${fld('contact_name', 'req.contact_name', { required: true, value: u.full_name, max: 120, col: 'col-md-6' })}${fld('contact_phone', 'req.contact_phone', { type: 'tel', required: true, value: u.phone, max: 16, col: 'col-md-6', inputmode: 'tel' })}
      ${fld('note', 'req.note', { type: 'textarea', rows: 2, max: 500 })}
      ${chk('confirm_truth', esc(t('req.confirm_truth')), false, true)}
      <div class="col-12"><button class="btn btn-danger" type="submit">${esc(t('req.submit'))}</button></div></div></form></div>`;
  }
};
Forms.requestNew = async f => {
  if (!Form.validate(f, { patient_name: ['required', ['min', 2]], blood_group: ['required'], quantity: ['required'], hospital: ['required', ['min', 3]], district: ['required'], needed_by: ['required'], contact_name: ['required', ['min', 2]], contact_phone: ['required', 'phone'], confirm_truth: ['required'] })) return;
  const r = await Api.post('/requests', Form.data(f)); toast(t('req.created', { n: I18n.num(r.notified) })); location.hash = '#/requests/' + r.id;
};

Pages.certificate = {
  title: 'don.certificate',
  async render(ctx) {
    const c = (await Api.get(`/donations/${ctx.params[0]}/certificate`)).certificate;
    return `<div class="container py-4"><div class="cert"><h1>${esc(t('cert.title'))}</h1><p>${esc(t('cert.presented'))}</p><p class="name">${esc(c.full_name)}</p>
      <p class="mt-3">${esc(t('cert.body', { group: c.blood_group, comp: t('comp.' + c.component), qty: qty(c.quantity, c.quantity_unit), date: I18n.date(c.donated_at) }))}</p>
      <p>${esc(t('don.location'))}: ${esc(c.location)}</p><p class="small text-muted">${esc(t('cert.no'))}: ${esc(c.certificate_no)} · ${esc(t('cert.verified_on'))} ${esc(I18n.date(c.reviewed_at))}${c.is_verified ? ' · ' + esc(t('donor.verified')) : ''}</p>
      <p class="small text-muted">${esc(t('elig.disclaimer'))}</p></div><div class="text-center mt-3 no-print"><button class="btn btn-danger" onclick="window.print()">${esc(t('cert.print'))}</button> <a class="btn btn-outline-secondary" href="#/dashboard?tab=donations">${esc(t('common.back'))}</a></div></div>`;
  }
};
