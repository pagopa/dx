# Using EventGrid with Storage Accounts and Azure Functions

This is a step-by-step guide to configure Blob Triggers in an Azure Function App
using EventGrid for efficient event-driven processing.

:::warning

Using EventGrid is **strongly recommended** when your storage account contains
**more than 10,000 blobs**. Blob triggers use polling which becomes inefficient
at scale.

:::

## Why EventGrid?

| Method       | Blob Trigger         | EventGrid                    |
| ------------ | -------------------- | ---------------------------- |
| **Delivery** | Polling (~10s delay) | Push (sub-second)            |
| **Scale**    | Slow for >10K blobs  | Instant                      |
| **Retries**  | Function-level only  | Built-in (24h) + dead-letter |
| **Latency**  | ~10s polling delay   | Sub-second push              |

**References:**

- [Azure Functions blob trigger docs](https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-storage-blob-trigger)
- [EventGrid overview](https://learn.microsoft.com/en-us/azure/event-grid/overview)
- [EventGrid retry policy](https://learn.microsoft.com/en-us/azure/event-grid/delivery-and-retry)

## Implementation Steps

### Step 1: Configure Dead Letter Storage

Create a storage account for EventGrid dead-letter messages:

```hcl
module "deadletter_storage" {
  source  = "pagopa-dx/azure-storage-account/azurerm"
  version = "~> 2.0"

  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "West Europe"
    domain          = "core"
    app_name        = "deadletter"
    instance_number = "01"
  }

  resource_group_name = azurerm_resource_group.main.name

  containers = [{
    name        = "eventgrid-deadletter"
    access_type = "private"
  }]
}
```

### Step 2: Configure RBAC Permissions

Grant the Function App permission to read blobs:

```hcl
module "function_storage_role" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 1.0"

  principal_id    = module.function_app.function_app.principal_id
  subscription_id = data.azurerm_subscription.current.subscription_id

  storage_blob = [{
    storage_account_name = module.storage_account.name
    resource_group_name  = azurerm_resource_group.main.name
    container_name       = "*"
    role                 = "reader"
    description          = "Allow function app to read blobs"
  }]
}
```

### Step 3: Create EventGrid Subscription

Configure EventGrid to trigger your Function App on blob events:

```hcl
resource "azurerm_eventgrid_event_subscription" "blob_events" {
  name  = "blob-processing-events"
  scope = module.storage_account.id

  azure_function_endpoint {
    function_id                       = "${module.function_app.function_app.id}/functions/onBlobEvent"
    max_events_per_batch              = 1
    preferred_batch_size_in_kilobytes = 64
  }

  included_event_types = ["Microsoft.Storage.BlobCreated"]

  subject_filter {
    subject_begins_with = "/blobServices/default/containers/uploads/"
    subject_ends_with   = ".json"
  }

  retry_policy {
    max_delivery_attempts = 30
    event_time_to_live    = 1440  # 24 hours
  }

  storage_blob_dead_letter_destination {
    storage_account_id          = module.deadletter_storage.id
    storage_blob_container_name = "eventgrid-deadletter"
  }
}
```

### Step 4: Configure Function Binding

Update your `function.json` to use EventGrid trigger:

```json
{
  "bindings": [
    {
      "type": "eventGridTrigger",
      "name": "eventGridEvent",
      "direction": "in"
    }
  ],
  "scriptFile": "../dist/main.js",
  "entryPoint": "onBlobEventEntryPoint"
}
```

### Step 5: Deploy and Test

1. **Deploy infrastructure**: `terraform apply`
2. **Deploy function code**: Deploy your Function App
3. **Test with sample blob**:
   ```bash
   az storage blob upload \
     --account-name <storage-account> \
     --container-name uploads \
     --name test.json \
     --file test.json
   ```
4. **Verify function execution**: Check Azure Portal for function logs

### Step 6: Monitor and Validate

Monitor the following metrics:

- **Latency**: EventGrid should deliver events in < 1s
- **Success rate**: Verify all events are processed successfully
- **Event count**: Ensure all blob creation events trigger the function
- **Dead-letter queue**: Monitor for failed events

## Complete Example

<details>
<summary>Click to expand full Terraform configuration</summary>

```hcl
module "storage_account" {
  source  = "pagopa-dx/azure-storage-account/azurerm"
  version = "~> 2.0"

  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "West Europe"
    domain          = "core"
    app_name        = "events"
    instance_number = "01"
  }

  resource_group_name = azurerm_resource_group.main.name

  containers = [
    { name = "uploads", access_type = "private" },
    { name = "archive", access_type = "private" }
  ]
}

module "function_app" {
  source  = "pagopa-dx/azure-function-app/azurerm"
  version = "~> 4.0"

  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "West Europe"
    domain          = "core"
    app_name        = "processor"
    instance_number = "01"
  }

  resource_group_name = azurerm_resource_group.main.name
  subnet_pep_id      = data.azurerm_subnet.pep.id

  virtual_network = {
    name                = "vnet-core"
    resource_group_name = "rg-network"
  }

  health_check_path = "/api/health"
  stack            = "node"
  node_version     = 20

  app_settings = {
    FUNCTIONS_WORKER_RUNTIME = "node"
    STORAGE_ACCOUNT_NAME     = module.storage_account.name
    UPLOADS_CONTAINER        = "uploads"
  }
}

module "deadletter_storage" {
  source  = "pagopa-dx/azure-storage-account/azurerm"
  version = "~> 2.0"

  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "West Europe"
    domain          = "core"
    app_name        = "deadletter"
    instance_number = "01"
  }

  resource_group_name = azurerm_resource_group.main.name

  containers = [{
    name        = "eventgrid-deadletter"
    access_type = "private"
  }]
}

module "function_storage_role" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 1.0"

  principal_id    = module.function_app.function_app.principal_id
  subscription_id = data.azurerm_subscription.current.subscription_id

  storage_blob = [{
    storage_account_name = module.storage_account.name
    resource_group_name  = azurerm_resource_group.main.name
    container_name       = "*"
    role                 = "reader"
    description          = "Allow function app to read/write blobs"
  }]
}

resource "azurerm_eventgrid_event_subscription" "blob_events" {
  name  = "blob-processing-events"
  scope = module.storage_account.id

  azure_function_endpoint {
    function_id                       = "${module.function_app.function_app.id}/functions/onBlobEvent"
    max_events_per_batch              = 1
    preferred_batch_size_in_kilobytes = 64
  }

  included_event_types = ["Microsoft.Storage.BlobCreated"]

  subject_filter {
    subject_begins_with = "/blobServices/default/containers/uploads/"
    subject_ends_with   = ".json"
  }

  retry_policy {
    max_delivery_attempts = 30
    event_time_to_live    = 1440
  }

  storage_blob_dead_letter_destination {
    storage_account_id          = module.deadletter_storage.id
    storage_blob_container_name = "eventgrid-deadletter"
  }
}
```

</details>

## Best Practices

- **Idempotency**: Handle duplicate events (EventGrid may deliver same event
  multiple times)
- **Error handling**: Let exceptions bubble up for EventGrid retry logic
- **Monitoring**: Track EventGrid delivery metrics and dead-letter queue
- **Filtering**: Use subject filters to reduce unnecessary invocations
- **Dead-letter monitoring**: Set up alerts when events land in dead-letter
  storage
