---
name: generate-backend-tests
description: Build or extend backend tests for Node.js/TypeScript services with real runtimes, Testcontainers dependencies, optional .env.test cloud services, and integration and/or record-replay coverage. Use for integration tests, live contracts, freeze-before-refactor, VCR/golden-master, cassette record/verify, Azure Functions harnesses, replacing mock-heavy tests, or adding scenarios to an existing backend-test harness. Always use when choosing between integration and record-replay.
---

# Generate Backend Tests

Use when backend tests must protect a real boundary, local or hybrid cloud/local. Inspect first, then route to the smallest honest workflow instead of assuming one test style.

## Deliverables

Produce or update:

- one shared local/hybrid harness for the selected boundary, using reachable `.env.test` cloud services when appropriate and Testcontainers for containerized dependencies
- integration tests, record-replay tests, or both on that harness
- needed setup, fixtures, stubs, cassette helpers, and `record` / `verify` entrypoints
- a concise Markdown report for any non-trivial test, harness, topology, cassette, or scenario change
- rerun commands plus a short note on boundary, dependencies, and scenario scope

## Routing workflow

1. Inspect current tests, runner commands, startup path, runtime boundary, fixtures, live harnesses, and any backend-test report.
2. If adding to an existing harness, read `references/incremental-extension.md` first and use the report plus harness entrypoints as the re-entry surface.
3. Read `references/scenario-selection.md`. In incremental mode, use it only to find gaps against the current report; propose 2 to 4 gap-filling scenarios, not a fresh menu.
4. Propose a short scenario list from the prompt, repo evidence, and coverage gaps. Ask for path or scenarios only when the prompt/existing harness does not already decide.
5. Read shared references for the chosen work:
   - `references/shared-harness.md`
   - `references/shared-vitest-lifecycle.md` when Vitest is relevant
6. Read only the selected path references:
   - integration: `references/integration-workflow.md`
   - record-replay: `references/record-replay-workflow.md` and `references/cassette-layout.md`
7. Read optional references only on trigger:
   - `references/cloud-services-harness.md` when a `.env.test` exists at repo root, app/package dir, a parent up to root, or a user-provided path. If absent, do not mention it.
   - `references/promoting-unit-tests.md` for dense mock-heavy unit suites
   - `references/azure-harness.md` for Azure-local services/emulators or Azure Functions
   - `references/azure-functions-harness.md` for Azure Functions, after `azure-harness.md`
   - `references/azure-functions-integration.md` for Azure Functions integration
   - `references/azure-functions-record-replay.md` for Azure Functions record-replay
8. For Azure Functions, run a Dockerfile-first checkpoint before using `func start`: find checked-in Dockerfiles/compose/start scripts, reuse any credible runtime, or document the concrete blocker/user approval.
9. If a faithful strategy is credible but harder than a fake, in-memory seam, or narrow stub, ask the user before taking the fallback.
10. After implementation, read `references/final-reporting.md` and add/update the report.

## Path rules

- Prefer a short explicit scenario list over a large matrix.
- Recommend the obvious path, but let the user choose unless the prompt or existing harness already chose.
- Choose `integration` for ongoing contract coverage across runtime, adapters, persistence, or outbound boundaries.
- Choose `record-replay` to freeze observable behavior before refactors or to maintain cassette `record` / `verify` workflows.
- When using `both`, share startup/metadata and state which scenarios belong to integration, record-replay, or both.
- With reachable `.env.test` cloud services, prefer them for matching dependencies; otherwise use real local hosts, Testcontainers dependencies, or deterministic local stubs.

## Incremental mode

For additive prompts, do not rediscover the topology unless the report or harness is ambiguous.

- Read the report, scripts, harness entrypoints, and one representative suite first.
- Reuse the current boundary, path, and topology unless the prompt asks to change them or new evidence makes them dishonest.
- If no compact report exists and the harness spans multiple files or scenarios, create/update one.
- Do not relitigate stable decisions.

## Guardrails

- Keep the boundary honest and assertions observable.
- Treat Testcontainers and checked-in runtime containers as first-class topology inputs.
- Do not silently downgrade from a viable faithful path; ask and document the concrete blocker.
- Do not drift from requested/chosen scenarios: if one cannot boot honestly, mark any adjacent easier path as fallback and keep the original as a documented gap.
- For record-replay, the cassette is the durable oracle: compare normalized live layers to stored artifacts, avoid extra semantic assertions, and keep the harness source-level black-box.
- If a scenario needs durable semantic assertions, route it to `integration` or `both`.
- If record-replay cannot boot honestly, stop as blocked or ask to switch workflows.
- Add brief orientation comments only to support modules whose topology role is not obvious.

## Final response

State briefly:

- chosen path and scenarios
- files changed
- local dependencies, stubs, and shared harness structure
- trade offs between faithful and faster-but-dishonest strategies when applicable
- report path
- rerun commands
