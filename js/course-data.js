/* RCM - Patient Access: ALL learner-facing content lives in this file.
   Variants:  V({ va: 'path-specific text', _: 'default text' })  — most specific key wins.
   Joining:   J('part one ', V({...}), ' part two')                — never join variants with "+".
   Tokens:    {payer}, {facility}, {first} … resolved from COURSE.vars and the learner record. */
(function (root) {
  'use strict';
  const V = (map) => ({ __v: map });
  const J = (...parts) => ({ __j: parts });

  function pick(map, path) {
    if (Object.prototype.hasOwnProperty.call(map, path)) return map[path];
    return map._;
  }
  function resolve(x, ctx) {
    if (Array.isArray(x)) return x.map((y) => resolve(y, ctx));
    if (x && typeof x === 'object') {
      if (x.__v) return resolve(pick(x.__v, ctx.path), ctx);
      if (x.__j) return x.__j.map((p) => resolve(p, ctx)).join('');
      const o = {};
      for (const k of Object.keys(x)) o[k] = resolve(x[k], ctx);
      return o;
    }
    if (typeof x === 'string') {
      return x.replace(/\{(\w+)\}/g, (m, k) => (ctx.vars && ctx.vars[k] != null ? String(ctx.vars[k]) : m));
    }
    return x;
  }
  root.CourseKit = { V, J, resolve };
})(typeof window !== 'undefined' ? window : globalThis);

(function (root) {
  'use strict';
  const { V } = root.CourseKit;

  root.COURSE = {
    id: 'rcm-patient-access',
    version: 1,
    program: 'RCM Masterclass - Front End',
    title: 'RCM - Patient Access',
    pass: 80,
    paths: [{ id: 'va', label: 'Patient Access VA' }],
    defaultPath: 'va',
    // Paste the Apps Script web-app URL here (see README). Empty = completions are queued on the learner's device only.
    dataCapture: { endpoint: 'https://script.google.com/macros/s/AKfycbzxbddom2gERReyc4yidu8VquPnStrmFCFlTET2pu8kZs0bsVk3fRPHNscaN5R4VwTP/exec' },
    vars: {
      payer: 'Alderwood Health Plan',
      payer2: 'Corvane Health',
      vendor: 'ClearScan Review Services',
      ortho: 'Westbrook Orthopedics',
      hospital: 'St. Clare Hospital',
      hospitalB: 'Riverside Outpatient Imaging',
      imaging: 'Northside Imaging Center',
      surgery: 'Lakeview Medical Center',
      rehab: 'Harborview Rehab',
      drLee: 'Dr. Priya Lee',
      drOrtiz: 'Dr. Samuel Ortiz'
    },

    labels: {
      reading: 'Reading', welcome: 'Reading', certificate: 'Reading',
      sequence: 'Activity', sort: 'Activity', hunt: 'Activity', spoken: 'Activity', board: 'Activity',
      sim: 'Simulation', quiz: 'Quiz', final: 'Graded check',
      reflect: 'Exercise', typing: 'Exercise', calc: 'Exercise', note: 'Exercise', wrapup: 'Exercise'
    },

    gateHints: {
      welcome: 'Rate all six statements to continue',
      sequence: 'Put every link in the right position to continue',
      sort: 'Place every case in the right bucket to continue',
      hunt: 'Find every issue to continue',
      spoken: 'Practise once and complete the self-check to continue',
      board: 'Answer all six clues to continue',
      sim: 'Finish the conversation to continue',
      quiz: 'Answer each question to continue',
      final: 'Pass the Final Knowledge Check to continue',
      reflect: 'Save your answers to continue',
      typing: 'Enter both records with every field correct to continue',
      calc: 'Get all three estimates right to continue',
      note: 'Complete your note, escalation and self-check to continue',
      wrapup: 'Complete the confidence check, commitments and feedback to continue',
      certificate: ''
    },

    /* ---------- CONFIDENCE (opening and closing) ---------- */
    confidence: {
      scale: ['Not yet', 'A little', 'Somewhat', 'Mostly', 'Fully'],
      items: [
        'I can run a patient call from greeting to a clear close.',
        'I can check that an appointment matches the order.',
        'I can verify benefits for a specific service, not just “active” coverage.',
        'I can check that an authorization matches the scheduled service.',
        'I can explain an estimate without promising a final amount.',
        'I can write a note and escalation that a teammate can act on.'
      ]
    },

    sections: [
      /* ================= WELCOME (no number) ================= */
      {
        id: 'intro', num: null, title: 'Welcome',
        lessons: [{
          id: 'welcome', kind: 'welcome', title: 'Welcome to Patient Access',
          intro: 'Patient Access is the front door of the revenue cycle. What you ask and check before a visit decides whether the patient arrives ready, whether the claim is paid, and whether the bill is a surprise.',
          facts: [['Audience', 'Aspiring Patient Access VAs'], ['Sections', '8'], ['Pass mark', '80%']],
          blocks: [
            { t: 'h', x: 'What you will practise' },
            { t: 'ul', items: [
              'Running a patient call that gets complete, accurate information the first time.',
              'Matching orders to appointments and verifying benefits for the exact service.',
              'Checking authorizations field by field and building estimates you can defend.',
              'Deciding whether an account is cleared, writing the note, and escalating well.'
            ] },
            { t: 'h', x: 'How this course works' },
            { t: 'p', x: 'Work through the lessons in order. Each one unlocks the next. Your progress saves on this device, so you can stop and come back whenever you like. Take your time.' },
            { t: 'p', x: 'All patients, providers, payers and facilities in this course are fictional. Payer rules and workflows vary, so at work you will always follow your client’s approved systems, policies and escalation paths.' }
          ]
        }]
      },

      /* ================= SECTION 1 ================= */
      {
        id: 's1', num: 1, title: 'The Role and the Front-End Control Chain',
        lessons: [
          {
            id: 's1-read', kind: 'reading', title: 'Why the front end decides the back end',
            intro: 'Patient Access is a control function. You protect the patient’s access to care and the claim that follows it.',
            blocks: [
              { t: 'callout', label: 'Why it matters', x: 'Maria Alvarez’s knee MRI was approved for {hospital}. To get her an earlier slot, it was moved to {hospitalB}. Nobody re-checked the authorization. The scan was done, the claim was denied, and Maria received a bill for $1,850. Every person did their own task. Nobody checked that the pieces still matched.' },
              { t: 'h', x: 'The Front-End Control Chain' },
              { t: 'p', x: 'Every account you touch moves through the same seven links. A break at any link breaks every link after it.' },
              { t: 'model', id: 'chain' },
              { t: 'p', x: 'When anything changes, such as the date, location, code or plan, walk the chain again from the link that changed. Most front-end denials come from a change that nobody re-checked.' },
              { t: 'h', x: 'What is yours to do, and what is not' },
              { t: 'table', head: ['You do', 'You never'], rows: [
                ['Gather and validate information', 'Give medical advice or judge clinical urgency'],
                ['Verify through approved sources', 'Change orders, diagnoses, codes or clinical records'],
                ['Explain what you verified, in plain language', 'Guarantee coverage, approval, payment or a final amount'],
                ['Document what you found and what is open', 'Interpret contracts beyond approved resources'],
                ['Escalate with evidence and a deadline', 'Skip a control to protect an appointment or a metric']
              ] },
              { t: 'example', title: 'Worked example: walk Maria’s chain', rows: [
                ['Patient', 'Correct person and plan. ✓'],
                ['Service', 'MRI right knee, matches the order. ✓'],
                ['Provider & Facility', 'Changed to {hospitalB}. This is the break.'],
                ['Coverage', 'Should have been re-checked for the new facility.'],
                ['Requirements', 'Authorization names {hospital}, not {hospitalB}. Mismatch.'],
                ['What should have happened', 'Before confirming the move, re-check the authorization and network for the new facility. If that cannot be done in time, keep the original location or escalate to the authorization owner before the date of service.']
              ] },
              { t: 'deeper', title: 'Go deeper: one approved source for each link', blocks: [
                { t: 'ul', items: [
                  'Patient: the patient or an authorized representative, plus the approved patient search.',
                  'Service: the order or approved clinical record.',
                  'Provider & Facility: the order, scheduling system and network directory or payer.',
                  'Coverage: the payer portal, electronic response or a payer representative.',
                  'Requirements: the payer’s authorization tool or utilization-management channel.',
                  'Estimate: the approved estimator, fee schedule or contract method.',
                  'Record: your organization’s account notes, in the approved format.'
                ] },
                { t: 'p', x: 'Physician practices tend to focus on provider, appointment type and referral rules. Hospitals add facility, department, level of care, equipment and separate professional charges. When both provider and facility affect network or authorization, verify both.' }
              ] }
            ]
          },
          {
            id: 's1-seq', kind: 'sequence', title: 'Build the control chain',
            intro: 'Put the seven links in order. Select a link, and it moves into the next empty position. Select a placed link to send it back.',
            slotLabel: 'Link',
            items: [
              { id: 'p', t: 'Patient', d: 'Right person, right record, current details' },
              { id: 's', t: 'Service', d: 'What is scheduled matches what was ordered' },
              { id: 'pf', t: 'Provider & Facility', d: 'Who performs it and where' },
              { id: 'c', t: 'Coverage', d: 'Active plan and benefits for this exact service' },
              { id: 'r', t: 'Requirements', d: 'Referral, authorization, records in place' },
              { id: 'e', t: 'Estimate', d: 'A qualified expectation of what the patient may owe' },
              { id: 'rec', t: 'Record', d: 'Notes a teammate can act on' }
            ],
            wrong: 'Not in this position. Ask yourself what must already be true before this link can be checked.',
            coaching: [
              'The order follows dependency: you cannot verify coverage for a service you have not confirmed, and you cannot estimate without benefits.',
              'Provider and facility sit before coverage because network status and authorization depend on them.',
              'When something changes, restart from the changed link and walk forward.'
            ]
          },
          {
            id: 's1-try', kind: 'reflect', title: 'Try it: a visit you remember',
            prompts: [
              { id: 'q1', q: 'Think of a real healthcare visit (your own, a family member’s, or one you have heard about) where something went wrong: a surprise bill, a cancelled appointment, a confusing call. Which link in the chain broke, and what single check would have caught it?', expectWords: 40 }
            ],
            coaching: [
              'Most real problems trace back to one change that nobody re-checked: a new location, a new plan, a new date.',
              'Naming the exact link helps you build the habit of asking: what changed, and what depends on it?'
            ]
          },
          {
            id: 's1-cfu', kind: 'quiz', title: 'Check for understanding',
            questions: [
              {
                id: 's1q1',
                q: 'A scheduler wants to move a patient’s CT from {surgery} to an imaging center with an earlier opening. An authorization is on file. What should happen before the move is confirmed?',
                options: [
                  { t: 'Re-check the authorization and network status for the new facility first.', ok: true, fb: 'Right. Authorizations and network status are often tied to a specific facility. A change in location is a change in the chain.' },
                  { t: 'Confirm the move, since the approval follows the patient and the code.', fb: 'Tempting, but approvals often name a specific facility. Assuming it transfers is a common cause of denials.' },
                  { t: 'Confirm the move, then ask the patient to check with the plan later.', fb: 'Verification is your job, not the patient’s. Passing it on leaves the break in place.' }
                ]
              },
              {
                id: 's1q2',
                q: 'A patient asks, “Is this test really necessary, or can I skip it?” What is within your role?',
                options: [
                  { t: 'Say you can’t advise on that, and offer to send it to the care team.', ok: true, fb: 'Right. Clinical questions go to the clinical team. You can still help by routing the question quickly.' },
                  { t: 'Share what most patients in a similar situation usually decide to do.', fb: 'Even well-meant, this is medical advice. It is outside the Patient Access role.' },
                  { t: 'Check the urgency field on the order and tell them if it can wait.', fb: 'Judging clinical urgency is not part of the role, even when you can see the order.' }
                ]
              }
            ]
          }
        ]
      },

      /* ================= SECTION 2 ================= */
      {
        id: 's2', num: 2, title: 'Asking the Right Questions',
        lessons: [
          {
            id: 's2-read', kind: 'reading', title: 'The Question Ladder',
            intro: 'Good questions are efficient. You get complete information once, in a logical order, without leading the patient or guessing.',
            blocks: [
              { t: 'callout', label: 'Why it matters', x: 'Daniel called to book a follow-up. Two people asked for his member ID three times between them, and nobody asked whether his insurance had changed. It had. The claim was rejected six weeks later, and Daniel had to call back twice to fix it.' },
              { t: 'h', x: 'Climb the ladder in order' },
              { t: 'model', id: 'ladder' },
              { t: 'p', x: 'Always ask the gap-finding question, even when the patient seems sure: “Do you have any other health coverage, for example through a spouse, a parent or a government plan?” Missing other coverage is a common cause of coordination-of-benefits denials.' },
              { t: 'h', x: 'What you are gathering' },
              { t: 'table', head: ['Area', 'Examples'], rows: [
                ['Patient', 'Legal name, date of birth, address, phone, preferred language, guarantor'],
                ['Service', 'What was ordered, code if available, date, any urgency stated in the order'],
                ['Provider', 'Ordering, referring and rendering provider; NPI when required'],
                ['Location', 'Office, hospital department or facility; place of service'],
                ['Insurance', 'Payer, plan, member ID, group, subscriber, relationship, start date, other coverage'],
                ['Workflow', 'Order status, referral, authorization, estimate, deadlines']
              ] },
              { t: 'h', x: 'Privacy comes first' },
              { t: 'p', x: 'Complete your organization’s identity verification before discussing anything about the account. When someone calls for the patient, such as a spouse or the parent of an adult, confirm they are authorized before you share details. Use approved channels only.' },
              { t: 'example', title: 'Worked example: a short call on the ladder', rows: [
                ['Broad', '“Thanks for calling {ortho}, this is Jen. Can I have your full name and date of birth?” … “How can I help today?”'],
                ['Narrow', '“Which appointment is this for, and which doctor is it with?”'],
                ['Clarify', '“You mentioned a new card. Did the member ID or group number change?”'],
                ['Confirm', '“Let me read that back: member ID A-D-W, 4-8-2, 9-1-7…”'],
                ['Close', '“You’re booked for the 23rd. We still need to confirm your other plan. I’ll call you by Monday.”']
              ] },
              { t: 'deeper', title: 'Go deeper: five checks on every answer', blocks: [
                { t: 'ul', items: [
                  'Complete: are all required items present?',
                  'Consistent: do the order, appointment, benefits and authorization describe the same service?',
                  'Current: is it valid for the date of service?',
                  'Specific: does it apply to this provider, facility, service and setting?',
                  'Traceable: could a teammate see where, when and from whom it came?'
                ] }
              ] }
            ]
          },
          {
            id: 's2-sim', kind: 'sim', title: '“My insurance changed”',
            intro: 'You are a Patient Access VA at {ortho}. Daniel Reyes is calling to book his post-op follow-up with {drLee}. Choose what you say at each step.',
            you: 'You',
            them: 'Daniel',
            steps: [
              {
                line: 'Hi, I need to book my follow-up with Dr. Lee. Oh, and my insurance changed.',
                ladder: 'Broad',
                options: [
                  { t: 'Thanks, Daniel. First, can you confirm your full name and date of birth?', ok: true, fb: 'Good. You verify identity before touching the account.' },
                  { t: 'No problem. What is your new member ID so I can update your account first?', fb: 'You would be changing an account before confirming who you are speaking with. Verify identity first.' },
                  { t: 'Okay. Dr. Lee has an opening on Thursday at 2 PM. Does that work for you?', fb: 'Booking before you understand the insurance change risks a rejected claim. Start broad and verify first.' }
                ],
                reply: 'Sure, Daniel Reyes, March 14, 1988. I started a new job last month, so I’m on their plan now.'
              },
              {
                ladder: 'Narrow and clarify',
                options: [
                  { t: 'Thanks. When did the new plan start, and do you have the new card with you?', ok: true, fb: 'Good. Start date and card details are what you need to update coverage correctly.' },
                  { t: 'Thanks. I’ll keep your old plan on file until the new one shows up here.', fb: 'The old plan has likely ended. Keeping it would send the claim to the wrong payer.' },
                  { t: 'Thanks. I’ll note that it changed, and billing can sort out the details.', fb: 'Billing would have to call Daniel back. Gather the details now, while he is on the phone.' }
                ],
                reply: 'It’s {payer}, started October 1. Member ID ADW482917305, group 77104-B.'
              },
              {
                ladder: 'Clarify (gap-finding)',
                options: [
                  { t: 'Do you have other health coverage, like a spouse’s plan or Medicaid?', ok: true, fb: 'Good. The gap-finding question catches other coverage before it becomes a denial.' },
                  { t: 'Great, that’s everything I need, so I’ll go ahead and book Thursday for you.', fb: 'You skipped the gap-finding question. Other coverage changes which plan pays first.' },
                  { t: 'Great. Since your old plan ended, I’ll note there’s no other coverage.', fb: 'That is an assumption. Ask, rather than deciding for the patient.' }
                ],
                reply: 'Actually, my wife has a plan through her work, and I think I’m on it too.'
              },
              {
                ladder: 'Confirm and close',
                options: [
                  { t: 'Let me read back your new plan. We’ll confirm which plan pays first and call you by Monday.', ok: true, fb: 'Good. You read back, state what is pending, who owns it and when.' },
                  { t: 'Perfect, you’re all set. The new plan will cover your visit, so there’s nothing else to do.', fb: 'This promises coverage and skips the read-back. Payer order is still open.' },
                  { t: 'Perfect. I’ll add both plans, and the system will work out which one should pay first.', fb: 'Payer order must be confirmed through approved sources, not left to the system.' }
                ],
                reply: 'Great, thanks. I’ll keep an eye out for your call.'
              }
            ],
            coaching: [
              'Verify identity before discussing or changing anything on the account.',
              'When a patient says “it changed”, clarify the specifics: payer, member ID, group, start date.',
              'Always ask about other coverage. A spouse’s plan can change which plan pays first.',
              'Close with a read-back, what is still pending, who owns it and when you will follow up.'
            ]
          },
          {
            id: 's2-type', kind: 'typing', title: 'Registration data-entry drill',
            intro: 'Enter each record exactly as shown. Accuracy decides: every field must be correct to finish. Your speed is shown as a personal best but never blocks you.',
            targetWpm: 30,
            rounds: [
              {
                id: 'r1', title: 'Record 1: Daniel’s new plan',
                card: { payer: '{payer}', rows: [['Member', 'DANIEL REYES'], ['Member ID', 'ADW482917305'], ['Group', '77104-B'], ['Effective', '10/01/2026'], ['Subscriber', 'Self']] },
                notes: ['DOB March 14, 1988', 'Mobile (555) 214-7730', '418 Harlow Street, Apt 6, Dayton, OH 45402'],
                fields: [
                  { id: 'last', label: 'Patient last name', answer: 'Reyes', type: 'name' },
                  { id: 'first', label: 'Patient first name', answer: 'Daniel', type: 'name' },
                  { id: 'dob', label: 'Date of birth (MM/DD/YYYY)', answer: '03/14/1988', type: 'date' },
                  { id: 'phone', label: 'Mobile phone', answer: '5552147730', type: 'phone' },
                  { id: 'addr', label: 'Street address', answer: '418 Harlow Street, Apt 6', type: 'text' },
                  { id: 'mid', label: 'Member ID', answer: 'ADW482917305', type: 'id' },
                  { id: 'grp', label: 'Group number', answer: '77104-B', type: 'id' },
                  { id: 'eff', label: 'Coverage start date (MM/DD/YYYY)', answer: '10/01/2026', type: 'date' }
                ]
              },
              {
                id: 'r2', title: 'Record 2: a spouse’s plan with look-alike characters',
                card: { payer: '{payer2}', rows: [['Subscriber', 'TOMAS HART'], ['Dependent', 'MEI-LING OKONKWO-HART'], ['Member ID', 'CRV10O8I52'], ['Group', 'G0041-77'], ['Effective', '01/01/2026']] },
                notes: ['Patient is the dependent (spouse of subscriber)', 'Patient DOB November 2, 1979', 'Mobile (555) 870-0316'],
                fields: [
                  { id: 'last', label: 'Patient last name', answer: 'Okonkwo-Hart', type: 'name' },
                  { id: 'first', label: 'Patient first name', answer: 'Mei-Ling', type: 'name' },
                  { id: 'dob', label: 'Date of birth (MM/DD/YYYY)', answer: '11/02/1979', type: 'date' },
                  { id: 'phone', label: 'Mobile phone', answer: '5558700316', type: 'phone' },
                  { id: 'mid', label: 'Member ID', answer: 'CRV10O8I52', type: 'id' },
                  { id: 'grp', label: 'Group number', answer: 'G0041-77', type: 'id' },
                  { id: 'sub', label: 'Subscriber name', answer: 'Tomas Hart', type: 'name' },
                  { id: 'rel', label: 'Patient relationship to subscriber', answer: 'Spouse', type: 'select', options: ['Self', 'Spouse', 'Child', 'Other'] }
                ]
              }
            ],
            coaching: [
              'Accuracy first. One wrong character in a member ID can mean an eligibility rejection and a rework loop.',
              'Watch the look-alikes: O and 0, I and 1, S and 5, B and 8. Copy exactly what the card shows.',
              'Read IDs back in groups of three or four, and confirm spelling of hyphenated names letter by letter.',
              'Speed comes from routine. Use the same field order every time and avoid re-asking for data already on file.'
            ]
          },
          {
            id: 's2-try', kind: 'reflect', title: 'Try it: your opening and your close',
            prompts: [
              { id: 'q1', q: 'Write the opening you will use on a patient call, including how you verify identity.', expectWords: 25 },
              { id: 'q2', q: 'Write your closing recap for a call where one item is still pending. Include who owns it and when you will follow up.', expectWords: 25 }
            ],
            coaching: [
              'A strong opening names you and the organization, verifies identity, then invites the patient to explain.',
              'A strong close separates what is done from what is pending, and gives an owner and a date.'
            ],
            model: [
              '“Thank you for calling {ortho}, this is Jen. So I can help with your account, may I have your full name and date of birth?”',
              '“You are booked for Thursday the 23rd at 2 PM. We still need to confirm which plan pays first. I’ll call you by Monday with the result.”'
            ]
          },
          {
            id: 's2-cfu', kind: 'quiz', title: 'Check for understanding',
            questions: [
              {
                id: 's2q1',
                q: 'A caller says, “I’m calling about my husband’s MRI next week.” What do you do first?',
                options: [
                  { t: 'Confirm she is authorized on the account, then verify the patient’s identity.', ok: true, fb: 'Right. A spouse is not automatically authorized. Check authority and identity before sharing anything.' },
                  { t: 'Ask for his member ID so you can pull up the MRI appointment details.', fb: 'Having his member ID does not make her authorized. Confirm authority first.' },
                  { t: 'Share the appointment date only, since a date is not medical information.', fb: 'Appointment details linked to a person are protected. Confirm authority before sharing.' }
                ]
              },
              {
                id: 's2q2',
                q: 'The order lists {drLee}, but the patient says, “Dr. Patel sent me.” What is the best next question?',
                options: [
                  { t: '“Did Dr. Patel refer you to Dr. Lee, or is Dr. Patel ordering this?”', ok: true, fb: 'Right. A clarifying question resolves the difference without assuming either source is wrong.' },
                  { t: '“I’ll change the ordering provider to Dr. Patel to match what you said.”', fb: 'You never alter an order. Clarify, and route any real discrepancy to the ordering office.' },
                  { t: '“The order says Dr. Lee, so we’ll keep the booking just as it is.”', fb: 'Ignoring the difference can hide a referral requirement. Clarify it.' }
                ]
              }
            ]
          }
        ]
      },

      /* ================= SECTION 3 ================= */
      {
        id: 's3', num: 3, title: 'Scheduling the Right Service',
        lessons: [
          {
            id: 's3-read', kind: 'reading', title: 'From order to appointment',
            intro: 'Good scheduling is not finding an open slot. It is securing the right appointment and helping the patient arrive ready.',
            blocks: [
              { t: 'callout', label: 'Why it matters', x: 'A patient arrived for a 30-minute general imaging slot. The order was for an MRI with contrast that needed a longer slot, an IV and a recent kidney-function result. The scan was rebooked, the slot went unused, and the patient had taken a day off work for nothing.' },
              { t: 'h', x: 'Match the appointment to the order' },
              { t: 'p', x: 'Before you confirm, compare the appointment with the order, item by item:' },
              { t: 'ul', items: [
                'Patient identity',
                'Service and procedure code, when available',
                'Reason for the service or diagnosis',
                'Body site and laterality (left or right)',
                'Ordering or referring provider, and the rendering provider or department',
                'Location and place of service',
                'Dates, frequency, visits or units',
                'Prerequisites: preparation, equipment, anesthesia, records'
              ] },
              { t: 'h', x: 'Scheduling controls' },
              { t: 'ul', items: [
                'Search for the patient before creating a record, so you never create a duplicate.',
                'Never pick a shorter or general appointment type just to find availability.',
                'Never guess the procedure from symptoms or an incomplete request.',
                'Give preparation instructions from the approved source, not from memory.',
                'Never ignore an order, authorization or location mismatch.'
              ] },
              { t: 'h', x: 'Escalate when' },
              { t: 'ul', items: [
                'The order is missing, expired, incomplete or does not match the request.',
                'The patient reports symptoms that need clinical triage under your policy.',
                'The service is not offered at the chosen location.',
                'The date falls outside referral or authorization dates.',
                'Prerequisites cannot be confirmed in time.'
              ] },
              { t: 'h', x: 'Help the patient arrive ready' },
              { t: 'p', x: 'Confirm the date and time actually work. Ask about barriers such as transport, work, caregiving or language. Read back the date, time, location, arrival time and preparation, and explain how to reschedule early so the slot can go to someone else.' },
              { t: 'example', title: 'Worked example: the patient remembers it differently', rows: [
                ['Situation', 'The order says right knee. The patient says, “It’s my left knee that hurts.”'],
                ['Do not', 'Change the appointment to the left knee to match the patient.'],
                ['Do', 'Keep the order as written, tell the patient you will confirm with the ordering office, and route the discrepancy before the date of service.']
              ] },
              { t: 'deeper', title: 'Go deeper: preventing cancellations and no-shows', blocks: [
                { t: 'ul', items: [
                  'Send reminders through the approved channel early enough for the patient to act on preparation or coverage issues.',
                  'Use only the minimum necessary information in voicemail, text and email.',
                  'Reconfirm appointments that need significant preparation, authorization, records or financial clearance.',
                  'Do not mark a no-show until your organization’s defined time and process are complete.',
                  'Record cancellation reasons using approved categories so recurring problems can be fixed.'
                ] }
              ] }
            ]
          },
          {
            id: 's3-hunt', kind: 'hunt', title: 'Order vs appointment',
            intro: 'Compare Rosa Delgado’s appointment with her order. Select every appointment field that has a problem, then check your finds.',
            hints: ['anything that differs from the order', 'anything missing', 'a date outside the order’s valid period', 'a slot that may not fit the service'],
            docs: [
              {
                title: 'Order', sub: '{ortho} · signed by {drLee}', reference: true,
                fields: [
                  { id: 'o1', label: 'Patient', value: 'Rosa Delgado · DOB 06/22/1971' },
                  { id: 'o2', label: 'Service', value: 'MRI knee without contrast · CPT 73721' },
                  { id: 'o3', label: 'Laterality', value: 'Right' },
                  { id: 'o4', label: 'Diagnosis', value: 'M25.561 Pain in right knee' },
                  { id: 'o5', label: 'Ordering provider', value: 'Priya Lee, MD' },
                  { id: 'o6', label: 'Location', value: '{hospital}, Outpatient Imaging' },
                  { id: 'o7', label: 'Order date', value: '07/02/2026 · valid for 90 days' }
                ]
              },
              {
                title: 'Appointment', sub: 'Scheduling system',
                fields: [
                  { id: 'a1', label: 'Patient', value: 'Rosa Delgado · DOB 06/22/1971', fb: 'This matches the order.' },
                  { id: 'a2', label: 'Appointment type', value: 'Imaging – General (30 min)', issue: true, fb: 'A general 30-minute slot may not fit an MRI. Use the appointment type the approved instructions require.' },
                  { id: 'a3', label: 'Service', value: 'MRI knee without contrast · CPT 73721', fb: 'This matches the order.' },
                  { id: 'a4', label: 'Laterality', value: 'Left', issue: true, fb: 'The order says right. Laterality errors affect safety, the claim and the authorization.' },
                  { id: 'a5', label: 'Ordering provider', value: '(blank)', issue: true, fb: 'The ordering provider is missing. Payers and authorizations often require it.' },
                  { id: 'a6', label: 'Location', value: '{imaging} (freestanding)', issue: true, fb: 'The order names {hospital}. A different facility can change place of service, network status and authorization.' },
                  { id: 'a7', label: 'Date of service', value: '10/21/2026', issue: true, fb: 'The order expired on 09/30/2026 (90 days after 07/02). A renewed order is needed.' },
                  { id: 'a8', label: 'Insurance', value: '{payer} · active', fb: 'Nothing here conflicts with the order. Benefits are verified separately.' },
                  { id: 'a9', label: 'Arrival', value: '15 minutes before', fb: 'Arrival instructions come from the approved source; nothing here conflicts with the order.' }
                ]
              }
            ],
            coaching: [
              'Compare field by field. Do not stop at the first problem: errors often come in clusters.',
              'Laterality, location and dates are the most common silent mismatches.',
              'An expired order means the appointment is not ready, however good the slot is.',
              'You do not fix the order yourself. Route the issues to the ordering office or scheduling owner.'
            ]
          },
          {
            id: 's3-try', kind: 'reflect', title: 'Try it: your read-back close',
            prompts: [
              { id: 'q1', q: 'Rosa’s appointment is now held for an MRI of the right knee without contrast at {hospital} Outpatient Imaging, Wednesday 11/04/2026 at 9:00 AM, arriving 8:30 AM, with no metal jewelry. A renewed order is still pending from Dr. Lee’s office. Write the read-back and close you would say to Rosa.', expectWords: 45 }
            ],
            coaching: [
              'A good read-back covers service, side, location, date, time, arrival and preparation.',
              'Say clearly what is still pending, who is handling it, and what happens if it is not resolved.'
            ],
            model: [
              '“Let me read that back. Your MRI of the right knee is at {hospital} Outpatient Imaging on Wednesday, November 4, at 9 AM. Please arrive at 8:30 and leave metal jewelry at home. We are still waiting on a renewed order from Dr. Lee’s office. I’ll follow up with them and call you by Friday to confirm. If you need to reschedule, please call us as early as you can.”'
            ]
          },
          {
            id: 's3-cfu', kind: 'quiz', title: 'Check for understanding',
            questions: [
              {
                id: 's3q1',
                q: 'The only MRI opening this week is a 30-minute general slot. The order needs the full MRI slot. The patient wants this week. What do you do?',
                options: [
                  { t: 'Offer the earliest correct MRI slot, plus the waitlist if allowed.', ok: true, fb: 'Right. The correct appointment type comes first. A waitlist can still get them in sooner.' },
                  { t: 'Book the general slot and add a note asking imaging to fit the exam in.', fb: 'Booking the wrong type to find availability is a scheduling control you never bypass.' },
                  { t: 'Book the general slot now and correct the appointment type nearer the date.', fb: 'The wrong type often goes unnoticed until the patient arrives. Book it correctly now.' }
                ]
              },
              {
                id: 's3q2',
                q: 'While you are scheduling, a patient mentions new chest pain that started this morning. What do you do?',
                options: [
                  { t: 'Follow your clinical triage process now, before you continue scheduling.', ok: true, fb: 'Right. Symptoms that may need triage go to the clinical process immediately.' },
                  { t: 'Finish the booking first, then mention the chest pain in the account notes.', fb: 'A note can sit unread for hours. Possible clinical symptoms are routed right away.' },
                  { t: 'Reassure the patient it is likely minor and offer the earliest opening.', fb: 'Judging how serious a symptom is falls outside the role. Use the triage process.' }
                ]
              }
            ]
          }
        ]
      },

      /* ================= SECTION 4 ================= */
      {
        id: 's4', num: 4, title: 'Eligibility and Benefits',
        lessons: [
          {
            id: 's4-read', kind: 'reading', title: 'Active is not the same as covered',
            intro: 'A complete verification answers one question: what applies to this exact service, at this place, with these providers, on this date?',
            blocks: [
              { t: 'callout', label: 'Why it matters', x: 'The portal said “Active.” The account was marked verified. The service was a hospital outpatient MRI that needed prior authorization through an imaging vendor, which the portal never displayed. The claim was denied.' },
              { t: 'h', x: 'Four different things' },
              { t: 'table', head: ['Term', 'What it tells you'], rows: [
                ['Eligibility', 'The plan is active for a date.'],
                ['Coverage', 'The plan includes this type of service under stated conditions.'],
                ['Benefits', 'The cost share, limits, exclusions and requirements for this service.'],
                ['Payment', 'What happens after the claim is processed. Nothing before the claim guarantees it.']
              ] },
              { t: 'h', x: 'Verify for the exact service' },
              { t: 'ul', items: [
                'Use the expected date of service, and note the plan’s start and end dates.',
                'Confirm payer order when there is more than one plan.',
                'Name the exact service or code and the place of service (office, hospital outpatient, inpatient, surgery center).',
                'Confirm network status for this plan for both the rendering provider and the facility.',
                'Capture cost share: copay, deductible and the amount remaining, coinsurance, out-of-pocket maximum and the amount remaining.',
                'Ask about limits, exclusions, referral, prior authorization, notification and carve-outs.',
                'Record the source, date, representative name and reference number.'
              ] },
              { t: 'h', x: 'Quick reminders' },
              { t: 'table', head: ['Term', 'In one line'], rows: [
                ['Deductible remaining', 'What is left of the deductible as of the date checked, not the full deductible.'],
                ['Coinsurance', 'A percentage of the allowed amount the patient may owe after the deductible.'],
                ['Out-of-pocket maximum', 'A yearly limit on certain cost sharing; not every charge counts.'],
                ['Carve-out', 'Part of the benefit is managed by a different company, such as an imaging vendor.'],
                ['Coordination of benefits', 'The rules that decide which plan pays first.']
              ] },
              { t: 'example', title: 'Worked example: what a general answer leaves out', rows: [
                ['Portal says', '“Outpatient diagnostic: covered 80% after deductible.”'],
                ['Still unknown', 'Does it apply to CPT 73721 at a hospital outpatient department? Is the hospital in network? The reading radiologist? Is authorization required, and by whom? Is the deductible shown individual or family?'],
                ['Status', 'Pending until those answers are confirmed and documented.']
              ] },
              { t: 'deeper', title: 'Go deeper: documentation minimum for a verification', blocks: [
                { t: 'ul', items: [
                  'Date, time, channel, payer, plan, member and date of service.',
                  'Active status and start and end dates.',
                  'Provider and facility network findings.',
                  'Service and place of service checked.',
                  'Cost-share and accumulator amounts, noting individual or family.',
                  'Limits, exclusions, referral and authorization findings, plus open questions.',
                  'Representative name or ID and reference number.',
                  'Follow-up needed, owner and deadline.'
                ] }
              ] }
            ]
          },
          {
            id: 's4-sim', kind: 'sim', title: 'Benefit call with a payer representative',
            intro: 'You are verifying benefits for Rosa Delgado: MRI right knee without contrast (CPT 73721) at {hospital} Outpatient Imaging, place of service 22, on 11/04/2026. You are on the phone with Janelle at {payer}.',
            you: 'You',
            them: 'Janelle',
            opening: 'I show Rosa active since January 1. Outpatient diagnostic services are covered at 80% after the deductible. Anything else?',
            steps: [
              {
                ladder: 'Specific service and setting',
                options: [
                  { t: 'Does that 80% apply to CPT 73721 at an outpatient hospital, POS 22?', ok: true, fb: 'Good. You turn a general answer into a service-specific one.' },
                  { t: 'Great, that’s what I needed. Could I get a reference number for this call?', fb: 'You would be accepting a general benefit. It may not apply to this code or setting.' },
                  { t: 'So the MRI is covered at 80%, and I can tell Rosa it’s approved?', fb: 'Coverage is not approval. You have not checked authorization yet.' }
                ],
                reply: 'Yes, 73721 at place of service 22 is 80% after the deductible.'
              },
              {
                ladder: 'Network for facility and provider',
                options: [
                  { t: 'Is {hospital} in network for this plan, and the reading radiologists?', ok: true, fb: 'Good. The facility and the rendering provider can each be in or out of network.' },
                  { t: '{hospital} is a large hospital, so I’ll note it as in network for this plan.', fb: 'Network status is plan-specific. Never assume it from the size or name of a facility.' },
                  { t: 'Is Dr. Lee in network? She ordered the MRI, so that covers the network check.', fb: 'The ordering doctor does not perform the MRI. Check the facility and the reading radiologist.' }
                ],
                reply: 'St. Clare is in network. Riverbend Radiology Partners is in network too.'
              },
              {
                ladder: 'Requirements',
                options: [
                  { t: 'Does 73721 need prior auth or notification, and is imaging run by a vendor?', ok: true, fb: 'Good. Asking about carve-outs catches requirements the portal may not show.' },
                  { t: 'The portal showed no authorization rule, so I’ll note it as not required.', fb: 'A missing display is not a “no.” Confirm the requirement directly.' },
                  { t: 'It’s diagnostic rather than surgery, so I’ll assume no authorization is needed.', fb: 'Advanced imaging often needs authorization. Ask rather than assume.' }
                ],
                reply: 'Yes. Advanced imaging is carved out to {vendor}. Prior authorization is required through them. The deductible is $1,500 and $600 has been met.'
              },
              {
                ladder: 'Accumulators and traceability',
                options: [
                  { t: 'Is that individual or family, and what remains for Rosa herself?', ok: true, fb: 'Good. Individual and family amounts can be very different.' },
                  { t: 'So $900 remains. Thank you, I’ll use $900 in the estimate for Rosa.', fb: 'You do not yet know whether $1,500 is individual or family. The estimate could be wrong.' },
                  { t: 'So she has met part of it, and she’ll owe only the 20% coinsurance.', fb: 'The deductible is not met. Rosa may owe the remaining deductible first.' }
                ],
                reply: 'That was family. Rosa’s individual deductible is $1,000 with $400 met, so $600 remains. Your reference number is 26-1104-88213.'
              }
            ],
            summary: { title: 'Your verification record', rows: [
              ['Plan', '{payer}, active since 01/01/2026, checked for DOS 11/04/2026'],
              ['Service', 'CPT 73721, place of service 22: 80% after deductible'],
              ['Network', '{hospital} in network; Riverbend Radiology Partners in network'],
              ['Requirements', 'Prior authorization required through {vendor} (carve-out)'],
              ['Deductible', 'Individual $1,000, $600 remaining (family $1,500, $600 met)'],
              ['Source', 'Payer phone, rep Janelle, ref 26-1104-88213'],
              ['Status', 'Pending: authorization to request through {vendor}']
            ] },
            coaching: [
              'Turn every general answer into a specific one: exact code, exact setting.',
              'Check network for the facility and for the provider who performs or reads the service.',
              'Ask about authorization and carve-outs directly; portals do not always show them.',
              'Separate individual and family accumulators, and always leave with a reference number.'
            ]
          },
          {
            id: 's4-try', kind: 'reflect', title: 'Try it: make a general answer specific',
            prompts: [
              { id: 'q1', q: 'A portal shows: “Physical therapy: active, covered at 80% after deductible.” The patient is booked for 12 outpatient PT visits at a hospital-based clinic. Write the questions you would ask the payer before treating this as verified.', expectWords: 40 }
            ],
            coaching: [
              'Look for the setting (hospital-based clinics may bill differently), visit limits and how many are used, authorization or notification, and network status for the clinic and therapist.',
              'Finish with the reference number and the representative’s name.'
            ],
            model: [
              '“Does the 80% apply to PT at a hospital outpatient clinic? Is there a visit limit this year, and how many visits have been used? Is authorization or notification required, and after how many visits? Are the clinic and the therapist in network? What is the individual deductible remaining? May I have your name and a reference number?”'
            ]
          },
          {
            id: 's4-cfu', kind: 'quiz', title: 'Check for understanding',
            questions: [
              {
                id: 's4q1',
                q: 'You are verifying benefits for a CT scheduled on 11/20. Which date should your eligibility inquiry use?',
                options: [
                  { t: '11/20, the expected date of service, noting the plan’s start and end dates on file.', ok: true, fb: 'Right. Coverage must be active on the date of service, which may differ from today.' },
                  { t: 'Today’s date, since that confirms the plan is active for the patient right now.', fb: 'Plans can end before the date of service. Check the date that will be billed.' },
                  { t: 'The date the order was signed, since that is when the service was requested.', fb: 'The order date is not the date that will be billed. Use the date of service.' }
                ]
              },
              {
                id: 's4q2',
                q: 'A patient has a plan through her employer and is also a dependent on her husband’s plan. How do you set the payer order?',
                options: [
                  { t: 'Confirm it through approved sources and document which plan pays first.', ok: true, fb: 'Right. Payer order follows coordination-of-benefits rules, confirmed through approved sources.' },
                  { t: 'List the plan she mentioned first as primary, since she knows her plans.', fb: 'Patients often do not know the coordination rules. Confirm, then document.' },
                  { t: 'List the plan with the lower deductible first to reduce what she owes.', fb: 'Payer order is set by rules, not by what would be cheapest for the patient.' }
                ]
              }
            ]
          },
          {
            id: 's4-board', kind: 'board', round: 1, title: 'Front-End Board, Round 1',
            intro: 'Pick any clue. Each one is a short work situation. Higher values are harder. The countdown is optional: it reminds you that every account has a date of service.',
            seconds: 30,
            categories: ['Patient', 'Service', 'Coverage'],
            clues: [
              {
                id: 'b1-p200', cat: 'Patient', value: 200,
                q: 'Two records match the caller’s name. One has the right date of birth but an old address. Before updating anything, you…',
                options: [
                  { t: 'Verify more identifiers through the approved search before choosing.', ok: true, fb: 'Right. Use multiple identifiers before updating or creating a record.' },
                  { t: 'Create a new record so you don’t change the wrong patient by mistake.', fb: 'That creates a duplicate record, which causes its own errors.' },
                  { t: 'Pick the record with the matching birth date and update its address.', fb: 'One matching identifier is not enough. Verify more before updating.' }
                ]
              },
              {
                id: 'b1-p400', cat: 'Patient', value: 400,
                q: 'A caller says, “I’m his wife, I handle all his medical stuff.” She is not listed as authorized. She asks for his balance.',
                options: [
                  { t: 'Explain you can’t share it, and how he can add her as authorized.', ok: true, fb: 'Right. Be helpful about the process without sharing protected details.' },
                  { t: 'Share the balance only, since a balance holds no medical details.', fb: 'Account balances are protected information linked to the patient.' },
                  { t: 'Ask her to confirm his date of birth, then share the balance.', fb: 'Knowing his date of birth does not make her authorized.' }
                ]
              },
              {
                id: 'b1-s200', cat: 'Service', value: 200,
                q: 'The order says “knee X-ray, 3 views, left.” The patient insists it is the right knee.',
                options: [
                  { t: 'Keep the order as written and route the difference to the ordering office.', ok: true, fb: 'Right. You never change an order; you route the discrepancy.' },
                  { t: 'Schedule the right knee, since the patient knows which of her knees hurts.', fb: 'You never alter the order, even to match the patient.' },
                  { t: 'Schedule both knees so the imaging team can decide which one on the day.', fb: 'That adds an unordered service. Route the question instead.' }
                ]
              },
              {
                id: 'b1-s400', cat: 'Service', value: 400, pressure: true,
                q: 'Your supervisor says, “Just book her. We’ll sort out the expired order on the day.” The order expired last week.',
                options: [
                  { t: 'Explain the order has expired and escalate for a renewed order.', ok: true, fb: 'Right. Pressure does not change the control. Escalate with the facts.' },
                  { t: 'Book it as asked, since your supervisor takes responsibility for it.', fb: 'The appointment still is not valid, and the patient bears the impact.' },
                  { t: 'Book it, and note in the account that the order expired last week.', fb: 'A note does not fix an expired order. Escalate before booking.' }
                ]
              },
              {
                id: 'b1-c200', cat: 'Coverage', value: 200,
                q: 'The portal says “Active” and shows only “Outpatient services: covered.”',
                options: [
                  { t: 'Keep it pending and verify the exact service, setting, network and rules.', ok: true, fb: 'Right. Active plus a general benefit is not a complete verification.' },
                  { t: 'Mark it verified, since outpatient services include this outpatient test.', fb: 'A general benefit may not apply to this code, setting or provider.' },
                  { t: 'Mark it verified, and ask the patient to confirm the benefit with the plan.', fb: 'Verification is your task. Passing it to the patient leaves the gap open.' }
                ]
              },
              {
                id: 'b1-c400', cat: 'Coverage', value: 400,
                q: 'A patient says a plan representative told her the service is covered at no cost. Your verification shows a deductible and 20% coinsurance.',
                options: [
                  { t: 'Reverify plan, service, facility and setting; get a reference number.', ok: true, fb: 'Right. Reconcile the details before accepting either answer.' },
                  { t: 'Tell her the representative was mistaken and your verification is correct.', fb: 'Either answer could be wrong. Reconcile and reverify instead of dismissing her.' },
                  { t: 'Tell her the service is at no cost, since the plan told her so directly.', fb: 'That is a guarantee based on an unverified statement.' }
                ]
              }
            ],
            coaching: [
              'Verify with more than one identifier, and confirm authority before sharing anything.',
              'Never change an order; route discrepancies to the ordering office.',
              'Pressure does not change a control. Escalate with facts instead.',
              'Active plus a general benefit is not verification. Reconcile conflicting answers before speaking to the patient.'
            ]
          }
        ]
      },

      /* ================= SECTION 5 ================= */
      {
        id: 's5', num: 5, title: 'Prior Authorization',
        lessons: [
          {
            id: 's5-read', kind: 'reading', title: 'Approval must match the service',
            intro: 'An authorization number is not a green light. It is a set of details that must match what is scheduled.',
            blocks: [
              { t: 'callout', label: 'Why it matters', x: 'The approval said 6 therapy visits. The schedule said 12. Visits 7 to 12 went ahead without approval and were denied. The team thought “approved” meant the whole plan of care.' },
              { t: 'h', x: 'Know which one you are dealing with' },
              { t: 'table', head: ['Term', 'What it is'], rows: [
                ['Referral', 'Direction from an authorized provider, often a primary care provider, for specialty care under certain plans.'],
                ['Prior authorization', 'The payer reviews the service before it happens. Also called precertification.'],
                ['Notification', 'Telling the payer that a service is planned or has happened. Rules vary.'],
                ['Predetermination', 'A pre-service review that gives information. It is not necessarily an authorization.']
              ] },
              { t: 'h', x: 'Your part, and its limits' },
              { t: 'p', x: 'You manage the administrative process: confirm the requirement, gather inputs from approved sources, submit through the right channel, track it, check the decision and tell the teams affected. You never write clinical justification, choose a diagnosis to get approval, mark a request urgent without clinical direction, or change the service to match an approval.' },
              { t: 'h', x: 'Status rules' },
              { t: 'ul', items: [
                'Pending is not approved.',
                'A partial approval must be compared with what is scheduled.',
                'Approved does not guarantee payment.',
                'Denied goes to the clinical or operational owner.',
                'Expired, cancelled or withdrawn approvals do not support clearance.',
                'An authorization never replaces active eligibility.'
              ] },
              { t: 'h', x: 'Check the approval field by field' },
              { t: 'p', x: 'Patient and member · payer and plan · service or code · provider · facility and place of service · dates · visits or units · authorization number · conditions or level of care.' },
              { t: 'p', x: 'Every request needs an owner, a submission date, a follow-up date and an escalation deadline set from the date of service. A fax sent is not a fax received: confirm receipt.' },
              { t: 'example', title: 'Worked example: field by field', rows: [
                ['Scheduled', 'MRI at Facility B on 11/15'],
                ['Approved', 'MRI at Facility A, 11/01 to 11/30'],
                ['Match?', 'Service ✓ · Dates ✓ · Facility ✕'],
                ['Decision', 'Not cleared. Ask the authorization owner or payer to amend or confirm before 11/15.']
              ] },
              { t: 'deeper', title: 'Go deeper: when a request is denied', blocks: [
                { t: 'ul', items: [
                  'Record the exact reason, decision date, case number, payer instructions and any deadline for reconsideration, peer-to-peer review or appeal.',
                  'Tell an administrative denial (missing information, wrong facility) apart from a clinical one (medical necessity).',
                  'Route clinical denials to the clinical or utilization-review owner. You may coordinate documents and deadlines, but you do not write the argument.',
                  'Tell scheduling and financial clearance before the date of service. Do not tell the patient the service is cancelled unless the responsible team confirms it.'
                ] }
              ] }
            ]
          },
          {
            id: 's5-sort', kind: 'sort', title: 'Authorization audit',
            intro: 'Compare each scheduled service with its approval and place it in a bucket. Drag a card, or select it and choose where to move it.',
            buckets: ['Cleared', 'Partly supported: track or recheck', 'Not cleared'],
            items: [
              { id: 'i1', t: 'Scheduled: MRI at Facility B on 11/15. Approved: MRI at Facility A, 11/01–11/30.', b: 2, fb: 'The facility does not match. Not cleared until amended or confirmed.' },
              { id: 'i2', t: 'Scheduled: 12 therapy visits. Approved: 6 visits.', b: 1, fb: 'Six visits are supported. Track use and request more before visit 7.' },
              { id: 'i3', t: 'Scheduled: outpatient procedure on 10/20. Approved: 10/01–10/15.', b: 2, fb: 'The date falls outside the approved window. Not cleared.' },
              { id: 'i4', t: 'Procedure code changed after clinical review. Approval: original code.', b: 1, fb: 'Recheck whether the new code needs its own approval, and update if required.' },
              { id: 'i5', t: 'Coverage ended before the date of service. Approval still in the system.', b: 2, fb: 'An approval does not replace active eligibility. Not cleared.' },
              { id: 'i6', t: 'Echocardiogram, CPT 93306, Heart Center, 11/12. Approved: same code, provider and facility, 11/01–11/30.', b: 0, fb: 'Every field matches. Cleared.' },
              { id: 'i7', t: 'PT visit 3 of 6 on 11/09 at the same clinic. Approved: 6 visits, 10/15–12/15.', b: 0, fb: 'Within visits, dates and location. Cleared.' }
            ],
            coaching: [
              'Compare every field: service, provider, facility, dates, visits or units.',
              'A partial approval is not a denial, but it must be tracked so care does not go beyond it.',
              'A code change after review means rechecking the approval, not assuming it still applies.',
              'Approval never replaces eligibility. Check coverage for the date of service, too.'
            ]
          },
          {
            id: 's5-try', kind: 'reflect', title: 'Try it: “We have an auth number, we’re good”',
            prompts: [
              { id: 'q1', q: 'A coworker says, “We have an auth number, we’re good.” Write what you would say back in two or three sentences, and name the fields you would check.', expectWords: 40 }
            ],
            coaching: [
              'An authorization number proves a request exists, not that it matches the scheduled service.',
              'Name the fields: patient, plan, code, provider, facility, dates, visits or units, status.'
            ],
            model: [
              '“The number tells us there is a request, but not that it matches. Before we call it cleared, let’s compare the code, provider, facility, dates and visit count with the schedule, and confirm the status is approved and the plan is active on the date of service.”'
            ]
          },
          {
            id: 's5-cfu', kind: 'quiz', title: 'Check for understanding',
            questions: [
              {
                id: 's5q1',
                q: 'The authorization status still shows “Pending” two days before the procedure. What do you do?',
                options: [
                  { t: 'Escalate to the authorization owner now, with the case number and the date.', ok: true, fb: 'Right. A near date of service with a pending request is a trigger to escalate.' },
                  { t: 'Leave it booked, since most pending requests are approved by the date.', fb: 'Pending is not approved. Waiting leaves no time to act if it is denied.' },
                  { t: 'Tell the patient the procedure will be cancelled if approval is late.', fb: 'Cancellation is a decision for the responsible team, not something to promise or threaten.' }
                ]
              },
              {
                id: 's5q2',
                q: 'The payer asks for more clinical records to finish its review. What is your part?',
                options: [
                  { t: 'Route the request to the clinical owner with the deadline, then track it.', ok: true, fb: 'Right. You coordinate and track; the clinical team supplies the clinical content.' },
                  { t: 'Write a short summary of the patient’s condition from the chart and send it.', fb: 'Writing clinical content is outside the role, even as a summary.' },
                  { t: 'Send the records you can find and add a note on why the test is needed.', fb: 'Explaining why a test is needed is clinical justification. Route it.' }
                ]
              }
            ]
          }
        ]
      },

      /* ================= SECTION 6 ================= */
      {
        id: 's6', num: 6, title: 'Estimates and Accumulators',
        lessons: [
          {
            id: 's6-read', kind: 'reading', title: 'Building an estimate you can defend',
            intro: 'A good estimate is honest about what it includes, what it leaves out, and why it may change.',
            blocks: [
              { t: 'callout', label: 'Why it matters', x: 'A patient was told $200 for a hospital outpatient procedure. The bill was $640. The estimate covered the surgeon only. The facility charge, anesthesia and pathology were never mentioned.' },
              { t: 'h', x: 'The foundational order' },
              { t: 'ol', items: [
                'Apply any service-specific copay, as the benefit states.',
                'Apply the remaining deductible to the allowed amount.',
                'Apply coinsurance to what remains after the deductible.',
                'Cap at the remaining out-of-pocket maximum, if plan rules confirm the charges count.'
              ] },
              { t: 'example', title: 'Worked example', rows: [
                ['Inputs', '$1,000 allowed · $300 deductible remaining · 20% coinsurance'],
                ['Deductible', '$300'],
                ['Coinsurance', '20% of the remaining $700 = $140'],
                ['Estimate', '$440, subject to plan rules and claim processing']
              ] },
              { t: 'h', x: 'Accumulators move' },
              { t: 'p', x: 'Accumulators are the running totals toward the deductible and out-of-pocket maximum. They change as claims process. A recent visit may not show yet, claims can process out of order, and a reversed claim can restore a balance. Individual and family amounts, and in-network and out-of-network amounts, are tracked separately. Monday’s balance is not reserved for Friday’s service.' },
              { t: 'h', x: 'Name the components' },
              { t: 'p', x: 'An encounter can include a professional fee, a facility fee, anesthesia, a radiology reading, pathology or lab, and implants, drugs or supplies. If your estimate covers only some of them, say so.' },
              { t: 'h', x: 'Say it safely' },
              { t: 'p', x: 'State the amount, the information used, what is included, what is excluded or unknown, and that it may change after the claim is processed.' },
              { t: 'table', head: ['Avoid', 'Use instead'], rows: [
                ['“Your insurance covers this.”', '“The plan shows this benefit for the service we verified, subject to review when the claim is processed.”'],
                ['“You only owe $200.”', '“Based on current benefits, your estimated share is $200. It may change after the claim is processed.”'],
                ['“It’s approved, so it will be paid.”', '“It has an approval for the details listed. Payment still depends on eligibility, benefits and claim review.”']
              ] },
              { t: 'deeper', title: 'Go deeper: self-pay patients and Good Faith Estimates', blocks: [
                { t: 'p', x: 'For uninsured or self-pay patients, federal rules may require a Good Faith Estimate. Follow your provider’s approved process and timing rather than deciding compliance yourself.' },
                { t: 'link', x: 'CMS: What is a Good Faith Estimate?', href: 'https://www.cms.gov/initiatives/your-patient-rights/medical-bill-rights/get-help/guides-resources/what-good-faith-estimate' }
              ] }
            ]
          },
          {
            id: 's6-calc', kind: 'calc', title: 'Calculate three estimates',
            intro: 'Work out the patient’s estimated share for each case. Enter a dollar amount. You need all three right to continue, and you can retry as often as you like.',
            cases: [
              {
                id: 'c1', title: 'Case A: hospital outpatient imaging',
                inputs: [['Allowed amount', '$900'], ['Deductible remaining', '$250'], ['Coinsurance', '20%'], ['Copay', 'None']],
                answer: 380,
                hint: 'Apply the remaining deductible first, then take 20% of what is left.',
                steps: ['Deductible: $250', 'Remaining: $900 − $250 = $650', 'Coinsurance: 20% × $650 = $130', 'Estimate: $250 + $130 = $380']
              },
              {
                id: 'c2', title: 'Case B: specialist office visit',
                inputs: [['Allowed amount', '$150'], ['Specialist copay', '$40'], ['Deductible', 'Does not apply to this visit, per the quoted benefit']],
                answer: 40,
                hint: 'Read the benefit carefully. What applies to this visit, and what does not?',
                steps: ['The quoted benefit is a $40 copay with no deductible.', 'Estimate: $40, subject to verification and claim processing.']
              },
              {
                id: 'c3', title: 'Case C: facility charge near the out-of-pocket limit',
                inputs: [['Allowed amount', '$2,000'], ['Deductible remaining', '$0'], ['Coinsurance', '10%'], ['Out-of-pocket remaining', '$120 (plan confirms these charges count)']],
                answer: 120,
                hint: 'Work out the coinsurance, then compare it with what is left of the out-of-pocket maximum.',
                steps: ['Coinsurance: 10% × $2,000 = $200', 'Out-of-pocket remaining is $120, so the share is capped.', 'Estimate: up to $120, because plan rules confirm the charges count.']
              }
            ],
            coaching: [
              'Order matters: copay as stated, then remaining deductible, then coinsurance on the rest, then the out-of-pocket cap.',
              'Always use the remaining deductible, never the full deductible.',
              'Apply the out-of-pocket cap only when plan rules confirm the charges count toward it.'
            ]
          },
          {
            id: 's6-say', kind: 'spoken', title: 'Say it out loud',
            intro: 'Rosa asks, “So what will I owe for the MRI?” Use Case A ($380). Explain it out loud as you would on the phone. You have 60 seconds.',
            seconds: 60,
            scenario: [['Estimate', '$380'], ['Based on', '$900 allowed, $250 deductible remaining, 20% coinsurance, checked 11/02'], ['Included', 'Hospital imaging charge'], ['Not included', 'The radiologist’s reading, billed separately']],
            rubric: [
              'I called it an estimate, not a final amount.',
              'I said what information I used.',
              'I said what is included.',
              'I said what is not included or not yet known.',
              'I explained it may change after the claim is processed, and why.',
              'I avoided guarantee words such as “covered,” “final” or “only owe.”'
            ],
            coaching: [
              'Lead with the number, then the reasons. Patients remember the first thing you say.',
              'Name what is excluded. A separate bill the patient was never warned about is a broken promise.',
              'Practise until the qualifying language sounds natural, not like a disclaimer.'
            ]
          },
          {
            id: 's6-cfu', kind: 'quiz', title: 'Check for understanding',
            questions: [
              {
                id: 's6q1',
                q: 'A patient has $600 of deductible remaining and says a large claim from another provider is still pending. Your service is $1,000 allowed with 20% coinsurance. What do you tell the patient?',
                options: [
                  { t: 'The estimate is $680 from today’s balance, and the pending claim may lower it.', ok: true, fb: 'Right. Give the estimate, name the uncertainty, and document it.' },
                  { t: 'The estimate is $680, and that amount is now fixed because we have checked it.', fb: 'Accumulators change as claims process. Calling it fixed is a guarantee.' },
                  { t: 'We can’t give any estimate until the other provider’s claim has processed.', fb: 'You can estimate from current data. Explain how it may change instead.' }
                ]
              },
              {
                id: 's6q2',
                q: 'An estimate for a hospital outpatient procedure covers the surgeon’s fee only. What do you do when you share it?',
                options: [
                  { t: 'Say it covers the surgeon only and name the charges it leaves out.', ok: true, fb: 'Right. A partial estimate is acceptable if its scope is clear.' },
                  { t: 'Present it as the total, since the surgeon’s fee is the largest part.', fb: 'Facility and other charges can be larger. Presenting it as the total misleads.' },
                  { t: 'Add 50% to it as an allowance for the hospital and other charges.', fb: 'An invented allowance is not an approved method. State the scope instead.' }
                ]
              }
            ]
          }
        ]
      },

      /* ================= SECTION 7 ================= */
      {
        id: 's7', num: 7, title: 'Clear, Document, Escalate',
        lessons: [
          {
            id: 's7-read', kind: 'reading', title: 'The Clearance Call',
            intro: 'Every account ends with a decision, a record of how you reached it, and a clear next step.',
            blocks: [
              { t: 'callout', label: 'Why it matters', x: 'Your shift ends. A teammate opens the account and reads: “Called payer, pt covered.” Which payer? Which service? Who did you speak to? They make the same 40-minute call again, and the patient gets a second, slightly different answer.' },
              { t: 'h', x: 'Make the call' },
              { t: 'model', id: 'clearance' },
              { t: 'p', x: 'Your words must match your status. If an account is pending, you cannot tell the patient they are all set. Some organizations allow “conditionally cleared” for a defined pending item; use it only when policy says so.' },
              { t: 'h', x: 'Write notes a teammate can act on' },
              { t: 'ul', items: [
                'Document as you go, within the approved workflow.',
                'State facts, sources and dates. Keep facts separate from interpretation.',
                'Include the representative’s name or ID and the reference number.',
                'Say what is pending, who owns it and the next follow-up date.',
                'Never paste old notes without re-checking them, and never record an action you did not complete.',
                'Describe patients objectively; never label someone as difficult.'
              ] },
              { t: 'h', x: 'Escalate in five parts' },
              { t: 'table', head: ['Part', 'What to write'], rows: [
                ['Issue', 'The discrepancy, in one line.'],
                ['Impact', 'The effect on the service, patient, payment or compliance.'],
                ['Evidence', 'Sources checked, results and reference numbers.'],
                ['Deadline', 'The date of service and how time-sensitive it is.'],
                ['Action needed', 'The specific decision, confirmation or correction you need.']
              ] },
              { t: 'example', title: 'Worked example: a model note', rows: [
                ['Note', 'Eligibility and outpatient diagnostic benefits verified via {payer} portal on 10/11/2026 for DOS 10/21/2026. Active since 01/01/2026. Rendering provider and facility in network for this plan. Individual deductible $1,500, $500 remaining. Coinsurance 20% after deductible. Individual out-of-pocket $4,000, $1,250 remaining. Portal did not show an authorization rule for this code; payer call required before clearance. Owner: Benefits Team. Follow-up due 10/14/2026.'],
                ['Status', 'Pending']
              ] },
              { t: 'deeper', title: 'Go deeper: the final consistency check', blocks: [
                { t: 'ul', items: [
                  'Does the order match the scheduled service?',
                  'Does the benefit check match the service and place of service?',
                  'Does the authorization match the appointment, provider, facility, dates, visits and units?',
                  'Does the estimate use the same service and current accumulators?',
                  'Does what the patient was told match what is documented?'
                ] }
              ] }
            ]
          },
          {
            id: 's7-cap', kind: 'hunt', title: 'Capstone account review',
            intro: 'Aisha Thompson has a right knee arthroscopy (CPT 29881) at {surgery}, outpatient surgery, on 11/18/2026 with {drOrtiz}. Review all six records and select every field that has a problem. There are eight.',
            hints: ['dates that do not cover the date of service', 'anything not displayed or not checked', 'family vs individual amounts', 'what an estimate leaves out', 'notes a teammate could not act on'],
            docs: [
              {
                title: 'Order', sub: '{drOrtiz} · signed 10/05/2026',
                fields: [
                  { id: 'k1', label: 'Patient', value: 'Aisha Thompson · DOB 09/09/1984', fb: 'Matches the other records.' },
                  { id: 'k2', label: 'Procedure', value: 'Knee arthroscopy with meniscectomy · CPT 29881 · Right', fb: 'Matches the appointment and authorization.' },
                  { id: 'k3', label: 'Facility', value: '{surgery}, outpatient surgery', fb: 'Matches the appointment and authorization.' }
                ]
              },
              {
                title: 'Appointment', sub: 'Scheduling system',
                fields: [
                  { id: 'k4', label: 'Date of service', value: '11/18/2026, 7:30 AM', fb: 'The date itself is fine. Check what the other records say about it.' },
                  { id: 'k5', label: 'Pre-op clearance', value: 'Not received · no owner assigned', issue: true, fb: 'A required prerequisite is open with no owner or due date. Assign and track it.' }
                ]
              },
              {
                title: 'Portal response', sub: '{payer} · checked 10/12/2026',
                fields: [
                  { id: 'k6', label: 'Eligibility', value: 'Active since 01/01/2026', fb: 'Active, but remember to reconfirm near the date of service.' },
                  { id: 'k7', label: 'Benefit', value: 'CPT 29881, place of service 22: 20% after deductible', fb: 'This is service-specific. Good.' },
                  { id: 'k8', label: 'Facility network', value: '{surgery}: in network', fb: 'Facility network was checked.' },
                  { id: 'k9', label: 'Surgeon network', value: 'Not displayed', issue: true, fb: 'The surgeon’s network status was never confirmed. It can differ from the facility’s.' },
                  { id: 'k10', label: 'Deductible', value: 'Family $3,000 · $2,400 met', issue: true, fb: 'Only the family amount was captured. Aisha’s individual deductible remaining is unknown.' }
                ]
              },
              {
                title: 'Authorization letter', sub: 'Auth A-55120 · Approved',
                fields: [
                  { id: 'k11', label: 'Service', value: 'CPT 29881 · {drOrtiz} · {surgery}', fb: 'Code, provider and facility match.' },
                  { id: 'k12', label: 'Approved dates', value: '10/20/2026 – 11/15/2026', issue: true, fb: 'The surgery is on 11/18, after the approval ends. Not cleared until the dates are extended.' }
                ]
              },
              {
                title: 'Estimate', sub: 'Prepared 10/12/2026',
                fields: [
                  { id: 'k13', label: 'Scope', value: 'Surgeon fee only: $410 estimated', issue: true, fb: 'A hospital outpatient surgery also has facility, anesthesia and possibly pathology charges. The scope must be stated.' },
                  { id: 'k14', label: 'Coinsurance used', value: '20%', fb: 'Matches the benefit.' }
                ]
              },
              {
                title: 'Prior note', sub: 'Account notes',
                fields: [
                  { id: 'k15', label: 'Entry, part 1', value: '“10/11 called payer, pt covered.”', issue: true, fb: 'No representative, reference number, service or source. A teammate would have to call again.' },
                  { id: 'k16', label: 'Entry, part 2', value: '“Auth ok.”', issue: true, fb: '“Ok” for which code, facility and dates? The dates do not cover the surgery.' },
                  { id: 'k17', label: 'Entry, part 3', value: '“Told pt $200.”', issue: true, fb: 'This conflicts with the $410 estimate and gives no scope or qualifier. Expect a dispute.' }
                ]
              }
            ],
            coaching: [
              'Walk the chain record by record. One break, like the approval dates, makes everything after it unreliable.',
              'Check what is missing as well as what is wrong: “not displayed” is a finding.',
              'Family and individual accumulators lead to very different estimates.',
              'If a note would not let a teammate continue, it is not finished.'
            ]
          },
          {
            id: 's7-note', kind: 'note', title: 'Your work-ready note and escalation',
            intro: 'Write the note and escalation you would leave on this account. This is the kind of writing you will do every day on the job, so write it as you would for real.',
            record: [
              ['Patient', 'Grace Kim · DOB 04/17/1990'],
              ['Service', 'Outpatient physical therapy evaluation at {rehab} (hospital-based), 11/04/2026'],
              ['Authorization', 'Approved 10/28/2026 · #PT-30418 · evaluation + 6 visits · 11/01–12/31/2026'],
              ['Eligibility re-check', '{payer} portal, 11/02/2026 at 10:15 AM: coverage ended 11/03/2026'],
              ['Patient told?', 'Not yet'],
              ['Your team', 'Financial clearance owner: Intake Lead (Marisol Vega) · Scheduling: Rehab Front Desk']
            ],
            statuses: ['Cleared', 'Pending', 'Not cleared', 'Escalated'],
            okStatuses: ['Not cleared', 'Escalated'],
            statusFb: {
              'Cleared': 'An approval does not replace eligibility. With coverage ending before the visit, this cannot be cleared.',
              'Pending': 'Pending means something is still being worked on. Here a material requirement has failed: coverage ends before the date of service.',
              'Not cleared': 'Right. Coverage ends before the date of service, so the account is not cleared, and it needs an escalation.',
              'Escalated': 'Right. The decision about the visit is outside your authority, so you escalate with evidence. The account is also not cleared.'
            },
            fields: [
              { id: 'note', label: 'Account note', hint: 'Facts, source, date and time, what is open, owner, follow-up date', minWords: 25, rows: 5 },
              { id: 'issue', label: 'Escalation: Issue', hint: 'The discrepancy in one line', minWords: 5, rows: 2 },
              { id: 'impact', label: 'Escalation: Impact', hint: 'Effect on the patient, service or payment', minWords: 5, rows: 2 },
              { id: 'evidence', label: 'Escalation: Evidence', hint: 'Sources, results, reference numbers', minWords: 5, rows: 2 },
              { id: 'deadline', label: 'Escalation: Deadline', hint: 'Date of service and time-sensitivity', minWords: 3, rows: 1 },
              { id: 'action', label: 'Escalation: Action needed', hint: 'The specific decision or correction you need', minWords: 5, rows: 2 }
            ],
            rubric: [
              'My note names the source, date and time.',
              'My note keeps facts separate from opinion.',
              'I included the authorization number and dates.',
              'I said what is still open.',
              'I named an owner.',
              'I gave a follow-up date or deadline.'
            ],
            model: {
              note: '11/02/2026 10:15 AM: {payer} portal shows coverage ended 11/03/2026. PT evaluation scheduled 11/04/2026 at {rehab}. Auth #PT-30418 approved 10/28 (eval + 6 visits, 11/01–12/31) but does not replace eligibility. Status: not cleared. Patient not yet informed. Escalated to Intake Lead (Marisol Vega). Follow-up due 11/03/2026 at noon.',
              issue: 'Coverage ends 11/03; PT evaluation is on 11/04.',
              impact: 'The visit would not be covered; the patient could receive an unexpected bill.',
              evidence: '{payer} portal 11/02 10:15 AM; Auth #PT-30418 (11/01–12/31).',
              deadline: 'DOS 11/04/2026, less than two days away.',
              action: 'Decide on outreach to the patient for new coverage or self-pay options, and whether to keep the visit.'
            },
            coaching: [
              'A good note lets a teammate act without repeating your work: source, time, facts, status, owner, date.',
              'An escalation asks for a specific decision by a specific time, with the evidence attached.',
              'Do not tell the patient the visit is cancelled until the responsible team decides.'
            ]
          },
          {
            id: 's7-cfu', kind: 'quiz', title: 'Check for understanding',
            questions: [
              {
                id: 's7q1',
                q: 'Which note lets a teammate continue without repeating your work?',
                options: [
                  { t: '11/02 portal: active for DOS 11/18. Ref 26-4471. Auth pending; owner Auth Team; follow-up 11/05.', ok: true, fb: 'Right. Source, date, reference, open item, owner and follow-up are all there.' },
                  { t: '11/02 checked the portal. Patient is active and should be fine. Auth pending, will follow up soon.', fb: '“Should be fine” is opinion, and there is no reference, owner or date.' },
                  { t: '11/02 portal: active for DOS. Called payer about the auth; rep said it looks good. All done.', fb: 'No reference number, no rep name, and “looks good” is not an authorization status.' }
                ]
              },
              {
                id: 's7q2',
                q: 'Everything is verified except a pre-op test result due two days before surgery. Your policy allows progression with a defined pending item. Which status fits?',
                options: [
                  { t: 'Conditionally cleared under policy, with the owner and due date recorded.', ok: true, fb: 'Right. Policy allows it, and the pending item is defined, owned and dated.' },
                  { t: 'Cleared, because the test result is clinical and not part of front-end checks.', fb: 'Prerequisites are part of readiness. The open item must be visible.' },
                  { t: 'Not cleared, because any open item means the account cannot move forward.', fb: 'Your policy allows a defined pending item here. Use the status policy provides.' }
                ]
              }
            ]
          }
        ]
      },

      /* ================= SECTION 8 ================= */
      {
        id: 's8', num: 8, title: 'Final Check and Wrap-up',
        lessons: [
          {
            id: 's8-board', kind: 'board', round: 2, title: 'Front-End Board, Round 2',
            intro: 'One more round before the graded check. Pick any clue; higher values are harder. The countdown is optional.',
            seconds: 30,
            categories: ['Authorization', 'Estimate', 'Record'],
            clues: [
              {
                id: 'b2-a200', cat: 'Authorization', value: 200,
                q: 'Six PT visits are approved and four have been used. The patient wants to book four more.',
                options: [
                  { t: 'Two approved visits remain; request more before booking beyond them.', ok: true, fb: 'Right. Track use and get more approved before going past the limit.' },
                  { t: 'Book all four, since the approval covers the therapist’s plan of care.', fb: 'The approval covers six visits, not the whole plan of care.' },
                  { t: 'Book all four; extra visits can be approved after they are delivered.', fb: 'Retroactive approval is rarely available. Request it in advance.' }
                ]
              },
              {
                id: 'b2-a400', cat: 'Authorization', value: 400, pressure: true,
                q: 'The surgeon’s office calls: “Mark it urgent so it’s approved faster.” Nothing in the record shows clinical urgency.',
                options: [
                  { t: 'Explain urgent needs clinical direction; ask them to document it if it applies.', ok: true, fb: 'Right. Urgent status needs approved clinical support, not a phone request.' },
                  { t: 'Mark it urgent as asked, since the request comes from the surgeon’s own office.', fb: 'A request is not clinical documentation. Urgent without support is a compliance risk.' },
                  { t: 'Mark it urgent and add a note that the office asked for the urgent status.', fb: 'The note does not make the classification supported.' }
                ]
              },
              {
                id: 'b2-e200', cat: 'Estimate', value: 200,
                q: '$1,000 allowed, $300 deductible remaining, 20% coinsurance. What is the estimate?',
                options: [
                  { t: '$440', ok: true, fb: 'Right: $300 deductible plus 20% of the remaining $700 ($140).' },
                  { t: '$500', fb: 'That applies 20% to the full $1,000. Coinsurance applies after the deductible.' },
                  { t: '$200', fb: 'That leaves out the remaining deductible.' }
                ]
              },
              {
                id: 'b2-e400', cat: 'Estimate', value: 400,
                q: 'You prepared an estimate on Monday. On Wednesday a $500 claim processed and applied to the deductible. The service is Friday.',
                options: [
                  { t: 'Recheck the accumulators before relying on Monday’s estimate.', ok: true, fb: 'Right. Balances change as claims process. Reverify per policy.' },
                  { t: 'Keep Monday’s estimate, since the balance was reserved when checked.', fb: 'Balances are never reserved for a scheduled service.' },
                  { t: 'Subtract $500 from Monday’s estimate and send the new total.', fb: 'The effect depends on plan rules. Recheck rather than calculating by hand.' }
                ]
              },
              {
                id: 'b2-r200', cat: 'Record', value: 200,
                q: 'A teammate suggests copying last week’s verification note into today’s account to save time.',
                options: [
                  { t: 'Reverify for today’s DOS and write a new, dated note.', ok: true, fb: 'Right. Never paste old notes without re-checking them.' },
                  { t: 'Copy it, since coverage rarely changes within a single week.', fb: 'Coverage and accumulators can change any day.' },
                  { t: 'Copy it and add “still valid” at the top so the date is clear.', fb: 'Writing “still valid” without checking is documenting work you did not do.' }
                ]
              },
              {
                id: 'b2-r400', cat: 'Record', value: 400, pressure: true,
                q: 'A lead says, “Just write that you called the payer. We’ll make the call tomorrow.”',
                options: [
                  { t: 'Document only what was done, and record the call as a pending task.', ok: true, fb: 'Right. You never document an action you did not complete.' },
                  { t: 'Write it as asked, then make the call first thing in the morning.', fb: 'The record would be false even if the call happens later.' },
                  { t: 'Write that the call was made, with tomorrow’s date beside it.', fb: 'A future-dated entry is still a record of work not done.' }
                ]
              }
            ],
            coaching: [
              'Partial approvals must be tracked so care does not go beyond them.',
              'Urgent status and clinical content come from the clinical team, never from pressure.',
              'Estimates are snapshots. When claims process, reverify.',
              'Your notes must be true when written. Never document work you have not done.'
            ]
          },
          {
            id: 's8-final', kind: 'final', title: 'Final Knowledge Check',
            subtitle: 'Tomorrow’s Schedule',
            intro: 'Ten patients are on tomorrow’s schedule. For each account, choose the action that keeps the patient and the claim safe. Accounts marked “Critical decision” must all be answered correctly to pass, along with an overall score of 80%. There is no time limit, and you can retake it.',
            questions: [
              {
                id: 'f1', account: 'Account 1 · Outpatient diagnostic test',
                q: 'The portal shows active coverage but only a general outpatient benefit. It shows no authorization rule, network status or facility cost share.',
                options: [
                  { t: 'Keep it pending and verify the exact service, setting, network and rules.', ok: true, fb: 'Active plus a general benefit is not a complete verification.' },
                  { t: 'Mark it cleared, since active coverage confirms this outpatient service.', fb: 'Treating active eligibility as proof of coverage for a specific service is a critical error.' },
                  { t: 'Mark it cleared and note that the patient can call the plan with questions.', fb: 'Verification is your job, and the gaps are still open.' }
                ]
              },
              {
                id: 'f2', account: 'Account 2 · Orthopedic procedure',
                q: 'The scheduler booked a routine follow-up, but the order describes a procedure that needs a longer slot and extra resources.',
                options: [
                  { t: 'Route it to the scheduling or clinical owner; reverify once corrected.', ok: true, fb: 'You never change the order, and benefits and authorization must match the corrected service.' },
                  { t: 'Change the order to a routine follow-up so it matches the booked appointment.', fb: 'Changing an order is outside the role.' },
                  { t: 'Keep the follow-up booked and let the clinic adjust the visit on the day.', fb: 'The wrong appointment type can mean missing resources, authorization and an unready patient.' }
                ]
              },
              {
                id: 'f3', account: 'Account 3 · Hospital procedure', critical: true,
                q: 'The procedure is approved. The authorization names Hospital A. The appointment is at Hospital B.',
                options: [
                  { t: 'Mark it not cleared, and ask the authorization owner or payer to correct or confirm it.', ok: true, fb: 'Approvals do not transfer between facilities without confirmation.' },
                  { t: 'Mark it cleared, since the procedure and dates match the approval on file.', fb: 'Missing a facility mismatch is a critical error.' },
                  { t: 'Mark it cleared and update the facility on the authorization record yourself.', fb: 'Only the payer can change an approval. Editing the record creates a false one.' }
                ]
              },
              {
                id: 'f4', account: 'Account 4 · Imaging', critical: true,
                q: 'Authorization was approved last week. Today’s eligibility check shows the plan ends the day before the service.',
                options: [
                  { t: 'Mark it not cleared, ask for updated insurance and notify the teams affected.', ok: true, fb: 'An approval never replaces active eligibility.' },
                  { t: 'Mark it cleared, since the payer approved it before the plan ended.', fb: 'Treating approval as a substitute for eligibility is a critical error.' },
                  { t: 'Tell the patient the appointment is cancelled because the coverage has ended.', fb: 'Cancellation is decided by the responsible team, not announced by you.' }
                ]
              },
              {
                id: 'f5', account: 'Account 5 · Physical therapy',
                q: 'Twelve visits were requested and six were approved. Four have been used.',
                options: [
                  { t: 'Two approved visits remain; request more before visit 7.', ok: true, fb: 'Partial approvals are tracked against use.' },
                  { t: 'Eight visits remain, since 12 were requested and 4 have been used.', fb: 'Only approved visits count, not requested ones.' },
                  { t: 'Book freely, since a partial approval means the rest will follow.', fb: 'There is no guarantee the rest will be approved.' }
                ]
              },
              {
                id: 'f6', account: 'Account 6 · Specialist procedure', critical: true,
                q: 'The patient has $600 of deductible remaining and a large claim pending elsewhere. The service is $1,000 allowed with 20% coinsurance. What do you tell the patient?',
                options: [
                  { t: 'Give a $680 estimate, explain the pending claim may change it, and document it.', ok: true, fb: 'You give the number with its basis and its uncertainty.' },
                  { t: 'A final amount of $680, since today’s balance is what the plan currently shows.', fb: 'Presenting an estimate as final is a guarantee, a critical error.' },
                  { t: 'No estimate at all until the patient’s other claim has fully processed.', fb: 'You can estimate from current data and explain how it may change.' }
                ]
              },
              {
                id: 'f7', account: 'Account 7 · Outpatient surgery',
                q: 'Allowed amount $1,200, deductible remaining $400, coinsurance 20%. What is the estimate?',
                options: [
                  { t: '$560', ok: true, fb: '$400 deductible plus 20% of the remaining $800 ($160).' },
                  { t: '$640', fb: 'That applies 20% to the full $1,200 instead of what remains after the deductible.' },
                  { t: '$240', fb: 'That leaves out the remaining deductible.' }
                ]
              },
              {
                id: 'f8', account: 'Account 8 · Hospital outpatient procedure',
                q: 'The patient received an estimate built from the surgeon’s fee only.',
                options: [
                  { t: 'Explain what it includes, and name the facility and other charges left out.', ok: true, fb: 'A partial estimate is fine when its scope is clear.' },
                  { t: 'Confirm it as the expected total, since the surgeon’s fee covers the procedure.', fb: 'Facility and other charges are often larger than the professional fee.' },
                  { t: 'Withdraw it and say no estimate is possible for hospital outpatient care.', fb: 'You can estimate; you just have to state the scope.' }
                ]
              },
              {
                id: 'f9', account: 'Account 9 · New patient call',
                q: 'After you verify identity, the patient says, “My plan changed last month.” What is your best next question?',
                options: [
                  { t: '“Did you get a new member ID or group number, and when did it start?”', ok: true, fb: 'A clarifying question gets the specifics you need.' },
                  { t: '“Is the new plan through the same insurance company as before?”', fb: 'Same company does not mean same plan, ID or rules.' },
                  { t: '“Should I keep your old plan on file too, just in case it’s needed?”', fb: 'Keeping an ended plan risks billing the wrong payer.' }
                ]
              },
              {
                id: 'f10', account: 'Account 10 · Surgery in four days',
                q: 'Which escalation is ready to send?',
                options: [
                  { t: '“Auth names Hosp A; DOS 11/18 at Hosp B. Ref 4471. Denial risk. Need amended auth by 11/16.”', ok: true, fb: 'Issue, evidence, impact, deadline and action are all there.' },
                  { t: '“Auth problem on Thompson’s surgery next week. Can someone please look into this one urgently?”', fb: 'No evidence, deadline or specific action needed.' },
                  { t: '“Auth names Hosp A; surgery is at Hosp B. Patient is upset. Please call her today.”', fb: 'It asks for the wrong action and leaves out the reference and deadline.' }
                ]
              }
            ]
          },
          {
            id: 's8-wrap', kind: 'wrapup', title: 'Confidence, commitments and feedback',
            intro: 'Three short steps: see how your confidence has changed, commit to specific actions, and tell us how the course worked for you.',
            commitments: {
              min: 2, max: 3,
              prompt: 'Write two or three specific actions. Each one needs a clear action and a date.',
              examples: ['Practise the Question Ladder opening out loud with a classmate on Friday.', 'Write one practice account note using the five-part escalation by 10/30.'],
              vague: ['better', 'more', 'improve', 'try to', 'try harder', 'communicate', 'be careful', 'do my best', 'focus']
            },
            survey: [
              { id: 'relevance', q: 'How relevant was this course to the work you are preparing for?', scale: ['Not relevant', 'Slightly', 'Moderately', 'Very', 'Extremely'] },
              { id: 'confidence', q: 'How confident are you to do Patient Access work after this course?', scale: ['Not confident', 'Slightly', 'Moderately', 'Very', 'Extremely'] },
              { id: 'use', q: 'How likely are you to use what you practised here?', scale: ['Not likely', 'Slightly', 'Moderately', 'Very', 'Extremely'] }
            ]
          },
          {
            id: 's8-cert', kind: 'certificate', title: 'Certificate and downloads',
            intro: 'Well done. Create your certificate, then download the PDF of your answers. It includes your job aid, the observation checklist and practice cards to share with your trainer.'
          }
        ]
      }
    ],

    /* ---------- MODELS (diagrams) ---------- */
    models: {
      chain: { title: 'The Front-End Control Chain', steps: [
        ['Patient', 'Right person, right record, current details, right subscriber'],
        ['Service', 'What is scheduled matches what was ordered'],
        ['Provider & Facility', 'Who performs it and where; both affect network and authorization'],
        ['Coverage', 'Active for the date of service, right payer order, benefits for this exact service'],
        ['Requirements', 'Referral, authorization, notification and records complete and matching'],
        ['Estimate', 'A reasonable, qualified expectation of what the patient may owe'],
        ['Record', 'Notes a teammate can act on without redoing your work']
      ] },
      ladder: { title: 'The Question Ladder', steps: [
        ['Broad', 'Greet, verify identity, and let the patient explain the need. “How can I help today?”'],
        ['Narrow', 'Service, timing, provider, location, insurance. “Which appointment is this for?”'],
        ['Clarify', 'Resolve differences and vague answers. “Did the member ID change?”'],
        ['Confirm', 'Read back names, dates, IDs and appointment details.'],
        ['Close', 'What is done, what is pending, who owns it, and when.']
      ] },
      clearance: { title: 'The Clearance Call', steps: [
        ['Cleared', 'Every required front-end element is complete and matches.'],
        ['Pending', 'Something required is still open. It has an owner and a follow-up date.'],
        ['Not cleared', 'Something material is missing, invalid, denied or mismatched.'],
        ['Escalated', 'The decision or fix is outside your authority. It is routed with evidence.']
      ] }
    },

    /* ---------- TAKEAWAYS (PDF) ---------- */
    jobAid: {
      title: 'Patient Access Job Aid',
      blocks: [
        ['The Front-End Control Chain', ['Patient: right person, record, subscriber', 'Service: scheduled matches ordered (side, code, prerequisites)', 'Provider & Facility: both checked for network and authorization', 'Coverage: active on the DOS, payer order, benefits for this code and setting', 'Requirements: referral, authorization, records match field by field', 'Estimate: copay, then remaining deductible, then coinsurance, then out-of-pocket cap', 'Record: source, date, reference, open item, owner, deadline']],
        ['The Question Ladder', ['Broad: greet, verify identity, let them explain', 'Narrow: service, timing, provider, location, insurance', 'Clarify: resolve differences; ask about other coverage', 'Confirm: read back names, IDs, dates, details', 'Close: done, pending, owner, when']],
        ['The Clearance Call', ['Cleared: complete and matching', 'Pending: open item with owner and date', 'Not cleared: missing, invalid, denied or mismatched', 'Escalated: outside your authority, routed with evidence', 'Your words must match your status']],
        ['Escalate in five parts', ['Issue · Impact · Evidence · Deadline · Action needed']],
        ['Say it safely', ['“Based on the information available today, your estimated share is…”', '“It may change after the claim is processed because…”', '“This includes… It does not include…”', 'Never say: fully covered, you will owe nothing, final bill, approved so it will be paid']]
      ]
    },

    observation: {
      title: 'Observation Checklist',
      intro: 'For a trainer, coach or peer. Observe one mock or live Patient Access interaction and the related account note within 30 days of completing the course.',
      items: [
        'Verifies identity, and authority for anyone calling for the patient, before discussing details.',
        'Lets the patient explain, then narrows with focused questions.',
        'Asks the gap-finding question about other coverage.',
        'Clarifies differences instead of assuming.',
        'Reads back names, IDs, dates and appointment details.',
        'Enters data with zero errors, checked against the read-back.',
        'Verifies service-specific benefits: code, setting, provider and facility network, requirements.',
        'Checks the authorization field by field before calling it cleared.',
        'States estimates with inputs, inclusions, exclusions and that they may change.',
        'Uses no guarantee language.',
        'Writes a note with source, date, reference, open item, owner and deadline.',
        'Escalates with Issue, Impact, Evidence, Deadline and Action needed.'
      ]
    },

    trainerGuide: {
      title: 'Trainer Conversation Guide',
      intro: 'Five questions to ask the learner after completion. Listen for the models in their answers.',
      questions: [
        'Walk me through the Control Chain for an account you might verify tomorrow. Where do you expect breaks?',
        'Say your opening and identity check to me as you would on a call.',
        'Show me a note you wrote. Could I continue from it without calling the payer again?',
        'Tell me about a situation where you would escalate rather than proceed. What would your escalation say?',
        'Which of your commitments have you done so far, and what got in the way?'
      ]
    },

    peerCards: {
      title: 'Peer Role-Play Cards',
      intro: 'Practise in pairs. One person plays the caller and reveals details only when asked. The other plays the VA. Swap roles, then score each other with the observation checklist.',
      cards: [
        { title: 'Card 1: “My insurance changed”', role: 'Caller: Daniel Reyes, DOB 03/14/1988, booking a follow-up with Dr. Lee.',
          reveal: ['New employer plan: {payer}, member ID ADW482917305, group 77104-B', 'Started 10/01/2026; old plan ended 09/30', 'Only if asked about other coverage: your wife has a plan and you are on it', 'Only if asked: Thursday afternoons work best'] },
        { title: 'Card 2: “The rep said no cost”', role: 'Caller: Rosa Delgado, DOB 06/22/1971, MRI right knee on 11/04 at {hospital}.',
          reveal: ['You were quoted $380 and you are upset', 'A plan representative told you last week it would be “no cost”', 'Only if asked: you do not have a reference number for that call', 'You calm down if the VA explains what was used and offers to reverify'] }
      ]
    },

    nudges: {
      week1: {
        title: 'One-week check-in',
        message: 'Quick check-in on RCM - Patient Access. A portal says “Active, outpatient covered 80%.” Name two things you still need to verify. Then tell us whether you used the Question Ladder or the Control Chain this week. Reply here: {link}',
        question: 'A portal says “Active, outpatient covered 80%.” Name two things you still need to verify before treating it as verified.',
        model: 'Any two of: the exact code and place of service; provider and facility network; authorization or notification and carve-outs; individual vs family deductible remaining; limits; a reference number.'
      },
      week4: {
        title: 'Four-week check-in',
        message: 'Four weeks on from RCM - Patient Access. An authorization names Hospital A, but the appointment is at Hospital B. What is the status, and what is your next step? Then tell us one thing you have used from the course. Reply here: {link}',
        question: 'An authorization names Hospital A, but the appointment is at Hospital B. What is the clearance status, and what is your next step?',
        model: 'Not cleared. Contact the authorization owner or payer to amend or confirm the facility before the date of service, document it, and escalate if the deadline is close.'
      }
    },

    glossary: [
      ['Accumulator', 'A running total toward the deductible or out-of-pocket maximum.'],
      ['Allowed amount', 'The amount the plan uses to calculate payment and patient cost share.'],
      ['Carve-out', 'Part of a benefit managed by a different company or vendor.'],
      ['Coinsurance', 'A percentage of the allowed amount the patient may owe after the deductible.'],
      ['Coordination of benefits', 'Rules that decide which plan pays first when there is more than one.'],
      ['Copay', 'A fixed amount that may apply to a particular service.'],
      ['CPT code', 'A code describing a procedure or service.'],
      ['Date of service (DOS)', 'The date the service is provided and billed.'],
      ['Deductible remaining', 'What is left of the deductible as of the date checked.'],
      ['Eligibility', 'Whether the plan is active for a date.'],
      ['ICD-10 code', 'A code describing a diagnosis or reason for the service.'],
      ['Notification', 'Telling the payer that a service is planned or has happened.'],
      ['NPI', 'National Provider Identifier, a unique number for a provider.'],
      ['Out-of-pocket maximum', 'A yearly limit on certain cost sharing; not every charge counts.'],
      ['Place of service (POS)', 'A code for where the service happens, such as 22 for hospital outpatient.'],
      ['Predetermination', 'A pre-service review that gives information; not always an authorization.'],
      ['Prior authorization', 'Payer review and approval before a service.'],
      ['Referral', 'Direction from an authorized provider for specialty care under certain plans.']
    ]
  };
})(typeof window !== 'undefined' ? window : globalThis);
