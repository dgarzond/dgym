# Feature Implementation Plan

**Overall Progress:** `100%`

## TLDR
Persist **AI-generated routines per user** (store only the final routine event, not full chat transcripts) and track whether each routine was **imported** into the app.

## Critical Decisions
- **Storage model**: New table `generated_routines` (chosen) to record one row per AI routine generation event, plus an `imported` flag.
- **Payload**: Store minimal payload: final assistant routine text (optional) + structured routine JSON when available.

## Tasks

- [x] 🟩 **Step 1: Decide storage model for generated routines**
  - [x] 🟩 Choose new table vs extending `workouts` / `weekly_routines`
  - [x] 🟩 Define relationships for single-day vs weekly plans
  - [x] 🟩 Decide stored payload fields + size constraints

- [x] 🟩 **Step 2: Implement DB schema/migration for routine history + imported flag**
  - [x] 🟩 Add `generated_routines` table + indexes
  - [x] 🟩 Ensure one record per generation event (including weekly plans)

- [x] 🟩 **Step 3: Add backend endpoints for generated routine history**
  - [x] 🟩 POST create generated routine record
  - [x] 🟩 GET list generated routines by user
  - [x] 🟩 PATCH mark imported and/or attach structured JSON

- [x] 🟩 **Step 4: Wire frontend to persist only final routine + set imported flag**
  - [x] 🟩 Create routine record when assistant produces the routine
  - [x] 🟩 Mark record imported on “Import Workout”

- [x] 🟩 **Step 5: Clean up legacy chat persistence (localStorage/DB)**
  - [x] 🟩 Stop persisting full chat transcript by default (local + backend)

