# Azure Functions record-replay additions

Prerequisites: read `azure-harness.md`, `azure-functions-harness.md`, and `shared-vitest-lifecycle.md` when Vitest is used. This adds Functions-specific characterization guidance.

## Layout

Keep characterization near the app and separate cassettes/support from scenario tests. Reuse stronger repo conventions when present.

```text
src/
  characterization/
    <app>-happy-paths.test.ts
    cassettes/<scenario>/
      request.json
      response.json
      side-effects.json
      topology.json
      normalization.json
    support/
      cassettes.ts
      function-host.ts | app-runtime.ts
      harness.ts
```

- tests drive real scenarios
- `cassettes.ts` reads/writes multilayer artifacts deterministically
- `function-host.ts`/`app-runtime.ts` owns starting or attaching to the runtime
- `harness.ts` owns Testcontainers dependencies, seed data, and side-effect readers; if the app runs in its own container, leave env/startup ownership there
- with Vitest, prefer `tests/global-setup.ts` and `tests/with-test-fixtures.ts` for shared containers

## Independence from app internals

Keep characterization independent from target modules:

- no app models, io-ts/zod schemas, generated API types, helper functions, shared runtime packages, generated clients, exported Function wrappers/handlers, `app.http(...)` registrations, or `wrapHandlerV4(...)` returns
- define request builders, tiny response schemas, side-effect serializers under characterization support
- use OpenAPI, cassette contents, and protocol-visible payloads as contract sources

## Workflow

1. Boot runtime and local topology through the shared Azure/Functions harness.
2. Seed/read dependencies via raw SDK/protocol calls owned by characterization support.
3. Read observable side effects from emulators/local dependencies.
4. Write `request.json`, `response.json`, `side-effects.json`, `topology.json`, and `normalization.json`.
5. In `verify`, rerun and compare without mutating cassettes.

For HTTP happy paths, require a success-shaped live capture before first write. Later `verify` compares normalized layers only; do not add extra payload matchers beside cassette comparison.

Use `/admin/functions/<name>` for diagnostics, not default characterization of queue/broker/timer/blob flows when real trigger transport works.

If honest `func start`/runtime cannot boot and the only path imports exported handlers or wrappers, stop as record-replay blocked; that narrower seam belongs to integration.

Prefer one-time build in explicit `record`/`verify` scripts rather than test body/host wrapper. Keep characterization opt-in so default fast tests do not start full topology. With Vitest, combine shared-container lifecycle with separate `record` / `verify` commands.

## Cassette helper shape

Keep helpers boring and deterministic:

- compute scenario file paths under `cassettes/`
- recursively sort object keys while preserving arrays
- write pretty JSON with trailing newline
- read layers as plain JSON
- do not decide scenario meaning inside the helper

## `topology.json`

Record replayable facts only:

- normalized host base URL
- app runtime identity such as boot command or image tag
- dependency families such as Azurite or Cosmos emulator
- local-only feature flags or compatibility seams

Do not dump full env or ephemeral container internals.

## Failure modes

- Happy path records 500: fix topology, seed data, or scenario; do not keep it.
- Happy path records 400: usually fixture/request constraints are wrong; check validators, minimum lengths, required headers, allowed relationships, etc.
