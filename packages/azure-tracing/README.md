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

Unit tests live next to the source they cover. The integration suite starts real
services with [Testcontainers](https://node.testcontainers.org/), so a container
runtime must be available.

```bash
pnpm nx test @pagopa/azure-tracing
pnpm nx run @pagopa/azure-tracing:integration
```

## Dependency Constraints

> [!WARNING]
> Keep `import-in-the-middle` at the same major version this package resolves
> (currently `3.x`). The ESM loader registered by this package and the hooks
> pushed by `@azure/monitor-opentelemetry` must share the same iitm registry,
> otherwise HTTP dependency spans (including CosmosDB) are silently dropped.

```bash
pnpm why import-in-the-middle
```

The remaining constraints — the OpenTelemetry release train this package is
pinned to, its rationale, the validated version matrices and the upgrade
procedures — are maintainer concerns. They live in [CONTRIBUTING.md](./CONTRIBUTING.md).
