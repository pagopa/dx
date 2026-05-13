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

## Local backend test workflows

This package now ships an opt-in backend harness that reuses one shared local topology for both live integration tests and characterization cassettes.

- `pnpm --filter @pagopa/azure-tracing test:integration`
- `pnpm --filter @pagopa/azure-tracing test:characterization:record`
- `pnpm --filter @pagopa/azure-tracing test:characterization:verify`

The harness uses:

- a local **HTTPS Azure Monitor ingestion stub** to observe exported telemetry envelopes
- **Redis** via Testcontainers for live dependency spans
- the **Azure Cosmos DB Linux emulator** via Testcontainers for live dependency spans

The Cosmos scenario runs through `--import @pagopa/azure-tracing` on purpose: for ESM consumers, the preload path is the honest way to keep HTTP/Cosmos dependency instrumentation active.

## Backend test report

### Scope

The backend suites protect the public tracing surface of `@pagopa/azure-tracing` at the Azure Monitor export boundary.
They cover ongoing live telemetry checks for `initAzureMonitor` and `emitCustomEvent`, plus characterization coverage for Azure Functions v4/v3 trace-context helpers.

### Suite overview

| Path | Location | Boundary | Local infrastructure |
| --- | --- | --- | --- |
| Integration | `tests/integration/azure-monitor.live.test.ts` | Azure Monitor ingestion seam reached through the public package exports | HTTPS ingestion stub, Redis Testcontainer, Cosmos emulator Testcontainer |
| Record-replay | `tests/characterization/azure-functions-propagation.test.ts` | Public Azure Functions helper exports (`azure-functions`, `azure-functions/v3`) | Same HTTPS ingestion stub and shared backend harness, plus cassette layers under `tests/characterization/cassettes/` |

### Shared infrastructure

- `tests/global-setup.ts` boots one shared HTTPS ingestion stub plus Redis and Cosmos containers once per backend Vitest run.
- `tests/with-test-fixtures.ts` allocates disposable Redis namespaces and Cosmos databases so the containers stay shared while test data stays isolated.
- `tests/support/scenario-runner.mjs` runs each scenario in a separate Node process. The Cosmos scenario intentionally uses `--import @pagopa/azure-tracing` because the ESM preload path is the honest way to keep dependency tracing active for HTTP/Cosmos clients.
- The Azure Monitor side is a deterministic local stub, not a live Azure resource. This keeps the boundary focused on the exporter payload that this package owns.

### Scenario table

| Scenario | Location | Honest boundary exercised | Observable outcome | Infrastructure used |
| --- | --- | --- | --- | --- |
| HTTP + Redis + custom event live export | `tests/integration/azure-monitor.live.test.ts` | `initAzureMonitor()` + public logger export against the Azure Monitor ingestion seam | Azure Monitor envelopes contain one outbound HTTP dependency, Redis `SET`/`GET` dependencies, one custom event, and the outbound request carries a `traceparent` header | HTTPS ingestion stub, Redis Testcontainer |
| Cosmos dependency export through preload | `tests/integration/azure-monitor.live.test.ts` | Package preload entrypoint (`--import @pagopa/azure-tracing`) with a real `@azure/cosmos` client | Azure Monitor envelopes contain real HTTP dependencies emitted by Cosmos SDK calls against the emulator (`POST /dbs`, document write, database delete) | HTTPS ingestion stub, Cosmos emulator Testcontainer |
| Azure Functions v3 trace-context cassette | `tests/characterization/azure-functions-propagation.test.ts` | `withOtelContextFunctionV3()` from the published package | Recorded cassette proves the emitted dependency span keeps the `traceparent` trace id and parent span id as `ai.operation.id` / `ai.operation.parentId` | HTTPS ingestion stub, characterization cassettes |
| Azure Functions v4 trace-context cassette | `tests/characterization/azure-functions-propagation.test.ts` | `registerAzureFunctionHooks()` from the published package | Recorded cassette proves the wrapped function span keeps the same propagated trace identifiers | HTTPS ingestion stub, characterization cassettes |

### Rerun commands

```bash
pnpm exec nx test @pagopa/azure-tracing
pnpm --filter @pagopa/azure-tracing test:integration
pnpm --filter @pagopa/azure-tracing test:characterization:verify
pnpm --filter @pagopa/azure-tracing test:characterization:record
```

### Current intentional gaps

- The suites do **not** talk to a live Application Insights resource. They verify the Azure Monitor exporter contract through a local HTTPS ingestion stub instead.
- Jaeger and a generic OpenTelemetry Collector are intentionally out of scope here: this package exports to Azure Monitor/Application Insights, so OTLP backends would test a different boundary.
- The characterization suites intentionally stop short of a full Azure Functions host. They protect the published helper contract for trace-context propagation, not local Functions runtime wiring.

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
| **`^2.0.0`**                      | **`1.16.0`**                   | **`2.0.6`** | **`2.0.6`** ✅           |

#### How to determine the correct version

When upgrading `@azure/monitor-opentelemetry`, check which version of `@opentelemetry/instrumentation` it depends on, then look up the `import-in-the-middle` range that instrumentation version requires:

```bash
# Check what instrumentation version monitor-otel uses
npm view @azure/monitor-opentelemetry@<version> dependencies | grep '@opentelemetry/instrumentation'

# Check what iitm range that instrumentation version requires
npm view @opentelemetry/instrumentation@<version> dependencies | grep 'import-in-the-middle'
```

Set `import-in-the-middle` in `package.json` to the same major range as the result.
