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
  function need() {
    var n = { '1080p': 0, '1440p': 1, 'Multiple monitors': 1, 'Ultrawide': 2, '4K': 3 }[A.res]; if (n == null) n = 1;
    if (A.hz === '240 Hz or more') n += 1; else if (A.hz === '60 Hz') n -= 1;
    return n;
  }
  function verdict() {
    if (!A.use) return { t: '–', cap: 'Answer a few questions to see what this build is aiming for.', fill: 0, warn: false };
    var b = BUD.indexOf(A.budget); if (A.budget === 'Not sure') b = -1;
    var light = A.use === 'Office or business software' || A.use === 'School or everyday use';
    if (light) return { t: 'Fast, quiet everyday PC', cap: 'A fast, quiet machine for everyday work, with room for plenty of tabs and apps.', fill: b < 0 ? 0 : Math.min(5, 3 + b), warn: false };
    if (b < 0) return { t: A.use + ' build', cap: 'Not sure on budget? That\'s fine. We\'ll suggest a sensible range on your build sheet.', fill: 0, warn: false };
    if (A.use === 'Video or photo editing') return b >= 2 ? { t: 'Smooth 4K editing, common footage', cap: 'Comfortable 4K editing for most footage, with fast exports.', fill: Math.min(5, b + 2), warn: false } : { t: 'Smooth 1080p editing', cap: 'Smooth 1080p editing. 4K works, with proxies on heavier projects.', fill: b + 2, warn: false };
    if (A.use === '3D, CAD or engineering') return b >= 3 ? { t: 'Heavy 3D and rendering', cap: 'Handles large scenes and long renders without breaking a sweat.', fill: 5, warn: false } : { t: 'Everyday 3D and CAD', cap: 'Smooth modeling and CAD. Big renders take longer at this budget.', fill: b + 2, warn: false };
    if (A.use === 'AI and local models') return b >= 4 ? { t: 'Larger local models', cap: 'Room for larger local models and faster responses.', fill: 5, warn: false } : b === 3 ? { t: 'Mid-size local models', cap: 'Runs mid-size local models well.', fill: 4, warn: false } : { t: 'Smaller local models', cap: 'Runs smaller local models. Bigger ones need more graphics memory.', fill: b + 2, warn: false };
    if (!A.res || A.res === 'Not sure') return { t: 'Gaming build', cap: 'Pick a monitor and we\'ll aim the build at it.', fill: b + 1, warn: false };
    var sc = b - need(), res = A.res === 'Multiple monitors' ? 'multi-monitor' : A.res;
    var fill = Math.max(1, Math.min(5, 3 + sc));
    if (sc >= 2) return { t: 'Ultra settings in most games', cap: 'Smooth ' + res + ' gaming at ultra settings in most current games.', fill: fill, warn: false };
    if (sc === 1) return { t: 'High settings in most games', cap: 'Smooth ' + res + ' gaming at high settings in most current games.', fill: fill, warn: false };
    if (sc === 0) return { t: 'Medium to high settings', cap: 'Solid ' + res + ' gaming at medium to high settings.', fill: fill, warn: false };
    var cause = A.res === '4K' ? '4K' : A.res === 'Ultrawide' ? 'Ultrawide' : '';
    if (A.hz === '240 Hz or more') cause = cause ? cause + ' at 240 Hz' : '240 Hz';
    if (!cause) cause = res + ' at this refresh rate';
    return { t: 'Stretch: may need more budget', cap: cause + ' needs more graphics power than this budget usually buys. Dropping a step in resolution or raising the budget a tier fits better.', fill: fill, warn: true };
  }
  function target() { return verdict().t; }
  function owns() {
    var h = (A.have || '').toLowerCase();
    return { gpu: /(gpu|graphics|rtx|gtx|radeon|\brx ?\d|\barc\b)/.test(h), mon: /(monitor|display|screen)/.test(h) };
  }
  function notes() {
    var n = [], b = BUD.indexOf(A.budget), light = A.use === 'Office or business software' || A.use === 'School or everyday use';
    if (!A.use) return n;
    var heavyRes = A.res === '4K' || A.res === 'Ultrawide' || A.hz === '240 Hz or more';
    if (!light && heavyRes && b >= 0 && b <= 2 && !verdict().warn && /Gaming/.test(A.use)) n.push('4K, ultrawide and 240 Hz lean hard on the graphics card. Expect to tune settings or use upscaling.');
    if (A.use === 'AI and local models') n.push(b >= 0 && b <= 3 ? 'Model size is limited mostly by graphics card memory. Some larger models won\'t fit at this budget.' : 'Graphics card memory matters most for local AI.');
    if (A.case === 'Compact' && !light) n.push('Compact cases run warmer and louder under load and leave fewer upgrades later. We\'ll pick parts that fit.');
    if (A.have) n.push('We\'ll check the parts you have are compatible and won\'t hold the new ones back.');
    var pri = { 'Gaming': 'Most of the budget usually goes to the graphics card. Plan on 32 GB of memory.', 'Gaming and streaming': 'Most of the budget goes to the graphics card, with a strong processor for streaming. Plan on 32 GB of memory.', 'Video or photo editing': 'Budget is split between processor, memory and graphics. Plan on 32 to 64 GB of memory.', '3D, CAD or engineering': 'Budget is split between processor, memory and graphics, depending on your software. Plan on 32 to 64 GB of memory.', 'AI and local models': 'More system memory helps too. Plan on 32 to 64 GB.', 'Office or business software': 'Fast storage and 16 GB of memory matter more than a graphics card.', 'School or everyday use': 'Fast storage and 16 GB of memory matter more than a graphics card.' }[A.use];
    if (pri) n.push(pri);
    return n.slice(0, 2);
  }
  function scene(x, y, w, h) {
    var u = A.use || '', s = '', cx = x + w / 2, cy = y + h / 2, o = ' stroke="#ff5818" stroke-opacity=".35" fill="none" stroke-width="1"';
    if (/Gaming/.test(u)) { s = '<path d="M' + (cx - 7) + ' ' + cy + 'h14M' + cx + ' ' + (cy - 7) + 'v14"' + o + '/><path d="M' + (x + 4) + ' ' + (y + 9) + 'v-5h5M' + (x + w - 4) + ' ' + (y + 9) + 'v-5h-5M' + (x + 4) + ' ' + (y + h - 9) + 'v5h5M' + (x + w - 4) + ' ' + (y + h - 9) + 'v5h-5"' + o + '/>'; if (/streaming/.test(u)) s += '<rect x="' + (x + w - 18) + '" y="' + (y + 6) + '" width="12" height="8" rx="1"' + o + '/>'; }
    else if (/editing/.test(u)) { for (var k = 0; k < 3; k++) s += '<rect x="' + (x + 6 + k * 6) + '" y="' + (y + h - 16 + k * 4) + '" width="' + (w * .45 - k * 8) + '" height="3"' + o + '/>'; }
    else if (/3D/.test(u)) s = '<path d="M' + (x + 14) + ' ' + (y + 12) + 'l10-5 10 5v11l-10 5-10-5zM' + (x + 14) + ' ' + (y + 12) + 'l10 5 10-5M' + (x + 24) + ' ' + (y + 17) + 'v11"' + o + '/>';
    else if (/AI/.test(u)) { for (var a = 0; a < 3; a++) s += '<path d="M' + (x + 8) + ' ' + (y + 10 + a * 6) + 'h' + (w * (.3 - a * .06)) + '"' + o + '/>'; }
    else if (/Office/.test(u)) { for (var r = 1; r < 4; r++) s += '<path d="M' + (x + 4) + ' ' + (y + r * h / 4) + 'h' + (w - 8) + '"' + o + '/>'; s += '<path d="M' + (x + w / 3) + ' ' + (y + 4) + 'v' + (h - 8) + 'M' + (x + 2 * w / 3) + ' ' + (y + 4) + 'v' + (h - 8) + '"' + o + '/>'; }
    else if (/School/.test(u)) { for (var l = 0; l < 4; l++) s += '<path d="M' + (x + 8) + ' ' + (y + 9 + l * 5) + 'h' + (w * .35) + '"' + o + '/>'; }
    return s;
  }
  function readout() {
    var $ = function (id) { return document.getElementById(id); };
    var on = function (id, v) { var el = $(id); if (el) el.classList.toggle('on', !!v); };
    var bi = BUD.indexOf(A.budget), known = bi >= 0 && A.budget !== 'Not sure';
    var tier = known ? bi : (A.budget === 'Not sure' ? 1 : -1);
    var light = ['Office or business software', 'School or everyday use'].indexOf(A.use) >= 0;
    var gpu = A.use && !light;
    $('ro-for').textContent = A.for ? (A.use ? A.use : A.for) : '–';
    $('ro-disp').textContent = A.res ? A.res + (needsHz() && A.hz && A.hz !== 'Not sure' ? ' · ' + A.hz : '') : '–';
    var V = verdict(), t = V.t, stretch = V.warn; $('ro-target').textContent = t; $('ro-target').classList.toggle('warn', stretch);
    $('ro-cap').textContent = V.cap; $('ro-cap').classList.toggle('warn', stretch);
    $('ro-notes').innerHTML = notes().map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('');
    var O = owns();
    $('ro-budget').textContent = A.budget || '–';
    $('ro-case-t').textContent = A.case ? A.case + (A.wifi === 'Yes' ? ' · Wi-Fi' : '') : '–';
    on('ro-empty', !A.for); $('ro-empty').style.opacity = A.for ? 0 : 1;
    /* case */
    $('ro-case').style.transform = A.case === 'Compact' ? 'scale(.8)' : 'scale(1)';
    $('ro-case').style.opacity = A.for ? 1 : .35;
    /* cooling */
    var heavy = ['Video or photo editing', '3D, CAD or engineering', 'AI and local models'].indexOf(A.use) >= 0;
    var ct = tier < 0 ? -1 : Math.min(3, tier + (heavy ? 1 : 0));
    if (A.case === 'Compact' && (ct === 1 || ct === 2)) ct = 0;
    on('ro-cool-air', ct === 0); on('ro-cool-airfan', ct === 0);
    on('ro-cool-tower', ct === 1 || ct === 2);
    on('ro-cool-aio', ct >= 3); on('ro-rad', ct >= 3);
    /* memory */
    [1, 2, 3, 4].forEach(function (n) { var v = tier >= 0 && n <= 2; on('ro-ram' + n, v); on('ro-ramt' + n, v); });
    /* graphics */
    var bigGpu = gpu && (A.use === 'AI and local models' || A.use === '3D, CAD or engineering' ? tier >= 2 : (tier >= 2 && need() >= 1) || tier >= 3);
    var showGpu = gpu || O.gpu;
    on('ro-gpu', showGpu); on('ro-gf1', showGpu); on('ro-gf2', showGpu); on('ro-gf3', showGpu && (bigGpu || O.gpu));
    $('ro-gpu').classList.toggle('mine', O.gpu); on('ro-gpu-yours', O.gpu);
    on('ro-igpu', A.use && light && !O.gpu);
    /* airflow */
    on('ro-f1', tier >= 0); on('ro-f2', tier >= 1); on('ro-f3', tier >= 3);
    on('ro-wifi', A.wifi === 'Yes');
    $('ro-floor').setAttribute('opacity', (tier < 0 ? .12 : .2 + tier * .16).toFixed(2));
    /* meter */
    var segs = document.querySelectorAll('.ro-meter i'), fill = V.fill;
    segs.forEach(function (sg, k) { sg.className = k < fill ? (stretch ? 'warn' : 'on') : ''; });
    /* monitor with live screen */
    var r = A.res, m = '';
    var hz = needsHz() && A.hz && A.hz !== 'Not sure' ? ({ '60 Hz': '60 Hz', '120 to 200 Hz': '120+ Hz', '240 Hz or more': '240+ Hz' })[A.hz] : '';
    function scr(x, y, w, h, l1, l2, dash) {
      var cx = x + w / 2; dash = dash || O.mon;
      return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="3" fill="url(#ro-scr)" stroke="#ffffff" stroke-opacity=".6" stroke-width="1.6"' + (dash ? ' stroke-dasharray="5 4"' : '') + '/>' + scene(x, y, w, h) + (O.mon ? '<text class="yours-tag" x="' + cx + '" y="' + (y - 5) + '" text-anchor="middle">YOURS</text>' : '') +
        '<text x="' + cx + '" y="' + (y + h / 2 + (l2 ? -1 : 4)) + '" text-anchor="middle" fill="#f0ede8" font-family="Plus Jakarta Sans,Inter,sans-serif" font-weight="800" font-size="' + Math.max(10, Math.min(18, w / 6)) + '">' + l1 + '</text>' +
        (l2 ? '<text x="' + cx + '" y="' + (y + h / 2 + 13) + '" text-anchor="middle" fill="#ff5818" font-family="ui-monospace,Menlo,Consolas,monospace" font-size="8" letter-spacing=".8">' + l2 + '</text>' : '');
    }
    function stand(cx) { return '<path d="M' + cx + ' 198v20M' + (cx - 16) + ' 220h32" stroke="#ffffff" stroke-opacity=".5" stroke-width="2" stroke-linecap="round"/>'; }
    if (r === 'Multiple monitors') m = scr(6, 152, 74, 44, '2×', hz) + scr(84, 152, 74, 44, 'Dual', '') + stand(43) + stand(121);
    else if (r) {
      var d = { '1080p': [110, 62, '1080p'], '1440p': [128, 72, '1440p'], '4K': [148, 84, '4K'], 'Ultrawide': [156, 66, '21:9'], 'Not sure': [118, 66, '?'] }[r];
      var x = 84 - d[0] / 2; m = scr(x, 196 - d[1], d[0], d[1], d[2], r === 'Not sure' ? '' : hz, r === 'Not sure') + stand(84);
    }
    $('ro-mon').innerHTML = m;
  }
  show(1);
})();

/* ---------- home die map: cycling part callouts ---------- */
(function () {
  var g = document.getElementById('die-note');
  if (!g) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var cap = document.getElementById('die-cap'), lead = document.getElementById('die-lead'), dot = document.getElementById('die-dot'), t1 = document.getElementById('die-t1'), t2 = document.getElementById('die-t2');
  /* [x, y of the part, label line 1, line 2, side] */
  var F = [
    [300, 236, 'THERMAL INTERFACE', 'PASTE OR PTM7950', 'r', 'Thermal interface', 'The paste or PTM7950 between the chip and the cooler'],
    [268, 252, 'HOT SPOT', 'HEAT BUILDS UP HERE', 'r', 'Hot spot', 'Where heat builds up first, and where throttling starts'],
    [330, 162, 'HEAT SPREADER', 'MOVES HEAT TO COOLER', 'r', 'Heat spreader', 'The metal lid that carries heat up to the cooler'],
    [132, 132, 'PIN 1 MARKER', 'LINES THE CHIP UP IN ITS SOCKET', 'l', 'Pin 1 marker', 'Lines the chip up the right way in its socket'],
    [250, 112, 'SUBSTRATE', 'LINKS CHIP TO BOARD', 'r', 'Substrate', 'The board under the chip that connects it to the motherboard']
  ];
  var i = 0;
  function place(f) {
    var x = f[0], y = f[1], d, tx, ty, anchor;
    if (f[4] === 'l') { d = 'M' + x + ' ' + y + 'L90 90H20'; tx = 20; ty = 64; anchor = 'start'; }
    else { var ey = Math.max(y - 70, 36); d = 'M' + x + ' ' + y + 'L372 ' + ey + 'h80'; tx = 374; ty = ey - 22; anchor = 'start'; }
    lead.setAttribute('d', d); dot.setAttribute('cx', x); dot.setAttribute('cy', y);
    t1.setAttribute('x', tx); t1.setAttribute('y', ty); t2.setAttribute('x', tx); t2.setAttribute('y', ty + 14);
    t1.textContent = f[2]; t2.textContent = f[3];
    if (cap) { cap.querySelector('b').textContent = f[5]; cap.querySelector('span').textContent = f[6]; }
  }
  setInterval(function () {
    g.classList.add('fade');
    setTimeout(function () { i = (i + 1) % F.length; place(F[i]); g.classList.remove('fade'); }, 450);
  }, 3800);
})();

/* ---------- Laptop Match quiz (laptops v5.5) ---------- */
(function () {
  var form = document.getElementById('lquiz');
  if (!form) return;
  var $ = function (id) { return document.getElementById(id); };
  var stage = $('lq-stage'), err = $('lq-err'), back = $('lq-back'), next = $('lq-next'), stepLbl = $('lq-step');
  var pads = form.querySelectorAll('.qpads li');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var A = { must: [], notes: '', name: '', phone: '', email: '' };
  var WHO = [['Me or my family', 'home', 'Home use'], ['Student', 'school', 'Classes and homework'], ['Business or work', 'office', 'For your job or business']];
  var USE = [['Everyday and streaming', 'home', 'Browsing, video, email'], ['School and notes', 'school', 'Docs, research, note-taking'], ['Office or business software', 'office', 'Office apps, meetings, many tabs'], ['Gaming', 'game', 'Play on the go'], ['Video or photo editing', 'video', 'Lightroom, Premiere, Resolve'], ['Programming', 'ai', 'Writing and running code']];
  var SIZE = [['13 to 14 inch', 'Light and portable', 14], ['15 to 16 inch', 'The all-rounder', 16], ['17 to 18 inch', 'Big screen, stays on a desk', 18], ['Not sure', 'We\'ll suggest one', 16]];
  var MUST = [['Long battery life', 'Lasts a full day'], ['Light to carry', 'Easy in a backpack'], ['Great screen', 'Sharp, bright, accurate color'], ['Touchscreen or 2-in-1', 'Tap, draw or fold it back'], ['Lots of ports', 'Plug in more without adapters'], ['Upgradeable', 'Add memory or storage later']];
  var OS = ['Windows', 'Mac', 'No preference'];
  var BUD = ['Under $600', '$600 to $900', '$900 to $1,300', '$1,300 to $2,000', '$2,000 or more', 'Not sure'];
  var REACH = [['Text', 'chat'], ['Phone call', 'phone'], ['Email', 'mail']];
  var step = 0, N = 5;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function ico(n) { return '<span class="ico-tile"><svg class="ico" aria-hidden="true"><use href="#i-' + n + '"/></svg></span>'; }
  function card(name, val, title, hint, icon, extra, multi) {
    var sel = multi ? A[name].indexOf(val) >= 0 : A[name] === val;
    return '<label class="qcard' + (sel ? ' sel' : '') + '"><input type="' + (multi ? 'checkbox' : 'radio') + '" name="' + name + '" value="' + esc(val) + '"' + (sel ? ' checked' : '') + ' />' + (extra || (icon ? ico(icon) : '')) + '<span class="qc-t">' + esc(title) + '</span>' + (hint ? '<span class="qc-h">' + esc(hint) + '</span>' : '') + '</label>';
  }
  function seg(name, opts) { return '<div class="qseg" role="radiogroup">' + opts.map(function (o) { var s = A[name] === o; return '<label class="' + (s ? 'sel' : '') + '"><input type="radio" name="' + name + '" value="' + esc(o) + '"' + (s ? ' checked' : '') + ' /><span>' + esc(o) + '</span></label>'; }).join('') + '</div>'; }
  function lap(w) { return '<span class="mon"><svg viewBox="0 0 60 40" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75"><rect x="' + (30 - w / 2) + '" y="' + (30 - w * .55) + '" width="' + w + '" height="' + (w * .55) + '" rx="2"/><path d="M' + (30 - w / 2 - 4) + ' 33h' + (w + 8) + '" stroke-linecap="round"/></svg></span>'; }
  var screens = [
    function () {
      var h = '<h2 class="qh">Who\'s it for?</h2><div class="qcards three">' + WHO.map(function (w) { return card('who', w[0], w[0], w[2], w[1]); }).join('') + '</div>';
      if (A.who) h += '<h3 class="qsub">What will you mostly do on it?</h3><div class="qcards">' + USE.map(function (u) { return card('use', u[0], u[0], u[2], u[1]); }).join('') + '</div>';
      return h;
    },
    function () { return '<h2 class="qh">What size feels right?</h2><div class="qcards two">' + SIZE.map(function (s, i) { return card('size', s[0], s[0], s[1], null, lap([30, 38, 46, 38][i])); }).join('') + '</div>'; },
    function () { return '<h2 class="qh">Any must-haves?</h2><p class="qp">Pick as many as you like, or skip.</p><div class="qcards">' + MUST.map(function (m) { return card('must', m[0], m[0], m[1], null, null, true); }).join('') + '</div><h3 class="qsub">Windows or Mac?</h3>' + seg('os', OS); },
    function () { return '<h2 class="qh">What\'s your budget?</h2><div class="qbig" id="lq-bud">' + (A.budget ? esc(A.budget) : 'Pick a range') + '</div>' + seg('budget', BUD) + '<div class="field" style="margin-top:20px"><label for="lq-notes">Anything else? <small>(optional)</small></label><textarea id="lq-notes" placeholder="Software you use, games you play, a deadline">' + esc(A.notes) + '</textarea></div>'; },
    function () {
      var rows = [['For', A.who + ' · ' + A.use, 0], ['Size', A.size, 1], ['Must-haves', A.must.length ? A.must.join(', ') : 'None', 2], ['System', A.os, 2], ['Budget', A.budget, 3]];
      return '<h2 class="qh">Your laptop brief</h2><dl class="brief">' + rows.map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + esc(r[1] || '–') + '</dd><button type="button" class="link qedit" data-go="' + r[2] + '">Edit</button></div>'; }).join('') + '</dl>' +
        '<h3 class="qsub">Where should we send your picks?</h3><div class="field"><label for="lq-name">Name</label><input id="lq-name" autocomplete="name" value="' + esc(A.name) + '" /></div>' +
        '<div class="row"><div class="field"><label for="lq-phone">Phone</label><input id="lq-phone" type="tel" autocomplete="tel" placeholder="(413) 555-0123" value="' + esc(A.phone) + '" /></div><div class="field"><label for="lq-email">Email</label><input id="lq-email" type="email" autocomplete="email" placeholder="you@example.com" value="' + esc(A.email) + '" /></div></div>' +
        '<h3 class="qsub">Best way to reach you</h3><div class="qcards three">' + REACH.map(function (r) { return card('reach', r[0], r[0], '', r[1]); }).join('') + '</div><p class="fine">Free, no obligation. Setup and repairs are for Windows laptops only.</p>';
    }
  ];
  function grab() { ['notes', 'name', 'phone', 'email'].forEach(function (k) { var el = $('lq-' + k); if (el) A[k] = el.value.trim(); }); }
  function check() {
    var need = [[0, 'who', 'Choose who it\'s for.'], [0, 'use', 'Choose what you\'ll mostly do on it.'], [1, 'size', 'Choose a size, or "Not sure".'], [2, 'os', 'Choose Windows, Mac or No preference.'], [3, 'budget', 'Choose a budget range, or "Not sure".'], [4, 'reach', 'Choose the best way to reach you.']];
    for (var i = 0; i < need.length; i++) if (need[i][0] === step && !A[need[i][1]]) return need[i][2];
    if (step === 4) {
      if (!A.name) return 'Add your name.';
      if (A.phone.replace(/\D/g, '').length < 10) return 'Enter a 10-digit phone number, including area code.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(A.email)) return 'Enter a valid email so we can send your picks.';
    }
    return '';
  }
  function show(dir) {
    stage.innerHTML = '<div class="qscreen' + (reduce || !dir ? '' : (dir < 0 ? ' in-back' : ' in')) + '">' + screens[step]() + '</div>';
    err.style.display = 'none'; back.style.visibility = step ? 'visible' : 'hidden';
    next.textContent = step === N - 1 ? 'Send me laptop picks' : 'Next';
    stepLbl.textContent = 'Step ' + (step + 1) + ' of ' + N;
    pads.forEach(function (p, i) { p.className = i < step ? 'done' : (i === step ? 'now' : ''); });
    readout();
  }
  function go(to) {
    grab();
    if (to > step) { var m = check(); if (m) { err.textContent = m; err.style.display = 'block'; return; } }
    var d = to > step ? 1 : -1; step = to; show(d);
    if (form.getBoundingClientRect().top < 0) form.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }
  stage.addEventListener('change', function (e) {
    var t = e.target; if (t.type !== 'radio' && t.type !== 'checkbox') return;
    if (t.type === 'checkbox') { var a = A[t.name], i = a.indexOf(t.value); if (t.checked && i < 0) a.push(t.value); if (!t.checked && i >= 0) a.splice(i, 1); t.parentNode.classList.toggle('sel', t.checked); }
    else { A[t.name] = t.value; stage.querySelectorAll('input[name="' + t.name + '"]').forEach(function (r) { r.parentNode.classList.toggle('sel', r.checked); }); }
    if (t.name === 'who') { show(0); return; }
    if (t.name === 'budget') $('lq-bud').textContent = t.value;
    err.style.display = 'none'; readout();
  });
  stage.addEventListener('click', function (e) { var b = e.target.closest('.qedit'); if (b) go(+b.dataset.go); });
  back.addEventListener('click', function () { if (step) go(step - 1); });
  pads.forEach(function (p, i) { p.addEventListener('click', function () { if (i < step) go(i); }); });
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (step < N - 1) { go(step + 1); return; }
    grab(); var m = check(); if (m) { err.textContent = m; err.style.display = 'block'; return; }
    if ($('lq-bot').value) return;
    next.disabled = true; next.textContent = 'Sending…';
    try {
      await ppcSend({ subject: 'New Laptop Match request from ' + A.name, name: A.name, phone: A.phone, email: A.email, preferred_contact: A.reach,
        laptop_for: A.who, main_use: A.use, size: A.size, must_haves: A.must.join(', ') || 'None', system: A.os, budget: A.budget, notes: A.notes || '(none)' });
      form.style.display = 'none'; $('lq-sent').style.display = 'block'; $('lq-sent-title').focus();
    } catch (x) { err.textContent = PPC_FAIL; err.style.display = 'block'; next.disabled = false; next.textContent = 'Send me laptop picks'; }
  });
  /* ---- live laptop preview ---- */
  var NEED = { 'Everyday and streaming': 0, 'School and notes': 0, 'Office or business software': 1, 'Programming': 1, 'Video or photo editing': 2, 'Gaming': 2 };
  function has(m) { return A.must.indexOf(m) >= 0; }
  function meter(id, n, warn) { document.querySelectorAll('#' + id + ' i').forEach(function (s, k) { s.className = k < n ? (warn ? 'warn' : 'on') : ''; }); }
  function scene(x, y, w, h) {
    var u = A.use || '', s = '', cx = x + w / 2, cy = y + h / 2, o = ' stroke="#ff5818" stroke-opacity=".35" fill="none" stroke-width="1.2"';
    if (u === 'Gaming') s = '<path d="M' + (cx - 9) + ' ' + cy + 'h18M' + cx + ' ' + (cy - 9) + 'v18"' + o + '/><path d="M' + (x + 6) + ' ' + (y + 12) + 'v-6h6M' + (x + w - 6) + ' ' + (y + 12) + 'v-6h-6M' + (x + 6) + ' ' + (y + h - 12) + 'v6h6M' + (x + w - 6) + ' ' + (y + h - 12) + 'v6h-6"' + o + '/>';
    else if (/editing/.test(u)) { for (var k = 0; k < 3; k++) s += '<rect x="' + (x + 10 + k * 8) + '" y="' + (y + h - 24 + k * 6) + '" width="' + (w * .5 - k * 10) + '" height="4"' + o + '/>'; }
    else if (u === 'Programming') { for (var a = 0; a < 5; a++) s += '<path d="M' + (x + 12 + (a % 2) * 10) + ' ' + (y + 14 + a * 9) + 'h' + (w * (.42 - a * .05)) + '"' + o + '/>'; }
    else if (/Office/.test(u)) { for (var r = 1; r < 4; r++) s += '<path d="M' + (x + 6) + ' ' + (y + r * h / 4) + 'h' + (w - 12) + '"' + o + '/>'; s += '<path d="M' + (x + w / 3) + ' ' + (y + 6) + 'v' + (h - 12) + 'M' + (x + 2 * w / 3) + ' ' + (y + 6) + 'v' + (h - 12) + '"' + o + '/>'; }
    else if (/School/.test(u)) { for (var l = 0; l < 5; l++) s += '<path d="M' + (x + 12) + ' ' + (y + 14 + l * 8) + 'h' + (w * .4) + '"' + o + '/>'; }
    else if (/Everyday/.test(u)) s = '<path d="M' + (cx - 8) + ' ' + (cy - 10) + 'v20l17-10z"' + o + '/>';
    return s;
  }
  function verdict() {
    if (!A.use) return { cap: 'Answer a few questions to see what kind of laptop fits.', fill: 0, warn: false };
    var b = BUD.indexOf(A.budget), n = NEED[A.use];
    if (b < 0 || A.budget === 'Not sure') return { cap: 'Not sure about budget? We\'ll suggest picks at a few price points.', fill: 0, warn: false };
    var sc = b - n, fill = Math.max(1, Math.min(5, 3 + sc));
    if (A.use === 'Gaming' && b === 0) return { cap: 'Gaming laptops under $600 make big compromises. The next budget range up gets a real graphics card.', fill: fill, warn: true };
    if (A.use === 'Gaming' && b === 1) return { cap: 'Expect an entry-level graphics card and medium settings at 1080p. The next range up gets high settings.', fill: fill, warn: false };
    if (A.use === 'Video or photo editing' && b < 2) return { cap: 'Editing works at this budget, but the next range up gets a better screen and more memory.', fill: fill, warn: true };
    if (has('Light to carry') && A.size === '17 to 18 inch') return { cap: 'Most 17 to 18 inch laptops are heavy. A few light ones exist, or a 15 to 16 inch laptop could be the sweet spot.', fill: fill, warn: true };
    var label = { 'Everyday and streaming': 'A quick, reliable laptop for everyday use and streaming.', 'School and notes': 'A light, dependable laptop for classes and homework.', 'Office or business software': 'A solid work laptop that handles meetings and lots of tabs.', 'Programming': 'A fast laptop with plenty of memory for code and tools.', 'Video or photo editing': 'A strong editing laptop with a good screen.', 'Gaming': b >= 3 ? 'A strong gaming laptop for high settings, even above 1080p.' : 'A capable gaming laptop for high settings at 1080p.' }[A.use];
    return { cap: label, fill: fill, warn: false };
  }
  function notes() {
    var n = [], mac = A.os === 'Mac', b = BUD.indexOf(A.budget);
    if (!A.use) return n;
    if (mac && A.use === 'Gaming') n.push('Most games are made for Windows, so a Mac is a weak pick for gaming.');
    if (mac && A.size === '17 to 18 inch') n.push('Macs top out at 16 inches. We\'ll suggest the 16-inch MacBook Pro or a Windows option.');
    if (mac && has('Touchscreen or 2-in-1')) n.push('Macs don\'t have touchscreens. An iPad or a Windows 2-in-1 may fit better.');
    if (mac && has('Upgradeable')) n.push('Macs can\'t be upgraded later, so buy the memory and storage you\'ll need.');
    if (mac && b === 0) n.push('Under $600 usually means an older or refurbished MacBook Air.');
    if (mac) n.push('We can suggest Macs, but our setup and repairs are Windows only.');
    if (!mac && A.use === 'Gaming') n.push('Gaming laptops trade battery life and weight for power. Most plug in to play their best.');
    if (!mac && has('Upgradeable')) n.push('Upgradeable laptops are usually a bit thicker. We\'ll flag which picks let you add memory or storage.');
    if (!mac && has('Touchscreen or 2-in-1')) n.push('2-in-1s usually cost and weigh a little more than the same laptop without a touchscreen.');
    var mem = { 'Programming': 'Look for 16 GB of memory (RAM), or 32 GB if you run containers or virtual machines.', 'Video or photo editing': 'Look for 16 GB of memory (RAM) for photos, or 32 GB for 4K video.', 'Gaming': 'Look for 16 GB of memory (RAM). 32 GB helps with newer games.' }[A.use] || (mac ? 'Look for 16 GB of memory (RAM).' : 'Look for 16 GB of memory (RAM). It\'s built in on most thin laptops, so it can\'t be added later.');
    n.push(mem);
    if (mac && n.length > 2) { var w = n.indexOf('We can suggest Macs, but our setup and repairs are Windows only.'); n.splice(w, 1); n.splice(1, 0, 'We can suggest Macs, but our setup and repairs are Windows only.'); }
    return n.slice(0, 2);
  }
  function readout() {
    var on = function (id, v) { var el = $(id); if (el) el.classList.toggle('on', !!v); };
    $('l-for').textContent = A.use || A.who || '–';
    $('l-size').textContent = A.size || '–';
    $('l-must').textContent = A.must.length ? A.must.length + ' picked' : '–';
    $('l-budget').textContent = A.budget || '–';
    $('l-sys').textContent = A.os || '–';
    var sz = (SIZE.filter(function (s) { return s[0] === A.size; })[0] || [0, 0, 16])[2];
    var gaming = A.use === 'Gaming', mac = A.os === 'Mac', rig = gaming && !mac;
    $('l-body').style.transform = 'scale(' + (sz === 14 ? .84 : sz === 18 && A.os !== 'Mac' ? 1.1 : 1) + ')';
    $('l-body').style.opacity = A.who ? 1 : .35;
    $('l-empty').style.opacity = A.who ? 0 : 1;
    on('l-num', sz === 18 && !mac); $('l-rgb').setAttribute('opacity', rig ? .9 : 0); $('l-keys').setAttribute('stroke', rig ? '#ff5818' : '#ffffff'); $('l-keys').setAttribute('stroke-opacity', rig ? .55 : .22);
    on('l-vents', rig);
    $('l-thick').setAttribute('height', rig || (has('Upgradeable') && !mac) ? 9 : sz === 14 ? 3 : 5);
    on('l-ports', !!A.who); on('l-ports-more', (has('Lots of ports') || gaming) && !mac);
    on('l-pen', has('Touchscreen or 2-in-1') && !mac);
    $('l-os').textContent = A.os && A.os !== 'No preference' ? (A.os === 'Mac' ? 'MACOS' : 'WINDOWS') : '';
    $('l-scr-t').textContent = A.size && A.size !== 'Not sure' ? (mac && sz === 18 ? '16 in' : A.size.replace(' inch', ' in')) : '';
    $('l-scene').innerHTML = scene(67, 37, 186, 112);
    var bi = BUD.indexOf(A.budget); $('l-floor').setAttribute('opacity', (bi < 0 || A.budget === 'Not sure' ? .12 : .18 + bi * .12).toFixed(2));
    var V = verdict(); $('l-cap').textContent = V.cap; $('l-cap').classList.toggle('warn', V.warn); meter('l-fit', V.fill, V.warn);
    $('l-notes').innerHTML = notes().map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('');
    if (!A.use) { meter('l-bat', 0); meter('l-wt', 0); $('l-bat-t').textContent = ''; $('l-wt-t').textContent = ''; return; }
    var bat = { 'Gaming': 1, 'Video or photo editing': 2, 'Programming': 3, 'Office or business software': 4, 'School and notes': 4, 'Everyday and streaming': 4 }[A.use];
    if (has('Long battery life')) bat++; if (sz === 18) bat--; if (mac && !gaming) bat += 1.5;
    bat = Math.max(1, Math.min(5, Math.round(bat)));
    meter('l-bat', bat); $('l-bat-t').textContent = bat >= 4 ? 'All day' : bat === 3 ? 'Most of a day' : 'A few hours';
    var wt = { 14: 1, 16: 3, 18: 4 }[sz]; if (rig) wt++; if (has('Light to carry')) wt--; if (mac && sz === 18) wt = 3;
    wt = Math.max(1, Math.min(5, wt));
    meter('l-wt', wt); $('l-wt-t').textContent = wt <= 2 ? 'Light' : wt === 3 ? 'Medium' : 'Heavy';
  }
  show(1);
})();
