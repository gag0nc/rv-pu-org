/* Sri R.V. PU College website behaviour. No libraries. */
(function () {
  'use strict';
  var RV = window.RV || {};
  var d = document;
  d.documentElement.classList.remove('no-js');

  /* ---------------------------------------------------------- storage helpers */
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { return null; } }
  var DAY = 86400000;
  function leadDone() { return !!ls('rv_lead_done'); }

  /* ---------------------------------------------------------- UTM capture */
  (function () {
    var q = new URLSearchParams(location.search);
    ['utm_source', 'utm_medium', 'utm_campaign'].forEach(function (k) { var v = q.get(k); if (v) ss(k, v.slice(0, 100)); });
    if (!ss('rv_ref') && d.referrer && d.referrer.indexOf(location.host) === -1) ss('rv_ref', d.referrer.slice(0, 200));
  })();

  /* ---------------------------------------------------------- config into the page */
  var phones = RV.phones || {};
  function waLink(text) { return 'https://wa.me/' + (RV.whatsapp || '') + '?text=' + encodeURIComponent(text || RV.whatsappText || ''); }
  d.querySelectorAll('[data-tel]').forEach(function (a) {
    var p = phones[a.getAttribute('data-tel')];
    if (!p) return;
    a.href = 'tel:' + p.tel;
    if (a.hasAttribute('data-tel-text')) a.textContent = p.display;
  });
  d.querySelectorAll('[data-wa]').forEach(function (a) { a.href = waLink(a.getAttribute('data-wa') || ''); a.target = '_blank'; a.rel = 'noopener'; });
  d.querySelectorAll('[data-mail]').forEach(function (a) { if (RV.email) { a.href = 'mailto:' + RV.email; if (a.hasAttribute('data-mail-text')) a.textContent = RV.email; } });
  d.querySelectorAll('[data-maps]').forEach(function (a) { a.href = RV[a.getAttribute('data-maps')] || RV.mapsUrl; a.target = '_blank'; a.rel = 'noopener'; });
  d.querySelectorAll('[data-staff]').forEach(function (a) { a.href = RV.staffPortal; });
  d.querySelectorAll('[data-social]').forEach(function (a) { var u = (RV.social || {})[a.getAttribute('data-social')]; if (u) { a.href = u; a.target = '_blank'; a.rel = 'noopener'; } else a.remove(); });
  d.querySelectorAll('[data-hours]').forEach(function (el) { if (RV.officeHours) el.querySelector('[data-hours-text]').textContent = RV.officeHours; else el.remove(); });
  d.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------------------------------------------------------- header */
  var header = d.querySelector('.site-header');
  function onScrollHeader() { if (header) header.classList.toggle('scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScrollHeader, { passive: true });
  onScrollHeader();

  var mnav = d.getElementById('mobile-nav');
  var lastFocus = null;
  function openNav() { if (!mnav) return; lastFocus = d.activeElement; mnav.classList.add('open'); d.body.classList.add('lock'); var f = mnav.querySelector('[data-close-nav]'); if (f) f.focus(); d.querySelectorAll('[aria-controls="mobile-nav"]').forEach(function (b) { b.setAttribute('aria-expanded', 'true'); }); }
  function closeNav() { if (!mnav || !mnav.classList.contains('open')) return; mnav.classList.remove('open'); d.body.classList.remove('lock'); d.querySelectorAll('[aria-controls="mobile-nav"]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); }); if (lastFocus) lastFocus.focus(); }
  d.querySelectorAll('[data-open-nav]').forEach(function (b) { b.addEventListener('click', openNav); });
  d.querySelectorAll('[data-close-nav]').forEach(function (b) { b.addEventListener('click', closeNav); });
  if (mnav) {
    mnav.addEventListener('click', function (e) { if (e.target === mnav) closeNav(); });
    mnav.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', closeNav); });
  }

  /* ---------------------------------------------------------- reveal */
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var revealEls = d.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else revealEls.forEach(function (el) { el.classList.add('in'); });

  /* ---------------------------------------------------------- forms */
  var ICON_OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function cleanMobile(v) {
    var x = String(v || '').replace(/[\s\-().]/g, '');
    if (x.indexOf('+91') === 0) x = x.slice(3);
    else if (x.length === 12 && x.indexOf('91') === 0) x = x.slice(2);
    else if (x.length === 11 && x.charAt(0) === '0') x = x.slice(1);
    return x;
  }
  function validMobile(v) { return /^[6-9]\d{9}$/.test(cleanMobile(v)); }
  function fallbackHtml() {
    var p = phones.admissions || {};
    return 'Sorry, the form could not be sent just now. Please <a href="tel:' + esc(p.tel) + '">call ' + esc(p.display) + '</a> or <a href="' + esc(waLink()) + '" target="_blank" rel="noopener">message us on WhatsApp</a>.';
  }

  function setErr(input, msg) {
    if (!input) return;
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    var holder = input.closest('.field') || input.parentNode;
    var e = holder.querySelector('.field-err');
    if (!e) { e = d.createElement('div'); e.className = 'field-err'; e.id = (input.id || input.name) + '-err'; holder.appendChild(e); }
    e.textContent = msg || '';
    if (msg) input.setAttribute('aria-describedby', e.id); else input.removeAttribute('aria-describedby');
  }

  function collect(form) {
    var data = {};
    var fd = new FormData(form);
    fd.forEach(function (v, k) {
      if (k === 'coaching') { (data.coaching = data.coaching || []).push(v); return; }
      if (k.indexOf('sib_') === 0) return;
      data[k] = typeof v === 'string' ? v.trim() : v;
    });
    var sibs = [];
    form.querySelectorAll('.sib-row').forEach(function (row) {
      var n = row.querySelector('[name="sib_name"]'), c = row.querySelector('[name="sib_class"]'), sc = row.querySelector('[name="sib_school"]');
      var nv = n ? n.value.trim() : '', cv = c ? c.value.trim() : '';
      var sv = sc ? sc.value.trim() : '';
      if (nv || cv || sv) sibs.push({ name: nv, class: cv, school: sv });
    });
    if (sibs.length) data.siblings = sibs;
    return data;
  }

  function validate(form, data) {
    var ok = true, first = null;
    var name = form.querySelector('[name="student_name"]');
    var mob = form.querySelector('[name="mobile"]');
    if (name) {
      var nm = (data.student_name || '').replace(/[^A-Za-z\u0C80-\u0CFF]/g, '');
      if (nm.length < 2) { setErr(name, "Please enter the student's name."); ok = false; first = first || name; } else setErr(name, '');
    }
    if (mob) {
      if (!validMobile(data.mobile)) { setErr(mob, 'Enter a 10-digit mobile number, e.g. 98450 12345.'); ok = false; first = first || mob; } else setErr(mob, '');
    }
    var email = form.querySelector('[name="email"]');
    if (email && data.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) { setErr(email, 'Please check the email address.'); ok = false; first = first || email; } else if (email) setErr(email, '');
    var visit = form.querySelector('[name="visit_date"]');
    if (visit && visit.required && !data.visit_date) { setErr(visit, 'Please choose a date for your visit.'); ok = false; first = first || visit; } else if (visit) setErr(visit, '');
    var sibErr = '';
    form.querySelectorAll('.sib-row').forEach(function (row) {
      var n = row.querySelector('[name="sib_name"]').value.trim(), c = row.querySelector('[name="sib_class"]').value.trim(), sc = row.querySelector('[name="sib_school"]').value.trim();
      if ((n || c || sc) && (!n || !c)) sibErr = 'Enter the name and class of each brother or sister, or clear the row.';
    });
    var sbox = form.querySelector('.siblings-box .field-err');
    if (sbox) sbox.textContent = sibErr;
    if (sibErr) { ok = false; first = first || form.querySelector('.sib-row input'); }
    if (first) first.focus();
    return ok;
  }

  function thankYou(form, res, data) {
    var p = phones.admissions || {};
    var box = d.createElement('div');
    box.className = 'thanks';
    box.setAttribute('tabindex', '-1');
    var first = (data.student_name || '').trim().split(/\s+/)[0];
    var title = form.dataset.channel === 'visit' ? 'Your visit request is in' : (form.dataset.channel === 'callback' ? 'We will call you back' : 'Thank you' + (first ? ', we have ' + esc(first) + "'s enquiry" : ''));
    box.innerHTML = '<div class="tick">' + ICON_OK + '</div>' +
      '<h3>' + title + '</h3>' +
      (res && res.ref ? '<div class="ref">Enquiry no. ' + esc(res.ref) + '</div>' : '') +
      '<p>' + esc(RV.callbackPromise || 'Our admissions team will call you soon.') + (res && res.again ? ' We already had your details, so we have noted that you asked again.' : '') + '</p>' +
      '<div class="row"><a class="btn wa" href="' + esc(waLink()) + '" target="_blank" rel="noopener">WhatsApp us</a>' +
      '<a class="btn outline" href="tel:' + esc(p.tel) + '">Call ' + esc(p.display) + '</a></div>';
    form.replaceWith(box);
    box.focus({ preventScroll: true });
    box.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }

  function wireForm(form) {
    if (form.dataset.wired) return;
    form.dataset.wired = '1';
    form.noValidate = true;
    var shownAt = Date.now();
    form._shown = function () { shownAt = Date.now(); };
    var status = form.querySelector('.form-status');
    if (!status) { status = d.createElement('div'); status.className = 'form-status'; form.appendChild(status); }
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    if (!form.querySelector('[name="website"]')) {
      var hp = d.createElement('div');
      hp.className = 'hp';
      hp.setAttribute('aria-hidden', 'true');
      hp.innerHTML = '<label>Website <input type="text" name="website" tabindex="-1" autocomplete="off"></label>';
      form.appendChild(hp);
    }
    form.addEventListener('input', function (e) {
      d.body.dataset.typing = '1';
      if (e.target.getAttribute('aria-invalid') === 'true') setErr(e.target, '');
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = collect(form);
      status.className = 'form-status';
      status.textContent = '';
      if (!validate(form, data)) return;
      var payload = {
        student_name: data.student_name, mobile: cleanMobile(data.mobile),
        parent_name: data.parent_name || '', email: data.email || '', stream: data.stream || '',
        coaching: data.coaching || [], prev_school: data.prev_school || '', town: data.town || '',
        m10_percent: data.m10_percent || '', siblings: data.siblings || [], message: data.message || '',
        preferred_time: data.preferred_time || '', visit_date: data.visit_date || '',
        channel: form.dataset.channel || 'enquiry-page', page: location.pathname,
        referrer: ss('rv_ref') || '', utm_source: ss('utm_source') || '', utm_medium: ss('utm_medium') || '',
        utm_campaign: ss('utm_campaign') || '', website: data.website || '', t: Date.now() - shownAt
      };
      if (form.dataset.extraMessage) payload.message = (form.dataset.extraMessage + (payload.message ? ' ' + payload.message : '')).slice(0, 1000);
      var btn = form.querySelector('[type="submit"]');
      var label = btn ? btn.innerHTML : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
      var ctrl = 'AbortController' in window ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 20000);
      fetch((RV.portal || '') + '/api/public/enquiry', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        signal: ctrl ? ctrl.signal : undefined, credentials: 'omit', mode: 'cors'
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, status: r.status, body: j }; });
      }).then(function (res) {
        clearTimeout(timer);
        if (res.ok && res.body && res.body.ok) {
          ls('rv_lead_done', String(Date.now()));
          ss('rv_name', payload.student_name);
          d.dispatchEvent(new CustomEvent('rv:lead', { detail: { channel: payload.channel } }));
          thankYou(form, res.body, payload);
          return;
        }
        throw { server: res.body && res.body.error, status: res.status };
      }).catch(function (err) {
        clearTimeout(timer);
        if (btn) { btn.disabled = false; btn.innerHTML = label; }
        status.className = 'form-status err';
        if (err && err.server) status.textContent = err.server;
        else status.innerHTML = fallbackHtml();
      });
    });
  }
  d.querySelectorAll('form[data-lead]').forEach(wireForm);

  /* siblings rows */
  d.querySelectorAll('.siblings-box').forEach(function (box) {
    var list = box.querySelector('.sib-list');
    var add = box.querySelector('.add-sib');
    var max = 4, n = 0;
    function row() {
      n++;
      var r = d.createElement('div');
      r.className = 'sib-row';
      r.innerHTML = '<div><label for="sibn' + n + '">Sibling\'s name</label><input type="text" id="sibn' + n + '" name="sib_name" autocomplete="off" maxlength="100"></div>' +
        '<div><label for="sibc' + n + '">Class</label><input type="text" id="sibc' + n + '" name="sib_class" autocomplete="off" maxlength="30" placeholder="e.g. 8th"></div>' +
        '<div class="sib-school"><label for="sibs' + n + '">School</label><input type="text" id="sibs' + n + '" name="sib_school" autocomplete="off" maxlength="120" placeholder="Any school"></div>' +
        '<button type="button" class="icon-btn" aria-label="Remove this sibling">×</button>';
      r.querySelector('button').addEventListener('click', function () {
        r.remove();
        if (!list.children.length) row();
        add.hidden = list.children.length >= max;
      });
      list.appendChild(r);
      add.hidden = list.children.length >= max;
      return r;
    }
    row();
    add.addEventListener('click', function () { var r = row(); r.querySelector('input').focus(); });
  });

  /* ---------------------------------------------------------- pulse (honest social proof) */
  var pulses = d.querySelectorAll('[data-pulse]');
  if (pulses.length && RV.portal && window.fetch) {
    var cached = ss('rv_pulse');
    var show = function (n) {
      if (typeof n !== 'number' || n < 1) return;
      pulses.forEach(function (el) { el.textContent = n + ' families enquired this week'; el.classList.add('show'); });
    };
    if (cached !== null) show(cached === '' ? null : Number(cached));
    else fetch(RV.portal + '/api/public/pulse', { credentials: 'omit', mode: 'cors' }).then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (j) { var w = j && typeof j.week === 'number' ? j.week : null; ss('rv_pulse', w === null ? '' : String(w)); show(w); })
      .catch(function () { return null; });
  }

  /* ---------------------------------------------------------- modals (visit, callback, exit) */
  var openModal = null;
  function showModal(id, opener) {
    var m = d.getElementById(id);
    if (!m) return;
    if (openModal) hideModal();
    m._opener = opener || d.activeElement;
    m.classList.add('open');
    d.body.classList.add('lock');
    openModal = m;
    var f = m.querySelector('form');
    if (f && f._shown) f._shown();
    var first = m.querySelector('input:not([type=hidden]):not([tabindex="-1"])') || m.querySelector('button');
    setTimeout(function () { if (first) first.focus(); }, 30);
  }
  function hideModal() {
    if (!openModal) return;
    var m = openModal;
    m.classList.remove('open');
    d.body.classList.remove('lock');
    openModal = null;
    if (m._opener && m._opener.focus) m._opener.focus();
  }
  d.querySelectorAll('[data-modal]').forEach(function (b) {
    b.addEventListener('click', function (e) { e.preventDefault(); showModal(b.getAttribute('data-modal'), b); });
  });
  d.querySelectorAll('.modal').forEach(function (m) {
    m.addEventListener('click', function (e) { if (e.target === m || e.target.closest('[data-close-modal]')) hideModal(); });
  });
  d.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { if (openModal) hideModal(); else if (lb && lb.classList.contains('open')) closeLb(); else closeNav(); }
    if (e.key === 'Tab' && openModal) {
      var items = Array.prototype.filter.call(openModal.querySelectorAll('a[href], button, input, select, textarea'), function (el) { return !el.disabled && el.tabIndex >= 0 && el.offsetParent !== null; });
      if (!items.length) return;
      var a = items[0], z = items[items.length - 1];
      if (e.shiftKey && d.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && d.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  });
  d.querySelectorAll('input[type="date"][data-min-today]').forEach(function (inp) {
    var t = new Date(); t.setDate(t.getDate() + 1);
    inp.min = t.toISOString().slice(0, 10);
    var mx = new Date(); mx.setDate(mx.getDate() + 90);
    inp.max = mx.toISOString().slice(0, 10);
  });

  /* exit intent: desktop only, once per session */
  var fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (fine && d.getElementById('exit-modal')) {
    var armedAt = Date.now();
    d.addEventListener('mouseout', function (e) {
      if (e.relatedTarget || e.clientY > 6 || window.innerWidth < 1024) return;
      if (Date.now() - armedAt < 8000 || ss('rv_exit') || leadDone() || openModal || d.body.dataset.typing) return;
      ss('rv_exit', '1');
      showModal('exit-modal');
    });
  }

  /* ---------------------------------------------------------- bottom-left slide-in */
  var slide = d.getElementById('slidein');
  var pill = d.getElementById('slide-pill');
  if (slide && pill) {
    var DISMISS_KEY = 'rv_pop_dismissed';
    var dismissedAt = Number(ls(DISMISS_KEY) || 0);
    var dismissed = dismissedAt && Date.now() - dismissedAt < 3 * DAY;
    if (dismissedAt && !dismissed) ls(DISMISS_KEY, null);
    var opened = false;
    var openSlide = function (byUser) {
      if (leadDone() && !byUser) return;
      if (openModal) return;
      slide.classList.add('open');
      slide.setAttribute('aria-hidden', 'false');
      slide.inert = false;
      pill.classList.remove('show');
      opened = true;
      var f = slide.querySelector('form');
      if (f && f._shown) f._shown();
      if (byUser) setTimeout(function () { var i = slide.querySelector('input:not([tabindex="-1"])'); if (i) i.focus(); }, 60);
    };
    var minimise = function () {
      slide.classList.remove('open');
      slide.setAttribute('aria-hidden', 'true');
      slide.inert = true;
      if (!leadDone()) pill.classList.add('show');
      ss('rv_pop_min', '1');
    };
    var dismiss = function () {
      slide.classList.remove('open');
      slide.setAttribute('aria-hidden', 'true');
      slide.inert = true;
      pill.classList.remove('show');
      ls(DISMISS_KEY, String(Date.now()));
    };
    slide.inert = true;
    slide.querySelector('[data-slide-min]').addEventListener('click', function () { minimise(); pill.querySelector('.open-pill').focus(); });
    slide.querySelector('[data-slide-close]').addEventListener('click', function () { dismiss(); });
    pill.querySelector('.open-pill').addEventListener('click', function () { openSlide(true); });
    pill.querySelector('.x').addEventListener('click', dismiss);
    d.querySelectorAll('[data-open-slide]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        var target = d.querySelector(b.getAttribute('data-open-slide'));
        if (target && target.offsetParent !== null) { e.preventDefault(); target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); var i = target.querySelector('input:not([tabindex="-1"])'); if (i) setTimeout(function () { i.focus({ preventScroll: true }); }, 400); return; }
        e.preventDefault();
        openSlide(true);
      });
    });
    d.addEventListener('rv:lead', function () { setTimeout(function () { if (!slide.contains(d.activeElement)) { slide.classList.remove('open'); slide.inert = true; } pill.classList.remove('show'); }, 50); });

    if (!leadDone() && !dismissed) {
      if (ss('rv_pop_min')) pill.classList.add('show');
      else {
        var seen = [];
        if ('IntersectionObserver' in window) {
          var fio = new IntersectionObserver(function (en) {
            en.forEach(function (x) {
              var i = seen.indexOf(x.target);
              if (x.isIntersecting && i < 0) seen.push(x.target);
              if (!x.isIntersecting && i >= 0) seen.splice(i, 1);
            });
          }, { threshold: 0.25 });
          d.querySelectorAll('form[data-lead]').forEach(function (f) { if (!f.closest('.slidein, .modal')) fio.observe(f); });
        }
        var auto = function () {
          if (opened || leadDone() || openModal) return;
          if (d.body.dataset.typing || seen.some(function (f) { return f.isConnected; })) { setTimeout(auto, 6000); return; }  // never cover a form the parent is looking at
          openSlide(false);
        };
        var t0 = Date.now();
        setTimeout(auto, 20000);
        var onScroll = function () {
          var h = d.documentElement.scrollHeight - window.innerHeight;
          if (h > 0 && window.scrollY / h >= 0.4 && Date.now() - t0 > 4000) { window.removeEventListener('scroll', onScroll); auto(); }
        };
        window.addEventListener('scroll', onScroll, { passive: true });
      }
    }
  }
  if (d.querySelector('.mbar')) d.body.classList.add('has-mbar');

  /* ---------------------------------------------------------- concession check */
  var conc = d.getElementById('concession-form');
  if (conc) {
    var range = conc.querySelector('#pct'), out = conc.querySelector('#pct-out'), result = d.getElementById('conc-result');
    var render = function () { out.textContent = range.value + '%'; };
    range.addEventListener('input', render);
    render();
    conc.addEventListener('submit', function (e) {
      e.preventDefault();
      var pct = Number(range.value);
      var board = (conc.querySelector('[name="board"]:checked') || {}).value || '';
      var slabs = (RV.concessionSlabs || []).slice().sort(function (a, b) { return b.min - a.min; });
      var hitSlab = slabs.filter(function (s) { return pct >= s.min; })[0];
      var big = result.querySelector('.big'), txt = result.querySelector('.txt');
      if (hitSlab) { big.textContent = hitSlab.text; txt.textContent = 'For ' + pct + '% in Class 10' + (board ? ' (' + board + ')' : '') + '. The office confirms the final concession from the marks card.'; }
      else if (pct >= 60) { big.textContent = pct >= 85 ? 'Strong marks. Ask us about a concession.' : 'Your child can apply. Ask us about concessions.'; txt.textContent = 'Sri R.V. PU College offers special concessions based on 10th results. The amount depends on the final marks card, so leave your number below and the admissions office will tell you exactly what applies for ' + pct + '%.'; }
      else { big.textContent = 'Talk to our counsellor'; txt.textContent = 'Every student is welcome to enquire. Leave your number and a counsellor will explain the options.'; }
      result.hidden = false;
      var lf = d.getElementById('conc-lead');
      if (lf) {
        lf.dataset.extraMessage = 'Concession check: 10th ' + pct + '%' + (board ? ' (' + board + ')' : '') + '.';
        var m = lf.querySelector('[name="m10_percent"]');
        if (m) m.value = String(pct);
        if (lf._shown) lf._shown();
      }
      result.focus({ preventScroll: true });
      result.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
    });
  }

  /* ---------------------------------------------------------- gallery lightbox */
  var lb = d.getElementById('lightbox'), items = [], idx = 0;
  function openLb(i) { idx = (i + items.length) % items.length; var it = items[idx]; lb.querySelector('img').src = it.src; lb.querySelector('img').alt = it.alt; lb.querySelector('.cap').textContent = it.cap; if (!lb.classList.contains('open')) { lb._opener = d.activeElement; lb.classList.add('open'); d.body.classList.add('lock'); lb.querySelector('.x').focus(); } }
  function closeLb() { lb.classList.remove('open'); d.body.classList.remove('lock'); if (lb._opener) lb._opener.focus(); }
  if (lb) {
    d.querySelectorAll('.gallery button[data-full]').forEach(function (b, i) {
      var img = b.querySelector('img');
      items.push({ src: b.getAttribute('data-full'), alt: img.alt, cap: (b.closest('figure').querySelector('figcaption') || {}).textContent || '' });
      b.addEventListener('click', function () { openLb(i); });
    });
    lb.querySelector('.x').addEventListener('click', closeLb);
    lb.querySelector('.nav-l').addEventListener('click', function () { openLb(idx - 1); });
    lb.querySelector('.nav-r').addEventListener('click', function () { openLb(idx + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) closeLb(); });
    d.addEventListener('keydown', function (e) { if (!lb.classList.contains('open')) return; if (e.key === 'ArrowLeft') openLb(idx - 1); if (e.key === 'ArrowRight') openLb(idx + 1); });
  }

  /* ---------------------------------------------------------- results wall from config */
  var rw = d.getElementById('results-wall');
  if (rw && (RV.results || []).length) {
    rw.innerHTML = RV.results.map(function (r) {
      return '<div class="result">' + (r.photo ? '<img src="' + esc(r.photo) + '" alt="' + esc(r.name) + '" loading="lazy">' : '') +
        '<div class="b"><div class="sc">' + esc(r.score) + '</div><div class="nm">' + esc(r.name) + '</div><div class="dt">' + esc(r.detail) + '</div></div></div>';
    }).join('');
    var ph = d.getElementById('results-placeholder');
    if (ph) ph.hidden = true;
  }

  /* ---------------------------------------------------------- map: load on demand (saves data on phones) */
  d.querySelectorAll('[data-map]').forEach(function (box) {
    var btn = box.querySelector('.load-map');
    var load = function () {
      if (box.querySelector('iframe')) return;
      var f = d.createElement('iframe');
      f.src = 'https://www.google.com/maps?q=' + RV.geo.lat + ',' + RV.geo.lng + '&z=16&output=embed';
      f.title = 'Map showing ' + RV.name + ', ' + RV.address.line2;
      f.loading = 'lazy';
      f.referrerPolicy = 'no-referrer-when-downgrade';
      f.allowFullscreen = true;
      box.appendChild(f);
      if (btn) btn.remove();
    };
    if (btn) btn.addEventListener('click', load);
    if (box.hasAttribute('data-map-auto') && 'IntersectionObserver' in window) {
      var mo = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { load(); mo.disconnect(); } }, { rootMargin: '200px' });
      mo.observe(box);
    }
  });
})();
