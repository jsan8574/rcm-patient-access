/**
 * RCM - Patient Access: completion and check-in receiver.
 * Paste into Extensions > Apps Script of the Google Sheet that should hold the records.
 * Deploy > New deployment > Web app > Execute as: Me > Who has access: Anyone.
 * Learners never sign in; the course POSTs plain JSON to the web-app URL.
 */
const COURSE_ID = 'rcm-patient-access';
const MAX = 5000; // longest text stored per cell

const SHEETS = {
  Completions: ['Received', 'Submitted', 'Certificate ID', 'Name', 'Email', 'Path', 'Final best %', 'Final first %', 'Final attempts',
    'Critical missed on first attempt', 'Checks right first time', 'Simulations first try', 'Typing best WPM', 'Typing best accuracy %',
    'Board round 1 best', 'Board round 2 best', 'Spoken self-check', 'Active minutes', 'Confidence before (avg)', 'Confidence after (avg)',
    'Confidence before (items)', 'Confidence after (items)', 'Commitment 1', 'Commitment 2', 'Commitment 3',
    'Survey: relevance', 'Survey: confidence', 'Survey: likely to use', 'Note status', 'Note self-check', 'Account note',
    'Escalation: issue', 'Escalation: impact', 'Escalation: evidence', 'Escalation: deadline', 'Escalation: action needed', 'Device',
    'Trainer: source & time (0/1)', 'Trainer: facts vs opinion (0/1)', 'Trainer: auth # & dates (0/1)', 'Trainer: open item (0/1)',
    'Trainer: owner (0/1)', 'Trainer: deadline (0/1)', 'Trainer: total /6', 'Trainer comments'],
  Answers: ['Received', 'Certificate ID', 'Name', 'Email', 'Item', 'Kind', 'First choice', 'Correct', 'Answered at'],
  'Check-ins': ['Received', 'Submitted', 'Week', 'Name', 'Email', 'Answer', 'Used it?', 'What they used / what got in the way']
};

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const rec = JSON.parse(e.postData.contents);
    if (!rec || rec.course !== COURSE_ID) return out({ ok: false, error: 'unknown course' });
    if (rec.type === 'completion') writeCompletion(rec);
    else if (rec.type === 'nudge') writeNudge(rec);
    else return out({ ok: false, error: 'unknown type' });
    return out({ ok: true });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return out({ ok: true, service: COURSE_ID });
}

function writeCompletion(r) {
  const now = new Date();
  const s = r.summary || {};
  const c = r.commitments || [];
  const n = r.note || {};
  const sv = r.survey || {};
  const sims = s.sims ? Object.keys(s.sims).map(function (k) { return k + ': ' + s.sims[k]; }).join('; ') : '';
  const com = function (i) { return c[i] ? c[i].t + ' (by ' + c[i].date + ')' : ''; };
  const row = [now, r.submittedAt, r.certId, r.name, r.email, r.path, r.finalBest, r.finalFirst, r.finalAttempts,
    r.firstAttemptCriticalMissed ? 'Yes' : 'No', s.checks, sims, s.typingWpm, s.typingAcc, s.game1, s.game2, s.spoken, r.activeMinutes,
    r.confBeforeAvg, r.confAfterAvg, JSON.stringify(r.confBefore || {}), JSON.stringify(r.confAfter || {}), com(0), com(1), com(2),
    sv.relevance, sv.confidence, sv.use, n.status, n.selfCheck, n.note, n.issue, n.impact, n.evidence, n.deadline, n.action, r.device,
    '', '', '', '', '', '', '', ''];
  const sh = sheet('Completions');
  sh.appendRow(row.map(clip));
  const last = sh.getLastRow();
  const col = SHEETS.Completions.indexOf('Trainer: total /6') + 1;
  sh.getRange(last, col).setFormula('=IF(COUNT(' + rng(last, col - 6, col - 1) + ')=0,"",SUM(' + rng(last, col - 6, col - 1) + '))');
  const ans = (r.answers || []).map(function (a) { return [now, r.certId, r.name, r.email, a.item, a.kind, String(a.choice), a.ok ? 'Yes' : 'No', a.at]; });
  if (ans.length) {
    const as = sheet('Answers');
    as.getRange(as.getLastRow() + 1, 1, ans.length, ans[0].length).setValues(ans.map(function (x) { return x.map(clip); }));
  }
}

function writeNudge(r) {
  sheet('Check-ins').appendRow([new Date(), r.submittedAt, r.week, r.name, r.email, r.answer, r.used, r.note].map(clip));
}

function sheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(SHEETS[name]);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, SHEETS[name].length).setFontWeight('bold');
  }
  return sh;
}

function rng(row, c1, c2) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Completions').getRange(row, c1, 1, c2 - c1 + 1).getA1Notation();
}

function clip(v) {
  if (v == null) return '';
  if (typeof v === 'string') {
    v = v.slice(0, MAX);
    return /^[=+\-@]/.test(v) ? "'" + v : v; // stop formula injection from learner text
  }
  return v;
}

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/** Run once from the editor to create the three tabs with headers. */
function setup() {
  Object.keys(SHEETS).forEach(sheet);
}
