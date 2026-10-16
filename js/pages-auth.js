async function afterAuth(r) {
  Api.setToken(r.token); App.user = r.user;
  if (r.user.lang !== I18n.lang) await I18n.set(r.user.lang, { persist: false }); // adopt saved profile language
  App.renderChrome(); App.pollNotif();
  const back = sessionStorage.getItem('after_login'); sessionStorage.removeItem('after_login');
  location.hash = back || '#/dashboard';
}
const guestOnly = () => App.user ? (location.hash = '#/dashboard', true) : false;

Pages.login = {
  title: 'nav.login',
  async render() {
    if (guestOnly()) return '';
    return `<div class="container py-5" style="max-width:460px"><h1 class="h3 mb-3">${esc(t('nav.login'))}</h1>
      <form class="card card-body" data-form="login" novalidate><div class="row g-3">
      ${fld('email', 'common.email', { type: 'email', required: true, autocomplete: 'username', max: 190 })}${fld('password', 'common.password', { type: 'password', required: true, autocomplete: 'current-password', max: 72 })}
      <div class="col-12"><button class="btn btn-danger w-100" type="submit">${esc(t('nav.login'))}</button></div>
      <div class="col-12 small d-flex justify-content-between"><a href="#/forgot">${esc(t('auth.forgot'))}</a><a href="#/register">${esc(t('auth.no_account'))}</a></div></div></form></div>`;
  }
};
Forms.login = async f => {
  if (!Form.validate(f, { email: ['required', 'email'], password: ['required'] })) return;
  const d = Form.data(f); await afterAuth(await Api.post('/auth/login', { email: d.email, password: d.password })); toast(t('msg.welcome'));
};

Pages.register = {
  title: 'nav.register',
  async render() {
    if (guestOnly()) return '';
    return `<div class="container py-4" style="max-width:820px"><h1 class="h3 mb-1">${esc(t('nav.register'))}</h1><p class="text-muted">${esc(t('reg.sub'))}</p>
      <form class="card card-body" data-form="register" novalidate><div class="row g-3">
      ${fld('full_name', 'common.full_name', { required: true, max: 120, autocomplete: 'name', col: 'col-md-6' })}${fld('email', 'common.email', { type: 'email', required: true, max: 190, autocomplete: 'email', col: 'col-md-6' })}
      ${fld('phone', 'common.phone', { type: 'tel', required: true, max: 16, autocomplete: 'tel', inputmode: 'tel', help: 'reg.phone_help', col: 'col-md-6' })}${fld('dob', 'common.dob', { type: 'date', required: true, col: 'col-md-6', attrs: `max="${dhakaToday()}"` })}
      ${fld('blood_group', 'common.blood_group', { type: 'select', required: true, options: bloodOpts(''), col: 'col-md-4' })}${fld('district', 'common.district', { type: 'select', required: true, options: distOpts(''), col: 'col-md-4' })}${fld('upazila', 'common.upazila', { required: true, max: 80, col: 'col-md-4' })}
      ${fld('address', 'common.address', { required: true, max: 255, autocomplete: 'street-address', help: 'reg.address_help' })}
      ${fld('password', 'common.password', { type: 'password', required: true, max: 72, autocomplete: 'new-password', help: 'val.password_rule', col: 'col-md-6' })}${fld('password2', 'common.password2', { type: 'password', required: true, max: 72, autocomplete: 'new-password', col: 'col-md-6' })}
      <div class="col-12"><label class="form-label" for="f_photo">${esc(t('reg.photo'))}</label><input class="form-control" type="file" id="f_photo" name="photo" accept="image/jpeg,image/png,image/webp"><div class="form-text">${esc(t('reg.photo_help'))}</div></div>
      ${chk('show_in_directory', esc(t('reg.consent_directory')), true)}${chk('share_phone', esc(t('reg.consent_phone')), false)}
      ${chk('accept_terms', `${esc(t('reg.accept_pre'))} <a href="#/terms" target="_blank">${esc(t('footer.terms'))}</a> ${esc(t('reg.accept_and'))} <a href="#/privacy" target="_blank">${esc(t('footer.privacy'))}</a> ${esc(t('reg.accept_post'))}`, false, true)}
      <div class="col-12"><button class="btn btn-danger" type="submit">${esc(t('nav.register'))}</button> <a class="btn btn-link" href="#/login">${esc(t('auth.have_account'))}</a></div></div></form></div>`;
  }
};
Forms.register = async f => {
  if (!Form.validate(f, { full_name: ['required', ['min', 2]], email: ['required', 'email'], phone: ['required', 'phone'], dob: ['required'], blood_group: ['required'], district: ['required'], upazila: ['required', ['min', 2]], address: ['required', ['min', 5]], password: ['required', 'password'], password2: ['required', ['match', 'password']], accept_terms: ['required'] })) return;
  const d = Form.data(f); delete d.password2;
  const photo = f.elements.photo.files[0];
  const r = await Api.post('/auth/register', { ...d, lang: I18n.lang });
  Api.setToken(r.token);
  if (photo) { try { const fd = new FormData(); fd.append('photo', photo); r.user = (await Api.req('POST', '/me/photo', fd)).user; } catch (e) { toast(errMsg(e), 'warning'); } }
  await afterAuth(r); toast(t('msg.registered'));
};

Pages.forgot = {
  title: 'auth.forgot',
  async render() {
    return `<div class="container py-5" style="max-width:460px"><h1 class="h3 mb-3">${esc(t('auth.forgot'))}</h1><p class="text-muted">${esc(t('auth.forgot_sub'))}</p>
      <form class="card card-body" data-form="forgot" novalidate><div class="row g-3">${fld('email', 'common.email', { type: 'email', required: true, max: 190 })}<div class="col-12"><button class="btn btn-danger w-100" type="submit">${esc(t('common.send'))}</button></div></div></form></div>`;
  }
};
Forms.forgot = async f => { if (!Form.validate(f, { email: ['required', 'email'] })) return; await Api.post('/auth/forgot', { email: Form.data(f).email }); toast(t('auth.reset_sent')); f.reset(); };

Pages.reset = {
  title: 'auth.reset',
  async render(ctx) {
    const tk = ctx.query.get('token') || '';
    return `<div class="container py-5" style="max-width:460px"><h1 class="h3 mb-3">${esc(t('auth.reset'))}</h1>
      <form class="card card-body" data-form="reset" novalidate><input type="hidden" name="token" value="${esc(tk)}"><div class="row g-3">
      ${fld('password', 'auth.new_password', { type: 'password', required: true, max: 72, autocomplete: 'new-password', help: 'val.password_rule' })}${fld('password2', 'common.password2', { type: 'password', required: true, max: 72, autocomplete: 'new-password' })}
      <div class="col-12"><button class="btn btn-danger w-100" type="submit">${esc(t('common.save'))}</button></div></div></form></div>`;
  }
};
Forms.reset = async f => {
  if (!Form.validate(f, { password: ['required', 'password'], password2: ['required', ['match', 'password']] })) return;
  const d = Form.data(f); await Api.post('/auth/reset', { token: d.token, password: d.password }); toast(t('auth.reset_done')); location.hash = '#/login';
};
