# RCM - Patient Access

RCM Masterclass - Front End: a self-paced online workbook for aspiring Patient Access VAs. Plain HTML, CSS and JavaScript with no build step. Push the folder as it is and GitHub Pages serves it.

## What is in it

- 8 sections and 35 lessons, built on three models: the Front-End Control Chain, the Question Ladder and the Clearance Call.
- Activities:
  - 2 branching simulations
  - a timed data-entry drill (accuracy decides the result, speed is only reported)
  - 2 "find the issues" hunts, including a six-record capstone account
  - an authorization sort and a sequence activity
  - 3 estimate calculations, and a 60-second spoken rehearsal with record and playback (the audio never leaves the browser)
  - 2 rounds of a Jeopardy-style board with an optional countdown
  - a work-ready account note and escalation
- Final Knowledge Check, "Tomorrow's Schedule": 10 scenario questions. Passing needs 80% **and** all 3 critical decisions correct. It is untimed, retakes are allowed, the best score is kept and answers are shown only after passing.
- Learners never see time anywhere. The header shows % complete only. Time is tracked silently (visible tab only, idle ignored) and goes to the trainer's Sheet.
- Wrap-up: confidence before and after, 2–3 dated commitments (vague ones are rejected) and a 3-question survey.
- Certificate: a PNG with a verifiable ID made from a hash of name + course + path + pass date + score.
- PDFs:
  - the learner's record, including the job aid and trainer pack
  - a one-page job aid
  - a trainer pack: observation checklist, conversation guide, peer role-play cards and 1-week and 4-week nudge messages

## Files

| Path | Purpose |
|---|---|
| `index.html` | Page shell |
| `css/styles.css` | All styles; colour tokens in `:root` |
| `js/course-data.js` | **All learner-facing content.** Edit text here only. |
| `js/activities.js` | Activity engines (sequence, sort, hunt, sim, typing, calc, spoken, board, note, final, wrap-up, certificate) |
| `js/app.js` | Progress, navigation, time tracking, data capture, certificate, PDF, check-in page |
| `fonts/` | Figtree (SIL Open Font License, see `fonts/OFL.txt`) |
| `apps-script/Code.gs` | Google Apps Script that writes completions to a Sheet |
| `tools/audit.mjs` | Automated content and contrast audit |

## Editing content

- Change text in `js/course-data.js`, then run `node tools/audit.mjs`. The audit must print `AUDIT PASSED`.
- Path variants: `V({ va: 'text for this path', _: 'default' })`. Join pieces with `J(...)`, never `+`.
- Tokens such as `{payer}` or `{hospital}` come from `COURSE.vars`, so a fictional name changes in one place.
- Adding a path means adding to `COURSE.paths`. Progress is stored separately per path (`rcmpa:v1:state:<path>`), and a "Change path" link appears automatically.
- Adding a module or section means adding an object to `COURSE.sections`. No code changes are needed.

**Cache-busting:** every CSS and JS tag in `index.html` ends in `?v=N`. Bump N on **every** edit (it is currently `v=6`). After deploying, open the page and check that the new `?v` loaded before debugging anything.

## Data capture (what L&D sees)

Completions go to a Google Sheet through an Apps Script web app. Learners never sign in to Google.

1. Create a Google Sheet, then open **Extensions → Apps Script**.
2. Paste in `apps-script/Code.gs`, save, and run `setup` once to create the tabs. Approve the permissions prompt.
3. Go to **Deploy → New deployment → Web app**. Set **Execute as: Me** and **Who has access: Anyone**, then deploy and copy the URL.
4. Paste the URL into `js/course-data.js` → `dataCapture.endpoint`, bump `?v=N`, and push.

The Sheet gets three tabs:
- **Completions:** one row per learner. It holds name, email, scores, typing best, board scores, confidence change, commitments, survey and the 7.3 note and escalation, plus blank trainer rubric columns that total to /6.
- **Answers:** each learner's first answer to every check, game clue and final question, for analysing the questions.
- **Check-ins:** replies to the 1-week and 4-week nudges, which link to `index.html#nudge1` and `#nudge4`.

If no endpoint is set, nothing leaves the learner's device. Records wait in an on-device queue and send once an endpoint exists and the learner is online. The course and the PDF say so.

Privacy notes:
- GitHub Pages is **public**, so anyone with the link can open the course. The course itself holds no patient data.
- Learner email is collected for trainer records only, and nothing is emailed automatically.
- The web-app URL accepts posts from anyone. The script ignores records that don't carry this course's ID and neutralises spreadsheet formulas in learner text.

## QA checklist (run after changes)

- `node tools/audit.mjs` checks:
  - tokens, duplicate labels, exactly one correct option and feedback on every option
  - the correct option is never more than 15% longer than every distractor, and is longest about as often as shortest
  - coaching points on every activity
  - seat time (target 108–132 min, currently 117 by the model) and a practice share of at least 40% (currently 86%)
  - contrast of at least 4.5:1
  - a matching `?v` on all assets
- Complete the course in a browser at desktop width and at 375 px.

## Sources

The content comes from *Patient Access VA Role-Readiness Training Outline*. All people, payers and facilities in scenarios are fictional. The CMS Good Faith Estimate link is from the outline's reference note.
