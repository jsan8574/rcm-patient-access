// Content and accessibility audit. Run:  node tools/audit.mjs
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const sandbox = { window: {} };
sandbox.globalThis = sandbox.window;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'js/course-data.js'), 'utf8'), sandbox);
const RAW = sandbox.window.COURSE, KIT = sandbox.window.CourseKit;

const fails = [], warns = [], info = [];
const fail = (m) => fails.push(m), warn = (m) => warns.push(m);
const words = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).length;
const ACTIVITY = ['sequence', 'sort', 'hunt', 'sim', 'typing', 'calc', 'spoken', 'board', 'note', 'reflect'];

let mcqStats = { n: 0, longest: 0, shortest: 0 };

for (const p of RAW.paths) {
  const C = KIT.resolve(RAW, { path: p.id, vars: Object.assign({}, RAW.vars, { first: 'Alex' }) });
  // 1. unresolved tokens / bad joins
  (function walk(x, where) {
    if (Array.isArray(x)) return x.forEach((y, i) => walk(y, where + '[' + i + ']'));
    if (x && typeof x === 'object') return Object.keys(x).forEach((k) => walk(x[k], where + '.' + k));
    if (typeof x === 'string') {
      if (/\{\w+\}/.test(x) && !/\{link\}/.test(x)) fail(`[${p.id}] unresolved token at ${where}: ${x.slice(0, 80)}`);
      if (/\[object Object\]|undefined|__v|__j/.test(x)) fail(`[${p.id}] bad string at ${where}: ${x.slice(0, 80)}`);
    }
  })(C, 'COURSE');

  const lessons = C.sections.flatMap((s) => s.lessons.map((l) => ({ s, l })));
  const ids = new Set();
  let total = 0, reading = 0;
  const rows = [];
  for (const { s, l } of lessons) {
    if (ids.has(l.id)) fail(`duplicate lesson id ${l.id}`); ids.add(l.id);
    if (!C.labels[l.kind]) fail(`no type label for kind ${l.kind}`);
    if (ACTIVITY.includes(l.kind) && !(l.coaching && l.coaching.length)) fail(`${l.id}: no coaching key points`);
    const dup = (arr, what) => { const seen = new Set(); arr.forEach((t) => { if (seen.has(t)) fail(`${l.id}: duplicate ${what}: ${t}`); seen.add(t); }); };
    const mcq = (opts, where) => {
      const ok = opts.filter((o) => o.ok);
      if (ok.length !== 1) fail(`${where}: ${ok.length} correct options (need exactly 1)`);
      dup(opts.map((o) => o.t), 'option');
      opts.forEach((o) => { if (!o.fb) fail(`${where}: option without feedback`); });
      if (ok.length === 1) {
        const c = ok[0].t.length, ds = opts.filter((o) => !o.ok).map((o) => o.t.length);
        const maxD = Math.max(...ds), minD = Math.min(...ds);
        if (c > maxD * 1.15) fail(`${where}: correct option is ${Math.round((c / maxD - 1) * 100)}% longer than the longest distractor`);
        mcqStats.n++;
        if (c > maxD) mcqStats.longest++;
        if (c < minD) mcqStats.shortest++;
      }
    };
    let min = 0;
    switch (l.kind) {
      case 'reading': {
        const w = l.blocks.filter((b) => b.t !== 'deeper').reduce((n, b) => n + words([b.x, b.label, b.title, ...(b.items || []), ...((b.rows || []).flat()), ...(b.head || [])].join(' ')), 0) + (b => 0)() + words(l.intro);
        const wm = l.blocks.some((b) => b.t === 'model') ? l.blocks.filter((b) => b.t === 'model').reduce((n, b) => n + words(C.models[b.id].steps.flat().join(' ')), 0) : 0;
        const tw = w + wm;
        if (tw > 600) fail(`${l.id}: reading is ${tw} words (cap 600)`);
        min = Math.ceil(tw / 200); reading += min; info.push(`${l.id}: ${tw} words`); break;
      }
      case 'welcome': { const tw = words(l.intro) + l.blocks.reduce((n, b) => n + words([b.x, ...(b.items || [])].join(' ')), 0); min = Math.ceil(tw / 200 + 1); reading += Math.ceil(tw / 200); break; }
      case 'certificate': min = 1; reading += 1; break;
      case 'sequence': dup(l.items.map((i) => i.t), 'item'); min = 3; break;
      case 'sort':
        dup(l.items.map((i) => i.t), 'item'); dup(l.buckets, 'bucket');
        if (l.buckets.length < 2 || l.buckets.length > 3) fail(`${l.id}: sort needs 2-3 buckets`);
        l.items.forEach((i) => { if (!(i.b >= 0 && i.b < l.buckets.length)) fail(`${l.id}: item ${i.id} has invalid bucket ${i.b}`); if (!i.fb) fail(`${l.id}: item ${i.id} lacks feedback`); });
        l.buckets.forEach((_, bi) => { if (!l.items.some((i) => i.b === bi)) fail(`${l.id}: bucket ${bi} has no items`); });
        min = 4; break;
      case 'hunt': {
        let t = 0;
        l.docs.forEach((d) => { dup(d.fields.map((f) => f.label), 'field label in ' + d.title); d.fields.forEach((f) => { if (!d.reference && !f.fb) fail(`${l.id}: field ${f.id} lacks feedback`); if (f.issue) t++; }); });
        if (!t) fail(`${l.id}: no targets`);
        min = t >= 8 ? 6 : 4; info.push(`${l.id}: ${t} targets`); break;
      }
      case 'sim': l.steps.forEach((st, i) => { mcq(st.options, `${l.id} step ${i + 1}`); if (!st.reply) fail(`${l.id} step ${i + 1}: no reply`); }); min = Math.ceil(l.steps.length * 1.5); break;
      case 'quiz': l.questions.forEach((q) => mcq(q.options, `${l.id}/${q.id}`)); if (l.questions.length < 2 || l.questions.length > 3) fail(`${l.id}: check needs 2-3 questions`); min = Math.ceil(l.questions.length * 0.75); break;
      case 'board': l.clues.forEach((c) => { mcq(c.options, `${l.id}/${c.id}`); if (!l.categories.includes(c.cat)) fail(`${c.id}: unknown category`); }); min = Math.ceil(l.clues.length * 0.75); break;
      case 'final': {
        l.questions.forEach((q) => mcq(q.options, `final/${q.id}`));
        if (l.questions.length < 8 || l.questions.length > 12) fail('final needs 8-12 questions');
        const crit = l.questions.filter((q) => q.critical).length; info.push(`final: ${l.questions.length} questions, ${crit} critical`);
        min = Math.ceil(l.questions.length * 0.75); break;
      }
      case 'reflect': min = Math.ceil(l.prompts.reduce((n, q) => n + q.expectWords, 0) / 25 * 1.5); break;
      case 'typing': l.rounds.forEach((r) => { dup(r.fields.map((f) => f.label), 'field label'); r.fields.forEach((f) => { if (f.type === 'select' && !f.options.includes(f.answer)) fail(`${l.id}: select answer not in options`); }); }); min = 4; break;
      case 'calc': l.cases.forEach((c) => { if (typeof c.answer !== 'number') fail(`${l.id}/${c.id}: answer not numeric`); }); min = 4; break;
      case 'spoken': dup(l.rubric, 'rubric item'); min = Math.ceil(l.seconds / 60 + 1) + 2; break;
      case 'note': l.okStatuses.forEach((s2) => { if (!l.statuses.includes(s2)) fail(`${l.id}: ok status ${s2} not in statuses`); }); dup(l.rubric, 'rubric item'); min = Math.ceil(90 / 25 * 1.5); break;
      case 'wrapup': min = 6; break;
      default: fail(`unknown kind ${l.kind}`);
    }
    total += min;
    rows.push(`${(s.num ? s.num + '.' : 'W ')}${String(s.lessons.indexOf(l) + 1).padEnd(2)} ${l.kind.padEnd(11)} ${String(min).padStart(3)}  ${l.title}`);
  }
  info.push('Seat-time model per lesson:\n  ' + rows.join('\n  '));
  info.push(`[${p.id}] seat time ${total} min (target 108-132), reading ${reading} min, practice ${Math.round((1 - reading / total) * 100)}%`);
  if (total < 108 || total > 132) fail(`[${p.id}] seat time ${total} outside 108-132`);
  if (1 - reading / total < 0.4) fail(`[${p.id}] practice share below 40%`);
}

// answer-position balance (correct is longest about as often as shortest)
info.push(`MCQ items: ${mcqStats.n}; correct is longest in ${mcqStats.longest}, shortest in ${mcqStats.shortest}`);
if (Math.abs(mcqStats.longest - mcqStats.shortest) > Math.max(3, Math.round(mcqStats.n * 0.1))) fail(`correct option is longest ${mcqStats.longest}x vs shortest ${mcqStats.shortest}x (should be about equal)`);

// contrast
const css = fs.readFileSync(path.join(root, 'css/styles.css'), 'utf8');
const tok = {}; (css.match(/:root\{([^}]*)\}/) || ['', ''])[1].split(';').forEach((d) => { const m = d.match(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/); if (m) tok[m[1]] = m[2]; });
const lum = (hex) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const T = (n) => tok[n] || n;
const pairs = [
  ['navy', 'white'], ['navy', 'bg'], ['navy', 'pale'], ['ink', 'white'], ['ink', 'pale'], ['muted', 'white'], ['muted', 'bg'], ['muted', 'pale'], ['muted', 'neutral-pale'],
  ['teal-ink', 'white'], ['teal-ink', 'pale'], ['teal-ink', 'bg'], ['white', 'navy'], ['white', 'deep'], ['white', 'mid'], ['head-sub', 'deep'], ['head-sub', 'mid'],
  ['white', 'green'], ['navy', 'green-pale'], ['#3f4a52', 'neutral-pale'], ['#5b3a00', '#fff4e5'], ['#7a3e00', '#fff4e5'], ['#6b3b00', '#fff4e5'], ['#20506a', '#eef7fa'], ['#dcebf2', 'mid'], ['muted', '#fbfdfe']
];
const cr = [];
for (const [f, b] of pairs) { const r = ratio(T(f), T(b)); cr.push(`${f} on ${b}: ${r.toFixed(2)}`); if (r < 4.5) fail(`contrast ${f} on ${b} is ${r.toFixed(2)} (< 4.5)`); }
const nonText = [['line-strong', 'white'], ['focus', 'white'], ['teal', 'white']];
for (const [f, b] of nonText) { const r = ratio(T(f), T(b)); cr.push(`${f} on ${b} (non-text): ${r.toFixed(2)}`); if (r < 3 && f !== 'line-strong') fail(`non-text contrast ${f} on ${b} ${r.toFixed(2)} (< 3)`); }
info.push('Contrast:\n  ' + cr.join('\n  '));

// cache-busting
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const vers = [...html.matchAll(/(css|js)\/[\w.-]+\?v=(\d+)/g)].map((m) => m[2]);
if (!vers.length || new Set(vers).size !== 1) fail('every CSS/JS tag needs the same ?v=N'); else info.push('Asset version: v' + vers[0]);

console.log(info.join('\n'));
if (warns.length) console.log('\nWARNINGS\n- ' + warns.join('\n- '));
console.log(fails.length ? '\nFAILURES (' + fails.length + ')\n- ' + fails.join('\n- ') : '\nAUDIT PASSED');
process.exit(fails.length ? 1 : 0);
