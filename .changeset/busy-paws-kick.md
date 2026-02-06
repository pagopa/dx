---
"azure_function_app": patch
"azure_storage_account": patch
---

Add `endpoints.queue` output to storage account for RBAC configuration

Both modules now expose the queue endpoint via `storage_account.endpoints.queue`. This enables RBAC authentication configuration on queues and provides a foundation for extending to other endpoints in the future.
