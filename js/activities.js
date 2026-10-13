/* Activity renderers. Each takes (el, lesson, api) and draws into el.
   All learner text is inserted with textContent, never innerHTML. */
(function () {
  'use strict';

  /* ---------- tiny DOM helper ---------- */
  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    if (props) {
      for (const k of Object.keys(props)) {
        const v = props[k];
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'html') el.innerHTML = v;
        else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
        else if (k === 'style') el.setAttribute('style', v);
        else if (v === true) el.setAttribute(k, '');
        else el.setAttribute(k, v);
      }
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      el.appendChild(typeof kid === 'string' || typeof kid === 'number' ? document.createTextNode(String(kid)) : kid);
    }
    return el;
  }
  const KEYS = 'ABCDEFGH';
  const CHECK_SVG = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7"/></svg>';

  function coaching(points) {
    return h('div', { class: 'coaching', role: 'note' },
      h('h3', { text: 'Coaching key points' }),
      h('ul', null, points.map((p) => h('li', { text: p }))));
  }
  function feedback(ok, head, body) {
    return h('div', { class: 'feedback ' + (ok ? 'good' : 'bad') },
      h('span', { class: 'fb-head' }, h('span', { class: 'mark', 'aria-hidden': 'true', text: ok ? '✓ ' : '✕ ' }), head),
      body ? h('span', { text: body }) : null);
  }
  function words(s) { return (s || '').trim().split(/\s+/).filter(Boolean).length; }

  /* ---------- content blocks ---------- */
  function blocks(list, api) {
    const wrap = h('div', { class: 'blocks' });
    for (const b of list) wrap.appendChild(block(b, api));
    return wrap;
  }
  function block(b, api) {
    switch (b.t) {
      case 'p': return h('p', { text: b.x });
      case 'h': return h('h3', { text: b.x });
      case 'ul': return h('ul', null, b.items.map((x) => h('li', { text: x })));
      case 'ol': return h('ol', null, b.items.map((x) => h('li', { text: x })));
      case 'callout': return h('div', { class: 'callout' }, h('span', { class: 'label', text: b.label }), h('p', { text: b.x }));
      case 'table': return h('div', { class: 'table-wrap' }, h('table', null,
        h('thead', null, h('tr', null, b.head.map((x) => h('th', { scope: 'col', text: x })))),
        h('tbody', null, b.rows.map((r) => h('tr', null, r.map((c) => h('td', { text: c })))))));
      case 'example': {
        const dl = h('dl');
        for (const [k, v] of b.rows) { dl.appendChild(h('dt', { text: k })); dl.appendChild(h('dd', { text: v })); }
        return h('div', { class: 'example' }, h('div', { class: 'ex-title', text: b.title }), dl);
      }
      case 'model': return model(api.course.models[b.id], b.id);
      case 'deeper': return h('details', { class: 'deeper' }, h('summary', { text: b.title }), h('div', null, blocks(b.blocks, api)));
      case 'link': return h('p', null, h('a', { href: b.href, target: '_blank', rel: 'noopener', text: b.x + ' (opens in a new tab)' }));
      default: return h('div');
    }
  }
  function model(m, id) {
    return h('figure', { class: 'model ' + id, style: 'margin:0' },
      h('figcaption', { class: 'model-title', text: m.title }),
      h('ol', null, m.steps.map(([k, v]) => h('li', null, h('div', null, h('strong', { text: k }), h('span', { text: v }))))));
  }

  /* ---------- confidence scale ---------- */
  function scaleSet(name, prompt, labels, value, onChange) {
    const fs = h('fieldset', { class: 'scale-q' }, h('legend', { text: prompt }));
    const row = h('div', { class: 'scale' });
    labels.forEach((lab, i) => {
      const id = name + '-' + i;
      const input = h('input', { type: 'radio', name, id, value: String(i + 1) });
      if (value === i + 1) input.checked = true;
      input.addEventListener('change', () => onChange(i + 1));
      row.appendChild(h('label', { for: id }, input, h('span', { text: lab })));
    });
    fs.appendChild(row);
    return fs;
  }

  /* ================= READING ================= */
  function reading(el, L, api) {
    el.appendChild(h('div', { class: 'card' }, blocks(L.blocks, api)));
    api.complete();
  }

  /* ================= WELCOME ================= */
  function welcome(el, L, api) {
    const hero = h('section', { class: 'hero' },
      h('p', { class: 'eyebrow', text: api.course.program }),
      h('h1', { text: L.title }),
      h('p', { text: L.intro }),
      h('div', { class: 'hero-facts' }, L.facts.map(([k, v]) => h('div', null, h('small', { text: k }), h('strong', { text: v })))));
    el.appendChild(hero);
    el.appendChild(h('div', { class: 'card' }, blocks(L.blocks, api)));
    const conf = api.course.confidence;
    const before = api.state.conf.before || {};
    const card = h('div', { class: 'card' },
      h('h2', { text: 'Before you start: rate your confidence' }),
      h('p', { class: 'muted', text: 'There are no right answers. You will rate the same statements at the end and see how you have changed.' }));
    conf.items.forEach((item, i) => {
      card.appendChild(scaleSet('conf-b-' + i, item, conf.scale, before[i], (v) => {
        before[i] = v; api.state.conf.before = before; api.save();
        if (conf.items.every((_, j) => before[j])) { api.complete(); api.live('Confidence check saved.'); }
      }));
    });
    el.appendChild(card);
    if (conf.items.every((_, j) => before[j])) api.complete();
  }

  /* ================= QUIZ (check for understanding) ================= */
  function quiz(el, L, api) {
    const d = api.data();
    d.q = d.q || {};
    const card = h('div', { class: 'card' });
    L.questions.forEach((q, qi) => {
      const st = d.q[q.id] || (d.q[q.id] = { tried: [], done: false });
      const order = api.shuffle(L.id + ':' + q.id, q.options.length);
      const box = h('div', { class: 'q', role: 'group', 'aria-labelledby': 'qt-' + q.id });
      box.appendChild(h('p', { class: 'q-text', id: 'qt-' + q.id, text: (qi + 1) + '. ' + q.q }));
      const list = h('ul', { class: 'option-list' });
      const fbBox = h('div', { 'aria-live': 'polite' });
      function draw() {
        list.textContent = '';
        order.forEach((oi, pos) => {
          const o = q.options[oi];
          const tried = st.tried.includes(oi);
          const cls = 'opt' + (tried ? (o.ok ? ' correct' : ' wrong') : '');
          const b = h('button', { type: 'button', class: cls, disabled: st.done || tried },
            h('span', { class: 'key', 'aria-hidden': 'true', text: KEYS[pos] }),
            h('span', null, o.t, tried ? h('span', { class: 'sr-only', text: o.ok ? ' (correct)' : ' (not correct)' }) : null));
          b.addEventListener('click', () => choose(oi));
          list.appendChild(h('li', null, b));
        });
      }
      function showFb(oi) {
        fbBox.textContent = '';
        const o = q.options[oi];
        fbBox.appendChild(feedback(!!o.ok, o.ok ? 'Correct.' : 'Not quite. Try another option.', o.fb));
      }
      function choose(oi) {
        const o = q.options[oi];
        if (!st.tried.length) api.answer(q.id, 'check', oi, !!o.ok);
        st.tried.push(oi);
        if (o.ok) st.done = true;
        api.save(); draw(); showFb(oi);
        if (L.questions.every((x) => d.q[x.id] && d.q[x.id].done)) finish();
      }
      draw();
      if (st.tried.length) showFb(st.tried[st.tried.length - 1]);
      box.appendChild(list); box.appendChild(fbBox);
      card.appendChild(box);
    });
    el.appendChild(card);
    function finish() { api.complete(); }
    if (L.questions.every((x) => d.q[x.id] && d.q[x.id].done)) finish();
  }

  /* ================= SEQUENCE ================= */
  function sequence(el, L, api) {
    const d = api.data();
    const n = L.items.length;
    if (!d.placed) { d.placed = Array(n).fill(null); d.locked = Array(n).fill(false); d.wrong = Array(n).fill(false); d.checks = 0; }
    const poolOrder = api.shuffle(L.id + ':pool', n);
    const card = h('div', { class: 'card' });
    card.appendChild(h('p', { class: 'instruction', text: L.intro }));
    const grid = h('div', { class: 'seq-grid' });
    const poolCol = h('div', { class: 'seq-col' }, h('h3', { id: L.id + '-pool', text: 'Links to place' }));
    const slotCol = h('div', { class: 'seq-col' }, h('h3', { id: L.id + '-slots', text: 'Your chain' }));
    const pool = h('ul', { class: 'seq-pool', 'aria-labelledby': L.id + '-pool' });
    const slots = h('ol', { class: 'seq-slots', 'aria-labelledby': L.id + '-slots' });
    poolCol.appendChild(pool); slotCol.appendChild(slots);
    grid.appendChild(poolCol); grid.appendChild(slotCol);
    card.appendChild(grid);
    const actions = h('div', { class: 'btn-row' });
    const checkBtn = h('button', { type: 'button', class: 'btn primary', text: 'Check order' });
    actions.appendChild(checkBtn);
    const fb = h('div', { 'aria-live': 'polite' });
    card.appendChild(actions); card.appendChild(fb);
    const coachBox = h('div');
    card.appendChild(coachBox);
    el.appendChild(card);

    const byId = (id) => L.items.find((x) => x.id === id);
    function chip(item, extra, label) {
      return h('button', { type: 'button', class: 'chip' + (extra || ''), 'aria-label': label },
        h('strong', { text: item.t }), h('span', { text: item.d }));
    }
    function draw() {
      pool.textContent = ''; slots.textContent = '';
      const placedIds = d.placed.filter(Boolean);
      poolOrder.map((i) => L.items[i]).filter((it) => !placedIds.includes(it.id)).forEach((it) => {
        const b = chip(it, '', it.t + ': place in the next empty position');
        b.addEventListener('click', () => {
          const slot = d.placed.indexOf(null);
          if (slot === -1) return;
          d.placed[slot] = it.id; d.wrong[slot] = false; api.save(); draw();
          api.live(it.t + ' placed in position ' + (slot + 1) + '.');
        });
        pool.appendChild(h('li', null, b));
      });
      if (!pool.children.length) pool.appendChild(h('li', { class: 'saved-note', text: 'All links are placed.' }));
      for (let s = 0; s < n; s++) {
        const id = d.placed[s];
        const body = h('div', { class: 'slot-body' });
        if (id) {
          const it = byId(id);
          const extra = d.locked[s] ? ' ok' : d.wrong[s] ? ' no' : '';
          const b = chip(it, extra, it.t + ' in position ' + (s + 1) + (d.locked[s] ? ', correct' : d.wrong[s] ? ', not in the right position; select to return it' : '; select to return it'));
          if (d.locked[s]) { b.disabled = true; b.appendChild(h('span', { class: 'verdict', text: '✓ Correct position' })); }
          else {
            if (d.wrong[s]) b.appendChild(h('span', { class: 'verdict', text: '✕ ' + L.wrong }));
            b.addEventListener('click', () => { d.placed[s] = null; d.wrong[s] = false; api.save(); draw(); api.live(it.t + ' returned to the list.'); });
          }
          body.appendChild(b);
        } else body.appendChild(h('div', { class: 'empty', text: 'Empty' }));
        slots.appendChild(h('li', { class: 'slot' }, h('span', { class: 'slot-n', text: L.slotLabel + ' ' + (s + 1) }), body));
      }
      checkBtn.disabled = d.placed.includes(null) || d.locked.every(Boolean);
      if (d.locked.every(Boolean)) done();
    }
    checkBtn.addEventListener('click', () => {
      d.checks++;
      let right = 0;
      for (let s = 0; s < n; s++) {
        const ok = d.placed[s] === L.items[s].id;
        d.locked[s] = ok; d.wrong[s] = !ok; if (ok) right++;
      }
      if (d.checks === 1) api.answer(L.id, 'sequence', right + '/' + n, right === n);
      api.save();
      fb.textContent = '';
      if (right === n) fb.appendChild(feedback(true, 'Your chain is in order.', null));
      else fb.appendChild(feedback(false, right + ' of ' + n + ' links are in the right position.', 'Return the marked links and try again. ' + L.wrong));
      draw();
    });
    let shown = false;
    function done() {
      if (shown) return; shown = true;
      coachBox.appendChild(coaching(L.coaching));
      api.complete();
    }
    draw();
  }

  /* ================= SORT ================= */
  function sort(el, L, api) {
    const d = api.data();
    if (!d.place) { d.place = {}; d.locked = {}; d.wrong = {}; d.checks = 0; }
    const order = api.shuffle(L.id + ':items', L.items.length).map((i) => L.items[i]);
    let picked = null;
    const card = h('div', { class: 'card' });
    card.appendChild(h('p', { class: 'instruction', text: L.intro }));
    const pool = h('div', { class: 'sort-pool', role: 'list', 'aria-label': 'Cases to place' });
    const buckets = h('div', { class: 'buckets' });
    const bucketEls = L.buckets.map((name, bi) => {
      const list = h('div', { role: 'list', 'aria-label': name });
      const b = h('div', { class: 'bucket' }, h('h3', { text: name }), list);
      b.addEventListener('dragover', (e) => { e.preventDefault(); b.classList.add('over'); });
      b.addEventListener('dragleave', () => b.classList.remove('over'));
      b.addEventListener('drop', (e) => {
        e.preventDefault(); b.classList.remove('over');
        const id = e.dataTransfer.getData('text/plain');
        if (id && !d.locked[id]) move(id, bi);
      });
      buckets.appendChild(b);
      return list;
    });
    const checkBtn = h('button', { type: 'button', class: 'btn primary', text: 'Check my sort' });
    const fb = h('div', { 'aria-live': 'polite' });
    const coachBox = h('div');
    card.appendChild(pool); card.appendChild(buckets);
    card.appendChild(h('div', { class: 'btn-row' }, checkBtn)); card.appendChild(fb); card.appendChild(coachBox);
    el.appendChild(card);

    function move(id, bi) {
      d.place[id] = bi; d.wrong[id] = false; picked = null; api.save(); draw();
      api.live('Moved to ' + (bi == null ? 'the list' : L.buckets[bi]) + '.');
    }
    function itemEl(it) {
      const locked = !!d.locked[it.id];
      const wrap = h('div', { class: 'sort-item' + (locked ? ' ok' : d.wrong[it.id] ? ' no' : '') + (picked === it.id ? ' picked' : ''), role: 'listitem', draggable: locked ? 'false' : 'true' });
      wrap.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', it.id); e.dataTransfer.effectAllowed = 'move'; });
      const btn = h('button', { type: 'button', class: 'card-btn', 'aria-expanded': picked === it.id ? 'true' : 'false', disabled: locked }, it.t);
      btn.addEventListener('click', () => { picked = picked === it.id ? null : it.id; draw(); const mv = card.querySelector('.move-row .btn'); if (mv) mv.focus(); });
      wrap.appendChild(btn);
      if (locked) wrap.appendChild(h('div', { class: 'verdict', text: '✓ ' + it.fb }));
      else if (d.wrong[it.id]) wrap.appendChild(h('div', { class: 'verdict', text: '✕ Not this bucket. Compare every field, then move it.' }));
      if (picked === it.id) {
        const row = h('div', { class: 'move-row' }, h('span', { class: 'label', text: 'Move to…' }));
        L.buckets.forEach((name, bi) => {
          if (d.place[it.id] === bi) return;
          row.appendChild(h('button', { type: 'button', class: 'btn', onclick: () => move(it.id, bi) }, name));
        });
        if (d.place[it.id] != null) row.appendChild(h('button', { type: 'button', class: 'btn', onclick: () => move(it.id, null) }, 'Back to the list'));
        wrap.appendChild(row);
      }
      return wrap;
    }
    function draw() {
      pool.textContent = ''; bucketEls.forEach((b) => (b.textContent = ''));
      order.forEach((it) => {
        const bi = d.place[it.id];
        (bi == null ? pool : bucketEls[bi]).appendChild(itemEl(it));
      });
      if (!pool.children.length) pool.appendChild(h('p', { class: 'saved-note', text: 'All cases are placed.' }));
      const allPlaced = L.items.every((it) => d.place[it.id] != null);
      const allLocked = L.items.every((it) => d.locked[it.id]);
      checkBtn.disabled = !allPlaced || allLocked;
      if (allLocked) done();
    }
    checkBtn.addEventListener('click', () => {
      d.checks++;
      let right = 0;
      L.items.forEach((it) => {
        const ok = d.place[it.id] === it.b;
        if (ok) { d.locked[it.id] = true; d.wrong[it.id] = false; right++; } else d.wrong[it.id] = true;
        if (d.checks === 1) api.answer(L.id + ':' + it.id, 'sort', d.place[it.id], ok);
      });
      api.save();
      fb.textContent = '';
      if (right === L.items.length) fb.appendChild(feedback(true, 'Every case is in the right bucket.', null));
      else fb.appendChild(feedback(false, (L.items.length - right) + ' case' + (L.items.length - right === 1 ? ' is' : 's are') + ' in the wrong bucket.', 'Those cases are marked. Compare each field of the schedule with the approval, then move them.'));
      draw();
    });
    let shown = false;
    function done() { if (shown) return; shown = true; coachBox.appendChild(coaching(L.coaching)); api.complete(); }
    draw();
  }

  /* ================= HUNT (annotation) ================= */
  function hunt(el, L, api) {
    const d = api.data();
    if (!d.flags) { d.flags = {}; d.found = {}; d.falses = {}; d.checks = 0; d.revealed = false; }
    const targets = [];
    L.docs.forEach((doc) => { if (!doc.reference) doc.fields.forEach((f) => { if (f.issue) targets.push(f.id); }); });
    const card = h('div', { class: 'card' });
    card.appendChild(h('p', { class: 'instruction', text: L.intro }));
    card.appendChild(h('div', { class: 'hints' }, h('strong', { text: 'Look for:' }), h('ul', null, L.hints.map((x) => h('li', { text: x })))));
    const docsEl = h('div', { class: 'docs', style: 'margin-top:16px' });
    card.appendChild(docsEl);
    const status = h('p', { class: 'hunt-score', style: 'margin-top:16px', 'aria-live': 'polite' });
    const checkBtn = h('button', { type: 'button', class: 'btn primary', text: 'Check my finds' });
    const revealBtn = h('button', { type: 'button', class: 'btn', text: 'Show the remaining issues', hidden: true });
    const fb = h('div', { 'aria-live': 'polite' });
    const coachBox = h('div');
    card.appendChild(status);
    card.appendChild(h('div', { class: 'btn-row' }, checkBtn, revealBtn));
    card.appendChild(fb); card.appendChild(coachBox);
    el.appendChild(card);

    function draw() {
      docsEl.textContent = '';
      L.docs.forEach((doc) => {
        const fields = h('div', { class: 'doc-fields' });
        doc.fields.forEach((f) => {
          if (doc.reference) { fields.appendChild(h('div', { class: 'doc-row' }, h('span', { class: 'k', text: f.label }), h('span', { class: 'v', text: f.value }))); return; }
          const found = d.found[f.id], fls = d.falses[f.id], flagged = d.flags[f.id];
          const state = found ? (found === 'revealed' ? 'Issue (shown)' : 'Issue found') : fls ? 'Not an issue' : flagged ? 'Flagged' : 'Select to flag';
          const b = h('button', { type: 'button', class: 'flag-btn' + (found ? ' found' : fls ? ' false' : ''), 'aria-pressed': flagged && !found ? 'true' : 'false', disabled: !!found },
            h('span', { class: 'k', text: f.label }), h('span', { class: 'v', text: f.value }),
            h('span', { class: 'f' }, (found ? '✓ ' : fls ? '✕ ' : '') + state));
          if (found || fls) b.appendChild(h('span', { class: 'flag-explain', text: f.fb }));
          b.addEventListener('click', () => {
            d.flags[f.id] = !d.flags[f.id]; if (d.flags[f.id]) delete d.falses[f.id];
            api.save(); draw();
            const again = docsEl.querySelector('[data-fid="' + f.id + '"]'); if (again) again.focus();
          });
          b.setAttribute('data-fid', f.id);
          fields.appendChild(b);
        });
        docsEl.appendChild(h('section', { class: 'doc' + (doc.reference ? ' reference' : ''), 'aria-label': doc.title },
          h('div', { class: 'doc-head' }, h('strong', { text: doc.title + (doc.reference ? ' (reference)' : '') }), h('small', { text: doc.sub })), fields));
      });
      const n = targets.filter((t) => d.found[t]).length;
      status.textContent = 'Issues found: ' + n + ' of ' + targets.length;
      checkBtn.disabled = n === targets.length;
      revealBtn.hidden = !(d.checks >= 3 && n < targets.length);
      if (n === targets.length) done();
    }
    checkBtn.addEventListener('click', () => {
      d.checks++;
      let newFound = 0, newFalse = 0;
      Object.keys(d.flags).forEach((id) => {
        if (!d.flags[id] || d.found[id]) return;
        if (targets.includes(id)) { d.found[id] = true; newFound++; } else { d.falses[id] = true; newFalse++; }
        d.flags[id] = false;
      });
      if (d.checks === 1) targets.forEach((t) => api.answer(L.id + ':' + t, 'hunt', d.found[t] ? 'found' : 'missed', !!d.found[t]));
      api.save();
      const n = targets.filter((t) => d.found[t]).length;
      fb.textContent = '';
      if (n === targets.length) fb.appendChild(feedback(true, 'You found every issue.', null));
      else {
        const parts = [];
        if (newFound) parts.push(newFound + ' new issue' + (newFound > 1 ? 's' : '') + ' found.');
        if (newFalse) parts.push(newFalse + ' flagged field' + (newFalse > 1 ? 's are' : ' is') + ' fine; the reason is shown.');
        if (!newFound && !newFalse) parts.push('Select the fields you think have a problem, then check again.');
        parts.push((targets.length - n) + ' still to find. Use the “Look for” list.');
        fb.appendChild(feedback(false, 'Keep going.', parts.join(' ')));
      }
      draw();
    });
    revealBtn.addEventListener('click', () => { targets.forEach((t) => { if (!d.found[t]) d.found[t] = 'revealed'; }); d.revealed = true; api.save(); draw(); });
    let shown = false;
    function done() { if (shown) return; shown = true; coachBox.appendChild(coaching(L.coaching)); api.complete(); }
    draw();
  }

  /* ================= SIMULATION ================= */
  function sim(el, L, api) {
    const d = api.data();
    if (d.step == null) { d.step = 0; d.tried = {}; d.first = []; }
    const card = h('div', { class: 'card' });
    card.appendChild(h('p', { class: 'instruction', text: L.intro }));
    const transcript = h('div', { class: 'transcript', role: 'log', 'aria-label': 'Conversation transcript' });
    const stage = h('div');
    card.appendChild(transcript); card.appendChild(stage);
    el.appendChild(card);
    const themLine = (i) => (i === 0 ? (L.opening || L.steps[0].line) : L.steps[i - 1].reply);
    const bubble = (who, cls, text) => h('div', { class: 'bubble ' + cls }, h('span', { class: 'who', text: who }), text);

    function draw() {
      transcript.textContent = ''; stage.textContent = '';
      for (let i = 0; i < d.step; i++) {
        transcript.appendChild(bubble(L.them, 'them', themLine(i)));
        const ok = L.steps[i].options.find((o) => o.ok);
        transcript.appendChild(bubble(L.you, 'you', ok.t));
      }
      if (d.step < L.steps.length) {
        const i = d.step, st = L.steps[i];
        transcript.appendChild(bubble(L.them, 'them', themLine(i)));
        const tried = d.tried[i] || [];
        const order = api.shuffle(L.id + ':' + i, st.options.length);
        stage.appendChild(h('span', { class: 'ladder-tag', text: 'Step ' + (i + 1) + ' of ' + L.steps.length + ' · ' + st.ladder }));
        stage.appendChild(h('p', { class: 'q-text', text: 'What do you say?' }));
        const list = h('ul', { class: 'option-list' });
        order.forEach((oi, pos) => {
          const o = st.options[oi];
          const was = tried.includes(oi);
          const b = h('button', { type: 'button', class: 'opt' + (was ? ' wrong' : ''), disabled: was },
            h('span', { class: 'key', 'aria-hidden': 'true', text: KEYS[pos] }), h('span', null, o.t, was ? h('span', { class: 'sr-only', text: ' (tried, not the best choice)' }) : null));
          b.addEventListener('click', () => choose(i, oi));
          list.appendChild(h('li', null, b));
        });
        stage.appendChild(list);
        const fbBox = h('div', { 'aria-live': 'polite' });
        if (tried.length) {
          const last = st.options[tried[tried.length - 1]];
          fbBox.appendChild(feedback(false, 'Consider the consequence.', last.fb + ' Try again.'));
        }
        stage.appendChild(fbBox);
      } else {
        transcript.appendChild(bubble(L.them, 'them', L.steps[L.steps.length - 1].reply));
        const score = d.first.filter(Boolean).length;
        stage.appendChild(feedback(true, 'Conversation complete.', 'First-try score: ' + score + ' of ' + L.steps.length + '.'));
        if (L.summary) {
          const tbl = h('div', { class: 'table-wrap summary-table' }, h('table', null,
            h('caption', { class: 'sr-only', text: L.summary.title }),
            h('thead', null, h('tr', null, h('th', { scope: 'col', colspan: '2', text: L.summary.title }))),
            h('tbody', null, L.summary.rows.map(([k, v]) => h('tr', null, h('td', { text: k }), h('td', { text: v }))))));
          stage.appendChild(tbl);
        }
        stage.appendChild(coaching(L.coaching));
        api.complete();
      }
    }
    function choose(i, oi) {
      const o = L.steps[i].options[oi];
      const tried = d.tried[i] || (d.tried[i] = []);
      if (d.first[i] == null) { d.first[i] = !!o.ok && tried.length === 0; api.answer(L.id + ':' + i, 'sim', oi, !!o.ok); }
      if (o.ok) {
        d.step = i + 1; api.save(); draw();
        api.live('Good choice. ' + o.fb + ' ' + (i + 1 < L.steps.length ? L.them + ' replies: ' + L.steps[i].reply : ''));
        const next = stage.querySelector('.opt'); if (next) next.focus();
      } else {
        tried.push(oi); api.save(); draw();
        const first = stage.querySelector('.opt:not(:disabled)'); if (first) first.focus();
      }
    }
    draw();
  }

  /* ================= REFLECTION ================= */
  function reflect(el, L, api) {
    const d = api.data();
    d.answers = d.answers || {};
    const card = h('div', { class: 'card' });
    const inputs = {};
    L.prompts.forEach((p) => {
      const id = L.id + '-' + p.id;
      const ta = h('textarea', { id, rows: String(Math.max(3, Math.ceil(p.expectWords / 12))), 'aria-describedby': id + '-msg' });
      ta.value = d.answers[p.id] || '';
      ta.addEventListener('input', () => { d.answers[p.id] = ta.value; api.saveSoon(); });
      api.guard(ta);
      const msg = h('div', { id: id + '-msg', 'aria-live': 'polite' });
      inputs[p.id] = { ta, msg };
      card.appendChild(h('div', { class: 'field' }, h('label', { for: id, text: p.q }), ta, msg));
    });
    const saveBtn = h('button', { type: 'button', class: 'btn primary', text: d.saved ? 'Update my answers' : 'Save my answers' });
    const after = h('div');
    card.appendChild(h('div', { class: 'btn-row' }, saveBtn));
    card.appendChild(after);
    el.appendChild(card);
    function showAfter() {
      after.textContent = '';
      after.appendChild(feedback(true, 'Saved.', 'Your answers are in your PDF.'));
      if (L.model) after.appendChild(h('div', { class: 'callout', style: 'margin-top:16px' }, h('span', { class: 'label', text: 'One way to say it' }), L.model.map((m) => h('p', { text: m }))));
      after.appendChild(coaching(L.coaching));
    }
    saveBtn.addEventListener('click', () => {
      let ok = true, firstBad = null;
      L.prompts.forEach((p) => {
        const { ta, msg } = inputs[p.id];
        const v = api.validText(ta.value);
        msg.textContent = '';
        if (!v.ok) { ok = false; msg.appendChild(h('p', { class: 'field-msg', text: v.msg })); firstBad = firstBad || ta; }
      });
      if (!ok) { firstBad.focus(); return; }
      L.prompts.forEach((p) => { d.answers[p.id] = inputs[p.id].ta.value.trim(); });
      d.saved = true; api.save(); saveBtn.textContent = 'Update my answers';
      showAfter(); api.complete(); api.live('Answers saved.');
    });
    if (d.saved) { showAfter(); api.complete(); }
  }

  /* ================= TYPING DRILL ================= */
  function norm(type, s) {
    s = String(s || '').replace(/[‘’]/g, "'").trim();
    switch (type) {
      case 'name': return s.replace(/\s+/g, ' ').toLowerCase();
      case 'id': return s.replace(/\s+/g, '').toUpperCase();
      case 'phone': { let x = s.replace(/\D/g, ''); if (x.length === 11 && x[0] === '1') x = x.slice(1); return x; }
      case 'date': { const m = s.match(/^(\d{1,2})\s*[\/\-.]\s*(\d{1,2})\s*[\/\-.]\s*(\d{4})$/); return m ? m[1].padStart(2, '0') + '/' + m[2].padStart(2, '0') + '/' + m[3] : s; }
      case 'select': return s;
      default: return s.replace(/[.,]/g, '').replace(/\s+/g, ' ').toLowerCase();
    }
  }
  const TYPE_TIPS = {
    name: 'Check spelling and hyphens letter by letter.',
    id: 'Compare character by character. Watch O and 0, I and 1, and hyphens.',
    phone: 'Check every digit.',
    date: 'Use MM/DD/YYYY and check the digits.',
    text: 'Check the number, street name and unit.',
    select: 'Check the relationship on the card.'
  };
  function typing(el, L, api) {
    const d = api.data();
    d.rounds = d.rounds || {};
    d.best = d.best || { wpm: 0, acc: 0 };
    if (d.round == null) d.round = 0;
    const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    const card = h('div', { class: 'card' });
    card.appendChild(h('p', { class: 'instruction', text: L.intro }));
    const tabs = h('div', { class: 'round-tabs', role: 'group', 'aria-label': 'Records' });
    const body = h('div');
    const coachBox = h('div');
    card.appendChild(tabs); card.appendChild(body); card.appendChild(coachBox);
    el.appendChild(card);

    function drawTabs() {
      tabs.textContent = '';
      L.rounds.forEach((r, i) => {
        const rd = d.rounds[r.id];
        const prev = i === 0 ? null : (d.rounds[L.rounds[i - 1].id] || {});
        const unlocked = i === 0 || prev.done || prev.wasDone;
        tabs.appendChild(h('button', { type: 'button', class: 'btn' + (d.round === i ? ' primary' : ''), disabled: !unlocked, 'aria-pressed': d.round === i ? 'true' : 'false', onclick: () => { d.round = i; api.save(); drawTabs(); drawRound(); } },
          (rd && (rd.done || rd.wasDone) ? '✓ ' : '') + 'Record ' + (i + 1)));
      });
    }
    function drawRound() {
      body.textContent = '';
      const r = L.rounds[d.round];
      const rd = d.rounds[r.id] || (d.rounds[r.id] = { values: {}, checks: 0 });
      const left = h('div', null,
        h('div', { class: 'ins-card', 'aria-label': 'Insurance card' },
          h('div', { class: 'ic-head', text: r.card.payer }),
          h('dl', null, r.card.rows.map(([k, v]) => [h('dt', { text: k }), h('dd', { class: /ID|Group/.test(k) ? 'mono' : '', text: v })]).flat())),
        h('div', { class: 'call-notes' }, h('strong', { text: 'Call notes' }), h('ul', null, r.notes.map((x) => h('li', { text: x })))));
      const form = h('form', { class: 'type-form', novalidate: true });
      const els = {};
      r.fields.forEach((f) => {
        const id = L.id + '-' + r.id + '-' + f.id;
        let input;
        if (f.type === 'select') {
          input = h('select', { id }, h('option', { value: '', text: 'Select…' }), f.options.map((o) => h('option', { value: o, text: o })));
        } else {
          input = h('input', { id, type: 'text', autocomplete: 'off', spellcheck: 'false', autocapitalize: f.type === 'id' ? 'characters' : 'off', class: f.type === 'id' ? 'mono' : '' });
          api.guard(input);
        }
        input.value = rd.values[f.id] || '';
        const start = () => { if (!rd.startedAt && !rd.firstCheck) { rd.startedAt = Date.now(); } };
        input.addEventListener('focus', start);
        input.addEventListener('input', () => { start(); rd.values[f.id] = input.value; api.saveSoon(); });
        input.addEventListener('change', () => { start(); rd.values[f.id] = input.value; api.saveSoon(); });
        const fbEl = h('div', { class: 'fld-fb', id: id + '-fb', 'aria-live': 'polite' });
        input.setAttribute('aria-describedby', id + '-fb');
        const wrap = h('div', { class: 'field' }, h('label', { for: id, text: f.label }), input, fbEl);
        els[f.id] = { input, fbEl, wrap };
        form.appendChild(wrap);
      });
      const checkBtn = h('button', { type: 'submit', class: 'btn primary', text: rd.done ? 'Record complete' : 'Check record', disabled: !!rd.done });
      const retryBtn = h('button', { type: 'button', class: 'btn', text: 'Retry for a personal best', hidden: !rd.done });
      form.appendChild(h('div', { class: 'btn-row' }, checkBtn, retryBtn));
      const result = h('div', { 'aria-live': 'polite' });
      form.appendChild(result);
      body.appendChild(h('div', { class: 'type-grid' }, left, form));

      function mark(showAll) {
        let right = 0;
        r.fields.forEach((f) => {
          const ok = norm(f.type, rd.values[f.id]) === norm(f.type, f.answer);
          if (ok) right++;
          const e = els[f.id];
          e.wrap.classList.toggle('good', ok && showAll);
          e.wrap.classList.toggle('bad', !ok && showAll);
          e.fbEl.textContent = showAll ? (ok ? '✓ Correct' : '✕ Does not match the source. ' + (TYPE_TIPS[f.type] || '')) : '';
        });
        return right;
      }
      function showMetrics() {
        result.textContent = '';
        if (!rd.firstCheck) return;
        const fc = rd.firstCheck;
        const m = h('div', { class: 'metrics' },
          h('div', { class: 'metric' }, h('small', { text: 'Speed (first check)' }), h('strong', { text: fc.wpm + ' WPM' })),
          h('div', { class: 'metric' }, h('small', { text: 'Accuracy (first check)' }), h('strong', { text: fc.acc + '%' })),
          h('div', { class: 'metric' }, h('small', { text: 'Personal best' }), h('strong', { text: d.best.wpm + ' WPM' })));
        result.appendChild(m);
        const ref = fc.mobile ? 'Typed on an on-screen keyboard, so the desktop reference does not apply.' : 'Reference for desktop keyboards: ' + L.targetWpm + '+ WPM with every field correct.';
        result.appendChild(h('p', { class: 'saved-note', style: 'margin-top:8px', text: ref }));
      }
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (rd.done) return;
        r.fields.forEach((f) => { rd.values[f.id] = els[f.id].input.value; });
        rd.checks = (rd.checks || 0) + 1;
        const right = mark(true);
        if (!rd.firstCheck) {
          const mins = Math.max((Date.now() - (rd.startedAt || Date.now())) / 60000, 1 / 60);
          const chars = r.fields.filter((f) => f.type !== 'select').reduce((n, f) => n + String(rd.values[f.id] || '').length, 0);
          const wpm = Math.min(Math.round(chars / 5 / mins), 250);
          const acc = Math.round((right / r.fields.length) * 100);
          rd.firstCheck = { wpm, acc, mobile: coarse };
          api.answer(L.id + ':' + r.id, 'typing', wpm + 'wpm/' + acc + '%', acc === 100);
          if (wpm > d.best.wpm) d.best.wpm = wpm;
          if (acc > d.best.acc) d.best.acc = acc;
        }
        if (right === r.fields.length) {
          rd.done = true; checkBtn.disabled = true; checkBtn.textContent = 'Record complete'; retryBtn.hidden = false;
          api.save(); showMetrics();
          result.prepend(feedback(true, 'Every field is correct.', d.round < L.rounds.length - 1 ? 'Go on to the next record.' : null));
          drawTabs();
          if (L.rounds.every((x) => { const rr = d.rounds[x.id] || {}; return rr.done || rr.wasDone; })) done();
        } else {
          api.save(); showMetrics();
          result.prepend(feedback(false, (r.fields.length - right) + ' field' + (r.fields.length - right > 1 ? 's do' : ' does') + ' not match.', 'Fix the marked fields and check again. Your speed is measured on the first check only.'));
          const bad = form.querySelector('.field.bad input, .field.bad select'); if (bad) bad.focus();
        }
      });
      retryBtn.addEventListener('click', () => {
        // A retry keeps completion (wasDone); a fresh first check can raise the personal best.
        d.rounds[r.id] = { values: {}, checks: 0, done: false, wasDone: true };
        api.save(); drawRound();
        const f = body.querySelector('input'); if (f) f.focus();
      });
      if (rd.checks) { mark(true); showMetrics(); }
    }
    let shown = false;
    function done() { if (shown) return; shown = true; coachBox.appendChild(coaching(L.coaching)); api.complete(); }
    drawTabs(); drawRound();
    if (L.rounds.every((x) => { const rr = d.rounds[x.id] || {}; return rr.done || rr.wasDone; })) done();
  }

  /* ================= CALCULATION ================= */
  function calc(el, L, api) {
    const d = api.data();
    d.cases = d.cases || {};
    const card = h('div', { class: 'card' });
    card.appendChild(h('p', { class: 'instruction', text: L.intro }));
    const coachBox = h('div');
    L.cases.forEach((c) => {
      const st = d.cases[c.id] || (d.cases[c.id] = { tries: 0, ok: false });
      const id = L.id + '-' + c.id;
      const dl = h('dl', { class: 'calc-inputs' }, c.inputs.map(([k, v]) => [h('dt', { text: k }), h('dd', { text: v })]).flat());
      const input = h('input', { id, type: 'text', inputmode: 'decimal', autocomplete: 'off', 'aria-describedby': id + '-fb' });
      input.value = st.last || '';
      api.guard(input);
      const btn = h('button', { type: 'button', class: 'btn primary', text: 'Check' });
      const fb = h('div', { id: id + '-fb', 'aria-live': 'polite' });
      const box = h('div', { class: 'calc-case' }, h('h3', { text: c.title }), dl,
        h('label', { for: id, class: 'label', style: 'font-weight:600', text: 'Estimated patient share' }),
        h('div', { class: 'btn-row', style: 'margin-top:6px' }, h('div', { class: 'money' }, h('span', { 'aria-hidden': 'true', text: '$' }), input), btn), fb);
      function showOk() {
        fb.textContent = '';
        fb.appendChild(feedback(true, 'Correct: $' + c.answer + '.', null));
        fb.appendChild(h('ol', { class: 'steps' }, c.steps.map((s) => h('li', { text: s }))));
        input.disabled = true; btn.disabled = true;
      }
      btn.addEventListener('click', () => {
        const raw = input.value.replace(/[$,\s]/g, '');
        const val = parseFloat(raw);
        fb.textContent = '';
        if (!raw || isNaN(val)) { fb.appendChild(h('p', { class: 'field-msg', text: 'Enter a dollar amount, for example 250.' })); input.focus(); return; }
        st.tries++; st.last = input.value;
        const ok = Math.abs(val - c.answer) < 0.5;
        if (st.tries === 1) api.answer(L.id + ':' + c.id, 'calc', val, ok);
        if (ok) { st.ok = true; api.save(); showOk(); if (L.cases.every((x) => d.cases[x.id] && d.cases[x.id].ok)) done(); }
        else { api.save(); fb.appendChild(feedback(false, 'Not quite.', 'Hint: ' + c.hint + ' Then try again.')); input.focus(); }
      });
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); btn.click(); } });
      if (st.ok) showOk();
      card.appendChild(box);
    });
    card.appendChild(coachBox);
    el.appendChild(card);
    let shown = false;
    function done() { if (shown) return; shown = true; coachBox.appendChild(coaching(L.coaching)); api.complete(); }
    if (L.cases.every((x) => d.cases[x.id] && d.cases[x.id].ok)) done();
  }

  /* ================= SPOKEN REHEARSAL ================= */
  function spoken(el, L, api) {
    const d = api.data();
    d.rubric = d.rubric || L.rubric.map(() => false);
    const card = h('div', { class: 'card' });
    card.appendChild(h('p', { class: 'instruction', text: L.intro }));
    card.appendChild(h('div', { class: 'example' }, h('div', { class: 'ex-title', text: 'Your notes for the call' }),
      h('dl', null, L.scenario.map(([k, v]) => [h('dt', { text: k }), h('dd', { text: v })]).flat())));
    let left = L.seconds, tick = null, rec = null, chunks = [], stream = null;
    const timeEl = h('div', { class: 'timer', 'aria-live': 'off', text: fmt(left) });
    const canRecord = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
    const startBtn = h('button', { type: 'button', class: 'btn primary', text: canRecord ? 'Start and record' : 'Start the timer' });
    const plainBtn = canRecord ? h('button', { type: 'button', class: 'btn', text: 'Start without recording' }) : null;
    const stopBtn = h('button', { type: 'button', class: 'btn', text: 'Stop', disabled: true });
    const recNote = h('p', { class: 'saved-note', 'aria-live': 'polite', text: canRecord ? 'Your recording stays in this browser. It is never uploaded.' : 'Recording is not available here. Practise out loud with the timer instead.' });
    const audioBox = h('div');
    card.appendChild(h('div', { class: 'timer-wrap' }, timeEl, h('div', { class: 'btn-row', style: 'margin-top:0' }, startBtn, plainBtn, stopBtn)));
    card.appendChild(recNote); card.appendChild(audioBox);
    function fmt(s) { return '0:' + String(Math.max(s, 0)).padStart(2, '0'); }
    function begin(record) {
      left = L.seconds; timeEl.textContent = fmt(left);
      startBtn.disabled = true; if (plainBtn) plainBtn.disabled = true; stopBtn.disabled = false;
      tick = setInterval(() => {
        left--; timeEl.textContent = fmt(left);
        if (left === 10) api.live('10 seconds left.');
        if (left <= 0) stop(true);
      }, 1000);
      api.live('Timer started. Speak now.');
      if (record) {
        navigator.mediaDevices.getUserMedia({ audio: true }).then((s) => {
          stream = s; chunks = [];
          rec = new MediaRecorder(s);
          rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
          rec.onstop = () => {
            const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
            audioBox.textContent = '';
            audioBox.appendChild(h('p', { style: 'margin:10px 0 0;font-weight:600', text: 'Play back your answer, then complete the self-check.' }));
            const au = h('audio', { controls: true, src: URL.createObjectURL(blob) });
            audioBox.appendChild(au);
            d.recorded = true; api.save(); refresh();
            if (stream) stream.getTracks().forEach((t) => t.stop());
          };
          rec.start();
          recNote.textContent = 'Recording. Your recording stays in this browser and is never uploaded.';
        }).catch(() => { recNote.textContent = 'The microphone is not available, so the timer is running without recording. Practise out loud.'; });
      }
    }
    function stop(finished) {
      clearInterval(tick); tick = null;
      if (rec && rec.state !== 'inactive') rec.stop();
      startBtn.disabled = false; if (plainBtn) plainBtn.disabled = false; stopBtn.disabled = true;
      startBtn.textContent = canRecord ? 'Record again' : 'Start again';
      d.practised = true; api.save(); refresh();
      api.live(finished ? 'Time is up.' : 'Stopped.');
    }
    startBtn.addEventListener('click', () => begin(canRecord));
    if (plainBtn) plainBtn.addEventListener('click', () => begin(false));
    stopBtn.addEventListener('click', () => stop(false));

    const rub = h('ul', { class: 'rubric' });
    L.rubric.forEach((r, i) => {
      const id = L.id + '-r' + i;
      const cb = h('input', { type: 'checkbox', id });
      cb.checked = !!d.rubric[i];
      cb.addEventListener('change', () => { d.rubric[i] = cb.checked; api.saveSoon(); });
      rub.appendChild(h('li', null, h('label', { class: 'check', for: id }, cb, h('span', { text: r }))));
    });
    const submit = h('button', { type: 'button', class: 'btn primary', text: 'Save my self-check' });
    const hint = h('p', { class: 'saved-note' });
    const after = h('div', { 'aria-live': 'polite' });
    card.appendChild(h('h3', { style: 'margin-top:24px', text: 'Self-check: tick what you actually did' }));
    card.appendChild(rub);
    card.appendChild(h('div', { class: 'btn-row' }, submit, hint));
    card.appendChild(after);
    el.appendChild(card);
    function refresh() {
      submit.disabled = !(d.practised || d.recorded);
      hint.textContent = submit.disabled ? 'Practise once with the timer first.' : '';
    }
    function showAfter() {
      after.textContent = '';
      const missed = L.rubric.filter((_, i) => !d.rubric[i]);
      if (!missed.length) after.appendChild(feedback(true, 'All six parts covered.', 'That is a complete, safe estimate conversation.'));
      else after.appendChild(feedback(false, 'Saved. Practise once more, focusing on:', missed.join(' · ')));
      after.appendChild(coaching(L.coaching));
    }
    submit.addEventListener('click', () => {
      d.submitted = true; d.score = d.rubric.filter(Boolean).length;
      api.answer(L.id, 'spoken', d.score + '/' + L.rubric.length, d.score === L.rubric.length);
      api.save(); showAfter(); api.complete();
    });
    refresh();
    if (d.submitted) { showAfter(); api.complete(); }
    api.onLeave(() => { if (tick) clearInterval(tick); if (rec && rec.state !== 'inactive') rec.stop(); if (stream) stream.getTracks().forEach((t) => t.stop()); });
  }

  /* ================= BOARD GAME ================= */
  function board(el, L, api) {
    const d = api.data();
    if (!d.att) { d.att = {}; d.best = 0; d.plays = 1; d.countdown = true; d.secs = L.seconds; }
    const card = h('div', { class: 'card' });
    card.appendChild(h('p', { class: 'instruction', text: L.intro }));
    const cdId = L.id + '-cd', secId = L.id + '-secs';
    const cdBox = h('input', { type: 'checkbox', id: cdId });
    cdBox.checked = !!d.countdown;
    const secSel = h('select', { id: secId }, [30, 60, 120].map((s) => h('option', { value: String(s), text: s + ' seconds' })));
    secSel.value = String(d.secs || L.seconds);
    cdBox.addEventListener('change', () => { d.countdown = cdBox.checked; secSel.disabled = !cdBox.checked; api.save(); });
    secSel.addEventListener('change', () => { d.secs = parseInt(secSel.value, 10); api.save(); });
    secSel.disabled = !d.countdown;
    card.appendChild(h('div', { class: 'board-controls' },
      h('label', { for: cdId }, cdBox, 'Countdown on'),
      h('label', { for: secId }, 'Time per clue', secSel)));
    const scoreEl = h('p', { class: 'score-line', 'aria-live': 'polite' });
    const grid = h('div', { class: 'board' });
    const clueBox = h('div');
    const endBox = h('div');
    card.appendChild(scoreEl); card.appendChild(grid); card.appendChild(clueBox); card.appendChild(endBox);
    el.appendChild(card);
    let timer = null;
    api.onLeave(() => { if (timer) clearInterval(timer); });

    const score = () => L.clues.reduce((n, c) => n + (d.att[c.id] && d.att[c.id].ok ? c.value : 0), 0);
    const total = L.clues.reduce((n, c) => n + c.value, 0);
    function drawBoard() {
      grid.textContent = '';
      L.categories.forEach((cat) => {
        const col = h('div', { class: 'board-col', role: 'group', 'aria-label': cat }, h('div', { class: 'board-cat', text: cat }));
        L.clues.filter((c) => c.cat === cat).sort((a, b) => a.value - b.value).forEach((c) => {
          const a = d.att[c.id];
          const label = a ? (a.ok ? '✓ ' + c.value : a.timedOut ? '✕ Time' : '✕ ' + c.value) : String(c.value);
          const t = h('button', { type: 'button', class: 'tile', disabled: !!a, 'aria-label': cat + ' for ' + c.value + (a ? (a.ok ? ', answered correctly' : ', answered') : '') }, label);
          t.addEventListener('click', () => openClue(c));
          col.appendChild(t);
        });
        grid.appendChild(col);
      });
      scoreEl.textContent = 'Score: ' + score() + ' of ' + total + (d.best ? ' · Best: ' + d.best : '');
      const all = L.clues.every((c) => d.att[c.id]);
      if (all) finish();
    }
    function openClue(c) {
      clueBox.textContent = ''; endBox.textContent = '';
      const order = api.shuffle(L.id + ':' + c.id, c.options.length);
      const box = h('section', { class: 'clue', tabindex: '-1', 'aria-label': c.cat + ' for ' + c.value });
      const head = h('div', { class: 'clue-head' }, h('span', { class: 'cat', text: c.cat + ' · ' + c.value }), c.pressure ? h('span', { class: 'pressure', text: 'Pressure check' }) : null);
      const cdText = h('span', { class: 'countdown' });
      head.appendChild(cdText);
      box.appendChild(head);
      const bar = h('div', { class: 'cd-bar', 'aria-hidden': 'true' }, h('span', { style: 'width:100%' }));
      if (d.countdown) box.appendChild(bar);
      box.appendChild(h('p', { class: 'q-text', text: c.q }));
      const list = h('ul', { class: 'option-list' });
      const fb = h('div', { 'aria-live': 'polite' });
      const btns = [];
      order.forEach((oi, pos) => {
        const o = c.options[oi];
        const b = h('button', { type: 'button', class: 'opt' }, h('span', { class: 'key', 'aria-hidden': 'true', text: KEYS[pos] }), h('span', { text: o.t }));
        b.addEventListener('click', () => resolve(oi, false));
        btns.push([b, oi]);
        list.appendChild(h('li', null, b));
      });
      box.appendChild(list); box.appendChild(fb);
      clueBox.appendChild(box);
      box.focus();
      let left = d.secs || L.seconds;
      if (d.countdown) {
        cdText.textContent = left + ' s left';
        timer = setInterval(() => {
          left--;
          cdText.textContent = left + ' s left';
          bar.firstChild.style.width = Math.max(0, (left / (d.secs || L.seconds)) * 100) + '%';
          if (left === 10) api.live('10 seconds left.');
          if (left <= 0) resolve(null, true);
        }, 1000);
      }
      function resolve(oi, timedOut) {
        if (timer) { clearInterval(timer); timer = null; }
        const okIdx = c.options.findIndex((o) => o.ok);
        const ok = !timedOut && c.options[oi].ok;
        if (!d.firstAns) d.firstAns = {};
        if (!d.firstAns[c.id]) { d.firstAns[c.id] = true; api.answer(c.id, 'game', timedOut ? 'timeout' : oi, !!ok); }
        d.att[c.id] = { ok: !!ok, timedOut: !!timedOut, choice: oi };
        api.save();
        btns.forEach(([b, i]) => { b.disabled = true; if (i === okIdx) b.classList.add('correct'); else if (i === oi) b.classList.add('wrong'); });
        fb.textContent = '';
        if (timedOut) fb.appendChild(feedback(false, 'Time is up.', 'In real work the clock is the date of service: escalate early rather than guess late. Best answer: ' + c.options[okIdx].t));
        else fb.appendChild(feedback(ok, ok ? 'Correct. +' + c.value : 'Not this one.', c.options[oi].fb + (ok ? '' : ' Best answer: ' + c.options[okIdx].t)));
        const back = h('button', { type: 'button', class: 'btn', text: 'Back to the board' });
        back.addEventListener('click', () => { clueBox.textContent = ''; const t = grid.querySelector('.tile:not(:disabled)'); (t || scoreEl).focus(); });
        fb.appendChild(h('div', { class: 'btn-row' }, back));
        drawBoard();
      }
    }
    let shown = false;
    function finish() {
      const s = score();
      if (s > d.best) { d.best = s; api.save(); scoreEl.textContent = 'Score: ' + s + ' of ' + total + ' · Best: ' + d.best; }
      endBox.textContent = '';
      const again = h('button', { type: 'button', class: 'btn', text: 'Play again for a higher score' });
      again.addEventListener('click', () => { d.att = {}; d.plays = (d.plays || 1) + 1; api.save(); clueBox.textContent = ''; endBox.textContent = ''; shown = false; drawBoard(); });
      endBox.appendChild(feedback(true, 'Round complete: ' + s + ' of ' + total + '.', 'Your best score is kept.'));
      endBox.appendChild(h('div', { class: 'btn-row' }, again));
      endBox.appendChild(coaching(L.coaching));
      if (!shown) { shown = true; api.complete(); }
    }
    drawBoard();
  }

  /* ================= NOTE + ESCALATION ================= */
  function note(el, L, api) {
    const d = api.data();
    d.fields = d.fields || {};
    d.rubric = d.rubric || L.rubric.map(() => false);
    const card = h('div', { class: 'card' });
    card.appendChild(h('p', { class: 'instruction', text: L.intro }));
    card.appendChild(h('div', { class: 'example' }, h('div', { class: 'ex-title', text: 'Account: what you know' }),
      h('dl', null, L.record.map(([k, v]) => [h('dt', { text: k }), h('dd', { text: v })]).flat())));
    const fs = h('fieldset', { class: 'field', style: 'margin-top:22px' }, h('legend', { class: 'label', style: 'font-weight:600;margin-bottom:8px', text: 'Clearance status' }));
    const statusFb = h('div', { 'aria-live': 'polite' });
    const sgrid = h('div', { class: 'option-list' });
    L.statuses.forEach((s, i) => {
      const id = L.id + '-st' + i;
      const r = h('input', { type: 'radio', name: L.id + '-status', id, value: s });
      if (d.status === s) r.checked = true;
      r.addEventListener('change', () => {
        d.status = s; api.save();
        statusFb.textContent = '';
        statusFb.appendChild(feedback(L.okStatuses.includes(s), L.okStatuses.includes(s) ? 'Good call.' : 'Look again.', L.statusFb[s]));
      });
      sgrid.appendChild(h('label', { class: 'radio-opt', for: id }, r, h('span', { text: s })));
    });
    fs.appendChild(sgrid); fs.appendChild(statusFb);
    card.appendChild(fs);
    const inputs = {};
    L.fields.forEach((f) => {
      const id = L.id + '-' + f.id;
      const ta = h('textarea', { id, rows: String(f.rows || 3), 'aria-describedby': id + '-hint ' + id + '-msg' });
      ta.value = d.fields[f.id] || '';
      ta.addEventListener('input', () => { d.fields[f.id] = ta.value; api.saveSoon(); });
      api.guard(ta);
      const msg = h('div', { id: id + '-msg', 'aria-live': 'polite' });
      inputs[f.id] = { ta, msg, f };
      card.appendChild(h('div', { class: 'field' }, h('label', { for: id, text: f.label }), h('span', { class: 'hint', id: id + '-hint', text: f.hint }), ta, msg));
    });
    card.appendChild(h('h3', { style: 'margin-top:22px', text: 'Self-check before you submit' }));
    const rub = h('ul', { class: 'rubric' });
    L.rubric.forEach((r, i) => {
      const id = L.id + '-r' + i;
      const cb = h('input', { type: 'checkbox', id });
      cb.checked = !!d.rubric[i];
      cb.addEventListener('change', () => { d.rubric[i] = cb.checked; api.saveSoon(); });
      rub.appendChild(h('li', null, h('label', { class: 'check', for: id }, cb, h('span', { text: r }))));
    });
    card.appendChild(rub);
    const submit = h('button', { type: 'button', class: 'btn primary', text: d.submitted ? 'Update my note' : 'Submit my note' });
    const after = h('div', { 'aria-live': 'polite' });
    card.appendChild(h('div', { class: 'btn-row' }, submit));
    card.appendChild(after);
    el.appendChild(card);
    function showAfter() {
      after.textContent = '';
      after.appendChild(feedback(true, 'Saved. Your trainer receives this note with your completion record.', null));
      const m = L.model;
      after.appendChild(h('div', { class: 'example', style: 'margin-top:16px' }, h('div', { class: 'ex-title', text: 'Compare with a model answer' }),
        h('dl', null, [['Note', m.note], ['Issue', m.issue], ['Impact', m.impact], ['Evidence', m.evidence], ['Deadline', m.deadline], ['Action needed', m.action]].map(([k, v]) => [h('dt', { text: k }), h('dd', { text: v })]).flat())));
      after.appendChild(coaching(L.coaching));
    }
    submit.addEventListener('click', () => {
      let firstBad = null;
      statusFb.textContent = '';
      if (!d.status) { statusFb.appendChild(h('p', { class: 'field-msg', text: 'Choose a clearance status.' })); firstBad = fs.querySelector('input'); }
      else if (!L.okStatuses.includes(d.status)) { statusFb.appendChild(feedback(false, 'Look again.', L.statusFb[d.status])); firstBad = fs.querySelector('input:checked'); }
      Object.values(inputs).forEach(({ ta, msg, f }) => {
        msg.textContent = '';
        const v = api.validText(ta.value, f.minWords);
        if (!v.ok) { msg.appendChild(h('p', { class: 'field-msg', text: v.msg })); firstBad = firstBad || ta; }
      });
      if (firstBad) { firstBad.focus(); return; }
      Object.values(inputs).forEach(({ ta, f }) => { d.fields[f.id] = ta.value.trim(); });
      d.submitted = true; api.save(); submit.textContent = 'Update my note';
      showAfter(); api.complete(); api.live('Note saved.');
    });
    if (d.submitted) { showAfter(); api.complete(); }
  }

  /* ================= FINAL KNOWLEDGE CHECK ================= */
  function final(el, L, api) {
    const F = api.state.final;
    F.attempt = F.attempt || 1;
    F.answers = F.answers || {};
    F.history = F.history || [];
    const card = h('div', { class: 'card' });
    card.appendChild(h('p', { class: 'eyebrow', text: L.subtitle }));
    card.appendChild(h('p', { class: 'instruction', text: L.intro }));
    const resultBox = h('div', { tabindex: '-1' });
    const list = h('div');
    const submitRow = h('div', { class: 'btn-row' });
    const msg = h('div', { 'aria-live': 'polite' });
    card.appendChild(resultBox); card.appendChild(list); card.appendChild(submitRow); card.appendChild(msg);
    el.appendChild(card);

    function scoreOf(ans) {
      let right = 0, critOk = true;
      L.questions.forEach((q) => { const ok = q.options[ans[q.id]] && q.options[ans[q.id]].ok; if (ok) right++; else if (q.critical) critOk = false; });
      return { right, pct: Math.round((right / L.questions.length) * 100), critOk };
    }
    function draw() {
      list.textContent = ''; submitRow.textContent = ''; resultBox.textContent = '';
      const reveal = !!F.passed && F.submitted;
      if (F.submitted) {
        const last = F.history[F.history.length - 1];
        const pass = last.pass;
        const r = h('div', { class: 'result' + (pass ? ' pass' : '') },
          h('div', { class: 'big', text: last.pct + '%' }),
          h('p', { style: 'margin:8px 0 0;font-weight:600', text: pass ? 'Passed. Every account on tomorrow’s schedule is handled safely.' : 'Not passed yet.' }),
          h('p', { style: 'margin:6px 0 0', text: last.right + ' of ' + L.questions.length + ' correct · Best score: ' + F.best + '% · Attempt ' + last.attempt }));
        if (!pass) {
          const reasons = [];
          if (last.pct < api.course.pass) reasons.push('You need ' + api.course.pass + '% to pass.');
          if (!last.critOk) reasons.push('One or more critical decisions were missed. These are the choices that can harm a patient or a claim however well the rest goes.');
          r.appendChild(h('p', { style: 'margin:8px 0 0', text: reasons.join(' ') + ' Review the sections, then retake. Answers are shown once you pass.' }));
          const retake = h('button', { type: 'button', class: 'btn primary', text: 'Retake the check' });
          retake.addEventListener('click', () => { F.attempt++; F.answers = {}; F.submitted = false; api.save(); draw(); list.querySelector('input') && list.querySelector('input').focus(); });
          r.appendChild(h('div', { class: 'btn-row' }, retake));
        }
        resultBox.appendChild(r);
        if (!pass) return;
      }
      L.questions.forEach((q, qi) => {
        const order = api.shuffle('final:' + F.attempt + ':' + q.id, q.options.length);
        const acc = h('fieldset', { class: 'account' });
        acc.appendChild(h('legend', { class: 'sr-only', text: q.account }));
        acc.appendChild(h('div', { class: 'account-head' }, h('span', { class: 'acct', text: q.account }), q.critical ? h('span', { class: 'crit', text: 'Critical decision' }) : null));
        acc.appendChild(h('p', { class: 'q-text', text: q.q }));
        const ol = h('div', { class: 'option-list' });
        order.forEach((oi) => {
          const o = q.options[oi];
          const id = 'f-' + q.id + '-' + oi;
          const input = h('input', { type: 'radio', name: 'f-' + q.id, id, value: String(oi), disabled: F.submitted });
          if (F.answers[q.id] === oi) input.checked = true;
          input.addEventListener('change', () => { F.answers[q.id] = oi; api.save(); });
          let cls = 'radio-opt';
          if (reveal) { if (o.ok) cls += ' correct'; else if (F.answers[q.id] === oi) cls += ' wrong'; }
          const lab = h('label', { class: cls, for: id }, input, h('span', null, o.t, reveal && o.ok ? h('strong', { text: ' ✓ Best answer' }) : null, reveal && !o.ok && F.answers[q.id] === oi ? h('strong', { text: ' ✕ Your answer' }) : null));
          ol.appendChild(lab);
        });
        acc.appendChild(ol);
        if (reveal) {
          const chosen = q.options[F.answers[q.id]];
          const okO = q.options.find((o) => o.ok);
          acc.appendChild(feedback(chosen && chosen.ok, chosen && chosen.ok ? 'Correct.' : 'Why the best answer works:', (chosen && chosen.ok ? chosen.fb : okO.fb + (chosen ? ' Your choice: ' + chosen.fb : ''))));
        }
        list.appendChild(acc);
      });
      if (!F.submitted) {
        const sub = h('button', { type: 'button', class: 'btn primary', text: 'Submit my schedule' });
        sub.addEventListener('click', submit);
        submitRow.appendChild(sub);
      }
    }
    function submit() {
      msg.textContent = '';
      const missing = L.questions.map((q, i) => (F.answers[q.id] == null ? i + 1 : null)).filter(Boolean);
      if (missing.length) {
        msg.appendChild(h('p', { class: 'field-msg', text: 'Choose an answer for account' + (missing.length > 1 ? 's ' : ' ') + missing.join(', ') + '.' }));
        const first = list.querySelector('input[name="f-' + L.questions[missing[0] - 1].id + '"]'); if (first) first.focus();
        return;
      }
      const s = scoreOf(F.answers);
      const pass = s.pct >= api.course.pass && s.critOk;
      if (F.history.length === 0) L.questions.forEach((q) => api.answer(q.id, 'final', F.answers[q.id], !!q.options[F.answers[q.id]].ok));
      F.history.push({ attempt: F.attempt, pct: s.pct, right: s.right, critOk: s.critOk, pass, at: new Date().toISOString() });
      // Best score counts passing attempts once the learner has passed; before that, the best attempt so far.
      if (pass) F.best = F.passed ? Math.max(F.best || 0, s.pct) : s.pct;
      else if (!F.passed) F.best = Math.max(F.best || 0, s.pct);
      if (F.first == null) F.first = s.pct;
      F.submitted = true;
      if (pass) F.passed = true;
      api.save(); draw();
      resultBox.focus();
      api.live(pass ? 'Passed with ' + s.pct + ' percent.' : 'Not passed yet. Score ' + s.pct + ' percent.');
      if (pass) api.complete();
      api.refreshChrome();
    }
    if (F.passed && !F.submitted) { F.submitted = true; }
    draw();
    if (F.passed) api.complete();
  }

  /* ================= WRAP-UP ================= */
  function wrapup(el, L, api) {
    const d = api.data();
    d.commit = d.commit || [{ t: '', date: '' }, { t: '', date: '' }, { t: '', date: '' }];
    d.survey = d.survey || {};
    const conf = api.course.confidence;
    const after = api.state.conf.after || {};
    const card = h('div', { class: 'card' });
    card.appendChild(h('p', { class: 'instruction', text: L.intro }));
    card.appendChild(h('h2', { text: '1. Rate your confidence now' }));
    conf.items.forEach((item, i) => card.appendChild(scaleSet('conf-a-' + i, item, conf.scale, after[i], (v) => { after[i] = v; api.state.conf.after = after; api.save(); })));
    card.appendChild(h('h2', { style: 'margin-top:28px', text: '2. Your commitments' }));
    card.appendChild(h('p', { text: L.commitments.prompt }));
    card.appendChild(h('div', { class: 'callout' }, h('span', { class: 'label', text: 'Specific looks like' }), h('ul', { style: 'margin:0;padding-left:20px' }, L.commitments.examples.map((x) => h('li', { text: x })))));
    const cEls = [];
    for (let i = 0; i < L.commitments.max; i++) {
      const id = L.id + '-c' + i;
      const ta = h('textarea', { id, rows: '2', 'aria-describedby': id + '-msg' });
      ta.value = d.commit[i].t;
      ta.addEventListener('input', () => { d.commit[i].t = ta.value; api.saveSoon(); });
      api.guard(ta);
      const dt = h('input', { type: 'date', id: id + '-d' });
      dt.value = d.commit[i].date;
      dt.addEventListener('change', () => { d.commit[i].date = dt.value; api.saveSoon(); });
      const msg = h('div', { id: id + '-msg', 'aria-live': 'polite' });
      cEls.push({ ta, dt, msg });
      card.appendChild(h('div', { class: 'field', style: 'margin-top:14px' },
        h('label', { for: id, text: 'Commitment ' + (i + 1) + (i >= L.commitments.min ? ' (optional)' : '') }), ta,
        h('label', { for: id + '-d', class: 'hint', text: 'By when' }), dt, msg));
    }
    card.appendChild(h('h2', { style: 'margin-top:28px', text: '3. Quick feedback' }));
    L.survey.forEach((s) => card.appendChild(scaleSet(L.id + '-s-' + s.id, s.q, s.scale, d.survey[s.id], (v) => { d.survey[s.id] = v; api.saveSoon(); })));
    const submit = h('button', { type: 'button', class: 'btn primary', text: d.submitted ? 'Update' : 'Submit' });
    const msg = h('div', { 'aria-live': 'polite' });
    const result = h('div');
    card.appendChild(h('div', { class: 'btn-row' }, submit)); card.appendChild(msg); card.appendChild(result);
    el.appendChild(card);

    function vague(t) {
      const s = t.toLowerCase();
      return L.commitments.vague.some((w) => new RegExp('\\b' + w.replace(/ /g, '\\s+') + '\\b').test(s)) && words(t) < 9;
    }
    function showResult() {
      result.textContent = '';
      const b = api.state.conf.before || {};
      const box = h('div', { class: 'conf-change', style: 'margin-top:20px' }, h('h3', { text: 'How your confidence changed' }));
      let sb = 0, sa = 0;
      conf.items.forEach((item, i) => {
        sb += b[i] || 0; sa += after[i] || 0;
        box.appendChild(h('div', { class: 'conf-row' }, h('span', { text: item }),
          h('div', { class: 'bars', 'aria-label': 'Before ' + (b[i] || 0) + ' of 5, now ' + (after[i] || 0) + ' of 5', role: 'img' },
            h('div', { class: 'bar before' }, h('span', { style: 'width:' + ((b[i] || 0) * 20) + '%' })),
            h('div', { class: 'bar after' }, h('span', { style: 'width:' + ((after[i] || 0) * 20) + '%' })),
            h('span', { class: 'bar-legend', text: 'Before ' + (b[i] || 0) + '/5 · Now ' + (after[i] || 0) + '/5' }))));
      });
      const diff = ((sa - sb) / conf.items.length).toFixed(1);
      box.prepend(h('p', { text: 'Average before: ' + (sb / conf.items.length).toFixed(1) + ' · Average now: ' + (sa / conf.items.length).toFixed(1) + ' (' + (diff >= 0 ? '+' : '') + diff + ')' }));
      result.appendChild(feedback(true, 'Saved.', 'Next: create your certificate and download your PDF.'));
      result.appendChild(box);
    }
    submit.addEventListener('click', () => {
      msg.textContent = '';
      let bad = null;
      if (!conf.items.every((_, i) => after[i])) { msg.appendChild(h('p', { class: 'field-msg', text: 'Rate all six confidence statements.' })); bad = bad || card.querySelector('input[name^="conf-a-"]'); }
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const max = new Date(today.getTime() + 120 * 86400000);
      let count = 0;
      cEls.forEach(({ ta, dt, msg: m }, i) => {
        m.textContent = '';
        const t = ta.value.trim();
        if (!t && !dt.value && i >= L.commitments.min) return;
        const v = api.validText(t, 5);
        let err = null;
        if (!v.ok) err = v.msg;
        else if (vague(t)) err = 'Make it concrete: what exactly will you do, with whom or on what? For example, “Practise the read-back with a classmate on Friday.”';
        else if (!dt.value) err = 'Choose a date for this commitment.';
        else { const dd = new Date(dt.value + 'T00:00:00'); if (dd < today || dd > max) err = 'Choose a date between today and the next four months.'; }
        if (err) { m.appendChild(h('p', { class: 'field-msg', text: err })); bad = bad || ta; } else count++;
      });
      if (!L.survey.every((s) => d.survey[s.id])) { msg.appendChild(h('p', { class: 'field-msg', text: 'Answer the three feedback questions.' })); bad = bad || card.querySelector('input[name^="' + L.id + '-s-"]'); }
      if (bad || count < L.commitments.min) { if (!bad && count < L.commitments.min) msg.appendChild(h('p', { class: 'field-msg', text: 'Add at least two commitments.' })); (bad || cEls[0].ta).focus(); return; }
      cEls.forEach(({ ta, dt }, i) => { d.commit[i] = { t: ta.value.trim(), date: dt.value }; });
      d.submitted = true; api.save(); submit.textContent = 'Update';
      showResult(); api.complete(); api.sendCompletion();
    });
    if (d.submitted) { showResult(); api.complete(); }
  }

  /* ================= CERTIFICATE ================= */
  function certificate(el, L, api) {
    const card = h('div', { class: 'card cert-wrap' });
    el.appendChild(card);
    if (!api.state.final.passed) {
      card.appendChild(h('p', { text: 'Your certificate unlocks when you pass the Final Knowledge Check.' }));
      return;
    }
    card.appendChild(h('p', { class: 'instruction', text: L.intro }));
    const id = 'certName';
    const input = h('input', { type: 'text', id, maxlength: '80', autocomplete: 'name' });
    input.value = api.learner.name || '';
    const msg = h('div', { 'aria-live': 'polite' });
    const make = h('button', { type: 'button', class: 'btn primary', text: 'Create certificate' });
    const dl = h('button', { type: 'button', class: 'btn', text: 'Download certificate (PNG)', hidden: true });
    const canvas = h('canvas', { width: '1600', height: '1131', role: 'img', 'aria-label': 'Certificate preview', hidden: true });
    card.appendChild(h('div', { class: 'field' }, h('label', { for: id, text: 'Name on certificate' }), input, msg));
    card.appendChild(h('div', { class: 'btn-row' }, make, dl));
    card.appendChild(canvas);
    const pdfRow = h('div', { class: 'btn-row', style: 'margin-top:22px' },
      h('button', { type: 'button', class: 'btn primary', text: 'Download PDF of my answers', onclick: () => api.pdf('answers') }),
      h('button', { type: 'button', class: 'btn', text: 'Download job aid', onclick: () => api.pdf('jobaid') }),
      h('button', { type: 'button', class: 'btn', text: 'Download trainer pack', onclick: () => api.pdf('trainer') }));
    card.appendChild(h('h3', { style: 'margin-top:26px', text: 'Downloads' }));
    card.appendChild(h('p', { class: 'saved-note', text: 'The trainer pack has the observation checklist, conversation guide and peer role-play cards.' }));
    card.appendChild(pdfRow);
    const status = h('p', { class: 'status-line', 'aria-live': 'polite', text: api.sendStatus() });
    card.appendChild(status);
    api.onSendStatus((t) => { status.textContent = t; });
    async function draw() {
      const name = input.value.trim().replace(/\s+/g, ' ');
      msg.textContent = '';
      if (name.length < 2) { msg.appendChild(h('p', { class: 'field-msg', text: 'Enter the name to print on your certificate.' })); input.focus(); return; }
      if (name !== api.learner.name) api.setName(name);
      await api.drawCert(canvas, name);
      canvas.hidden = false; dl.hidden = false;
      api.complete(); api.live('Certificate created.');
    }
    make.addEventListener('click', draw);
    dl.addEventListener('click', () => {
      canvas.toBlob((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = 'RCM-Patient-Access-Certificate.png';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      }, 'image/png');
    });
    if (api.learner.name && api.isDone()) draw();
  }

  window.Activities = { h, blocks, coaching, feedback, words, reading, welcome, quiz, sequence, sort, hunt, sim, reflect, typing, calc, spoken, board, note, final, wrapup, certificate };
})();
