(function () {
  'use strict';

  const state = {
    me: null, csrf: null, cfg: null, staff: [],
    view: 'dashboard', range: 'all', csRange: 'all', chartMode: 'week',
    q: '', status: '', stream: '', coaching: '', source: '', assigned: '', counselling: '', followup: '', from: '', to: '',
    sort: 'enq_date', dir: 'desc', page: 1, per: 50,
    drawer: null,
  };

  const STATUS_CLASS = {
    'New': 'new', 'Admission Confirmed': 'confirmed', 'Under Discussion': 'discuss',
    'Exploring Other Options': 'explore', 'Not Interested': 'no',
  };
  const STATUS_COLOR = {
    'New': 'var(--st-new)', 'Admission Confirmed': 'var(--st-confirmed)', 'Under Discussion': 'var(--st-discuss)',
    'Exploring Other Options': 'var(--st-explore)', 'Not Interested': 'var(--st-no)',
  };
  const PENDING = ['New', 'Under Discussion', 'Exploring Other Options'];
  const up = (s) => String(s == null ? '' : s).toUpperCase();
  const ROLE_NAMES = { admin: 'Admin', counsellor: 'Counsellor', viewer: 'Viewer' };
  const titleCase = (s) => String(s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const roleName = (r) => ROLE_NAMES[r] || (r ? r[0].toUpperCase() + r.slice(1) : '');

  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'value') el.value = v;
      else if (k === 'checked') el.checked = !!v;
      else if (k === 'disabled') el.disabled = !!v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid == null || kid === false) continue;
      el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }

  function svg(tag, attrs, ...kids) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs || {})) el.setAttribute(k, v);
    kids.flat().forEach((k) => k && el.append(k));
    return el;
  }

  const $app = document.getElementById('app');

  function toast(msg, bad) {
    const t = h('div', { class: 'toast' + (bad ? ' bad' : '') }, msg);
    document.getElementById('toasts').append(t);
    setTimeout(() => t.remove(), bad ? 5000 : 2600);
  }

  async function api(path, opts = {}) {
    const o = { method: opts.method || 'GET', headers: {}, credentials: 'same-origin' };
    if (opts.body !== undefined) {
      o.body = JSON.stringify(opts.body);
      o.headers['Content-Type'] = 'application/json';
    }
    if (opts.blob) {
      o.body = opts.blob;
      o.headers['Content-Type'] = opts.blob.type || 'application/octet-stream';
    }
    if (opts.signal) o.signal = opts.signal;
    if (state.csrf) o.headers['X-CSRF-Token'] = state.csrf;
    let r;
    try {
      r = await fetch(path, o);
    } catch (netErr) {
      if (netErr && netErr.name === 'AbortError') throw netErr;
      throw new Error('Could not reach the server. Check the internet connection and try again.');
    }
    let data = null;
    try { data = await r.json(); } catch (e) { data = null; }
    if (r.status === 401 && path !== '/api/login') {
      state.me = null;
      showLogin('Your session has ended. Please sign in again.');
      throw new Error('auth');
    }
    if (r.status === 403 && data && data.must_change && path !== '/api/change-password') {
      state.me = null;
      showLogin('Your password was reset by an administrator. Please sign in with the temporary password.');
      throw new Error('auth');
    }
    if (!r.ok) {
      const e = new Error((data && data.error) || 'Request failed');
      e.status = r.status;
      e.data = data;
      throw e;
    }
    return data;
  }

  async function download(path) {
    toast('Preparing download…');
    const r = await fetch(path, { credentials: 'same-origin' });
    if (!r.ok) {
      let data = null;
      try { data = await r.json(); } catch (e) { data = null; }
      if (r.status === 401) {
        state.me = null;
        showLogin('Your session has ended. Please sign in again.');
        throw new Error('auth');
      }
      throw new Error((data && data.error) || 'Download failed');
    }
    const blob = await r.blob();
    const m = /filename="?([^";]+)"?/i.exec(r.headers.get('Content-Disposition') || '');
    const a = h('a', { href: URL.createObjectURL(blob), download: m ? m[1] : 'download', style: 'display:none' });
    document.body.append(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 15000);
  }

  const layers = [];
  function layerOn(root, panel, label, onEscape) {
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', label);
    const opener = document.activeElement;
    const frozen = [];
    Array.from(document.body.children).forEach((el) => {
      if (el !== root && el.id !== 'toasts' && el.tagName !== 'SCRIPT' && !el.inert) { el.inert = true; frozen.push(el); }
    });
    document.body.append(root);
    root._esc = onEscape;
    layers.push(root);
    root._off = () => {
      const at = layers.indexOf(root);
      if (at >= 0) layers.splice(at, 1);
      frozen.forEach((el) => { el.inert = false; });
      root.remove();
      if (opener && opener.isConnected && typeof opener.focus === 'function') opener.focus();
    };
  }
  function layerOff(root) {
    if (root._off) root._off(); else root.remove();
  }
  function trapTab(e, root) {
    const items = Array.from(root.querySelectorAll('button, [href], input, select, textarea, [tabindex]'))
      .filter((el) => !el.disabled && el.tabIndex >= 0 && el.getClientRects().length > 0);
    if (!items.length) { e.preventDefault(); return; }
    const first = items[0], last = items[items.length - 1], at = document.activeElement;
    if (!root.contains(at)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
    else if (e.shiftKey && at === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && at === last) { e.preventDefault(); first.focus(); }
  }
  function onActivate(fn) {
    return (e) => {
      if (e.target !== e.currentTarget) return;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(e); }
    };
  }

  function fail(e) {
    if (e && e.message !== 'auth') toast(e.message || 'Something went wrong', true);
  }

  function todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function fmtDate(s) {
    if (!s) return '';
    const p = s.slice(0, 10).split('-');
    return p.length === 3 ? p[2] + '-' + p[1] + '-' + p[0] : s;
  }
  function fmtDateTime(s) {
    return s ? fmtDate(s) + ' ' + s.slice(11, 16) : '';
  }
  function pctText(p, grade) {
    if (p != null) return p.toFixed(1) + '%';
    return grade || '';
  }
  function can(p) { return !!(state.cfg && state.cfg.perms[p]); }
  function role() { return state.me ? state.me.role : ''; }

  function confirmModal(title, text, okLabel, danger) {
    return new Promise((resolve) => {
      const done = (v) => { layerOff(bg); resolve(v); };
      const cancel = h('button', { class: 'btn', onclick: () => done(false) }, 'Cancel');
      const ok = h('button', { class: 'btn ' + (danger ? 'danger' : 'primary'), onclick: () => done(true) }, okLabel || 'OK');
      const panel = h('div', { class: 'modal' }, h('h3', {}, title), h('p', {}, text), h('div', { class: 'actions' }, cancel, ok));
      const bg = h('div', { class: 'modal-bg' }, panel);
      layerOn(bg, panel, title, () => done(false));
      (danger ? cancel : ok).focus();
    });
  }

  function rememberedUser() {
    try { return localStorage.getItem('rv-user') || ''; } catch (e) { return ''; }
  }
  function rememberUser(name) {
    try {
      if (name) localStorage.setItem('rv-user', name); else localStorage.removeItem('rv-user');
    } catch (e) { return; }
  }

  function forgotModal() {
    const close = () => layerOff(bg);
    const ok = h('button', { class: 'btn primary', type: 'button', onclick: close }, 'Got it');
    const panel = h('div', { class: 'modal login-dialog' },
      h('h3', {}, 'Forgot your password?'),
      h('p', {}, 'Please ask your administrator to reset it. They can do this from Users, using Reset password, and will give you a temporary password. You will be asked to choose a new one when you sign in.'),
      h('p', { class: 'note' }, 'Administrator: if you cannot sign in at all, see "Forgot the admin password" in the guide (GUIDE.md).'),
      h('div', { class: 'actions' }, ok));
    const bg = h('div', { class: 'modal-bg', onmousedown: (e) => { if (e.target === bg) close(); } }, panel);
    layerOn(bg, panel, 'Forgot your password?', close);
    ok.focus();
  }

  function showLogin(message) {
    closeDrawer(true);
    document.getElementById('printArea').replaceChildren();
    document.querySelectorAll('.modal-bg').forEach((m) => layerOff(m));
    Array.from(document.body.children).forEach((el) => { el.inert = false; });
    const saved = rememberedUser();
    const err = h('div', { class: 'error-box', role: 'alert', hidden: !message }, message || '');
    const user = h('input', { id: 'login-user', type: 'text', autocomplete: 'username', autocapitalize: 'none', autocorrect: 'off', spellcheck: 'false', required: true, placeholder: 'Enter your username', value: saved });
    const pass = h('input', { id: 'login-pass', type: 'password', autocomplete: 'current-password', required: true, placeholder: 'Enter your password' });
    const eye = h('button', { type: 'button', class: 'eye', 'aria-label': 'Show password', onclick: () => {
      const show = pass.type === 'password';
      pass.type = show ? 'text' : 'password';
      eye.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      eye.replaceChildren(icon(show ? 'eye' : 'eyeoff', 22));
      pass.focus();
    } }, icon('eyeoff', 22));
    const keep = h('input', { id: 'login-remember', type: 'checkbox', checked: !!saved });
    const label = h('span', {}, 'Sign in');
    const btn = h('button', { class: 'signin', type: 'submit' }, label, icon('arrow', 22));
    const form = h('form', { novalidate: true, onsubmit: async (e) => {
      e.preventDefault();
      if (!user.value.trim() || !pass.value) {
        err.textContent = !user.value.trim() ? 'Enter your username.' : 'Enter your password.';
        err.hidden = false;
        (!user.value.trim() ? user : pass).focus();
        return;
      }
      btn.disabled = true;
      label.textContent = 'Signing in…';
      err.hidden = true;
      try {
        const res = await api('/api/login', { method: 'POST', body: { username: user.value.trim(), password: pass.value, remember: keep.checked } });
        rememberUser(keep.checked ? user.value.trim() : '');
        await start(res);
      } catch (ex) {
        if (ex.message !== 'auth') { err.textContent = ex.message; err.hidden = false; }
        btn.disabled = false;
        label.textContent = 'Sign in';
        pass.select();
      }
    } },
      err,
      h('div', { class: 'field' },
        h('label', { class: 'lbl', for: 'login-user' }, 'Username'),
        h('div', { class: 'control' }, icon('user', 22), user)),
      h('div', { class: 'field' },
        h('label', { class: 'lbl', for: 'login-pass' }, 'Password'),
        h('div', { class: 'control' }, icon('lockdot', 22), pass, eye)),
      h('div', { class: 'row' },
        h('label', { class: 'remember', for: 'login-remember' }, keep, h('span', { class: 'box' }, icon('check', 16)), 'Remember me'),
        h('button', { type: 'button', class: 'link', onclick: forgotModal }, 'Forgot password?')),
      btn);
    $app.replaceChildren(h('main', { class: 'login-page' },
      h('section', { class: 'login-brand', 'aria-label': 'Sri RV PU College' },
        h('img', { class: 'crest', src: '/static/logo-navy.png', alt: 'Sri RV PU College crest', width: 560, height: 476 }),
        h('span', { class: 'vrule', 'aria-hidden': 'true' }),
        h('div', { class: 'words' },
          h('p', { class: 'college' }, 'Sri RV PU College'),
          h('p', { class: 'product' }, 'Admission Manager'),
          h('span', { class: 'gold', 'aria-hidden': 'true' }),
          h('p', { class: 'tagline' }, 'Knowledge empowers', h('br'), 'a brighter tomorrow'))),
      h('section', { class: 'login-card', 'aria-labelledby': 'login-title' },
        h('span', { class: 'bar', 'aria-hidden': 'true' }),
        h('h1', { id: 'login-title' }, 'Welcome back'),
        h('p', { class: 'lead' }, 'Sign in to your admission dashboard'),
        form,
        h('div', { class: 'staff' }, h('span', {}, icon('shield', 22), 'Authorized staff only')))));
    if (window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      setTimeout(() => (saved ? pass : user).focus(), 50);
    }
  }

  async function start(session) {
    state.me = session.user;
    state.csrf = session.csrf;
    state.cfg = session.config;
    if (state.me.must_change) {
      renderShell();
      await passwordModal(true);
    }
    try { state.staff = await api('/api/users/basic'); } catch (e) { state.staff = []; }
    renderShell();
    go(state.view);
  }

  function passwordModal(forced) {
    return new Promise((resolve) => {
      const err = h('div', { class: 'error-box', hidden: true });
      const cur = h('input', { id: 'pw-cur', type: 'password', autocomplete: 'current-password' });
      const n1 = h('input', { id: 'pw-new', type: 'password', autocomplete: 'new-password' });
      const n2 = h('input', { id: 'pw-new2', type: 'password', autocomplete: 'new-password' });
      const close = () => { layerOff(bg); resolve(); };
      const save = h('button', { class: 'btn primary', onclick: async () => {
        err.hidden = true;
        if (n1.value !== n2.value) { err.textContent = 'New passwords do not match.'; err.hidden = false; return; }
        try {
          await api('/api/change-password', { method: 'POST', body: { current: cur.value, new: n1.value } });
          state.me.must_change = false;
          toast('Password changed');
          close();
        } catch (e) { err.textContent = e.message; err.hidden = false; }
      } }, 'Change password');
      const panel = h('div', { class: 'modal' },
        h('h3', {}, forced ? 'Set a new password' : 'Change password'),
        h('p', {}, forced ? 'For security, please choose your own password before continuing. Use at least 8 characters with letters and numbers.' : 'Use at least 8 characters with letters and numbers.'),
        h('div', { class: 'stack' }, err,
          h('div', {}, h('label', { class: 'fld', for: 'pw-cur' }, forced ? 'Temporary password' : 'Current password'), cur),
          h('div', {}, h('label', { class: 'fld', for: 'pw-new' }, 'New password'), n1),
          h('div', {}, h('label', { class: 'fld', for: 'pw-new2' }, 'Confirm new password'), n2)),
        h('div', { class: 'actions' },
          forced ? h('button', { class: 'btn', onclick: () => logout() }, 'Sign out') : h('button', { class: 'btn', onclick: close }, 'Cancel'),
          save));
      const bg = h('div', { class: 'modal-bg' }, panel);
      layerOn(bg, panel, forced ? 'Set a new password' : 'Change password', forced ? null : close);
      cur.focus();
    });
  }

  async function logout() {
    await api('/api/logout', { method: 'POST', body: {} }).catch(() => null);
    state.me = null;
    state.csrf = null;
    showLogin();
  }

  const ICONS = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
    list: '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M9 12h6M9 16h6"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    activity: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
    db: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    print: '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    lockdot: '<rect x="4" y="11" width="16" height="10" rx="2.5"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/><circle cx="12" cy="16" r="1.1" fill="currentColor" stroke="none"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>',
    arrow: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9.6 14.2 12 8.6l2.4 5.6M10.5 12.4h3"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
    pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  };
  function icon(name, size) {
    const s = size || 18;
    const el = svg('svg', { viewBox: '0 0 24 24', width: s, height: s, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' });
    el.innerHTML = ICONS[name] || '';
    return el;
  }
  const AVATAR_TONES = [['#f3dfd5', '#9b4a2c'], ['#e4ebd8', '#4f6c3a'], ['#dbe7f2', '#3a6592'], ['#f0dce5', '#94406a'], ['#f1e4d0', '#855c2a'], ['#e6e4da', '#3d3d3a']];
  function avatar(name, size) {
    const sz = size || 36;
    let hash = 0;
    for (const c of name || '') hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
    const ini = (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
    const tone = name === 'Unassigned' ? ['#efede4', '#696861'] : AVATAR_TONES[hash % AVATAR_TONES.length];
    return h('span', { class: 'avatar', style: `background:${tone[0]};color:${tone[1]};width:${sz}px;height:${sz}px;font-size:${Math.round(sz * 0.38)}px` }, ini);
  }

  const NAV = [
    { id: 'dashboard', label: 'Dashboard', ico: 'grid' },
    { id: 'enquiries', label: 'Enquiries', ico: 'list' },
    { id: 'followups', label: 'Follow-ups', ico: 'bell' },
    { id: 'users', label: 'Users', ico: 'users', admin: true },
    { id: 'audit', label: 'Activity log', ico: 'activity', admin: true },
  ];

  let $content, $topTitle, $topActions, $badge, $pagehead;

  function renderShell() {
    const college = state.cfg.college;
    const brand = (where) => h('div', { class: 'brand ' + where }, h('img', { src: '/static/logo-navy.png', alt: '' }),
      h('div', { class: 'name' }, college, h('small', {}, 'Admission Manager')));
    const navBtn = (n) => h('button', { 'data-nav': n.id, class: n.id === state.view ? 'active' : '', onclick: () => (n.id === 'enquiries' ? openFiltered({}) : go(n.id)) }, icon(n.ico), n.label);
    const nav = h('div', { class: 'nav' },
      NAV.filter((n) => !n.admin).map(navBtn),
      role() === 'admin' ? [h('hr'), NAV.filter((n) => n.admin).map(navBtn)] : null,
      h('hr'),
      h('button', { onclick: blankFormModal }, icon('print'), 'Print blank form'),
      h('button', { onclick: () => passwordModal(false) }, icon('lock'), 'Change password'),
      h('button', { onclick: logout }, icon('out'), 'Sign out'));
    $topTitle = h('h1', {});
    $topActions = h('div', { style: 'display:flex;gap:10px;align-items:center;flex-wrap:wrap' });
    $content = h('div', { class: 'content' });
    $badge = h('span', { class: 'badge', hidden: true });
    const umenu = h('div', { class: 'umenu', hidden: true, onclick: (e) => e.stopPropagation() },
      h('div', { class: 'uinfo' }, h('b', {}, up(state.me.full_name)), h('span', {}, roleName(state.me.role))),
      h('button', { onclick: () => { umenu.hidden = true; passwordModal(false); } }, 'Change password'),
      h('button', { onclick: logout }, 'Sign out'));
    const gs = h('input', { type: 'search', placeholder: 'Search students, mobile numbers, enquiry no…', 'aria-label': 'Search enquiries', onkeydown: (e) => {
      if (e.key === 'Enter' && gs.value.trim()) { const v = gs.value.trim(); gs.value = ''; openFiltered({ q: v }); }
    } });
    $app.replaceChildren(h('div', { class: 'app' },
      h('header', { class: 'gtop' },
        brand('in-top'),
        h('div', { class: 'gsearch' }, icon('search', 16), gs),
        h('div', { class: 'gright' },
          can('create') ? h('button', { class: 'btn primary', onclick: newEntry }, icon('plus', 15), 'New Entry') : null,
          h('button', { class: 'iconbtn', title: 'Follow-ups due', 'aria-label': 'Follow-ups due', onclick: () => openFiltered({ followup: 'due' }) }, icon('bell', 19), $badge),
          h('div', { class: 'uwrap' },
            h('button', { class: 'avbtn', 'aria-label': 'Account menu', onclick: (e) => { e.stopPropagation(); umenu.hidden = !umenu.hidden; } }, avatar(state.me.full_name, 38)),
            umenu))),
      h('div', { class: 'layout' },
        h('aside', { class: 'side' }, brand('in-side'), nav, h('div', { class: 'grow' })),
        h('main', { class: 'main' }, ($pagehead = h('div', { class: 'pagehead' }, $topTitle, $topActions)), $content))));
  }

  async function refreshBell() {
    try {
      const s = await api('/api/stats?range=all');
      const n = s.overdue + s.due_today;
      $badge.textContent = n > 99 ? '99+' : n;
      $badge.hidden = !n;
    } catch (e) {
      return;
    }
  }

  function go(view) {
    state.view = view;
    if (view === 'followups') { openFiltered({ followup: 'due' }); return; }
    const navId = view === 'enquiries' && state.followup ? 'followups' : view;
    document.querySelectorAll('[data-nav]').forEach((b) => b.classList.toggle('active', b.dataset.nav === navId));
    $pagehead.hidden = view === 'dashboard';
    $topActions.replaceChildren();
    $content.className = 'content' + (view === 'enquiries' ? ' grid-view' : '');
    $content.replaceChildren();
    const fn = { dashboard: renderDashboard, enquiries: renderEnquiries, users: renderUsers, audit: renderAudit }[view];
    fn().catch(fail);
    refreshBell();
  }

  function pill(status) {
    return h('span', { class: 'pill s-' + STATUS_CLASS[status] }, status);
  }

  function kpi(label, value, unit, dl, onclick) {
    return h('div', { class: 'kpi', role: 'button', tabindex: 0, onclick, onkeydown: onActivate(onclick) },
      h('div', { class: 'kl' }, label),
      h('div', { class: 'kv' }, h('b', {}, value), h('span', { class: 'u' }, unit), dl));
  }
  function trendDelta(pair, inverse) {
    const now = pair[0], prev = pair[1];
    let txt, kind;
    if (!now && !prev) { txt = '0%'; kind = 'flat'; }
    else if (!prev) { txt = '+' + now + ' ↑'; kind = inverse ? 'down' : 'up'; }
    else {
      const p = Math.round(((now - prev) / prev) * 100);
      txt = (p > 0 ? '+' : '') + p + '%' + (p > 0 ? ' ↑' : p < 0 ? ' ↓' : '');
      kind = p === 0 ? 'flat' : ((p > 0) !== !!inverse ? 'up' : 'down');
    }
    return h('span', { class: 'delta ' + kind }, txt);
  }

  const C_ENQ = '#c96442', C_OK = '#788c5d';

  function areaChart(labels, titles, a, b, narrow) {
    const W = narrow ? 420 : 700, H = 250, L = 6, R = 6, T = 14, B = 30, n = labels.length;
    const top = Math.max(1, ...a, ...b);
    const max = top * 1.18;
    const base = H - B;
    const x = (i) => L + (n < 2 ? 0 : (i * (W - L - R)) / (n - 1));
    const y = (v) => T + (H - T - B) * (1 - v / max);
    const f = (v) => v.toFixed(1);
    const curve = (vals) => {
      const p = vals.map((v, i) => [x(i), y(v)]);
      let d = `M${f(p[0][0])},${f(p[0][1])}`;
      for (let i = 0; i < p.length - 1; i++) {
        const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
        const c1y = Math.min(base, Math.max(T, p1[1] + (p2[1] - p0[1]) / 6));
        const c2y = Math.min(base, Math.max(T, p2[1] - (p3[1] - p1[1]) / 6));
        d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)},${f(c1y)} ${f(p2[0] - (p3[0] - p1[0]) / 6)},${f(c2y)} ${f(p2[0])},${f(p2[1])}`;
      }
      return d;
    };
    const xl = labels.map((lb, i) => {
      const first = i === 0, last = i === n - 1 && n > 1;
      return svg('text', { x: first ? L : last ? W - R : x(i), y: H - 8, 'text-anchor': first ? 'start' : last ? 'end' : 'middle', 'font-size': narrow ? 15 : 12, fill: '#6b6a64' }, lb);
    });
    const area = `${curve(a)}L${f(x(n - 1))},${base}L${f(x(0))},${base}Z`;
    const vline = svg('line', { y1: T, y2: base, stroke: '#dcd9cc', 'stroke-dasharray': '3 3', visibility: 'hidden' });
    const baseline = svg('line', { x1: L, x2: W - R, y1: base, y2: base, stroke: '#ebe9df' });
    const d1 = svg('circle', { r: 4.5, fill: C_ENQ, stroke: '#fff', 'stroke-width': 2, visibility: 'hidden' });
    const hit = svg('rect', { x: 0, y: 0, width: W, height: base, fill: 'transparent' });
    const chart = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Enquiries over time' },
      svg('defs', {}, svg('linearGradient', { id: 'agrad', x1: 0, y1: 0, x2: 0, y2: 1 },
        svg('stop', { offset: '0%', 'stop-color': C_ENQ, 'stop-opacity': 0.16 }), svg('stop', { offset: '100%', 'stop-color': C_ENQ, 'stop-opacity': 0 }))),
      baseline,
      svg('path', { d: area, fill: 'url(#agrad)' }),
      svg('path', { d: curve(b), fill: 'none', stroke: C_OK, 'stroke-width': 2, 'stroke-linecap': 'round' }),
      svg('path', { d: curve(a), fill: 'none', stroke: C_ENQ, 'stroke-width': 2, 'stroke-linecap': 'round' }),
      xl, vline, d1, hit);
    const tip = h('div', { class: 'tip' });
    const show = (i) => {
      vline.setAttribute('x1', x(i)); vline.setAttribute('x2', x(i)); vline.setAttribute('visibility', 'visible');
      d1.setAttribute('cx', x(i)); d1.setAttribute('cy', y(a[i])); d1.setAttribute('visibility', 'visible');
      tip.style.left = Math.min(88, Math.max(12, (x(i) / W) * 100)) + '%';
      tip.style.top = (y(a[i]) / H) * 100 + '%';
      tip.classList.toggle('below', y(a[i]) / H < 0.34);
      tip.replaceChildren(h('div', { class: 'tl' }, titles[i]), h('div', { class: 'tv' }, a[i]), h('div', { class: 'ts' }, b[i] + ' Confirmed'));
    };
    hit.addEventListener('mousemove', (e) => {
      const r = chart.getBoundingClientRect();
      const px = ((e.clientX - r.left) / r.width) * W;
      show(Math.max(0, Math.min(n - 1, Math.round((px - L) / ((W - L - R) / Math.max(1, n - 1))))));
    });
    show(a.indexOf(Math.max(...a)) >= 0 ? a.indexOf(Math.max(...a)) : n - 1);
    return h('div', {},
      h('div', { class: 'chart-box' }, chart, tip),
      h('div', { class: 'chart-legend' }, h('span', {}, h('span', { class: 'dot', style: 'background:' + C_ENQ }), 'Enquiries'), h('span', {}, h('span', { class: 'dot', style: 'background:' + C_OK }), 'Admission Confirmed')));
  }

  function openFiltered(patch) {
    Object.assign(state, { q: '', status: '', stream: '', coaching: '', source: '', assigned: '', counselling: '', followup: '', from: '', to: '', page: 1 }, patch);
    go('enquiries');
  }

  function dayName(iso, short) {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { weekday: short ? 'short' : 'long' });
  }
  function dayTitle(iso) {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  async function renderDashboard() {
    const s = await api('/api/stats?range=all');
    const cs = state.csRange === 'all' ? s : await api('/api/stats?range=' + state.csRange);
    const bs = s.by_status, tr = s.trend;
    const open = bs['New'] + bs['Under Discussion'] + bs['Exploring Other Options'];
    const cards = h('div', { class: 'cards' },
      kpi('Total Enquiries', s.total, 'Enquiries', trendDelta(tr.total), () => openFiltered({})),
      kpi('Admission Confirmed', bs['Admission Confirmed'], 'Admissions', trendDelta(tr.confirmed), () => openFiltered({ status: 'Admission Confirmed' })),
      kpi('Open Enquiries', open, 'Deciding', trendDelta(tr.open), () => openFiltered({ status: 'open' })),
      kpi('Not Interested', bs['Not Interested'], 'Enquiries', trendDelta(tr.lost, true), () => openFiltered({ status: 'Not Interested' })));

    const chartHost = h('div', {});
    const drawChart = () => {
      const narrow = window.innerWidth < 600;
      let labels, titles, a, b;
      if (state.chartMode === 'year') {
        labels = s.monthly.map((m) => m.label); titles = s.monthly.map((m) => m.title); a = s.monthly.map((m) => m.count); b = s.monthly.map((m) => m.confirmed);
      } else {
        const d = s.daily.slice(-7);
        labels = d.map((x) => dayName(x.date, narrow)); titles = d.map((x) => dayTitle(x.date)); a = d.map((x) => x.count); b = d.map((x) => x.confirmed);
      }
      chartHost.replaceChildren(areaChart(labels, titles, a, b, narrow));
    };
    const modes = [['year', 'Yearly'], ['week', 'Week']];
    const segBtns = modes.map(([k, l]) => h('button', { class: state.chartMode === k ? 'on' : '', onclick: () => {
      state.chartMode = k; segBtns.forEach((bn, i) => bn.classList.toggle('on', modes[i][0] === k)); drawChart();
    } }, l));
    drawChart();
    const chartPanel = h('div', { class: 'panel w8' },
      h('div', { class: 'phead' }, h('h2', {}, 'Total Enquiries'), h('div', { class: 'seg' }, segBtns)), chartHost);

    const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
    const counselled = s.counselled, admitted = bs['Admission Confirmed'];
    const frow = (label, value, of, color, onclick) =>
      h('div', { class: 'frow', role: 'button', tabindex: 0, onclick, onkeydown: onActivate(onclick) },
        h('div', { class: 'top' }, h('span', {}, label), h('span', { class: 'cnt' }, value, h('small', {}, ' · ' + pct(value, of) + '%'))),
        h('div', { class: 'src-track' }, h('div', { class: 'src-fill', style: `width:${pct(value, of)}%;background:${color}` })));
    const funnelPanel = h('div', { class: 'panel w4 fun' },
      h('div', { class: 'phead' }, h('h2', {}, 'Counselling funnel')),
      frow('Enquiries', s.total, s.total, '#d3d0c2', () => openFiltered({})),
      frow('Counselled', counselled, s.total, '#c96442', () => openFiltered({ counselling: 'done' })),
      frow('Admitted', admitted, s.total, '#788c5d', () => openFiltered({ status: 'Admission Confirmed' })),
      h('div', { class: 'big' }, h('b', {}, pct(admitted, counselled) + '%'), h('span', {}, 'Of Counselled Students Took Admission')));

    const counsellorPanel = can('counsellor_track') ? buildCounsellorPanel(cs) : null;
    const followPanel = counsellorPanel ? followSmall(s) : followWide(s);

    const hr = new Date().getHours();
    const first = (state.me.full_name || '').trim().split(/\s+/)[0].toLowerCase();
    const greet = h('h1', { class: 'greet' }, (hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening') + (first ? ', ' + first[0].toUpperCase() + first.slice(1) : ''));
    const webBanner = s.web_new ? h('button', { class: 'webbanner', onclick: () => openFiltered({ source: 'Website', status: 'New' }) },
      h('span', { class: 'wb-dot', 'aria-hidden': 'true' }),
      h('span', {}, h('b', {}, s.web_new + (s.web_new === 1 ? ' new enquiry' : ' new enquiries') + ' from the website'), ' waiting for a first call'),
      h('span', { class: 'wb-go' }, 'View ›')) : null;
    $content.replaceChildren(greet, webBanner, cards,
      h('div', { class: 'panels' }, chartPanel, funnelPanel),
      h('div', { class: 'panels' }, counsellorPanel, followPanel));
  }

  function telLink(num) {
    return num ? h('a', { href: 'tel:+91' + num, class: 'tel', onclick: (e) => e.stopPropagation() }, num) : '';
  }

  function followSmall(s) {
    return h('div', { class: 'panel w4' },
      h('div', { class: 'phead', style: 'margin-bottom:8px' }, h('div', {}, h('h2', {}, 'Follow-ups'), h('div', { class: 'sub' }, 'Overdue and next 7 days')),
        s.overdue + s.due_today ? h('button', { class: 'linkbtn', onclick: () => openFiltered({ followup: 'due' }) }, `${s.overdue + s.due_today} due ›`) : null),
      s.follow_ups.length ? s.follow_ups.slice(0, 5).map((f) => {
        const late = f.follow_up_date < todayStr();
        return h('div', { class: 'list-row', role: 'button', tabindex: 0, onclick: () => openDrawer(f.id), onkeydown: onActivate(() => openDrawer(f.id)) },
          h('div', {}, h('div', { class: 'nm' }, f.student_name), h('div', { class: 'meta' }, f.father_mobile || f.mother_mobile || f.enq_no)),
          h('div', { class: 'right' + (late ? ' late' : '') }, fmtDate(f.follow_up_date)));
      }) : h('div', { class: 'empty' }, 'Nothing pending'));
  }

  // Counsellors and viewers do not see the counsellor track; follow-ups take the whole row instead.
  function followWide(s) {
    const t = todayStr();
    const due = s.overdue + s.due_today;
    const rows = s.follow_ups.slice(0, 12);
    const whenTxt = (d) => (d < t ? 'Overdue · ' : d === t ? 'Today · ' : '') + fmtDate(d);
    return h('div', { class: 'panel w12 fwide' },
      h('div', { class: 'phead' },
        h('div', {}, h('h2', {}, 'Follow-ups'), h('div', { class: 'sub' }, 'Overdue, today and the next 7 days')),
        h('div', { class: 'fstats' },
          h('button', { class: 'fstat late', onclick: () => openFiltered({ followup: 'overdue' }) }, h('b', {}, s.overdue), 'Overdue'),
          h('button', { class: 'fstat', onclick: () => openFiltered({ followup: 'today' }) }, h('b', {}, s.due_today), 'Today'),
          h('button', { class: 'linkbtn', onclick: () => openFiltered({ followup: 'week' }) }, 'All upcoming ›'))),
      rows.length ? h('div', { class: 'tscroll' }, h('table', { class: 'ftable' },
        h('thead', {}, h('tr', {}, ['Student', 'Mobile', 'Status', 'Counsellor', 'Follow-up'].map((x) => h('th', {}, x)))),
        h('tbody', {}, rows.map((f) => {
          const late = f.follow_up_date < t;
          return h('tr', { tabindex: 0, onclick: () => openDrawer(f.id), onkeydown: onActivate(() => openDrawer(f.id)) },
            h('td', { class: 'c-stu' }, h('div', { class: 'nm' }, f.student_name), h('div', { class: 'meta nw' }, f.enq_no)),
            h('td', { class: 'c-mob nw' }, telLink(f.father_mobile || f.mother_mobile)),
            h('td', { class: 'c-st' }, pill(f.status)),
            h('td', { class: 'c-co' }, up(f.assigned_to) || h('span', { class: 'muted' }, 'Unassigned')),
            h('td', { class: 'c-fu nw' + (late ? ' late' : f.follow_up_date === t ? ' today' : '') }, whenTxt(f.follow_up_date)));
        })))) : h('div', { class: 'empty' }, due ? '' : 'Nothing pending. Well done.'),
      s.follow_ups.length > rows.length ? h('div', { class: 'fmore' }, h('button', { class: 'linkbtn', onclick: () => openFiltered({ followup: 'week' }) }, 'See all follow-ups ›')) : null);
  }

  function buildCounsellorPanel(cs) {
    const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
    const csHost = h('div', { class: 'tscroll' });
    const drawCounsellors = (list) => {
      if (!list.length) { csHost.replaceChildren(h('div', { class: 'empty' }, 'No counsellors yet. Add users with the Counsellor role and assign enquiries to them.')); return; }
      csHost.replaceChildren(h('table', { class: 'ctable' },
        h('thead', {}, h('tr', {}, ['Counsellor', 'Counselled', 'Admitted', 'Conversion'].map((x, i) => h('th', { class: i ? 'num' : '' }, x)))),
        h('tbody', {}, list.map((c) => h('tr', { class: c.name === 'Unassigned' ? 'un' : '', tabindex: c.name === 'Unassigned' ? null : 0,
          onclick: c.name === 'Unassigned' ? null : () => openFiltered({ assigned: c.name }),
          onkeydown: c.name === 'Unassigned' ? null : onActivate(() => openFiltered({ assigned: c.name })) },
          h('td', {}, h('div', { class: 'who' }, avatar(c.name, 28), h('span', {}, up(c.name)))),
          h('td', { class: 'num' }, c.counselled),
          h('td', { class: 'num' }, c.converted),
          h('td', { class: 'num' }, h('span', { class: 'conv' }, c.counselled ? pct(c.converted, c.counselled) + '%' : '—')))))));
    };
    drawCounsellors(cs.counsellors);
    const rangeSel = h('select', { class: 'rsel', 'aria-label': 'Period', onchange: async (e) => {
      state.csRange = e.target.value;
      try { const r = await api('/api/stats?range=' + state.csRange); drawCounsellors(r.counsellors); } catch (ex) { fail(ex); }
    } }, [['all', 'All Time'], ['year', 'This Year'], ['month', 'This Month'], ['30d', 'Last 30 Days'], ['7d', 'Last 7 Days']].map(([k, l]) => h('option', { value: k, selected: k === state.csRange }, l)));
    return h('div', { class: 'panel w8' },
      h('div', { class: 'phead' }, h('div', {}, h('h2', {}, 'Counsellor track'), h('div', { class: 'sub' }, 'Counselled, admitted and conversion')), rangeSel), csHost);
  }

  const COLS = [
    { key: 'enq_no', label: 'Enquiry No', sort: 'enq_no', sticky: true, cell: (r) => r.enq_no },
    { key: 'enq_date', label: 'Date', sort: 'enq_date', cell: (r) => fmtDate(r.enq_date) },
    { key: 'student_name', label: 'Student', sort: 'student_name', cell: (r) => r.student_name },
    { key: 'stream', label: 'Stream', sort: 'stream', cell: (r) => r.stream },
    { key: 'coaching', label: 'Coaching', cell: (r) => r.coaching.join(', ') },
    { key: 'prev_school', label: 'Previous school', sort: 'prev_school', cell: (r) => r.prev_school },
    { key: 'm10b', label: '10th %', sort: 'm10b', cell: (r) => pctText(r.m10b_pct, r.m10b_grade) },
    { key: 'father', label: 'Father / Guardian', cell: (r) => r.father_name },
    { key: 'mobile', label: 'Mobile', sort: 'father_mobile', cell: (r) => r.father_mobile || r.mother_mobile },
    { key: 'town', label: 'Town', sort: 'town', cell: (r) => r.town },
    { key: 'source', label: 'Source', cell: (r) => sourceText(r) },
    { key: 'status', label: 'Status', sort: 'status' },
    { key: 'follow', label: 'Follow-up', sort: 'follow_up_date' },
    { key: 'assigned_to', label: 'Counsellor', sort: 'assigned_to', cell: (r) => up(r.assigned_to) },
    { key: 'counselled_on', label: 'Counselled', sort: 'counselled_on', cell: (r) => (r.counselled_on ? fmtDate(r.counselled_on) : '—') },
    { key: 'updated_at', label: 'Updated', sort: 'updated_at', cell: (r) => fmtDateTime(r.updated_at) },
  ];

  function sourceText(r) {
    return (r.source || []).map((s) => (s === 'Telecalling' && r.telecaller ? `Telecalling (by ${up(r.telecaller)})` : s)).join(', ');
  }

  function listQuery(extra) {
    const p = new URLSearchParams();
    ['q', 'status', 'stream', 'coaching', 'source', 'counselling', 'followup', 'from', 'to'].forEach((k) => { if (state[k]) p.set(k, state[k]); });
    if (state.assigned) p.set('assigned_to', state.assigned);
    Object.entries(extra || {}).forEach(([k, v]) => p.set(k, v));
    return p.toString();
  }

  let searchTimer = null;
  let listSeq = 0;

  async function renderEnquiries() {
    $topTitle.textContent = 'Enquiries';
    if (can('export')) $topActions.append(h('button', { class: 'btn', onclick: () => download('/api/export?' + listQuery()).catch(fail) }, '⬇ Export to Excel'));

    const search = h('input', { type: 'search', class: 'search', 'aria-label': 'Search enquiries', placeholder: 'Search name, mobile, enquiry no, school, town…', value: state.q, oninput: (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => { state.q = e.target.value; state.page = 1; loadRows().catch(fail); }, 250);
    } });
    const sel = (key, label, opts) => h('select', { 'aria-label': label, onchange: (e) => { state[key] = e.target.value; state.page = 1; loadRows().catch(fail); } },
      h('option', { value: '' }, label), opts.map((o) => h('option', { value: o[0], selected: state[key] === o[0] }, o[1])));
    const dateInp = (key, title) => h('input', { type: 'date', title, 'aria-label': title, value: state[key], onchange: (e) => { state[key] = e.target.value; state.page = 1; loadRows().catch(fail); } });
    const toolbar = h('div', { class: 'toolbar' }, search,
      sel('stream', 'All streams', state.cfg.streams.map((x) => [x, x])),
      sel('coaching', 'Any coaching', state.cfg.coaching.map((x) => [x, x])),
      sel('source', 'Any source', state.cfg.sources.map((x) => [x, x])),
      sel('assigned', 'Any counsellor', state.staff.map((x) => [x, up(x)])),
      sel('counselling', 'Counselling', [['done', 'Counselled'], ['pending', 'Not yet counselled']]),
      sel('followup', 'Any follow-up', [['due', 'Due now (overdue + today)'], ['overdue', 'Overdue'], ['today', 'Due today'], ['week', 'Next 7 days']]),
      h('div', { class: 'range' }, dateInp('from', 'Enquiry date from'), h('span', {}, 'To'), dateInp('to', 'Enquiry date to')),
      h('button', { class: 'btn ghost small', onclick: () => openFiltered({}) }, 'Clear'));
    // Phones: filters fold away behind one button so the list is visible straight away.
    const active = ['stream', 'coaching', 'source', 'assigned', 'counselling', 'followup', 'from', 'to'].filter((k) => state[k]).length;
    const ftoggle = h('button', { class: 'btn small ftoggle' + (active ? ' on' : ''), type: 'button', 'aria-expanded': 'false', onclick: () => {
      const open = toolbar.classList.toggle('open');
      ftoggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    } }, 'Filters' + (active ? ` (${active})` : ''));
    toolbar.insertBefore(ftoggle, search.nextSibling);
    const chips = h('div', { class: 'chips', id: 'chips' });
    const wrap = h('div', { class: 'sheet-wrap' });
    const pager = h('div', { class: 'pager' });
    $content.replaceChildren(toolbar, chips, wrap, pager);
    await loadRows();

    async function loadRows() {
      const seq = ++listSeq;
      const data = await api('/api/enquiries?' + listQuery({ sort: state.sort, dir: state.dir, page: state.page, per: state.per }));
      if (seq !== listSeq || state.view !== 'enquiries') return;
      const all = Object.values(data.counts).reduce((a, b) => a + b, 0);
      chips.replaceChildren(
        ...(state.status === 'open' ? [h('button', { class: 'chip on', onclick: () => { state.status = ''; state.page = 1; loadRows().catch(fail); } }, 'Open enquiries', h('span', { class: 'n' }, data.total))] : []),
        h('button', { class: 'chip' + (!state.status ? ' on' : ''), onclick: () => { state.status = ''; state.page = 1; loadRows().catch(fail); } }, 'All', h('span', { class: 'n' }, all)),
        ...Object.entries(data.counts).map(([k, v]) =>
          h('button', { class: 'chip' + (state.status === k ? ' on' : ''), onclick: () => { state.status = k; state.page = 1; loadRows().catch(fail); } },
            h('span', { class: 'dot', style: 'background:' + STATUS_COLOR[k] }), k, h('span', { class: 'n' }, v))));
      const head = h('tr', {}, h('th', { class: 'rn' }, '#'),
        COLS.map((c, i) => {
          const sortBy = () => {
            if (state.sort === c.sort) state.dir = state.dir === 'asc' ? 'desc' : 'asc';
            else { state.sort = c.sort; state.dir = 'asc'; }
            loadRows().catch(fail);
          };
          return h('th', {
            class: (c.sort ? 'sortable ' : '') + (i === 0 ? 'idcol' : ''),
            tabindex: c.sort ? 0 : null,
            'aria-sort': state.sort === c.sort ? (state.dir === 'asc' ? 'ascending' : 'descending') : null,
            onclick: c.sort ? sortBy : null,
            onkeydown: c.sort ? onActivate(sortBy) : null,
          }, c.label, state.sort === c.sort ? (state.dir === 'asc' ? ' ▲' : ' ▼') : '');
        }));
      const body = data.rows.map((r, i) => {
        const tr = h('tr', { class: 'r-' + STATUS_CLASS[r.status], tabindex: 0, onclick: () => openDrawer(r.id), onkeydown: onActivate(() => openDrawer(r.id)) });
        tr.append(h('td', { class: 'rn' }, (data.page - 1) * data.per + i + 1));
        COLS.forEach((c, ci) => {
          if (c.key === 'status') { tr.append(h('td', {}, statusCell(r, tr))); return; }
          if (c.key === 'follow') {
            const late = r.follow_up_date && r.follow_up_date < todayStr() && PENDING.includes(r.status);
            tr.append(h('td', { class: late ? 'late' : '' }, fmtDate(r.follow_up_date), late ? ' ⚠' : ''));
            return;
          }
          tr.append(h('td', { class: ci === 0 ? 'idcol' : '', title: c.cell(r) || '' }, c.cell(r)));
        });
        return tr;
      });
      wrap.replaceChildren(h('table', { class: 'sheet' }, h('thead', {}, head),
        h('tbody', {}, body.length ? body : h('tr', {}, h('td', { colspan: COLS.length + 1, class: 'empty', style: 'height:120px;text-align:center;max-width:none' }, 'No enquiries match these filters.')))));
      const pages = Math.max(1, Math.ceil(data.total / data.per));
      const from = data.total ? (data.page - 1) * data.per + 1 : 0;
      pager.replaceChildren(
        h('span', {}, `${from}–${Math.min(data.page * data.per, data.total)} Of ${data.total}`),
        h('span', { class: 'grow' }),
        h('button', { class: 'btn small', disabled: data.page <= 1, onclick: () => { state.page--; loadRows().catch(fail); } }, '← Prev'),
        h('span', {}, `Page ${data.page} / ${pages}`),
        h('button', { class: 'btn small', disabled: data.page >= pages, onclick: () => { state.page++; loadRows().catch(fail); } }, 'Next →'));
    }
    state.reloadList = () => loadRows().catch(fail);
  }

  function statusCell(r, tr) {
    if (!can('status')) return pill(r.status);
    const cls = () => 's-' + STATUS_CLASS[r.status];
    const sel = h('select', { class: 'status-sel ' + cls(), 'aria-label': 'Status of ' + r.student_name, onclick: (e) => e.stopPropagation(), onchange: async (e) => {
      e.stopPropagation();
      const prev = r.status;
      try {
        const upd = await api(`/api/enquiries/${r.id}/status`, { method: 'PATCH', body: { status: sel.value } });
        r.status = upd.status;
        sel.className = 'status-sel ' + cls();
        tr.className = 'r-' + STATUS_CLASS[r.status];
        toast('Status updated');
        if (state.reloadList) state.reloadList();
      } catch (ex) { sel.value = prev; fail(ex); }
    } }, state.cfg.statuses.map((s) => h('option', { value: s, selected: s === r.status }, s)));
    return sel;
  }

  async function renderUsers() {
    $topTitle.textContent = 'Users';
    $topActions.append(h('button', { class: 'btn', onclick: importModal }, icon('download', 15), 'Import from Excel'));
    $topActions.append(h('button', { class: 'btn', onclick: sampleModal }, 'Sample data'));
    $topActions.append(h('button', { class: 'btn', onclick: scanSettingsModal }, icon('scan', 15), 'Scan settings'));
    $topActions.append(h('button', { class: 'btn primary', onclick: addUserModal }, '+ Add user'));
    const users = await api('/api/users');
    const roleSel = (u) => h('select', { style: 'width:auto;height:30px', 'aria-label': 'Role of ' + up(u.full_name), disabled: u.id === state.me.id, onchange: async (e) => {
      try { await api('/api/users/' + u.id, { method: 'PUT', body: { role: e.target.value } }); toast('Role updated'); } catch (ex) { fail(ex); go('users'); }
    } }, state.cfg.roles.map((r) => h('option', { value: r, selected: r === u.role }, roleName(r))));
    $content.replaceChildren(
      h('div', { class: 'tscroll', tabindex: 0, role: 'region', 'aria-label': 'Users' }, h('table', { class: 'plain' },
        h('thead', {}, h('tr', {}, ['Name', 'Username', 'Role', 'Status', 'Last sign-in', 'Actions'].map((x) => h('th', { class: x === 'Actions' ? 'sr-col' : x === 'Last sign-in' ? 'nw' : '' }, x)))),
        h('tbody', {}, users.map((u) => h('tr', {},
          h('td', {}, h('b', {}, up(u.full_name))), h('td', {}, up(u.username)), h('td', {}, roleSel(u)),
          h('td', {}, h('span', { class: 'tag' + (u.active ? '' : ' off') }, u.active ? 'Active' : 'Disabled')),
          h('td', { class: 'nw' }, u.last_login ? fmtDateTime(u.last_login) : 'Never'),
          h('td', { class: 'act' },
            h('button', { class: 'btn small', onclick: async () => {
              if (!await confirmModal('Reset password?', `A temporary password will be generated for ${up(u.full_name)}. They must change it at next sign-in.`, 'Reset')) return;
              try { const r = await api(`/api/users/${u.id}/reset-password`, { method: 'POST', body: {} }); secretModal(u.full_name, r.password); } catch (ex) { fail(ex); }
            } }, 'Reset password'), ' ',
            u.id === state.me.id ? null : h('button', { class: 'btn small ' + (u.active ? 'danger' : ''), onclick: async () => {
              try { await api('/api/users/' + u.id, { method: 'PUT', body: { active: !u.active } }); go('users'); } catch (ex) { fail(ex); }
            } }, u.active ? 'Disable' : 'Enable'))))))),
      h('div', { class: 'legend' },
        [['Admin', 'Full Access, Users, Activity Log, Counsellor Track'], ['Counsellor', 'Add & Edit Enquiries, Change Status, Export'], ['Viewer', 'Sees The Same As A Counsellor, Read Only, Aadhaar Masked']]
          .map(([a, b]) => h('span', {}, h('b', {}, a), ' — ' + b)),
        h('span', {}, 'Users Are Disabled, Never Deleted, So The Activity Log Stays Complete')));
  }

  function secretModal(name, pw) {
    const done = h('button', { class: 'btn primary', onclick: () => layerOff(bg) }, 'Done');
    const panel = h('div', { class: 'modal' },
      h('h3', {}, 'Temporary password'), h('p', {}, `Share this with ${up(name)} privately. It will not be shown again.`),
      h('div', { class: 'secret' }, pw),
      h('div', { class: 'actions' }, done));
    const bg = h('div', { class: 'modal-bg' }, panel);
    layerOn(bg, panel, 'Temporary password', () => layerOff(bg));
    done.focus();
  }

  function addUserModal() {
    const err = h('div', { class: 'error-box', hidden: true });
    const f = {
      full_name: h('input', { id: 'nu-name', type: 'text', autocomplete: 'off', maxlength: 80 }),
      username: h('input', { id: 'nu-user', type: 'text', autocomplete: 'off', maxlength: 40 }),
      role: h('select', { id: 'nu-role' }, state.cfg.roles.map((r) => h('option', { value: r, selected: r === 'counsellor' }, roleName(r)))),
      password: h('input', { id: 'nu-pass', type: 'text', autocomplete: 'off', value: genPassword() }),
    };
    const create = h('button', { class: 'btn primary', onclick: async () => {
      create.disabled = true;
      try {
        await api('/api/users', { method: 'POST', body: { full_name: f.full_name.value, username: f.username.value, role: f.role.value, password: f.password.value } });
        layerOff(bg);
        toast('User added');
        state.staff = await api('/api/users/basic');
        go('users');
      } catch (e) { err.textContent = e.message; err.hidden = false; create.disabled = false; }
    } }, 'Create user');
    const panel = h('div', { class: 'modal' },
      h('h3', {}, 'Add user'), h('p', {}, 'They will be asked to change this password when they first sign in.'),
      h('div', { class: 'stack' }, err,
        h('div', {}, h('label', { class: 'fld', for: 'nu-name' }, 'Full name'), f.full_name),
        h('div', {}, h('label', { class: 'fld', for: 'nu-user' }, 'Username'), f.username),
        h('div', {}, h('label', { class: 'fld', for: 'nu-role' }, 'Role'), f.role),
        h('div', {}, h('label', { class: 'fld', for: 'nu-pass' }, 'Temporary password'), f.password)),
      h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: () => layerOff(bg) }, 'Cancel'), create));
    const bg = h('div', { class: 'modal-bg' }, panel);
    layerOn(bg, panel, 'Add user', () => layerOff(bg));
    f.full_name.focus();
  }

  function genPassword() {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
    const a = new Uint32Array(10);
    crypto.getRandomValues(a);
    return Array.from(a, (n) => chars[n % chars.length]).join('') + '7a';
  }

  let auditPage = 1;
  async function renderAudit() {
    $topTitle.textContent = 'Activity log';
    const data = await api('/api/audit?page=' + auditPage);
    const pages = Math.max(1, Math.ceil(data.total / data.per));
    $content.replaceChildren(
      h('div', { class: 'tscroll', tabindex: 0, role: 'region', 'aria-label': 'Activity log entries' }, h('table', { class: 'plain' },
        h('thead', {}, h('tr', {}, ['When', 'User', 'Action', 'Enquiry', 'Details'].map((x) => h('th', {}, x)))),
        h('tbody', {}, data.rows.map((r) => h('tr', {},
          h('td', { style: 'white-space:nowrap' }, fmtDateTime(r.at)), h('td', {}, up(r.username) || '—'),
          h('td', {}, h('span', { class: 'tag' }, titleCase(r.action))),
          h('td', {}, r.enq_no || ''), h('td', {}, up(r.detail))))))),
      h('div', { class: 'pager' }, h('span', {}, `${data.total} Entries`), h('span', { class: 'grow' }),
        h('button', { class: 'btn small', disabled: auditPage <= 1, onclick: () => { auditPage--; go('audit'); } }, '← Newer'),
        h('span', {}, `Page ${auditPage} / ${pages}`),
        h('button', { class: 'btn small', disabled: auditPage >= pages, onclick: () => { auditPage++; go('audit'); } }, 'Older →')));
  }

  function collect(root) {
    const d = {};
    root.querySelectorAll('[name]').forEach((el) => {
      if (el.type === 'checkbox') {
        if (!d[el.name]) d[el.name] = [];
        if (el.checked) d[el.name].push(el.value);
      } else if (el.type === 'radio') {
        if (!(el.name in d)) d[el.name] = '';
        if (el.checked) d[el.name] = el.value;
      } else d[el.name] = el.value;
    });
    return d;
  }

  // Form values plus the sibling rows (which have no single input name).
  function collectAll(root) {
    const d = collect(root);
    d.siblings = Array.from(root.querySelectorAll('.sibrow')).map((row) => ({
      name: (row.querySelector('[data-sib=name]').value || '').trim(),
      class: (row.querySelector('[data-sib=class]').value || '').trim(),
    })).filter((x) => x.name || x.class);
    if (!d.source.includes('Telecalling')) d.telecaller = '';
    return d;
  }

  async function closeDrawer(force) {
    const dr = state.drawer;
    if (!dr) return true;
    if (!force && dr.dirty && !await confirmModal('Discard changes?', dr.photo ? 'The details read from the photo have not been saved yet. Close without saving them?' : 'You have unsaved changes on this enquiry.', 'Discard', true)) return false;
    if (state.drawer !== dr) return !state.drawer;
    layerOff(dr.el);
    if (dr.photo) URL.revokeObjectURL(dr.photo);
    state.drawer = null;
    return true;
  }

  let drawerSeq = 0;
  async function openDrawer(id, scan) {
    const seq = ++drawerSeq;
    if (!await closeDrawer()) { if (scan) URL.revokeObjectURL(scan.photo); return; }
    let rec = {
      enq_date: todayStr(), status: 'New', coaching: [], source: [], stream: '', syllabus: '',
    };
    let history = [];
    try {
      if (id) {
        [rec, history] = await Promise.all([api('/api/enquiries/' + id), api(`/api/enquiries/${id}/history`)]);
      }
    } catch (e) { fail(e); return; }
    if (seq !== drawerSeq || state.drawer || !state.me) { if (scan) URL.revokeObjectURL(scan.photo); return; }
    if (scan) rec = Object.assign(rec, scan.fields);
    buildDrawer(rec, history, scan);
  }

  function buildDrawer(rec, history, scan) {
    const isNew = !rec.id;
    const r = role();
    const full = isNew ? can('create') : (r === 'admin' || r === 'counsellor');
    const canEdit = full;
    const lock = (name) => !canEdit || (name === 'principal_remarks' && !can('management_remark'));
    const dr = { dirty: !!scan, el: null, photo: scan ? scan.photo : null };
    const mark = () => { dr.dirty = true; };

    const text = (name, o = {}) => {
      const el = h('input', {
        type: o.type || 'text', name, value: rec[name] == null ? '' : rec[name], placeholder: o.ph || '',
        maxlength: o.max, inputmode: o.mode, disabled: lock(name), autocomplete: 'off', 'aria-label': o.label,
        oninput: (e) => { if (o.upper) { const p = e.target.selectionStart; e.target.value = e.target.value.toUpperCase(); e.target.setSelectionRange(p, p); } mark(); if (o.after) o.after(); },
      });
      if (o.blur) el.addEventListener('blur', o.blur);
      return el;
    };
    const area = (name, rows) => h('textarea', { name, rows: rows || 3, disabled: lock(name), oninput: mark, value: rec[name] || '' });
    let fid = 0;
    const field = (label, input, cls) => {
      const id = 'f' + (++fid) + '-' + (input.name || 'x');
      const grouped = !/^(INPUT|SELECT|TEXTAREA)$/.test(input.tagName);
      const lab = h('label', { class: 'fld', id: grouped ? id + '-l' : null, for: grouped ? null : id }, label);
      if (grouped) { input.setAttribute('role', 'group'); input.setAttribute('aria-labelledby', id + '-l'); } else input.id = id;
      return h('div', { class: 'fw' + (cls ? ' ' + cls : '') }, lab, input);
    };
    const checks = (name, opts) => h('div', { class: 'checks' }, opts.map((o) =>
      h('label', { class: 'check' }, h('input', { type: 'checkbox', name, value: o, checked: (rec[name] || []).includes(o), disabled: lock(name), onchange: mark }), o)));
    const radios = (name, opts, cls) => h('div', { class: cls || 'checks' }, opts.map((o) =>
      h('label', { class: 'check' }, h('input', { type: 'radio', name, value: o, checked: rec[name] === o, disabled: lock(name), onchange: () => { mark(); if (name === 'syllabus') syllOther.disabled = lock('syllabus_other') || o !== 'Others'; } }), o)));
    const section = (n, title, ...body) => h('div', { class: 'section' }, h('h3', {}, h('span', { class: 'num' }, n), title), h('div', { class: 'body' }, body));

    const syllOther = text('syllabus_other', { ph: 'Specify other syllabus' });
    syllOther.disabled = lock('syllabus_other') || rec.syllabus !== 'Others';

    const pcCells = {};
    const markRow = (label, p) => {
      const pc = h('td', { class: 'pc' });
      pcCells[p] = pc;
      const upd = () => {
        const o = parseFloat(dr.el.querySelector(`[name=${p}_obt]`).value), t = parseFloat(dr.el.querySelector(`[name=${p}_tot]`).value);
        pc.textContent = (o >= 0 && t > 0) ? (o / t * 100).toFixed(1) + '%' : '—';
        pc.style.color = (o > t) ? 'var(--st-no)' : '';
      };
      pc._upd = upd;
      return h('tr', {}, h('td', {}, label),
        h('td', {}, text(p + '_obt', { type: 'number', ph: 'Obtained', label: label + ' marks obtained', after: upd })),
        h('td', {}, text(p + '_tot', { type: 'number', ph: 'Total', label: label + ' total marks', after: upd })),
        pc, h('td', {}, text(p + '_grade', { ph: 'Grade', label: label + ' grade', max: 10 })));
    };

    const dupBox = h('div', { hidden: true });
    const dups = {};
    const showDups = () => {
      const seen = new Map();
      Object.values(dups).flat().forEach((x) => seen.set(x.id, x));
      const rows = Array.from(seen.values());
      dupBox.hidden = !rows.length;
      dupBox.replaceChildren(rows.length ? h('div', { class: 'warn' }, 'This mobile number already appears on: ',
        rows.map((x, i) => [i ? ', ' : '', h('a', { onclick: () => openDrawer(x.id) }, `${x.student_name} (${x.enq_no})`)])) : null);
    };
    const checkDup = async (e) => {
      const name = e.target.name;
      const m = e.target.value.replace(/\D/g, '');
      if (m.length < 10) { delete dups[name]; showDups(); return; }
      try {
        dups[name] = await api(`/api/duplicates?mobile=${m}&exclude=${rec.id || 0}`);
        showDups();
      } catch (ex) { return; }
    };

    const statusOpts = h('div', { class: 'status-opts' }, state.cfg.statuses.map((s) =>
      h('label', { class: 'status-opt o-' + STATUS_CLASS[s] }, h('input', { type: 'radio', name: 'status', value: s, checked: rec.status === s, disabled: lock('status'), onchange: mark }),
        h('span', { class: 'dot', style: 'background:' + STATUS_COLOR[s] }), s)));

    // Siblings currently studying at Sri R.V. School / PU College (name + class rows).
    const maxSib = state.cfg.max_siblings || 4;
    const sibRows = h('div', { class: 'sibrows' });
    const sibAdd = h('button', { type: 'button', class: 'btn small ghost', disabled: !canEdit, onclick: () => { addSib({}); mark(); } }, '+ Add sibling');
    const sibBlock = h('div', { class: 'sibblock', 'data-flag': 'siblings' },
      h('div', { class: 'sibnote', role: 'note' }, icon('alert', 15),
        h('span', {}, h('b', {}, 'Only brothers or sisters studying at Sri R.V. School or Sri R.V. PU College right now. '),
          'Do not enter siblings studying at other schools or colleges, former students, cousins, relatives or friends.')),
      sibRows, sibAdd);
    function addSib(s) {
      if (sibRows.children.length >= maxSib) return;
      const n = h('input', { type: 'text', 'data-sib': 'name', value: s.name || '', placeholder: 'Sibling name', maxlength: 100, disabled: !canEdit, 'aria-label': 'Sibling name',
        oninput: (e) => { const p = e.target.selectionStart; e.target.value = e.target.value.toUpperCase(); e.target.setSelectionRange(p, p); mark(); } });
      const c = h('input', { type: 'text', 'data-sib': 'class', value: s.class || '', placeholder: 'Class (e.g. 8th, II PUC)', maxlength: 30, disabled: !canEdit, 'aria-label': 'Sibling class', list: 'sib-classes', oninput: mark });
      const row = h('div', { class: 'sibrow' }, n, c,
        canEdit ? h('button', { type: 'button', class: 'iconbtn small', 'aria-label': 'Remove sibling', title: 'Remove', onclick: () => { row.remove(); mark(); syncSib(); } }, '×') : null);
      sibRows.append(row);
      syncSib();
    }
    function syncSib() { sibAdd.hidden = !canEdit || sibRows.children.length >= maxSib; }
    (rec.siblings || []).forEach(addSib);
    if (!(rec.siblings || []).length && canEdit) addSib({});
    if (!canEdit && !(rec.siblings || []).length) sibRows.append(h('div', { class: 'muted' }, 'None entered'));
    const sibClasses = h('datalist', { id: 'sib-classes' }, ['LKG', 'UKG', '1ST', '2ND', '3RD', '4TH', '5TH', '6TH', '7TH', '8TH', '9TH', '10TH', 'I PUC', 'II PUC'].map((x) => h('option', { value: x })));

    // Telecalling: who made the call. Shown only while Telecalling is ticked.
    const callerList = h('datalist', { id: 'tele-callers' }, state.staff.map((n) => h('option', { value: up(n) })));
    const callerInput = text('telecaller', { upper: true, max: 100, ph: 'Name of the staff member who called', label: 'Telecalling done by' });
    callerInput.setAttribute('list', 'tele-callers');
    const callerField = h('div', { class: 'fw callerfw' }, h('label', { class: 'fld', for: 'f-telecaller' }, 'Telecalling done by *'), callerInput,
      h('div', { class: 'hint' }, 'Printed under “Telecalling” in the Source column of the Excel export.'));
    callerInput.id = 'f-telecaller';
    const syncCaller = () => {
      const on = !!(dr.el || form).querySelector('[name=source][value="Telecalling"]:checked');
      callerField.hidden = !on;
    };

    const meta = rec.lead_meta;
    const CH = { popup: 'Website pop-up form', hero: 'Website home page form', 'enquiry-page': 'Website enquiry page', brochure: 'Brochure request', callback: 'Call-back request', visit: 'Campus visit request', exit: 'Website exit offer', whatsapp: 'WhatsApp button', footer: 'Website footer form' };
    const leadBox = meta ? h('div', { class: 'leadbox' },
      h('b', {}, 'Enquiry from the college website'),
      h('dl', {},
        [['Form', CH[meta.channel] || 'Website'], ['Sent', fmtDateTime(meta.submitted_at)], ['Page', meta.page], ['Campus visit on', meta.visit_date ? fmtDate(meta.visit_date) : ''],
          ['Best time to call', meta.preferred_time], ['10th %', meta.m10_percent], ['Campaign', [meta.utm_source, meta.utm_medium, meta.utm_campaign].filter(Boolean).join(' / ')],
          ['Enquired again', meta.repeat ? `${meta.repeat} more time${meta.repeat > 1 ? 's' : ''} (last ${fmtDateTime(meta.last_repeat)})` : '']]
          .filter(([, v]) => v).map(([k, v]) => [h('dt', {}, k), h('dd', {}, v)]))) : null;

    const staffNames = [...state.staff];
    if (rec.assigned_to && !staffNames.includes(rec.assigned_to)) staffNames.push(rec.assigned_to);
    const assignSel = h('select', { name: 'assigned_to', disabled: lock('assigned_to'), onchange: mark },
      h('option', { value: '' }, '— Unassigned —'), staffNames.map((n) => h('option', { value: n, selected: n === rec.assigned_to }, up(n))));

    const form = h('div', {},
      section(1, 'Course selection',
        h('div', { class: 'grid2' },
          field('Enquiry date', text('enq_date', { type: 'date' })), h('div', {}),
          field('Science combination', radios('stream', state.cfg.streams)),
          field('Competitive coaching support', checks('coaching', state.cfg.coaching)))),
      section(2, 'Student information (as per 10th marks card)',
        h('div', { class: 'grid2' },
          field('Student name *', text('student_name', { upper: true, max: 100 }), 'span2'),
          field('Previous school name & location', text('prev_school', { upper: true, max: 150 }), 'span2'),
          field('Syllabus', radios('syllabus', state.cfg.syllabi)), field('Other syllabus', syllOther)),
        h('div', { class: 'tscroll marks-wrap' }, h('table', { class: 'marks', style: 'margin-top:14px' },
          h('thead', {}, h('tr', {}, ['Academic milestone', 'Marks obtained', 'Total', 'Percentage', 'Grade'].map((x) => h('th', {}, x)))),
          h('tbody', {}, markRow('9th Standard Final', 'm9'), markRow('10th Standard Pre-Board', 'm10pre'), markRow('10th Standard Board Exam', 'm10b')))),
        h('div', { class: 'fw', style: 'margin-top:16px' }, h('label', { class: 'fld' }, 'Siblings currently studying at Sri R.V. School / PU College (name and class)'), sibBlock, sibClasses)),
      section(3, 'Parents / guardian information',
        h('div', { class: 'grid2' },
          h('div', { class: 'stack' }, h('b', {}, 'Father / Guardian'),
            field('Name', text('father_name', { upper: true, max: 100 })), field('Occupation', text('father_occ', { max: 100 })),
            field('Email ID', text('father_email', { type: 'email', max: 120 })),
            field('Mobile number', text('father_mobile', { mode: 'numeric', max: 14, ph: '10-digit mobile', blur: checkDup }))),
          h('div', { class: 'stack' }, h('b', {}, 'Mother'),
            field('Name', text('mother_name', { upper: true, max: 100 })), field('Occupation', text('mother_occ', { max: 100 })),
            field('Email ID', text('mother_email', { type: 'email', max: 120 })),
            field('Mobile number', text('mother_mobile', { mode: 'numeric', max: 14, ph: '10-digit mobile', blur: checkDup })))),
        dupBox),
      section(4, 'Statutory details & residential address',
        h('div', { class: 'grid3' },
          field('Caste', text('caste', { max: 60 })),
          field('Category', h('select', { name: 'category', disabled: lock('category'), onchange: mark },
            h('option', { value: '' }, '— Select —'), state.cfg.categories.map((c) => h('option', { value: c, selected: c === rec.category }, c)))),
          field('Student Aadhaar no.', text('aadhaar', { mode: 'numeric', max: 14, ph: '12 digits' })),
          field('House no / street / area', area('address', 2), 'span3'),
          field('Town / city', text('town', { upper: true, max: 60 }), 'span2'), field('Pincode', text('pincode', { mode: 'numeric', max: 6 })))),
      section(5, 'Source of information',
        h('div', { class: 'stack' }, field('How did you know about us?', checks('source', state.cfg.sources)),
          callerField, callerList,
          field('Ref / caller', text('ref_caller', { max: 100 })))),
      section(6, 'Parent feedback & admission decision status',
        h('div', { class: 'stack' }, statusOpts, field('Parent feedback / remarks / suggestions', area('parent_feedback', 4)),
          h('div', { class: 'grid2' },
            field('Follow-up date', text('follow_up_date', { type: 'date' })), field('Assigned counsellor', assignSel)))),
      section(7, 'Office use only',
        h('div', { class: 'stack' },
          h('div', { class: 'grid2' }, field('Counselling completed on', text('counselled_on', { type: 'date' })), h('div', { class: 'hint' }, 'Leave empty if counselling is pending. It fills in automatically the first time the status moves out of New.')),
          field('Counsellor remarks & feedback notes', area('counsellor_remarks', 3)),
          can('management_remark') ? field('Management remark', area('principal_remarks', 3)) : null)),
      history.length ? h('div', { class: 'section' }, h('h3', {}, 'History'), h('div', { class: 'body history' },
        history.map((x) => h('div', {}, h('span', { class: 'at' }, fmtDateTime(x.at)), h('span', {}, up(x.username)), h('span', {}, up(x.action === 'created' ? 'Created — ' + (x.detail || '') : (x.detail || x.action.replace(/_/g, ' ')))))))) : null);

    form.addEventListener('change', (e) => { if (e.target.name === 'source') syncCaller(); });
    syncCaller();
    if (leadBox) form.prepend(leadBox);

    const saveBtn = h('button', { class: 'btn primary', disabled: !canEdit, onclick: save }, isNew ? 'Save entry' : 'Save changes');

    async function save() {
      const d = collectAll(form);
      if (!d.student_name.trim()) { toast('Student name is required', true); return; }
      if (d.source.includes('Telecalling') && !d.telecaller.trim()) { toast('Telecalling is ticked. Enter who made the call.', true); callerInput.focus(); return; }
      const halfSib = d.siblings.find((x) => !x.name || !x.class);
      if (halfSib) { toast('Enter both the name and the class for each sibling, or remove the row.', true); return; }
      if (!isNew) d._v = rec.version != null ? rec.version : rec.updated_at;
      if (isNew && scan) d.via_scan = true;
      saveBtn.disabled = true;
      try {
        if (isNew) await api('/api/enquiries', { method: 'POST', body: d });
        else await api('/api/enquiries/' + rec.id, { method: 'PUT', body: d });
        dr.dirty = false;
        await closeDrawer(true);
        toast(isNew ? 'Entry saved' : 'Changes saved');
        if (state.view === 'enquiries' && state.reloadList) state.reloadList();
        else if (state.view === 'dashboard') go('dashboard');
      } catch (e) { fail(e); saveBtn.disabled = false; }
    }

    const foot = h('div', { class: 'drawer-foot' },
      !canEdit ? h('span', { class: 'grow' }, 'Read-only access') : h('span', { class: 'grow' }, rec.updated_at ? `Last updated ${fmtDateTime(rec.updated_at)} by ${up(rec.updated_by)}` : ''),
      h('button', { class: 'btn', onclick: () => printForm(collectAll(form), rec.enq_no || '') }, 'Print'),
      (!isNew && can('delete')) ? h('button', { class: 'btn danger', onclick: async () => {
        if (!await confirmModal('Delete this enquiry?', `${rec.student_name} (${rec.enq_no}) will be permanently removed. This cannot be undone.`, 'Delete', true)) return;
        try { await api('/api/enquiries/' + rec.id, { method: 'DELETE' }); await closeDrawer(true); toast('Enquiry deleted'); if (state.reloadList && state.view === 'enquiries') state.reloadList(); else go(state.view); } catch (e) { fail(e); }
      } }, 'Delete') : null,
      h('button', { class: 'btn', onclick: () => closeDrawer() }, 'Close'), canEdit ? saveBtn : null);

    const panel = h('div', { class: 'drawer' },
      h('div', { class: 'drawer-head' },
        h('h2', {}, isNew ? 'New entry' : rec.student_name), isNew ? null : h('span', { class: 'enq' }, rec.enq_no), h('span', { class: 'grow' }),
        isNew ? null : pill(rec.status)),
      h('div', { class: 'drawer-body' }, scan ? buildScanBar(form, scan) : null, form), foot);
    const el = h('div', { class: 'overlay', onmousedown: (e) => { if (e.target === el) closeDrawer(); } }, panel);
    dr.el = el;
    state.drawer = dr;
    layerOn(el, panel, isNew ? 'New entry' : 'Enquiry ' + rec.enq_no, () => closeDrawer());
    Object.values(pcCells).forEach((c) => c._upd());
    if (scan) {
      ['father_mobile', 'mother_mobile'].forEach((n) => {
        const m = form.querySelector(`[name=${n}]`);
        if (m && m.value.replace(/\D/g, '').length >= 10) checkDup({ target: m });
      });
      return;
    }
    const first = el.querySelector('[name=student_name]');
    if (first && !first.disabled) first.focus();
  }

  function buildScanBar(form, scan) {
    const labels = scan.labels || {};
    const chips = h('div', { class: 'chips' });
    const sub = h('p', {});
    let open = 0;
    const refresh = () => {
      sub.textContent = open
        ? `Compare every field with the paper form before saving. ${open} ${open === 1 ? 'field needs' : 'fields need'} a closer look.`
        : 'Compare every field with the paper form before saving.';
      chips.hidden = !open;
    };
    Object.entries(scan.flags || {}).forEach(([name, msg]) => {
      if (!/^[a-z0-9_]+$/.test(name)) return;
      const els = name === 'siblings' ? Array.from(form.querySelectorAll('[data-sib]')) : Array.from(form.querySelectorAll(`[name="${name}"]`));
      if (!els.length) return;
      if (name === 'telecaller') { const cf = els[0].closest('.callerfw'); if (cf) cf.hidden = false; }
      const wrap = els[0].closest('.fw, td');
      const inCell = wrap.tagName === 'TD';
      const id = 'flag-' + name;
      const note = h('div', { class: 'flagmsg' + (inCell ? ' sr' : ''), id }, inCell ? null : icon('alert', 14), h('span', {}, msg));
      const chip = h('button', { type: 'button', class: 'flagchip', onclick: () => { els[0].scrollIntoView({ block: 'center' }); els[0].focus(); } }, labels[name] || name);
      let cleared = false;
      const clear = () => {
        if (cleared) return;
        cleared = true;
        wrap.classList.remove('flag');
        note.remove();
        chip.remove();
        els.forEach((el) => el.removeAttribute('aria-describedby'));
        open--;
        refresh();
      };
      wrap.classList.add('flag');
      wrap.append(note);
      els.forEach((el) => {
        el.setAttribute('aria-describedby', id);
        el.addEventListener('input', clear);
        el.addEventListener('change', clear);
      });
      chips.append(chip);
      open++;
    });
    refresh();
    return h('div', { class: 'scanbar', role: 'region', 'aria-label': 'Review the scanned details' },
      icon('scan', 22),
      h('div', { class: 'sb-text' },
        h('b', {}, 'Filled in from the photo'), sub, chips,
        (scan.notes || []).length ? h('ul', { class: 'scannotes' }, scan.notes.map((n) => h('li', {}, n))) : null),
      h('button', { type: 'button', class: 'btn small', onclick: () => photoViewer(scan.photo) }, icon('image', 15), 'View photo'));
  }

  function photoViewer(url) {
    const img = h('img', { src: url, alt: 'Photo of the scanned form' });
    img.addEventListener('click', () => img.classList.toggle('zoom'));
    const close = () => layerOff(bg);
    const done = h('button', { class: 'btn primary', type: 'button', onclick: close }, 'Close');
    const panel = h('div', { class: 'modal photo-modal' },
      h('div', { class: 'photo-wrap', tabindex: 0, role: 'region', 'aria-label': 'Scanned photo' }, img),
      h('div', { class: 'actions' }, h('span', { class: 'hint grow' }, 'Tap the photo to zoom in or out.'), done));
    const bg = h('div', { class: 'modal-bg', onmousedown: (e) => { if (e.target === bg) close(); } }, panel);
    layerOn(bg, panel, 'Scanned photo', close);
    done.focus();
  }

  function pickPhoto(host, camera) {
    return new Promise((resolve) => {
      const input = h('input', { type: 'file', accept: 'image/*', hidden: true });
      if (camera) input.setAttribute('capture', 'environment');
      input.addEventListener('change', () => { const f = input.files[0] || null; input.remove(); resolve(f); });
      input.addEventListener('cancel', () => { input.remove(); resolve(null); });
      host.append(input);
      input.click();
    });
  }

  const SCAN_EDGE = 2000;
  function prepareImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const w = img.naturalWidth, ht = img.naturalHeight;
        if (!w || !ht) { reject(new Error('empty')); return; }
        const k = Math.min(1, SCAN_EDGE / Math.max(w, ht));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(w * k));
        c.height = Math.max(1, Math.round(ht * k));
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        const enc = (q) => new Promise((r) => c.toBlob(r, 'image/jpeg', q));
        enc(0.85).then(async (b) => {
          if (b && b.size > 3 * 1024 * 1024) b = await enc(0.65);
          if (b && b.size > 3.8 * 1024 * 1024) b = await enc(0.5);
          if (b) resolve(b); else reject(new Error('encode'));
        });
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode')); };
      img.src = url;
    });
  }

  function newEntry() {
    const close = () => layerOff(bg);
    const note = h('span', { class: 'cd' }, 'Checking whether scanning is set up…');
    const setup = h('button', { type: 'button', class: 'linkbtn', hidden: true, onclick: () => { close(); scanSettingsModal(); } }, 'Open Scan Settings');
    const scanBtn = h('button', { type: 'button', class: 'choice', disabled: true, onclick: async () => {
      const f = await pickPhoto(panel, true);
      if (f) { close(); runScan(f); }
    } }, h('span', { class: 'ico' }, icon('camera', 24)), h('span', { class: 'ct' }, 'Scan filled form'), note);
    const manual = h('button', { type: 'button', class: 'choice', onclick: () => { close(); openDrawer(null); } },
      h('span', { class: 'ico' }, icon('pencil', 24)), h('span', { class: 'ct' }, 'Enter manually'), h('span', { class: 'cd' }, 'Type the details into the form yourself.'));
    const gallery = h('button', { type: 'button', class: 'linkbtn', hidden: true, onclick: async () => {
      const f = await pickPhoto(panel, false);
      if (f) { close(); runScan(f); }
    } }, 'Choose A Photo From This Device Instead');
    const panel = h('div', { class: 'modal wide' },
      h('h3', {}, 'New entry'), h('p', {}, 'How would you like to add it?'),
      h('div', { class: 'choice-grid' }, manual, scanBtn),
      h('div', { class: 'choice-extra' }, gallery, setup),
      h('div', { class: 'actions' }, h('button', { type: 'button', class: 'btn', onclick: close }, 'Cancel')));
    const bg = h('div', { class: 'modal-bg', onmousedown: (e) => { if (e.target === bg) close(); } }, panel);
    layerOn(bg, panel, 'New entry', close);
    manual.focus();
    api('/api/scan/status').then((s) => {
      if (!bg.isConnected) return;
      if (s.enabled && s.can_scan) {
        scanBtn.disabled = false;
        note.textContent = 'Photograph the filled paper form. The details are read and filled in for you to check.';
        gallery.hidden = false;
      } else {
        note.textContent = role() === 'admin' ? 'Not set up yet. Add a scanning key first.' : 'Not set up yet. Ask your administrator to turn it on.';
        setup.hidden = role() !== 'admin';
      }
    }).catch((e) => { if (e.message !== 'auth') note.textContent = 'Could not check scanning. You can still enter the details manually.'; });
  }

  async function runScan(file) {
    const ctrl = new AbortController();
    let done = false;
    const msg = h('p', { role: 'status' }, 'Preparing the photo…');
    const body = h('div', { class: 'scanwait' }, h('div', { class: 'spinner', 'aria-hidden': 'true' }), msg);
    const actions = h('div', { class: 'actions' });
    const panel = h('div', { class: 'modal' }, h('h3', {}, 'Scanning the form'), body, actions);
    const bg = h('div', { class: 'modal-bg' }, panel);
    const finish = () => { if (done) return; done = true; ctrl.abort(); layerOff(bg); };
    const cancel = h('button', { type: 'button', class: 'btn', onclick: finish }, 'Cancel');
    actions.append(cancel);
    layerOn(bg, panel, 'Scanning the form', finish);
    cancel.focus();
    const fail2 = (text) => {
      body.replaceChildren(icon('alert', 26), h('p', { role: 'alert' }, text));
      body.classList.add('bad');
      actions.replaceChildren(
        h('button', { type: 'button', class: 'btn', onclick: () => { finish(); openDrawer(null); } }, 'Enter Manually'),
        h('button', { type: 'button', class: 'btn primary', onclick: async () => {
          const f = await pickPhoto(panel, true);
          if (f) { finish(); runScan(f); }
        } }, 'Try Again'));
      actions.lastChild.focus();
    };
    let blob;
    try {
      blob = await prepareImage(file);
    } catch (e) {
      if (!done) fail2('That file could not be opened as a photo. Please take the photo again, or choose a JPEG or PNG image.');
      return;
    }
    if (done) return;
    msg.textContent = 'Reading the form. This usually takes 15 to 40 seconds.';
    const timer = setTimeout(() => ctrl.abort(), 130000);
    try {
      const res = await api('/api/scan', { method: 'POST', blob, signal: ctrl.signal });
      clearTimeout(timer);
      if (done) return;
      done = true;
      layerOff(bg);
      openDrawer(null, Object.assign({}, res, { photo: URL.createObjectURL(blob) }));
    } catch (e) {
      clearTimeout(timer);
      if (done) return;
      if (e.message === 'auth') { done = true; layerOff(bg); return; }
      fail2(e.name === 'AbortError' ? 'The scan took too long. Please try again.' : e.message);
    }
  }

  async function scanSettingsModal() {
    let st;
    try { st = await api('/api/scan/status'); } catch (e) { fail(e); return; }
    const err = h('div', { class: 'error-box', hidden: true, role: 'alert' });
    const good = h('div', { class: 'okbox', hidden: true, role: 'status' });
    const line = h('p', { class: 'scanline' });
    const keyIn = h('input', { id: 'scan-key', type: 'password', autocomplete: 'off', spellcheck: 'false', autocapitalize: 'none', placeholder: 'sk-ant-…', 'aria-describedby': 'scan-key-help' });
    const usage = h('p', { class: 'hint' });
    const save = h('button', { type: 'button', class: 'btn primary' }, 'Save key');
    const test = h('button', { type: 'button', class: 'btn' }, 'Test connection');
    const remove = h('button', { type: 'button', class: 'btn danger' }, 'Remove key');
    const show = (box, text) => { err.hidden = true; good.hidden = true; box.textContent = text; box.hidden = false; };
    const render = () => {
      line.textContent = !st.enabled ? 'Scanning is off. Paste a key below to turn it on.'
        : st.source === 'environment' ? `Scanning is on. It uses the key set on the server (ending ${st.hint}).`
          : `Scanning is on. The saved key ends with ${st.hint}.`;
      keyIn.disabled = save.disabled = st.source === 'environment';
      test.hidden = !st.enabled;
      remove.hidden = !st.can_remove;
      usage.textContent = `Scans this month: ${st.used_this_month || 0}. Model: ${st.model}.`;
    };
    const busy = (btn, label, fn) => async () => {
      const old = btn.textContent;
      [save, test, remove].forEach((b) => { b.disabled = true; });
      btn.textContent = label;
      try { await fn(); } catch (e) { if (e.message !== 'auth') show(err, e.message); }
      btn.textContent = old;
      [save, test, remove].forEach((b) => { b.disabled = false; });
      render();
    };
    save.onclick = busy(save, 'Checking…', async () => {
      if (!keyIn.value.trim()) { show(err, 'Paste the key first.'); return; }
      st = await api('/api/scan/key', { method: 'PUT', body: { key: keyIn.value.trim() } });
      keyIn.value = '';
      show(good, 'The key works and has been saved. Scanning is on.');
    });
    test.onclick = busy(test, 'Testing…', async () => {
      const r = await api('/api/scan/test', { method: 'POST', body: {} });
      show(r.ok ? good : err, r.message);
    });
    remove.onclick = async () => {
      if (!await confirmModal('Remove the scanning key?', 'Scanning will stop working until a new key is added.', 'Remove', true)) return;
      try { st = await api('/api/scan/key', { method: 'DELETE' }); show(good, 'The key was removed.'); render(); } catch (e) { fail(e); }
    };
    const panel = h('div', { class: 'modal wide' },
      h('h3', {}, 'Scan settings'),
      h('p', {}, 'Scanning lets staff photograph a filled Student Enquiry Form and have the details read into a new entry. It needs an Anthropic API key and an internet connection on the computer that runs this app.'),
      h('div', { class: 'stack' }, err, good, line,
        h('div', {}, h('label', { class: 'fld', for: 'scan-key' }, 'Anthropic API key'), keyIn,
          h('p', { class: 'hint', id: 'scan-key-help' }, 'Create one at console.anthropic.com under API keys. It is kept on this computer, never shown again, and left out of backups.')),
        usage,
        h('p', { class: 'hint' }, 'Each scan costs Anthropic a couple of rupees, billed to your account. The photo is sent to Anthropic to be read and is not kept by this app.')),
      h('div', { class: 'actions wrap' }, remove, test, h('button', { type: 'button', class: 'btn', onclick: () => layerOff(bg) }, 'Close'), save));
    const bg = h('div', { class: 'modal-bg' }, panel);
    layerOn(bg, panel, 'Scan settings', () => layerOff(bg));
    render();
    keyIn.disabled ? test.focus() : keyIn.focus();
  }

  // ---------------------------------------------------------------- printing
  // A4 layout that follows the paper Student Enquiry Form, section by section.
  // Used for "Print" on an entry and for the blank form (staff hand it to walk-in families).
  const PRINT_ADDR = 'RV Gardens, NH-75 Bypass, PC Halli, Kolar \u2013 563 101';
  function printForm(d, enqNo, blank) {
    const v = (x) => (x == null ? '' : String(x));
    const cfg = state.cfg;
    const box = (on) => h('span', { class: 'bx' + (on ? ' on' : '') }, on ? '\u2713' : '');
    const ticks = (list, cur) => h('div', { class: 'ticks' }, list.map((o) => h('span', { class: 'tk' }, box(Array.isArray(cur) ? cur.includes(o) : cur === o), o)));
    const fill = (val, cls) => h('div', { class: 'ln' + (cls ? ' ' + cls : '') }, blank ? '' : v(val));
    const pc = (p) => {
      if (blank) return '';
      const o = parseFloat(d[p + '_obt']), t = parseFloat(d[p + '_tot']);
      return (o >= 0 && t > 0) ? (o / t * 100).toFixed(1) + '%' : v(d[p + '_grade']);
    };
    const sec = (n, t) => h('div', { class: 'psec' }, h('span', { class: 'pn' }, n), t);
    const kv = (k, val, cls) => h('div', { class: 'kv' + (cls ? ' ' + cls : '') }, h('span', { class: 'k' }, k), fill(val));
    const markRow = (label, p) => h('tr', {}, h('td', { class: 'k' }, label),
      h('td', {}, blank ? '' : [v(d[p + '_obt']), d[p + '_tot'] ? ' / ' + d[p + '_tot'] : ''].join('')), h('td', {}, pc(p)));
    const sibs = blank ? [] : (d.siblings || []);
    const sibRows = Array.from({ length: Math.max(3, sibs.length) }, (_, i) => sibs[i] || {});
    const srcList = cfg.paper_sources.concat((d.source || []).filter((s) => !cfg.paper_sources.includes(s)));
    const pf = h('div', { class: 'pf2' },
      h('div', { class: 'phd' },
        h('img', { src: '/static/logo-navy.png', alt: '' }),
        h('div', { class: 'pht' },
          h('h1', {}, cfg.print_title),
          h('div', { class: 'sub' }, '(Approved by the Department of Pre-University Education, Govt. of Karnataka)'),
          h('div', { class: 'sub' }, PRINT_ADDR)),
        h('div', { class: 'pno' }, h('div', {}, 'Form No.', h('span', { class: 'ln sm' }, blank ? '' : v(enqNo))), h('div', {}, 'Date', h('span', { class: 'ln sm' }, blank ? '' : fmtDate(d.enq_date))))),
      h('div', { class: 'pttl' }, 'STUDENT ENQUIRY FORM'),
      sec(1, 'Course Selection'),
      h('div', { class: 'grid2p' }, h('div', { class: 'kv' }, h('span', { class: 'k' }, 'Science combination'), ticks(cfg.streams, blank ? '' : d.stream)),
        h('div', { class: 'kv' }, h('span', { class: 'k' }, 'Competitive coaching'), ticks(cfg.coaching, blank ? [] : d.coaching))),
      sec(2, 'Student Information (as per 10th marks card, in CAPITAL LETTERS)'),
      kv('Student name', d.student_name),
      kv('Previous school name & location', d.prev_school),
      h('div', { class: 'kv' }, h('span', { class: 'k' }, 'Syllabus'), ticks(cfg.syllabi, blank ? '' : d.syllabus), h('span', { class: 'k inl' }, 'If others:'), fill(d.syllabus === 'Others' ? d.syllabus_other : '', 'short')),
      h('table', { class: 'pmarks' }, h('thead', {}, h('tr', {}, h('th', {}, 'Academic milestone'), h('th', {}, 'Marks obtained / Total'), h('th', {}, 'Percentage / Grade'))),
        h('tbody', {}, markRow('9th Standard Final', 'm9'), markRow('10th Standard Pre-Board', 'm10pre'), markRow('10th Standard Board Exam', 'm10b'))),
      h('div', { class: 'psib' },
        h('div', { class: 'psibh' }, 'Sibling(s) currently studying at Sri R.V. School / Sri R.V. PU College'),
        h('div', { class: 'psibn' }, 'Write ONLY brothers or sisters studying at Sri R.V. School or Sri R.V. PU College now. Do NOT write siblings at other schools or colleges, cousins, relatives or friends. Write NIL if none.'),
        h('table', { class: 'pmarks' }, h('thead', {}, h('tr', {}, h('th', { style: 'width:8%' }, 'No.'), h('th', {}, 'Sibling name'), h('th', { style: 'width:30%' }, 'Class'))),
          h('tbody', {}, sibRows.map((s, i) => h('tr', {}, h('td', {}, i + 1), h('td', {}, v(s.name)), h('td', {}, v(s.class))))))),
      sec(3, 'Parents / Guardian Information'),
      h('table', { class: 'pmarks par' }, h('thead', {}, h('tr', {}, h('th', { style: 'width:22%' }, 'Details'), h('th', { style: 'width:39%' }, 'Father / Guardian'), h('th', { style: 'width:39%' }, 'Mother'))),
        h('tbody', {}, [['Name', 'name'], ['Occupation', 'occ'], ['Email ID', 'email'], ['Mobile number', 'mobile']].map(([k, f]) =>
          h('tr', {}, h('td', { class: 'k' }, k), h('td', {}, blank ? '' : v(d['father_' + f])), h('td', {}, blank ? '' : v(d['mother_' + f])))))),
      sec(4, 'Statutory Details & Residential Address'),
      h('div', { class: 'kv' }, h('span', { class: 'k' }, 'Category'), ticks(cfg.categories, blank ? '' : d.category)),
      h('div', { class: 'grid2p' }, kv('Caste', d.caste), kv('Student Aadhaar no.', d.aadhaar)),
      kv('House no / Street / Area', d.address),
      h('div', { class: 'grid2p' }, kv('Town / City', d.town), kv('Pincode', d.pincode)),
      sec(5, 'Source of Information'),
      h('div', { class: 'kv' }, h('span', { class: 'k' }, 'How did you know about us?'), ticks(srcList, blank ? [] : d.source)),
      h('div', { class: 'grid2p' }, kv('Telecalling \u2013 called by', (d.source || []).includes('Telecalling') ? d.telecaller : ''), kv('Ref / Caller', d.ref_caller)),
      sec(6, 'Parent Feedback & Admission Decision Status'),
      h('div', { class: 'kv' }, h('span', { class: 'k' }, 'Decision status'), ticks(cfg.statuses.slice(1), blank ? '' : d.status)),
      h('div', { class: 'kv tall' }, h('span', { class: 'k' }, 'Parent feedback / remarks / suggestions'), h('div', { class: 'ln box' }, blank ? '' : v(d.parent_feedback))),
      sec(7, 'Office Use Only'),
      h('div', { class: 'grid2p' }, kv('Counselled by', blank ? '' : up(d.assigned_to)), kv('Counselling date', blank ? '' : fmtDate(d.counselled_on))),
      h('div', { class: 'kv tall' }, h('span', { class: 'k' }, 'Counsellor remarks & feedback notes'), h('div', { class: 'ln box' }, blank ? '' : v(d.counsellor_remarks))),
      h('div', { class: 'kv' }, h('span', { class: 'k' }, 'Management remark'), h('div', { class: 'ln box sm2' }, blank ? '' : v(d.principal_remarks))),
      h('div', { class: 'sig' }, h('div', {}, 'Signature of Parent / Guardian'), h('div', {}, 'Signature of Student'), h('div', {}, 'Signature of Counsellor')));
    const area = document.getElementById('printArea');
    area.replaceChildren(pf);
    const imgs = Array.from(pf.querySelectorAll('img'));
    Promise.all(imgs.map((im) => (im.complete ? 1 : new Promise((r) => { im.onload = im.onerror = r; })))).then(() => window.print());
  }

  function blankFormModal() {
    const close = () => layerOff(bg);
    const pr = h('button', { class: 'btn primary', type: 'button', onclick: () => { close(); printForm({}, '', true); } }, icon('print', 15), 'Print');
    const dl = h('a', { class: 'btn', href: '/static/student-enquiry-form.pdf', download: 'Sri-RV-Student-Enquiry-Form.pdf' }, icon('download', 15), 'Download PDF');
    const panel = h('div', { class: 'modal' },
      h('h3', {}, 'Blank Student Enquiry Form'),
      h('p', {}, 'A4, one page, with every section of the enquiry form including siblings at Sri R.V. and Telecalling. Families can fill it in by hand and you can scan it later.'),
      h('div', { class: 'actions' }, h('button', { class: 'btn', type: 'button', onclick: close }, 'Close'), dl, pr));
    const bg = h('div', { class: 'modal-bg', onmousedown: (e) => { if (e.target === bg) close(); } }, panel);
    layerOn(bg, panel, 'Blank Student Enquiry Form', close);
    pr.focus();
  }

  function importModal() {
    const close = () => layerOff(bg);
    const err = h('div', { class: 'error-box', hidden: true, role: 'alert' });
    const body = h('div', { class: 'stack' }, h('p', {}, 'Bring in entries from your existing Excel sheets (for example the Walk-In Enquiry List). Every sheet with a student-name column is read. Entries already in the system (same student and mobile) are skipped, so it is safe to import the same file twice.'), err);
    let file = null;
    const pickBtn = h('button', { class: 'btn primary', type: 'button', onclick: () => input.click() }, 'Choose Excel file\u2026');
    const input = h('input', { type: 'file', accept: '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', hidden: true, onchange: async () => {
      file = input.files[0]; if (!file) return;
      err.hidden = true; pickBtn.disabled = true; pickBtn.textContent = 'Reading\u2026';
      try {
        const p = await api('/api/import', { method: 'POST', blob: file });
        const go = h('button', { class: 'btn primary', type: 'button', disabled: !p.new, onclick: async () => {
          go.disabled = true; go.textContent = 'Importing\u2026';
          try { const r = await api('/api/import?commit=1', { method: 'POST', blob: file }); close(); toast(`${r.added} entries imported`); openFiltered({}); } catch (e) { err.textContent = e.message; err.hidden = false; go.disabled = false; go.textContent = 'Import'; }
        } }, p.new ? `Import ${p.new} ${p.new === 1 ? 'entry' : 'entries'}` : 'Nothing new to import');
        body.replaceChildren(err,
          h('p', {}, h('b', {}, file.name), ` \u2014 sheets read: ${p.sheets.join(', ')}.`),
          h('div', { class: 'impstats' }, h('span', {}, h('b', {}, p.found), ' rows found'), h('span', {}, h('b', {}, p.new), ' new'), h('span', {}, h('b', {}, p.duplicates), ' already here / repeated'), p.no_mobile ? h('span', {}, h('b', {}, p.no_mobile), ' without a valid mobile') : null),
          p.rows.length ? h('div', { class: 'tscroll', style: 'max-height:280px' }, h('table', { class: 'plain small' },
            h('thead', {}, h('tr', {}, ['Sheet', 'Student', 'Date', 'Stream', 'Mobile', 'Status', 'Source', 'Counsellor', 'Notes'].map((x) => h('th', {}, x)))),
            h('tbody', {}, p.rows.map((r) => h('tr', {}, h('td', {}, r.sheet + ' #' + r.row), h('td', {}, r.student_name), h('td', { class: 'nw' }, fmtDate(r.enq_date)),
              h('td', {}, [r.stream, r.coaching.join('/')].filter(Boolean).join(' ')), h('td', {}, r.mobile || '\u2014'), h('td', {}, r.status), h('td', {}, r.source.join(', ')), h('td', {}, r.assigned_to), h('td', { class: 'muted' }, r.notes.join('; '))))))) : null);
        actions.replaceChildren(h('button', { class: 'btn', type: 'button', onclick: close }, 'Cancel'), go);
      } catch (e) { err.textContent = e.message; err.hidden = false; pickBtn.disabled = false; pickBtn.textContent = 'Choose Excel file\u2026'; }
    } });
    const actions = h('div', { class: 'actions' }, h('button', { class: 'btn', type: 'button', onclick: close }, 'Cancel'), pickBtn);
    const panel = h('div', { class: 'modal wide' }, h('h3', {}, 'Import from Excel'), body, input, actions);
    const bg = h('div', { class: 'modal-bg' }, panel);
    layerOn(bg, panel, 'Import from Excel', close);
    pickBtn.focus();
  }

  async function sampleModal() {
    let st;
    try { st = await api('/api/sample'); } catch (e) { fail(e); return; }
    const close = () => layerOff(bg);
    const has = st.count > 0;
    const act = h('button', { class: 'btn ' + (has ? 'danger' : 'primary'), type: 'button', onclick: async () => {
      act.disabled = true;
      try {
        const r = await api('/api/sample', { method: has ? 'DELETE' : 'POST', body: {} });
        close(); toast(has ? 'Sample entries removed' : `${r.count} sample entries added`); go('dashboard');
      } catch (e) { fail(e); act.disabled = false; }
    } }, has ? `Remove ${st.count} sample entries` : 'Load 48 sample entries');
    const panel = h('div', { class: 'modal' }, h('h3', {}, 'Sample data'),
      h('p', {}, has ? `${st.count} made-up sample entries are loaded so the dashboard can be shown. Remove them before you start entering real enquiries. Real entries are not touched.`
        : 'Load 48 made-up enquiries (names, marks, statuses, follow-ups, website leads) to try the dashboard and train staff. They can be removed in one click later; real entries are never touched.'),
      h('div', { class: 'actions' }, h('button', { class: 'btn', type: 'button', onclick: close }, 'Close'), act));
    const bg = h('div', { class: 'modal-bg' }, panel);
    layerOn(bg, panel, 'Sample data', close);
    act.focus();
  }

  document.addEventListener('click', () => document.querySelectorAll('.umenu').forEach((m) => { m.hidden = true; }));

  document.addEventListener('keydown', (e) => {
    const top = layers[layers.length - 1];
    if (top && e.key === 'Escape') { e.preventDefault(); if (top._esc) top._esc(); return; }
    if (top && e.key === 'Tab') { trapTab(e, top); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && state.drawer && layers[layers.length - 1] === state.drawer.el) {
      e.preventDefault();
      const b = state.drawer.el.querySelector('.drawer-foot .btn.primary');
      if (b && !b.disabled) b.click();
    }
  });

  (async function boot() {
    try {
      const res = await fetch('/api/me', { credentials: 'same-origin' });
      const body = await res.json().catch(() => ({}));
      if (res.ok) { await start(body); return; }
    } catch (e) {
      showLogin();
      return;
    }
    showLogin();
  })();
})();
