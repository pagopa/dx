---
"azure_function_app_exposed": patch
"azure_app_service_exposed": patch
"azure_function_app": patch
"azure_app_service": patch
---

Revert from TLS 1.3 to TLS 1.2 for app service and function app modules, added new variable named tls_version with default 1.2
