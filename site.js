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
var PPC_FAIL = 'That didn\'t go through. Check your connection and try again, or email us at precisionpcma@gmail.com.';

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
      var a = map[en.target.id]; if (a) { a.classList.add('on'); a.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  Object.keys(map).forEach(function (id) { io.observe(document.getElementById(id)); });
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
