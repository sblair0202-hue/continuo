# 8x8 Integration — Research & Prep

Status: **RESEARCH / not yet built.** Deliberately deferred until the HIPAA question below is answered. Do NOT build until BAA/PHI is resolved.

---

## Why 8x8, and what it would do

8x8 is the phone/SMS platform the rep uses. The value for Continuo:
- **Capture texts as field intelligence** — inbound/outbound SMS with therapists, coordinators, schedulers become part of the account timeline (like Gmail already is).
- **Log calls** — call events (who, when, duration) attach to the account.
- **Draft + send follow-up texts** — extend the AI follow-up assistant beyond email to SMS.

This maps directly to roadmap Priority 2 (integrations that feel connected) and Priority 3 (AI follow-up assistant → "Draft LinkedIn/text message").

---

## The gating question: PHI + HIPAA (resolve BEFORE any build)

**This is the reason 8x8 is deferred.** Texts with patients/caregivers may contain PHI. Continuo's security principle requires HIPAA-readiness.

- 8x8 **does not publish** HIPAA/BAA terms openly (confirmed — not in public docs). We must ask 8x8 directly:
  - Does 8x8 offer a **Business Associate Agreement (BAA)** for the SMS/Messaging API?
  - Which product tier is required for a BAA?
- If **no BAA** → we must NOT ingest patient SMS. Options: restrict to provider/staff SMS only, or drop patient-facing SMS entirely.
- Even with a BAA, Continuo would then be handling PHI → triggers real HIPAA obligations (encryption at rest, audit logging, access controls, breach process). Bigger lift than any integration so far.

**Recommendation:** Treat 8x8 as provider/staff communication only for v1 (no patient PHI), OR wait until Continuo has a formal HIPAA posture. Decide before writing code.

---

## Technical facts (verified July 2026)

- **SMS API:** send + receive SMS. Auth = **API key bearer token**. Sign up at 8x8 Connect to get the key.
- **Inbound SMS:** delivered to your virtual number → **webhook callback** to a Continuo endpoint. Needs a public HTTPS endpoint (Railway already provides one).
- **Delivery status:** real-time delivery callbacks per message.
- **Bulk:** up to 10,000 messages per request (not needed for us).
- **Messaging API:** separate product for WhatsApp/other channels (out of scope for v1).
- **Docs:** developer.8x8.com/connect (SMS API reference).

## Sketch (if/when built)
- `backend/app/services/messaging/` provider abstraction (`send_sms`, webhook handler → normalize to a `Message`/`Signal`/`Activity`).
- New endpoint `POST /8x8/inbound` for the delivery/inbound webhook (verify signature).
- Store 8x8 credentials as env vars (like Notion), not per-user, for single-user v1.
- Reuse the email → account/contact matching pipeline (`find_matching_account`, people extraction) so texts file under accounts the same way emails do.

## Open decisions (need Sarah)
1. **BAA:** Does the 8x8 account (likely Mobia's) support a HIPAA BAA for SMS? Who owns that relationship?
2. **Scope:** patient SMS (PHI — high bar) vs. provider/staff SMS only (lower risk) for v1?
3. **Account ownership:** whose 8x8 number/API key — Sarah's, or Mobia's corporate account?
4. **Direction:** read-only (ingest texts as intelligence) first, or also send follow-up texts?

## Recommendation
Build **Salesforce Phase B (read-only) first** — lower risk, clear value, no PHI question. Keep 8x8 in research until the BAA answer is in hand. Ingesting patient text messages is the single highest-compliance-risk feature on the roadmap.
