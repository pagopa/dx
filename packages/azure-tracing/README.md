# @pagopa/azure-tracing

This package provides a set of tools to integrate Azure Application Insights with OpenTelemetry for tracing and telemetry in Node.js applications.

## Usage
1. Install the package:

   ```bash
   yarn add @pagopa/azure-tracing
   ```

If you need to enable tracing on Azure Functions, you can simply add the following environment variable:
```
"NODE_OPTIONS": "--import @pagopa/azure-tracing",
```
This will instrument you Azure Function with OpenTelemetry and Application Insights.

With this approach, you don't need to add any code to your Azure Function. The instrumentation will be automatically applied when the function is executed.
