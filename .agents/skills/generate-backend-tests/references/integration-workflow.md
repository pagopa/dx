# Integration workflow

Read after the user chooses `integration`.

## Goal and output

Add/refactor integration tests that exercise an honest local contract and keep mocks out of the critical path.

Produce:

- focused suite at the chosen runtime boundary or honest multi-layer slice
- shared setup, fixtures, local helpers, and deterministic outbound HTTP stubs when needed
- explicit rerun commands such as `test:integration` or repo equivalent

## Workflow

1. Start from the boundary chosen via `shared-harness.md`.
2. Mine nearby unit tests, fixtures, payloads, or examples for high-value scenarios; do not port one-for-one.
3. Boot only the needed local topology.
4. Keep expensive dependencies alive once per suite when runner/repo conventions support it.
5. Drive the real boundary and assert observable contract plus side effects.
6. Keep slow topology opt-in.
7. Explain any narrower slice when not using the full runtime.

## Boundary guidance

Prefer full local runtime for routes, middleware, auth, serialization, status/headers, Functions triggers/bindings, worker transport, or config/DI wiring.

Prefer smaller slices for adapter/repository behavior against real dependencies, real client adapters against local stubs, use-case orchestration with real adapters/persistence, or dense error variation where the full host adds little signal.

Mixed suites are healthy: one runtime happy path plus narrower slices often beats forcing every branch through the host.

## Scenario and assertion quality

Keep scenarios that preserve meaningful request/event shapes, production-relevant invariants, downstream-visible side effects, or a small set of boundary-worthy failures.

Drop or rewrite private helper expectations, fake clients, mock counts, and tiny branches whose value disappears at the real boundary. Read `promoting-unit-tests.md` for dense mock-heavy suites.

Assertions should follow `shared-harness.md`; additionally:

- avoid old unit factories when they hide real payload/seed data
- prefer caller-visible failures over internal error types
- seed only minimum data

## Imports and commands

Keep honesty over dogma:

- runtime boundary: drive the runtime
- smaller slice: importing real classes under test is fine
- avoid mock factories/fake clients used only to preserve unit shape
- prefer local seed/read-back helpers when clearer

Build once in explicit integration commands when possible. If watch mode matters, keep shared dependencies separate from restartable app processes. When both paths are selected, follow `shared-harness.md` coexistence rules.
