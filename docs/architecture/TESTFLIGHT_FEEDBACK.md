# TestFlight Feedback Backlog (from Sarah, 2026-07-01/02)

## Backend (deploy immediately, no app build needed)
- [x] Tasks merge when accounts merge — ALREADY WORKS (merge moves Task rows).
- [ ] **Stop recap creating duplicate accounts** — `get_or_create_account` used exact-name match only. Add fuzzy matching (reuse `account_fuzzy_key`) + account **aliases** ("also known as X").
- [ ] **Account aliases field** — user calls locations different things; store aliases so matching catches them.
- [ ] **Disambiguation endpoint** — given an extracted name, return candidate existing accounts so the app can ask "we heard X — did you mean [existing] or is this new?"

## Mobile — Build #17
- [ ] **Account disambiguation UI** on Review: for each extracted account, if a likely match exists, prompt "Use [existing] / Create new / Pick from list."
- [ ] **Champion button covered by keyboard** (contact edit screen) — KeyboardAvoidingView / scroll so it's reachable.
- [ ] **Live transcription should scroll** during capture (long recaps get cut off).
- [ ] **Keep screen awake during transcription** (expo-keep-awake) so sleep doesn't stop it.
- [ ] **Add photo from library**, not just take a photo — explicit "Choose from Library" vs "Take Photo" choice in photo capture.
- [ ] **Territory intelligence = chat feed** — when you press send, the typed question moves into a chat feed above; input box clears. Better/clearer send button.

## Calendar write (Build #17 + new OAuth scope) — bigger lift
- [ ] **Create calendar event from a recap** ("put this on my calendar"). Needs Google Calendar WRITE scope (currently readonly) → user must reconnect Calendar.
- [ ] **Create calendar events from a photo of a patient schedule** — OCR the schedule → parse into events → create them. Needs same write scope + parsing.

## Notes
- Calendar write requires switching scope from `calendar.readonly` to `calendar.events` and a reconnect. Flag to Sarah before building.
- Aliases + fuzzy matching is the highest-leverage fix (kills the recurring-duplicate problem at the source, in the save flow not just the email scan).
