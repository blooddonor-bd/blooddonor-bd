class ApiError extends Error {
  constructor(code, status, fields, message) { super(message || code); this.code = code; this.status = status; this.fields = fields || null; }
}
const Api = {
  token: localStorage.getItem('token'),
  setToken(tk) { this.token = tk; tk ? localStorage.setItem('token', tk) : localStorage.removeItem('token'); },
  async req(method, path, body, opts = {}) {
    const headers = { Accept: 'application/json', 'X-Lang': I18n.lang };
    if (this.token) headers.Authorization = 'Bearer ' + this.token;
    const init = { method, headers };
    if (body instanceof FormData) init.body = body;
    else if (body !== undefined) { headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(body); }
    let res;
    try { res = await fetch(APP_CONFIG.API_BASE + path, init); } catch (e) { throw new ApiError('network', 0); }
    if (opts.blob) { if (!res.ok) throw new ApiError('not_found', res.status); return res.blob(); }
    const data = await res.json().catch(() => null);
    if (!data || !data.ok) {
      const e = data && data.error || {};
      if (res.status === 401 && this.token) { this.setToken(null); App.signedOut(); }
      throw new ApiError(e.code || 'server_error', res.status, e.fields, e.message);
    }
    return data;
  },
  qs(p) { const q = new URLSearchParams(); Object.entries(p || {}).forEach(([k, v]) => { if (v !== '' && v != null && v !== false) q.set(k, v); }); const s = q.toString(); return s ? '?' + s : ''; },
  get(path, params, o) { return this.req('GET', path + this.qs(params), undefined, o); },
  post(path, body) { return this.req('POST', path, body ?? {}); },
  put(path, body) { return this.req('PUT', path, body ?? {}); },
  del(path, body) { return this.req('DELETE', path, body ?? {}); }
};
