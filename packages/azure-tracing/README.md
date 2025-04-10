# @pagopa/azure-tracing

This package provides utilities to seamlessly integrate [Azure Monitor's Application Insights](https://learn.microsoft.com/en-us/azure/azure-monitor/app/app-insights-overview)
with OpenTelemetry for distributed tracing and telemetry in Node.js applications, especially in Azure Functions environments.

## Installation

Install the package using:

```bash
yarn add @pagopa/azure-tracing
```

## Getting Started

### Instrumenting Azure Functions

Currently, [ECMAScript Modules (ESM) support in OpenTelemetry is still experimental](https://github.com/open-telemetry/opentelemetry-js/blob/966ac176af249d86de6cb10feac2306062846768/doc/esm-support.md),
which makes direct instrumentation of Azure Functions a bit tricky.
To work around this, you have to preload the instrumentation logic at runtime using the `NODE_OPTIONS` environment variable.

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

In order to enable tracing, you also need to set the following environment variable:

| **Name**                   | **Required** | **Default** |
| -------------------------- | ------------ | ----------- |
| **AI_SAMPLING_PERCENTAGE** | false        | 5           |
| **AI_CONNECTION_STRING**   | true         | -           |

#### Step 2: Register Azure Function Lifecycle Hooks

Due to known limitations with the `azure-functions-nodejs-opentelemetry` library, it's necessary to manually register lifecycle hooks to ensure proper dependency correlation in telemetry.

Add the following snippet to your main entry point (e.g., `main.ts`):

```ts
import { app } from "@azure/functions"; // Replace with your actual app import
import { registerAzureFunctionHooks } from "@pagopa/azure-tracing/azure-functions";
...
registerAzureFunctionHooks(app);
...
```

### Logging Custom Events

You can log custom events for additional observability using the emitCustomEvent function.
This utility accepts an event name and an optional payload, returning a logger function that also accepts a component or handler name.

```ts
import { emitCustomEvent } from "@pagopa/azure-tracing/logger";
...
emitCustomEvent("taskCreated", { id: task.id })("CreateTaskHandler");
...
```

This is especially useful for tracing domain-specific actions (e.g., resource creation, user actions, error tracking).
