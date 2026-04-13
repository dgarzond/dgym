# Feature Implementation Plan: Routine Feedback and Evolving User Preferences

**Overall Progress:** `0%`

## TLDR

Let users see feedback on their routines (completion, performance, suggestions) and on themselves (progress, streaks, insights). Support preference changes over time with backend storage.

## Critical Decisions

- **Backend-first for preferences** — Store preferences in DB so they persist and can evolve; replace or sync with localStorage.
- **Extend existing statistics API** — Add routine-level feedback and user insights (streaks) to the stats response or a new endpoint.
- **Reuse WeeklyPlanManager** — Integrate feedback into the existing stats panel and workout views.

## Tasks

- [ ] 🟥 **Step 1: Backend — User preferences storage**
  - [ ] 🟥 Add `user_preferences` table (goals, equipment, schedule, etc.)
  - [ ] 🟥 API: GET/PUT `/api/users/:userId/preferences`
  - [ ] 🟥 Migration for new table

- [ ] 🟥 **Step 2: Backend — Extend statistics for feedback and insights**
  - [ ] 🟥 Add routine-level feedback (completion per routine, suggestions)
  - [ ] 🟥 Add user insights (streaks, progress over time)
  - [ ] 🟥 Extend or add endpoint for feedback data

- [ ] 🟥 **Step 3: Frontend — Routine feedback display**
  - [ ] 🟥 Show routine-level feedback in workout cards or plan view
  - [ ] 🟥 Display completion, performance, suggestions per routine

- [ ] 🟥 **Step 4: Frontend — User insights display**
  - [ ] 🟥 Show streaks, progress, insights in WeeklyPlanManager stats area
  - [ ] 🟥 Wire to extended statistics API

- [ ] 🟥 **Step 5: Frontend — Preferences management UI**
  - [ ] 🟥 UI to view and update preferences (goals, equipment, schedule)
  - [ ] 🟥 Sync with backend; replace or integrate localStorage
