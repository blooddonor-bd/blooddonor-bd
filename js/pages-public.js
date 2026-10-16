function requestCard(r) {
  return `<div class="col-md-6 col-lg-4"><div class="card h-100 req-card ${r.urgent ? 'border-danger' : ''}"><div class="card-body">
    <div class="d-flex justify-content-between align-items-start mb-2">${bloodBadge(r.blood_group)}<div class="text-end">${r.urgent ? `<span class="badge text-bg-danger me-1">${esc(t('req.urgent'))}</span>` : ''}${statusBadge(r.status)}</div></div>
    <h3 class="h6 mb-1">${esc(r.hospital)}</h3>
    <p class="small text-muted mb-2">${esc(distName(r.district))}${r.upazila ? ', ' + esc(r.upazila) : ''}</p>
    <ul class="list-unstyled small mb-3"><li>${esc(t('req.needed_by'))}: ${esc(I18n.dateTime(r.needed_by))}</li><li>${esc(t('req.quantity'))}: ${esc(qty(r.quantity, r.quantity_unit))}</li><li>${esc(t('req.responses'))}: ${num(r.responses_count)}</li></ul>
    <a class="btn btn-sm btn-outline-danger stretched-link" href="#/requests/${r.id}">${esc(t('common.details'))}</a></div></div></div>`;
}
function donorCard(d) {
  return `<div class="col-md-6 col-lg-4"><div class="card h-100"><div class="card-body d-flex gap-3">
    ${avatar(d.photo_url, d.full_name)}
    <div class="flex-grow-1"><div class="d-flex justify-content-between gap-2"><h3 class="h6 mb-1">${esc(d.full_name)}</h3>${bloodBadge(d.blood_group)}</div>
    <p class="small text-muted mb-1">${esc(distName(d.district))}, ${esc(d.upazila)}</p>
    <div class="mb-2">${statusBadge(d.availability)} ${d.is_verified ? `<span class="badge text-bg-primary">&#10003; ${esc(t('donor.verified'))}</span>` : ''}</div>
    <div class="small">${esc(t('donor.donations'))}: ${num(d.donation_count)}</div>
    <a class="stretched-link small" href="#/donors/${d.id}">${esc(t('common.details'))}</a></div></div></div></div>`;
}
const hashWith = (path, o) => '#' + path + Api.qs(o);

Pages.home = {
  title: null,
  async render() {
    const [s, r] = await Promise.all([Api.get('/stats'), Api.get('/requests', { urgent: 1, per: 3 })]);
    const T = s.totals;
    return `<section class="hero"><div class="container"><div class="row align-items-center g-4">
      <div class="col-lg-7"><h1 class="display-5 fw-bold">${esc(t('home.title'))}</h1><p class="lead">${esc(t('home.subtitle'))}</p>
        <div class="d-flex flex-wrap gap-2"><a class="btn btn-light btn-lg" href="#/donors">${esc(t('home.find_donor'))}</a><a class="btn btn-outline-light btn-lg" href="#/requests/new">${esc(t('home.request_blood'))}</a>${App.user ? '' : `<a class="btn btn-outline-light btn-lg" href="#/register">${esc(t('nav.register'))}</a>`}</div></div>
      <div class="col-lg-5"><form class="search-card" data-form="quickSearch"><h2 class="h5 mb-3">${esc(t('home.quick_search'))}</h2><div class="row g-2">
        ${fld('blood_group', 'common.blood_group', { type: 'select', options: bloodOpts('', true), col: 'col-6' })}${fld('district', 'common.district', { type: 'select', options: distOpts('', true), col: 'col-6' })}
        <div class="col-12"><button class="btn btn-danger w-100" type="submit">${esc(t('common.search'))}</button></div></div></form></div></div></div></section>
    <div class="container mt-5">
      <div class="row g-3 text-center">${[['donors', 'stat.donors'], ['available', 'stat.available'], ['open_requests', 'stat.open_requests'], ['donations', 'stat.donations'], ['fulfilled', 'stat.fulfilled']].map(([k, l]) => `<div class="col-6 col-md"><div class="stat-card"><div class="n">${num(T[k])}</div><div class="small">${esc(t(l))}</div></div></div>`).join('')}</div>
      <h2 class="h4 section-title mt-5">${esc(t('home.by_group'))}</h2>
      <div class="row g-2 row-cols-4 row-cols-md-8">${s.by_group.map(g => `<div class="col"><a class="group-tile" href="${hashWith('/donors', { blood_group: g.blood_group })}"><span class="g">${esc(g.blood_group)}</span><span class="small text-muted">${num(g.count)}</span></a></div>`).join('')}</div>
      <h2 class="h4 section-title mt-5">${esc(t('home.urgent'))}</h2>
      ${r.items.length ? `<div class="row g-3">${r.items.map(requestCard).join('')}</div>` : empty('req.none_urgent')}
      <div class="row g-4 mt-4"><div class="col-lg-6"><h2 class="h4 section-title">${esc(t('home.recent'))}</h2>
        ${s.recent.length ? `<ul class="list-group">${s.recent.map(x => `<li class="list-group-item d-flex align-items-center gap-3">${bloodBadge(x.blood_group)}<div><div>${esc(t('comp.' + x.component))}</div><div class="small text-muted">${esc(distName(x.district))} · ${esc(I18n.date(x.donated_at))}</div></div></li>`).join('')}</ul>` : empty('home.no_activity')}</div>
        <div class="col-lg-6"><h2 class="h4 section-title">${esc(t('home.how'))}</h2><ol class="list-group list-group-numbered">${[1, 2, 3].map(i => `<li class="list-group-item">${esc(t('home.step' + i))}</li>`).join('')}</ol>
        <div class="notice mt-3">${esc(t('elig.disclaimer'))}</div></div></div></div>`;
  }
};
Forms.quickSearch = f => { const d = Form.data(f); location.hash = hashWith('/donors', { blood_group: d.blood_group, district: d.district }); };

Pages.donors = {
  title: 'nav.donors',
  async render(ctx) {
    const q = ctx.query, p = { blood_group: q.get('blood_group') || '', district: q.get('district') || '', upazila: q.get('upazila') || '', availability: q.get('availability') || '', page: q.get('page') || 1 };
    const r = await Api.get('/donors', p);
    return `<div class="container py-4"><h1 class="h3 mb-3">${esc(t('nav.donors'))}</h1>
      <form class="card card-body mb-4" data-form="donorFilter"><div class="row g-3 align-items-end">
        ${fld('blood_group', 'common.blood_group', { type: 'select', options: bloodOpts(p.blood_group, true), col: 'col-6 col-md-3' })}
        ${fld('district', 'common.district', { type: 'select', options: distOpts(p.district, true), col: 'col-6 col-md-3' })}
        ${fld('upazila', 'common.upazila', { value: p.upazila, col: 'col-6 col-md-2', max: 80 })}
        ${fld('availability', 'donor.availability', { type: 'select', options: enumOpts('status.', AVAIL, p.availability, true), col: 'col-6 col-md-2' })}
        <div class="col-12 col-md-2 d-flex gap-2"><button class="btn btn-danger flex-fill" type="submit">${esc(t('common.search'))}</button><a class="btn btn-outline-secondary" href="#/donors">${esc(t('common.reset'))}</a></div></div></form>
      <p class="text-muted">${esc(t('common.total_results', { n: I18n.num(r.total) }))}</p>
      ${r.items.length ? `<div class="row g-3">${r.items.map(donorCard).join('')}</div>` : empty()}${pager(r.page, r.pages)}
      <div class="notice mt-4">${esc(t('donor.privacy_note'))}</div></div>`;
  }
};
Forms.donorFilter = f => { const d = Form.data(f); location.hash = hashWith('/donors', { blood_group: d.blood_group, district: d.district, upazila: d.upazila, availability: d.availability }); };

Pages.donor = {
  title: 'donor.profile',
  async render(ctx) {
    const d = (await Api.get('/donors/' + ctx.params[0])).donor;
    return `<div class="container py-4" style="max-width:760px"><a href="#/donors" class="small">&larr; ${esc(t('common.back'))}</a>
      <div class="card mt-3"><div class="card-body"><div class="d-flex gap-3 align-items-center flex-wrap">${avatar(d.photo_url, d.full_name, 88)}
        <div class="flex-grow-1"><h1 class="h4 mb-1">${esc(d.full_name)}</h1><p class="text-muted mb-1">${esc(distName(d.district))}, ${esc(d.upazila)}</p>
        <div>${statusBadge(d.availability)} ${d.is_verified ? `<span class="badge text-bg-primary">&#10003; ${esc(t('donor.verified'))}</span>` : ''}</div></div>${bloodBadge(d.blood_group)}</div>
        <hr><dl class="row mb-0">
          <dt class="col-sm-5">${esc(t('donor.donations'))}</dt><dd class="col-sm-7">${num(d.donation_count)}</dd>
          <dt class="col-sm-5">${esc(t('donor.last_donation'))}</dt><dd class="col-sm-7">${d.last_donation_at ? `${esc(I18n.date(d.last_donation_at))} (${since(d.last_donation_at)} ${esc(t('time.ago'))})` : esc(t('donor.never'))}</dd>
          <dt class="col-sm-5">${esc(t('donor.member_since'))}</dt><dd class="col-sm-7">${esc(I18n.date(d.member_since))}</dd>
          <dt class="col-sm-5">${esc(t('common.phone'))}</dt><dd class="col-sm-7">${d.phone ? `<a href="tel:${esc(d.phone)}">${esc(d.phone)}</a>` : `<span class="text-muted">${esc(t(d.phone_shared ? 'donor.phone_login' : 'donor.phone_private'))}</span>`}</dd></dl></div></div>
      <div class="notice mt-3">${esc(t('donor.contact_note'))}</div></div>`;
  }
};

Pages.directory = {
  title: 'nav.directory',
  async render() {
    const s = await Api.get('/stats'), map = Object.fromEntries(s.by_district.map(x => [x.district, x.count]));
    const rows = [...DISTRICTS].sort((a, b) => distName(a[0]).localeCompare(distName(b[0]), I18n.locale()));
    return `<div class="container py-4"><h1 class="h3 mb-2">${esc(t('nav.directory'))}</h1><p class="text-muted">${esc(t('dir.sub'))}</p>
      <div class="mb-3" style="max-width:360px"><label class="form-label" for="dirFilter">${esc(t('dir.filter'))}</label><input id="dirFilter" class="form-control" type="search"></div>
      <div class="row g-2" id="dirList">${rows.map(d => `<div class="col-6 col-md-4 col-lg-3" data-name="${esc(distName(d[0]).toLowerCase())}"><a class="dir-item" href="${hashWith('/donors', { district: d[0] })}"><span>${esc(distName(d[0]))}</span><span class="badge text-bg-danger">${num(map[d[0]] || 0)}</span></a></div>`).join('')}</div></div>`;
  },
  mount() { const i = $('#dirFilter'); const run = () => { const v = i.value.trim().toLowerCase(); $$('#dirList [data-name]').forEach(e => e.classList.toggle('d-none', !!v && !e.dataset.name.includes(v))); }; i.addEventListener('input', run); run(); }
};

Pages.requests = {
  title: 'nav.requests',
  async render(ctx) {
    const q = ctx.query, p = { blood_group: q.get('blood_group') || '', district: q.get('district') || '', status: q.get('status') || '', urgent: q.get('urgent') || '', q: q.get('q') || '', page: q.get('page') || 1 };
    const r = await Api.get('/requests', p);
    return `<div class="container py-4"><div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3"><h1 class="h3 mb-0">${esc(t('nav.requests'))}</h1><a class="btn btn-danger" href="#/requests/new">${esc(t('home.request_blood'))}</a></div>
      <form class="card card-body mb-4" data-form="requestFilter"><div class="row g-3 align-items-end">
        ${fld('blood_group', 'common.blood_group', { type: 'select', options: bloodOpts(p.blood_group, true), col: 'col-6 col-md-2' })}
        ${fld('district', 'common.district', { type: 'select', options: distOpts(p.district, true), col: 'col-6 col-md-3' })}
        ${fld('status', 'req.status', { type: 'select', options: enumOpts('status.', REQ_STATUS, p.status, true), col: 'col-6 col-md-2' })}
        ${fld('q', 'req.hospital', { value: p.q, col: 'col-6 col-md-3', max: 80 })}
        <div class="col-12 col-md-2"><button class="btn btn-danger w-100" type="submit">${esc(t('common.search'))}</button></div>
        <div class="col-12"><div class="form-check"><input class="form-check-input" type="checkbox" id="f_urgent" name="urgent"${p.urgent ? ' checked' : ''}><label class="form-check-label" for="f_urgent">${esc(t('req.urgent_only'))}</label></div></div></div></form>
      <p class="text-muted">${esc(t('common.total_results', { n: I18n.num(r.total) }))}</p>
      ${r.items.length ? `<div class="row g-3">${r.items.map(requestCard).join('')}</div>` : empty()}${pager(r.page, r.pages)}</div>`;
  }
};
Forms.requestFilter = f => { const d = Form.data(f); location.hash = hashWith('/requests', { blood_group: d.blood_group, district: d.district, status: d.status, q: d.q, urgent: d.urgent ? 1 : '' }); };

Pages.request = {
  title: 'req.details',
  async render(ctx) {
    const id = ctx.params[0], r = (await Api.get('/requests/' + id)).request, u = App.user;
    const open = ['pending', 'donor_found'].includes(r.status);
    let side = '';
    if (!u) side = `<div class="notice">${esc(t('req.login_to_view'))} <a href="#/login">${esc(t('nav.login'))}</a></div>`;
    else side = `<dl class="mb-0"><dt>${esc(t('req.patient'))}</dt><dd>${esc(r.patient_name)}</dd><dt>${esc(t('req.contact'))}</dt><dd>${esc(r.contact_name)} — <a href="tel:${esc(r.contact_phone)}">${esc(r.contact_phone)}</a></dd>${r.note ? `<dt>${esc(t('req.note'))}</dt><dd>${esc(r.note)}</dd>` : ''}</dl>`;
    let act = '';
    if (u && !r.is_owner && open) {
      act = r.my_response
        ? `<div class="alert alert-success d-flex justify-content-between align-items-center">${esc(t('req.you_responded'))} ${statusBadge(r.my_response.status)}${r.my_response.status !== 'accepted' ? `<button class="btn btn-sm btn-outline-secondary" data-act="withdraw" data-id="${r.id}">${esc(t('req.withdraw'))}</button>` : ''}</div>`
        : `<form data-form="respond" data-id="${r.id}" class="card card-body mt-3"><h2 class="h6">${esc(t('req.respond'))}</h2><div class="row g-2">${fld('message', 'req.message', { type: 'textarea', rows: 2, max: 255, help: 'req.respond_help' })}<div class="col-12"><button class="btn btn-danger" type="submit">${esc(t('req.i_can_donate'))}</button></div></div></form>`;
    }
    const owner = (r.is_owner || (u && u.role === 'admin')) ? `
      <div class="card card-body mt-3"><div class="row g-3 align-items-end">${r.is_owner ? fld('status', 'req.status', { type: 'select', options: enumOpts('status.', REQ_STATUS, r.status), col: 'col-md-4', attrs: `data-change="reqStatus" data-id="${r.id}"` }) : ''}
        <div class="col-md-8">${r.moderation !== 'visible' ? `<span class="badge text-bg-warning">${esc(t('mod.' + r.moderation))}</span> <span class="small">${esc(t('mod.note'))}</span>` : ''}</div></div>
        <h2 class="h6 mt-3">${esc(t('req.responses'))} (${num((r.responses || []).length)})</h2>
        ${(r.responses || []).length ? `<div class="table-responsive"><table class="table table-sm"><thead><tr><th>${esc(t('common.name'))}</th><th>${esc(t('common.blood_group'))}</th><th>${esc(t('common.phone'))}</th><th>${esc(t('req.message'))}</th><th>${esc(t('req.status'))}</th><th></th></tr></thead><tbody>${r.responses.map(x => `<tr><td>${esc(x.donor_name)} ${x.donor_verified ? '&#10003;' : ''}</td><td>${bloodBadge(x.donor_blood_group)}</td><td><a href="tel:${esc(x.donor_phone)}">${esc(x.donor_phone)}</a></td><td>${esc(x.message || '')}</td><td>${statusBadge(x.status)}</td><td class="text-nowrap">${r.is_owner ? `<button class="btn btn-sm btn-outline-success" data-act="decide" data-op="accepted" data-id="${r.id}" data-rid="${x.id}">${esc(t('req.accept'))}</button> <button class="btn btn-sm btn-outline-secondary" data-act="decide" data-op="declined" data-id="${r.id}" data-rid="${x.id}">${esc(t('req.decline'))}</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : empty('req.no_responses')}</div>` : '';
    return `<div class="container py-4" style="max-width:900px"><a href="#/requests" class="small">&larr; ${esc(t('common.back'))}</a>
      <div class="card mt-3"><div class="card-body"><div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
        <div class="d-flex gap-3 align-items-center">${bloodBadge(r.blood_group)}<div><h1 class="h4 mb-0">${esc(r.hospital)}</h1><span class="text-muted small">${esc(distName(r.district))}${r.upazila ? ', ' + esc(r.upazila) : ''}</span></div></div>
        <div>${r.urgent ? `<span class="badge text-bg-danger me-1">${esc(t('req.urgent'))}</span>` : ''}${statusBadge(r.status)}</div></div><hr>
        <div class="row g-3"><div class="col-md-6"><dl class="mb-0"><dt>${esc(t('req.needed_by'))}</dt><dd>${esc(I18n.dateTime(r.needed_by))}</dd><dt>${esc(t('req.quantity'))}</dt><dd>${esc(qty(r.quantity, r.quantity_unit))}</dd>${r.location_details ? `<dt>${esc(t('req.location'))}</dt><dd>${esc(r.location_details)}</dd>` : ''}<dt>${esc(t('req.posted'))}</dt><dd>${esc(I18n.dateTime(r.created_at))}</dd></dl></div><div class="col-md-6">${side}</div></div></div></div>
      ${act}${owner}
      ${u && !r.is_owner ? `<div class="mt-3 text-end"><button class="btn btn-link text-muted btn-sm" data-act="report" data-id="${r.id}">&#9873; ${esc(t('req.report'))}</button></div>` : ''}
      <div class="notice mt-3">${esc(t('elig.disclaimer'))}</div></div>`;
  }
};
Forms.respond = async f => { const id = f.dataset.id; await Api.post(`/requests/${id}/respond`, { message: Form.data(f).message }); toast(t('msg.responded')); App.reload(); };
Acts.withdraw = async b => { await Api.del(`/requests/${b.dataset.id}/respond`); App.reload(); };
Acts.decide = async b => { await Api.put(`/requests/${b.dataset.id}/responses/${b.dataset.rid}`, { status: b.dataset.op }); toast(t('msg.saved')); App.reload(); };
Changes.reqStatus = async el => { await Api.put('/requests/' + el.dataset.id, { status: el.value }); toast(t('msg.saved')); App.reload(); };
Acts.report = async b => {
  const m = await Dlg.ask({ title: 'req.report', body: 'req.report_body', input: true, label: 'req.report_reason' });
  if (!m) return; await Api.post('/contact', { category: 'report_request', target_id: +b.dataset.id, message: m }); toast(t('msg.reported'));
};

Pages.contact = {
  title: 'nav.contact',
  async render() {
    const u = App.user;
    return `<div class="container py-4" style="max-width:720px"><h1 class="h3">${esc(t('nav.contact'))}</h1><p class="text-muted">${esc(t('contact.sub'))}</p>
      <form class="card card-body" data-form="contact" novalidate><div class="row g-3">
      ${u ? '' : fld('name', 'common.name', { required: true, max: 120, autocomplete: 'name' }) + fld('email', 'common.email', { type: 'email', required: true, max: 190, autocomplete: 'email' })}
      ${fld('category', 'contact.type', { type: 'select', options: opt('contact', t('contact.cat_contact')) + opt('complaint', t('contact.cat_complaint')) })}
      ${fld('subject', 'contact.subject', { required: true, max: 150 })}${fld('message', 'contact.message', { type: 'textarea', rows: 5, max: 2000, required: true })}
      <div class="col-12"><button class="btn btn-danger" type="submit">${esc(t('common.send'))}</button></div></div></form></div>`;
  }
};
Forms.contact = async f => {
  const rules = { subject: ['required', ['min', 3]], message: ['required', ['min', 5]] };
  if (!App.user) { rules.name = ['required', ['min', 2]]; rules.email = ['required', 'email']; }
  if (!Form.validate(f, rules)) return;
  await Api.post('/contact', Form.data(f)); f.reset(); toast(t('msg.sent'));
};

/* ---------- static documents (text lives in the translation files) ---------- */
function docPage(titleKey, prefix, n, intro) {
  return { title: titleKey, async render() {
    return `<div class="container py-4" style="max-width:860px"><h1 class="h3 mb-3">${esc(t(titleKey))}</h1>${intro ? `<p class="text-muted">${esc(t(intro))}</p>` : ''}
      ${Array.from({ length: n }, (_, i) => `<section class="mb-4"><h2 class="h5">${esc(t(`${prefix}.s${i + 1}.h`))}</h2><p>${esc(t(`${prefix}.s${i + 1}.p`))}</p></section>`).join('')}</div>`;
  } };
}
Pages.privacy = docPage('footer.privacy', 'privacy', 7, 'privacy.intro');
Pages.terms = docPage('footer.terms', 'terms', 7, 'terms.intro');
Pages.help = docPage('nav.help', 'help', 6, 'help.intro');
Pages.faq = { title: 'nav.faq', async render() {
  return `<div class="container py-4" style="max-width:860px"><h1 class="h3 mb-3">${esc(t('nav.faq'))}</h1><div class="accordion" id="faqAcc">
    ${Array.from({ length: 8 }, (_, i) => `<div class="accordion-item"><h2 class="accordion-header"><button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faq${i}" aria-expanded="false" aria-controls="faq${i}">${esc(t(`faq.q${i + 1}`))}</button></h2><div id="faq${i}" class="accordion-collapse collapse" data-bs-parent="#faqAcc"><div class="accordion-body">${esc(t(`faq.a${i + 1}`))}</div></div></div>`).join('')}</div></div>`;
} };
