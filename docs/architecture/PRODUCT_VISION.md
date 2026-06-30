# Continuo — Product Vision

## Mission

Continuo is not a CRM.

Continuo is the intelligent operating system for Therapy Development Specialists and field clinical teams.

Its purpose is to eliminate administrative friction and cognitive load by connecting every tool the user already works in.

---

## Product Principles

### 1. Never Make the User Remember

If Continuo can remember it, the user shouldn't have to.

Examples:
- Follow-ups
- Referrals
- Patient names
- Meeting promises
- Lunch attendees
- CEUs
- Documents promised

Memory belongs to the software.

### 2. Capture Once

Every piece of information should be entered one time.

Example — user dictates:

> Todd mentioned two possible Vivistim patients.

Continuo automatically:
- Creates patient opportunities
- Links to Todd
- Links to North Central
- Creates follow-up
- Logs meeting note
- Updates account timeline

### 3. AI Observes Before Asking

Instead of asking: "Did anyone mention a patient today?"

Continuo should already know. It has access to:
- Gmail
- Calendar
- Notes
- Voice dictation
- Account history
- Tasks
- (Eventually) SMS

It should say:

> During today's meeting with Todd you discussed two possible Vivistim candidates. I don't see a follow-up email yet. Would you like me to draft one?

---

## Daily Workflow

### Morning Brief

Prepare the day automatically. Show:
- Weather
- Travel and drive times
- Calendar
- Patient confirmations
- Follow-ups
- Inbox priorities

### Live Visit Mode

When arriving at an account, automatically surface:
- Recent emails
- Last visit summary
- Contacts
- Referrals
- Open tasks
- Promised documents
- Meeting objectives

### End-of-Day Review

This is one of Continuo's signature features.

**Example:**

```
Today
✓ 3 accounts visited
✓ 2 contacts added
✓ 4 possible patients discussed

Pending
📧 2 follow-up emails
📱 1 unanswered text
📅 Tomorrow's first patient has not confirmed
🚗 Tomorrow's drive: 3 hr 48 min

Suggested Actions
• Draft follow-up emails
• Send confirmation texts
• Create patient opportunities
• Review tomorrow

Estimated time: Under 2 minutes
```

---

## Validated User Pain Points

### Katie Riccio

Problems:
- Documentation takes too long
- Uses Google Calendar as her operational system
- Information spread across Gmail, Salesforce, Calendar, texts
- Creates personal task lists because Salesforce tasks are inefficient
- Frequently forgets follow-ups
- Logistics become difficult as territory grows

Continuo responses:
- AI documentation
- Unified timeline
- Automatic task creation
- AI follow-up detection
- Intelligent routing
- Daily preparation

### Erin Johnson

Problem: Driving multiple hours before knowing whether a patient will actually show.

Continuo response — automatic confirmation workflow:

> Hi John! Looking forward to seeing you tomorrow at 10:00. Reply YES to confirm.

If no response: notify the TDS before they drive.

---

## 8x8 Integration (Future Sprint)

Investigate integrating directly with 8x8's SMS APIs rather than replacing the user's texting workflow.

Potential capabilities:
- Send SMS
- Receive replies
- Delivery receipts
- Scheduled messages
- Automatic logging
- Patient confirmations
- Reminder workflows

Goal: The TDS never has to open 8x8 unless absolutely necessary. Continuo becomes the operational dashboard while still using the organization's approved communication platform.

Research questions:
- Available APIs
- Authentication model
- Rate limits
- Cost
- Multi-user architecture
- HIPAA/security considerations
- Webhooks for inbound messages

---

## North Star

> Does this reduce the amount the user has to think about?

If the answer is no, it's probably not a Continuo feature.
If the answer is yes, it belongs in the product.
