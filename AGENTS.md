⚠️ Mandatory: AI agents must read this file before writing or modifying any code.

# AGENTS.md

This file complements the workspace-level Ansiversa-workspace/AGENTS.md (source of truth). Read workspace first.

MANDATORY: After completing each task, update this repo’s AGENTS.md Task Log (newest-first) before marking the task done.

## Scope
- Mini-app repository for 'research-assistant' within Ansiversa.
- Follow the parent-app contract from workspace AGENTS; do not invent architecture.

## Phase Status
- Freeze phase active: no new features unless explicitly approved.
- Allowed: verification, bug fixes, cleanup, behavior locking, and documentation/process hardening.

## Architecture & Workflow Reminders
- Prefer consistency over speed; match existing naming, spacing, and patterns.
- Keep Astro/Alpine patterns aligned with ecosystem standards (one global store pattern per app, actions via astro:actions, SSR-first behavior).
- Do not refactor or change established patterns without explicit approval.
- If unclear, stop and ask Karthikeyan/Astra before proceeding.

## Where To Look First
- Start with src/, src/actions/, src/stores/, and local docs/ if present.
- Review this repo's existing AGENTS.md Task Log history before making changes.

## Task Log (Recent)
- 2026-03-25 research-assistant V1 structured workspace implementation refresh: replaced the single-topic local-draft experience with Astro DB-backed research projects + notes (active/archive lifecycle, per-project note CRUD, topic grouping, important toggles, project-level search/filter), added ownership-enforced server actions for project/note operations, updated dashboard summary metrics (projects/notes/important + most recent project), and validated with npm run typecheck + npm run build.
- 2026-03-23 research-assistant V1 freeze approved: V1 implementation is complete, browser-style verification passed, `/app` public access is confirmed, local draft retention is confirmed, section-toggle visibility bug fix `e913d4b` is verified clean, and the repo is approved and frozen after final validation.
- 2026-03-23 research-assistant V1 section toggle fix: replaced optional preview section `x-show` blocks with conditional rendering so References / Sources and Conclusions sections now hide and show correctly without leaving layout gaps; revalidated with npm run typecheck and npm run build; browser-style recheck confirmed working toggles, clean copy output, local draft retention intact, reset confirmation intact, and no mobile overflow regression.
- 2026-03-23 research-assistant V1 implementation started: built a public `/app` research workspace with Alpine-managed draft state, local browser draft persistence, structured section editors for topic, key questions, notes, references, and conclusions, optional section toggles for references and conclusions, live research summary preview, copy-ready output, reset confirmation, and refined landing CTA/pathing; validated with npm install, npm run typecheck, npm run build.
- 2026-03-23 Seeded from latest app-starter V2 baseline: synced shared starter structure (APP_META, public /, protected /app, middleware/auth/session/dev files, layouts, docs, and integration checklist), aligned `@ansiversa/components` to `^0.0.169`, replaced the legacy landing with a premium category-aligned coming-soon homepage, and validated with npm install, npm run typecheck, npm run build.
- Keep newest first; include date and short summary.
- 2026-02-09 Added repo-level AGENTS.md enforcement contract (workspace reference + mandatory task-log update rule).
- 2026-02-09 Initialized repo AGENTS baseline for single-repo Codex/AI safety.
