/* Precision PC site behavior: scroll reveal, service tabs, build planner, FAQ filters, forms. */
document.documentElement.classList.add('js');
(function(){var h=document.querySelector('header');if(!h)return;function set(){document.documentElement.style.setProperty('--hh',h.offsetHeight+'px');}set();window.addEventListener('resize',set);})();
var WEB3FORMS_KEY = 'b2d3553d-df17-41ff-9ce2-e11c1f78308b';

/* ---------- scroll reveal ---------- */
(function () {
  var els = document.querySelectorAll('[data-reveal], .steps li, .trace');
  if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); return; }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var el = en.target, d = parseInt(el.getAttribute('data-delay') || '0', 10);
      setTimeout(function () { el.classList.add('in'); }, d);
      io.unobserve(el);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  els.forEach(function (e) { io.observe(e); });
  // safety net: never leave content hidden
  setTimeout(function () { els.forEach(function (e) { e.classList.add('in'); }); }, 4000);
})();

/* ---------- service tabs ---------- */
(function () {
  var root = document.querySelector('[data-tabs]');
  if (!root) return;
  var tabs = Array.prototype.slice.call(root.querySelectorAll('[role="tab"]'));
  function select(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
    if (history.replaceState) history.replaceState(null, '', '#' + tab.id.replace('tab-', ''));
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { select(t); });
    t.addEventListener('keydown', function (e) {
      var k = e.key, n = null;
      if (k === 'ArrowDown' || k === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
      if (k === 'ArrowUp' || k === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
      if (k === 'Home') n = tabs[0];
      if (k === 'End') n = tabs[tabs.length - 1];
      if (n) { e.preventDefault(); select(n, true); }
    });
  });
  function fromHash() {
    var h = location.hash.slice(1), t = h && document.getElementById('tab-' + h);
    if (t) { select(t); root.scrollIntoView({ block: 'start' }); }
  }
  window.addEventListener('hashchange', fromHash);
  var initial = location.hash && document.getElementById('tab-' + location.hash.slice(1));
  select(initial || tabs[0]);
  if (initial) setTimeout(function () { root.scrollIntoView({ block: 'start' }); }, 50);
})();

/* ---------- FAQ filters ---------- */
(function () {
  var bar = document.querySelector('[data-filters]');
  if (!bar) return;
  var btns = bar.querySelectorAll('button'), items = document.querySelectorAll('.faq details[data-cat]');
  btns.forEach(function (b) {
    b.addEventListener('click', function () {
      var cat = b.getAttribute('data-filter');
      btns.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      items.forEach(function (d) { d.hidden = cat !== 'all' && d.getAttribute('data-cat').split(' ').indexOf(cat) < 0; });
    });
  });
})();

/* ---------- shared form helpers ---------- */
function ppcValidContact(name1, name2, phone, email, show) {
  if (!name1 || !name2 || !phone || !email) { show('Fill in your name, phone and email so we can reach you.'); return false; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { show('That email address doesn\'t look right. Check it and try again.'); return false; }
  if (phone.replace(/\D/g, '').length < 10) { show('Enter a 10-digit phone number, including area code.'); return false; }
  return true;
}
async function ppcSend(payload) {
  var res = await fetch('https://api.web3forms.com/submit', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(Object.assign({ access_key: WEB3FORMS_KEY, from_name: 'Precision PC Website' }, payload))
  });
  var data = await res.json();
  if (!data.success) throw new Error(data.message || 'failed');
}
var PPC_FAIL = 'That didn\'t go through. Check your connection and try again, or call or text (413) 239-4183.';

/* ---------- service request form (home) ---------- */
(function () {
  var form = document.getElementById('quote-form');
  if (!form) return;
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var v = function (id) { return document.getElementById(id).value.trim(); };
    var err = document.getElementById('f-err'), btn = document.getElementById('f-btn');
    var show = function (m) { err.textContent = m; err.style.display = 'block'; };
    err.style.display = 'none';
    var first = v('f-first'), last = v('f-last'), phone = v('f-phone'), email = v('f-email'), method = v('f-method');
    if (!ppcValidContact(first, last, phone, email, show)) return;
    if (!method) { show('Choose the best way to reach you.'); return; }
    if (document.getElementById('f-bot').value) return;
    btn.disabled = true; btn.textContent = 'Sending…';
    try {
      await ppcSend({ subject: 'New Precision PC request from ' + first + ' ' + last, name: first + ' ' + last, first_name: first, last_name: last,
        phone: phone, email: email, preferred_contact: method, service: v('f-service') || 'Not specified', message: v('f-msg') || '(no details provided)' });
      form.style.display = 'none';
      document.getElementById('success-msg').style.display = 'block';
      document.getElementById('sent-title').focus();
    } catch (x) { show(PPC_FAIL); btn.disabled = false; btn.textContent = 'Send request'; }
  });
})();

/* ---------- build planner wizard ---------- */
(function () {
  var wiz = document.getElementById('planner');
  if (!wiz) return;
  var qs = Array.prototype.slice.call(wiz.querySelectorAll('.q'));
  var bar = wiz.querySelector('.progress i'), count = wiz.querySelector('[data-count]');
  var back = wiz.querySelector('[data-back]'), next = wiz.querySelector('[data-next]'), nav = wiz.querySelector('.wiz-nav');
  var err = wiz.querySelector('.error'), i = 0;
  var show = function (m) { err.textContent = m; err.style.display = 'block'; };
  function picked(name) { return Array.prototype.map.call(wiz.querySelectorAll('input[name="' + name + '"]:checked'), function (x) { return x.value; }); }
  function go(n, dir) {
    err.style.display = 'none';
    qs[i].classList.remove('on', 'back');
    i = n;
    qs[i].classList.add('on'); if (dir < 0) qs[i].classList.add('back');
    bar.style.width = Math.round((i + 1) / qs.length * 100) + '%';
    count.textContent = 'Question ' + (i + 1) + ' of ' + qs.length;
    nav.classList.toggle('can-back', i > 0);
    var last = i === qs.length - 1;
    next.textContent = last ? 'Send build request' : 'Next';
    if (last) renderSummary();
    var f = qs[i].querySelector('input:checked, input, textarea');
    if (f && dir !== 0) setTimeout(function () { f.focus({ preventScroll: true }); }, 60);
  }
  function canLeave() {
    var req = qs[i].getAttribute('data-required');
    if (req && !picked(req).length) { show(qs[i].getAttribute('data-msg')); return false; }
    return true;
  }
  function renderSummary() {
    var box = wiz.querySelector('.summary'), bits = [];
    ['use', 'budget', 'monitor', 'reuse', 'look', 'extras', 'when'].forEach(function (n) { bits = bits.concat(picked(n)); });
    var apps = document.getElementById('b-apps').value.trim(); if (apps) bits.push(apps);
    box.innerHTML = '';
    bits.forEach(function (b) { var s = document.createElement('span'); s.textContent = b; box.appendChild(s); });
  }
  // single-choice questions move on by themselves
  wiz.querySelectorAll('.q[data-auto] input[type="radio"]').forEach(function (r) {
    r.addEventListener('change', function () { setTimeout(function () { if (qs[i].contains(r)) go(i + 1, 1); }, 260); });
  });
  back.addEventListener('click', function () { if (i > 0) go(i - 1, -1); });
  wiz.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!canLeave()) return;
    if (i < qs.length - 1) { go(i + 1, 1); return; }
    var v = function (id) { return document.getElementById(id).value.trim(); };
    var first = v('b-first'), last = v('b-last'), phone = v('b-phone'), email = v('b-email');
    if (!ppcValidContact(first, last, phone, email, show)) return;
    if (document.getElementById('b-bot').value) return;
    var j = function (a) { return a.length ? a.join(', ') : 'Not specified'; };
    next.disabled = true; next.textContent = 'Sending…';
    try {
      await ppcSend({ subject: 'New build request from ' + first + ' ' + last, name: first + ' ' + last, phone: phone, email: email,
        use: j(picked('use')), budget: j(picked('budget')), monitor: j(picked('monitor')), reusing: j(picked('reuse')),
        look: j(picked('look')), extras: j(picked('extras')), timeline: j(picked('when')),
        games_apps: v('b-apps') || 'Not specified', notes: v('b-notes') || '(none)' });
      wiz.querySelector('.wiz-body').style.display = 'none';
      var done = document.getElementById('b-sent'); done.style.display = 'block';
      bar.style.width = '100%'; count.textContent = 'Done';
      document.getElementById('b-sent-title').focus();
    } catch (x) { show(PPC_FAIL); next.disabled = false; next.textContent = 'Send build request'; }
  });
  // Enter in a text box advances instead of submitting early
  wiz.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'radio' && e.target.type !== 'checkbox' && i < qs.length - 1) {
      e.preventDefault(); if (canLeave()) go(i + 1, 1);
    }
  });
  go(0, 0);
})();

/* ---------- jump chips scroll-spy (services) ---------- */
(function () {
  var bar = document.querySelector('.jump');
  if (!bar || !('IntersectionObserver' in window)) return;
  var links = Array.prototype.slice.call(bar.querySelectorAll('a'));
  var map = {};
  links.forEach(function (a) { var t = document.querySelector(a.getAttribute('href')); if (t) map[t.id] = a; });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      links.forEach(function (l) { l.classList.remove('on'); });
      var a = map[en.target.id]; if (a) { a.classList.add('on'); var row = a.parentNode; row.scrollTo({ left: a.offsetLeft - 16, behavior: 'smooth' }); }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  Object.keys(map).forEach(function (id) { io.observe(document.getElementById(id)); });
  /* click: land exactly below the sticky header + chip bar, at any screen size */
  var reduceM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  links.forEach(function (a) {
    a.addEventListener('click', function (e) {
      var t = document.querySelector(a.getAttribute('href')); if (!t) return;
      e.preventDefault();
      var head = document.querySelector('header'), off = (head ? head.offsetHeight : 0) + bar.offsetHeight + 8;
      window.scrollTo({ top: t.getBoundingClientRect().top + window.pageYOffset - off, behavior: reduceM ? 'auto' : 'smooth' });
      history.replaceState(null, '', a.getAttribute('href'));
    });
  });
})();

/* ---------- FAQ search ---------- */
(function () {
  var box = document.getElementById('faq-search');
  if (!box) return;
  var groups = document.querySelectorAll('.faq-group'), none = document.querySelector('.no-results');
  box.addEventListener('input', function () {
    var q = box.value.trim().toLowerCase(), any = false;
    groups.forEach(function (g) {
      var shown = 0;
      g.querySelectorAll('details').forEach(function (d) {
        var hit = !q || d.textContent.toLowerCase().indexOf(q) > -1;
        d.hidden = !hit; if (hit) shown++;
        if (q && hit) d.open = true; if (!q) d.open = false;
      });
      g.hidden = shown === 0; if (shown) any = true;
    });
    none.style.display = any ? 'none' : 'block';
  });
})();

/* ---------- build board + estimate ---------- */
(function () {
  var form = document.getElementById('planner'), board = document.getElementById('board');
  if (!form || !board) return;
  var MAP = { use: 'cpu', budget: 'mb', monitor: 'gpu', reuse: 'ssd', look: 'case', when: 'cool' };
  function picked(n) { return Array.prototype.map.call(form.querySelectorAll('input[name="' + n + '"]:checked'), function (x) { return x.value; }); }
  function short(v) { return v.replace(/\s*\(\+\$\d+\)/, ''); }
  function money(n) { return '$' + n.toLocaleString('en-US'); }
  function update() {
    Object.keys(MAP).forEach(function (q) {
      var slot = board.querySelector('.s-' + MAP[q]), v = picked(q);
      slot.classList.toggle('lit', v.length > 0);
      slot.querySelector('small').textContent = v.length ? v.map(short).join(', ') : '';
    });
    var ex = picked('extras');
    var tuning = ex.some(function (e) { return /tuning/i.test(e); });
    var cables = ex.some(function (e) { return /cables/i.test(e); });
    var order = ex.some(function (e) { return /order the parts/i.test(e); });
    board.querySelector('.s-ram').classList.toggle('lit', tuning || ex.length > 0);
    board.querySelector('.s-ram small').textContent = tuning ? 'Tuned timings' : (ex.length ? 'XMP or EXPO' : '');
    board.querySelector('.s-psu').classList.toggle('lit', cables || ex.length > 0);
    board.querySelector('.s-psu small').textContent = cables ? 'Sleeved cables' : (ex.length ? 'Sized to the build' : '');
    var total = 150, rows = '<div><span>Build labor</span><span>$150</span></div>';
    if (tuning) { total += 149; rows += '<div><span>Advanced tuning</span><span>from $149</span></div>'; }
    if (cables) { total += 15; rows += '<div><span>Cable install</span><span>$15</span></div>'; }
    if (order) { total += 25; rows += '<div><span>We order the parts</span><span>$25</span></div>'; }
    var b = picked('budget');
    rows += '<div class="tot"><span>Labor, add-ons and fees</span><span>' + (tuning ? 'from ' : '') + money(total) + '</span></div>';
    board.querySelector('.estimate').innerHTML = rows + '<p>Parts: ' + (b.length ? b[0] : 'your budget') + ', bought at cost. Exact parts and prices come on your build sheet.</p>';
  }
  form.addEventListener('change', update);
  form.addEventListener('input', update);
  update();
})();

/* ---------- custom build request form (builds) ---------- */
(function () {
  var form = document.getElementById('build-form');
  if (!form) return;
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var v = function (id) { return document.getElementById(id).value.trim(); };
    var err = document.getElementById('b-err'), btn = document.getElementById('b-btn');
    var show = function (m) { err.textContent = m; err.style.display = 'block'; };
    err.style.display = 'none';
    if (!v('b-for')) { show('Choose who the PC is for.'); return; }
    if (!v('b-use')) { show('Choose the main thing you\'ll use it for.'); return; }
    if (!v('b-budget')) { show('Choose a budget range, or "Not sure".'); return; }
    var first = v('b-first'), last = v('b-last'), phone = v('b-phone'), email = v('b-email'), method = v('b-method');
    if (!ppcValidContact(first, last, phone, email, show)) return;
    if (!method) { show('Choose the best way to reach you.'); return; }
    if (document.getElementById('b-bot').value) return;
    btn.disabled = true; btn.textContent = 'Sending…';
    try {
      await ppcSend({ subject: 'New custom build request from ' + first + ' ' + last, name: first + ' ' + last, phone: phone, email: email,
        preferred_contact: method, business_name: v('b-biz') || '(none)', build_for: v('b-for'), main_use: v('b-use'),
        monitor: v('b-res') || 'Not given', refresh_rate: v('b-hz') || 'Not given', parts_budget: v('b-budget'),
        case_size: v('b-case') || 'Not given', wifi_bluetooth: v('b-wifi') || 'Not given',
        parts_they_have: v('b-have') || 'None', notes: v('b-notes') || '(none)' });
      form.style.display = 'none';
      document.getElementById('b-sent').style.display = 'block';
      document.getElementById('b-sent-title').focus();
    } catch (x) { show(PPC_FAIL); btn.disabled = false; btn.textContent = 'Get my free build sheet'; }
  });
})();

/* ---------- short service request form (home v5) ---------- */
(function () {
  var form = document.getElementById('request-form');
  if (!form) return;
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var v = function (id) { return document.getElementById(id).value.trim(); };
    var err = document.getElementById('r-err'), btn = document.getElementById('r-btn');
    var show = function (m) { err.textContent = m; err.style.display = 'block'; };
    err.style.display = 'none';
    var name = v('r-name'), phone = v('r-phone'), email = v('r-email'), msg = v('r-msg');
    if (!name) { show('Add your name so we know who to reach.'); return; }
    if (phone.replace(/\D/g, '').length < 10) { show('Enter a 10-digit phone number, including area code.'); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { show('That email address doesn\'t look right. Check it, or leave it blank.'); return; }
    if (!msg) { show('Tell us a little about what\'s going on.'); return; }
    if (document.getElementById('r-bot').value) return;
    btn.disabled = true; btn.textContent = 'Sending…';
    try {
      await ppcSend({ subject: 'New Precision PC request from ' + name, name: name, phone: phone, email: email || '(none)', message: msg });
      form.style.display = 'none';
      document.getElementById('r-sent').style.display = 'block';
      document.getElementById('r-sent-title').focus();
    } catch (x) { show(PPC_FAIL); btn.disabled = false; btn.textContent = 'Send request'; }
  });
})();

/* ---------- custom build quiz (builds v5) ---------- */
(function () {
  var form = document.getElementById('quiz');
  if (!form) return;
  var stage = document.getElementById('q-stage'), err = document.getElementById('q-err');
  var back = document.getElementById('q-back'), next = document.getElementById('q-next'), stepLbl = document.getElementById('q-step');
  var pads = form.querySelectorAll('.qpads li');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var A = { have: '', notes: '', name: '', phone: '', email: '', biz: '' };
  var USE_HOME = [['Gaming','game','Smooth frames at your resolution'],['Gaming and streaming','stream','Play and broadcast at once'],['Video or photo editing','video','Premiere, Resolve, Lightroom'],['3D, CAD or engineering','cube','Blender, SolidWorks, Fusion'],['AI and local models','ai','Running models on your own GPU'],['School or everyday use','school','Browsing, homework, streaming']];
  var USE_BIZ = [['Office or business software','office','Email, Office, accounting, browsers'],['Video or photo editing','video','Marketing, video and photo work'],['3D, CAD or engineering','cube','Design and engineering seats'],['AI and local models','ai','Private, on-site AI tools']];
  var RES = [['1080p','Full HD',16,9,34],['1440p','QHD, the gaming sweet spot',16,9,42],['4K','Ultra HD',16,9,50],['Ultrawide','21:9 and wider',21,9,56],['Multiple monitors','Two or more screens',16,9,30],['Not sure','We\'ll help you pick',16,9,36]];
  var HZ = ['60 Hz','120 to 200 Hz','240 Hz or more','Not sure'];
  var BUD = ['Under $800','$800 to $1,200','$1,200 to $1,800','$1,800 to $2,500','$2,500 or more','Not sure'];
  var CASES = [['Standard','Mid tower, easiest to cool and upgrade'],['Compact','Small form factor, fits a desk or shelf'],['No preference','We\'ll pick what suits the parts']];
  var WIFI = ['Yes','No','Not sure'];
  var REACH = [['Text','chat'],['Phone call','phone'],['Email','mail']];
  var step = 0, N = 5;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function ico(n) { return '<span class="ico-tile"><svg class="ico" aria-hidden="true"><use href="#i-' + n + '"/></svg></span>'; }
  function card(name, val, title, hint, icon, extra) {
    var sel = A[name] === val ? ' sel' : '';
    return '<label class="qcard' + sel + '"><input type="radio" name="' + name + '" value="' + esc(val) + '"' + (sel ? ' checked' : '') + ' />' + (extra || (icon ? ico(icon) : '')) + '<span class="qc-t">' + esc(title) + '</span>' + (hint ? '<span class="qc-h">' + esc(hint) + '</span>' : '') + '</label>';
  }
  function seg(name, opts) {
    return '<div class="qseg" role="radiogroup">' + opts.map(function (o) { var sel = A[name] === o; return '<label class="' + (sel ? 'sel' : '') + '"><input type="radio" name="' + name + '" value="' + esc(o) + '"' + (sel ? ' checked' : '') + ' /><span>' + esc(o) + '</span></label>'; }).join('') + '</div>';
  }
  function mon(w, h, sz, multi) {
    var W = sz, H = Math.round(sz * h / w), x = (60 - W) / 2, y = (40 - H) / 2;
    var r = '<rect x="' + x + '" y="' + y + '" width="' + W + '" height="' + H + '" rx="2"/>';
    if (multi) r = '<rect x="4" y="10" width="25" height="15" rx="2"/><rect x="31" y="10" width="25" height="15" rx="2"/>';
    return '<span class="mon"><svg viewBox="0 0 60 40" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75">' + r + '<path d="M26 36h8" stroke-linecap="round"/></svg></span>';
  }
  function needsHz() { return ['Gaming', 'Gaming and streaming'].indexOf(A.use) >= 0; }
  var screens = [
    function () {
      var h = '<h2 class="qh">Who\'s it for?</h2><div class="qcards two">' + card('for', 'Home or gaming', 'Home or gaming', 'For you or your family', 'home') + card('for', 'Business or work', 'Business or work', 'Work machines and offices', 'office') + '</div>';
      if (A.for) {
        var list = A.for === 'Business or work' ? USE_BIZ : USE_HOME;
        h += '<h3 class="qsub">What will it mostly do?</h3><div class="qcards">' + list.map(function (u) { return card('use', u[0], u[0], u[2], u[1]); }).join('') + '</div>';
      }
      return h;
    },
    function () {
      var h = '<h2 class="qh">What will you plug it into?</h2><div class="qcards">' + RES.map(function (r) { return card('res', r[0], r[0], r[1], null, mon(r[2], r[3], r[4], r[0] === 'Multiple monitors')); }).join('') + '</div>';
      if (needsHz()) h += '<h3 class="qsub">Refresh rate</h3>' + seg('hz', HZ);
      return h;
    },
    function () {
      return '<h2 class="qh">What\'s your budget for parts?</h2><p class="qp">Just the parts. Your build sheet lists labor separately.</p><div class="qbig" id="q-bud">' + (A.budget ? esc(A.budget) : 'Pick a range') + '</div>' + seg('budget', BUD);
    },
    function () {
      return '<h2 class="qh">A few details</h2><h3 class="qsub" style="margin-top:0">Case size</h3><div class="qcards">' + CASES.map(function (c, i) {
        var t = '<span class="mon"><svg viewBox="0 0 60 40" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75">' + (i === 1 ? '<rect x="22" y="12" width="16" height="25" rx="2"/>' : '<rect x="19" y="3" width="22" height="34" rx="2"' + (i === 2 ? ' stroke-dasharray="3 3"' : '') + '/>') + '</svg></span>';
        return card('case', c[0], c[0], c[1], null, t); }).join('') + '</div>' +
        '<h3 class="qsub">Need Wi-Fi or Bluetooth?</h3>' + seg('wifi', WIFI) +
        '<div class="field" style="margin-top:20px"><label for="q-have">Parts you already have <small>(optional)</small></label><input id="q-have" value="' + esc(A.have) + '" placeholder="For example: RTX 3080, 2TB NVMe SSD, Windows license" /></div>' +
        '<div class="field"><label for="q-notes">Anything else? <small>(optional)</small></label><textarea id="q-notes" placeholder="A look you want, a deadline, other uses">' + esc(A.notes) + '</textarea></div>';
    },
    function () {
      var rows = [['For', A.for + ' · ' + A.use, 0], ['Display', A.res + (needsHz() && A.hz ? ' · ' + A.hz : ''), 1], ['Parts budget', A.budget, 2], ['Case', A.case + (A.wifi ? ' · Wi-Fi: ' + A.wifi : ''), 3]];
      if (A.have) rows.push(['You have', A.have, 3]);
      var biz = A.for === 'Business or work';
      return '<h2 class="qh">Your build brief</h2><dl class="brief">' + rows.map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + esc(r[1] || '–') + '</dd><button type="button" class="link qedit" data-go="' + r[2] + '">Edit</button></div>'; }).join('') + '</dl>' +
        '<h3 class="qsub">Where should we send your build sheet?</h3>' +
        '<div class="row"><div class="field"><label for="q-name">Name</label><input id="q-name" autocomplete="name" value="' + esc(A.name) + '" /></div>' +
        (biz ? '<div class="field"><label for="q-biz">Business name <small>(optional)</small></label><input id="q-biz" autocomplete="organization" value="' + esc(A.biz) + '" /></div>' : '<div></div>') + '</div>' +
        '<div class="row"><div class="field"><label for="q-phone">Phone</label><input id="q-phone" type="tel" autocomplete="tel" placeholder="(413) 555-0123" value="' + esc(A.phone) + '" /></div><div class="field"><label for="q-email">Email</label><input id="q-email" type="email" autocomplete="email" placeholder="you@example.com" value="' + esc(A.email) + '" /></div></div>' +
        '<h3 class="qsub">Best way to reach you</h3><div class="qcards three">' + REACH.map(function (r) { return card('reach', r[0], r[0], '', r[1]); }).join('') + '</div>' +
        '<p class="fine">Free, no obligation. Nothing is ordered until you approve your build sheet.</p>';
    }
  ];
  function grab() {
    ['have', 'notes', 'name', 'phone', 'email', 'biz'].forEach(function (k) { var el = document.getElementById('q-' + k); if (el) A[k] = el.value.trim(); });
  }
  function check() {
    var need = [[0, 'for', 'Choose who it\'s for.'], [0, 'use', 'Choose what it will mostly do.'], [1, 'res', 'Choose your monitor, or "Not sure".'], [2, 'budget', 'Pick a budget range, or "Not sure".'], [3, 'case', 'Choose a case size.'], [4, 'reach', 'Choose the best way to reach you.']];
    for (var i = 0; i < need.length; i++) if (need[i][0] === step && !A[need[i][1]]) return need[i][2];
    if (step === 1 && needsHz() && !A.hz) return 'Choose a refresh rate, or "Not sure".';
    if (step === 4) {
      if (!A.name) return 'Add your name.';
      if (A.phone.replace(/\D/g, '').length < 10) return 'Enter a 10-digit phone number, including area code.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(A.email)) return 'Enter a valid email so we can send your build sheet.';
    }
    return '';
  }
  function show(dir) {
    stage.innerHTML = '<div class="qscreen' + (reduce || !dir ? '' : (dir < 0 ? ' in-back' : ' in')) + '">' + screens[step]() + '</div>';
    err.style.display = 'none';
    back.style.visibility = step ? 'visible' : 'hidden';
    next.textContent = step === N - 1 ? 'Send my build request' : 'Next';
    stepLbl.textContent = 'Step ' + (step + 1) + ' of ' + N;
    pads.forEach(function (p, i) { p.className = i < step ? 'done' : (i === step ? 'now' : ''); });
    readout();
  }
  function go(to) {
    grab();
    if (to > step) { var m = check(); if (m) { err.textContent = m; err.style.display = 'block'; return; } }
    var d = to > step ? 1 : -1; step = to; show(d);
    var top = form.getBoundingClientRect().top; if (top < 0) form.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }
  stage.addEventListener('change', function (e) {
    var t = e.target; if (t.type !== 'radio') return;
    A[t.name] = t.value;
    if (t.name === 'for') { A.use = ''; show(0); var u = stage.querySelector('.qsub'); if (u && !reduce) u.parentNode.querySelectorAll('.qsub, .qsub + .qcards').forEach(function (n) { n.classList.add('reveal-in'); }); return; }
    stage.querySelectorAll('input[name="' + t.name + '"]').forEach(function (r) { r.parentNode.classList.toggle('sel', r.checked); });
    if (t.name === 'budget') document.getElementById('q-bud').textContent = t.value;
    if (t.name === 'use' && !needsHz()) A.hz = '';
    err.style.display = 'none'; readout();
  });
  stage.addEventListener('click', function (e) { var b = e.target.closest('.qedit'); if (b) go(+b.dataset.go); });
  back.addEventListener('click', function () { if (step) go(step - 1); });
  form.querySelectorAll('.qpads li').forEach(function (p, i) { p.addEventListener('click', function () { if (i < step) go(i); }); });
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (step < N - 1) { go(step + 1); return; }
    grab(); var m = check(); if (m) { err.textContent = m; err.style.display = 'block'; return; }
    if (document.getElementById('q-bot').value) return;
    next.disabled = true; next.textContent = 'Sending…';
    try {
      await ppcSend({ subject: 'New custom build request from ' + A.name, name: A.name, phone: A.phone, email: A.email, preferred_contact: A.reach,
        business_name: A.biz || '(none)', build_for: A.for, main_use: A.use, monitor: A.res, refresh_rate: needsHz() ? (A.hz || 'Not given') : 'n/a',
        parts_budget: A.budget, case_size: A.case, wifi_bluetooth: A.wifi || 'Not given', parts_they_have: A.have || 'None', notes: A.notes || '(none)' });
      form.style.display = 'none';
      document.getElementById('q-sent').style.display = 'block';
      document.getElementById('q-sent-title').focus();
    } catch (x) { err.textContent = PPC_FAIL; err.style.display = 'block'; next.disabled = false; next.textContent = 'Send my build request'; }
  });
  /* live readout: only reflects real answers */
  function target() {
    if (!A.use) return '–';
    var b = BUD.indexOf(A.budget); if (A.budget === 'Not sure') b = -1;
    if (A.use === 'Office or business software' || A.use === 'School or everyday use') return 'Fast, quiet everyday PC';
    if (A.use === 'Video or photo editing') return b < 0 ? 'Editing build' : (b >= 2 ? 'Smooth 4K editing, common footage' : 'Smooth 1080p editing');
    if (A.use === '3D, CAD or engineering') return b < 0 ? '3D and CAD build' : (b >= 3 ? 'Heavy 3D and rendering' : 'Everyday 3D and CAD');
    if (A.use === 'AI and local models') return b < 0 ? 'Local AI build' : (b >= 4 ? 'Larger local models' : b === 3 ? 'Mid-size local models' : 'Smaller local models');
    if (!A.res || A.res === 'Not sure' || b < 0) return 'Gaming build';
    var need = { '1080p': 0, '1440p': 1, 'Multiple monitors': 1, 'Ultrawide': 2, '4K': 3 }[A.res];
    need += A.hz === '240 Hz or more' ? 1 : (A.hz === '60 Hz' ? -1 : 0);
    var sc = b - need;
    return sc >= 2 ? 'Ultra settings in most games' : sc === 1 ? 'High settings in most games' : sc === 0 ? 'Medium to high settings' : 'Stretch: may need more budget';
  }
  function readout() {
    var $ = function (id) { return document.getElementById(id); };
    $('ro-for').textContent = A.for ? (A.use ? A.use : A.for) : '–';
    $('ro-disp').textContent = A.res ? A.res + (needsHz() && A.hz && A.hz !== 'Not sure' ? ' · ' + A.hz : '') : '–';
    var t = target(); $('ro-target').textContent = t; $('ro-target').classList.toggle('warn', /^Stretch/.test(t));
    $('ro-budget').textContent = A.budget || '–';
    $('ro-case').textContent = A.case ? A.case + (A.wifi === 'Yes' ? ' · Wi-Fi' : '') : '–';
    var bi = BUD.indexOf(A.budget); var heat = bi < 0 || A.budget === 'Not sure' ? .15 : .15 + bi * .15;
    if (['Video or photo editing', '3D, CAD or engineering', 'AI and local models'].indexOf(A.use) >= 0) heat += .12;
    $('ro-glow').setAttribute('opacity', Math.min(heat, .85).toFixed(2));
    var gpu = A.use && ['Office or business software', 'School or everyday use'].indexOf(A.use) < 0;
    var g = $('ro-gpu'); g.setAttribute('opacity', gpu ? 1 : 0); g.setAttribute('height', 8 + Math.max(0, bi) * 2);
    $('ro-wifi').setAttribute('opacity', A.wifi === 'Yes' ? 1 : 0);
    $('ro-tower').style.transform = A.case === 'Compact' ? 'scale(.72)' : 'scale(1)';
    var m = '', r = A.res;
    if (r === 'Multiple monitors') m = '<rect x="14" y="110" width="74" height="44" rx="3"/><rect x="96" y="110" width="74" height="44" rx="3"/><path d="M51 154v12M133 154v12M38 168h26M120 168h26"/>';
    else if (r === 'Ultrawide') m = '<rect x="14" y="104" width="160" height="62" rx="4"/><path d="M94 166v14M76 182h36"/>';
    else if (r) { var w = { '1080p': 104, '1440p': 124, '4K': 150, 'Not sure': 110 }[r]; var h = Math.round(w * 9 / 16); var x = 94 - w / 2; m = '<rect x="' + x + '" y="' + (168 - h) + '" width="' + w + '" height="' + h + '" rx="4"' + (r === 'Not sure' ? ' stroke-dasharray="5 5"' : '') + '/><path d="M94 168v12M76 182h36"/>'; if (r === '4K') m += '<path d="M' + (x + 8) + ' ' + (168 - h + 8) + 'h' + (w - 16) + '" stroke-opacity=".25"/>'; }
    $('ro-mons').innerHTML = m;
  }
  show(1);
})();
