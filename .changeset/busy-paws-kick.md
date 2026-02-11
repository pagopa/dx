---
"azure_function_app": patch
"azure_storage_account": patch
---

Expose storage account `primary_queue_endpoint` output.

Both `azure_function_app` and `azure_storage_account` modules now expose the primary queue endpoint: `storage_account.primary_queue_endpoint`. 
This enables RBAC authentication configuration on queues.

### Example

Configure managed identity authentication for Azure Functions queue triggers using the queue endpoint (where `module.storage` is an instance of the `azure_storage_account` module):

```hcl
app_settings = {
  AzureWebJobsStorage__accountName      = module.storage.name                   # Set the storage account name for Azure Functions
  AzureWebJobsStorage__queueServiceUri  = module.storage.primary_queue_endpoint # Set the queue service URI for Azure Functions to enable identity-based authentication
}
```

This enables identity-based connections without requiring connection strings, improving security for Azure Functions bindings.
