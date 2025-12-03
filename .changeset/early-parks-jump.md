---
"@pagopa/azure-tracing": patch
---

Set the version of `@azure/monitor-opentelemetry` to a fixed version (`1.3.1`) to avoid issues with changes introduced in version `1.4`.

When `@azure/monitor-opentelemetry` was updated to version `1.4`, it introduced breaking changes that affected our tracing implementation.  
During runtime, we encountered errors related to the `AzureMonitorMetricExporter`, which led to failures in exporting telemetry data to Azure Monitor.

The error message observed was:
```
@azure+monitor-opentelemetry@1.14.2/node_modules/@azure/monitor-opentelemetry/src/metrics/standardMetrics.ts:11
import { AzureMonitorMetricExporter } from "@azure/monitor-opentelemetry-exporter";
         ^

SyntaxError: The requested module '@azure/monitor-opentelemetry-exporter' does not provide an export named 'AzureMonitorMetricExporter'
 ```
