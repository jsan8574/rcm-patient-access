/* App shell: state, navigation, progress, silent time tracking, data capture, certificate, PDF, nudge replies. */
(function () {
  'use strict';
  const RAW = window.COURSE, KIT = window.CourseKit, A = window.Activities, h = A.h;
  const PREFIX = 'rcmpa:v' + RAW.version + ':';
  const JSPDF_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';

  /* ---------- storage (guarded) ---------- */
  let storageOk = true;
  const mem = {};
  function load(k) { try { const v = localStorage.getItem(PREFIX + k); return v ? JSON.parse(v) : null; } catch (e) { storageOk = false; return mem[k] ? JSON.parse(mem[k]) : null; } }
  function store(k, v) { const s = JSON.stringify(v); try { localStorage.setItem(PREFIX + k, s); } catch (e) { storageOk = false; mem[k] = s; } }
  function drop(k) { try { localStorage.removeItem(PREFIX + k); } catch (e) { delete mem[k]; } }

  /* ---------- learner + per-path state ---------- */
  let learner = load('learner') || { name: '', email: '', path: RAW.defaultPath };
  if (!RAW.paths.some((p) => p.id === learner.path)) learner.path = RAW.defaultPath;
  let C, LESSONS, state;
  const newState = () => ({ done: {}, data: {}, current: null, time: 0, conf: { before: null, after: null }, final: {}, shuffle: {}, answers: {}, ui: { open: {} }, sent: null, created: new Date().toISOString() });
  function loadState() { state = load('state:' + learner.path) || newState(); }
  function saveState() { store('state:' + learner.path, state); }
  let saveTimer = null;
  function saveSoon() { clearTimeout(saveTimer); saveTimer = setTimeout(saveState, 400); }
  function first(name) { return (name || '').trim().split(/\s+/)[0] || ''; }
  function buildCourse() {
    C = KIT.resolve(RAW, { path: learner.path, vars: Object.assign({}, RAW.vars, { first: first(learner.name) }) });
    LESSONS = [];
    C.sections.forEach((s, si) => s.lessons.forEach((l, li) => LESSONS.push({ L: l, s, si, li })));
  }

  /* ---------- progress helpers ---------- */
  const idx = (id) => LESSONS.findIndex((x) => x.L.id === id);
  const isDone = (id) => !!state.done[id];
  function firstOpen() { const i = LESSONS.findIndex((x) => !isDone(x.L.id)); return i === -1 ? LESSONS.length - 1 : i; }
  const unlocked = (id) => idx(id) <= firstOpen();
  function pct() { return Math.round((LESSONS.filter((x) => isDone(x.L.id)).length / LESSONS.length) * 100); }

  /* ---------- silent time tracking (visible tab, ignore gaps > 5 s and idle > 5 min) ---------- */
  let lastTick = Date.now(), lastActive = Date.now(), unsavedTime = 0;
  ['pointerdown', 'keydown', 'scroll', 'touchstart', 'input'].forEach((ev) => window.addEventListener(ev, () => { lastActive = Date.now(); }, { passive: true }));
  setInterval(() => {
    const now = Date.now(), gap = (now - lastTick) / 1000;
    lastTick = now;
    if (!state || document.visibilityState !== 'visible') return;
    if (gap > 5 || now - lastActive > 5 * 60 * 1000) return;
    state.time += gap; unsavedTime += gap;
    if (unsavedTime >= 10) { unsavedTime = 0; saveState(); }
  }, 1000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && state) saveState(); });

  /* ---------- live region ---------- */
  function live(msg) { const el = document.getElementById('live'); el.textContent = ''; setTimeout(() => { el.textContent = msg; }, 30); }

  /* ---------- integrity: no paste/drop into answer fields ---------- */
  function guard(el) {
    const warn = (e) => {
      e.preventDefault();
      let m = el.parentElement && el.parentElement.querySelector('.paste-msg');
      if (!m) { m = h('p', { class: 'field-msg paste-msg', role: 'status' }); el.insertAdjacentElement('afterend', m); }
      m.textContent = 'Please type this in your own words. Pasting is turned off for answer fields.';
      clearTimeout(m._t); m._t = setTimeout(() => m.remove(), 5000);
    };
    el.addEventListener('paste', warn);
    el.addEventListener('drop', warn);
  }
  function validText(t, minWords) {
    const n = minWords || 3;
    const s = (t || '').trim();
    if (A.words(s) < n || s.length < 10) return { ok: false, msg: 'Add a little more detail: write at least ' + n + ' words.' };
    return { ok: true };
  }

  /* ---------- shuffles (persisted per learner) ---------- */
  function shuffle(key, n) {
    const have = state.shuffle[key];
    if (have && have.length === n) return have;
    const a = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    state.shuffle[key] = a; saveSoon();
    return a;
  }
  function answer(item, kind, choice, ok) {
    if (state.answers[item]) return;
    state.answers[item] = { kind, choice, ok: !!ok, at: new Date().toISOString() };
    saveSoon();
  }

  /* ---------- data capture (Apps Script web app) ---------- */
  const queue = () => load('queue') || [];
  const statusListeners = [];
  function sendStatus() {
    if (!C.dataCapture.endpoint) return 'Your trainer’s record link is not set up yet, so nothing has been sent. Your PDF has everything: share it with your trainer.';
    if (queue().length) return 'Saved on this device. It will send automatically when you are back online.';
    if (state.sent) return 'Your completion record was sent to your trainer’s records on ' + new Date(state.sent).toLocaleDateString() + '.';
    return 'Your completion record is sent when you finish the wrap-up.';
  }
  function notifyStatus() { const t = sendStatus(); statusListeners.forEach((f) => f(t)); }
  function enqueue(rec) { const q = queue(); q.push(rec); store('queue', q); flush(); }
  let flushing = false;
  async function flush() {
    if (flushing || !C.dataCapture.endpoint) return notifyStatus();
    flushing = true;
    let q = queue();
    while (q.length) {
      try {
        await fetch(C.dataCapture.endpoint, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(q[0]) });
        const rec = q.shift(); store('queue', q);
        if (rec.type === 'completion') { state.sent = new Date().toISOString(); saveState(); }
      } catch (e) { break; }
      q = queue();
    }
    flushing = false; notifyStatus();
  }
  window.addEventListener('online', flush);

  async function certId() {
    const F = state.final;
    const passAt = ((F.history || []).find((x) => x.pass) || {}).at || new Date().toISOString();
    const raw = [learner.name.trim().toLowerCase(), RAW.id, learner.path, passAt.slice(0, 10), F.best].join('|');
    let hex;
    try {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
      hex = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      let x = 0x811c9dc5; for (const ch of raw) { x ^= ch.charCodeAt(0); x = Math.imul(x, 16777619) >>> 0; }
      hex = x.toString(16).padStart(8, '0') + x.toString(16).padStart(8, '0');
    }
    hex = hex.toUpperCase();
    return 'PA-' + hex.slice(0, 4) + '-' + hex.slice(4, 8);
  }
  function lessonData(id) { return state.data[id] || {}; }
  function summary() {
    const qs = [], sims = {};
    LESSONS.forEach(({ L }) => {
      if (L.kind === 'quiz') L.questions.forEach((q) => qs.push(state.answers[q.id]));
      if (L.kind === 'sim') { const d = lessonData(L.id); sims[L.title] = (d.first || []).filter(Boolean).length + '/' + L.steps.length; }
    });
    const firstTry = qs.filter((a) => a && a.ok).length;
    const typing = lessonData('s2-type').best || {};
    const calcD = lessonData('s6-calc').cases || {};
    const calcTries = Object.values(calcD).reduce((n, c) => n + (c.tries || 0), 0);
    return {
      checks: firstTry + '/' + qs.length, sims,
      typingWpm: typing.wpm || 0, typingAcc: typing.acc || 0,
      game1: lessonData('s4-board').best || 0, game2: lessonData('s8-board').best || 0,
      calcTries, spoken: (lessonData('s6-say').score || 0) + '/6',
      sortChecks: lessonData('s5-sort').checks || 0,
      hunt1: lessonData('s3-hunt').checks || 0, hunt2: lessonData('s7-cap').checks || 0
    };
  }
  async function sendCompletion() {
    const F = state.final, conf = state.conf, wrap = lessonData('s8-wrap'), note = lessonData('s7-note');
    const avg = (o) => { const v = Object.values(o || {}); return v.length ? +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(2) : null; };
    const firstAttempt = (F.history || [])[0] || {};
    const rec = {
      type: 'completion', course: RAW.id, version: RAW.version, submittedAt: new Date().toISOString(),
      certId: await certId(), name: learner.name, email: learner.email, path: learner.path,
      finalBest: F.best, finalFirst: F.first, finalAttempts: (F.history || []).length, firstAttemptCriticalMissed: firstAttempt.critOk === false,
      summary: summary(), activeMinutes: Math.round(state.time / 60),
      confBefore: conf.before, confAfter: conf.after, confBeforeAvg: avg(conf.before), confAfterAvg: avg(conf.after),
      commitments: (wrap.commit || []).filter((c) => c.t), survey: wrap.survey || {},
      note: Object.assign({ status: note.status, selfCheck: (note.rubric || []).filter(Boolean).length + '/6' }, note.fields || {}),
      device: window.matchMedia && window.matchMedia('(pointer: coarse)').matches ? 'touch' : 'desktop',
      answers: Object.keys(state.answers).map((k) => Object.assign({ item: k }, state.answers[k]))
    };
    enqueue(rec);
  }

  /* ---------- chrome: header ring, sidebar, bottom bar ---------- */
  const $ = (id) => document.getElementById(id);
  function refreshChrome() { drawRing(); drawSidebar(); drawBottom(); }
  function drawRing() {
    const p = pct();
    $('ringFill').setAttribute('stroke-dashoffset', String(138.2 * (1 - p / 100)));
    $('ringPct').textContent = p + '%';
    $('ring').setAttribute('aria-label', p + '% complete');
    $('topProgress').style.width = p + '%';
    $('topLearner').textContent = learner.name || 'Not entered';
    const path = C.paths.find((x) => x.id === learner.path);
    $('pathName').textContent = C.paths.length > 1 ? '· ' + path.label : '';
  }
  function drawSidebar() {
    const side = $('sidebar');
    const keepScroll = side.scrollTop;
    side.textContent = '';
    const doneN = LESSONS.filter((x) => isDone(x.L.id)).length;
    side.appendChild(h('div', { class: 'side-head' },
      h('p', { class: 'eyebrow', text: 'Your progress' }),
      h('strong', { text: pct() + '% complete' }),
      h('p', { text: doneN + ' of ' + LESSONS.length + ' lessons complete' }),
      h('div', { class: 'track', 'aria-hidden': 'true' }, h('span', { style: 'width:' + pct() + '%' }))));
    side.appendChild(h('h2', { class: 'side-title', text: 'Course content' }));
    const cur = state.current;
    C.sections.forEach((s) => {
      const has = s.lessons.some((l) => l.id === cur);
      const open = state.ui.open[s.id] != null ? state.ui.open[s.id] : has;
      const n = s.lessons.filter((l) => isDone(l.id)).length;
      const listId = 'sec-' + s.id;
      const btn = h('button', { type: 'button', class: 'sec-btn', 'aria-expanded': open ? 'true' : 'false', 'aria-controls': listId },
        s.num ? h('span', { class: 'sec-num', 'aria-hidden': 'true', text: String(s.num) }) : null,
        h('span', { class: 'sec-text' }, h('strong', { text: (s.num ? 'Section ' + s.num + ': ' : '') + s.title }), h('small', { text: n + ' / ' + s.lessons.length + ' lessons' })),
        h('span', { class: 'chev', 'aria-hidden': 'true', html: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M6 9l6 6 6-6" fill="none" stroke="#15384f" stroke-width="2"/></svg>' }));
      btn.addEventListener('click', () => { state.ui.open[s.id] = !open; saveSoon(); drawSidebar(); });
      const ul = h('ul', { class: 'lessons', id: listId, hidden: !open });
      s.lessons.forEach((l) => {
        const d = isDone(l.id), u = unlocked(l.id);
        const b = h('button', { type: 'button', class: 'lesson-btn' + (l.id === cur ? ' active' : ''), disabled: !u, 'aria-current': l.id === cur ? 'page' : null },
          h('span', { class: 'status-dot' + (d ? ' done' : ''), 'aria-hidden': 'true', html: d ? '<svg viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-7"/></svg>' : '' }),
          h('span', { class: 'l-text' }, h('span', { class: 'l-title', text: l.title }),
            h('span', { class: 'l-type', text: C.labels[l.kind] + (d ? ' · Complete' : !u ? ' · Locked' : '') })));
        b.addEventListener('click', () => { go(l.id); document.body.classList.remove('drawer-open'); $('menuBtn').setAttribute('aria-expanded', 'false'); });
        ul.appendChild(h('li', null, b));
      });
      side.appendChild(h('div', { class: 'sec' }, btn, ul));
    });
    const foot = h('div', { class: 'side-foot' });
    const best = state.final.best;
    foot.appendChild(h('div', { class: 'row' }, h('span', { text: 'Best score' }), h('strong', { text: best != null ? best + '%' : 'Not taken' })));
    foot.appendChild(h('button', { type: 'button', class: 'link-btn', text: 'Download PDF of my answers', onclick: () => pdf('answers') }));
    if (C.paths.length > 1) foot.appendChild(h('button', { type: 'button', class: 'link-btn', text: 'Change path', onclick: showGate }));
    const reset = h('button', { type: 'button', class: 'link-btn', text: 'Reset progress' });
    reset.addEventListener('click', () => {
      if (foot.querySelector('.confirm-row')) return;
      const row = h('div', { class: 'confirm-row', role: 'group', 'aria-label': 'Confirm reset' },
        h('span', { text: 'Reset all progress on this device? This cannot be undone.' }),
        h('div', { class: 'actions' },
          h('button', { type: 'button', class: 'btn primary', text: 'Reset', onclick: () => { drop('state:' + learner.path); loadState(); state.current = LESSONS[0].L.id; saveState(); go(state.current); live('Progress reset.'); } }),
          h('button', { type: 'button', class: 'btn', text: 'Cancel', onclick: () => { row.remove(); reset.focus(); } })));
      foot.appendChild(row); row.querySelector('.btn').focus();
    });
    foot.appendChild(reset);
    side.appendChild(foot);
    side.scrollTop = keepScroll;
  }
  function drawBottom() {
    const bar = $('bottombar');
    bar.textContent = '';
    const i = idx(state.current);
    const cur = LESSONS[i], next = LESSONS[i + 1], prev = LESSONS[i - 1];
    const prevBtn = h('button', { type: 'button', class: 'btn', disabled: !prev, text: '← Previous' });
    prevBtn.addEventListener('click', () => prev && go(prev.L.id));
    const doneNow = isDone(cur.L.id);
    const gate = h('div', { class: 'gate', 'aria-live': 'polite' });
    if (!doneNow && C.gateHints[cur.L.kind]) gate.appendChild(h('span', { text: C.gateHints[cur.L.kind] }));
    else if (!next) gate.appendChild(h('strong', { text: 'You have reached the end of the course.' }));
    const nextWrap = h('div', { class: 'nav-next' });
    if (next) {
      nextWrap.appendChild(h('div', { class: 'up-next' }, 'Up next', h('strong', { text: next.L.title })));
      const nb = h('button', { type: 'button', class: 'btn primary', disabled: !doneNow, text: 'Next →' });
      nb.addEventListener('click', () => go(next.L.id));
      nextWrap.appendChild(nb);
    }
    bar.appendChild(prevBtn); bar.appendChild(gate); bar.appendChild(nextWrap);
  }

  /* ---------- lesson rendering ---------- */
  let leaveHooks = [];
  function go(id, opts) {
    if (!unlocked(id)) id = LESSONS[firstOpen()].L.id;
    leaveHooks.forEach((f) => { try { f(); } catch (e) { /* ignore */ } }); leaveHooks = [];
    const prevSec = (LESSONS[idx(state.current)] || {}).s;
    state.current = id;
    const sec = LESSONS[idx(id)].s;
    if (!prevSec || prevSec.id !== sec.id) { state.ui.open = {}; }
    saveState();
    renderLesson();
    refreshChrome();
    if (!(opts && opts.noFocus)) { window.scrollTo(0, 0); $('main').focus({ preventScroll: true }); }
  }
  function renderLesson() {
    const main = $('main');
    main.textContent = '';
    const x = LESSONS[idx(state.current)], L = x.L, s = x.s;
    const wrap = h('article', { class: 'lesson' });
    if (L.kind !== 'welcome') {
      const loc = (s.num ? 'Section ' + s.num + ' · ' + s.title : s.title) + ' • Lesson ' + (x.li + 1) + ' of ' + s.lessons.length;
      wrap.appendChild(h('p', { class: 'location', text: loc }));
      wrap.appendChild(h('h1', { text: L.title }));
      wrap.appendChild(h('span', { class: 'tag', text: C.labels[L.kind] }));
      if (L.intro && L.kind === 'reading') wrap.appendChild(h('p', { class: 'intro', text: L.intro }));
    }
    const body = h('div');
    wrap.appendChild(body);
    main.appendChild(wrap);
    const api = makeApi(L);
    try { A[L.kind](body, L, api); } catch (e) { console.error(e); body.appendChild(h('p', { class: 'field-msg', text: 'Something went wrong loading this lesson. Please reload the page.' })); }
  }
  function makeApi(L) {
    return {
      course: C, state, learner,
      data: () => state.data[L.id] || (state.data[L.id] = {}),
      save: saveState, saveSoon,
      complete: () => { if (!state.done[L.id]) { state.done[L.id] = true; saveState(); refreshChrome(); live('Lesson complete. You can go to the next lesson.'); } },
      isDone: () => isDone(L.id),
      live, guard, validText, shuffle, answer,
      onLeave: (f) => leaveHooks.push(f),
      refreshChrome,
      sendCompletion, sendStatus, onSendStatus: (f) => { statusListeners.length = 0; statusListeners.push(f); },
      setName: (n) => { learner.name = n; store('learner', learner); buildCourse(); drawRing(); },
      drawCert, pdf
    };
  }

  /* ---------- certificate (canvas) ---------- */
  async function drawCert(canvas, name) {
    try { await Promise.all(['400', '600', '700'].map((w) => document.fonts.load(w + ' 40px Figtree'))); } catch (e) { /* fallback font */ }
    const ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
    const F = state.final, id = await certId();
    const passAt = ((F.history || []).find((x) => x.pass) || {}).at || new Date().toISOString();
    const date = new Date(passAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, W, 240); g.addColorStop(0, '#0c263c'); g.addColorStop(0.72, '#153f62'); g.addColorStop(1, '#146d7d');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, 240);
    ctx.fillStyle = '#5fc8b4'; ctx.fillRect(0, 240, W, 8);
    ctx.strokeStyle = '#d5e4ec'; ctx.lineWidth = 4; ctx.strokeRect(30, 30, W - 60, H - 60);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#c6e0e9'; ctx.font = '600 26px Figtree, Arial, sans-serif';
    ctx.fillText(C.program.toUpperCase().split('').join(String.fromCharCode(8202)), W / 2, 110);
    ctx.fillStyle = '#ffffff'; ctx.font = '700 60px Figtree, Arial, sans-serif';
    ctx.fillText(C.title, W / 2, 185);
    ctx.fillStyle = '#006a76'; ctx.font = '700 28px Figtree, Arial, sans-serif';
    ctx.fillText('CERTIFICATE OF COMPLETION', W / 2, 345);
    ctx.fillStyle = '#4f6a7c'; ctx.font = '400 30px Figtree, Arial, sans-serif';
    ctx.fillText('This certifies that', W / 2, 420);
    let size = 84; ctx.font = '700 ' + size + 'px Figtree, Arial, sans-serif';
    while (ctx.measureText(name).width > W - 260 && size > 40) { size -= 4; ctx.font = '700 ' + size + 'px Figtree, Arial, sans-serif'; }
    ctx.fillStyle = '#15384f'; ctx.fillText(name, W / 2, 530);
    ctx.strokeStyle = '#a9c3d1'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(W / 2 - 420, 565); ctx.lineTo(W / 2 + 420, 565); ctx.stroke();
    ctx.fillStyle = '#284b60'; ctx.font = '400 30px Figtree, Arial, sans-serif';
    ctx.fillText('has completed ' + C.title + ' and passed the Final Knowledge Check.', W / 2, 640);
    const path = C.paths.find((x) => x.id === learner.path).label;
    ctx.fillText('Path: ' + path, W / 2, 690);
    const cols = [['SCORE', F.best + '%'], ['DATE', date], ['CERTIFICATE ID', id]];
    cols.forEach(([k, v], i) => {
      const x = W / 2 + (i - 1) * 440;
      ctx.fillStyle = '#4f6a7c'; ctx.font = '700 20px Figtree, Arial, sans-serif'; ctx.fillText(k, x, 820);
      ctx.fillStyle = '#15384f'; ctx.font = '700 36px Figtree, Arial, sans-serif'; ctx.fillText(v, x, 868);
    });
    ctx.fillStyle = '#4f6a7c'; ctx.font = '400 20px Figtree, Arial, sans-serif';
    ctx.fillText('Verify this certificate with your trainer using the certificate ID.', W / 2, H - 80);
  }

  /* ---------- PDF (jsPDF, loaded on demand) ---------- */
  let jspdfPromise = null;
  function loadJsPDF() {
    if (window.jspdf) return Promise.resolve();
    if (!jspdfPromise) jspdfPromise = new Promise((res, rej) => { const s = document.createElement('script'); s.src = JSPDF_URL; s.onload = res; s.onerror = () => { jspdfPromise = null; rej(new Error('load')); }; document.head.appendChild(s); });
    return jspdfPromise;
  }
  function clean(t) {
    return String(t == null ? '' : t)
      .replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"').replace(/[–—−]/g, '-')
      .replace(/…/g, '...').replace(/•/g, '-').replace(/→/g, '->').replace(/←/g, '<-')
      .replace(/✓/g, 'Yes').replace(/✕/g, 'x').replace(/×/g, 'x').replace(/≤/g, '<=').replace(/≥/g, '>=')
      .replace(/[   ]/g, ' ')
      .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '?');
  }
  async function pdf(kind) {
    try { await loadJsPDF(); } catch (e) { live('The PDF tool could not load. Check your connection and try again.'); alertBox('The PDF tool could not load. Check your internet connection and try again.'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const PW = doc.internal.pageSize.getWidth(), PH = doc.internal.pageSize.getHeight(), M = 54, CW = PW - M * 2;
    let y = M;
    const id = state.final.passed ? await certId() : 'Not yet issued';
    const navy = [21, 56, 79], teal = [0, 106, 118], muted = [79, 106, 124];
    function ensure(hh) { if (y + hh > PH - M) { doc.addPage(); y = M; } }
    function text(t, o) {
      o = o || {};
      doc.setFont('helvetica', o.bold ? 'bold' : o.italic ? 'italic' : 'normal'); doc.setFontSize(o.size || 10.5); doc.setTextColor(...(o.color || navy));
      const lines = doc.splitTextToSize(clean(t), o.width || CW);
      const lh = (o.size || 10.5) * 1.38;
      lines.forEach((ln) => { ensure(lh); doc.text(ln, o.x || M, y + (o.size || 10.5)); y += lh; });
      y += o.after != null ? o.after : 4;
    }
    const H1 = (t) => { ensure(40); y += 6; text(t, { size: 17, bold: true, after: 6 }); doc.setDrawColor(213, 228, 236); doc.line(M, y, PW - M, y); y += 10; };
    const H2 = (t) => { ensure(30); y += 4; text(t, { size: 12.5, bold: true, color: teal, after: 4 }); };
    const bullet = (t) => { const x0 = M + 12; ensure(14); doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(...navy); doc.text('-', M + 2, y + 10.5); text(t, { x: x0, width: CW - 12, after: 2 }); };
    const kv = (k, v) => text(k + ': ' + (v == null || v === '' ? '-' : v), { after: 2 });
    function box(t) { const lines = doc.splitTextToSize(clean(t), CW - 20); ensure(lines.length * 14 + 14); doc.setDrawColor(213, 228, 236); doc.rect(M, y, CW, lines.length * 14 + 10); doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(...navy); lines.forEach((ln, i) => doc.text(ln, M + 10, y + 16 + i * 14)); y += lines.length * 14 + 18; }
    function cover(title) {
      doc.setFillColor(12, 38, 60); doc.rect(0, 0, PW, 96, 'F');
      doc.setTextColor(198, 224, 233); doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.text(clean(C.program.toUpperCase()), M, 40);
      doc.setTextColor(255, 255, 255); doc.setFontSize(20); doc.text(clean(C.title + ' · ' + title), M, 70);
      y = 124;
    }
    function jobAid() {
      H1(C.jobAid.title);
      C.jobAid.blocks.forEach(([t, items]) => { H2(t); items.forEach(bullet); });
    }
    function trainerPack() {
      H1(C.observation.title); text(C.observation.intro, { color: muted });
      kv('Learner', learner.name); kv('Certificate ID', id);
      C.observation.items.forEach((it, i) => { ensure(28); text((i + 1) + '. ' + it, { after: 1 }); text('[ ] Observed    [ ] Not yet    Notes: ______________________________', { color: muted, size: 9.5, after: 6 }); });
      y += 6; text('Observer name: ____________________   Role: ______________   Date: ___________   Signature: ______________', { size: 10 });
      doc.addPage(); y = M;
      H1(C.trainerGuide.title); text(C.trainerGuide.intro, { color: muted });
      C.trainerGuide.questions.forEach((q, i) => text((i + 1) + '. ' + q, { after: 6 }));
      H1(C.peerCards.title); text(C.peerCards.intro, { color: muted });
      C.peerCards.cards.forEach((c) => { H2(c.title); text(c.role, { italic: true }); text('Reveal only when asked:', { bold: true, after: 2 }); c.reveal.forEach(bullet); });
      H1('Reinforcement kit');
      text('Send these short messages one week and four weeks after completion. Replies go to the trainer’s records.', { color: muted });
      const base = location.origin + location.pathname;
      [['week1', '#nudge1'], ['week4', '#nudge4']].forEach(([k, hash]) => { const n = C.nudges[k]; H2(n.title); box(n.message.replace('{link}', base + hash)); text('Model answer: ' + n.model, { color: muted, size: 10 }); });
    }
    function glossary() { doc.addPage(); y = M; H1('Glossary'); C.glossary.forEach(([t, dd]) => text(t + ': ' + dd, { after: 3 })); }

    if (kind === 'jobaid') { cover('Job aid'); jobAid(); glossary(); }
    else if (kind === 'trainer') { cover('Trainer pack'); trainerPack(); }
    else {
      cover('My learning record');
      const F = state.final;
      kv('Learner', learner.name); kv('Path', C.paths.find((x) => x.id === learner.path).label);
      kv('Final Knowledge Check (best)', F.best != null ? F.best + '%' + (F.passed ? ' - passed' : ' - not passed yet') : 'Not taken');
      kv('Certificate ID', id); kv('Date', new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
      const S = summary();
      H1('Activity results');
      kv('Checks for understanding, right first time', S.checks);
      Object.keys(S.sims).forEach((k) => kv('Simulation "' + k + '", first-try score', S.sims[k]));
      kv('Data-entry drill: personal best speed', S.typingWpm + ' WPM'); kv('Data-entry drill: best first-check accuracy', S.typingAcc + '%');
      kv('Front-End Board best scores', 'Round 1: ' + S.game1 + ' · Round 2: ' + S.game2);
      kv('Spoken rehearsal self-check', S.spoken);
      H1('Confidence before and after');
      const b = state.conf.before || {}, a = state.conf.after || {};
      C.confidence.items.forEach((it, i) => text(it + '  Before: ' + (b[i] || '-') + '/5  ·  After: ' + (a[i] || '-') + '/5', { after: 3 }));
      H1('My written answers');
      LESSONS.forEach(({ L }) => {
        if (L.kind !== 'reflect') return;
        const d = lessonData(L.id);
        H2(L.title);
        L.prompts.forEach((p) => { text(p.q, { bold: true, after: 2 }); box((d.answers || {})[p.id] || 'Not answered yet.'); });
      });
      const nd = lessonData('s7-note');
      H2('Work-ready note and escalation');
      kv('Clearance status', nd.status);
      const nf = nd.fields || {};
      [['Account note', 'note'], ['Issue', 'issue'], ['Impact', 'impact'], ['Evidence', 'evidence'], ['Deadline', 'deadline'], ['Action needed', 'action']].forEach(([k, f]) => { text(k, { bold: true, after: 2 }); box(nf[f] || 'Not written yet.'); });
      const wd = lessonData('s8-wrap');
      H1('My commitments');
      const cm = (wd.commit || []).filter((c) => c.t);
      if (!cm.length) text('Not written yet.', { color: muted });
      cm.forEach((c, i) => text((i + 1) + '. ' + c.t + '  (by ' + c.date + ')', { after: 4 }));
      doc.addPage(); y = M; jobAid();
      doc.addPage(); y = M; trainerPack();
      glossary();
    }
    const pages = doc.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...muted);
      doc.text(clean(C.title + ' · ' + (learner.name || '') + ' · Certificate ID ' + id), M, PH - 28);
      doc.text('Page ' + p + ' of ' + pages, PW - M, PH - 28, { align: 'right' });
    }
    const names = { answers: 'My-Learning-Record', jobaid: 'Job-Aid', trainer: 'Trainer-Pack' };
    doc.save('RCM-Patient-Access-' + names[kind] + '.pdf');
    live('PDF downloaded.');
  }
  function alertBox(msg) {
    const main = $('main');
    const p = h('p', { class: 'field-msg', role: 'alert', text: msg });
    main.prepend(p); setTimeout(() => p.remove(), 6000);
  }

  /* ---------- name gate ---------- */
  function showGate() {
    const gate = $('nameGate');
    gate.textContent = '';
    const form = h('form', { class: 'name-gate-card', novalidate: true });
    form.appendChild(h('p', { class: 'eyebrow', text: 'Before you begin' }));
    form.appendChild(h('h2', { id: 'nameGateTitle', text: C.title }));
    form.appendChild(h('p', { text: 'Enter your name and email so your progress, certificate and learning record identify you.' }));
    const name = h('input', { type: 'text', id: 'gName', maxlength: '80', autocomplete: 'name', required: true });
    name.value = learner.name;
    const email = h('input', { type: 'email', id: 'gEmail', maxlength: '120', autocomplete: 'email', required: true, 'aria-describedby': 'gEmailHint' });
    email.value = learner.email;
    const msg = h('div', { 'aria-live': 'polite' });
    form.appendChild(h('div', { class: 'field' }, h('label', { for: 'gName', text: 'Full name' }), name));
    form.appendChild(h('div', { class: 'field' }, h('label', { for: 'gEmail', text: 'Email' }), h('span', { class: 'hint', id: 'gEmailHint', text: 'Used only for your trainer’s records.' }), email));
    let sel = null;
    if (C.paths.length > 1) {
      sel = h('select', { id: 'gPath' }, C.paths.map((p) => h('option', { value: p.id, text: p.label })));
      sel.value = learner.path;
      form.appendChild(h('div', { class: 'field' }, h('label', { for: 'gPath', text: 'Your path' }), sel));
    }
    form.appendChild(msg);
    form.appendChild(h('button', { type: 'submit', class: 'btn primary', style: 'width:100%', text: 'Continue to the course' }));
    form.addEventListener('submit', (e) => {
      e.preventDefault(); msg.textContent = '';
      const n = name.value.trim().replace(/\s+/g, ' ');
      const em = email.value.trim();
      if (n.length < 2) { msg.appendChild(h('p', { class: 'field-msg', text: 'Please enter your name to continue.' })); name.focus(); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) { msg.appendChild(h('p', { class: 'field-msg', text: 'Please enter a valid email, for example name@example.com.' })); email.focus(); return; }
      const changedPath = sel && sel.value !== learner.path;
      if (state) saveState();
      learner = { name: n, email: em, path: sel ? sel.value : learner.path };
      store('learner', learner);
      gate.hidden = true;
      boot(changedPath);
    });
    gate.appendChild(form);
    gate.hidden = false;
    name.focus();
  }

  /* ---------- nudge reply page (#nudge1 / #nudge4) ---------- */
  function nudgePage(week) {
    buildCourse();
    document.querySelector('.layout').style.display = 'none';
    $('bottombar').hidden = true; $('panelToggle').hidden = true; $('menuBtn').hidden = true; document.querySelector('.top-meta').hidden = true;
    const n = C.nudges[week === '1' ? 'week1' : 'week4'];
    const wrap = h('main', { class: 'nudge', id: 'nudgeMain', tabindex: '-1' });
    const form = h('form', { class: 'card', novalidate: true });
    form.appendChild(h('p', { class: 'eyebrow', text: n.title }));
    form.appendChild(h('h1', { text: 'Quick check-in' }));
    const nm = h('input', { type: 'text', id: 'nName', autocomplete: 'name' }); nm.value = learner.name || '';
    const em = h('input', { type: 'email', id: 'nEmail', autocomplete: 'email' }); em.value = learner.email || '';
    const ans = h('textarea', { id: 'nAns', rows: '4' }); guard(ans);
    const bar = h('textarea', { id: 'nBar', rows: '2' }); guard(bar);
    form.appendChild(h('div', { class: 'field' }, h('label', { for: 'nName', text: 'Full name' }), nm));
    form.appendChild(h('div', { class: 'field' }, h('label', { for: 'nEmail', text: 'Email' }), em));
    form.appendChild(h('div', { class: 'field' }, h('label', { for: 'nAns', text: n.question }), ans));
    const used = h('fieldset', { class: 'field' }, h('legend', { class: 'label', style: 'font-weight:600;margin-bottom:6px', text: 'Did you use something from the course since you finished?' }));
    ['Yes, I used it', 'Not yet'].forEach((v, i) => { const r = h('input', { type: 'radio', name: 'nUsed', id: 'nUsed' + i, value: v }); used.appendChild(h('label', { class: 'radio-opt', for: 'nUsed' + i, style: 'margin-bottom:8px' }, r, h('span', { text: v }))); });
    form.appendChild(used);
    form.appendChild(h('div', { class: 'field' }, h('label', { for: 'nBar', text: 'What did you use, or what got in the way? (optional)' }), bar));
    const msg = h('div', { 'aria-live': 'polite' });
    form.appendChild(msg);
    form.appendChild(h('button', { type: 'submit', class: 'btn primary', text: 'Send my reply' }));
    form.addEventListener('submit', (e) => {
      e.preventDefault(); msg.textContent = '';
      const u = form.querySelector('input[name=nUsed]:checked');
      const v = validText(ans.value);
      if (nm.value.trim().length < 2) { msg.appendChild(h('p', { class: 'field-msg', text: 'Please enter your name.' })); nm.focus(); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em.value.trim())) { msg.appendChild(h('p', { class: 'field-msg', text: 'Please enter a valid email.' })); em.focus(); return; }
      if (!v.ok) { msg.appendChild(h('p', { class: 'field-msg', text: v.msg })); ans.focus(); return; }
      if (!u) { msg.appendChild(h('p', { class: 'field-msg', text: 'Choose whether you have used something from the course.' })); form.querySelector('input[name=nUsed]').focus(); return; }
      enqueue({ type: 'nudge', course: RAW.id, week: week === '1' ? 1 : 4, submittedAt: new Date().toISOString(), name: nm.value.trim(), email: em.value.trim(), answer: ans.value.trim(), used: u.value, note: bar.value.trim() });
      form.textContent = '';
      form.appendChild(h('h1', { text: 'Thank you' }));
      form.appendChild(A.feedback(true, C.dataCapture.endpoint ? 'Your reply has been recorded.' : 'Your reply is saved on this device.', null));
      form.appendChild(h('div', { class: 'callout', style: 'margin-top:16px' }, h('span', { class: 'label', text: 'Compare with a model answer' }), h('p', { text: n.model })));
    });
    wrap.appendChild(form);
    document.body.insertBefore(wrap, $('bottombar'));
    wrap.focus();
  }

  /* ---------- boot ---------- */
  function boot() {
    loadState();
    buildCourse();
    if (!state.current || idx(state.current) === -1) state.current = LESSONS[0].L.id;
    if (!storageOk) { const w = $('storageWarning'); w.hidden = false; w.textContent = 'Your browser is not saving progress (private mode or blocked storage). Keep this tab open until you finish, or download your PDF as you go.'; }
    go(state.current, { noFocus: true });
    flush();
  }
  function init() {
    const hash = location.hash;
    if (hash === '#nudge1' || hash === '#nudge4') return nudgePage(hash.slice(-1));
    $('menuBtn').addEventListener('click', () => {
      const open = !document.body.classList.contains('drawer-open');
      document.body.classList.toggle('drawer-open', open);
      $('menuBtn').setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) { const a = document.querySelector('#sidebar .lesson-btn.active') || document.querySelector('#sidebar button'); if (a) a.focus(); }
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.body.classList.contains('drawer-open')) { document.body.classList.remove('drawer-open'); $('menuBtn').setAttribute('aria-expanded', 'false'); $('menuBtn').focus(); } });
    $('panelToggle').addEventListener('click', () => {
      const hidden = document.body.classList.toggle('panel-hidden');
      $('panelToggle').setAttribute('aria-expanded', hidden ? 'false' : 'true');
      $('panelToggle').setAttribute('aria-label', hidden ? 'Show course content' : 'Hide course content');
      try { localStorage.setItem(PREFIX + 'panel', hidden ? '1' : '0'); } catch (e) { /* ignore */ }
    });
    try { if (localStorage.getItem(PREFIX + 'panel') === '1') $('panelToggle').click(); } catch (e) { /* ignore */ }
    buildCourse();
    if (!learner.name || !learner.email) { loadState(); state.current = state.current || LESSONS[0].L.id; renderLesson(); refreshChrome(); showGate(); return; }
    boot();
  }
  window.addEventListener('beforeunload', () => { if (state) saveState(); });
  init();
})();
