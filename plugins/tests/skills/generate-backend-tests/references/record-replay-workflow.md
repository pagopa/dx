# Record-replay workflow

Read after the user chooses `record-replay`.

## Goal and output

Freeze observable backend behavior through a real local boundary so refactors can verify drift without rewriting cassettes unless record mode is explicit.

Produce:

- capture script or reusable entrypoint that boots topology and writes multilayer cassettes
- black-box verification tests that call only the real local boundary
- normalization and side-effect helpers owned by the characterization folder
- explicit `record` and `verify` commands plus a note on what was frozen

## Source-level black-box rule

Keep characterization contract-local.

- Do not import target handlers, services, models, decoders, generated types, config helpers, runtime-coupled packages, exported wrappers, route registrations, or app-owned workspace packages.
- Package-name imports can still be target code.
- Relative imports from characterization into the app are a failure signal.
- Prefer local request builders, tiny schemas, plain JSON comparisons, OpenAPI examples, raw SDK/protocol clients, and characterization-local helpers.
- The routine exception is the minimal boot wrapper needed to start the real runtime.
- If the only way to drive the scenario imports target code, stop as blocked or ask to switch workflows.

## Workflow

1. Start from the shared harness and chosen boundary.
2. Pick one representative scenario at a time.
3. Boot the minimum local topology and start/attach to the runtime.
4. Prove readiness at the needed boundary/dependency level.
5. Send canonical input through the real local boundary.
6. For happy paths, confirm a meaningful success shape before recording.
7. Read back relevant side effects.
8. Write deterministic cassette layers.
9. Run `verify` once after first successful capture.

The capture entrypoint should boot dependencies, start/attach runtime, wait, send inputs, collect response/side effects, write artifacts, and tear down cleanly. Prefer explicit modes:

- `record`: intentionally refresh artifacts
- `verify`: rerun and fail on drift without mutation

## What to freeze

Freeze observable contracts: HTTP request/response, queue/topic/worker payloads, stored blobs/docs/rows/cache/messages, normalized outbound stub exchanges, and topology facts needed for replay.

Do not freeze incidental noise: non-semantic timestamps, trace/correlation IDs, ephemeral hosts/ports after normalization, helper-call counts, or framework metadata.

Read `cassette-layout.md` before writing files; it owns layer responsibilities and redaction.

## Verification

Verification tests:

- call only the running local runtime/host/worker seam
- compare normalized live response and side effects to the cassette
- keep assertions external
- treat the cassette as the only durable oracle

In `verify`, prefer equality against cassette layers over `toMatchObject`, handwritten semantic assertions, schema decoders, or helper-specific checks. If a scenario needs durable semantic assertions, move it to `integration` or `both`.

## Local dependencies and safety

Follow `shared-harness.md` dependency/Testcontainers policy. Keep recorder helpers local and reuse the same normalization helpers for `record` and `verify`.

For happy paths, do not record reproducible 4xx/5xx as success. Sanity-check the first cassette, but keep those guards capture-time only instead of duplicating them as verify assertions.

When both paths are selected, follow shared coexistence rules.

## Guardrails

- Prefer real local execution over direct handler imports.
- End with an import audit of the characterization folder: imports must be Node built-ins, third-party SDK/protocol clients, generic test tooling, or characterization-local support.
- Keep cassettes small, reviewable, split by concern, and redacted.
- Explain any non-Testcontainers exception explicitly.
