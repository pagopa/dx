# Contributing to @pagopa/azure-tracing

Working notes for maintainers and coding agents. Consumer documentation lives in
[README.md](./README.md); keep the readme free of internal procedures.

## Test layout

Unit tests live next to the source they cover. Integration suites are split by
the entrypoint they exercise:

| Directory                        | Entrypoint                                                                           |
| -------------------------------- | ------------------------------------------------------------------------------------ |
| `src/__tests__/`                 | Standalone applications (Container Apps, App Services) importing `initAzureMonitor`. |
| `src/azure/functions/__tests__/` | Azure Functions, instrumented through the `NODE_OPTIONS` preload.                    |

Both trees share the collector and scenario harness in `src/__tests__/`, and the
`runDependencyScenario` helper takes the preload module path as its last
argument (`standalonePreloadModulePath` for standalone suites,
`functionsPreloadModulePath` by default).

Each integration suite spawns `src/__tests__/fixtures/run-dependency-scenario.ts`
with `NODE_OPTIONS="--import=tsx --import=<preload>"` and `NODE_EXTRA_CA_CERTS`
pointing at the committed self-signed certificate. The collector is a local HTTPS
server that answers the Application Insights endpoints, including the QuickPulse
handshake (`x-ms-qps-subscribed: true`).

## Running integration tests locally

Integration tests use [Testcontainers](https://node.testcontainers.org/) and
require a working container runtime. Inside the devcontainer they work out of the
box; the suite already uses the committed PEM fixtures in
`src/__tests__/fixtures/`, so no certificate-generation step is required.

### Rancher Desktop

Outside a Linux devcontainer, on macOS with Rancher Desktop, export two variables
so that Testcontainers can locate the Docker socket and bind-mount it correctly
inside helper containers:

```bash
export DOCKER_HOST="unix://$HOME/.rd/docker.sock"
export TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock
```

`DOCKER_HOST` tells Testcontainers where the socket is on the host;
`TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE` tells it which path to mount inside
containers (the path in the Rancher Desktop VM).

## Dependency constraints

### `import-in-the-middle` must match `@azure/monitor-opentelemetry`

> [!WARNING]
> Do **not** upgrade `import-in-the-middle` independently of
> `@azure/monitor-opentelemetry`. Doing so silently breaks HTTP tracing
> (including CosmosDB calls) in ESM environments.

The ESM instrumentation in this package registers a module loader hook via
[`import-in-the-middle`](https://github.com/DataDog/import-in-the-middle) (iitm):

```ts
// packages/azure-tracing/src/azure/functions/index.mts
const { registerOptions } = createAddHookMessageChannel(); // uses iitm@X
register("import-in-the-middle/hook.mjs", ...);           // registers iitm@X as the active loader
```

`@azure/monitor-opentelemetry` creates an `HttpInstrumentation` that patches
`node:https` (the transport used by CosmosDB, among others). That instrumentation
pushes its hooks through **its own** resolved iitm version, transitively via
`@opentelemetry/instrumentation`.

Each major version of iitm keeps **isolated internal state** — hook registries are
not shared across versions. If the loader is registered with `iitm@X` while
`HttpInstrumentation` pushes hooks into `iitm@Y`'s registry, the loader never sees
them: `node:https` is never patched and every HTTP dependency span is silently
dropped.

Validated empirically against Application Insights:

| `import-in-the-middle` direct dep | `@azure/monitor-opentelemetry` | Loader iitm | HttpInstrumentation iitm |
| --------------------------------- | ------------------------------ | ----------- | ------------------------ |
| `^1.15.0`                         | `1.13.1`                       | `1.15.0`    | `1.15.0` ✅              |
| `^3.0.0`                          | `1.13.1`                       | `3.0.0`     | `1.15.0` ❌              |
| `^1.15.0`                         | `1.16.0`                       | `1.15.0`    | `2.0.6` ❌               |
| `^1.15.0`                         | `1.18.1`                       | `1.15.0`    | `3.0.0` ❌               |
| `^2.0.0`                          | `1.16.0`                       | `2.0.6`     | `2.0.6` ✅               |
| **`^3.0.0`**                      | **`1.18.1`**                   | **`3.0.0`** | **`3.0.0`** ✅           |

To determine the correct version when upgrading the distro:

```bash
# Check what instrumentation version monitor-otel uses
npm view @azure/monitor-opentelemetry@<version> dependencies | grep '@opentelemetry/instrumentation'

# Check what iitm range that instrumentation version requires
npm view @opentelemetry/instrumentation@<version> dependencies | grep 'import-in-the-middle'
```

Set `import-in-the-middle` in `package.json` to the same major range as the result.

### `@opentelemetry/*` must stay on the distro release train

> [!WARNING]
> Do **not** bump a single `@opentelemetry/*` package past the line bundled by
> `@azure/monitor-opentelemetry`. The resulting duplicate registries degrade
> tracing without raising any error.

`@azure/monitor-opentelemetry` ships a fixed set of OpenTelemetry packages, and the
`0.221`-line releases pin `@opentelemetry/core`, `@opentelemetry/resources` and the
`sdk-*` packages to an exact SDK version. Other dependencies (for example
`@azure/monitor-opentelemetry-exporter`) accept wider ranges, so pnpm would
otherwise install two copies of the same provider with only one of them becoming
the global tracer/metrics provider.

The `overrides` block in `pnpm-workspace.yaml` collapses the family onto a single
version and additionally forces `@opentelemetry/instrumentation-redis` onto that
line. That instrumentation is the first release with Redis v6 support; it declares
`@opentelemetry/instrumentation@^0.301.0` but only consumes APIs that the `0.221`
line already exports, so it runs safely next to the Azure Monitor distro.

Two versions of the same instrumentation must be avoided rather than tolerated:
`InstrumentationBase._wrap` unwraps any existing wrapper before applying its own,
and `isWrapped` is detected through plain `__original`/`__unwrap`/`__wrapped`
properties that are shared across copies. Two copies therefore steal each other's
patch (last writer wins, decided by module load order) instead of being merged,
and a `disable()` from the losing copy can remove the surviving patch entirely.

Only the artifacts that actually split need a pin: `core`, `resources`,
`sdk-metrics`, `sdk-trace-base`, `sdk-trace-node` and `sdk-trace-web`.
`context-async-hooks`, `exporter-zipkin`, `propagator-b3`, `propagator-jaeger`,
`sdk-trace` and `@opentelemetry/api` are required exactly by
`sdk-trace-node@2.10.0` (or resolve naturally through caret ranges), so they
converge on the right version without an override.

## Upgrading `@azure/monitor-opentelemetry`

1. Bump the catalog entry in `pnpm-workspace.yaml` and realign the `@logtape/otel>`
   overrides and the `@opentelemetry/*` pins to the same line.
2. Re-check the `import-in-the-middle` constraint above.
3. Verify that every `@opentelemetry/*` package resolves to a single version:

   ```bash
   pnpm why @opentelemetry/instrumentation-redis
   pnpm why @opentelemetry/core

   # Prints nothing when the lockfile is aligned.
   rg -o "'@opentelemetry/[a-z-]+@[0-9][0-9a-z.-]*'" --no-filename pnpm-lock.yaml |
     sort -u | cut -d@ -f2 | sort | uniq -d
   ```

   > [!NOTE]
   > Do not use `pnpm dedupe --check` for this check: it reports unrelated
   > duplicated packages (`vite`, `vitest`, `memfs`, …) and running
   > `pnpm dedupe` would rewrite the whole lockfile.

4. Confirm `pnpm install --frozen-lockfile` is clean and the integration suite is
   green. The suites cover both regressions this alignment fixes: Live Metrics
   exports through the QuickPulse endpoint, and request telemetry exported for a
   Fastify server with a non-empty URL.
