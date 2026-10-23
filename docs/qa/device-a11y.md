# Device and accessibility checks

Owner: Johny. Status as of 2026-10-24. Each row says how it was checked. "Pending" means not checked, not "assumed fine".

## Automated (runs in CI: `npm run test:e2e`)

| Check | Result | How |
|---|---|---|
| axe WCAG 2 A/AA, serious + critical | Pass | `tests/e2e/a11y.spec.ts` on sign-in, evaluation, roster, history, visit draft, review queue |
| Keyboard-only sign-in and beneficiary choice | Pass | same spec (Tab/Enter only) |
| Scrollable table reachable by keyboard | Fixed + pass | axe `scrollable-region-focusable` failed first; region is now focusable and labelled |
| Recorder → WAV → server validation → proposal | Pass | `worker.spec.ts`, Chrome fake microphone, mock speech |
| Full correction loop | Pass | `correction.spec.ts` |
| Secrets/server config absent from bundle and git | Pass | `npm run check:secrets` |

## Manual, observed

| Check | Result | Where |
|---|---|---|
| 375 px phone width (roster, visit) | Pass after fixing roster wrap | In-app browser mobile emulation |
| Microphone blocked message | Pass | In-app browser (mic blocked) |
| Status shown in words, not colour only | Pass by design review | All screens |
| Main controls ≥ 44 px | Pass by CSS (48 px min-height, 168 px record button) | styles.css |

## Pending (needs a person or a device)

| Check | Why it matters |
|---|---|
| Real Android Chrome: record with a real voice, 16 kHz WAV upload | Fake devices don't prove the real mic path |
| Screen reader (TalkBack/VoiceOver) through a full visit | Live-region announcements, labels |
| 200% zoom and large system font | Layout reflow |
| Firefox recording | `AudioContext({ sampleRate: 16000 })` may be rejected; Chrome is the target |
| Outdoor glare contrast | Field use |
| Fluent Hindi/Hinglish reviewer for copy and spoken numbers | Language accuracy |
