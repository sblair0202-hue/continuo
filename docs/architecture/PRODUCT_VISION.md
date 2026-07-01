# Continuo — Product Vision

## Mission

Continuo is the intelligent field operating system for Therapy Development Specialists. It replaces scattered notes, manual CRM entry, and context-switching with a single voice-first assistant that captures what happened, prepares you for what's next, and keeps you organized across every account, therapist, patient, and partner in your territory.

Continuo is not a generic sales tool. It is purpose-built for the Vivistim TDS role at Mobia Medical — therapist enablement, patient journey coordination, provider development, and territory execution.

---

## The Role Continuo Is Built For

**User:** Therapy Development Specialist (TDS)
**Company:** Mobia Medical
**Program:** Vivistim Paired VNS Therapy

The TDS works across a complex web of relationships:
- **Therapists and clinics** — training, adoption, program development
- **Surgeons** — implant coordination, patient selection
- **Territory Managers (TM)** — alignment, handoffs, account strategy
- **Care Navigators (CN)** — patient journey, therapy initiation, follow-up
- **Patients and caregivers** — expectation setting, coordination, support

The job is not filing contacts. It is enabling therapy, developing programs, coordinating patients, and keeping every stakeholder moving forward.

---

## Product Principles

### 0. Continuo complements Salesforce. It does not replace it.
Continuo is the intelligent field companion. Salesforce is the corporate system of record. Continuo helps the TDS capture, organize, and prepare — then feeds Salesforce, not the other way around.

### 1. Tap the Orb.
If something happened, tap the Orb. Never ask the user where information belongs before capturing it.

### 2. Capture first. Organize later.
The user tells Continuo what happened. Continuo determines: Accounts, Contacts, Activities, Tasks, Milestones, Follow-ups, Opportunities, Relationships.

### 3. AI suggests. Humans approve.
AI organizes. The user reviews. Nothing important is committed without approval.

### 4. Never lose a thought.
If the network fails, if AI fails, if the app crashes — the capture is still preserved.

### 5. Conversations over forms.
Every workflow should feel like talking to an intelligent assistant. The user should never feel like they are filling out CRM fields.

### 6. Context is everything.
Continuo should quietly understand context from: Calendar, Gmail, current account, current contact, previous visits, location (when appropriate), past conversations. The user should not repeat information Continuo already knows.

### 7. One source of truth.
Information should exist once. Accounts, contacts, tasks, and activities should never be duplicated.

### 8. Calm software.
Continuo should reduce cognitive load. Avoid clutter. Avoid unnecessary notifications. Surface only what is helpful right now.

### 9. Review before Save.
Review is the user's moment of control. Everything can be edited. Everything can be approved. Everything can be saved for later.

### 10. Everything begins with the Orb.
The Orb is not just a button. The Orb is the primary way users interact with Continuo's intelligence.

### 11. Time belongs with people, not software.
Every minute Continuo saves on note-taking, organizing follow-ups, or preparing Salesforce updates is a minute the user can spend with therapists, physicians, and patients.

---

## High-Priority Workflows

These are the field workflows Continuo must support — in order of priority:

### 1. Daily Field Planning
Visit sequencing, drive-time-aware schedules, departure timing, packing lists, supply reminders, and pre-departure checklists. "Plan my field day" should produce a ready-to-execute schedule with context on each stop.

### 2. Therapist Training Prep
Vivistim Therapy principles, Fugl-Meyer Assessment (FMA), UE-DX, SAPS usage, motor learning, high-repetition practice, and VNS pairing. Prep should be grounded in approved materials, not invented.

### 3. Meeting and Visit Prep
For therapists, clinics, surgeons, Territory Managers, and Care Navigators. Surface: last visit, open tasks, recent emails, account context, stakeholder profile, suggested talking points.

### 4. Patient Journey Coordination
Therapy initiation, expectation setting, handoffs between TM/CN/therapist, follow-up planning, post-implant therapy support.

### 5. Program Development
For clinics and rehab centers adopting Paired VNS Therapy. Track program status, adoption milestones, training progress, and site readiness.

### 6. Recaps, Follow-ups, and Action Plans
After calls, trainings, meetings, and field visits: source-backed recaps, follow-up email drafts, action plans, internal handoff notes. The user captures what happened and gets a draft they can send immediately.

### 7. Internal Navigation
Find approved materials, prior notes, the right internal partners. Continuo should know where things are so the TDS doesn't have to hunt.

---

## Key Terms

| Term | Definition |
|------|-----------|
| TDS | Therapy Development Specialist — the primary Continuo user |
| TM | Territory Manager |
| CN | Care Navigator |
| FMA | Fugl-Meyer Assessment |
| UE-DX | Upper Extremity Diagnostic Evaluation |
| SAPS | Device/process used during Vivistim therapy sessions |
| Paired VNS Therapy | Therapy model used in the Vivistim program |

---

## Connected Data Sources

| Source | Role in Continuo |
|--------|-----------------|
| Gmail | Outreach history, follow-up context, stakeholder communication, draft emails |
| Google Calendar | Meeting timing, attendees, daily planning, prep briefs |
| Notion | Notes, training materials, plans, internal docs |
| Web (future) | Public research on companies, providers, competitors, market context |

Fallback: if a system is unavailable, use pasted notes, uploaded files, transcripts, exports, or public evidence.

---

## AI Behavior Rules

- Start with the user's actual field goal.
- Be concise, practical, and organized.
- Lead with the recommended next move.
- Use checklists, tables, short sections, and bullets when useful.
- Separate verified facts from assumptions.
- Do not invent contacts, facts, commitments, internal decisions, clinical claims, metrics, or tool results.
- Do not present assumptions as verified truth.
- Flag missing evidence, stale context, or weak support before making confident claims.
- For clinical or therapy guidance, stay aligned to approved Vivistim materials and avoid overstating outcomes.
- Ask only for missing details that materially change the answer.
- If data is incomplete, make the best supported draft and clearly label assumptions or open questions.

---

## Example Outputs

- "Plan my field day"
- "Prep me for tomorrow's therapist training"
- "Draft a follow-up after this clinic visit"
- "Summarize this call and create next steps"
- "Build a visit checklist"
- "Help coordinate this patient's therapy initiation"
- "Find approved materials for UE-DX training"
- "Create a therapist-facing one-pager"
- "Prep me for a meeting with a surgeon and clinic lead"

---

## Daily Workflow (Current — Build 13)

**Morning:** Open Continuo → Today screen shows focus statement, calendar, tasks, notes needing attention.

**In the field:** Tap the Orb → speak or type a recap → AI extracts accounts, people, tasks, activities, opportunities → Review screen → Save.

**Between visits:** Check account detail → visit brief → prep for next stop.

**End of day:** Review queue → approve or edit AI extractions → tasks synced.

---

## Validated Pain Points

From field use (Katie Riccio, Erin Johnson):
- "I forget what I promised between visits."
- "I have to dig through texts and emails to prep for a call."
- "CRM entry takes time I don't have."
- "I don't have a good way to track where each therapist is in their training."
- "Patient handoffs fall through the cracks when I'm not in the loop."

---

## North Star Filter

Before building any feature, ask: **Does this give time back to the TDS to spend with therapists, patients, and partners — or does it add one more thing to manage?**

If it adds management overhead without a proportional reduction in mental load, don't build it.
