---
"setup-telemetry-action": patch
---

Remove the `@azure/monitor-opentelemetry` and add `@pagopa/azure-tracing` dependency.

By doing this, every time we update the internal `@pagopa/azure-tracing` package, we are propagating the
changes to the `setup-telemetry` action as well.
