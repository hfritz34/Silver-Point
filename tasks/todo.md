# SilverPoint Final Version Plan

## Current Status

- [x] Pulled latest `origin/main` before the final-version planning pass.
- [x] Compared the current repo against the final project report.
- [x] Identified the current app as a functional MVP/prototype, not the full final-report architecture.
- [x] Added and pushed final-version planning docs.
- [x] Review this plan with Henry before beginning implementation changes.

## Guiding Goal

Move SilverPoint from a polished prototype toward the final report version in small, verified commits. Prioritize the code paths that make the report more truthful: persistent price observations, data quality, a better user experience, cacheable retailer lookups, and verifiable Scan-to-Save behavior.

## Phase 0: Workflow And Guardrails

- [x] Push the current completed commits to the remote before new implementation work.
- [ ] Keep `tasks/todo.md` updated as work progresses.
- [ ] Keep `tasks/lessons.md` updated after user corrections or process misses.
- [ ] Use small single-line commits grouped by purpose.
- [ ] Run verification before each commit when practical.
- [ ] Stop and re-plan if implementation uncovers a bigger architecture problem.

## Phase 1: shadcn UI Foundation

- [x] Add Tailwind, shadcn-compatible aliases, utility helpers, and base theme tokens.
- [x] Add core shadcn UI primitives first: button, input, card, badge, tabs, dialog, form, alert, separator.
- [x] Convert the app shell/navigation to shadcn components.
- [ ] Keep existing API behavior unchanged during the first UI commit.
- [ ] Verify with `npm run build` and a local browser pass.

## Phase 2: UX Revamp

- [ ] Redesign the first screen around the real search workflow, not a marketing page.
- [ ] Convert Search results to richer shadcn cards with price, savings, stock, source, freshness, and confidence.
- [ ] Convert Scan-to-Save to a clearer upload/review/success flow.
- [ ] Convert Shopping List to a route planning workspace with totals and stop grouping.
- [ ] Convert Vendor Portal into a polished data-entry flow with validation feedback.
- [ ] Verify mobile and desktop layouts for text overflow and control clarity.

## Phase 3: Durable Data Model

- [ ] First extract API contracts and service boundaries from `Program.cs` without changing behavior.
- [ ] Create backend folders for contracts, services, data, optimization, and processing as they become necessary.
- [ ] Design backend models for stores, products, price observations, scan submissions, and validation status.
- [ ] Add a repository/service layer so JSON storage can be replaced cleanly.
- [ ] Add PostgreSQL configuration path for production and a local fallback for development.
- [ ] Preserve existing endpoints while moving reads/writes behind the repository layer.
- [ ] Add tests for storage behavior and API responses.

## Phase 4: Data Quality And Scan Pipeline

- [ ] Add anomaly filtering for submitted prices using simple local statistics first.
- [ ] Add validation statuses: accepted, needs_review, rejected.
- [ ] Add a review endpoint for flagged submissions.
- [ ] Replace fake OCR extraction with an OCR abstraction.
- [ ] Add Tesseract.js or a staged OCR adapter in the least disruptive place after UI foundations settle.

## Phase 5: Retailer Cache And Search Reliability

- [ ] Add a cache abstraction around Kroger product/location calls.
- [ ] Start with in-memory TTL cache for local dev.
- [ ] Add Redis-backed implementation when the API shape is stable.
- [ ] Include cache metadata in search responses where useful.
- [ ] Add tests around fallback, cache hit, cache miss, and stale data.

## Phase 6: Route Optimizer v2

- [ ] Define an optimizer scoring model for item coverage, price, distance, and stop count.
- [ ] Support partial fulfillment weighting instead of only cheapest item grouping.
- [ ] Return confidence/fallback metadata when multi-store plans are weak.
- [ ] Add tests for overlapping inventory and single-store fallback cases.

## Phase 7: Gamification And Metrics

- [ ] Persist point events instead of keeping points only in React state.
- [ ] Add streak tracking for Scan-to-Save submissions.
- [ ] Add a lightweight leaderboard screen or tab.
- [ ] Add API metrics for data freshness and scan conversion proxies.

## Phase 8: CI And Production Readiness

- [ ] Add GitHub Actions for API tests and web build.
- [ ] Add API integration tests around search, deals, and list optimization.
- [ ] Add privacy-oriented receipt handling notes or stubs before storing real images.
- [ ] Document local setup and production environment expectations.

## First Recommended Implementation Slice

- [x] Commit 1: Add shadcn/Tailwind foundation without changing screens.
- [x] Commit 2: Convert the app shell and top navigation.
- [ ] Commit 3: Convert Search UI cards and controls.
- [ ] Commit 4: Extract backend search/list service boundaries without changing API behavior.
- [ ] Commit 5: Push the finalized first slice to remote.

## Subagent Findings Incorporated

- [x] Backend: move business logic out of `Program.cs` before PostgreSQL, Redis, OCR, or optimizer work.
- [x] Backend: preserve current API response contracts to avoid frontend drift.
- [x] Backend: fix Kroger distance and cache behavior in a later focused slice.
- [x] UI: add shadcn/Tailwind setup before screen rewrites.
- [x] UI: migrate app shell and Search first because they establish the main user path.
- [x] UI: verify with build, lint, local API proxy, and mobile/desktop layout checks.

## Review Gate

- [x] Henry has reviewed and approved the plan.
- [x] Any requested edits have been applied to this file.
- [x] Implementation starts only after this gate is checked.

## Review Results

- Planning docs pushed in commit `099d13f`.
- Henry approved implementation by asking to continue.
- shadcn/Tailwind foundation verified with `npm run build` and `npm run lint`.
- App shell shadcn conversion verified with `npm run build` and `npm run lint`.
