# @pagopa/azure-tracing

## 0.3.2

### Patch Changes

- ef10785: Upgrade OpenTelemetry dependencies

  Fixes the issue https://github.com/microsoft/ApplicationInsights-node.js/issues/1423

## 0.3.1

### Patch Changes

- b3254c7: Rename `APPINSIGHTS_CONNECTION_STRING` to `APPLICATIONINSIGHTS_CONNECTION_STRING`

## 0.3.0

### Minor Changes

- 66efe11: Create `@pagopa/azure-tracing` package

  ## Features

  - Instrument an Azure Function (ECMAScript version) with OpenTelemetry and Azure Monitor.
    To enable tracing, add the `NODE_OPTIONS = "--import @pagopa/azure-tracing"` environment variable.
  - Log custom events using the `emitCustomEvent` function.
  - Use the `registerAzureFunctionHooks` function to ensure Azure correlates telemetry from dependencies.
  - Manual initialization of Azure Monitor using the `initAzureMonitor` function.
    This function allows to pass a custom list of instrumentation.
