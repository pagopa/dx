# Record-replay workflow for generated backend tests

Read this after the user chooses the `record-replay` path.

## Goal

Freeze observable backend behavior through a real local boundary so future refactors can verify drift without rewriting the cassette unless record mode is explicit.

## Outcome

Produce or update:

- a capture script or reusable entrypoint that boots the local topology and writes multilayer cassettes
- black-box verification tests that call only the real local boundary
- normalization and side-effect helpers that are owned by the characterization folder
- explicit `record` and `verify` commands plus a note explaining what was frozen

## Source-level black-box rule

Keep the characterization harness contract-local by default.

- Do not import handlers, services, models, decoders, generated types, config helpers, or runtime-coupled shared packages from the target codebase into the characterization harness.
- Prefer local request builders, local schemas, plain JSON assertions, OpenAPI examples, and raw SDK or protocol calls owned by the characterization folder.
- The routine exception is the minimal boot wrapper needed to start the real runtime.

## Core workflow

1. Start from the shared harness and chosen boundary.
2. Pick one representative scenario at a time.
3. Boot the minimum local topology required for that scenario.
4. Start or attach to the real local runtime.
5. Prove readiness at the exact boundary and dependency level the scenario needs.
6. Send the canonical input through the real local boundary.
7. For happy-path scenarios, confirm the live result is success-shaped before recording it.
8. Read back the relevant side effects from the real local dependencies.
9. Write the cassette layers deterministically.
10. Run `verify` once after the first successful capture so future runs fail on drift instead of silently rewriting artifacts.

## Capture script guidance

Generate a reusable script or CLI entrypoint when the repository does not already have one.

The workflow should:

1. boot dependencies first
2. start or attach to the target runtime
3. wait for readiness
4. send one or more canonical inputs
5. collect response plus side-effect observations
6. write cassette artifacts
7. tear the topology down cleanly when appropriate

Prefer two explicit modes:

- `record`: intentionally refresh the cassette
- `verify`: rerun unchanged and fail on drift without mutating stored artifacts

## What to freeze

Freeze what a real local client or adjacent system can observe:

- HTTP request and response contract
- queue, topic, or worker input and output payloads
- stored blobs, documents, rows, cache entries, or emitted messages
- normalized outbound dependency exchanges observed by local stubs
- topology facts that matter for replay

Do not freeze irrelevant noise:

- timestamps unless they are semantically part of the contract
- trace or correlation IDs
- ephemeral hostnames or ports after normalization
- helper-call counts
- incidental framework metadata

Read `references/cassette-layout.md` before you write the cassette files.

## Verification tests

Write tests that remain black-box:

- call only the running local runtime, host, or worker seam
- reuse the stored cassette as the contract source
- compare live responses and side effects against the stored artifacts
- keep assertions at the external contract level

Do not let verification drift back into in-process imports just because it is convenient.

## Local dependency rules

Follow the dependency classification and Testcontainers policy in `references/shared-harness.md`. Additionally for record-replay work:

- Normalize unstable values through shared helpers that both `record` and `verify` use.
- Keep recorder helpers local to the characterization folder.

## Happy-path safety

For scenarios labeled happy path:

- do not accept a recorded 4xx or 5xx as "good enough" just because it is reproducible
- require a minimally meaningful success shape before writing the cassette
- sanity-check the stored artifacts after the first capture

## When both paths are selected

If integration coverage also exists for the same boundary:

- reuse the shared harness and generic fixtures
- keep record-replay ownership to cassettes, normalization, and `record` / `verify`
- avoid a second shared setup or container-startup path

## Guardrails

- Prefer real local execution over direct handler imports.
- Prefer source-level black-box harness code too.
- Keep cassettes small and reviewable, split by concern.
- Redact secrets before writing any cassette layer.
- Explain any non-Testcontainers exception explicitly instead of hiding it inside the harness.
