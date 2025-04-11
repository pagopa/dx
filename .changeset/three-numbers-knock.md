---
"azure_app_service": patch
"azure_app_service_exposed": patch
"azure_function_app": patch
"azure_function_app_exposed": patch
---

Add `APPINSIGHTS_CONNECTION_STRING` as an environment variable when application insights is enabled.

The `APPINSIGHTS_CONNECTION_STRING` is used by the `@pagopa/azure-tracing`.
