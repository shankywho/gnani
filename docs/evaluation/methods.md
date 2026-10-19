# Evaluation Methodology

## 1. Corpus and Task Definition
The SakhiLine evaluation corpus consists of 30 hand-authored maternal health visit scenarios in mixed Hindi/English (Hinglish), authored before any audio recording was performed. The evaluation exercises the clinical extraction pipeline:
- Input: transcribed speech transcript, visit timestamp, timezone, and prior visit history.
- Expected Output: typed observations for four clinical fields:
  1. Blood Pressure (`bloodPressure`): systolic/diastolic (mmHg)
  2. Hemoglobin (`hemoglobin`): canonical decimal value (g/dL)
  3. Tetanus Toxoid Dose (`ttDose`): status and mention text
  4. Follow-up Date (`followUpDate`): status and ISO YYYY-MM-DD date

## 2. Train/Test Split & Leakage Prevention
- **Dev Split**: 20 scenarios (`SYN-DEV-01` through `SYN-DEV-20`) for pipeline tuning and prompt validation.
- **Heldout Split**: 10 scenarios (`SYN-HELDOUT-01` through `SYN-HELDOUT-10`) reserved strictly for final reporting.
- **Zero Leakage**: Scenarios are partitioned at the base scenario level before variant expansion. Automated verification in `eval/src/manifest.ts` confirms that no scenario identifier or transcript is shared between the dev and heldout splits.

## 3. Scorer Normalization & Exact Canonical Matching
Scoring is performed by `eval/src/scorer.ts`:
- **Hemoglobin**: Values are normalized to canonical decimal format (`"9"` ≡ `"9.0"`). Units must match (`g/dL`). Fuzzy numeric matching is strictly prohibited (e.g. 9.1 vs 9.0 is marked `wrong`).
- **Blood Pressure**: Integer comparison for systolic and diastolic; unit must match (`mmHg`).
- **Status Equality**: The system enforces exact status agreement. An expected `not_measured` against a predicted `not_mentioned` is classified as `wrong` (omission vs explicit negation).
- **Abstention**: If the model predicts `unknown` with an attached clarification issue where a value is expected, the case is scored as `abstained`.
- **Failures Retained in Denominator**: Schema validation failures (`schema_failed`) and provider errors (`provider_failed`) remain in all score denominators to prevent survival bias.

## 4. Transcript Noise Simulation
Transcript-level degradation is simulated deterministically via Mulberry32 PRNG (`eval/src/noise.ts`):
- `clean`: Raw unperturbed transcript.
- `noise-a`: 10% word dropout simulating mild ASR word deletion.
- `noise-b`: 25% word dropout plus 5% adjacent-digit transposition simulating severe speech recognition distortion.
Audio-level acoustic noise testing belongs to teammate Johny's speech provider layer.

## 5. Metrics & Worked Example
Per `eval/src/aggregate.ts`:
- `Accuracy = Correct / Expected`
- `Coverage = Supplied / Expected` (where `Supplied = Correct + Wrong`)
- `Wrong Rate = Wrong / Expected`
- Latency percentiles ($p_{50}$ and $p_{95}$) computed via nearest-rank method.

**Delivery Plan Worked Example:**
For 10 expected evaluations with 7 correct, 1 wrong, 1 abstained, and 1 provider failure:
- Expected: 10
- Supplied: 8 (7 correct + 1 wrong)
- Accuracy: $7 / 10 = 70\%$
- Coverage: $8 / 10 = 80\%$
- Wrong Rate: $1 / 10 = 10\%$

## 6. Critical Safety Caveat
> [!IMPORTANT]
> **Scorer Pass ≠ Product Accuracy**
> Passing benchmark evaluation on synthetic scenarios is a prerequisite for safety verification, but does NOT establish clinical diagnostic accuracy on real patient data or in field deployment. No clinical decisions, alerts, or treatments are made or implied by this evaluator.
