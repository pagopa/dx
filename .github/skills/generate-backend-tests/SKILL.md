---
name: generate-backend-tests
description: Create or refactor backend test workflows for Node.js or TypeScript services using real local runtimes, Testcontainers-managed dependencies, and progressive routing into integration or record-replay coverage. Use this whenever the user asks for integration tests, live contract coverage, freeze-before-refactor workflows, VCR or golden-master tests, cassette capture or verify flows, Azure Functions local test harnesses, or wants to replace mock-heavy backend tests with real local coverage. Always use this skill when the task involves choosing between ongoing integration coverage and record-replay characterization, even if the user does not name the workflow directly.
---

# Generate Backend Tests

Use this skill when the user wants backend tests around a real local boundary. Start by inspecting the repository and routing the work into the right path instead of committing immediately to one test style.

## Outcome

Produce or update:

- a shared local harness for the selected boundary, using Testcontainers for containerized dependencies
- either integration tests, record-replay tests, or both layered on the same harness
- path-specific helpers such as shared setup files, fixture builders, stubs, cassette helpers, and `record` / `verify` entrypoints when needed
- explicit rerun commands and a short note explaining the chosen boundary, dependencies, and scenario scope

## Routing workflow

1. Inspect the codebase first: current tests, startup path, runtime boundary, fixture layout, and any existing live-test harness.
2. Read `references/scenario-selection.md`.
3. Summarize a short list of scenario classes worth testing based on the user prompt and the repository.
4. Ask the user to choose the path:
   - `integration`
   - `record-replay`
   - `both`
5. Ask the user which proposed scenarios to include.
6. Read the shared references that apply to any chosen path:
   - `references/shared-harness.md`
   - `references/shared-vitest-lifecycle.md` when Vitest is relevant
7. Read only the references for the chosen path:
   - integration: `references/integration-workflow.md`
   - record-replay: `references/record-replay-workflow.md` and `references/cassette-layout.md`
8. Read optional references only when their trigger is present:
   - `references/promoting-unit-tests.md` when the starting point is a dense mock-heavy unit suite
   - `references/azure-harness.md` when the target depends on Azure-local services or emulators
   - `references/azure-functions-harness.md` when the target is an Azure Functions app
   - `references/azure-functions-integration.md` for integration work on Azure Functions
   - `references/azure-functions-record-replay.md` for record-replay work on Azure Functions
9. After implementing the selected path, read `references/final-reporting.md` and decide whether to add or update a concise Markdown report. Default to yes when the user asked for documentation or when the resulting topology, shared harness, or scenario coverage would be hard to reconstruct from the tests alone.

## Path selection rules

- Do not assume a giant test matrix. A short explicit scenario list is better.
- If the prompt strongly points to one path, recommend it, but still let the user pick.
- If the user chooses `both`, treat the shared harness as the foundation and add cassette-specific behavior on top instead of cloning lifecycle code.
- Treat Testcontainers as the only supported orchestration path for containerized dependencies. Do not switch to shell-driven container orchestration as a normal fallback.
- Reuse an existing live-test harness before inventing another shared setup layer.

## Integration path

Choose integration when the user wants ongoing contract coverage across runtime, adapters, persistence, or outbound boundaries.

## Record-replay path

Choose record-replay when the user wants to freeze current observable behavior, create characterization or approval coverage, or add `record` / `verify` workflows that survive refactors.

## Both paths together

When the user chooses both:

- let the shared harness own Testcontainers startup, connection metadata, shared setup, and generic fixtures
- let integration own the long-lived live assertions for the selected boundary
- let record-replay own cassette layout, normalization, `record` / `verify`, and characterization-only helpers
- split suites or Vitest projects only when include patterns or lifecycle rules truly differ, and still reuse the same shared container helpers
- explain clearly which scenarios belong to integration, record-replay, or both

## Guardrails

- Keep the selected boundary honest.
- Prefer real local hosts, real dependencies, and deterministic local stubs over mocks.
- Keep assertions at observable contract level.
- Keep record-replay harnesses source-level black-box except for the minimal boot wrapper needed to start the runtime.
- Explain any fallback plainly instead of silently downgrading the workflow.

## Final response

When you finish, briefly state:

- which path the user chose
- which scenarios were covered
- which files were added or changed
- which local dependencies or stubs the harness uses
- how the shared harness is structured
- whether a report was added or updated, and where
- how to rerun the tests or workflows

## Examples

**Example 1**
Input: "I want backend tests for this Fastify service, but I'm not sure whether I need integration tests or a freeze-before-refactor workflow."
Output shape: "Inspect the repo, propose a short scenario list, ask the user to choose `integration`, `record-replay`, or `both`, then read only the relevant references before building the harness."

**Example 2**
Input: "Replace these mocked Redis and Postgres tests with live coverage, but keep one path small and honest."
Output shape: "Recommend the integration path, propose the high-value scenarios, boot Redis and Postgres through Testcontainers, and write ongoing integration coverage at the selected boundary."

**Example 3**
Input: "Freeze this Azure Function before I refactor it, and maybe keep one ongoing integration happy path too."
Output shape: "Recommend `both`, build one shared harness for the local Functions host and dependencies, then layer cassettes and `record` / `verify` on top without cloning container startup."
