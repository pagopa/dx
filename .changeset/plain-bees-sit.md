---
"azure_function_app_exposed": patch
"azure_app_service_exposed": patch
"azure_function_app": patch
"azure_app_service": patch
---

Revert from TLS `1.3` to TLS `1.2` for app service and function app modules, added new variable named tls_version with default `1.2`.

Ref.: [Azure API Management throwing error in connecting to backend which requires minimum TLS 1.3](https://learn.microsoft.com/en-us/answers/questions/2125989/azure-api-management-throwing-error-in-connecting)
