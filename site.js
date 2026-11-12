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
      return; /* tabs mode: chips are set on click */
      links.forEach(function (l) { l.classList.remove('on'); });
      var a = map[en.target.id]; if (a) { a.classList.add('on'); var row = a.parentNode; row.scrollTo({ left: a.offsetLeft - 16, behavior: 'smooth' }); }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  Object.keys(map).forEach(function (id) { io.observe(document.getElementById(id)); });
  /* tabs: only the picked section shows, right under the chips. Click it again (or Esc) to close it. */
  var reduceM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var secs = links.map(function (a) { return document.querySelector(a.getAttribute('href')); }).filter(Boolean);
  var cur = null;
  document.body.classList.add('jfocus');
  var hint = document.createElement('p'); hint.className = 'jhint wrap'; hint.textContent = 'Pick a category above to see what we do and what it costs.';
  bar.parentNode.insertBefore(hint, bar.nextSibling);
  function stuckTop() { var head = document.querySelector('header'); return head ? head.offsetHeight : 0; }
  function open(t, a, animate) {
    var wasStuck = bar.getBoundingClientRect().top <= stuckTop() + 1;
    cur = t; hint.hidden = !!t;
    secs.forEach(function (s) { s.hidden = s !== t; s.classList.remove('pop'); });
    links.forEach(function (l) { var on = l === a; l.classList.toggle('on', on); l.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    if (t) { void t.offsetWidth; if (animate && !reduceM) t.classList.add('pop'); t.querySelectorAll('[data-reveal], .stg').forEach(function (el) { el.classList.add('in'); }); }
    if (wasStuck) { var pv = bar.previousElementSibling; window.scrollTo({ top: (pv ? pv.offsetTop + pv.offsetHeight : 0) - stuckTop(), behavior: 'instant' }); }
    history.replaceState(null, '', t ? a.getAttribute('href') : location.pathname);
  }
  var start = links.filter(function (l) { return l.getAttribute('href') === location.hash; })[0] || links[0];
  open(document.querySelector(start.getAttribute('href')), start, false);
  links.forEach(function (a) {
    a.setAttribute('role', 'button');
    a.addEventListener('click', function (e) {
      var t = document.querySelector(a.getAttribute('href')); if (!t) return;
      e.preventDefault();
      if (cur === t) open(null, null, false); else open(t, a, true);
    });
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && cur) open(null, null, false); });
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
    if (cables) { total += 15; rows += '<div><span>Sleeved or custom cables</span><span>$15</span></div>'; }
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
    var name = v('r-name'), phone = v('r-phone'), email = v('r-email'), town = v('r-town'), device = v('r-device'), msg = v('r-msg');
    if (!name) { show('Add your name so we know who to reach.'); return; }
    if (phone.replace(/\D/g, '').length < 10) { show('Enter a 10-digit phone number, including area code.'); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { show('That email address doesn\'t look right. Check it, or leave it blank.'); return; }
    if (!town) { show('Choose your town so we can tell you the service call price.'); return; }
    if (!msg) { show('Tell us a little about what\'s going on.'); return; }
    if (document.getElementById('r-bot').value) return;
    btn.disabled = true; btn.textContent = 'Sending…';
    try {
      await ppcSend({ subject: 'New Precision PC request from ' + name + ' (' + town + ')', name: name, phone: phone, email: email || '(none)', town: town, computer: device || '(not given)', message: msg });
      form.style.display = 'none';
      document.getElementById('r-sent').style.display = 'block';
      document.getElementById('r-sent-title').focus();
    } catch (x) { show(PPC_FAIL); btn.disabled = false; btn.textContent = 'Send request'; }
  });
})();

/* ---------- quiz stat bars (shared) ---------- */
function statsHTML(rows, empty) {
  if (!rows.length) return '<p class="ro-empty-stats">' + empty + '</p>';
  return rows.map(function (r) {
    var bars = ''; for (var k = 0; k < 5; k++) bars += '<i' + (k < r[1] ? ' class="' + (r[3] ? 'warn' : 'on') + '"' : '') + '></i>';
    return '<div class="ro-meter"><span>' + r[0] + (r[2] ? ' <b>' + r[2] + '</b>' : '') + '</span>' + bars + '</div>';
  }).join('');
}

/* ---------- custom build quiz (v6.4.0: simple, email us what we need) ---------- */
(function () {
  var form = document.getElementById('quiz');
  if (!form) return;
  var stage = document.getElementById('q-stage'), err = document.getElementById('q-err');
  var back = document.getElementById('q-back'), next = document.getElementById('q-next'), stepLbl = document.getElementById('q-step');
  var pads = form.querySelectorAll('.qpads li');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var A = { uses: [], style: [], color: [], light: [], look: [], budget: [], reach: [], apps: '', have: '', notes: '', name: '', phone: '', email: '', bizname: '' };
  var USES = [['Gaming','game','High frame rates at your resolution'],['Streaming','stream','Gaming plus a live stream or recording'],['Photo or video editing','video','Premiere, Resolve, Lightroom, Photoshop'],['3D, CAD or engineering','cube','Blender, SolidWorks, AutoCAD, Fusion'],['AI on your own PC','ai','Local LLMs and image generation on your graphics card'],['Office or school','school','Browsing, Office, school work, email']];
  var STYLE = ['Glass showcase','Clean and solid','Small and compact','Airflow first','No preference'];
  var COLOR = ['Black','White','Something else','No preference'];
  var LIGHT = ['No lights','One color','Full RGB','No preference'];
  var LOOK = ['Wi-Fi and Bluetooth','Extra quiet','Front USB-C','Lots of storage','Room to add parts later'];
  var BUD = ['Under $800','$800 to $1,200','$1,200 to $1,800','$1,800 to $2,500','$2,500 or more','Not sure'];
  var REACH = [['Text','chat'],['Phone call','phone'],['Email','mail']];
  var step = 0, N = 5;

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function ico(n) { return '<span class="ico-tile"><svg class="ico" aria-hidden="true"><use href="#i-' + n + '"/></svg></span>'; }
  function isSel(name, val) { return A[name].indexOf(val) >= 0; }
  function full() { return false; }
  function card(name, val, title, hint, icon, extra) {
    var sel = isSel(name, val), f = full(name, sel);
    return '<label class="qcard' + (sel ? ' sel' : '') + (f ? ' is-full' : '') + '"' + (f ? ' aria-disabled="true"' : '') + '><input type="checkbox" name="' + name + '" value="' + esc(val) + '"' + (sel ? ' checked' : '') + ' />' + (extra || (icon ? ico(icon) : '')) + '<span class="qc-t">' + esc(title) + '</span>' + (hint ? '<span class="qc-h">' + esc(hint) + '</span>' : '') + '</label>';
  }
  function chips(name, opts) {
    return '<div class="qchips">' + opts.map(function (o) { var s = isSel(name, o), f = full(name, s); return '<label class="' + (s ? 'sel' : '') + (f ? ' is-full' : '') + '"><input type="checkbox" name="' + name + '" value="' + esc(o) + '"' + (s ? ' checked' : '') + ' /><span>' + esc(o) + '</span></label>'; }).join('') + '</div>';
  }
  function pickNote() { return '<p class="qp">Pick as many as apply.</p>'; }
  function list(a) { return a.join(', '); }

  var screens = [
    function () {
      return '<h2 class="qh" id="qh-uses">What\'s this PC for?</h2>' + pickNote() + '<div class="qcards" role="group" aria-labelledby="qh-uses">' + USES.map(function (u) { return card('uses', u[0], u[0], u[2], u[1]); }).join('') + '</div>';
    },
    function () {
      return '<h2 class="qh">What programs and games will it run?</h2><p class="qp">Type what you use most, separated by commas. Work software counts too: Adobe apps, finance programs, Teams, anything.</p>' +
        '<div class="field"><label for="q-apps">Programs and games</label><textarea id="q-apps" rows="5" placeholder="For example: Photoshop, Premiere Pro, QuickBooks, Microsoft Teams, Excel, Fortnite">' + esc(A.apps) + '</textarea></div>';
    },
    function () {
      return '<h2 class="qh">Case and features</h2><p class="qp">All optional. Pick as many as apply in each group, or skip.</p>' +
        '<h3 class="qsub" style="margin-top:6px">Case style</h3>' + chips('style', STYLE) +
        '<h3 class="qsub">Color</h3>' + chips('color', COLOR) +
        '<h3 class="qsub">Lighting</h3>' + chips('light', LIGHT) +
        '<h3 class="qsub">Extras</h3>' + chips('look', LOOK) +
        '<div class="field" style="margin-top:20px"><label for="q-have">What are you using now? <small>(optional)</small></label><input id="q-have" value="' + esc(A.have) + '" placeholder="For example: a 6-year-old Dell, or parts to reuse like an RTX 3080 or a 2 TB SSD" /></div>';
    },
    function () {
      return '<h2 class="qh">What\'s your parts budget?</h2><p class="qp">Pick the range or ranges that fit. Parts only. Build labor is listed separately on your build sheet.</p>' + chips('budget', BUD) +
        '<div class="field" style="margin-top:20px"><label for="q-notes">Anything else? <small>(optional)</small></label><textarea id="q-notes" placeholder="A deadline, a case you like, how many years you want it to last">' + esc(A.notes) + '</textarea></div>';
    },
    function () {
      var rows = [['Use', list(A.uses), 0], ['Programs and games', A.apps, 1], ['Case and features', lookText() || 'No preference', 2], ['Parts budget', list(A.budget), 3]];
      if (A.have) rows.push(['Using now', A.have, 2]);
      return '<h2 class="qh">Here\'s what you told us</h2><dl class="brief">' + rows.map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + esc(r[1] || '–') + '</dd><button type="button" class="link qedit" data-go="' + r[2] + '">Edit</button></div>'; }).join('') + '</dl>' +
        '<h3 class="qsub">Where should we send your build sheet?</h3>' +
        '<div class="row"><div class="field"><label for="q-name">Name</label><input id="q-name" autocomplete="name" value="' + esc(A.name) + '" /></div><div class="field"><label for="q-bizname">Business name <small>(only if it\'s for a business)</small></label><input id="q-bizname" autocomplete="organization" value="' + esc(A.bizname) + '" /></div></div>' +
        '<div class="row"><div class="field"><label for="q-phone">Phone</label><input id="q-phone" type="tel" autocomplete="tel" placeholder="(413) 555-0123" value="' + esc(A.phone) + '" /></div><div class="field"><label for="q-email">Email</label><input id="q-email" type="email" autocomplete="email" placeholder="you@example.com" value="' + esc(A.email) + '" /></div></div>' +
        '<h3 class="qsub">Best way to reach you <small>(pick as many as you like)</small></h3><div class="qcards three">' + REACH.map(function (r) { return card('reach', r[0], r[0], '', r[1]); }).join('') + '</div>' +
        '<p class="fine">Free, no obligation. Nothing is ordered until you approve your build sheet.</p>';
    }
  ];
  function lookText() {
    var p = [].concat(A.style, A.color.map(function (c) { return c === 'Something else' ? 'custom color' : c.toLowerCase(); }), A.light.map(function (l) { return l === 'No lights' ? 'no lights' : l === 'One color' ? 'one-color lighting' : l === 'Full RGB' ? 'full RGB' : l; }), A.look);
    p = p.filter(function (x) { return x && x !== 'No preference'; });
    return p.length ? p.join(', ').replace(/^./, function (c) { return c.toUpperCase(); }) : '';
  }
  function grab() {
    ['apps', 'have', 'notes', 'name', 'phone', 'email', 'bizname'].forEach(function (k) { var el = document.getElementById('q-' + k); if (el) A[k] = el.value.replace(/[<>]/g, '').trim(); });
  }
  function check() {
    if (step === 0 && !A.uses.length) return 'Pick what this PC is for.';
    if (step === 1 && !A.apps) return 'Type a few programs or games you use.';
    if (step === 3 && !A.budget.length) return 'Choose a budget range, or "Not sure".';
    if (step === 4) {
      if (!A.name) return 'Add your name.';
      if (A.phone.replace(/\D/g, '').length < 10) return 'Enter a 10-digit phone number, including area code.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(A.email)) return 'Enter a valid email so we can send your build sheet.';
      if (!A.reach.length) return 'Choose the best way to reach you.';
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
  }
  function go(to) {
    grab();
    if (to > step) { var m = check(); if (m) { err.textContent = m; err.style.display = 'block'; err.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' }); return; } }
    var d = to > step ? 1 : -1; step = to; show(d);
    var top = form.getBoundingClientRect().top; if (top < 0) form.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }
  function syncLimit(name) {
    stage.querySelectorAll('input[name="' + name + '"]').forEach(function (i) { var l = i.parentNode, f = full(name, i.checked); l.classList.toggle('is-full', f); if (f) l.setAttribute('aria-disabled', 'true'); else l.removeAttribute('aria-disabled'); });
  }
  stage.addEventListener('change', function (e) {
    var t = e.target; if (t.type !== 'checkbox' || !A[t.name]) return;
    var a = A[t.name], i = a.indexOf(t.value);
    if (t.checked && i < 0) {
      a.push(t.value);
    }
    if (!t.checked && i >= 0) a.splice(i, 1);
    t.parentNode.classList.toggle('sel', t.checked);
    syncLimit(t.name);
    err.style.display = 'none';
  });
  stage.addEventListener('click', function (e) { var b = e.target.closest('.qedit'); if (b) go(+b.dataset.go); });
  back.addEventListener('click', function () { if (step) go(step - 1); });
  form.querySelectorAll('.qpads li').forEach(function (p, i) { p.addEventListener('click', function () { if (i < step) go(i); }); });
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (step < N - 1) { go(step + 1); return; }
    grab(); var m = check(); if (m) { err.textContent = m; err.style.display = 'block'; return; }
    if (document.getElementById('q-bot').value || form.dataset.sending) return; form.dataset.sending = '1';
    next.disabled = true; next.textContent = 'Sending…';
    try {
      await ppcSend({ subject: 'New custom build request from ' + A.name + (A.bizname ? ' (' + A.bizname + ')' : ''), name: A.name, phone: A.phone, email: A.email, preferred_contact: list(A.reach),
        business_name: A.bizname || '(not a business)', uses: list(A.uses), programs_and_games: A.apps,
        case_and_features: lookText() || 'No preference', parts_budget: list(A.budget), parts_they_have: A.have || 'None', notes: A.notes || '(none)' });
      form.style.display = 'none';
      document.getElementById('q-sent').style.display = 'block';
      document.getElementById('q-sent-title').focus();
    } catch (x) { delete form.dataset.sending; err.textContent = PPC_FAIL; err.style.display = 'block'; next.disabled = false; next.textContent = 'Send my build request'; }
  });
  show(0);
})();

/* ---------- home die map: cycling part callouts ---------- */
(function () {
  var g = document.getElementById('die-note');
  if (!g) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var cap = document.getElementById('die-cap'), lead = document.getElementById('die-lead'), dot = document.getElementById('die-dot'), t1 = document.getElementById('die-t1'), t2 = document.getElementById('die-t2');
  /* [x, y of the part, label line 1, line 2, side] */
  var F = [
    [300, 236, 'THERMAL INTERFACE', 'PASTE ON A DESKTOP CPU', 'r', 'Thermal interface', 'Thermal paste carries heat from a desktop processor to its cooler. For graphics cards and laptops, we use a long-lasting thermal pad instead.'],
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


/* ---------- v6.0 flare layer ---------- */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
  // scroll progress
  var bar = document.createElement('div'); bar.className = 'scroll-prog'; bar.setAttribute('aria-hidden', 'true'); document.body.appendChild(bar);
  var tick = false;
  function prog() { var h = document.documentElement, max = h.scrollHeight - h.clientHeight; bar.style.transform = 'scaleX(' + (max > 0 ? h.scrollTop / max : 0) + ')'; tick = false; }
  window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(prog); } }, { passive: true }); prog();
  // staggered reveal for repeated items
  if (!reduce && 'IntersectionObserver' in window) {
    var groups = new Map();
    document.querySelectorAll('.goal, .fact, .line, .faq, .faq-group').forEach(function (el) {
      if (el.closest('[data-reveal]') || el.closest('form') || el.closest('svg')) return;
      var p = el.parentNode, k = groups.get(p) || 0;
      el.classList.add('stg'); el.style.setProperty('--d', Math.min(k, 8) * 0.06 + 's'); groups.set(p, k + 1);
    });
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.stg').forEach(function (el) { io.observe(el); });
  }
  if (!fine) return;
  var glow = null, gx = 0, gy = 0, gq = false;
  if (!reduce) { glow = document.createElement('div'); glow.className = 'cursor-glow'; glow.setAttribute('aria-hidden', 'true'); document.body.appendChild(glow);
    document.documentElement.addEventListener('mouseleave', function () { glow.style.opacity = '0'; }); }
  // cursor spotlight + gentle tilt
  document.addEventListener('pointermove', function (e) {
    var c = e.target.closest && e.target.closest('.goal, .fact, .qcard');
    if (c) { var r = c.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top; c.style.setProperty('--mx', x + 'px'); c.style.setProperty('--my', y + 'px');
      if (!reduce && c.classList.contains('goal')) c.style.transform = 'perspective(700px) rotateX(' + ((r.height / 2 - y) / r.height * 5).toFixed(2) + 'deg) rotateY(' + ((x - r.width / 2) / r.width * 6).toFixed(2) + 'deg) translateY(-3px)'; }
    if (glow) { gx = e.clientX; gy = e.clientY; if (!gq) { gq = true; requestAnimationFrame(function () { glow.style.transform = 'translate(' + (gx - 300) + 'px,' + (gy - 300) + 'px)'; glow.style.opacity = '1'; gq = false; }); } }
  }, { passive: true });
  document.addEventListener('pointerout', function (e) { var c = e.target.closest && e.target.closest('.goal'); if (c && !c.contains(e.relatedTarget)) c.style.transform = ''; });
})();
