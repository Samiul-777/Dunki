# Dunki — Frontend

Migrant Worker Recruitment & Contract Verification System.
Built with **React 18 + Vite + Tailwind CSS + React Router**.

## What's included

- **Auth pages:** `/login`, `/register` (role selection: Worker / Agency / Family Nominee)
- **Core pages (stub data, no API yet):**
  - `/dashboard` — Worker Dashboard: journey progress strip, document checklist, cost ledger, notifications
  - `/jobs` — Verified Job Search: filterable listing cards with a verified/unverified badge
- Shared components: `Sidebar`, `JourneyStrip` (signature "passport stamp" progress trail), `StatusBadge`
- Design tokens (colors, type scale) in `tailwind.config.js` — navy/paper/stamp-gold palette evoking an official travel document, `Fraunces` for display type, `Inter` + `Noto Sans Bengali` for body copy (Bangla-ready), `IBM Plex Mono` for tracking codes.

## Run it locally

```bash
npm install
npm run dev
```

Then open the printed local URL (default `http://localhost:5173`). It starts at `/login`; submitting either auth form (no validation yet) routes you to `/dashboard`.

## Push to your GitHub repository

This project wasn't pushed for you — do this from your own machine so the commit is under your GitHub account:

```bash
cd dunki-frontend
git init
git add .
git commit -m "Frontend scaffold: auth pages + dashboard + job search (stub data)"
git branch -M main
git remote add origin https://github.com/<your-org>/<your-repo>.git
git push -u origin main
```

## Next: GitHub issues, labels, milestone

Your team lead should create these in the repo (**Issues → New issue**, **Issues → Labels**, **Issues → Milestones**). Suggested breakdown below — the assignment said to name the milestone something specific but it didn't come through in the pasted instructions, so confirm that name with your instructor before creating it.

**Labels:** `frontend`, `backend` (as required — feel free to add `design`, `auth`, `docs` if useful)

**Milestone:** _confirm exact name from your instructor_ (e.g. "Sprint 1 — Foundation & Auth")

| # | Issue | Label | Suggested owner |
|---|-------|-------|------------------|
| 1 | Set up Vite + React + Tailwind project skeleton | frontend | Frontend Dev 1 |
| 2 | Build Login page UI | frontend | Frontend Dev 1 |
| 3 | Build Registration page UI with role selection | frontend | Frontend Dev 1 |
| 4 | Build Worker Dashboard (journey strip, documents, ledger, notifications) | frontend | Frontend Dev 2 |
| 5 | Build Verified Job Search page with filters | frontend | Frontend Dev 2 |
| 6 | Set up React Router navigation across pages | frontend | Frontend Dev 1 |
| 7 | Responsive / accessibility QA pass (mobile, contrast, focus states) | frontend | Frontend Dev 2 |
| 8 | Set up Laravel project skeleton (MVC structure) | backend | Backend Dev 1 |
| 9 | Design & migrate database schema (users, agencies, jobs, applications, contracts, payments, documents) | backend | Backend Dev 1 |
| 10 | Build authentication & role-based access control | backend | Backend Dev 2 |
| 11 | Build job circular CRUD + verification workflow | backend | Backend Dev 2 |
| 12 | Build job application module | backend | Backend Dev 1 |
| 13 | Build contract module with version history | backend | Backend Dev 2 |
| 14 | Build recruitment cost ledger / payment tracking API | backend | Backend Dev 1 |
| 15 | Build document upload & checklist API | backend | Backend Dev 2 |
| 16 | Build complaint submission & escalation API | backend | Backend Dev 1 |
| 17 | Build notification system | backend | Backend Dev 2 |

Adjust owners to your actual team roster.

## Flow diagram

See `dunki-flow-diagram.mermaid` (in the same deliverable set) for the full page/feature flow across all five roles: Worker, Agency, Family Nominee, Verification Officer, Admin.
