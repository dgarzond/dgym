# Feature Implementation Plan: Bottom Questionnaire for Weekly Routine Creation

**Overall Progress:** `0%`

## TLDR

Replace the current free-form chat with a bottom questionnaire UI. Users answer guided questions (goals, experience, equipment, days per week) and the system generates a weekly routine from those structured inputs.

## Critical Decisions

- **Questionnaire replaces chat** — Primary flow is the questionnaire; chat can remain as optional fallback later if needed.
- **Bottom sheet/drawer layout** — Fixed at bottom of screen, works well on mobile and desktop.
- **Reuse existing generation pipeline** — Map questionnaire answers into a prompt and reuse `convertTextToWeeklyRoutineJSON`-style logic (or similar AI call) to produce the same `Workout[]` structure.

## Tasks

- [ ] 🟥 **Step 1: Define questionnaire schema and question flow**
  - [ ] 🟥 List all questions (goals, experience level, equipment, days/week, focus areas)
  - [ ] 🟥 Define answer types (single select, multi-select, number, text)
  - [ ] 🟥 Create TypeScript types for questionnaire state and answers

- [ ] 🟥 **Step 2: Build bottom questionnaire UI component**
  - [ ] 🟥 Create `QuestionnairePanel` component (bottom sheet / drawer)
  - [ ] 🟥 Implement step-by-step flow with next/back
  - [ ] 🟥 Ensure responsive layout for mobile and desktop

- [ ] 🟥 **Step 3: Map questionnaire answers → routine generation**
  - [ ] 🟥 Build prompt from questionnaire answers (structured text)
  - [ ] 🟥 Call AI (or reuse `convertTextToWeeklyRoutineJSON`) to generate weekly routine JSON
  - [ ] 🟥 Reuse existing `processWorkoutData` / `onWorkoutGenerated` flow

- [ ] 🟥 **Step 4: Replace chat triggers with questionnaire**
  - [ ] 🟥 Swap ChatBot for QuestionnairePanel in WeeklyPlanManager
  - [ ] 🟥 Swap in WeekManager, WeekDetail, App.tsx where ChatBot is used
  - [ ] 🟥 Wire `onWorkoutGenerated` and `onClose` props

- [ ] 🟥 **Step 5: Cleanup and mobile polish**
  - [ ] 🟥 Remove or archive ChatBot (or hide behind feature flag)
  - [ ] 🟥 Test full flow end-to-end
  - [ ] 🟥 Polish animations, accessibility, small screens
