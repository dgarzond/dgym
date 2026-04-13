# DGD-44 — Import workout JSON parse (tracking)

**Overall Progress:** `100%`

## TL;DR
Workout import failed when `JSON.parse` ran on AI output that was truncated (brace counting ignored strings) or contained trailing commas / markdown fences. Parsing is now string-aware, shared in `workoutImportJsonParse.ts`, with clearer import errors and Vitest coverage.

## Tasks

- [x] 🟩 **Step 1: Reproduce + capture failing payload**
  - [x] 🟩 Root cause: naive `{`/`}` counting treated characters inside JSON string values as structure → early cut / invalid JSON.
  - [x] 🟩 Secondary: trailing commas and ``` fences.

- [x] 🟩 **Step 2: Harden parsing / validation**
  - [x] 🟩 `extractFirstBalancedJsonValue` (string + escape aware).
  - [x] 🟩 `removeTrailingCommasOutsideStrings`, `stripMarkdownCodeFences`, `parseWorkoutImportJsonString`.
  - [x] 🟩 OpenAI import calls use `response_format: { type: 'json_object' }` for day + week conversion.

- [x] 🟩 **Step 3: Import UX on failure**
  - [x] 🟩 Weekly path validates `workouts`, surfaces empty/missing arrays.
  - [x] 🟩 Chat message explains failure + retry hint; `ParseWorkoutImportJsonError` used where applicable.

- [x] 🟩 **Step 4: Regression coverage**
  - [x] 🟩 `project/src/utils/workoutImportJsonParse.test.ts` (Vitest).
  - [x] 🟩 `npm run test` in `project/`.
