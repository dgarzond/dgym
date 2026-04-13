# Migration Plan: Replit → Google Cloud

**Overall Progress:** `0%`

## TLDR

Migrate DGym from Replit to Google Cloud Platform. Provision Cloud SQL, Secret Manager, deploy backend and frontend to Cloud Run, remove Replit-specific code, and set up CI/CD.

## Critical Decisions

- **Cloud Run** — Use Cloud Run for both backend (Node/Express) and frontend (static served by Cloud Run or nginx) — simpler than split App Engine + Storage.
- **Cloud SQL** — Migrate PostgreSQL to Cloud SQL; use same schema, migrate data via pg_dump/pg_restore.
- **Secrets** — Use GCP Secret Manager; server reads via env (Secret Manager → Cloud Run env) or runtime fetch.

## Tasks

- [ ] 🟥 **Step 1: GCP infrastructure and database migration**
  - [ ] 🟥 Create GCP project (or use existing)
  - [ ] 🟥 Provision Cloud SQL (PostgreSQL)
  - [ ] 🟥 Export DB from Replit (pg_dump), import to Cloud SQL

- [ ] 🟥 **Step 2: Secrets migration**
  - [ ] 🟥 Create secrets in Secret Manager (DATABASE_URL, API keys, etc.)
  - [ ] 🟥 Document required env vars for Cloud Run

- [ ] 🟥 **Step 3: Backend deployment**
  - [ ] 🟥 Add Dockerfile for Node server (or use Cloud Run buildpack)
  - [ ] 🟥 Deploy to Cloud Run; wire DATABASE_URL and secrets

- [ ] 🟥 **Step 4: Frontend deployment**
  - [ ] 🟥 Build frontend with VITE_API_URL for Cloud Run backend
  - [ ] 🟥 Deploy to Cloud Run (static) or serve from backend

- [ ] 🟥 **Step 5: Remove Replit-specific code**
  - [ ] 🟥 Remove hostname checks in api.ts (use VITE_API_URL)
  - [ ] 🟥 Remove Replit allowedHosts in vite.config.ts
  - [ ] 🟥 Update setup-api-key.ts; archive or replace README_REPLIT

- [ ] 🟥 **Step 6: CI/CD and DNS**
  - [ ] 🟥 Set up Cloud Build for deploy on push
  - [ ] 🟥 Point domain to Cloud Run URL
