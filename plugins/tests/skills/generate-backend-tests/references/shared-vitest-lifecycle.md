# Shared Vitest lifecycle

Use whenever integration or record-replay suites run on Vitest, especially with Redis, Postgres, Azurite, Cosmos, brokers, or other stateful services.

Default: do not start containers per test. Pay expensive startup once, keep mutable state test-scoped.

## Lifecycle split

1. Shared dependencies live for the whole Vitest process: start in `globalSetup`, provide connection details, stop in teardown.
2. Per-test fixtures create/delete only mutable resources.
3. App runtime stays separate if it must restart to pick up code changes.

## Layout

Follow repo naming if stronger, but preserve the split:

```text
vitest.config.ts
tests/
  global-setup.ts
  with-test-fixtures.ts
  support/
    shared-testcontainers.ts
    <dependency>.ts
    cleanup.ts
    ids.ts
  <suite-name>/<scenario>.test.ts
```

- `global-setup.ts`: starts/stops shared dependencies and provides values via Vitest `provide`/`inject`.
- per-dependency modules (`cosmos.ts`, `azurite.ts`, `redis.ts`, etc.): own startup, readiness, and dependency-specific helpers when there are two or more stateful dependencies.
- `with-test-fixtures.ts`: builder-pattern `test.extend(...)` fixtures for disposable resources.
- `cleanup.ts`: resource-specific deletion helpers.

If integration and record-replay coexist, keep sibling suites/projects that reuse the same `support/` layer. Use separate Vitest projects only when include patterns/reporters/lifecycle truly differ.

Keep live suites opt-in: exclude `__integrations__`, `characterization`, or equivalent paths from the app's default Vitest config so `test` does not start full topology by accident.

## `global-setup.ts`

Typical responsibilities:

- start stateful services once
- pin repo-required image tags/emulator flags
- print stable connection info
- provide connection metadata to tests
- tear down in reverse order
- optionally start app runtime only if it can stay alive for the session; otherwise keep it restartable outside shared dependency lifecycle

Keep `global-setup.ts` as a composition root when managing multiple dependencies. Do not force cassette helpers, host wrappers, or tiny stubs into dependency modules.

## `withTestFixtures`

Use `test.extend(...)` so setup/cleanup stays near the resource:

- Redis namespaces
- Postgres schemas/databases
- Cosmos containers
- queues/subscriptions
- blob prefixes
- seeded docs/rows

Use the cleanup primitive the installed Vitest supports: `onCleanup` if available, otherwise `await use(resource)` with `try/finally`. Do not fall back silently to suite-level cleanup because Vitest is older.

## Watch mode and isolation

Shared containers make watch mode faster; flaky reruns usually mean fixture leakage. Keep rows, schemas, queues, blob prefixes, Redis keys/streams, temp files, and downloaded outputs test-scoped. If two tests can observe leftovers, the suite will rot.

## Timeouts

Set explicit timeouts:

- `testTimeout` at least 30s for integration/characterization projects
- Testcontainers `startupTimeout` for heavy images
- generous `globalSetup` timeout for cold image pulls
- project-specific timeout so fast unit tests do not inherit slow topology settings

## Checklist

Confirm:

1. repo uses Vitest or can credibly add a Vitest integration config
2. expensive dependencies are safe to share
3. each test owns disposable state and cleanup
4. app runtime can run once or restart independently
5. rerun command is explicit and default unit tests stay fast
