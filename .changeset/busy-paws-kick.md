---
"azure_function_app": patch
"azure_storage_account": patch
---

Add `endpoints.queue` output to storage account for RBAC configuration

Both modules now expose the queue endpoint via `storage_account.endpoints.queue`. This enables RBAC authentication configuration on queues and provides a foundation for extending to other endpoints in the future.

### Example

Configure managed identity authentication for Azure Functions queue triggers using the queue endpoint (where `module.storage` is an instance of the `azure_storage_account` module):

```hcl
app_settings = {
  AzureWebJobsStorage__accountName      = module.storage.name
  AzureWebJobsStorage__queueServiceUri  = module.storage.endpoints.queue
}
```

This enables identity-based connections without requiring connection strings, improving security for Azure Functions bindings.
