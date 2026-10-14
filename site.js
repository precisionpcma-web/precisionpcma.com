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
  /* Laptop Finder "Have Ben find one" link: index.html?laptop=<their answers>#quote prefills the message */
  try {
    var lp = new URLSearchParams(location.search).get('laptop');
    if (lp) { var m = document.getElementById('r-msg'); if (m && !m.value) m.value = 'Help me find a laptop.\n' + lp.slice(0, 1200).replace(/[<>]/g, ''); }
  } catch (x) {}
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

/* ---------- custom build quiz (builds v5.8) ---------- */
(function () {
  var form = document.getElementById('quiz');
  if (!form) return;
  var stage = document.getElementById('q-stage'), err = document.getElementById('q-err');
  var back = document.getElementById('q-back'), next = document.getElementById('q-next'), stepLbl = document.getElementById('q-step');
  var pads = form.querySelectorAll('.qpads li');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var A = { uses: [], gtier: '', games: [], look: [], apps: '', have: '', notes: '', name: '', phone: '', email: '', bizname: '', style: '', color: '', light: '' };
  var USES = [['Gaming','game','High frame rates at your resolution','Gaming'],['Streaming','stream','Gaming plus a live stream or recording','Streaming'],['Photo or video editing','video','Premiere, Resolve, Lightroom, Photoshop','Photo and video editing'],['3D, CAD or engineering','cube','Blender, SolidWorks, AutoCAD, Fusion','3D and CAD'],['AI on your own PC','ai','Local LLMs and image generation (Ollama, Stable Diffusion) on your GPU','Local AI'],['Office or school','school','Browsing, Office, school work, email','Everyday and office']];
  var MAX = { uses: 2 };
  var GTIER = [['light','Esports and light games','Valorant, CS2, League of Legends, Minecraft, Roblox'],['online','Modern multiplayer','Fortnite, Call of Duty, Apex Legends, Battlefield 6'],['heavy','Demanding AAA games','Cyberpunk 2077 with ray tracing, Monster Hunter Wilds, Flight Simulator 2024']];
  var GT = { light: 'esports and light games', online: 'modern multiplayer games', heavy: 'demanding AAA games' };
  var GW = { 'Minecraft': 'light', 'Roblox': 'light', 'League of Legends': 'light', 'Valorant': 'light', 'Counter-Strike 2': 'light', 'Fortnite': 'online', 'Call of Duty': 'online', 'Apex Legends': 'online', 'Marvel Rivals': 'online', 'Battlefield 6': 'online', 'GTA V': 'light', 'EA Sports FC': 'light', 'Cyberpunk 2077': 'heavy', 'Microsoft Flight Simulator 2024': 'heavy' };
  var TR = { light: 0, online: 1, heavy: 2 };
  var GAMES = ['Fortnite','Valorant','Call of Duty','Counter-Strike 2','Apex Legends','Battlefield 6','Marvel Rivals','Minecraft','Roblox','League of Legends','GTA V','EA Sports FC','Cyberpunk 2077','Microsoft Flight Simulator 2024'];
  var APPS = { 'Streaming': ['OBS Studio','Twitch or YouTube streaming'], 'Photo or video editing': ['Premiere Pro','DaVinci Resolve','Photoshop','Lightroom','After Effects'], '3D, CAD or engineering': ['Blender','AutoCAD','SolidWorks','Fusion','Unreal Engine'], 'AI on your own PC': ['Local AI chat (LM Studio, Ollama)','AI image tools (Stable Diffusion)'], 'Office or school': ['Microsoft Office','Google Docs','QuickBooks','Zoom or Teams'] };
  var RES = [['1080p','1920 × 1080, the most common',16,9,34],['1440p','2560 × 1440, the gaming sweet spot',16,9,42],['4K','3840 × 2160, needs the most graphics power',16,9,50],['Ultrawide','3440 × 1440, extra-wide 21:9',21,9,56],['Multiple monitors','Two or more screens',16,9,30],['Not sure','We\'ll recommend one',16,9,36]];
  var HZ = ['60 Hz','120 to 180 Hz','240 Hz or more','Not sure'];
  var STYLE = [['Glass showcase','See the parts inside','Glass side panel'],['Clean and solid','Clean and understated','Solid panels'],['Small and compact','Fits on a desk, fewer upgrades later','Small form factor'],['Airflow first','Mesh front, lower temps at lower fan speeds','High airflow'],['No preference','We\'ll choose what fits','No preference']];
  var COLOR = ['Black', 'White', 'Something else', 'No preference'];
  var LIGHT = ['No lights', 'One color', 'Full RGB', 'No preference'];
  var LOOK = ['Wi-Fi and Bluetooth', 'Extra quiet', 'Front USB-C', 'Lots of storage', 'Room to add parts later'];
  var BUD = ['Under $800','$800 to $1,200','$1,200 to $1,800','$1,800 to $2,500','$2,500 or more','Not sure'];
  var REACH = [['Text','chat'],['Phone call','phone'],['Email','mail']];
  var step = 0, N = 6;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function ico(n) { return '<span class="ico-tile"><svg class="ico" aria-hidden="true"><use href="#i-' + n + '"/></svg></span>'; }
  function isSel(name, val) { return Array.isArray(A[name]) ? A[name].indexOf(val) >= 0 : A[name] === val; }
  function card(name, val, title, hint, icon, extra) {
    var multi = Array.isArray(A[name]), sel = isSel(name, val) ? ' sel' : '', full = multi && MAX[name] && !sel && A[name].length >= MAX[name];
    return '<label class="qcard' + sel + (full ? ' is-full' : '') + '"' + (full ? ' aria-disabled="true"' : '') + '><input type="' + (multi ? 'checkbox' : 'radio') + '" name="' + name + '" value="' + esc(val) + '"' + (sel ? ' checked' : '') + ' />' + (extra || (icon ? ico(icon) : '')) + '<span class="qc-t">' + esc(title) + '</span>' + (hint ? '<span class="qc-h">' + esc(hint) + '</span>' : '') + '</label>';
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
  function looks(l) {
    if (l === 'Small case') return A.style === 'Small and compact';
    if (l === 'Glass showpiece') return A.style === 'Glass showcase';
    if (l === 'RGB lighting') return A.light === 'Full RGB';
    if (l === 'Quiet') return A.look.indexOf('Extra quiet') >= 0;
    return A.look.indexOf(l) >= 0;
  }
  function lookText() {
    var p = [];
    if (A.style && A.style !== 'No preference') p.push(A.style);
    if (A.color && A.color !== 'No preference') p.push(A.color === 'Something else' ? 'custom color' : A.color.toLowerCase());
    if (A.light && A.light !== 'No preference') p.push(A.light === 'No lights' ? 'no lights' : A.light === 'One color' ? 'one-color lighting' : 'full RGB');
    p = p.concat(A.look.map(function (x) { return x.toLowerCase().replace('wi-fi', 'Wi-Fi').replace('bluetooth', 'Bluetooth').replace('usb-c', 'USB-C'); }));
    return p.length ? p.join(', ').replace(/^./, function (c) { return c.toUpperCase(); }) : '';
  }
  function gt() { var t = A.gtier; A.games.forEach(function (g) { var w = GW[g]; if (w && (!t || TR[w] > TR[t])) t = w; }); return t; }
  function useText() { return A.uses.map(function (u) { return USES.filter(function (x) { return x[0] === u; })[0][3]; }).join(' + ') + (gaming() && gt() ? ' (' + GT[gt()] + ')' : ''); }
  function countText(name) { var n = A[name].length, m = MAX[name]; return n >= m ? n + ' of ' + m + ' picked. Tap one to swap it.' : n + ' of ' + m + ' picked'; }
  function syncLimit(name) {
    var full = A[name].length >= MAX[name], c = document.getElementById('q-count-' + name); if (c) c.textContent = countText(name);
    stage.querySelectorAll('input[name="' + name + '"]').forEach(function (i) { var l = i.parentNode, f = full && !i.checked; l.classList.toggle('is-full', f); if (f) l.setAttribute('aria-disabled', 'true'); else l.removeAttribute('aria-disabled'); });
  }
  var screens = [
    function () {
      var h = '<h2 class="qh" id="qh-uses">What\'s this PC for?</h2><p class="qp">Pick one or two. <span class="qcount" id="q-count-uses" aria-live="polite">' + countText('uses') + '</span></p><div class="qcards" role="group" aria-labelledby="qh-uses">' + USES.map(function (u) { return card('uses', u[0], u[3], u[2], u[1]); }).join('') + '</div>';
      h += '<div id="q-gsub"' + (gaming() ? '' : ' hidden') + '><h3 class="qsub" id="qh-gt">What\'s the most demanding game you play?</h3><p class="qp">Pick one. It decides how much graphics card you need.</p><div class="qcards" role="radiogroup" aria-labelledby="qh-gt">' + GTIER.map(function (g) { return card('gtier', g[0], g[1], g[2], null); }).join('') + '</div></div>';
      return h;
    },
    function () {
      var h = '<h2 class="qh">What monitor will it run?</h2><p class="qp">Resolution and refresh rate decide the graphics card. No monitor yet? Pick the one you want and we\'ll suggest a model.</p><div class="qcards">' + RES.map(function (r) { return card('res', r[0], r[0], r[1], null, mon(r[2], r[3], r[4], r[0] === 'Multiple monitors')); }).join('') + '</div>';
      if (gaming()) h += '<h3 class="qsub">Refresh rate <small>(the Hz number on the box or in Windows display settings)</small></h3>' + seg('hz', HZ);
      return h;
    },
    function () {
      var h = '<h2 class="qh">Which games and programs will it run?</h2><p class="qp">Tap what you use and add anything missing. We size the build to the most demanding one.</p>';
      if (gaming()) h += '<h3 class="qsub" style="margin-top:6px">Games</h3>' + chips('games', GAMES);
      var apps = []; A.uses.forEach(function (u) { if (APPS[u]) apps = apps.concat(APPS[u]); });
      if (apps.length) h += '<h3 class="qsub">Programs</h3>' + chips('games', apps);
      h += '<div class="field" style="margin-top:18px"><label for="q-apps">Anything else you play or use</label><textarea id="q-apps" placeholder="' + esc(gaming() ? 'For example: Elden Ring, Rocket League, Discord, Premiere Pro' : 'For example: Excel, Chrome with lots of tabs, Blender, Photoshop') + '">' + esc(A.apps) + '</textarea></div>';
      return h;
    },
    function () {
      return '<h2 class="qh">Case and features</h2><p class="qp">All optional. Skip anything you don\'t care about.</p>' +
        '<h3 class="qsub" style="margin-top:6px">Case style</h3><div class="qcards">' + STYLE.map(function (l) { return card('style', l[0], l[2], l[1], null); }).join('') + '</div>' +
        '<h3 class="qsub">Color</h3>' + seg('color', COLOR) +
        '<h3 class="qsub">Lighting</h3>' + seg('light', LIGHT) +
        '<h3 class="qsub">Extras</h3>' + chips('look', LOOK) +
        '<div class="field" style="margin-top:20px"><label for="q-have">What are you using now? <small>(optional)</small></label><input id="q-have" value="' + esc(A.have) + '" placeholder="For example: a 6-year-old Dell that struggles in Fortnite. Or parts to reuse: RTX 3080, 2 TB SSD" /></div>';
    },
    function () {
      return '<h2 class="qh">What\'s your parts budget?</h2><p class="qp">Parts only. Build labor is listed separately on your build sheet.</p><div class="qbig" id="q-bud">' + (A.budget ? esc(A.budget) : 'Pick a range') + '</div>' + seg('budget', BUD) +
        '<div class="field" style="margin-top:20px"><label for="q-notes">Anything else? <small>(optional)</small></label><textarea id="q-notes" placeholder="A deadline, a case you like, how many years you want it to last">' + esc(A.notes) + '</textarea></div>';
    },
    function () {
      var pick = A.games.concat(A.apps ? [A.apps] : []).join(', ');
      var rows = [['Use', useText(), 0], ['Screen', A.res + (gaming() && A.hz ? ' · ' + A.hz : ''), 1], ['Games and programs', pick, 2], ['Case', lookText() || 'No preference', 3], ['Parts budget', A.budget, 4]];
      if (A.have) rows.push(['Using now', A.have, 3]);
      return '<h2 class="qh">Here\'s what you told us</h2><dl class="brief">' + rows.map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + esc(r[1] || '–') + '</dd><button type="button" class="link qedit" data-go="' + r[2] + '">Edit</button></div>'; }).join('') + '</dl>' +
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
    if (step === 0 && !A.uses.length) return 'Pick what this PC is for.';
    if (step === 0 && gaming() && !A.gtier) return 'Pick the most demanding game you play.';
    if (step === 1 && !A.res) return 'Pick your monitor, or "Not sure".';
    if (step === 1 && gaming() && !A.hz) return 'Pick a refresh rate, or "Not sure".';
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
    if (to > step) { var m = check(); if (m) { err.textContent = m; err.style.display = 'block'; err.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' }); return; } }
    var d = to > step ? 1 : -1; step = to; show(d);
    var top = form.getBoundingClientRect().top; if (top < 0) form.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }
  stage.addEventListener('change', function (e) {
    var t = e.target; if (t.type !== 'radio' && t.type !== 'checkbox') return;
    if (t.type === 'checkbox') {
      var a = A[t.name], i = a.indexOf(t.value);
      if (t.checked && i < 0) {
        if (MAX[t.name] && a.length >= MAX[t.name]) { t.checked = false; var cc = document.getElementById('q-count-' + t.name); if (cc) { cc.classList.remove('flash'); void cc.offsetWidth; cc.classList.add('flash'); } return; }
        a.push(t.value);
      }
      if (!t.checked && i >= 0) a.splice(i, 1);
      t.parentNode.classList.toggle('sel', t.checked);
      if (MAX[t.name]) syncLimit(t.name);
      if (t.name === 'uses') {
        if (!gaming()) { A.gtier = ''; A.hz = ''; stage.querySelectorAll('input[name="gtier"]').forEach(function (r) { r.checked = false; r.parentNode.classList.remove('sel'); }); }
        var ok = (gaming() ? GAMES : []).slice(); A.uses.forEach(function (u) { if (APPS[u]) ok = ok.concat(APPS[u]); });
        A.games = A.games.filter(function (g) { return ok.indexOf(g) >= 0; });
        var gs = document.getElementById('q-gsub'); if (gs) gs.hidden = !gaming();
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
        business_name: A.bizname || '(not a business)', uses: A.uses.join(', '), game_level: gaming() ? (GT[A.gtier] || '-') + (gt() !== A.gtier ? ' (games tapped push it to: ' + GT[gt()] + ')' : '') : 'n/a',
        games_and_programs: A.games.join(', ') + (A.apps ? (A.games.length ? '; ' : '') + A.apps : ''), monitor: A.res, refresh_rate: gaming() ? (A.hz || 'Not given') : 'n/a',
        look_and_feel: lookText() || 'No preference', parts_budget: A.budget, parts_they_have: A.have || 'None', notes: A.notes || '(none)',
        auto_target: V.t, auto_stats: stats().map(function (r) { return r[0] + ': ' + (r[2] || '-'); }).join(' | '), notes_shown: notes().join(' | ') || '(none)' });
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
    n += { light: -2, online: -1, heavy: 0 }[gt()] || 0;
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
      if (!A.res || !gt()) return { t: 'Gaming build', cap: 'Pick your monitor and your most demanding game, and we\'ll aim the build at them.', fill: fill, warn: false };
      var res = A.res === 'Multiple monitors' ? 'multi-monitor' : A.res === 'Not sure' ? '1440p' : A.res === 'Ultrawide' ? 'ultrawide' : A.res;
      var what = gt() === 'heavy' ? 'demanding AAA games' + (A.res === '4K' ? ', with DLSS or FSR' : '') : gt() === 'online' ? 'modern multiplayer games' : 'your games';
      if (sc >= 2 && !(gt() === 'heavy' && b <= 1)) return { t: 'Max settings', cap: 'Smooth ' + res + ' gaming at max settings in ' + what + (uses('Streaming') ? ', with room to stream.' : '.'), fill: fill, warn: false };
      if (sc >= 1) return { t: 'High settings', cap: 'Smooth ' + res + ' gaming at high settings in ' + what + (uses('Streaming') ? ', with room to stream.' : '.'), fill: fill, warn: false };
      if (sc === 0) return { t: 'Medium to high settings', cap: 'Solid ' + res + ' gaming at medium to high settings in ' + what + '.', fill: fill, warn: false };
      var cause = A.res === '4K' ? '4K' : A.res === 'Ultrawide' ? 'An ultrawide screen' : A.hz === '240 Hz or more' ? '240 Hz' : 'This mix of screen and games';
      return { t: 'Stretch: needs more budget', cap: cause + ' needs more graphics power than this budget usually buys. A lower resolution, upscaling (DLSS or FSR) or a bigger budget would fit better.', fill: fill, warn: true };
    }
    if (uses('AI on your own PC')) return b >= 4 ? { t: 'Fast 8B to 14B models', cap: 'Runs 8B to 14B models fast. 30B-class models need 24 GB or more of VRAM.', fill: fill, warn: false } : b >= 2 ? { t: 'Mid-size local AI models', cap: 'Runs mid-size local models well. Bigger ones need more graphics memory.', fill: fill, warn: false } : { t: 'Smaller local AI models', cap: 'Runs smaller local models. Bigger ones need a card with more memory than this budget buys.', fill: fill, warn: b < 1 };
    if (uses('Photo or video editing')) return b >= 2 ? { t: 'Smooth 4K editing', cap: 'Comfortable 4K editing for most footage, with fast exports.', fill: fill, warn: false } : { t: 'Smooth 1080p editing', cap: 'Smooth 1080p editing. 4K works, using lighter preview files on heavier projects.', fill: fill, warn: false };
    if (uses('3D, CAD or engineering')) return b >= 3 ? { t: 'Heavy 3D and rendering', cap: 'Plenty of VRAM for big scenes and fast GPU renders in Blender.', fill: fill, warn: false } : { t: 'Everyday 3D and CAD', cap: 'Smooth modeling and CAD. Big renders take longer at this budget.', fill: fill, warn: false };
    return { t: 'Streaming build', cap: 'A strong processor and graphics card to stream smoothly.', fill: fill, warn: false };
  }
  function quiet() {
    if (!A.uses.length) return { n: 0, t: '' };
    var q = 4, b = bud();
    if (light()) q = 5;
    if (gaming() && gt() === 'heavy') q -= 1;
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
    if (looks('Room to add parts later')) u += 2;
    if (b >= 2) u += 1;
    u = Math.max(1, Math.min(5, u));
    return { n: u, t: u >= 4 ? 'Lots of room' : u === 3 ? 'Some room' : 'Limited' };
  }
  /* per-use stats: what matters for the first thing they picked (plus one from the second). 1-5, typical not guaranteed */
  function stats() {
    if (!A.uses.length) return [];
    var b = bud(), has = b >= 0, c = function (n) { return Math.max(1, Math.min(5, Math.round(n))); };
    var vram = ['8 GB', '8 to 16 GB', '12 to 16 GB', '16 GB', '16 GB (24 GB or more needs a top-end card)'];
    var S = {
      'Gaming': function () {
        if (!has || !A.res || !gt()) return [['Frame rate', 0, ''], ['Settings', 0, ''], [gt() === 'heavy' ? 'Ray tracing' : 'Headroom for heavier games', 0, '']];
        var sc = b - gneed(), fr = c(3 + sc), V = verdict();
        var rows = [['Frame rate', fr, ['', 'Under 60 fps, needs DLSS or FSR', 'About 60 fps', '60 to 100 fps', '100 to 144 fps', '144 fps or more'][fr], fr < 2], ['Settings', fr, { 'Max settings': 'Max', 'High settings': 'High', 'Medium to high settings': 'Medium to high' }[V.t] || 'Low to medium', V.warn]];
        if (gt() === 'heavy') { var rt = c(b); rows.push(['Ray tracing', rt, ['', 'Off', 'Light, with DLSS', 'Good, with DLSS', 'Strong', 'Strong, with DLSS'][rt]]); }
        else { var tg = c(1 + b); rows.push(['Headroom for heavier games', tg, ['', 'Limited', 'Some', 'Good', 'Strong', 'Plenty'][tg]]); }
        return rows;
      },
      'Streaming': function () {
        if (!has) return [['Stream quality', 0, ''], ['Smooth while live', 0, ''], ['Room for OBS and apps', 0, '']];
        var q = c(3 + b * .5), live = c(3 + b - (gaming() ? gneed() + 1 : 1)), mem = c(2 + b * .75);
        return [['Stream quality', q, q >= 5 ? '1440p or 4K' : q >= 4 ? '1080p at 60 fps' : '720p to 1080p'], ['Smooth while live', live, ['', 'Tight', 'OK', 'Smooth', 'Very smooth', 'Very smooth'][live], live < 2], ['Room for OBS and apps', mem, b >= 2 ? '32 GB memory' : '16 GB memory']];
      },
      'Photo or video editing': function () {
        if (!has) return [['Timeline playback', 0, ''], ['Export speed', 0, ''], ['Big projects', 0, '']];
        var tl = c(2.5 + b * .75), ex = c(1 + b), mem = c(2 + b * .75);
        return [['Timeline playback', tl, b >= 2 ? 'Smooth 4K' : 'Smooth 1080p, 4K with proxies'], ['Export speed', ex, ['', 'Slow', 'OK', 'Fast', 'Very fast', 'Very fast'][ex]], ['Big projects', mem, b >= 4 ? '64 GB memory' : b >= 2 ? '32 GB memory' : '16 to 32 GB memory']];
      },
      '3D, CAD or engineering': function () {
        if (!has) return [['Viewport', 0, ''], ['Render speed', 0, ''], ['Scene size', 0, '']];
        var vp = c(2 + b * .75), rs = c(1 + b), sz = c(1 + b);
        return [['Viewport', vp, ['', 'Basic', 'Smooth for small models', 'Smooth', 'Very smooth', 'Very smooth'][vp]], ['Render speed', rs, ['', 'Slow', 'OK', 'Fast', 'Very fast', 'Very fast'][rs]], ['Scene size', sz, vram[b] + ' graphics memory']];
      },
      'AI on your own PC': function () {
        if (!has) return [['Model size', 0, ''], ['Answer speed', 0, ''], ['Image generation', 0, '']];
        var ms = c(1 + b), sp = c(1.5 + b), im = c(1 + b);
        return [['Model size', ms, (b >= 4 ? '8B to 14B models, fast' : b >= 2 ? '7B to 8B models' : 'Small models') + ' (' + vram[b] + ')', b < 1], ['Answer speed', sp, ['', 'Slow', 'OK', 'Quick', 'Fast', 'Very fast'][sp]], ['Image generation', im, ['', 'Slow', 'OK', 'Good', 'Fast', 'Very fast'][im]]];
      },
      'Office or school': function () {
        if (!has) return [['Everyday speed', 0, ''], ['Multitasking', 0, ''], ['Storage', 0, '']];
        var sp = c(4 + b * .5), mt = c(3 + b * .5), st = c(3 + b * .5);
        return [['Everyday speed', sp, sp >= 5 ? 'Instant' : 'Snappy'], ['Multitasking', mt, b >= 2 ? '32 GB memory' : '16 GB memory'], ['Storage', st, b >= 2 ? '2 TB SSD' : '1 TB SSD']];
      }
    };
    var rows = [];
    A.uses.forEach(function (u) { if (S[u]) S[u]().forEach(function (r) { if (!rows.some(function (x) { return x[0] === r[0]; })) rows.push(r); }); });
    return rows;
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
    if (gaming() && gt() === 'heavy' && b >= 0 && b <= 1 && b - need() === 0) n.push('Graphics-heavy games need a stronger graphics card than this budget usually buys. Expect medium settings, with upscaling (DLSS or FSR) to help.');
    if (gaming() && esports && A.hz === '240 Hz or more') n.push('At 240 Hz in Valorant, CS2 or Fortnite, the CPU limits frame rate as much as the GPU. We\'ll aim for an X3D chip.');
    if (uses('AI on your own PC')) n.push('For local AI, VRAM matters most. 16 GB runs most 8B to 14B models well. 30B and up want 24 GB or more.');
    if (uses('Streaming')) n.push('Modern GPUs have a hardware video encoder (NVENC on GeForce), so streaming in OBS costs only a few percent of frame rate.');
    if (looks('Small case') && !light()) n.push('Small cases run warmer and louder under load and leave fewer upgrades later. We\'ll pick parts that fit.');
    if (looks('Quiet') && gaming() && gt() === 'heavy') n.push('No gaming PC is silent at full load, but large fans on a gentle curve in a mesh-front case keep it quiet.');
    if (A.have) n.push('We\'ll check that the parts you have are compatible and won\'t hold the new ones back.');
    if (light()) n.push('Built-in graphics are plenty for this. The money goes to a fast SSD and 16 to 32 GB of memory.');
    if (!light() && n.length < 2 && A.budget && A.budget !== 'Not sure') n.push(b >= 0 && b <= 1 ? 'Memory prices are high this year, so we\'ll start with 16 GB (2 x 8 GB, dual-channel) and leave slots free to add more.' : 'Memory prices are high this year, so we\'ll balance memory against the graphics card. Most builds at this budget should have 32 GB.');
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
    document.documentElement.classList.toggle('q-on', any);
    $('ro-for').textContent = any ? useText() : '–';
    $('ro-disp').textContent = A.res ? A.res + (gaming() && A.hz && A.hz !== 'Not sure' ? ' · ' + A.hz : '') : '–';
    var V = verdict(), stretch = V.warn; $('ro-target').textContent = V.t; $('ro-target').classList.toggle('warn', stretch);
    $('ro-cap').textContent = V.cap; $('ro-cap').classList.toggle('warn', stretch);
    $('ro-notes').innerHTML = notes().map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('');
    var O = owns();
    $('ro-budget').textContent = A.budget || '–';
    $('ro-case-t').textContent = lookText() || (step >= 4 ? 'No preference' : '–');
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
    $('ro-stats').innerHTML = statsHTML(stats(), 'Pick what it\'s for to see its stats.');
    var r = A.res, m = '';
    var hz = gaming() && A.hz && A.hz !== 'Not sure' ? ({ '60 Hz': '60 Hz', '120 to 180 Hz': '120+ Hz', '240 Hz or more': '240+ Hz' })[A.hz] : '';
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

/* ---------- Laptop Finder quiz (laptops v6.4: Ben's picks) ---------- */
(function () {
  var form = document.getElementById('lquiz');
  if (!form) return;
  var $ = function (id) { return document.getElementById(id); };
  var stage = $('lq-stage'), err = $('lq-err'), back = $('lq-back'), next = $('lq-next'), stepLbl = $('lq-step');
  var pads = form.querySelectorAll('.qpads li');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var A = { uses: [], pri: [], apps: [], extra: [], name: '', phone: '', email: '' };
  var USES = [['Everyday and streaming', 'home', 'Browsing, email, Netflix and YouTube', 'Everyday use'], ['School', 'school', 'Papers, research, online classes', 'School'], ['Work and video calls', 'office', 'Office apps, Zoom or Teams, lots of tabs', 'Work'], ['Photos, video or design', 'video', 'Lightroom, Premiere, Photoshop, Canva', 'Photo, video or design'], ['Gaming', 'game', 'Steam, Fortnite, Minecraft and more', 'Gaming'], ['Coding or tech work', 'ai', 'Writing and running code', 'Programming']];
  var MAX = { uses: 2, pri: 3 };
  var GTIER = [['light', 'Esports and light games', 'Valorant, CS2, League of Legends, Minecraft, Roblox, The Sims'], ['online', 'Modern multiplayer', 'Fortnite, Call of Duty, Apex Legends, Battlefield 6'], ['heavy', 'Demanding AAA games', 'Cyberpunk 2077, Monster Hunter Wilds, Flight Simulator 2024']];
  var GT = { light: 'esports and light games', online: 'modern multiplayer games', heavy: 'demanding AAA games' };
  var WHERE = [['Carried every day', 'School, commute, travel', 'In a bag every day'], ['Moves around the house', 'Couch, kitchen, desk', 'Around the house'], ['Stays on a desk', 'Plugged in most of the time', 'Mostly on a desk']];
  var SIZE = ['Smaller (13 to 14 in)', 'Middle (15 to 16 in)', 'Big (17 to 18 in)', 'Let us pick'];
  var BAT = ['A few hours', 'Most of a day', 'A full day (10+ hours)'];
  var PRI = [['Really nice screen', 'Bright, sharp, accurate color', 'Display quality'], ['Quiet and cool', 'Calm fans, cool on your lap', 'Quiet and cool'], ['Great keyboard', 'Comfortable for long typing', 'A great keyboard'], ['Good webcam and mic', 'Look and sound clear on calls', 'Clear video calls'], ['Plugs for my stuff', 'HDMI, SD card, regular USB', 'Plenty of ports'], ['Touchscreen or pen', 'Tap, draw or fold it back', 'Touchscreen or pen'], ['Lots of tabs and apps open', 'Lots of tabs and apps at once', 'Heavy multitasking'], ['Can upgrade or repair later', 'Add memory or storage later', 'Upgradeable']];
  var BUD = ['Under $600', '$600 to $900', '$900 to $1,300', '$1,300 to $2,000', '$2,000 or more', 'Not sure'];

  /* ---- What it needs to run. g = graphics needed (laptop tiers below), win = Windows only, mac = Mac only,
     arm = trouble on Snapdragon (Arm) Windows laptops, mem = memory needed in GB, c = creative power needed 0-3.
     Every game also means: Windows, a real graphics card, no Snapdragon. ---- */
  var APPDB = [
    // games
    { n: 'Minecraft', game: 1, g: 3 }, { n: 'Roblox', game: 1, g: 3 }, { n: 'The Sims 4', game: 1, g: 3 }, { n: 'League of Legends', game: 1, g: 3 },
    { n: 'Valorant', game: 1, g: 3 }, { n: 'Counter-Strike 2', game: 1, g: 3 }, { n: 'Fortnite', game: 1, g: 3 }, { n: 'Overwatch 2', game: 1, g: 3 },
    { n: 'Rocket League', game: 1, g: 3 }, { n: 'Rainbow Six Siege', game: 1, g: 3 }, { n: 'Dota 2', game: 1, g: 3 }, { n: 'World of Warcraft', game: 1, g: 3 },
    { n: 'Stardew Valley', game: 1, g: 3 }, { n: 'EA Sports FC', game: 1, g: 3 }, { n: 'NBA 2K', game: 1, g: 3 }, { n: 'Madden NFL', game: 1, g: 3 },
    { n: 'GTA V', game: 1, g: 3 }, { n: 'Call of Duty', game: 1, g: 4 }, { n: 'Warzone', game: 1, g: 4 }, { n: 'Apex Legends', game: 1, g: 4 },
    { n: 'Marvel Rivals', game: 1, g: 4 }, { n: 'Battlefield 6', game: 1, g: 4 }, { n: 'Helldivers 2', game: 1, g: 4 }, { n: 'Destiny 2', game: 1, g: 4 },
    { n: 'Elden Ring', game: 1, g: 4 }, { n: 'Baldur\'s Gate 3', game: 1, g: 4 }, { n: 'Forza Horizon 5', game: 1, g: 4 }, { n: 'Palworld', game: 1, g: 4 },
    { n: 'Cyberpunk 2077', game: 1, g: 5 }, { n: 'Monster Hunter Wilds', game: 1, g: 5 }, { n: 'Hogwarts Legacy', game: 1, g: 5 }, { n: 'Microsoft Flight Simulator 2024', game: 1, g: 6 },
    { n: 'Steam games (various)', game: 1, g: 3 },
    // everyday, school, work
    { n: 'Netflix and YouTube' }, { n: 'Microsoft Office' }, { n: 'Google Docs' }, { n: 'Zoom or Teams' }, { n: 'Spotify' }, { n: 'Discord' },
    { n: 'QuickBooks Desktop', win: 1, arm: 1 }, { n: 'QuickBooks Online' }, { n: 'Excel with big spreadsheets', mem: 16 }, { n: 'Power BI Desktop', win: 1, mem: 16 },
    { n: 'Microsoft Access', win: 1 }, { n: 'A school testing app (LockDown Browser, Examplify)', arm: 1 }, { n: 'A work VPN', arm: 1 }, { n: 'An older printer or scanner', arm: 1 },
    // creative
    { n: 'Canva' }, { n: 'Photoshop', mem: 16, c: 1 }, { n: 'Lightroom', mem: 16, c: 1 }, { n: 'Premiere Pro', mem: 16, c: 2 }, { n: 'DaVinci Resolve', mem: 16, c: 2 },
    { n: 'After Effects', mem: 32, c: 3 }, { n: 'Final Cut Pro', mac: 1, c: 2 }, { n: 'Logic Pro', mac: 1, c: 1 }, { n: 'GarageBand or iMovie', mac: 1 },
    { n: 'Ableton Live or FL Studio', mem: 16, c: 1 }, { n: 'Blender', mem: 16, c: 3 }, { n: 'AutoCAD', mem: 16, c: 2 }, { n: 'SolidWorks', win: 1, arm: 1, mem: 32, c: 3 },
    { n: 'Revit', win: 1, arm: 1, mem: 32, c: 3 }, { n: 'Fusion', mem: 16, c: 2 }, { n: 'SketchUp', mem: 16, c: 1 }, { n: 'OBS (streaming or recording)', c: 1 },
    // coding
    { n: 'VS Code' }, { n: 'Python or Jupyter' }, { n: 'Visual Studio', win: 1, mem: 16 }, { n: 'Xcode (iPhone apps)', mac: 1, mem: 16 }, { n: 'Android Studio', mem: 16 },
    { n: 'Docker or virtual machines', mem: 32, arm: 1 }, { n: 'Unity or Unreal Engine', mem: 32, c: 2, g: 4 }
  ];
  var POP = { 'Gaming': ['Minecraft', 'Fortnite', 'Valorant', 'Call of Duty', 'Roblox', 'League of Legends'], 'Photos, video or design': ['Photoshop', 'Lightroom', 'Premiere Pro', 'DaVinci Resolve', 'Canva'], 'Coding or tech work': ['VS Code', 'Docker or virtual machines', 'Android Studio'], 'Work and video calls': ['Microsoft Office', 'Zoom or Teams', 'QuickBooks Desktop'], 'School': ['Google Docs', 'Microsoft Office', 'A school testing app (LockDown Browser, Examplify)'], 'Everyday and streaming': ['Netflix and YouTube', 'Microsoft Office'] };
  function app(n) { for (var i = 0; i < APPDB.length; i++) if (APPDB[i].n === n) return APPDB[i]; return null; }
  function picked() { return A.apps.map(app).filter(Boolean); }
  function anyApp(k) { return picked().some(function (a) { return a[k]; }); }
  function maxApp(k) { return picked().reduce(function (m, a) { return Math.max(m, a[k] || 0); }, 0); }

  /* ---- Ben's picks (checked Oct 13, 2026). Brand new only; 2025 models where they're the better value.
     Prices are what we last saw at major US stores or the maker (2026 prices move fast), with the month seen in `seen`.
     g = graphics: 0 basic built-in, 1 good built-in, 2 strong built-in, 3 RTX 5050, 4 RTX 5060, 5 RTX 5070, 6 RTX 5070 Ti, 7 RTX 5080.
     bt = battery 1 (under 5 hrs real use) to 5 (15+ hrs). c = creative power 0-3. b = build quality 1-3.
     flags: t touch, pen, kb great keyboard, po plenty of ports, up upgradeable memory, s great screen, q quiet/fanless, arm = Snapdragon.
     Sources: maker pages, Notebookcheck, Tom's Hardware, Tom's Guide, PCWorld, Macworld, LaptopMedia, Windows Central, bestlaptop.deals. ---- */
  var GS = function (q) { return 'https://www.google.com/search?q=' + encodeURIComponent(q); };
  var LAPTOPS = [
    { id: 'omni5', n: 'HP OmniBook 5 14 (Snapdragon)', mk: 'HP', os: 'win', arm: 1, p: 579, ps: 'About $550 to $600', seen: 'Oct 2025', sz: 14, lb: 2.9, bt: 5, g: 1, mem: 16, c: 0, b: 2, s: 1,
      cfg: 'Snapdragon X Plus, 16 GB memory, 512 GB SSD, OLED screen', cpu: 'Qualcomm Snapdragon X Plus', gpu: 'Built-in graphics', ram: '16 GB memory, 512 GB SSD', scr: '14 in OLED, 1920 x 1200', bat: '16.9 hrs on Wi-Fi (Notebookcheck)',
      url: 'https://www.hp.com/us-en/laptops-and-2-in-1s/omnibook-5-ai-pc.html', note: 'The best laptop we\'ve found under $600: a 14-inch OLED, 16 GB of memory and all-day battery. Some games and older programs don\'t run on Snapdragon.' },
    { id: 'neo', n: 'MacBook Neo (512 GB)', mk: 'Apple', os: 'mac', p: 799, ps: 'About $800', seen: 'Jul 2026', sz: 14, lb: 2.7, bt: 4, g: 1, mem: 8, c: 0, b: 3, q: 1,
      cfg: 'The 512 GB version. The 256 GB one fills up fast for $100 less', cpu: 'Apple A18 Pro', gpu: 'Apple built-in graphics', ram: '8 GB memory (can\'t be upgraded), 512 GB SSD', scr: '13 in, 2408 x 1506', bat: '13.5 hrs of web browsing (Tom\'s Guide)',
      url: 'https://www.apple.com/macbook-neo/', note: 'Great for school, browsing and documents, with Apple\'s build quality. 8 GB of memory is the limit, so it\'s not for editing or heavy multitasking, and the keyboard isn\'t backlit.' },
    { id: 'flip14', n: 'HP OmniBook X Flip 14', mk: 'HP', os: 'win', p: 750, ps: 'About $700 to $1,000', seen: '2026', sz: 14, lb: 3.1, bt: 2, g: 1, mem: 16, c: 0, b: 1, t: 1, pen: 1,
      cfg: 'Core Ultra 5, 16 GB memory, 512 GB SSD', cpu: 'Intel Core Ultra 5 226V', gpu: 'Intel Arc built-in graphics', ram: '16 GB memory, 512 GB SSD', scr: '14 in touchscreen, 1920 x 1200, folds into a tablet', bat: '8.5 hrs of web browsing (Tom\'s Guide)',
      url: 'https://www.hp.com/us-en/shop/pdp/hp-omnibook-x-flip-14-inch-2-in-1-laptop-next-gen-ai-pc-ak4z4av-1', note: 'The best-value 2-in-1: a touchscreen that folds back, with pen support. The keyboard is a bit soft.' },
    { id: 'xps13', n: 'Dell XPS 13 (2026, 16 GB)', mk: 'Dell', os: 'win', p: 999, ps: 'About $1,000', seen: 'Aug 2026', sz: 14, lb: 2.2, bt: 4, g: 0, mem: 16, c: 0, b: 3, s: 1,
      cfg: 'The 16 GB version. The $700 8 GB one slows down with lots of tabs, and memory can\'t be added later', cpu: 'Intel Core 5 320', gpu: 'Intel built-in graphics', ram: '16 GB memory, 512 GB SSD', scr: '13.4 in, 2.5K, 120 Hz', bat: '14.5 hrs of web browsing (Tom\'s Guide, 8 GB model)',
      url: 'https://www.dell.com/en-us/shop/laptop-computers/spd/xps13dx13260', note: 'Excellent build in a very light body. Few ports and no headphone jack.' },
    { id: 'air13', n: 'MacBook Air 13 (M5)', mk: 'Apple', os: 'mac', p: 1299, ps: 'About $1,300', seen: 'Sep 2026', sz: 14, lb: 2.7, bt: 5, g: 1, mem: 16, c: 2, b: 3, kb: 1, s: 1, q: 1,
      cfg: 'M5, 16 GB memory, 512 GB SSD (the base model is the value pick)', cpu: 'Apple M5', gpu: 'Apple built-in graphics', ram: '16 GB memory, 512 GB SSD', scr: '13.6 in, 2560 x 1664', bat: '18 hrs of video (Macworld)',
      url: 'https://www.apple.com/macbook-air/', note: 'Silent with no fan, light, superb build and all-day battery. Handles photo editing well. Games are limited on a Mac.' },
    { id: 'air15', n: 'MacBook Air 15 (M5)', mk: 'Apple', os: 'mac', p: 1349, ps: 'About $1,350 to $1,500', seen: 'Sep 2026', sz: 16, lb: 3.3, bt: 5, g: 1, mem: 16, c: 2, b: 3, kb: 1, s: 1, q: 1,
      cfg: 'M5, 16 GB memory, 512 GB SSD. Often on sale for little more than the 13-inch', cpu: 'Apple M5', gpu: 'Apple built-in graphics', ram: '16 GB memory, 512 GB SSD', scr: '15.3 in, 2880 x 1864', bat: 'About 18 hrs of video (Apple-class battery, 66.5 Wh)',
      url: 'https://www.apple.com/macbook-air/', note: 'A bigger screen that stays silent and light, often for barely more than the 13-inch.' },
    { id: 'a14', n: 'ASUS Zenbook A14 (2026)', mk: 'ASUS', os: 'win', arm: 1, p: 1349, ps: 'About $1,350', seen: 'Jul 2026', sz: 14, lb: 2.2, bt: 5, g: 1, mem: 16, c: 0, b: 3, s: 1,
      cfg: 'Snapdragon X2 Elite, 16 GB memory, 512 GB SSD', cpu: 'Qualcomm Snapdragon X2 Elite', gpu: 'Built-in graphics', ram: '16 GB memory, 512 GB SSD', scr: '14 in OLED, 1920 x 1200', bat: '23.5 hrs of video (Windows Central)',
      url: 'https://www.asus.com/us/laptops/for-home/zenbook/asus-zenbook-a14-ux3407/', note: 'The longest battery life we recommend, in a 2.2 lb body. Some games and older programs don\'t run on Snapdragon.' },
    { id: 'zs16', n: 'ASUS Zenbook S16 (2026)', mk: 'ASUS', os: 'win', p: 1499, ps: 'About $1,500 on sale (list $1,800)', seen: 'Jun 2026', sz: 16, lb: 3.3, bt: 4, g: 2, mem: 32, c: 1, b: 3, t: 1, s: 1,
      cfg: 'Ryzen AI 9 465, 32 GB memory, 1 TB SSD', cpu: 'AMD Ryzen AI 9 465', gpu: 'AMD Radeon built-in graphics', ram: '32 GB memory, 1 TB SSD', scr: '16 in OLED touchscreen, 2880 x 1800, 120 Hz', bat: '83 Wh battery',
      url: 'https://www.asus.com/us/laptops/for-home/zenbook/asus-zenbook-s-16-um5606/', note: 'A thin, light 16-inch with a 120 Hz OLED and 32 GB of memory. Ideal for school, work and light photo editing. Not for gaming.' },
    { id: 'surf', n: 'Microsoft Surface Laptop 13.8 (2026)', mk: 'Microsoft', os: 'win', arm: 1, p: 1499, ps: 'About $1,500 on sale (list $1,700)', seen: 'Oct 2026', sz: 14, lb: 2.95, bt: 4, g: 1, mem: 16, c: 0, b: 2, kb: 1, t: 1, s: 1,
      cfg: 'Snapdragon X2 Elite, 16 GB memory, 512 GB SSD', cpu: 'Qualcomm Snapdragon X2 Elite', gpu: 'Built-in graphics', ram: '16 GB memory, 512 GB SSD', scr: '13.8 in touchscreen, 120 Hz', bat: 'Not independently tested yet',
      url: 'https://www.microsoft.com/en-us/surface/devices/surface-laptop', note: 'A great keyboard and touchscreen in a clean, simple design. Some games and older programs don\'t run on Snapdragon.' },
    { id: 'gram17', n: 'LG Gram 17', mk: 'LG', os: 'win', p: 1479, ps: 'About $1,480 to $1,700', seen: 'Dec 2025', sz: 18, lb: 3.2, bt: 5, g: 1, mem: 16, c: 0, b: 1, t: 1,
      cfg: 'Core Ultra 7, 16 GB memory, 1 TB SSD', cpu: 'Intel Core Ultra 7 256V', gpu: 'Intel Arc built-in graphics', ram: '16 GB memory, 1 TB SSD', scr: '17 in touchscreen, 2560 x 1600', bat: '15.5 hrs of web browsing (Tom\'s Guide)',
      url: 'https://www.lg.com/us/laptops/lg-17z90tl-g.aub5u1-gram-laptop', note: 'A 17-inch screen that weighs only 3.2 lb with all-day battery. The body feels a bit plasticky.' },
    { id: 'mbp14', n: 'MacBook Pro 14 (M5)', mk: 'Apple', os: 'mac', p: 1999, ps: 'About $2,000', seen: 'Sep 2026', sz: 14, lb: 3.4, bt: 5, g: 2, mem: 16, c: 3, b: 3, kb: 1, po: 1, s: 1,
      cfg: 'M5, 16 GB memory, 1 TB SSD. Only worth it over an Air for long editing sessions', cpu: 'Apple M5', gpu: 'Apple built-in graphics', ram: '16 GB memory, 1 TB SSD', scr: '14.2 in mini-LED, 3024 x 1964, 120 Hz', bat: '18 hrs of web browsing (Tom\'s Guide)',
      url: 'https://www.apple.com/macbook-pro/', note: 'A brighter 120 Hz screen, HDMI and SD card slot, and fans that keep it fast through long video exports.' },
    { id: 'yoga9', n: 'Lenovo Yoga 9i 2-in-1 Aura Edition', mk: 'Lenovo', os: 'win', p: 1999, ps: 'About $2,000 on sale', seen: 'Oct 2026', sz: 14, lb: 2.9, bt: 4, g: 2, mem: 16, c: 1, b: 3, t: 1, pen: 1, s: 1,
      cfg: 'Core Ultra 9, OLED touchscreen', cpu: 'Intel Core Ultra 9 386H', gpu: 'Intel Arc built-in graphics', ram: '16 GB or more, 1 TB SSD', scr: '14 in OLED touchscreen, 2880 x 1800, 120 Hz', bat: '12.8 hrs of web browsing (Tom\'s Guide)',
      url: 'https://www.lenovo.com/us/en/p/laptops/yoga/yoga-2-in-1-series/lenovo-yoga-9i-2-in-1-gen-11-aura-edition-14-inch-intel/len101y0074', note: 'A premium 2-in-1 with a 120 Hz OLED and pen support.' },
    { id: 'proart', n: 'ASUS ProArt P16', mk: 'ASUS', os: 'win', cr: 1, p: 2500, ps: 'About $2,500', seen: '2025 launch price', sz: 16, lb: 4.1, bt: 3, g: 5, mem: 32, c: 3, b: 3, t: 1, s: 1, po: 1,
      cfg: 'Ryzen AI 9 HX 370, RTX 5070, 32 GB memory', cpu: 'AMD Ryzen AI 9 HX 370', gpu: 'NVIDIA RTX 5070', ram: '32 GB memory', scr: '16 in OLED touchscreen, 2880 x 1800', bat: '90 Wh battery',
      url: 'https://www.asus.com/us/laptops/for-creators/proart/proart-p16-h7606/', note: 'Built for color-accurate photo and video work, with a real graphics card for exports and 3D.' },
    // gaming
    { id: 'loq15', n: 'Lenovo LOQ 15 (RTX 5050)', mk: 'Lenovo', os: 'win', p: 700, ps: 'About $650 to $800', seen: 'Nov 2025 to Jun 2026', sz: 16, lb: 5.1, bt: 1, g: 3, mem: 16, c: 1, b: 2, po: 1, up: 1,
      cfg: 'Core i5-13450HX, RTX 5050, 16 GB memory, 512 GB SSD. Skip the "LOQ Essential": its graphics card runs at much lower power', cpu: 'Intel Core i5-13450HX', gpu: 'NVIDIA RTX 5050 (8 GB)', ram: '16 GB memory (upgradeable), 512 GB SSD', scr: '15.6 in, 1920 x 1080, 144 Hz', bat: 'Short away from the plug, like most gaming laptops',
      url: 'https://www.lenovo.com/us/en/p/laptops/loq-laptops/loq-15-series/lenovo-loq-15irx10/len101q0011', note: 'The best-value way into real laptop gaming. Fortnite, Valorant and Apex run well at 1080p, DLSS covers heavier games, and it\'s easy to upgrade.' },
    { id: 'tuff16', n: 'ASUS TUF Gaming F16 (RTX 5050)', mk: 'ASUS', os: 'win', p: 899, ps: 'About $900 on sale (list $1,300)', seen: 'Apr 2026', sz: 16, lb: 4.9, bt: 1, g: 3, mem: 16, c: 1, b: 2, po: 1, up: 1,
      cfg: 'Core i5-13450HX, RTX 5050, 16 GB memory, 512 GB SSD. Only worth it on sale', cpu: 'Intel Core i5-13450HX', gpu: 'NVIDIA RTX 5050 (8 GB)', ram: '16 GB memory (upgradeable), 512 GB SSD', scr: '16 in, 1920 x 1200, 165 Hz', bat: 'Short away from the plug, like most gaming laptops',
      url: 'https://www.asus.com/us/laptops/for-gaming/tuf-gaming/asus-tuf-gaming-f16-2025/', note: 'A tough, simple gaming laptop with a bigger 16-inch screen.' },
    { id: 'leg5', n: 'Lenovo Legion 5i (Gen 10, RTX 5070)', mk: 'Lenovo', os: 'win', p: 1250, ps: 'About $1,200 to $1,300 on sale', seen: 'Mar 2026', sz: 16, lb: 4.2, bt: 1, g: 5, mem: 16, c: 2, b: 3, po: 1, up: 1, s: 1,
      cfg: 'Model 83F00006US: Core Ultra 7 255HX, RTX 5070 at 115 W, 16 GB, 1 TB, OLED. It ships with one 16 GB stick (single-channel); we can add a second for dual-channel and 32 GB', cpu: 'Intel Core Ultra 7 255HX', gpu: 'NVIDIA RTX 5070 (8 GB, 115 W)', ram: '16 GB, single stick (upgradeable), 1 TB SSD', scr: '15.1 in OLED, 2560 x 1600, 165 Hz', bat: 'About 4 to 5 hrs of video (LaptopMedia, PCWorld)',
      url: 'https://www.lenovo.com/us/en/p/laptops/legion-laptops/legion-series/lenovo-legion-5i-gen-10-15-inch-intel/83f00006us', note: 'The best gaming value we\'ve found: an RTX 5070 at 115 W, a 165 Hz OLED and solid Legion build quality and cooling.' },
    { id: 'leg7', n: 'Lenovo Legion 7i (Gen 10)', mk: 'Lenovo', os: 'win', p: 1400, ps: 'About $1,250 to $1,500', seen: 'Mar 2026', sz: 16, lb: 4.36, bt: 2, g: 4, mem: 32, c: 2, b: 3, po: 1, up: 1, s: 1,
      cfg: 'Core Ultra 7 255HX, RTX 5060 at 115 W, 32 GB memory, 1 TB SSD, OLED', cpu: 'Intel Core Ultra 7 255HX', gpu: 'NVIDIA RTX 5060 (8 GB, 115 W)', ram: '32 GB memory (upgradeable), 1 TB SSD', scr: '16 in OLED, 2560 x 1600, 165 Hz', bat: 'Just under 8 hrs of video (TechRadar)',
      url: 'https://www.lenovo.com/us/en/p/laptops/legion-laptops/legion-series/lenovo-legion-7i-gen-10-16-inch-intel/len101g0044', note: 'A slimmer, lighter Legion with an OLED screen, an SD card reader and 32 GB of memory. Good for gaming and editing. Runs hot in its fastest mode.' },
    { id: 'leg5x', n: 'Lenovo Legion 5i (Gen 10, 32 GB)', mk: 'Lenovo', os: 'win', p: 1599, ps: 'About $1,600', seen: 'Jun 2026', sz: 16, lb: 4.2, bt: 1, g: 5, mem: 32, c: 2, b: 3, po: 1, up: 1, s: 1,
      cfg: 'Core Ultra 9 275HX, RTX 5070, 32 GB memory, 1 TB SSD, OLED', cpu: 'Intel Core Ultra 9 275HX', gpu: 'NVIDIA RTX 5070 (8 GB)', ram: '32 GB memory (upgradeable), 1 TB SSD', scr: '15.1 in OLED, 2560 x 1600, 165 Hz', bat: 'About 4 to 5 hrs of video (LaptopMedia, PCWorld)',
      url: 'https://www.lenovo.com/us/en/p/laptops/legion-laptops/legion-series/lenovo-legion-5i-gen-10-15-inch-intel/83f00006us', note: 'Our top value gaming pick with a faster processor and 32 GB of memory already in it.' },
    { id: 'strix16', n: 'ASUS ROG Strix G16 (RTX 5070 Ti)', mk: 'ASUS', os: 'win', p: 1750, ps: 'About $1,750 on sale (list $2,300)', seen: 'Sep 2026', sz: 16, lb: 5.2, bt: 1, g: 6, mem: 16, c: 2, b: 2, po: 1, up: 1,
      cfg: 'Ryzen 9 8940HX, RTX 5070 Ti, 16 GB memory, 1 TB SSD. The screen is 1080p-class and not very bright', cpu: 'AMD Ryzen 9 8940HX', gpu: 'NVIDIA RTX 5070 Ti (12 GB)', ram: '16 GB memory (upgradeable), 1 TB SSD', scr: '16 in, 1920 x 1200, 165 Hz', bat: '3 to 4 hrs of everyday use (PCWorld)',
      url: 'https://rog.asus.com/us/laptops/rog-strix/rog-strix-g16-2025-g614/', note: 'RTX 5070 Ti power with excellent cooling that holds its speed under long gaming sessions. Bulky and a bit plasticky.' },
    { id: 'g14', n: 'ASUS ROG Zephyrus G14 (2025)', mk: 'ASUS', os: 'win', p: 2250, ps: 'Last seen about $2,050 to $2,500', seen: 'Jul 2025', sz: 14, lb: 3.4, bt: 3, g: 6, mem: 32, c: 3, b: 3, s: 1, po: 1,
      cfg: 'The 2025 model (Ryzen AI 9 HX 370, RTX 5070 Ti, 32 GB, 1 TB). The 2026 version costs over $1,000 more for little gain', cpu: 'AMD Ryzen AI 9 HX 370', gpu: 'NVIDIA RTX 5070 Ti (12 GB)', ram: '32 GB memory (can\'t be upgraded), 1 TB SSD', scr: '14 in OLED, 2880 x 1800, 120 Hz', bat: '73 Wh battery',
      url: 'https://rog.asus.com/us/laptops/rog-zephyrus/rog-zephyrus-g14-2025/', note: 'An RTX 5070 Ti and a 120 Hz OLED in a 3.4 lb aluminum body you can carry every day.' },
    { id: 'strix16x', n: 'ASUS ROG Strix G16 (Ryzen 9 9955HX3D)', mk: 'ASUS', os: 'win', x3d: 1, p: 2250, ps: 'About $2,250', seen: '2026', sz: 16, lb: 5.2, bt: 1, g: 6, mem: 32, c: 2, b: 2, po: 1, up: 1,
      cfg: 'Ryzen 9 9955HX3D, RTX 5070 Ti at 140 W, 32 GB memory, 1 TB SSD, 240 Hz screen', cpu: 'AMD Ryzen 9 9955HX3D', gpu: 'NVIDIA RTX 5070 Ti (12 GB, 140 W)', ram: '32 GB memory (upgradeable), 1 TB SSD', scr: '16 in, 2560 x 1600, 240 Hz', bat: 'About 6 hrs of video (PCWorld)',
      url: 'https://rog.asus.com/us/laptops/rog-strix/rog-strix-g16-2025-g614/', note: 'The X3D chip that leads laptop gaming, paired with a full 140 W RTX 5070 Ti. Great for 240 Hz competitive games.' },
    { id: 'pro7', n: 'Lenovo Legion Pro 7i (Gen 10, RTX 5080)', mk: 'Lenovo', os: 'win', p: 2550, ps: 'About $2,450 to $2,650', seen: 'May to Jul 2026', sz: 16, lb: 5.9, bt: 1, g: 7, mem: 32, c: 3, b: 3, po: 1, up: 1, s: 1,
      cfg: 'Model 83F50012US: Core Ultra 9 275HX, RTX 5080 at 175 W, 32 GB memory, 1 TB SSD, 240 Hz OLED', cpu: 'Intel Core Ultra 9 275HX', gpu: 'NVIDIA RTX 5080 (16 GB, 175 W)', ram: '32 GB memory (upgradeable), 1 TB SSD', scr: '16 in OLED, 2560 x 1600, 240 Hz', bat: '4 hrs 37 min (Tom\'s Hardware)',
      url: 'https://www.lenovo.com/us/en/p/laptops/legion-laptops/legion-pro-series/legion-pro-7i-gen-10-16-inch-intel/len101g0039', note: 'Our fastest laptop pick: a full-power 175 W RTX 5080, a 240 Hz OLED, quiet fans for its class and premium build. Best on a desk.' },
    { id: 'scar18', n: 'ASUS ROG Strix SCAR 18 (2026, RTX 5080)', mk: 'ASUS', os: 'win', p: 4200, ps: 'About $4,150 to $4,300', seen: 'Oct 2026', sz: 18, lb: 8.2, bt: 1, g: 7, mem: 32, c: 3, b: 3, po: 1, up: 1, s: 1,
      cfg: 'Core Ultra 9 290HX Plus, RTX 5080, 32 GB memory, 1 TB SSD, 4K mini-LED', cpu: 'Intel Core Ultra 9 290HX Plus', gpu: 'NVIDIA RTX 5080 (16 GB)', ram: '32 GB memory (upgradeable), 1 TB SSD', scr: '18 in mini-LED, 3840 x 2400, 240 Hz', bat: 'Short away from the plug',
      url: 'https://rog.asus.com/us/laptops/rog-strix/rog-strix-scar-18-2026/', note: 'A huge 18-inch desktop replacement with a 4K 240 Hz mini-LED screen. Heavy at 8.2 lb, and loud at full power.' }
  ];
  var Q = { omni5: 'HP OmniBook 5 14 Snapdragon X Plus OLED', neo: 'MacBook Neo 512GB', flip14: 'HP OmniBook X Flip 14 Core Ultra 5 226V', xps13: 'Dell XPS 13 2026 16GB', air13: 'MacBook Air 13 M5 16GB 512GB', air15: 'MacBook Air 15 M5 16GB 512GB',
    a14: 'ASUS Zenbook A14 Snapdragon X2 Elite', zs16: 'ASUS Zenbook S16 Ryzen AI 9 465 32GB', surf: 'Surface Laptop 13.8 Snapdragon X2 Elite', gram17: 'LG Gram 17 Core Ultra 7 256V', mbp14: 'MacBook Pro 14 M5 16GB 1TB',
    yoga9: 'Lenovo Yoga 9i 2-in-1 Aura Edition', proart: 'ASUS ProArt P16 RTX 5070', loq15: 'Lenovo LOQ 15 RTX 5050 i5-13450HX', tuff16: 'ASUS TUF Gaming F16 RTX 5050', leg5: '83F00006US',
    leg7: 'Lenovo Legion 7i Gen 10 RTX 5060 OLED', leg5x: 'Lenovo Legion 5i Gen 10 Ultra 9 275HX RTX 5070 32GB', strix16: 'ASUS ROG Strix G16 Ryzen 9 8940HX RTX 5070 Ti', g14: 'ASUS ROG Zephyrus G14 GA403 RTX 5070 Ti',
    strix16x: 'ASUS ROG Strix G16 9955HX3D RTX 5070 Ti', pro7: '83F50012US', scar18: 'ASUS ROG Strix SCAR 18 2026 RTX 5080' };
  var DOM = { HP: 'hp.com', Apple: 'apple.com', Dell: 'dell.com', ASUS: 'asus.com', Microsoft: 'microsoft.com', LG: 'lg.com', Lenovo: 'lenovo.com' };
  function priceBtns(L) {
    var q = Q[L.id] || L.n, e = encodeURIComponent(q);
    return '<p class="lp-price-h">Check today\'s price</p><div class="lp-price-btns">' +
      '<a class="btn btn-quiet" href="https://www.amazon.com/s?k=' + e + '" target="_blank" rel="noopener">Amazon</a>' +
      '<a class="btn btn-quiet" href="https://www.bestbuy.com/site/searchpage.jsp?st=' + e + '" target="_blank" rel="noopener">Best Buy</a>' +
      '<a class="btn btn-quiet" href="' + L.url + '" target="_blank" rel="noopener">Manufacturer website</a></div>';
  }
  var BR = [[0, 600], [600, 900], [900, 1300], [1300, 2000], [2000, 99999]];
  var step = 0, N = 6, PICK = null, ALT = null, NOFIT = '';

  /* ---- scoring ---- */
  function appG() { return maxApp('g'); }
  function gNeed() { return !gaming() ? 0 : Math.max({ light: 3, online: 3, heavy: 5 }[A.gtier] || 3, appG()); }
  function needWin() { return gaming() || anyApp('win') || anyApp('game'); }
  function needMac() { return anyApp('mac'); }
  function armRisk() { return gaming() || anyApp('game') || anyApp('arm') || A.extra.length > 0; }
  function score(L) {
    var s = 0, b = bud(), sz = inches(), need = gNeed();
    if (L.os === 'mac' && needWin()) return -999;
    if (L.os !== 'mac' && needMac() && !needWin()) return -999;
    if (gaming() && L.g < 3) return -999;
    if (gaming()) { if (L.g < need) s -= (need - L.g) * (need - L.g >= 2 ? 30 : 20); else s += 12 + Math.min(L.g - need, 2) * (A.gtier === 'heavy' ? 7 : 3) + (A.gtier === 'online' && L.x3d ? 10 : 0); }
    else if (L.g >= 3) s -= (uses('Photos, video or design') || maxApp('c') >= 2 ? 14 : 45) + (L.g - 3) * 5;
    if (b >= 0) { var r = BR[b]; if (L.p >= r[0] && L.p <= r[1] + 50) s += 30; else if (L.p < r[0]) s += 26 - (r[0] - L.p) / (gaming() ? 50 : 150); else s -= 12 + (L.p - r[1]) / 25; }
    else s -= Math.abs(L.p - 1200) / 80;
    s += (L.b - 2) * 5;
    if (L.cr && gaming() && !uses('Photos, video or design')) s -= 25;
    var bw = gaming() ? 0.4 : 1;
    if (uses('Everyday and streaming')) s += L.bt * 2 * bw - Math.max(0, L.lb - 4) * 4;
    if (uses('School')) s += L.bt * 3 * bw - Math.max(0, L.lb - 3.5) * 8;
    if (uses('Work and video calls')) s += (L.kb ? 8 : 0) + L.bt * 2 + (L.mem >= 16 ? 4 : -12);
    if (uses('Photos, video or design')) s += L.c * 8 + (L.s ? 6 : 0) + (L.mem >= 16 ? 0 : -16);
    if (uses('Coding or tech work')) s += (L.mem >= 32 ? 10 : L.mem >= 16 ? 4 : -16) + (L.kb ? 5 : 0);
    var mneed = maxApp('mem'); if (mneed && L.mem < mneed) s -= (mneed - L.mem) >= 16 ? 18 : 12;
    var cneed = maxApp('c'); if (cneed && L.c < cneed) s -= (cneed - L.c) * 10;
    if (A.where === 'Carried every day') s -= Math.max(0, L.lb - 3.6) * 14;
    else if (A.where === 'Moves around the house') s -= Math.max(0, L.lb - 5.5) * 6;
    var want = { 'Smaller (13 to 14 in)': 14, 'Middle (15 to 16 in)': 16, 'Big (17 to 18 in)': 18 }[A.size];
    if (want && L.sz !== want && !RELAX) return -999;
    if (sz) s -= Math.abs(L.sz - sz) / 2 * (want ? 16 : 10);
    if (A.bat === 'A full day (10+ hours)') s += (L.bt >= 4 ? 16 : L.bt <= 2 ? -25 : 0) * bw;
    else if (A.bat === 'Most of a day') s += (L.bt >= 3 ? 6 : L.bt <= 1 ? -15 : 0) * bw;
    if (has('Really nice screen')) s += L.s ? 10 : -4;
    if (has('Quiet and cool')) s += (L.q ? 12 : 0) - (L.g >= 4 ? 8 : 0);
    if (has('Great keyboard')) s += L.kb ? 10 : 0;
    if (has('Plugs for my stuff')) s += L.po ? 10 : -4;
    if (has('Touchscreen or pen')) s += (L.t ? 10 : -10) + (L.pen ? 8 : 0);
    if (has('Lots of tabs and apps open')) s += L.mem >= 32 ? 10 : L.mem >= 16 ? 2 : -18;
    if (has('Can upgrade or repair later')) s += L.up ? 12 : 0;
    if (L.arm && armRisk()) s -= 60;
    return s;
  }
  var RELAX = false, SIZEMISS = false;
  function ranked() { return LAPTOPS.map(function (L) { return { L: L, s: score(L) }; }).filter(function (x) { return x.s > -500; }).sort(function (a, b) { return b.s - a.s; }); }
  function pick() {
    RELAX = false; SIZEMISS = false; var R = ranked(); ALT = null; NOFIT = '';
    if (!R.length && A.size && A.size !== 'Let us pick') { RELAX = true; R = ranked(); RELAX = false; SIZEMISS = !!R.length; }
    if (!R.length) { NOFIT = 'Nothing on our list fits that mix of programs.'; return null; }
    var L = R[0].L, b = bud();
    // one alternative, chosen for the most useful trade-off
    var rest = R.slice(1, 8).filter(function (x) { return x.s > R[0].s - 30; }), alt = null;
    rest.some(function (x) { if (L.lb - x.L.lb >= 1) { alt = { L: x.L, why: 'Want it lighter? The ' + x.L.n + ' is ' + x.L.lb + ' lb.' }; return true; } });
    if (!alt) rest.some(function (x) { if (L.p - x.L.p >= 200) { alt = { L: x.L, why: 'Want to spend less? The ' + x.L.n + ' is ' + x.L.ps.toLowerCase() + '.' }; return true; } });
    if (!alt) rest.some(function (x) { if (x.L.os !== L.os) { alt = { L: x.L, why: (x.L.os === 'mac' ? 'Prefer a Mac? ' : 'Prefer Windows? ') + 'The ' + x.L.n + ' fits too.' }; return true; } });
    if (!alt && gaming()) rest.some(function (x) { if (x.L.g > L.g && x.L.p - L.p <= 500) { alt = { L: x.L, why: 'More graphics power for more money: the ' + x.L.n + ', ' + x.L.ps.toLowerCase() + '.' }; return true; } });
    if (!alt && rest.length) alt = { L: rest[0].L, why: 'Also a great fit: the ' + rest[0].L.n + '.' };
    ALT = alt;
    // be honest when nothing good fits
    if (gaming() && b === 0) NOFIT = 'There are no good gaming laptops under $600 right now. The cheapest one worth buying, with a dedicated GPU, starts around $650 to $800. This is the closest pick we\'d actually buy.';
    else if (b >= 0 && L.p > BR[b][1] + 150) NOFIT = 'Nothing we\'d recommend does this well in your budget. This is the closest pick, but it costs more.';
    if (SIZEMISS) NOFIT = 'We don\'t have a ' + A.size.replace(/^\w+ \((.*)\)$/, '$1').replace(' in', '-inch') + ' laptop we\'d recommend for these answers, so this is the closest fit in another size.';
    return L;
  }
  var GPUN = function (L) { return L.gpu.replace(/ \(.*\)/, '').replace(/^NVIDIA /, ''); };
  function fitRows(L) {
    var r = [], b = bud(), add = function (ok, q, a) { r.push([ok, q, a]); };
    if (gaming()) add(L.g >= gNeed(), GT[A.gtier].replace(/^./, function (c) { return c.toUpperCase(); }), L.g >= gNeed() ? GPUN(L) + (L.g >= 5 ? ': high settings at 1080p and 1440p' : ': smooth at 1080p, DLSS for heavier games') : GPUN(L) + ' is below what these games want at high settings');
    if (uses('Photos, video or design')) add(L.c >= 2, 'Photo and video editing', L.c >= 2 ? 'Strong for editing: ' + (L.mem >= 32 ? '32 GB' : L.mem + ' GB') + ' memory' + (L.s ? ', color-rich screen' : '') : 'Fine for light edits; big video projects will be slow');
    if (uses('Coding or tech work')) add(L.mem >= 16, 'Programming', L.mem + ' GB memory' + (L.mem >= 32 ? ', plenty for containers and VMs' : L.mem >= 16 ? ', fine for most dev work' : ', tight for an IDE plus a browser'));
    if (uses('Work and video calls')) add(L.mem >= 16, 'Work', (L.kb ? 'Great keyboard, ' : '') + L.mem + ' GB memory for lots of tabs');
    if (uses('School') || uses('Everyday and streaming')) add(L.mem >= 8, uses('School') ? 'School' : 'Everyday use', 'Quick for browsing, docs and video' + (L.mem < 16 ? ' (8 GB is the limit; avoid heavy multitasking)' : ''));
    var want = { 'Smaller (13 to 14 in)': 14, 'Middle (15 to 16 in)': 16, 'Big (17 to 18 in)': 18 }[A.size];
    add(!want || L.sz === want, want ? A.size.replace(/^\w+ \((.*)\)$/, '$1') + ' screen' : 'Screen size', L.scr.split(',')[0] + (want && L.sz !== want ? ', not the size you asked for' : ''));
    if (A.where === 'Carried every day') add(L.lb <= 3.6, 'Carried every day', L.lb + ' lb' + (L.lb <= 3.6 ? ', easy to carry' : L.lb <= 4.6 ? ', a bit heavy for daily carry' : ', heavy for daily carry'));
    else if (A.where === 'Moves around the house') add(L.lb <= 5.5, 'Around the house', L.lb + ' lb');
    else if (A.where) add(true, 'Mostly on a desk', L.lb + ' lb, and it\'ll mostly stay plugged in');
    if (A.bat) { var bok = A.bat === 'A few hours' || (A.bat === 'Most of a day' ? L.bt >= 3 : L.bt >= 4); add(bok, 'Battery: ' + A.bat.toLowerCase(), L.bat + (bok ? '' : '. Shorter than you asked for')); }
    var P = { 'Really nice screen': function () { return [!!L.s, L.s ? L.scr.split(',').slice(0, 2).join(',') : 'A standard screen, not its strong point']; },
      'Quiet and cool': function () { return [!!L.q || L.g < 3, L.q ? 'No fan noise' : L.g < 3 ? 'Runs cool and quiet in everyday use' : 'Fans get loud while gaming, like every gaming laptop']; },
      'Great keyboard': function () { return [!!L.kb, L.kb ? 'One of the better keyboards' : 'A decent keyboard, not a standout']; },
      'Good webcam and mic': function () { return ['warn', 'Camera and mic quality not confirmed for this model']; },
      'Plugs for my stuff': function () { return [!!L.po, L.po ? 'Plenty of ports' : 'Few ports; you may want a USB-C hub']; },
      'Touchscreen or pen': function () { return [!!L.t, L.t ? (L.pen ? 'Touchscreen with pen support' : 'Touchscreen') : 'No touchscreen']; },
      'Lots of tabs and apps open': function () { return [L.mem >= 16, L.mem + ' GB memory']; },
      'Can upgrade or repair later': function () { return [!!L.up, L.up ? 'Memory and storage can be upgraded' : 'Memory is built in and can\'t be upgraded']; } };
    A.pri.forEach(function (k) { var x = P[k](); add(x[0], PRI.filter(function (p) { return p[0] === k; })[0][2], x[1]); });
    var hard = picked().filter(function (a) { return a.g && a.g > L.g; });
    if (A.apps.length) add(!hard.length, 'Runs your programs', hard.length ? hard.map(function (a) { return a.n; }).join(', ') + ' will need lower settings' : 'Everything you listed runs on it');
    if (A.extra.length) add('warn', 'Not on our list', 'We couldn\'t check ' + A.extra.join(', ') + '. Ask Ben to confirm');
    if (b >= 0) add(L.p <= BR[b][1] + 50, 'Budget: ' + A.budget, L.ps + (L.p < BR[b][0] - 300 && !gaming() ? '. You don\'t need to spend more for this' : L.p > BR[b][1] + 50 ? '. Over your range' : ''));
    return r;
  }
  function fitHTML(L) {
    return '<ul class="lp-fit">' + fitRows(L).map(function (x) { var ok = x[0] === true; return '<li class="' + (ok ? 'ok' : 'tw') + '"><span class="lp-fi" aria-label="' + (ok ? 'Fits' : 'Trade-off') + '">' + (ok ? '✓' : '!') + '</span><b>' + esc(x[1]) + '</b><span>' + esc(x[2]) + '</span></li>'; }).join('') + '</ul>';
  }
  function cmpHTML(L, B) {
    var rows = [['Price', L.ps, B.ps], ['Screen', L.scr, B.scr], ['Processor', L.cpu, B.cpu], ['Graphics', L.gpu, B.gpu], ['Memory', L.ram, B.ram], ['Weight', L.lb + ' lb', B.lb + ' lb'], ['Battery', L.bat, B.bat]];
    return '<div class="lp-cmpw"><table class="lp-cmp"><thead><tr><th></th><th>Ben\'s pick</th><th>Alternative</th></tr><tr><th></th><td><b>' + esc(L.n) + '</b></td><td><b>' + esc(B.n) + '</b></td></tr></thead><tbody>' +
      rows.map(function (r) { return '<tr><th>' + r[0] + '</th><td>' + esc(r[1]) + '</td><td>' + esc(r[2]) + '</td></tr>'; }).join('') + '</tbody></table></div>';
  }
  function reasons(L) {
    var r = [], b = bud();
    if (b >= 0 && L.p <= BR[b][1] + 50) r.push('Fits your ' + A.budget.replace('Under', 'under') + ' budget.');
    if (gaming()) r.push(L.g >= 6 ? 'Its ' + L.gpu.replace(/ \(.*\)/, '') + ' handles ' + GT[A.gtier] + ' at high settings, even on a sharper screen.' : 'Its ' + L.gpu.replace(/ \(.*\)/, '') + ' graphics card runs ' + GT[A.gtier] + ' smoothly' + (L.g >= 5 ? ' at high settings.' : ' at 1080p.'));
    var hard = picked().filter(function (a) { return a.game && a.g >= 5; });
    if (hard.length && L.g >= 5) r.push('Ready for ' + hard[0].n + '.');
    if (A.where === 'Carried every day') r.push(L.lb <= 3.5 ? 'Light enough to carry every day at ' + L.lb + ' lb.' : 'At ' + L.lb + ' lb it\'s on the heavy side to carry every day.');
    if (uses('Photos, video or design') && L.s) r.push('A sharp, color-rich screen for editing.');
    if (A.bat === 'A full day (10+ hours)' && L.bt >= 4) r.push('Long battery life.');
    if (A.bat !== 'A few hours' && L.bt <= 2) r.push('Battery life is short, so keep the charger handy.');
    if (has('Touchscreen or pen')) r.push(L.t ? (L.pen ? 'Touchscreen with pen support.' : 'Has a touchscreen.') : 'No touchscreen on this one.');
    if (has('Can upgrade or repair later') && L.up) r.push('You can add memory and storage later.');
    if (b >= 0 && b < 5 && L.p < BR[b][0] - 300 && !gaming()) r.push('You don\'t need to spend more for what you do. Keep the difference.');
    if (L.b === 3) r.push('Excellent build quality.');
    if (L.os === 'mac') r.push('Nothing you run needs Windows, so a Mac fits well. Heads-up: our own setup and repair services are Windows only.');
    return r.slice(0, 5);
  }
  function summary() {
    var p = ['Use: ' + useText()];
    if (A.where) p.push('Carry: ' + WHERE.filter(function (w) { return w[0] === A.where; })[0][2].toLowerCase());
    if (A.size && A.size !== 'Let us pick') p.push('Size: ' + A.size);
    if (A.bat) p.push('Battery: ' + A.bat.toLowerCase());
    if (A.pri.length) p.push('Wants: ' + A.pri.join(', ').toLowerCase());
    var run = A.apps.concat(A.extra); if (run.length) p.push('Runs: ' + run.join(', '));
    if (A.budget) p.push('Budget: ' + A.budget);
    if (PICK) p.push('Finder pick: ' + PICK.n);
    return p.join('. ') + '.';
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function ico(n) { return '<span class="ico-tile"><svg class="ico" aria-hidden="true"><use href="#i-' + n + '"/></svg></span>'; }
  function isSel(name, val) { return Array.isArray(A[name]) ? A[name].indexOf(val) >= 0 : A[name] === val; }
  function card(name, val, title, hint, icon) {
    var multi = Array.isArray(A[name]), sel = isSel(name, val), full = multi && MAX[name] && !sel && A[name].length >= MAX[name];
    return '<label class="qcard' + (sel ? ' sel' : '') + (full ? ' is-full' : '') + '"' + (full ? ' aria-disabled="true"' : '') + '><input type="' + (multi ? 'checkbox' : 'radio') + '" name="' + name + '" value="' + esc(val) + '"' + (sel ? ' checked' : '') + ' />' + (icon ? ico(icon) : '') + '<span class="qc-t">' + esc(title) + '</span>' + (hint ? '<span class="qc-h">' + esc(hint) + '</span>' : '') + '</label>';
  }
  function chips(name, opts) { return '<div class="qchips" id="lq-chips">' + opts.map(function (o) { var s = isSel(name, o); return '<label class="' + (s ? 'sel' : '') + '"><input type="checkbox" name="' + name + '" value="' + esc(o) + '"' + (s ? ' checked' : '') + ' /><span>' + esc(o) + '</span></label>'; }).join('') + '</div>'; }
  function seg(name, opts) { return '<div class="qseg" role="radiogroup">' + opts.map(function (o) { var s = A[name] === o; return '<label class="' + (s ? 'sel' : '') + '"><input type="radio" name="' + name + '" value="' + esc(o) + '"' + (s ? ' checked' : '') + ' /><span>' + esc(o) + '</span></label>'; }).join('') + '</div>'; }
  function uses(u) { return A.uses.indexOf(u) >= 0; }
  function gaming() { return uses('Gaming'); }
  function has(p) { return A.pri.indexOf(p) >= 0; }
  function mac() { return !!(PICK && PICK.os === 'mac'); }
  function useText() { return A.uses.map(function (u) { return USES.filter(function (x) { return x[0] === u; })[0][3]; }).join(' + ') + (gaming() && A.gtier ? ' (' + GT[A.gtier] + ')' : ''); }
  function countText(name) { var n = A[name].length, m = MAX[name]; return n >= m ? n + ' of ' + m + ' picked. Tap one to swap it.' : n + ' of ' + m + ' picked'; }
  function syncLimit(name) {
    var full = A[name].length >= MAX[name], c = $('lq-count-' + name); if (c) c.textContent = countText(name);
    stage.querySelectorAll('input[name="' + name + '"]').forEach(function (i) { var l = i.parentNode, f = full && !i.checked; l.classList.toggle('is-full', f); if (f) l.setAttribute('aria-disabled', 'true'); else l.removeAttribute('aria-disabled'); });
  }
  function chipOpts() {
    var o = []; A.uses.forEach(function (u) { (POP[u] || []).forEach(function (a) { if (o.indexOf(a) < 0) o.push(a); }); });
    A.apps.forEach(function (a) { if (o.indexOf(a) < 0) o.push(a); });
    return o;
  }
  function extrasHTML() { return A.extra.map(function (x, i) { return '<li>' + esc(x) + ' <button type="button" class="link lq-rmx" data-i="' + i + '" aria-label="Remove ' + esc(x) + '">Remove</button></li>'; }).join(''); }
  var screens = [
    function () {
      var h = '<h2 class="qh" id="lqh-uses">What will you use it for most?</h2><p class="qp">Pick one or two. <span class="qcount" id="lq-count-uses" aria-live="polite">' + countText('uses') + '</span></p><div class="qcards" role="group" aria-labelledby="lqh-uses">' + USES.map(function (u) { return card('uses', u[0], u[3], u[2], u[1]); }).join('') + '</div>';
      h += '<div id="lq-gsub"' + (gaming() ? '' : ' hidden') + '><h3 class="qsub" id="lqh-gt">What\'s the most demanding game you play?</h3><div class="qcards" role="radiogroup" aria-labelledby="lqh-gt">' + GTIER.map(function (g) { return card('gtier', g[0], g[1], g[2]); }).join('') + '</div></div>';
      return h;
    },
    function () {
      return '<h2 class="qh">How will you carry it?</h2><div class="qcards">' + WHERE.map(function (w) { return card('where', w[0], w[2], w[1]); }).join('') + '</div>' +
        '<h3 class="qsub">Screen size <small>(optional)</small></h3>' + seg('size', SIZE) +
        '<h3 class="qsub">How long does it need to last unplugged?</h3>' + seg('bat', BAT);
    },
    function () { return '<h2 class="qh" id="lqh-pri">What would make it right for you?</h2><p class="qp">Pick up to 3, or skip. <span class="qcount" id="lq-count-pri" aria-live="polite">' + countText('pri') + '</span></p><div class="qcards" role="group" aria-labelledby="lqh-pri">' + PRI.map(function (p) { return card('pri', p[0], p[2], p[1]); }).join('') + '</div>'; },
    function () {
      return '<h2 class="qh">What does it need to run?</h2><p class="qp">Some programs and games only run on certain laptops, and some need more power. Tap what you use, or search for anything else.</p>' +
        chips('apps', chipOpts()) +
        '<div class="field lq-find" style="margin-top:18px"><label for="lq-q">Search games and programs</label><input id="lq-q" type="text" autocomplete="off" placeholder="' + esc(gaming() ? 'For example: Elden Ring, Apex Legends' : 'For example: QuickBooks, Final Cut Pro, Blender') + '" /><div class="lq-sug" id="lq-sug" role="listbox" aria-label="Matches"></div></div>' +
        '<ul class="lq-extra" id="lq-extra">' + extrasHTML() + '</ul>';
    },
    function () { return '<h2 class="qh">What do you want to spend?</h2><p class="qp">We\'ll find the best laptop for the money in your range.</p><div class="qbig" id="lq-bud">' + (A.budget ? esc(A.budget) : 'Pick a range') + '</div>' + seg('budget', BUD); },
    function () {
      var L = PICK = pick();
      var help = 'index.html?laptop=' + encodeURIComponent(summary()) + '#quote';
      if (!L) return '<div class="lpick"><h2 class="qh">We need a closer look</h2><p class="lp-note">' + esc(NOFIT) + '</p><div class="lp-cta"><a class="btn btn-primary" href="' + help + '">Have Ben find one</a></div><p class="fine"><button type="button" class="link qedit" data-go="0">Change my answers</button></p></div>';
      return '<div class="lpick"><span class="eyebrow" style="margin:0">Ben\'s pick for you</span><h2 class="qh lp-name">' + esc(L.n) + '</h2><p class="lp-price">' + esc(L.ps) + ' <small>typical price, last seen ' + esc(L.seen) + '. Prices move a lot in 2026; check today\'s price below.</small></p>' +
        (NOFIT ? '<p class="lp-nofit">' + esc(NOFIT) + ' <a class="link" href="' + help + '">Have Ben find one for you</a>.</p>' : '') +
        '<p class="lp-note">' + esc(L.note) + '</p>' +
        '<h3 class="lp-h">How it fits what you told us</h3>' + fitHTML(L) +
        '<p class="lp-cfg"><b>Get this version:</b> ' + esc(L.cfg) + '.</p>' +
        priceBtns(L) +
        (ALT ? '<h3 class="lp-h">' + esc(ALT.why) + '</h3>' + cmpHTML(L, ALT.L) + '<p class="lp-alt">Alternative: <a class="link" href="' + ALT.L.url + '" target="_blank" rel="noopener">Manufacturer website</a></p>' : '<dl class="brief lp-spec">' + [['Processor', L.cpu], ['Graphics', L.gpu], ['Memory', L.ram], ['Screen', L.scr], ['Weight', L.lb + ' lb'], ['Battery', L.bat]].map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('') + '</dl>') +
        '<div class="lp-cta"><a class="btn btn-primary" href="sms:+14132394183">Questions? Text Ben</a><a class="btn btn-quiet" href="' + help + '">Not quite right? Have Ben find one</a></div>' +
        '<p class="fine">We don\'t sell laptops or earn anything from this pick. <button type="button" class="link qedit" data-go="0">Change my answers</button></p></div>';
    }
  ];
  function grab() {}
  function check() {
    if (step === 0 && !A.uses.length) return 'Pick what you\'ll use it for most.';
    if (step === 0 && gaming() && !A.gtier) return 'Pick the most demanding game you play.';
    if (step === 1 && !A.where) return 'Pick how you\'ll carry it.';
    if (step === 1 && !A.bat) return 'Choose how long the battery should last.';
    if (step === 4 && !A.budget) return 'Choose a budget range, or "Not sure".';
    return '';
  }
  function show(dir) {
    stage.innerHTML = '<div class="qscreen' + (reduce || !dir ? '' : (dir < 0 ? ' in-back' : ' in')) + '">' + screens[step]() + '</div>';
    err.style.display = 'none'; back.style.visibility = step ? 'visible' : 'hidden';
    next.textContent = step === N - 2 ? 'See my laptop' : 'Next'; next.style.display = step === N - 1 ? 'none' : '';
    stepLbl.textContent = step === N - 1 ? 'Your pick' : 'Step ' + (step + 1) + ' of ' + (N - 1);
    pads.forEach(function (p, i) { p.className = i < step ? 'done' : (i === step ? 'now' : ''); });
    readout();
  }
  function go(to) {
    grab(); if (to < N - 1) PICK = null;
    if (to > step) { var m = check(); if (m) { err.textContent = m; err.style.display = 'block'; err.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' }); return; } }
    var d = to > step ? 1 : -1; step = to; show(d);
    if (form.getBoundingClientRect().top < 0) form.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }
  /* ---- search box: matches the list as you type; anything we don't know is kept and flagged for Ben ---- */
  function norm(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
  function suggest() {
    var q = $('lq-q'), box = $('lq-sug'); if (!q || !box) return;
    var v = norm(q.value); if (v.length < 2) { box.innerHTML = ''; return; }
    var hits = APPDB.filter(function (a) { return norm(a.n).indexOf(v) >= 0 && A.apps.indexOf(a.n) < 0; }).slice(0, 6);
    box.innerHTML = hits.map(function (a) { return '<button type="button" class="lq-hit" data-n="' + esc(a.n) + '">' + esc(a.n) + '</button>'; }).join('') +
      '<button type="button" class="lq-hit lq-other" data-x="' + esc(q.value.trim()) + '">Add "' + esc(q.value.trim()) + '" <small>(we\'ll check it)</small></button>';
  }
  function addApp(n) {
    if (A.apps.indexOf(n) < 0) A.apps.push(n);
    var wrap = $('lq-chips'); if (wrap) wrap.outerHTML = chips('apps', chipOpts());
    var q = $('lq-q'); if (q) { q.value = ''; q.focus(); } $('lq-sug').innerHTML = ''; readout();
  }
  function addExtra(x) {
    x = x.replace(/[<>]/g, '').trim().slice(0, 60); if (!x) return;
    var hit = APPDB.filter(function (a) { return norm(a.n) === norm(x); })[0]; if (hit) { addApp(hit.n); return; }
    if (A.extra.indexOf(x) < 0) A.extra.push(x);
    $('lq-extra').innerHTML = extrasHTML(); var q = $('lq-q'); if (q) { q.value = ''; q.focus(); } $('lq-sug').innerHTML = ''; readout();
  }
  stage.addEventListener('change', function (e) {
    var t = e.target; if (t.type !== 'radio' && t.type !== 'checkbox') return;
    if (t.type === 'checkbox') {
      var a = A[t.name], i = a.indexOf(t.value);
      if (t.checked && i < 0) {
        if (MAX[t.name] && a.length >= MAX[t.name]) { t.checked = false; var cc = $('lq-count-' + t.name); if (cc) { cc.classList.remove('flash'); void cc.offsetWidth; cc.classList.add('flash'); } return; }
        a.push(t.value);
      }
      if (!t.checked && i >= 0) a.splice(i, 1);
      t.parentNode.classList.toggle('sel', t.checked);
      if (MAX[t.name]) syncLimit(t.name);
      if (t.name === 'uses') {
        if (!gaming()) { A.gtier = ''; stage.querySelectorAll('input[name="gtier"]').forEach(function (r) { r.checked = false; r.parentNode.classList.remove('sel'); }); A.apps = A.apps.filter(function (n) { var x = app(n); return !(x && x.game); }); }
        var gs = $('lq-gsub'); if (gs) gs.hidden = !gaming();
      }
    } else { A[t.name] = t.value; stage.querySelectorAll('input[name="' + t.name + '"]').forEach(function (r) { r.parentNode.classList.toggle('sel', r.checked); }); if (t.name === 'budget') $('lq-bud').textContent = t.value; }
    err.style.display = 'none'; readout();
  });
  stage.addEventListener('input', function (e) { if (e.target.id === 'lq-q') suggest(); });
  stage.addEventListener('keydown', function (e) {
    if (e.target.id !== 'lq-q' || e.key !== 'Enter') return;
    e.preventDefault(); var first = stage.querySelector('#lq-sug .lq-hit[data-n]');
    if (first) addApp(first.dataset.n); else addExtra(e.target.value);
  });
  stage.addEventListener('click', function (e) {
    var h = e.target.closest('.lq-hit'); if (h) { if (h.dataset.n) addApp(h.dataset.n); else addExtra(h.dataset.x); return; }
    var r = e.target.closest('.lq-rmx'); if (r) { A.extra.splice(+r.dataset.i, 1); $('lq-extra').innerHTML = extrasHTML(); readout(); return; }
    var b = e.target.closest('.qedit'); if (b) go(+b.dataset.go);
  });
  back.addEventListener('click', function () { if (step) go(step - 1); });
  pads.forEach(function (p, i) { p.addEventListener('click', function () { if (i < step) go(i); }); });
  form.addEventListener('submit', function (e) { e.preventDefault(); if (step < N - 1) go(step + 1); });
  /* ---- live laptop preview. Figures reflect 2026 laptops (typical, not guaranteed):
     battery, web use: efficient Intel Core Ultra (Lunar/Panther Lake), Snapdragon X and Apple M laptops ~14+ hrs;
     mainstream thin laptops ~8-12 hrs; creator laptops with a graphics card ~6-9 hrs; gaming laptops ~4-7 hrs browsing, 1-2 hrs gaming.
     weight: 13-14 in thin ~2.7-3.3 lb; 15-16 in thin ~3.5-4.3 lb; 16 in gaming ~5-6 lb; 17-18 in gaming ~6-7.5 lb ---- */
  function bud() { var b = BUD.indexOf(A.budget); return A.budget === 'Not sure' ? -1 : b; }
  function heavyGame() { return gaming() && A.gtier !== 'light'; }
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
    if (A.bat === 'A full day (10+ hours)' && !heavyGame() && !uses('Photos, video or design')) n = 5;
    if (mac() && !heavyGame()) n = 5;
    if (has('Really nice screen') && n >= 4 && !mac()) n -= 1;
    if (inches() === 18) n = Math.max(1, n - 1);
    var t = ['', 'About 4 to 6 hrs (1 to 2 hrs gaming)', 'About 6 to 8 hrs', 'About 7 to 10 hrs', 'About 8 to 12 hrs', '14+ hrs'][n];
    return { n: n, t: t };
  }
  function pickStats(L) {
    var perf = Math.max(1, Math.min(5, gaming() ? L.g - 1 : L.c + 2));
    var rows = [[gaming() ? 'Gaming' : 'Performance', perf, gaming() ? L.gpu.replace(/ \(.*\)/, '') : L.cpu.replace(/^Up to /, '')],
      ['Screen', L.s ? 5 : 3, L.scr.split(',')[0]], ['Memory', L.mem >= 32 ? 5 : L.mem >= 24 ? 4 : L.mem >= 16 ? 3 : 2, L.mem + ' GB'],
      ['Battery life', L.bt, L.bt >= 4 ? 'Long' : L.bt === 3 ? 'Good' : 'Short'], ['Weight', L.lb < 3 ? 1 : L.lb < 3.6 ? 2 : L.lb < 4.6 ? 3 : L.lb < 6 ? 4 : 5, L.lb + ' lb']];
    return rows;
  }
  /* per-use laptop stats, 1-5, typical for 2026 laptops, not guaranteed */
  function stats() {
    if (!A.uses.length) return [];
    var b = bud(), ok = b >= 0, m = mac(), c = function (n) { return Math.max(1, Math.min(5, Math.round(n))); };
    var B = battery(), W = weight();
    var bat = ['Battery life', B.n, B.t], wt = ['Weight', W.n, W.t];
    var speed = function (base) { var n = c(base + b); return ['Speed', ok ? n : 0, ok ? ['', 'Basic', 'Good', 'Quick', 'Fast', 'Very fast'][n] : '']; };
    var mem = function () { return ['Memory', ok ? c(2 + b * .75) : 0, ok ? (m ? (b >= 3 ? '24 GB or more' : '16 GB') : (b >= 3 ? '32 GB' : b >= 1 ? '16 GB' : '8 to 16 GB')) : '', ok && b === 0 && !m]; };
    var S = {
      'Everyday and streaming': function () { var sc = c(1.5 + b); return [speed(3), ['Screen', ok ? sc : 0, ok ? ['', 'Basic', 'Good', 'Bright and sharp', 'Great, OLED options', 'Excellent'][sc] : '']]; },
      'School': function () { var sc = c(1.5 + b); return [speed(3), ['Screen', ok ? sc : 0, ok ? ['', 'Basic', 'Good', 'Bright and sharp', 'Great, OLED options', 'Excellent'][sc] : '']]; },
      'Work and video calls': function () { var cam = c(2 + b); return [mem(), ['Video calls', ok ? cam : 0, ok ? (b >= 1 ? '1080p camera, good mics' : '720p camera') : '']]; },
      'Photos, video or design': function () { var sc = c(1 + b); return [['Screen color', ok ? sc : 0, ok ? ['', 'Basic', 'OK', 'Accurate', 'Accurate, OLED options', 'Excellent'][sc] : ''], speed(1), mem()]; },
      'Gaming': function () {
        var g = !ok || !A.gtier ? 0 : m ? Math.min(2, c(2 + b - need())) : c(3 + b - need()), hz = m ? 0 : c(1 + b);
        return [['Game performance', g, g ? ['', 'Light games only', 'Low to medium', 'Medium to high', 'High', 'High to max'][g] : '', m && heavyGame()], ['Screen smoothness', ok && !m ? hz : 0, ok && !m ? ['', '60 Hz', '120 Hz', '144 Hz', '165 Hz', '165 to 240 Hz'][hz] : (m && ok ? 'Mac screens: 60 to 120 Hz' : '')]];
      },
      'Coding or tech work': function () { return [speed(2), mem()]; }
    };
    var rows = S[A.uses[0]]();
    if (A.uses[1] && S[A.uses[1]]) { var extra = S[A.uses[1]]()[0]; if (extra && !rows.some(function (r) { return r[0] === extra[0]; })) rows.push(extra); }
    return rows.concat([bat, wt]);
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
    if (gaming()) n = Math.max(n, { light: 1, online: 1, heavy: 2 }[A.gtier] || 1);
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
      if (b === 0) return { cap: 'There are no good gaming laptops under $600. The cheapest one worth buying, with a real graphics card, starts around $650 to $900.', fill: fill, warn: true };
      if (b === 1) return { cap: A.gtier === 'heavy' ? 'An entry-level graphics card. Demanding AAA games run at low to medium settings with DLSS.' : 'An entry-level graphics card. Popular games run well at 1080p.', fill: fill, warn: A.gtier === 'heavy' };
      if (b === 2) return { cap: 'RTX 5060 to 5070 class. High settings at 1080p in most games.', fill: fill, warn: false };
      if (b === 3) return { cap: 'RTX 5070 to 5070 Ti class. High settings, even at 1440p.', fill: fill, warn: false };
      return { cap: 'RTX 5070 Ti to 5080 class. High to max settings, even in demanding AAA games.', fill: fill, warn: false };
    }
    if (uses('Photos, video or design') && b < 2) return { cap: 'Editing works at this budget, but the next range up gets a better screen and more memory.', fill: fill, warn: true };
    if (has('Lots of tabs and apps open') && b === 0) return { cap: 'Heavy multitasking needs 16 GB of memory, which is hard to find under $600 right now.', fill: fill, warn: true };
    var main = A.uses[0];
    var label = { 'Everyday and streaming': 'A quick, reliable laptop for everyday use and video.', 'School': 'A light, dependable laptop for classes and homework.', 'Work and video calls': 'A solid work laptop that handles meetings and lots of tabs.', 'Coding or tech work': 'A fast laptop with plenty of memory for code and tools.', 'Photos, video or design': 'A strong editing laptop with a good, accurate screen.' }[main];
    return { cap: label, fill: fill, warn: false };
  }
  function notes() {
    var n = [], b = bud(), m = mac();
    if (!A.uses.length) return n;
    if (m && has('Touchscreen or pen')) n.push('Macs don\'t have touchscreens. An iPad or a Windows 2-in-1 may fit better.');
    if (m && A.size === 'Big (17 to 18 in)') n.push('Macs top out at 16 inches. We\'ll suggest the 15-inch MacBook Air or a Windows option.');
    if (m) n.push('We can suggest Macs, but our setup and repairs are Windows only.');
    if (!m && armRisk() && A.bat === 'A full day (10+ hours)') n.push('Some games and older programs don\'t run on the newest long-battery Windows laptops (Snapdragon), so we\'ll check your list first.');
    if (gaming() && !m && A.where === 'Carried every day' && heavyGame()) n.push('Gaming laptops are heavy, get loud under load and need the charger to play their best.');
    if (gaming() && has('Quiet and cool') && heavyGame()) n.push('No gaming laptop is truly quiet while gaming, but we\'ll pick ones with a quieter fan profile.');
    if (has('Really nice screen') && A.bat === 'A full day (10+ hours)' && !m) n.push('OLED has deep blacks and great color, but it draws more power than IPS and costs an hour or two of battery.');
    if (gaming() && b === 2) n.push('Two laptops with the same graphics card can perform very differently, so we check how much power (TGP, in watts) each one actually gets.');
    if (b >= 0 && b <= 1 && !m) n.push('Many budget laptops ship with 8 GB of memory again this year. We\'ll steer you to 16 GB so it stays quick for years.');
    if (has('Plugs for my stuff') && inches() === 14) n.push('Thin laptops have fewer ports, so you may need a small USB-C hub.');
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
    document.documentElement.classList.toggle('q-on', any);
    $('l-for').textContent = any ? useText() : '–';
    $('l-size').textContent = sz ? sz + ' in' + (A.where ? ' · ' + WHERE.filter(function (w) { return w[0] === A.where; })[0][2].toLowerCase() : '') : '–';
    $('l-must').textContent = A.pri.length ? A.pri.map(function (p) { return PRI.filter(function (x) { return x[0] === p; })[0][2]; }).join(', ') : '–';
    $('l-budget').textContent = A.budget || '–';
    $('l-sys').textContent = PICK ? (PICK.os === 'mac' ? 'macOS' : 'Windows') : '–';
    $('l-body').style.transform = 'scale(' + (sz === 14 ? .84 : sz === 18 ? 1.1 : 1) + ')';
    $('l-body').style.opacity = any ? 1 : .35;
    $('l-empty').style.opacity = any ? 0 : 1;
    on('l-num', sz === 18 && !m); $('l-rgb').setAttribute('opacity', rig ? .9 : 0); $('l-keys').setAttribute('stroke', rig ? '#ff5818' : '#ffffff'); $('l-keys').setAttribute('stroke-opacity', rig ? .55 : .22);
    on('l-vents', rig);
    $('l-thick').setAttribute('height', rig || (has('Can upgrade or repair later') && !m) ? 9 : sz === 14 ? 3 : 5);
    on('l-ports', any); on('l-ports-more', (has('Plugs for my stuff') || rig) && !m);
    on('l-pen', has('Touchscreen or pen') && !m);
    $('l-os').textContent = PICK ? (m ? 'MACOS' : 'WINDOWS') : '';
    $('l-scr-t').textContent = sz ? sz + ' in' : '';
    $('l-scene').innerHTML = scene(67, 37, 186, 112);
    var bi = bud(); $('l-floor').setAttribute('opacity', (bi < 0 ? .12 : .18 + bi * .12).toFixed(2));
    var V = verdict(); $('l-cap').textContent = V.cap; $('l-cap').classList.toggle('warn', V.warn);
    $('l-stats').innerHTML = statsHTML(step === N - 1 && PICK ? pickStats(PICK) : stats(), 'Pick what it\'s for to see its stats.');
    $('l-notes').innerHTML = notes().map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('');
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
