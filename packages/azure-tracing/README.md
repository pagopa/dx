# @pagopa/azure-tracing

This package provides a set of tools to integrate Azure Application Insights with OpenTelemetry for tracing and telemetry in Node.js applications.

## Usage

### Installation

   ```bash
   yarn add @pagopa/azure-tracing
   ```

### Instrumentation

#### Azure Functions

Since at the moment the [ECMAScript modules are not yet fully supported in OpenTelemetry](https://github.com/open-telemetry/opentelemetry-js/blob/966ac176af249d86de6cb10feac2306062846768/doc/esm-support.md),
to enable tracing using Azure Monitor you need to instruct your application to load the instrumentation code when starting the application.

This package is an implementation that allows you to do that by using the `NODE_OPTIONS` environment variable.  
For more information about the problem faced and the reason behind this implementation: 
- https://github.com/open-telemetry/opentelemetry-js/issues/4845#issuecomment-2253556217
- https://github.com/open-telemetry/opentelemetry-js/issues/4933

To enable tracing in your application, add the following environment variable:
```
"NODE_OPTIONS": "--import @pagopa/azure-tracing",
```
This will instrument you Azure Function with OpenTelemetry and Application Insights.

The only change required in your code is the use of the `registerAzureFunctionHooks` function.
Since at the moment the `azure-functions-nodejs-opentelemetry` library has some issues, to make sure Azure will correlate
the telemetry of the dependencies, just add the following line in your code:
```typescript
// main.ts
import { app } from "@azure/functions"; // Or the equivalent import you have in your code
import { registerAzureFunctionHooks } from "@pagopa/azure-tracing/azure-functions";

....
registerAzureFunctionHooks(app);
...
```

### Log a Custom Event

To log a custom event, you can use the `emitCustomEvent` function. This function takes an event name and an optional payload object as parameters. The payload object can contain any additional data you want to include with the event.

```typescript
import { emitCustomEvent } from "@pagopa/azure-tracing/logger";
...
emitCustomEvent("taskCreated", { id: task.id })("CreateTaskHandler");
...
```
