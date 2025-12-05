# @pagopa/azure-tracing

## 0.4.10

### Patch Changes

- 824fa3f: Set the version of `@azure/monitor-opentelemetry` to a fixed version (`1.13.1`) to avoid issues with changes introduced in version `1.14.x`.

  When `@azure/monitor-opentelemetry` was updated to version `1.14.x`, it introduced breaking changes that affected our tracing implementation.
  During runtime, we encountered errors related to the `AzureMonitorMetricExporter`, which led to failures in exporting telemetry data to Azure Monitor.

  The error message observed was:

  ```
  @azure+monitor-opentelemetry@1.14.2/node_modules/@azure/monitor-opentelemetry/src/metrics/standardMetrics.ts:11
  import { AzureMonitorMetricExporter } from "@azure/monitor-opentelemetry-exporter";
           ^

  SyntaxError: The requested module '@azure/monitor-opentelemetry-exporter' does not provide an export named 'AzureMonitorMetricExporter'
  ```

## 0.4.9

### Patch Changes

- fb9caa2: Update dependencies

## 0.4.8

### Patch Changes

- bdc22a5: Add compatibility with old `moduleResolution` systems

  > [!NOTE]: When a consumer with `moduleResolution: node` tries to import `@pagopa/azure-tracing`, TypeScript fails to find the exported subpath.
  > Now, the subpaths are properly exported in the `package.json` file, and, for old systems (like `node`), this packages works as well thanks to the
  > `typesVersions` entry.
  >
  > Even though this change guarantees compatibility with old systems, it is recommended to use a more recent `moduleResolution` system, like `bundler`.
  > Reference: https://www.typescriptlang.org/docs/handbook/modules/theory.html#module-resolution-is-host-defined.

- bdc22a5: Fix exports in the package.json to make sure the types are properly exported

## 0.4.7

### Patch Changes

- ddd0073: Update OpenTelemetry dependencies

  The version previously used of `@azure/monitor-opentelemetry` contained a bug that did not export a variable causing a runtime error.
  To locally fix it, it was necessary to patch the package, but now the issue has been fixed in the latest version, so we can remove the patch and update the dependency.
  You can find more details about the issue [here](https://github.com/Azure/azure-sdk-for-js/issues/35466).

## 0.4.6

### Patch Changes

- 25f7786: Replace `@tsconfig/node20` with `@tsconfig/node22`

## 0.4.5

### Patch Changes

- ce98aa8: Bump dependencies to fix a peerDependency warning

## 0.4.4

### Patch Changes

- 14c4e2b: Bump dependencies version
- 5b31f4f: Upgrade to latest version of `@pagopa/eslint-config` package

## 0.4.3

### Patch Changes

- b0331cd: Add support for CJS

  With this release, the `@pagopa/azure-tracing` package now supports CommonJS (CJS) module format, allowing it to be used in environments that do not support ES modules.

## 0.4.2

### Patch Changes

- 4316a40: Add the `repository` block in the `package.json` in order to verify provenance attestation

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
