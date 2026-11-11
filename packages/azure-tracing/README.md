# @pagopa/azure-tracing

This package provides utilities to seamlessly integrate [Azure Monitor's Application Insights](https://learn.microsoft.com/en-us/azure/azure-monitor/app/app-insights-overview)
with OpenTelemetry for distributed tracing and telemetry in Node.js applications, especially in Azure Functions environments.

## Installation

Install the package using:

```bash
pnpm add @pagopa/azure-tracing
```

## Getting Started

### Instrumenting Azure Functions

To enable OpenTelemetry tracing and route telemetry to Azure Monitor in your Azure Functions (both v3 and v4 programming models), you primarily need to perform two steps: preload the instrumentation logic via `NODE_OPTIONS` and register lifecycle hooks.

Currently, [ECMAScript Modules (ESM) support in OpenTelemetry is still experimental](https://github.com/open-telemetry/opentelemetry-js/blob/966ac176af249d86de6cb10feac2306062846768/doc/esm-support.md),
which makes direct instrumentation of Azure Functions a bit tricky.
So, if you have a Node.js project ESM based (`"type": "module"` in the `package.json`), to work around this, you have to preload the instrumentation logic at runtime using the `NODE_OPTIONS` environment variable.

> [!NOTE]
> In case you have a CJS project (`"type": "commonjs"` in the `package.json`), you could use the `@pagopa/azure-tracing` as well.

This package provides a wrapper that simplifies this setup.

#### Step 1: Enable Tracing via NODE_OPTIONS

Set the following environment variable to preload the instrumentation:

```bash
NODE_OPTIONS=--import @pagopa/azure-tracing
```

This will automatically enable OpenTelemetry tracing and route telemetry to Azure Monitor.

For more background on this workaround, see:

- [Issue #4845 - OpenTelemetry JS](https://github.com/open-telemetry/opentelemetry-js/issues/4845#issuecomment-2253556217)
- [Issue #4933 - OpenTelemetry JS](https://github.com/open-telemetry/opentelemetry-js/issues/4933)

In order to enable tracing, you also need to set the following environment variables:

| **Name**                                      | **Required** | **Default** |
| --------------------------------------------- | ------------ | ----------- |
| **APPINSIGHTS_SAMPLING_PERCENTAGE**           | false        | 5           |
| **APPLICATIONINSIGHTS_CONNECTION_STRING**     | true         | -           |
| **APPLICATIONINSIGHTS_ENTRA_ID_AUTH_ENABLED** | false        | false       |

> [!WARNING]
> Connection-string-only authentication (the current default) is **deprecated** and will be removed in the next major version.
> Set `APPLICATIONINSIGHTS_ENTRA_ID_AUTH_ENABLED=true` to adopt Microsoft Entra ID authentication now.
> See [Microsoft Entra ID Authentication](#microsoft-entra-id-authentication) for details.

#### Step 2: Register Azure Function Lifecycle Hooks

Due to known limitations with the `azure-functions-nodejs-opentelemetry` library,
it's necessary to manually register lifecycle hooks to ensure proper dependency correlation in telemetry.

For more background on this workaround, see:

- [Issue #8 - azure-functions-nodejs-opentelemetry](https://github.com/Azure/azure-functions-nodejs-opentelemetry/issues/8)
- [Issue #33242 - azure-sdk-for-js](https://github.com/Azure/azure-sdk-for-js/issues/33242)

Add the following snippet to your main entry point (e.g., `main.ts`):

```ts
import { app } from "@azure/functions"; // Replace with your actual app import
import { registerAzureFunctionHooks } from "@pagopa/azure-tracing/azure-functions";
...
registerAzureFunctionHooks(app);
...
```

### Instrumenting Azure Functions v3 Handlers

For Azure Functions using the v3 programming model, if you need more granular control over OpenTelemetry context propagation within your function handlers, you can use the `withOtelContextFunctionV3` helper function to wrap your handlers. This function is designed to work with the v3 `Context` object structure.

To wrap the execution of your Azure Function in the OpenTelemetry context, use the `withOtelContextFunctionV3` helper as follows:

```ts
import { AzureFunction, Context as FunctionContext } from "@azure/functions"; // "@azure/functions": "^3"
import createAzureFunctionHandler from "@pagopa/express-azure-functions/dist/src/createAzureFunctionsHandler.js";
import { withOtelContextFunctionV3 } from "@pagopa/azure-tracing/azure-functions/v3"; // "@pagopa/azure-tracing": "^0.4"

export const expressToAzureFunction =
  (app: Express): AzureFunction =>
  (context: FunctionContext): void => {
    app.set("context", context);
    withOtelContextFunctionV3(context)(createAzureFunctionHandler(app)); // wrap the function execution in the OpenTelemetry context
  };
```

### Enabling Azure Monitor Telemetry

> [!NOTE]
> For Azure Functions, it is necessary to use the `NODE_OPTIONS` environment variable and register lifecycle hooks as described in the "Instrumenting Azure Functions" section. Manual initialization with `initAzureMonitor` is typically not required for Azure Functions (due to the issue previously explained), but it is useful for other Node.js applications (e.g., Azure App Services) where direct SDK initialization is preferred or necessary.

If you want to enable Azure Monitor telemetry in your application, and you don't have those issues previously described, you can do so in the following ways:

```ts
import { initAzureMonitor } from "@pagopa/azure-tracing/azure-monitor";
import { AzureMonitorOpenTelemetryOptions } from "@azure/monitor-opentelemetry";
import { ExpressInstrumentation } from "@opentelemetry/instrumentation-express";
...
const config: AzureMonitorOpenTelemetryOptions = {} // A valid AzureMonitorOpenTelemetryOptions object
const instrumentations = [new ExpressInstrumentation()] // A list of custom OpenTelemetry instrumentations
initAzureMonitor(instrumentations, config);
...
```

### Logging Custom Events

You can log custom events for additional observability using the `emitCustomEvent` function.
This utility accepts an event name and an optional payload, returning a logger function that also accepts a component or handler name.

```ts
import { emitCustomEvent } from "@pagopa/azure-tracing/logger";
...
emitCustomEvent("taskCreated", { id: task.id })("CreateTaskHandler");
...
```

This is especially useful for tracing domain-specific actions (e.g., resource creation, user actions, error tracking).

## Microsoft Entra ID Authentication

> [!IMPORTANT]
> Microsoft Entra ID authentication is the **recommended** and more secure way to connect to Application Insights.
> Connection-string-only authentication is deprecated and will be removed in the **next major release**.

Set `APPLICATIONINSIGHTS_ENTRA_ID_AUTH_ENABLED=true` to enable [Microsoft Entra ID authentication](https://learn.microsoft.com/en-us/azure/azure-monitor/app/azure-ad-authentication).
The package uses [`DefaultAzureCredential`](https://learn.microsoft.com/en-us/azure/developer/javascript/sdk/authentication/credential-chains#use-defaultazurecredential-for-flexibility) from `@azure/identity`, which automatically resolves the right credential for the environment:

- **Azure (production)**: uses the Managed Identity assigned to the resource (App Service, Azure Function, Container App, etc.)
- **Local development**: falls back to Azure CLI, Azure Developer CLI, or service principal env vars

The connection string (`APPLICATIONINSIGHTS_CONNECTION_STRING`) is still required in both modes — it identifies the Application Insights resource.

### Required Azure RBAC role

The managed identity (or other principal) must have the **Monitoring Metrics Publisher** role on the Application Insights resource.

## Testing

- `pnpm nx test @pagopa/azure-tracing` runs the default unit test suite.
- `pnpm nx run @pagopa/azure-tracing:integration` runs the opt-in integration suite.

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

> [!IMPORTANT]
> Pre-condition for the integration suite: Docker must be installed and running locally so Testcontainers can start the required services.
> The suite already uses the committed PEM fixtures in `src/__tests__/fixtures/`, so no extra certificate-generation step is required.

## Dependency Constraints

### `import-in-the-middle` version must match `@azure/monitor-opentelemetry`

> [!WARNING]
> Do **not** upgrade `import-in-the-middle` independently of `@azure/monitor-opentelemetry`. Doing so will silently break HTTP tracing (including CosmosDB calls) in ESM environments.

#### Why this constraint exists

The ESM instrumentation in this package works by registering a module loader hook via [`import-in-the-middle`](https://github.com/DataDog/import-in-the-middle) (iitm):

```ts
// packages/azure-tracing/src/azure/functions/index.mts
const { registerOptions } = createAddHookMessageChannel(); // uses iitm@X
register("import-in-the-middle/hook.mjs", ...);           // registers iitm@X as the active loader
```

`@azure/monitor-opentelemetry` internally creates an `HttpInstrumentation` instance that patches `node:https` (the transport layer used by CosmosDB, among others). This instrumentation registers its hooks using **its own** resolved version of iitm (transitively via `@opentelemetry/instrumentation`).

Each major version of `import-in-the-middle` maintains **completely isolated internal state** — hook registries are not shared across versions. If the loader is registered with `iitm@X` but `HttpInstrumentation` pushes its hooks into `iitm@Y`'s registry, the loader never sees them. The result: `node:https` is never patched, and all HTTP dependency spans (including CosmosDB) are silently dropped.

The table below shows what was validated empirically against Application Insights:

| `import-in-the-middle` direct dep | `@azure/monitor-opentelemetry` | Loader iitm | HttpInstrumentation iitm |
| --------------------------------- | ------------------------------ | ----------- | ------------------------ |
| `^1.15.0`                         | `1.13.1`                       | `1.15.0`    | `1.15.0` ✅              |
| `^3.0.0`                          | `1.13.1`                       | `3.0.0`     | `1.15.0` ❌              |
| `^1.15.0`                         | `1.16.0`                       | `1.15.0`    | `2.0.6` ❌               |
| `^1.15.0`                         | `1.18.1`                       | `1.15.0`    | `3.0.0` ❌               |
| `^2.0.0`                          | `1.16.0`                       | `2.0.6`     | `2.0.6` ✅               |
| **`^3.0.0`**                      | **`1.18.1`**                   | **`3.0.0`** | **`3.0.0`** ✅           |

#### How to determine the correct version

When upgrading `@azure/monitor-opentelemetry`, check which version of `@opentelemetry/instrumentation` it depends on, then look up the `import-in-the-middle` range that instrumentation version requires:

```bash
# Check what instrumentation version monitor-otel uses
npm view @azure/monitor-opentelemetry@<version> dependencies | grep '@opentelemetry/instrumentation'

# Check what iitm range that instrumentation version requires
npm view @opentelemetry/instrumentation@<version> dependencies | grep 'import-in-the-middle'
```

Set `import-in-the-middle` in `package.json` to the same major range as the result.

### `@opentelemetry/*` versions must stay on the `@azure/monitor-opentelemetry` release train

> [!WARNING]
> Do **not** bump a single `@opentelemetry/*` package past the line bundled by `@azure/monitor-opentelemetry`. The resulting duplicate registries degrade tracing without any error.

#### Why this constraint exists

`@azure/monitor-opentelemetry` ships a fixed set of OpenTelemetry packages, and the `0.221`-line releases pin `@opentelemetry/core`, `@opentelemetry/resources` and the `sdk-*` packages to an exact SDK version.
Other dependencies (for example `@azure/monitor-opentelemetry-exporter`) accept a wider range, so pnpm would otherwise install two copies of the same provider and only one of them would be the global tracer/metrics provider.

The `overrides` block in `pnpm-workspace.yaml` collapses the whole family onto a single version, and additionally forces `@opentelemetry/instrumentation-redis` onto that line.
That instrumentation is the first release with Redis v6 support; it declares `@opentelemetry/instrumentation@^0.301.0` but only consumes APIs that the `0.221` line already exports, so it is safe to install next to the Azure Monitor distro.

Only the artifacts that are actually split need a pin: `core`, `resources`, `sdk-metrics`, `sdk-trace-base`, `sdk-trace-node` and `sdk-trace-web`.
`context-async-hooks`, `exporter-zipkin`, `propagator-b3`, `propagator-jaeger`, `sdk-trace` and `@opentelemetry/api` are pinned exactly by `sdk-trace-node@2.10.0` (or are only required through caret ranges that already resolve to `1.10.0`), so they converge on the right version without an override.

When upgrading `@azure/monitor-opentelemetry`, update the catalog entry and the `@opentelemetry/*` overrides together, then verify that a single version is resolved:

```bash
pnpm why @opentelemetry/instrumentation-redis
pnpm why @opentelemetry/core

# Every @opentelemetry/* package must resolve to a single version.
# The command prints nothing when the lockfile is aligned.
rg -o "'@opentelemetry/[a-z-]+@[0-9][0-9a-z.-]*'" --no-filename pnpm-lock.yaml |
  sort -u | cut -d@ -f2 | sort | uniq -d
```

> [!NOTE]
> Do not use `pnpm dedupe --check` for this check: it reports unrelated duplicated
> packages (`vite`, `vitest`, `memfs`, …) and running `pnpm dedupe` would rewrite
> the whole lockfile.

The integration suites cover both regressions this alignment fixes: Live Metrics exports through the QuickPulse endpoint, and request telemetry exported for a Fastify server with a non-empty URL.

## Running Integration Tests Locally

Integration tests use [Testcontainers](https://node.testcontainers.org/) and require a working container runtime.

```bash
pnpm nx run @pagopa/azure-tracing:integration
```

> [!NOTE]
> Inside the devcontainer, tests work out of the box since Docker is available at the standard socket path.

### Rancher Desktop

If you use Rancher Desktop on macOS outside a Linux devcontainer, you need to export two environment variables so that Testcontainers can locate the Docker socket and correctly mount it inside helper containers:

```bash
export DOCKER_HOST="unix://$HOME/.rd/docker.sock"
export TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock
```

`DOCKER_HOST` tells Testcontainers where the socket is on the host. `TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE` tells it which path to bind-mount inside containers (the path inside the Rancher Desktop VM).

Add these to your shell profile (`~/.zshrc` or `~/.bashrc`) to avoid setting them every time.
