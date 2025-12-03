---
"@pagopa/azure-tracing": patch
---

Set the version of `@azure/monitor-opentelemetry` to a fixed version (`1.3.1`) to avoid issues with changes introduced in version `1.4`.

When `@azure/monitor-opentelemetry` was updated to version `1.4`, it introduced breaking changes that affected our tracing implementation.  
During runtime, we encountered errors related to the `AzureMonitorTraceExporter`, which led to failures in exporting telemetry data to Azure Monitor.
