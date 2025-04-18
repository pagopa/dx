---
"azure_app_service": patch
"azure_app_service_exposed": patch
"azure_function_app": patch
"azure_function_app_exposed": patch
---

Rename `APPINSIGHTS_CONNECTION_STRING` environment variable.

This was previously introduced to let the `@pagopa/azure-tracing` package work.
