# 
Continuo Brand + UI Implementation Spec
For Claude Code / UI implementation sprint
Design North Star
Continuo should feel like opening a beautiful notebook that quietly remembers everything you do not want to lose. It should be calm, premium, human, and intentional. Not Salesforce. Not Epic. Not flashy AI. Not cold healthcare software.
Core brand feeling: calm competence.
Primary product metaphor: closing loops and keeping the thread.
The logo mark is not decoration. It becomes the product language for capture, understanding, loading, progress, referral completeness, and follow-through.
Locked Brand Decisions
Area
Implementation direction
Primary mark
Three signal beads progressing into an incomplete/closing circle. This is the canonical Continuo mark.
Wordmark
Use the same custom “continuo” wordmark from the primary logo everywhere. Do not substitute a serif or alternate font for wordmark-only usage.
Tagline
Current: “Connect. Capture. Complete.” Keep for now, but allow future exploration around “Never lose the thread” or “Intelligence that follows through.”
Visual tone
Warm minimalism, soft cards, editorial moments, high trust, quiet confidence.
No Mobia
Remove all Mobia references from app identity, bundle, copy, metadata, and assets.
Color System: Soften the Brand
The previous navy/blue direction is liked, but it should be softened to better match the existing app UI. Avoid saturated corporate blue. Use warm off-white surfaces and blue-charcoal/stone tones.
Area
Implementation direction
Primary ink
#2F3C4A or #384657. Warmer blue-charcoal instead of near-black navy.
Primary action blue
Muted dusty blue. Current button blue is close but should be slightly less saturated.
Surface
#FAF9F6 or #F8F7F4. Warm ivory/off-white, not pure white.
Card surface
#FFFFFF or very warm white with subtle border/shadow.
Secondary text
Warm gray/taupe, matching the current app feel.
Accent green
Muted sage for success states. Keep soft, not bright.
Warning/status
Muted gold/tan for account status dots.
Typography Rules
Area
Implementation direction
UI sans
Use Hanken Grotesk or closest installed equivalent for labels, buttons, tabs, card headings, section headings, navigation, and body text.
Editorial serif
Reserve serif type for reflective/assistant moments only, such as “Understanding…”, “Add a photo”, “Good morning.”, and empty-state guidance.
Wordmark
Use the logo’s custom “continuo” wordmark as an asset, not typed text. This applies to wordmark-only, top banner, splash screen, website header, and app icon lockups.
Section labels
Uppercase, letter-spaced, soft gray/taupe. Current style is good. Keep it.
Tone
Clear, brief, calm, and helpful. Avoid exclamation-heavy AI copy.
Logo Implementation Rules
Create canonical SVG assets: mark-only, horizontal lockup, wordmark-only, light version, dark version, one-color version.
The wordmark-only asset must use the same custom wordmark as the primary logo. Do not recreate it with a generic serif or system font.
Slightly soften logo colors to match the app palette. Use blue-charcoal/taupe and dusty blue signal beads.
Thin the ring very slightly compared with the sketch if needed. Target premium, not heavy enterprise.
Keep enough contrast for app icon and small sizes. Verify at 16 px, 24 px, 48 px, 180 px, and 1024 px.
Name the three dots internally as Signals, not dots, to connect the mark to the product philosophy.
Motion and Splash Screen
Area
Implementation direction
Launch animation
Three signals appear, move into orbit, and the ring completes. Then the Continuo wordmark fades in. Total duration around 700 ms.
Loading state
Use the same signal-ring concept for AI thinking and sync states.
Capture understanding state
The existing “Understanding…” screen is excellent. Use the signal-ring animation there rather than a generic spinner.
Motion style
Subtle fade, scale, and ease-out cubic. No bounce, neon, or flashy effects.
Haptics
Add light haptic feedback for capture start, save complete, task complete, and Face ID success.
Screen-by-Screen UI Direction
1. Sign In / Welcome
Use the softened Continuo mark and custom wordmark at the top.
Copy: “Welcome to Continuo” and “Sign in to continue.”
Include Sign in with Apple and Google. Keep buttons calm and native-feeling.
Footer links: Privacy Policy, Terms, Security.
Avoid raw errors. Use friendly reconnect/auth language.
2. Splash Screen
Warm ivory or deep softened blue-charcoal background.
Show animated signal-ring mark first, then wordmark.
Optional small tagline below: “Connect. Capture. Complete.”
Should feel quiet and premium, not like a startup loading screen.
3. Today Home
Keep existing calm layout, large greeting, and warm background.
Use small mark only as a subtle top identity element if needed. Do not overbrand.
Do not reload every time user returns. Cache dashboard and refresh only on pull-to-refresh, sync completion, local edits, app foreground timeout, or 5-10 minute interval.
Add “Last updated” in small secondary text.
Use loop/progress motif for daily completion or follow-up readiness.
4. Account Detail
Keep the soft card and document-like feel.
Referral Info should be expanded by default for sites with pathway data.
Section groups can feel like notebook chapters rather than a hard dashboard.
Use subtle status dots and soft chips, not loud badges.
Account Snapshot and Prepare for Visit buttons should use the softened button palette.
5. Capture
This is one of the strongest screens. Preserve the editorial “Add a photo” and “Understanding…” feel.
Use signal-ring animation for recording, uploading, and understanding states.
Bottom mode buttons should remain circular and soft. Selected state should be clear but not saturated.
Add PHI guidance subtly in capture placeholder/footer: “Avoid patient-identifying details unless approved for your organization.”
6. Review / Extraction Approval
Keep the card stack style for People, Tasks, Activities, Notes.
Use soft dividers and rounded cards.
Add visible PHI warning if extraction flags patient-identifiable content.
Use “Save” and “Save for Later” button hierarchy consistent with brand tokens.
7. Meeting Prep / Before You Go
Replace raw API errors with friendly states, especially for calendar/Gmail not connected.
Use language like “Google Calendar is not connected” and “Connect Calendar.”
Briefs should sound calm and organized: “I noticed three follow-ups from yesterday.”
8. Referral Guide
Use referral pathways as strategic knowledge, not just task text.
Completeness badge should consider all pathway fields: address, phone, fax, referral instructions, referral contact, referral email, scheduling owner, preferred method, insurance/reimbursement notes.
Use the loop/progress motif to show pathway completeness.
9. Settings / Security & Privacy
Settings should feel trustworthy and clear.
Add Security & Privacy page: connected integrations, disconnect, biometric toggle, MFA toggle, export data, delete account, privacy policy, terms.
Use calm warning language for PHI readiness and not-yet-enabled features.
10. Empty States
Empty states should be warm and useful, not generic.
Example: “No referral pathway yet. Add the details once and Continuo will keep them ready.”
Example: “You’re all caught up. Take a moment to review your top accounts or capture notes from your last visit.”
Iconography
Use one icon system only. Prefer SF Symbols on iOS or Phosphor-style outlines if cross-platform consistency is needed.
Rounded corners, thin stroke, human scale.
No mixed icon families.
Primary icons: Accounts, Contacts, Signals, Tasks, Calendar, Notes, Meetings, Insights, Capture, Search, Settings.
Components and Tokens
Area
Implementation direction
Buttons
Primary, secondary, tertiary. Primary uses muted blue. Secondary uses white/ivory with border. Tertiary is text-only.
Cards
Warm white, large radius, subtle shadow, subtle border. Existing card style is good.
Chips
Soft fills, muted text, rounded pill shape.
Status dots
Muted semantic colors. Avoid loud red/green unless critical.
Dividers
Warm light gray, low contrast.
Inputs
Soft background, rounded, minimal border, calm focus state.
Progress
Use signal-ring or thin muted progress bar. Avoid heavy charts.
Copy and AI Voice
Continuo should sound calm, helpful, clinical, organized, and confident.
Avoid: “AI is thinking!”, “Oops!”, “Something went wrong!”, raw API messages, and verbose explanations.
Prefer: “Understanding…”, “Organizing what you shared.”, “Calendar is not connected.”, “I found two follow-ups from yesterday.”
The AI should feel like a quiet assistant, not a chatbot personality.
Implementation Checklist for Claude Code
Create /brand folder with SVG, PNG, app icon, splash, colors, typography, and README.
Replace current app icon assets with softened Continuo signal-ring mark.
Replace typed wordmark usage with exported custom wordmark asset.
Update design tokens and remove hardcoded colors where feasible.
Apply softened primary button and card styles across screens.
Add launch/splash animation using signal-ring metaphor.
Replace generic spinners with branded signal-ring loading state.
Keep serif typography only for editorial/assistant moments.
Add friendly auth/integration error states.
Implement Today caching and pull-to-refresh behavior.
Expand Referral Info by default and fix Referral Guide completeness logic.
Add PHI guidance to Capture and PHI warning to Review.
Add Security & Privacy settings page.
QA all screens on iPhone, especially Dynamic Island spacing and bottom safe area.
Do Not Do
Do not redesign the app from scratch.
Do not make the product look like a generic AI startup.
Do not use neon gradients, sparkles, robots, hexagons, or overly corporate SaaS visuals.
Do not substitute another font for the Continuo wordmark.
Do not make buttons or blues more saturated than the current app.
Do not add Mobia references anywhere.
Success Criteria
The app should feel like the same product, just more intentional and branded.
The logo should feel native to the current UI, not pasted on top.
The signal-ring metaphor should appear in launch, loading, capture, and progress states.
A new user should understand in the first minute: Continuo helps me capture what matters, remember relationships, and close loops.
