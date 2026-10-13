# Hand-off report: RCM - Patient Access

## What was built

The course follows the approved blueprint (version 4): https://claude.ai/artifact/LcD4jZtRrKAqREDcmeuVhD. It has 8 sections and 35 lessons, a seat time of about 117 minutes by the model, and 86% of that time is practice. See README.md for the feature list and setup.

Decisions and defaults beyond the blueprint:
- The payer was renamed from "Summit Health Plan" to **Alderwood Health Plan** (and **Corvane Health**), because "Summit Health" is a real provider group. All names are fictional, and they live in `COURSE.vars`.
- Readings ended up shorter than the 600-word cap (about 310–380 words each). Extra detail sits in optional "Go deeper" panels.
- The Foundation course is not mentioned anywhere. No time is shown to learners: no lesson minutes, no clock, no time on the certificate or PDF.
- There is one path ("Patient Access VA"), so "Change path" stays hidden.
- Font: Figtree (open licence), self-hosted.

## Bugs found and fixed during QA

1. The name dialog would not close, because `display:grid` overrode `hidden`. Added a global `[hidden]` rule.
2. The correct answer was the longest option in 23 of 44 questions, and two were more than 15% longer than every distractor. Rebalanced to 10 longest and 10 shortest.
3. "Best score" counted a failed 90% attempt that had missed a critical decision. Best score now counts passing attempts only once the learner has passed.
4. The mobile header wrapped to four lines. It is now compact: a "Contents" button, the title and the % ring.
5. The typing drill could show impossible speeds (from autofill or dictation). WPM is now capped at 250.
6. The board's timeout message opened with "Right." It now names the best answer.
7. The job aid spilled onto a second page. The glossary now starts on its own page.
8. Retrying the typing drill re-locked Record 2. Fixed.

## What was tested in a real browser

- Two full runs to the certificate, with wrong answers and retries on every activity.
- Short reflections rejected, and pasting blocked with a message.
- An unanswered final; a fail at 70%; a fail at 90% with a critical decision missed (answers stayed hidden); then a pass with answers revealed.
- Vague commitments rejected, and an empty certificate name rejected.
- Refreshing mid-activity kept progress. Reset works.
- No horizontal scroll at 375 px on any of the 35 lessons. The drawer sits below the header and the bottom bar doesn't cover content.
- Board countdown timeout.
- All three PDFs generated, with no unrenderable characters.
- No console errors and no 404s.
- Data capture against a local stand-in for Apps Script: the completion record (with 71 answers) and the check-in reply both arrived. A record queued while no endpoint was set was sent later.

**Not tested:**
- The live Apps Script and Sheet. That needs your deployment, and I tested the identical request against a local collector instead.
- Microphone recording. There is no mic in the test browser; the timer-only route is tested.
- Path switching, because there is only one path.
- A screen reader session. Labels, live regions and keyboard-operable controls are in place, but a VoiceOver or NVDA pass is still worth doing.

## SME-CHECK: please have a Patient Access lead confirm these

- **1.1 hook:** the $1,850 bill amount.
- **2.2 simulation:** Daniel Reyes's plan change (new plan effective 10/01/2026, spouse plan).
- **2.3 typing drill:** both records, and the 30+ WPM desktop reference.
- **3.2 order vs appointment:**
  - CPT 73721 with ICD-10 M25.561
  - a 90-day order validity
  - "a general 30-minute slot may not fit an MRI"
- **4.2 payer-rep simulation:**
  - POS 22, the imaging carve-out to a vendor
  - the deductible figures ($1,500 family, $1,000 individual, $600 remaining)
  - the reference number format
- **5.2 authorization audit:** the two "Cleared" rows I added (echocardiogram CPT 93306; PT visit 3 of 6).
- **7.2 capstone account:**
  - CPT 29881 at POS 22
  - authorization dates 10/20–11/15 against a DOS of 11/18
  - a surgeon-only estimate of $410
  - family deductible $3,000 with $2,400 met
- **7.3 Grace Kim note:** the dates, authorization #PT-30418 and the team names.
- **Board clues:** all 12, especially the three "pressure check" clues.
- **Final:** Q7 ($1,200 allowed, $400 deductible remaining, 20% → $560), Q9 and Q10.
- **Module hooks:**
  - Section 2: the member ID asked for three times
  - Section 3: the 30-minute slot for an MRI with contrast
  - Section 5: 6 approved visits against 12 scheduled
  - Section 6: told $200, billed $640
  - Section 7: the 40-minute repeat call
- **Glossary:** "POS 22 = hospital outpatient" (on-campus).

## Pilot plan

1. Pick 5 RCS students: a mix of strong and newer typists, with at least 2 completing on a phone.
2. Ask them to finish within one week, in as many sittings as they like.
3. From the Sheet, read active minutes (target about 117, acceptable 108–132), final first and best scores, critical decisions missed on the first attempt, typing accuracy and the survey.
4. Debrief for 15 minutes: which lesson felt longest, which instruction was unclear, and was the countdown stressful or useful?
5. Adjust: if median time is over 132, trim reflections before practice. Rewrite any question that 0 or 5 of 5 got wrong on the first try.

## Evaluation plan

- **Reaction:** survey averages for relevance, confidence and likelihood to use. Target at least 4 out of 5.
- **Learning:**
  - final first-attempt and best scores, and the pass rate
  - critical misses on the first attempt
  - first-try rate on each question (Answers tab)
  - change in average confidence between the start and end
- **Behaviour:**
  - the trainer scores the 7.3 note against the six rubric columns
  - the 30-day observation checklist is signed off
  - the 1-week and 4-week check-ins show "Yes, I used it"
- **Watch:** questions that almost everyone gets right first time, which may be too easy, and wrong options nobody chooses, which may be implausible.

## The single next action I need from you

Approve creating a **public** repo `jsan8574/rcm-patient-access` and pushing it to GitHub Pages. Separately, when you can, deploy the Apps Script (README, "Data capture", steps 1–3) and send me the web-app URL. I'll add it and push again.
