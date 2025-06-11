# @pagopa/azure-tracing

## 0.4.1

### Patch Changes

- ea6e987: Improve README to clarify functions usage

## 0.4.0

### Minor Changes

- 6ff8b02: Enhance support for legacy Azure Function (v3) to ensure the requests are properly correlated.

  ## Usage

  For legacy Azure Functions, you can use the wrap the Azure Function within the `withOtelContextFunctionV3` to make sure the requests are properly correlated.

  ```typescript
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

### Patch Changes

- 6ff8b02: Upgrade dependencies

## 0.3.3

### Patch Changes

- 1667bf1: Upgrade dependencies

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
