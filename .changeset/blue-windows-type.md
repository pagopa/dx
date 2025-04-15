---
"@pagopa/azure-tracing": minor
---

Create `@pagopa/azure-tracing` package

## Features

- Instrument an Azure Function (ECMAScript version) with OpenTelemetry and Azure Monitor.  
  To enable tracing, add the `NODE_OPTIONS = "--import @pagopa/azure-tracing"` environment variable.
- Log custom events using the `emitCustomEvent` function.
- Use the `registerAzureFunctionHooks` function to ensure Azure correlates telemetry from dependencies.
- Manual initialization of Azure Monitor using the `initAzureMonitor` function.  
  This function allows to pass a custom list of instrumentation.
