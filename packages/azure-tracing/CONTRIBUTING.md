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

Those suites import the sources, so they resolve the workspace dependency tree
and inherit its overrides. `src/__tests__/packed-consumer.integration.test.ts`
covers the gap: it installs the tarball in a throwaway consumer with `npm` (no
workspace overrides, no catalog), then runs the scenarios in
`src/__tests__/fixtures/consumer/` and asserts that Redis dependency telemetry
still reaches the collector and that `@opentelemetry/api` resolves to a single
copy. Both Redis v5 and v6 are exercised, because `redis` is a consumer choice
rather than a packaged dependency.

The tarball itself is built once per integration run by
`src/__tests__/packed-package.global-setup.ts`, wired through `globalSetup` in
`vitest.integration.config.js`. The setup runs `pnpm build` and `pnpm pack` in a
temporary directory, publishes the path with Vitest `provide`, and removes the
directory when the run ends. Any integration suite can read it with
`getPackedPackageTarballPath()` from
`src/__tests__/packed-package-provided-context.ts` instead of packing the package
again.

`src/__tests__/artifact-contract.test.ts` guards the artifact without containers.
It reads `package.json` and the built `dist`, then asserts that every `exports`
subpath points at a file inside `dist` and that every bare module imported by
those entries is declared in `dependencies` (or `peerDependencies`). Because
`tsup` bundles with `bundle: true`, an undeclared runtime import of a
`devDependency` would be inlined into `dist`, so consumers would receive a
private copy. The suite runs in the regular `test` task without Docker; the
package `test` target depends on `build`, so `dist` is always fresh.

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

### `@opentelemetry/*` overrides

> [!WARNING]
> Do **not** add a `@opentelemetry/*` override to fix something a consumer
> reports. The `overrides` block in `pnpm-workspace.yaml` applies to this
> workspace only: it is not published and cannot change what a consumer
> installs. Anything consumers need must come from the ranges declared in
> `package.json`.

`@azure/monitor-opentelemetry` bundles a family of `@opentelemetry/*` packages
with mixed ranges: `sdk-node@0.221.0` requires the 2.10.0 SDK artifacts exactly,
while the distro itself and `@azure/monitor-opentelemetry-exporter` accept
`^2.10.0` and resolve 2.12.0. A consumer install therefore loads more than one
copy of `core`, `resources` and the `sdk-*` artifacts, and that is expected:
context propagation, sampling and exporters all meet on `@opentelemetry/api`,
which is the only global registry involved.

Measured on this workspace with every `@opentelemetry/*` override removed: the
integration suite stays green (Live Metrics QuickPulse handshake, Redis spans,
Fastify request URL, custom events), and only the size of the package set grows.
So do not add a pin again unless a regression is reproduced, and reproduce it
through the published tarball (step 5 of the upgrade checklist) rather than
through the workspace.

Redis v6 support is a consumer-side concern the distro already solves.
`@azure/monitor-opentelemetry@1.21.0` pulls
`@opentelemetry/instrumentation-redis@^0.69.0`, the first line declaring
`redis@^6.0.0`, and it wraps both v5 and v6 clients. Do not pin that
instrumentation past the distro line: `0.73.0` requires
`@opentelemetry/instrumentation@^0.301.0` and `@opentelemetry/api@^1.10.0`, which
inject a second `@opentelemetry/instrumentation` registry and make package
managers nest a second `@opentelemetry/api` copy inside this package for every
consumer.

Two versions of the _same_ instrumentation remain a hazard to avoid rather than
tolerate: `InstrumentationBase._wrap` unwraps any existing wrapper before
applying its own, and `isWrapped` is detected through plain
`__original`/`__unwrap`/`__wrapped` properties that are shared across copies. Two
copies therefore steal each other's patch (last writer wins, decided by module
load order) instead of being merged, and a `disable()` from the losing copy can
remove the surviving patch entirely.

### Why `@opentelemetry/api` is pinned to `1.9.1`

`@opentelemetry/api` is the one exception to the rule above, and the workspace
pins it to `1.9.1`. The reason is a peer contract, not deduplication: the API
package is the runtime registry every instrumented library looks up, so all the
copies of `core`, `resources` and `sdk-*` have to agree on it.

| family                                                                                | peer range on `@opentelemetry/api` |
| ------------------------------------------------------------------------------------- | ---------------------------------- |
| `core`, `sdk-trace-node`, `context-async-hooks`, `propagator-b3`, `propagator-jaeger` | `>=1.0.0 <1.10.0`                  |
| `sdk-trace-base`, `resources`, `sdk-trace`, `sdk-node@0.221.0`                        | `>=1.3.0 <1.10.0`                  |
| `sdk-logs@0.221.0`                                                                    | `>=1.4.0 <1.10.0`                  |
| `sdk-metrics@2.10.0`                                                                  | `>=1.9.0 <1.10.0`                  |

The catalog declares `^1.9.1`, that is `>=1.9.1 <2.0.0`, and `1.10.0` is the
published `latest`, so the range resolves to it. `1.10.0` satisfies the range but
violates the `<1.10.0` upper bound of every family above, leaving those copies
with an unmet peer. The failure mode depends on the installer:

- `pnpm` is not peer-aware while resolving: it picks the highest match (`1.10.0`)
  and only reports the conflict from `pnpm peers check`;
- `npm` backtracks on unmet peers and settles on `1.9.1`, which is why a scratch
  consumer can look healthy while the workspace is not;
- installs that enable `strict-peer-dependencies` fail outright.

`1.9.1` is also the version the distro registers as the global API at runtime, so
the pin keeps a single registry instead of only silencing the warning.

Do not "fix" this by moving to `1.10.0`: the 3.x and 0.301 lines (`core`,
`resources`, `sdk-logs`, `sdk-metrics`, `sdk-trace`, `instrumentation`) ask for
`>=1.10.0 <1.11.0`, while the `2.12` trace line and the whole
`@azure/monitor-opentelemetry@1.21.0` closure ask for `<1.10.0`. The two contracts
are disjoint, so no single API version satisfies both. Moving to `1.10.0` becomes
possible only once Azure ships a distro built on the 0.301/3.x line, and then the
entire family, `instrumentation-redis` included, moves in one step.

Verify the result with `pnpm peers check` (no `@opentelemetry/*` complaint should
appear; the remaining ones are the unrelated `react`/`react-dom` peers of
`@microsoft/docusaurus-plugin-application-insights`) and with:

```bash
# Prints exactly one line: @opentelemetry/api@1.9.1
rg -o "'@opentelemetry/api@[0-9][0-9a-z.-]*'" --no-filename pnpm-lock.yaml | sort -u
```

## Upgrading `@azure/monitor-opentelemetry`

1. Bump the catalog entry in `pnpm-workspace.yaml` and check whether
   `@opentelemetry/api` still satisfies the new SDK peer ranges. Do not add any
   other `@opentelemetry/*` override: the workspace keeps a single pin, the API
   one.
2. Re-check the `import-in-the-middle` constraint above.
3. Verify the API resolves to a single version and that the Redis
   instrumentation comes from the distro:

   ```bash
   # Prints exactly one line.
   rg -o "'@opentelemetry/api@[0-9][0-9a-z.-]*'" --no-filename pnpm-lock.yaml | sort -u
   pnpm why @opentelemetry/instrumentation-redis
   ```

   > [!NOTE]
   > Do not use `pnpm dedupe --check` here: it reports unrelated duplicated
   > packages (`vite`, `vitest`, `memfs`, …) and running `pnpm dedupe` would
   > rewrite the whole lockfile.

4. Confirm `pnpm install --frozen-lockfile` is clean and `pnpm peers check` reports
   no `@opentelemetry/*` peer complaint, then run the integration suite. The suites
   cover both regressions this alignment fixes: Live Metrics exports through the
   QuickPulse endpoint, and request telemetry exported for a Fastify server with a
   non-empty URL.
5. Check the published artifact, not just the workspace. The workspace overrides
   are not part of the tarball, so the suites that import the sources cannot
   detect an artifact that loses instrumentation once installed by a consumer.
   `packed-consumer.integration.test.ts` automates this: it packs the package,
   installs the tarball with `npm` in a scratch consumer (Redis v5 and v6) and
   asserts that a Redis command produces a `redis-*` span, and that
   `@opentelemetry/api` resolves to a single copy. It runs with the rest of the
   integration suite:

   ```bash
   pnpm nx run @pagopa/azure-tracing:integration
   ```

   The manual equivalent, useful when debugging:

   ```bash
   pnpm pack --pack-destination /tmp
   # In a throwaway directory: npm i /tmp/pagopa-azure-tracing-<version>.tgz redis@6
   # Then trace one command and compare the span names with the redis@5 run.
   ```
