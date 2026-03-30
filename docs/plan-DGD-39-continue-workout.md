# Feature Implementation Plan — DGD-39

**Overall Progress:** `100%` 🟩 (4/4 steps done)

*Tracking:* 🟩 = done · 🟨 = in progress · 🟥 = blocked — last verified implementation **2026-03-30**.

## TLDR

Add a **fixed bottom “Continue workout”** control when a session is in progress so reopening the app returns the user to the **same workout and exercise step**, backed by a **session snapshot** in `localStorage` and aligned with the existing **24h** timer rule.

## Critical Decisions

- **Snapshot in localStorage** — Same persistence model as `gymTracker_*`; no backend change unless you scope it later.
- **View enum** — `detail` vs `exercise` drives which screen to open from the CTA.
- **TTL** — Reuse / mirror App.tsx’s ~24h sanity check so stale sessions don’t resurrect bad state.

## Tasks

- [x] 🟩 **Step 1: Persist in-progress session snapshot** → [DGD-40](https://linear.app/dgdspace/issue/DGD-40)
  - [x] 🟩 Schema: workoutId, exerciseId, view (`detail` | `exercise`), lastUpdated (`project/src/utils/workoutSessionStorage.ts`)
  - [x] 🟩 Write on active session when view is `workoutDetail` or `exercise` (`App.tsx` effect)
  - [x] 🟩 Expire / ignore snapshot past ~24h; clear stale on mount; clear if workout deleted

- [x] 🟩 **Step 2: Fixed bottom Continue workout CTA** → [DGD-41](https://linear.app/dgdspace/issue/DGD-41)
  - [x] 🟩 Show bar when workout active + valid session + workout exists (`App.tsx` workout list)
  - [x] 🟩 Safe area padding, high z-index, full-width primary button
  - [x] 🟩 Click → `handleContinueWorkoutFromList`

- [x] 🟩 **Step 3: Resume navigation from CTA** → [DGD-42](https://linear.app/dgdspace/issue/DGD-42)
  - [x] 🟩 Load workout, merge exercise progress from LS; open `workoutDetail` or `exercise` per session
  - [x] 🟩 `handlePrimaryRoutineAction` on Workout detail: resume same routine without wiping LS / timer

- [x] 🟩 **Step 4: ExerciseScreen resume + clear lifecycle** → [DGD-43](https://linear.app/dgdspace/issue/DGD-43)
  - [x] 🟩 Hydrate sets, rest, work timers from `gymTracker_exercise_*` after app restart
  - [x] 🟩 Session cleared on timer reset / end workout (existing flows); exercise keys cleared on complete / new start

## Linear

- **Parent:** [DGD-39](https://linear.app/dgdspace/issue/DGD-39/continue-workout-bottom-cta-to-resume-after-app-closes)
- **Sub-issues:** DGD-40, DGD-41, DGD-42, DGD-43

## Files touched

- `project/src/utils/workoutSessionStorage.ts` (new)
- `project/src/App.tsx`
- `project/src/components/ExerciseScreen.tsx`
