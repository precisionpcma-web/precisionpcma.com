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

/* ---------- custom build quiz (builds v5.8) ---------- */
(function () {
  var form = document.getElementById('quiz');
  if (!form) return;
  var stage = document.getElementById('q-stage'), err = document.getElementById('q-err');
  var back = document.getElementById('q-back'), next = document.getElementById('q-next'), stepLbl = document.getElementById('q-step');
  var pads = form.querySelectorAll('.qpads li');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var A = { uses: [], games: [], look: [], apps: '', have: '', notes: '', name: '', phone: '', email: '', bizname: '' };
  var USES = [['Gaming','game','Play smoothly on your monitor'],['Streaming','stream','Play and broadcast at once'],['Photo or video editing','video','Premiere, Resolve, Lightroom'],['3D, CAD or engineering','cube','Blender, AutoCAD, SolidWorks'],['AI on your own PC','ai','Local chat and image tools'],['Office or school','school','Browsing, documents, email']];
  var GTIER = [['Light or older games','Minecraft, Roblox, League of Legends'],['Popular online games','Fortnite, Valorant, Call of Duty'],['The newest big games','Cyberpunk 2077, Black Myth: Wukong, high settings']];
  var GAMES = ['Fortnite','Valorant','Call of Duty','Counter-Strike 2','Apex Legends','Battlefield 6','Marvel Rivals','Minecraft','Roblox','League of Legends','GTA V','EA Sports FC','Cyberpunk 2077','Microsoft Flight Simulator 2024'];
  var APPS = { 'Streaming': ['OBS Studio','Twitch or YouTube streaming'], 'Photo or video editing': ['Premiere Pro','DaVinci Resolve','Photoshop','Lightroom','After Effects'], '3D, CAD or engineering': ['Blender','AutoCAD','SolidWorks','Fusion 360','Unreal Engine'], 'AI on your own PC': ['Local AI chat (LM Studio, Ollama)','AI image tools (Stable Diffusion)'], 'Office or school': ['Microsoft Office','Google Docs','QuickBooks','Zoom or Teams'] };
  var RES = [['1080p','Regular HD, most common',16,9,34],['1440p','Sharper, the gaming sweet spot',16,9,42],['4K','Very sharp, needs the most power',16,9,50],['Ultrawide','Extra-wide screen',21,9,56],['Multiple monitors','Two or more screens',16,9,30],['Not sure','We\'ll help you pick',16,9,36]];
  var HZ = ['60 Hz','120 to 200 Hz','240 Hz or more','Not sure'];
  var LOOK = [['Quiet','Calm fans, even under load'],['RGB lighting','Lights you can set the color of'],['Small case','Fits on a desk or shelf'],['Glass showpiece','Big glass side, parts on display'],['Wi-Fi and Bluetooth','No network cable needed'],['Room to upgrade','Easy to add parts later']];
  var BUD = ['Under $800','$800 to $1,200','$1,200 to $1,800','$1,800 to $2,500','$2,500 or more','Not sure'];
  var REACH = [['Text','chat'],['Phone call','phone'],['Email','mail']];
  var step = 0, N = 6;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function ico(n) { return '<span class="ico-tile"><svg class="ico" aria-hidden="true"><use href="#i-' + n + '"/></svg></span>'; }
  function isSel(name, val) { return Array.isArray(A[name]) ? A[name].indexOf(val) >= 0 : A[name] === val; }
  function card(name, val, title, hint, icon, extra) {
    var multi = Array.isArray(A[name]), sel = isSel(name, val) ? ' sel' : '';
    return '<label class="qcard' + sel + '"><input type="' + (multi ? 'checkbox' : 'radio') + '" name="' + name + '" value="' + esc(val) + '"' + (sel ? ' checked' : '') + ' />' + (extra || (icon ? ico(icon) : '')) + '<span class="qc-t">' + esc(title) + '</span>' + (hint ? '<span class="qc-h">' + esc(hint) + '</span>' : '') + '</label>';
  }
  function chips(name, opts) {
    return '<div class="qchips">' + opts.map(function (o) { var s = isSel(name, o); return '<label class="' + (s ? 'sel' : '') + '"><input type="checkbox" name="' + name + '" value="' + esc(o) + '"' + (s ? ' checked' : '') + ' /><span>' + esc(o) + '</span></label>'; }).join('') + '</div>';
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
  function uses(u) { return A.uses.indexOf(u) >= 0; }
  function gaming() { return uses('Gaming'); }
  function light() { return A.uses.length > 0 && A.uses.every(function (u) { return u === 'Office or school'; }); }
  function looks(l) { return A.look.indexOf(l) >= 0; }
  function useText() { return A.uses.join(' + ') + (gaming() && A.gtier ? ' (' + A.gtier.toLowerCase() + ')' : ''); }
  var screens = [
    function () {
      var h = '<h2 class="qh">What will you use it for?</h2><p class="qp">Pick up to 2.</p><div class="qcards">' + USES.map(function (u) { return card('uses', u[0], u[0], u[2], u[1]); }).join('') + '</div>';
      if (gaming()) h += '<h3 class="qsub">What kind of games?</h3><div class="qcards">' + GTIER.map(function (g) { return card('gtier', g[0], g[0], g[1], null); }).join('') + '</div>';
      return h;
    },
    function () {
      var h = '<h2 class="qh">What screen will you use?</h2><div class="qcards">' + RES.map(function (r) { return card('res', r[0], r[0], r[1], null, mon(r[2], r[3], r[4], r[0] === 'Multiple monitors')); }).join('') + '</div>';
      if (gaming()) h += '<h3 class="qsub">How fast is the screen? <small>(refresh rate)</small></h3>' + seg('hz', HZ);
      return h;
    },
    function () {
      var h = '<h2 class="qh">Which games and programs will you use?</h2><p class="qp">Tap any that apply, and add the rest below. This is how we size the parts.</p>';
      if (gaming()) h += '<h3 class="qsub" style="margin-top:6px">Games</h3>' + chips('games', GAMES);
      var apps = []; A.uses.forEach(function (u) { if (APPS[u]) apps = apps.concat(APPS[u]); });
      if (apps.length) h += '<h3 class="qsub">Programs</h3>' + chips('games', apps);
      h += '<div class="field" style="margin-top:18px"><label for="q-apps">Anything else you play or use</label><textarea id="q-apps" placeholder="' + esc(gaming() ? 'For example: Elden Ring, Rocket League, Discord, Premiere Pro' : 'For example: Excel, Chrome with lots of tabs, Blender, Photoshop') + '">' + esc(A.apps) + '</textarea></div>';
      return h;
    },
    function () {
      return '<h2 class="qh">How should it look and feel?</h2><p class="qp">Pick any, or skip.</p><div class="qcards">' + LOOK.map(function (l) { return card('look', l[0], l[0], l[1], null); }).join('') + '</div>' +
        '<div class="field" style="margin-top:20px"><label for="q-have">Parts you already have <small>(optional)</small></label><input id="q-have" value="' + esc(A.have) + '" placeholder="For example: RTX 3080, 2TB SSD, monitor, Windows license" /></div>';
    },
    function () {
      return '<h2 class="qh">What\'s your budget for parts?</h2><p class="qp">Just the parts. Your build sheet lists labor separately.</p><div class="qbig" id="q-bud">' + (A.budget ? esc(A.budget) : 'Pick a range') + '</div>' + seg('budget', BUD) +
        '<div class="field" style="margin-top:20px"><label for="q-notes">Anything else? <small>(optional)</small></label><textarea id="q-notes" placeholder="A deadline, a color theme, a case you like">' + esc(A.notes) + '</textarea></div>';
    },
    function () {
      var pick = A.games.concat(A.apps ? [A.apps] : []).join(', ');
      var rows = [['Use', useText(), 0], ['Screen', A.res + (gaming() && A.hz ? ' · ' + A.hz : ''), 1], ['Games and programs', pick, 2], ['Look and feel', A.look.join(', ') || 'No preference', 3], ['Parts budget', A.budget, 4]];
      if (A.have) rows.push(['You have', A.have, 3]);
      return '<h2 class="qh">Your build brief</h2><dl class="brief">' + rows.map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + esc(r[1] || '–') + '</dd><button type="button" class="link qedit" data-go="' + r[2] + '">Edit</button></div>'; }).join('') + '</dl>' +
        '<h3 class="qsub">Where should we send your build sheet?</h3>' +
        '<div class="row"><div class="field"><label for="q-name">Name</label><input id="q-name" autocomplete="name" value="' + esc(A.name) + '" /></div><div class="field"><label for="q-bizname">Business name <small>(only if it\'s for a business)</small></label><input id="q-bizname" autocomplete="organization" value="' + esc(A.bizname) + '" /></div></div>' +
        '<div class="row"><div class="field"><label for="q-phone">Phone</label><input id="q-phone" type="tel" autocomplete="tel" placeholder="(413) 555-0123" value="' + esc(A.phone) + '" /></div><div class="field"><label for="q-email">Email</label><input id="q-email" type="email" autocomplete="email" placeholder="you@example.com" value="' + esc(A.email) + '" /></div></div>' +
        '<h3 class="qsub">Best way to reach you</h3><div class="qcards three">' + REACH.map(function (r) { return card('reach', r[0], r[0], '', r[1]); }).join('') + '</div>' +
        '<p class="fine">Free, no obligation. Nothing is ordered until you approve your build sheet.</p>';
    }
  ];
  function grab() {
    ['apps', 'have', 'notes', 'name', 'phone', 'email', 'bizname'].forEach(function (k) { var el = document.getElementById('q-' + k); if (el) A[k] = el.value.replace(/[<>]/g, '').trim(); });
  }
  function check() {
    if (step === 0 && !A.uses.length) return 'Choose what you\'ll use it for.';
    if (step === 0 && gaming() && !A.gtier) return 'Choose what kind of games you play.';
    if (step === 1 && !A.res) return 'Choose your screen, or "Not sure".';
    if (step === 1 && gaming() && !A.hz) return 'Choose how fast your screen is, or "Not sure".';
    if (step === 2 && !A.games.length && !A.apps) return 'Tap at least one game or program, or type what you use.';
    if (step === 4 && !A.budget) return 'Choose a budget range, or "Not sure".';
    if (step === 5) {
      if (!A.name) return 'Add your name.';
      if (A.phone.replace(/\D/g, '').length < 10) return 'Enter a 10-digit phone number, including area code.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(A.email)) return 'Enter a valid email so we can send your build sheet.';
      if (!A.reach) return 'Choose the best way to reach you.';
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
    var t = e.target; if (t.type !== 'radio' && t.type !== 'checkbox') return;
    if (t.type === 'checkbox') {
      var a = A[t.name], i = a.indexOf(t.value);
      if (t.checked && i < 0) {
        if (t.name === 'uses' && a.length >= 2) { t.checked = false; err.textContent = 'Pick up to 2. Tap one to unselect it first.'; err.style.display = 'block'; return; }
        a.push(t.value);
      }
      if (!t.checked && i >= 0) a.splice(i, 1);
      t.parentNode.classList.toggle('sel', t.checked);
      if (t.name === 'uses') {
        if (!gaming()) { A.gtier = ''; A.hz = ''; }
        var ok = (gaming() ? GAMES : []).slice(); A.uses.forEach(function (u) { if (APPS[u]) ok = ok.concat(APPS[u]); });
        A.games = A.games.filter(function (g) { return ok.indexOf(g) >= 0; });
        var v = t.value; show(0); var f = stage.querySelector('input[name="uses"][value="' + v.replace(/"/g, '\\"') + '"]'); if (f) f.focus(); return;
      }
    } else {
      A[t.name] = t.value;
      stage.querySelectorAll('input[name="' + t.name + '"]').forEach(function (r) { r.parentNode.classList.toggle('sel', r.checked); });
      if (t.name === 'budget') document.getElementById('q-bud').textContent = t.value;
    }
    err.style.display = 'none'; readout();
  });
  stage.addEventListener('input', function (e) { if (e.target.id === 'q-apps' || e.target.id === 'q-have') { grab(); readout(); } });
  stage.addEventListener('click', function (e) { var b = e.target.closest('.qedit'); if (b) go(+b.dataset.go); });
  back.addEventListener('click', function () { if (step) go(step - 1); });
  form.querySelectorAll('.qpads li').forEach(function (p, i) { p.addEventListener('click', function () { if (i < step) go(i); }); });
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (step < N - 1) { go(step + 1); return; }
    grab(); var m = check(); if (m) { err.textContent = m; err.style.display = 'block'; return; }
    if (document.getElementById('q-bot').value || form.dataset.sending) return; form.dataset.sending = '1';
    next.disabled = true; next.textContent = 'Sending…';
    var V = verdict();
    try {
      await ppcSend({ subject: 'New custom build request from ' + A.name + (A.bizname ? ' (' + A.bizname + ')' : ''), name: A.name, phone: A.phone, email: A.email, preferred_contact: A.reach,
        business_name: A.bizname || '(not a business)', uses: A.uses.join(', '), game_level: gaming() ? A.gtier : 'n/a',
        games_and_programs: A.games.join(', ') + (A.apps ? (A.games.length ? '; ' : '') + A.apps : ''), monitor: A.res, refresh_rate: gaming() ? (A.hz || 'Not given') : 'n/a',
        look_and_feel: A.look.join(', ') || 'No preference', parts_budget: A.budget, parts_they_have: A.have || 'None', notes: A.notes || '(none)',
        auto_target: V.t, auto_fit: V.fill + ' of 5' + (V.warn ? ' (stretch)' : ''), auto_quiet: quiet().t, auto_upgrade: upgrade().t, notes_shown: notes().join(' | ') || '(none)' });
      form.style.display = 'none';
      document.getElementById('q-sent').style.display = 'block';
      document.getElementById('q-sent-title').focus();
    } catch (x) { delete form.dataset.sending; err.textContent = PPC_FAIL; err.style.display = 'block'; next.disabled = false; next.textContent = 'Send my build request'; }
  });
  /* ---- live readout: only reflects real answers. Tiers follow 2026 graphics cards:
     under $800 ~ entry card (RTX 5050 / used), $800-1,200 ~ RTX 5060 / RX 9060 XT,
     $1,200-1,800 ~ RTX 5070 / RX 9070, $1,800-2,500 ~ RTX 5070 Ti / RX 9070 XT, $2,500+ ~ RTX 5080 and up ---- */
  function bud() { var b = BUD.indexOf(A.budget); return A.budget === 'Not sure' ? -1 : b; }
  function gneed() {
    var n = { '1080p': 0, '1440p': 1, 'Multiple monitors': 1, 'Not sure': 1, 'Ultrawide': 2, '4K': 3 }[A.res]; if (n == null) n = 1;
    n += { 'Light or older games': -2, 'Popular online games': -1, 'The newest big games': 0 }[A.gtier] || 0;
    if (A.hz === '240 Hz or more') n += 1; else if (A.hz === '60 Hz') n -= 1;
    return n;
  }
  function need() {
    var n = -1;
    if (gaming()) n = Math.max(n, gneed());
    if (uses('Streaming')) n = Math.max(n, gaming() ? gneed() + 1 : 1);
    if (uses('Photo or video editing') || uses('3D, CAD or engineering')) n = Math.max(n, 2);
    if (uses('AI on your own PC')) n = Math.max(n, 3);
    if (uses('Office or school')) n = Math.max(n, -1);
    return n;
  }
  function verdict() {
    if (!A.uses.length) return { t: '–', cap: 'Answer a few questions to see what this build is aiming for.', fill: 0, warn: false };
    var b = bud();
    if (!A.budget && !light()) return { t: '–', cap: 'Pick a budget to see what this build can do.', fill: 0, warn: false };
    if (light()) return { t: 'Fast, quiet everyday PC', cap: 'A fast, quiet machine for everyday work, with room for plenty of tabs and apps. No graphics card needed.', fill: b < 0 ? 0 : Math.min(5, 3 + b), warn: false };
    if (b < 0) return { t: (gaming() ? 'Gaming' : A.uses[0]) + ' build', cap: 'Not sure about budget? That\'s fine. We\'ll suggest a sensible range on your build sheet.', fill: 0, warn: false };
    var sc = b - need(), fill = Math.max(1, Math.min(5, 3 + sc));
    if (gaming()) {
      if (!A.res || !A.gtier) return { t: 'Gaming build', cap: 'Pick your screen and the kind of games, and we\'ll aim the build at them.', fill: fill, warn: false };
      var res = A.res === 'Multiple monitors' ? 'multi-monitor' : A.res === 'Not sure' ? '1440p' : A.res;
      var what = A.gtier === 'The newest big games' ? 'the newest games' : A.gtier === 'Popular online games' ? 'popular online games' : 'your games';
      if (sc >= 2 && !(A.gtier === 'The newest big games' && b <= 1)) return { t: 'Max settings', cap: 'Smooth ' + res + ' gaming at max settings in ' + what + (uses('Streaming') ? ', with room to stream.' : '.'), fill: fill, warn: false };
      if (sc >= 1) return { t: 'High settings', cap: 'Smooth ' + res + ' gaming at high settings in ' + what + (uses('Streaming') ? ', with room to stream.' : '.'), fill: fill, warn: false };
      if (sc === 0) return { t: 'Medium to high settings', cap: 'Solid ' + res + ' gaming at medium to high settings in ' + what + '.', fill: fill, warn: false };
      var cause = A.res === '4K' ? '4K' : A.res === 'Ultrawide' ? 'An ultrawide screen' : A.hz === '240 Hz or more' ? '240 Hz' : 'This mix of screen and games';
      return { t: 'Stretch: may need more budget', cap: cause + ' needs more graphics power than this budget usually buys. A lower resolution, upscaling (DLSS or FSR) or a bigger budget would fit better.', fill: fill, warn: true };
    }
    if (uses('AI on your own PC')) return b >= 4 ? { t: 'Larger local AI models', cap: 'A graphics card with lots of memory for larger models and faster answers.', fill: fill, warn: false } : b >= 2 ? { t: 'Mid-size local AI models', cap: 'Runs mid-size local models well. Bigger ones need more graphics memory.', fill: fill, warn: false } : { t: 'Smaller local AI models', cap: 'Runs smaller local models. Bigger ones need a card with more memory than this budget buys.', fill: fill, warn: b < 1 };
    if (uses('Photo or video editing')) return b >= 2 ? { t: 'Smooth 4K editing', cap: 'Comfortable 4K editing for most footage, with fast exports.', fill: fill, warn: false } : { t: 'Smooth 1080p editing', cap: 'Smooth 1080p editing. 4K works, using lighter preview files on heavier projects.', fill: fill, warn: false };
    if (uses('3D, CAD or engineering')) return b >= 3 ? { t: 'Heavy 3D and rendering', cap: 'Handles large scenes and long renders without breaking a sweat.', fill: fill, warn: false } : { t: 'Everyday 3D and CAD', cap: 'Smooth modeling and CAD. Big renders take longer at this budget.', fill: fill, warn: false };
    return { t: 'Streaming build', cap: 'A strong processor and graphics card to stream smoothly.', fill: fill, warn: false };
  }
  function quiet() {
    if (!A.uses.length) return { n: 0, t: '' };
    var q = 4, b = bud();
    if (light()) q = 5;
    if (gaming() && A.gtier === 'The newest big games') q -= 1;
    if (b >= 3 && !light()) q -= 1;
    if (uses('AI on your own PC') || uses('3D, CAD or engineering')) q -= 1;
    if (looks('Small case')) q -= 1;
    if (looks('Quiet')) q += 1;
    q = Math.max(1, Math.min(gaming() || uses('AI on your own PC') || uses('3D, CAD or engineering') ? 4 : 5, q));
    return { n: q, t: q >= 5 ? 'Very quiet' : q === 4 ? 'Quiet' : q === 3 ? 'Some fan noise' : 'Loud under load' };
  }
  function upgrade() {
    if (!A.uses.length) return { n: 0, t: '' };
    var u = 3, b = bud();
    if (looks('Small case')) u -= 2;
    if (looks('Room to upgrade')) u += 2;
    if (b >= 2) u += 1;
    u = Math.max(1, Math.min(5, u));
    return { n: u, t: u >= 4 ? 'Lots of room' : u === 3 ? 'Some room' : 'Limited' };
  }
  function owns() {
    var h = (A.have || '').toLowerCase();
    return { gpu: /(gpu|graphics|rtx|gtx|radeon|\brx ?\d|\barc\b)/.test(h), mon: /(monitor|display|screen)/.test(h) };
  }
  function notes() {
    var n = [], b = bud();
    if (!A.uses.length) return n;
    var picked = (A.games.join(' ') + ' ' + A.apps).toLowerCase();
    var esports = /(valorant|counter-strike|cs2|fortnite|apex|league|overwatch|rocket league)/.test(picked);
    if (gaming() && A.gtier === 'The newest big games' && b >= 0 && b <= 1 && b - need() === 0) n.push('The newest big games need a stronger graphics card than this budget usually buys. Expect medium settings, with upscaling (DLSS or FSR) to help.');
    if (gaming() && esports && A.hz === '240 Hz or more') n.push('For competitive games at very high frame rates, the processor matters as much as the graphics card. We\'ll aim for a gaming-focused chip.');
    if (uses('AI on your own PC')) n.push('For local AI, graphics card memory matters most. 16 GB of it is a good start for most models.');
    if (uses('Streaming')) n.push('Modern graphics cards have a built-in streaming encoder, so streaming barely slows the PC down.');
    if (looks('Small case') && !light()) n.push('Small cases run warmer and louder under load and leave fewer upgrades later. We\'ll pick parts that fit.');
    if (looks('Quiet') && gaming() && A.gtier === 'The newest big games') n.push('No gaming PC is silent at full load, but bigger fans and a good case keep it calm.');
    if (A.have) n.push('We\'ll check that the parts you have are compatible and won\'t hold the new ones back.');
    if (light()) n.push('Built-in graphics are plenty for this. The money goes to a fast SSD and 16 to 32 GB of memory.');
    if (!light() && n.length < 2 && A.budget && A.budget !== 'Not sure') n.push(b >= 0 && b <= 1 ? 'Memory prices are high this year, so we\'ll start with 16 GB and leave room to add more later.' : 'Memory prices are high this year, so we\'ll balance memory against the graphics card. Most builds at this budget should have 32 GB.');
    return n.slice(0, 2);
  }
  function scene(x, y, w, h) {
    var u = A.uses[0] || '', s = '', cx = x + w / 2, cy = y + h / 2, o = ' stroke="#ff5818" stroke-opacity=".35" fill="none" stroke-width="1"';
    if (u === 'Gaming' || u === 'Streaming') { s = '<path d="M' + (cx - 7) + ' ' + cy + 'h14M' + cx + ' ' + (cy - 7) + 'v14"' + o + '/><path d="M' + (x + 4) + ' ' + (y + 9) + 'v-5h5M' + (x + w - 4) + ' ' + (y + 9) + 'v-5h-5M' + (x + 4) + ' ' + (y + h - 9) + 'v5h5M' + (x + w - 4) + ' ' + (y + h - 9) + 'v5h-5"' + o + '/>'; if (uses('Streaming')) s += '<rect x="' + (x + w - 18) + '" y="' + (y + 6) + '" width="12" height="8" rx="1"' + o + '/>'; }
    else if (/editing/.test(u)) { for (var k = 0; k < 3; k++) s += '<rect x="' + (x + 6 + k * 6) + '" y="' + (y + h - 16 + k * 4) + '" width="' + (w * .45 - k * 8) + '" height="3"' + o + '/>'; }
    else if (/3D/.test(u)) s = '<path d="M' + (x + 14) + ' ' + (y + 12) + 'l10-5 10 5v11l-10 5-10-5zM' + (x + 14) + ' ' + (y + 12) + 'l10 5 10-5M' + (x + 24) + ' ' + (y + 17) + 'v11"' + o + '/>';
    else if (/AI/.test(u)) { for (var a = 0; a < 3; a++) s += '<path d="M' + (x + 8) + ' ' + (y + 10 + a * 6) + 'h' + (w * (.3 - a * .06)) + '"' + o + '/>'; }
    else if (/Office/.test(u)) { for (var l = 0; l < 4; l++) s += '<path d="M' + (x + 8) + ' ' + (y + 9 + l * 5) + 'h' + (w * .35) + '"' + o + '/>'; }
    return s;
  }
  function meter(id, n, warn) { document.querySelectorAll('#' + id + ' i').forEach(function (sg, k) { sg.className = k < n ? (warn ? 'warn' : 'on') : ''; }); }
  function readout() {
    var $ = function (id) { return document.getElementById(id); };
    var on = function (id, v) { var el = $(id); if (el) el.classList.toggle('on', !!v); };
    var b = bud(), tier = b;
    var lt = light(), any = A.uses.length > 0, compact = looks('Small case');
    $('ro-for').textContent = any ? useText() : '–';
    $('ro-disp').textContent = A.res ? A.res + (gaming() && A.hz && A.hz !== 'Not sure' ? ' · ' + A.hz : '') : '–';
    var V = verdict(), stretch = V.warn; $('ro-target').textContent = V.t; $('ro-target').classList.toggle('warn', stretch);
    $('ro-cap').textContent = V.cap; $('ro-cap').classList.toggle('warn', stretch);
    $('ro-notes').innerHTML = notes().map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('');
    var O = owns();
    $('ro-budget').textContent = A.budget || '–';
    $('ro-case-t').textContent = A.look.length ? A.look.join(', ') : (step >= 4 ? 'No preference' : '–');
    on('ro-empty', !any); $('ro-empty').style.opacity = any ? 0 : 1;
    $('ro-case').style.transform = compact ? 'scale(.8)' : 'scale(1)';
    $('ro-case').style.opacity = any ? 1 : .35;
    var heavy = uses('Photo or video editing') || uses('3D, CAD or engineering') || uses('AI on your own PC');
    var ct = tier < 0 ? -1 : Math.min(3, tier + (heavy ? 1 : 0));
    if (compact && (ct === 1 || ct === 2)) ct = 0;
    if (looks('Quiet') && ct >= 0 && ct < 3 && !compact) ct = Math.max(ct, 1);
    on('ro-cool-air', ct === 0); on('ro-cool-airfan', ct === 0);
    on('ro-cool-tower', ct === 1 || ct === 2);
    on('ro-cool-aio', ct >= 3); on('ro-rad', ct >= 3);
    [1, 2, 3, 4].forEach(function (k) { var v = tier >= 0 && k <= 2; on('ro-ram' + k, v); on('ro-ramt' + k, v); });
    var gpu = any && !lt;
    var bigGpu = gpu && (uses('AI on your own PC') || uses('3D, CAD or engineering') ? tier >= 2 : (tier >= 2 && need() >= 1) || tier >= 3);
    var showGpu = gpu || O.gpu;
    on('ro-gpu', showGpu); on('ro-gf1', showGpu); on('ro-gf2', showGpu); on('ro-gf3', showGpu && (bigGpu || O.gpu));
    $('ro-gpu').classList.toggle('mine', O.gpu); on('ro-gpu-yours', O.gpu);
    on('ro-igpu', any && lt && !O.gpu);
    on('ro-f1', tier >= 0); on('ro-f2', tier >= 1); on('ro-f3', tier >= 3 || looks('Glass showpiece') || looks('RGB lighting'));
    on('ro-wifi', looks('Wi-Fi and Bluetooth'));
    $('ro-floor').setAttribute('opacity', (tier < 0 ? .12 : (looks('RGB lighting') ? .5 : .2) + tier * .12).toFixed(2));
    meter('ro-fit', V.fill, stretch);
    var Q = quiet(), U = upgrade();
    meter('ro-quiet', Q.n); $('ro-quiet-t').textContent = Q.t;
    meter('ro-upg', U.n); $('ro-upg-t').textContent = U.t;
    var r = A.res, m = '';
    var hz = gaming() && A.hz && A.hz !== 'Not sure' ? ({ '60 Hz': '60 Hz', '120 to 200 Hz': '120+ Hz', '240 Hz or more': '240+ Hz' })[A.hz] : '';
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

/* ---------- Laptop Finder quiz (laptops v5.8) ---------- */
(function () {
  var form = document.getElementById('lquiz');
  if (!form) return;
  var $ = function (id) { return document.getElementById(id); };
  var stage = $('lq-stage'), err = $('lq-err'), back = $('lq-back'), next = $('lq-next'), stepLbl = $('lq-step');
  var pads = form.querySelectorAll('.qpads li');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var A = { uses: [], pri: [], apps: [], appsTxt: '', name: '', phone: '', email: '' };
  var USES = [['Everyday and streaming', 'home', 'Browsing, video, email'], ['School', 'school', 'Docs, research, note-taking'], ['Work and video calls', 'office', 'Office apps, meetings, lots of tabs'], ['Photos, video or design', 'video', 'Lightroom, Premiere, Canva'], ['Gaming', 'game', 'Play on the go or at a desk'], ['Coding or tech work', 'ai', 'Writing and running code']];
  var GTIER = [['Light or older games', 'Minecraft, Roblox, The Sims'], ['Popular online games', 'Fortnite, Valorant, Call of Duty'], ['The newest big games', 'Cyberpunk 2077, high settings']];
  var WHERE = [['Carried every day', 'Backpack, campus, travel'], ['Moves around the house', 'Couch, kitchen, desk'], ['Stays on a desk', 'Plugged in most of the time']];
  var SIZE = ['Smaller (13 to 14 in)', 'Middle (15 to 16 in)', 'Big (17 to 18 in)', 'Let us pick'];
  var BAT = ['A few hours', 'Most of a day', 'All day and then some'];
  var PRI = [['Really nice screen', 'Bright, sharp, great color'], ['Quiet and cool', 'Calm fans, cool to the touch'], ['Great keyboard', 'Comfortable for lots of typing'], ['Good webcam and mic', 'Look and sound clear on calls'], ['Plugs for my stuff', 'HDMI, SD card, regular USB'], ['Touchscreen or pen', 'Tap, draw or fold it back'], ['Lots of tabs and apps open', 'Heavy multitasking'], ['Can upgrade or repair later', 'Add memory or storage later']];
  var APPS = { 'Gaming': ['Fortnite', 'Valorant', 'Call of Duty', 'Minecraft', 'Roblox', 'League of Legends', 'The Sims 4', 'Steam games'], 'Photos, video or design': ['Photoshop', 'Lightroom', 'Premiere Pro', 'DaVinci Resolve', 'Canva'], 'Coding or tech work': ['VS Code', 'Docker or virtual machines', 'Android Studio'], 'Work and video calls': ['Microsoft Office', 'Zoom or Teams', 'QuickBooks'], 'School': ['Google Docs', 'Microsoft Office', 'A school testing app'], 'Everyday and streaming': ['Netflix and YouTube', 'Microsoft Office'] };
  var OS = ['Windows', 'Mac', 'Either is fine'];
  var BUD = ['Under $600', '$600 to $900', '$900 to $1,300', '$1,300 to $2,000', '$2,000 or more', 'Not sure'];
  var REACH = [['Text', 'chat'], ['Phone call', 'phone'], ['Email', 'mail']];
  var step = 0, N = 6;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function ico(n) { return '<span class="ico-tile"><svg class="ico" aria-hidden="true"><use href="#i-' + n + '"/></svg></span>'; }
  function isSel(name, val) { return Array.isArray(A[name]) ? A[name].indexOf(val) >= 0 : A[name] === val; }
  function card(name, val, title, hint, icon) {
    var multi = Array.isArray(A[name]), sel = isSel(name, val);
    return '<label class="qcard' + (sel ? ' sel' : '') + '"><input type="' + (multi ? 'checkbox' : 'radio') + '" name="' + name + '" value="' + esc(val) + '"' + (sel ? ' checked' : '') + ' />' + (icon ? ico(icon) : '') + '<span class="qc-t">' + esc(title) + '</span>' + (hint ? '<span class="qc-h">' + esc(hint) + '</span>' : '') + '</label>';
  }
  function chips(name, opts) { return '<div class="qchips">' + opts.map(function (o) { var s = isSel(name, o); return '<label class="' + (s ? 'sel' : '') + '"><input type="checkbox" name="' + name + '" value="' + esc(o) + '"' + (s ? ' checked' : '') + ' /><span>' + esc(o) + '</span></label>'; }).join('') + '</div>'; }
  function seg(name, opts) { return '<div class="qseg" role="radiogroup">' + opts.map(function (o) { var s = A[name] === o; return '<label class="' + (s ? 'sel' : '') + '"><input type="radio" name="' + name + '" value="' + esc(o) + '"' + (s ? ' checked' : '') + ' /><span>' + esc(o) + '</span></label>'; }).join('') + '</div>'; }
  function uses(u) { return A.uses.indexOf(u) >= 0; }
  function gaming() { return uses('Gaming'); }
  function has(p) { return A.pri.indexOf(p) >= 0; }
  function mac() { return A.os === 'Mac'; }
  function useText() { return A.uses.join(' + ') + (gaming() && A.gtier ? ' (' + A.gtier.toLowerCase() + ')' : ''); }
  var screens = [
    function () {
      var h = '<h2 class="qh">What will you mostly use it for?</h2><p class="qp">Pick up to 2.</p><div class="qcards">' + USES.map(function (u) { return card('uses', u[0], u[0], u[2], u[1]); }).join('') + '</div>';
      if (gaming()) h += '<h3 class="qsub">What kind of games?</h3><div class="qcards">' + GTIER.map(function (g) { return card('gtier', g[0], g[0], g[1]); }).join('') + '</div>';
      return h;
    },
    function () {
      return '<h2 class="qh">Where will it live?</h2><div class="qcards">' + WHERE.map(function (w) { return card('where', w[0], w[0], w[1]); }).join('') + '</div>' +
        '<h3 class="qsub">Screen size <small>(optional)</small></h3>' + seg('size', SIZE) +
        '<h3 class="qsub">How long should the battery last away from a plug?</h3>' + seg('bat', BAT);
    },
    function () { return '<h2 class="qh">What matters most to you?</h2><p class="qp">Pick any, or skip.</p><div class="qcards">' + PRI.map(function (p) { return card('pri', p[0], p[0], p[1]); }).join('') + '</div>'; },
    function () {
      var opts = []; A.uses.forEach(function (u) { (APPS[u] || []).forEach(function (a) { if (opts.indexOf(a) < 0) opts.push(a); }); });
      return '<h2 class="qh">Which programs or games does it need to run?</h2><p class="qp">Tap any that apply and add the rest below. Some laptops can\'t run certain games or programs, so this matters.</p>' +
        (opts.length ? chips('apps', opts) : '') +
        '<div class="field" style="margin-top:18px"><label for="lq-apps">Anything else it must run</label><textarea id="lq-apps" placeholder="' + esc(gaming() ? 'For example: Elden Ring, Rocket League, Discord, Spotify' : 'For example: Excel, QuickBooks, Photoshop, a school testing app') + '">' + esc(A.appsTxt) + '</textarea></div>' +
        '<h3 class="qsub">Windows or Mac?</h3>' + seg('os', OS);
    },
    function () { return '<h2 class="qh">What\'s your budget?</h2><div class="qbig" id="lq-bud">' + (A.budget ? esc(A.budget) : 'Pick a range') + '</div>' + seg('budget', BUD); },
    function () {
      var rows = [['Use', useText(), 0], ['Where', (A.where || '–') + (A.size && A.size !== 'Let us pick' ? ' · ' + A.size : ''), 1], ['Battery', A.bat, 1], ['Priorities', A.pri.length ? A.pri.join(', ') : 'None', 2], ['Must run', A.apps.concat(A.appsTxt ? [A.appsTxt] : []).join(', ') || 'Nothing specific', 3], ['System', A.os, 3], ['Budget', A.budget, 4]];
      return '<h2 class="qh">Your laptop brief</h2><dl class="brief">' + rows.map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + esc(r[1] || '–') + '</dd><button type="button" class="link qedit" data-go="' + r[2] + '">Edit</button></div>'; }).join('') + '</dl>' +
        '<h3 class="qsub">Where should we send your picks?</h3><div class="field"><label for="lq-name">Name</label><input id="lq-name" autocomplete="name" value="' + esc(A.name) + '" /></div>' +
        '<div class="row"><div class="field"><label for="lq-phone">Phone</label><input id="lq-phone" type="tel" autocomplete="tel" placeholder="(413) 555-0123" value="' + esc(A.phone) + '" /></div><div class="field"><label for="lq-email">Email</label><input id="lq-email" type="email" autocomplete="email" placeholder="you@example.com" value="' + esc(A.email) + '" /></div></div>' +
        '<h3 class="qsub">Best way to reach you</h3><div class="qcards three">' + REACH.map(function (r) { return card('reach', r[0], r[0], '', r[1]); }).join('') + '</div><p class="fine">Free, no obligation. Setup and repairs are for Windows laptops only.</p>';
    }
  ];
  function grab() { var t = $('lq-apps'); if (t) A.appsTxt = t.value.trim(); ['name', 'phone', 'email'].forEach(function (k) { var el = $('lq-' + k); if (el) A[k] = el.value.replace(/[<>]/g, '').trim(); }); }
  function check() {
    if (step === 0 && !A.uses.length) return 'Choose what you\'ll mostly use it for.';
    if (step === 0 && gaming() && !A.gtier) return 'Choose what kind of games you play.';
    if (step === 1 && !A.where) return 'Choose where it will live.';
    if (step === 1 && !A.bat) return 'Choose how long the battery should last.';
    if (step === 3 && !A.apps.length && !A.appsTxt) return 'Tap at least one program or game, or type what it needs to run.';
    if (step === 3 && !A.os) return 'Choose Windows, Mac or "Either is fine".';
    if (step === 4 && !A.budget) return 'Choose a budget range, or "Not sure".';
    if (step === 5) {
      if (!A.name) return 'Add your name.';
      if (A.phone.replace(/\D/g, '').length < 10) return 'Enter a 10-digit phone number, including area code.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(A.email)) return 'Enter a valid email so we can send your picks.';
      if (!A.reach) return 'Choose the best way to reach you.';
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
    if (t.type === 'checkbox') {
      var a = A[t.name], i = a.indexOf(t.value);
      if (t.checked && i < 0) {
        if (t.name === 'uses' && a.length >= 2) { t.checked = false; err.textContent = 'Pick up to 2. Tap one to unselect it first.'; err.style.display = 'block'; return; }
        a.push(t.value);
      }
      if (!t.checked && i >= 0) a.splice(i, 1);
      t.parentNode.classList.toggle('sel', t.checked);
      if (t.name === 'uses') {
        if (!gaming()) A.gtier = '';
        var ok = []; A.uses.forEach(function (u) { ok = ok.concat(APPS[u] || []); });
        A.apps = A.apps.filter(function (a2) { return ok.indexOf(a2) >= 0; });
        var v = t.value; show(0); var f = stage.querySelector('input[name="uses"][value="' + v.replace(/"/g, '\\"') + '"]'); if (f) f.focus(); return;
      }
    } else { A[t.name] = t.value; stage.querySelectorAll('input[name="' + t.name + '"]').forEach(function (r) { r.parentNode.classList.toggle('sel', r.checked); }); if (t.name === 'budget') $('lq-bud').textContent = t.value; }
    err.style.display = 'none'; readout();
  });
  stage.addEventListener('input', function (e) { if (e.target.id === 'lq-apps') { grab(); readout(); } });
  stage.addEventListener('click', function (e) { var b = e.target.closest('.qedit'); if (b) go(+b.dataset.go); });
  back.addEventListener('click', function () { if (step) go(step - 1); });
  pads.forEach(function (p, i) { p.addEventListener('click', function () { if (i < step) go(i); }); });
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (step < N - 1) { go(step + 1); return; }
    grab(); var m = check(); if (m) { err.textContent = m; err.style.display = 'block'; return; }
    if ($('lq-bot').value || form.dataset.sending) return; form.dataset.sending = '1';
    next.disabled = true; next.textContent = 'Sending…';
    var B = battery(), W = weight(), V = verdict();
    try {
      await ppcSend({ subject: 'New Laptop Finder request from ' + A.name, name: A.name, phone: A.phone, email: A.email, preferred_contact: A.reach,
        uses: A.uses.join(', '), game_level: gaming() ? A.gtier : 'n/a', where_it_lives: A.where, size: A.size && A.size !== 'Let us pick' ? A.size : 'Let us pick (we suggest ' + inches() + ' in)', battery_need: A.bat,
        priorities: A.pri.join(', ') || 'None', must_run: A.apps.join(', ') + (A.appsTxt ? (A.apps.length ? '; ' : '') + A.appsTxt : ''), system: A.os, budget: A.budget,
        auto_battery: B.t, auto_weight: W.t, auto_fit: V.fill + ' of 5' + (V.warn ? ' (stretch)' : '') + ': ' + V.cap,
        check_arm_compatibility: armRisk() ? 'YES: check games and programs before suggesting a Snapdragon laptop' : 'no', notes_shown: notes().join(' | ') || '(none)' });
      form.style.display = 'none'; $('lq-sent').style.display = 'block'; $('lq-sent-title').focus();
    } catch (x) { delete form.dataset.sending; err.textContent = PPC_FAIL; err.style.display = 'block'; next.disabled = false; next.textContent = 'Send me laptop picks'; }
  });
  /* ---- live laptop preview. Figures reflect 2026 laptops (typical, not guaranteed):
     battery, web use: efficient Intel Core Ultra (Lunar/Panther Lake), Snapdragon X and Apple M laptops ~14+ hrs;
     mainstream thin laptops ~8-12 hrs; creator laptops with a graphics card ~6-9 hrs; gaming laptops ~4-7 hrs browsing, 1-2 hrs gaming.
     weight: 13-14 in thin ~2.7-3.3 lb; 15-16 in thin ~3.5-4.3 lb; 16 in gaming ~5-6 lb; 17-18 in gaming ~6-7.5 lb ---- */
  function bud() { var b = BUD.indexOf(A.budget); return A.budget === 'Not sure' ? -1 : b; }
  function heavyGame() { return gaming() && A.gtier !== 'Light or older games'; }
  function inches() {
    var s = { 'Smaller (13 to 14 in)': 14, 'Middle (15 to 16 in)': 16, 'Big (17 to 18 in)': 18 }[A.size];
    if (s) return mac() && s === 18 ? 16 : s;
    if (A.where === 'Carried every day') return heavyGame() ? 16 : 14;
    if (A.where === 'Stays on a desk' && heavyGame() && bud() >= 3 && !mac()) return 18;
    return A.where ? 16 : 0;
  }
  function battery() {
    if (!A.uses.length || !A.bat) return { n: 0, t: '' };
    var n;
    if (heavyGame() && !mac()) n = 1;
    else if (uses('Photos, video or design') && !mac()) n = 3;
    else n = 4;
    if (A.bat === 'All day and then some' && !heavyGame() && !uses('Photos, video or design')) n = 5;
    if (mac() && !heavyGame()) n = 5;
    if (has('Really nice screen') && n >= 4 && !mac()) n -= 1;
    if (inches() === 18) n = Math.max(1, n - 1);
    var t = ['', 'About 4 to 6 hrs (1 to 2 hrs gaming)', 'About 6 to 8 hrs', 'About 7 to 10 hrs', 'About 8 to 12 hrs', '14+ hrs'][n];
    return { n: n, t: t };
  }
  function weight() {
    var s = inches(); if (!s) return { n: 0, t: '' };
    var lb;
    if (s === 14) lb = mac() ? 2.8 : heavyGame() ? 3.6 : 3.0;
    else if (s === 16) lb = heavyGame() && !mac() ? 5.3 : mac() ? (uses('Photos, video or design') || uses('Coding or tech work') ? 4.7 : 3.3) : 3.9;
    else lb = heavyGame() ? 6.6 : 5.5;
    if (has('Touchscreen or pen') && !mac()) lb += 0.3;
    if (has('Can upgrade or repair later') && !mac() && s < 18) lb += 0.3;
    var n = lb < 3.3 ? 1 : lb < 4 ? 2 : lb < 4.8 ? 3 : lb < 6 ? 4 : 5;
    var t = lb < 3.3 ? 'About 3 lb' : lb < 4 ? 'About 3.5 to 4 lb' : lb < 4.8 ? 'About 4 to 4.5 lb' : lb < 6 ? 'About 5 to 6 lb' : 'About 6 to 7.5 lb';
    return { n: n, t: t };
  }
  function need() {
    var n = 0;
    if (uses('Work and video calls') || has('Lots of tabs and apps open')) n = Math.max(n, 1);
    if (uses('Coding or tech work')) n = Math.max(n, 1);
    if (uses('Photos, video or design')) n = Math.max(n, 2);
    if (gaming()) n = Math.max(n, { 'Light or older games': 1, 'Popular online games': 1, 'The newest big games': 2 }[A.gtier] || 1);
    return n;
  }
  function verdict() {
    if (!A.uses.length) return { cap: 'Answer a few questions to see what kind of laptop fits.', fill: 0, warn: false };
    var b = bud(), n = need();
    if (gaming() && mac() && heavyGame()) return { cap: 'Most games are made for Windows. A Mac is a weak pick for gaming, so we may suggest a Windows laptop too.', fill: b < 0 ? 0 : Math.min(Math.max(1, Math.min(5, 3 + b - n)), 2), warn: true };
    if (!A.budget) return { cap: 'Pick a budget to see how well it fits.', fill: 0, warn: false };
    if (b < 0) return { cap: 'Not sure about budget? We\'ll suggest picks at a few price points.', fill: 0, warn: false };
    var sc = b - n, fill = Math.max(1, Math.min(5, 3 + sc));
    if (gaming() && mac()) return heavyGame() ? { cap: 'Most games are made for Windows. A Mac is a weak pick for gaming, so we may suggest a Windows laptop too.', fill: Math.min(fill, 2), warn: true } : { cap: 'Minecraft, Roblox and The Sims run fine on a Mac. Many other games don\'t, so we\'ll check your list.', fill: fill, warn: false };
    if (gaming()) {
      if (A.gtier === 'Light or older games') return { cap: b === 0 ? 'Light and older games run on the built-in graphics most laptops have. Expect lower settings at this budget.' : 'Light and older games run well on built-in graphics, so the money can go to a better screen and battery.', fill: fill, warn: false };
      if (b === 0) return { cap: 'Under $600 there are no real gaming laptops. Light and older games only.', fill: fill, warn: true };
      if (b === 1) return { cap: A.gtier === 'The newest big games' ? 'An entry-level graphics card. The newest games run at low to medium settings.' : 'An entry-level graphics card. Popular games run well at 1080p.', fill: fill, warn: A.gtier === 'The newest big games' };
      if (b === 2) return { cap: 'A solid gaming laptop. Most games run at high settings at 1080p.', fill: fill, warn: false };
      if (b === 3) return { cap: 'A strong gaming laptop. High settings, even on a sharper 1440p screen.', fill: fill, warn: false };
      return { cap: 'A top gaming laptop. High to max settings in the newest games.', fill: fill, warn: false };
    }
    if (uses('Photos, video or design') && b < 2) return { cap: 'Editing works at this budget, but the next range up gets a better screen and more memory.', fill: fill, warn: true };
    if (has('Lots of tabs and apps open') && b === 0) return { cap: 'Heavy multitasking needs 16 GB of memory, which is hard to find under $600 right now.', fill: fill, warn: true };
    var main = A.uses[0];
    var label = { 'Everyday and streaming': 'A quick, reliable laptop for everyday use and streaming.', 'School': 'A light, dependable laptop for classes and homework.', 'Work and video calls': 'A solid work laptop that handles meetings and lots of tabs.', 'Coding or tech work': 'A fast laptop with plenty of memory for code and tools.', 'Photos, video or design': 'A strong editing laptop with a good, accurate screen.' }[main];
    return { cap: label, fill: fill, warn: false };
  }
  function armRisk() {
    if (mac()) return false;
    if (gaming()) return true;
    var txt = (A.apps.join(' ') + ' ' + A.appsTxt).toLowerCase();
    return /(testing app|quickbooks|android studio|docker|virtual|vpn|printer|older|game|steam)/.test(txt) || A.appsTxt.length > 0;
  }
  function notes() {
    var n = [], b = bud(), m = mac();
    if (!A.uses.length) return n;
    if (m && has('Touchscreen or pen')) n.push('Macs don\'t have touchscreens. An iPad or a Windows 2-in-1 may fit better.');
    if (m && A.size === 'Big (17 to 18 in)') n.push('Macs top out at 16 inches. We\'ll suggest the 16-inch MacBook Pro or a Windows option.');
    if (m) n.push('We can suggest Macs, but our setup and repairs are Windows only.');
    if (!m && armRisk() && A.bat === 'All day and then some') n.push('Some games and older programs don\'t run on the newest long-battery Windows laptops (Snapdragon), so we\'ll check your list first.');
    if (gaming() && !m && A.where === 'Carried every day' && heavyGame()) n.push('Gaming laptops are heavy, get loud under load and need the charger to play their best.');
    if (gaming() && has('Quiet and cool') && heavyGame()) n.push('No gaming laptop is truly quiet while gaming, but we\'ll pick ones with calmer fan settings.');
    if (has('Really nice screen') && A.bat === 'All day and then some' && !m) n.push('Bright OLED screens look amazing but usually cost a couple of hours of battery.');
    if (gaming() && b === 2) n.push('Two laptops with the same graphics card can perform very differently, so we check how much power each one actually gets.');
    if (b >= 0 && b <= 1 && !m) n.push('Many budget laptops ship with 8 GB of memory again this year. We\'ll steer you to 16 GB so it stays quick for years.');
    if (has('Plugs for my stuff') && inches() === 14) n.push('Thin laptops have fewer plugs, so you may need a small adapter.');
    if (uses('Work and video calls') || has('Good webcam and mic')) n.push('We\'ll favor laptops with a 1080p camera and good mics so you look and sound clear on calls.');
    if (has('Can upgrade or repair later') && !m) n.push('Most thin laptops have memory built in. We\'ll pick ones you can still upgrade later.');
    if (n.length < 2) n.push(m ? 'Macs can\'t be upgraded later, so buy the memory and storage you\'ll need now.' : 'Look for 16 GB of memory. On most thin laptops it\'s built in, so it can\'t be added later.');
    return n.slice(0, 2);
  }
  function meter(id, n, warn) { document.querySelectorAll('#' + id + ' i').forEach(function (s, k) { s.className = k < n ? (warn ? 'warn' : 'on') : ''; }); }
  function scene(x, y, w, h) {
    var u = A.uses[0] || '', s = '', cx = x + w / 2, cy = y + h / 2, o = ' stroke="#ff5818" stroke-opacity=".35" fill="none" stroke-width="1.2"';
    if (u === 'Gaming') s = '<path d="M' + (cx - 9) + ' ' + cy + 'h18M' + cx + ' ' + (cy - 9) + 'v18"' + o + '/><path d="M' + (x + 6) + ' ' + (y + 12) + 'v-6h6M' + (x + w - 6) + ' ' + (y + 12) + 'v-6h-6M' + (x + 6) + ' ' + (y + h - 12) + 'v6h6M' + (x + w - 6) + ' ' + (y + h - 12) + 'v6h-6"' + o + '/>';
    else if (/Photos/.test(u)) { for (var k = 0; k < 3; k++) s += '<rect x="' + (x + 10 + k * 8) + '" y="' + (y + h - 24 + k * 6) + '" width="' + (w * .5 - k * 10) + '" height="4"' + o + '/>'; }
    else if (/Coding/.test(u)) { for (var a = 0; a < 5; a++) s += '<path d="M' + (x + 12 + (a % 2) * 10) + ' ' + (y + 14 + a * 9) + 'h' + (w * (.42 - a * .05)) + '"' + o + '/>'; }
    else if (/Work/.test(u)) { s = '<rect x="' + (x + 14) + '" y="' + (y + 14) + '" width="' + (w * .38) + '" height="' + (h * .55) + '" rx="3"' + o + '/><rect x="' + (x + w * .52) + '" y="' + (y + 14) + '" width="' + (w * .38) + '" height="' + (h * .55) + '" rx="3"' + o + '/>'; }
    else if (/School/.test(u)) { for (var l = 0; l < 5; l++) s += '<path d="M' + (x + 12) + ' ' + (y + 14 + l * 8) + 'h' + (w * .4) + '"' + o + '/>'; }
    else if (/Everyday/.test(u)) s = '<path d="M' + (cx - 8) + ' ' + (cy - 10) + 'v20l17-10z"' + o + '/>';
    return s;
  }
  function readout() {
    var on = function (id, v) { var el = $(id); if (el) el.classList.toggle('on', !!v); };
    var any = A.uses.length > 0, m = mac(), sz = inches(), rig = heavyGame() && !m;
    $('l-for').textContent = any ? useText() : '–';
    $('l-size').textContent = sz ? sz + ' in' + (A.where ? ' · ' + A.where.toLowerCase() : '') : '–';
    $('l-must').textContent = A.pri.length ? A.pri.length + ' picked' : '–';
    $('l-budget').textContent = A.budget || '–';
    $('l-sys').textContent = A.os || '–';
    $('l-body').style.transform = 'scale(' + (sz === 14 ? .84 : sz === 18 ? 1.1 : 1) + ')';
    $('l-body').style.opacity = any ? 1 : .35;
    $('l-empty').style.opacity = any ? 0 : 1;
    on('l-num', sz === 18 && !m); $('l-rgb').setAttribute('opacity', rig ? .9 : 0); $('l-keys').setAttribute('stroke', rig ? '#ff5818' : '#ffffff'); $('l-keys').setAttribute('stroke-opacity', rig ? .55 : .22);
    on('l-vents', rig);
    $('l-thick').setAttribute('height', rig || (has('Can upgrade or repair later') && !m) ? 9 : sz === 14 ? 3 : 5);
    on('l-ports', any); on('l-ports-more', (has('Plugs for my stuff') || rig) && !m);
    on('l-pen', has('Touchscreen or pen') && !m);
    $('l-os').textContent = A.os && A.os !== 'Either is fine' ? (m ? 'MACOS' : 'WINDOWS') : '';
    $('l-scr-t').textContent = sz ? sz + ' in' : '';
    $('l-scene').innerHTML = scene(67, 37, 186, 112);
    var bi = bud(); $('l-floor').setAttribute('opacity', (bi < 0 ? .12 : .18 + bi * .12).toFixed(2));
    var V = verdict(); $('l-cap').textContent = V.cap; $('l-cap').classList.toggle('warn', V.warn); meter('l-fit', V.fill, V.warn);
    $('l-notes').innerHTML = notes().map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('');
    var B = battery(), W = weight();
    meter('l-bat', B.n); $('l-bat-t').textContent = B.t;
    meter('l-wt', W.n); $('l-wt-t').textContent = W.t;
  }
  show(0);
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
    var groups = {};
    document.querySelectorAll('.goal, .fact, .line, .faq, .part, .faq-group').forEach(function (el) {
      if (el.closest('[data-reveal]') || el.closest('form')) return;
      var p = el.parentNode; var k = groups[p] = (groups[p] || 0);
      el.classList.add('stg'); el.style.setProperty('--d', Math.min(k, 8) * 0.06 + 's'); groups[p] = k + 1;
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
