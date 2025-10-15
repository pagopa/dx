# Migrating from Blob Trigger to EventGrid

Step-by-step guide to migrate Azure Function Apps from blob triggers to
EventGrid.

:::warning[When to Migrate] EventGrid is **strongly recommended** when your
storage account contains **more than 10,000 blobs**. Blob triggers use polling
which becomes inefficient at scale. :::

## Why EventGrid?

| Aspect       | Blob Trigger         | EventGrid                    |
| ------------ | -------------------- | ---------------------------- |
| **Delivery** | Polling (~10s delay) | Push (sub-second)            |
| **Scale**    | Slow for >10K blobs  | Instant                      |
| **Retries**  | Function-level only  | Built-in (24h) + dead-letter |
| **Latency**  | ~10s polling delay   | Sub-second push              |

**References:**

- [Azure Functions blob trigger docs](https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-storage-blob-trigger)
- [EventGrid overview](https://learn.microsoft.com/en-us/azure/event-grid/overview)
- [EventGrid retry policy](https://learn.microsoft.com/en-us/azure/event-grid/delivery-and-retry)

## Migration Steps

### Step 1: Add Dependencies

Update `package.json`:

```json
{
  "dependencies": {
    "@azure/storage-blob": "^12.0.0",
    "@azure/identity": "^4.0.0"
  }
}
```

### Step 2: Update Function Code

import Tabs from '@theme/Tabs'; import TabItem from '@theme/TabItem';

<Tabs>
<TabItem value="before" label="Before (Blob Trigger)">

```typescript
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";

export const onBlobChangeEntryPoint = pipe(
  onBlobChangeHandler(),
  parseBlob,
  toAzureFunctionHandler,
);

const parseBlob = ({ inputs }) =>
  pipe(
    inputs[0] as Buffer, // Blob content received directly
    (blob) => blob.toString("utf-8"),
    parseJson,
    TE.fromEither,
    TE.chainW((decodedItem) => processItem(decodedItem)),
  );
```

</TabItem>
<TabItem value="after" label="After (EventGrid)">

```typescript
import { BlobServiceClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";
import * as TE from "fp-ts/lib/TaskEither";
import * as E from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";

export const onBlobEventEntryPoint = pipe(
  onBlobEventHandler(),
  parseEventGridEvent,
  toAzureFunctionHandler,
);

const parseEventGridEvent = ({ inputs }) =>
  pipe(
    inputs[0] as EventGridEvent, // Event metadata only
    extractBlobInfo,
    TE.fromEither,
    TE.chainW(fetchAndProcessBlob),
  );

const extractBlobInfo = (event: EventGridEvent) =>
  E.tryCatch(
    () => ({
      containerName: event.subject.split("/")[6],
      blobName: event.subject.split("/").slice(8).join("/"),
    }),
    (e) => new Error(`Failed to extract blob info: ${e}`),
  );

const fetchAndProcessBlob = (blobInfo: BlobInfo) =>
  pipe(
    TE.tryCatch(
      async () => {
        const credential = new DefaultAzureCredential();
        const blobServiceClient = new BlobServiceClient(
          `https://${process.env.STORAGE_ACCOUNT_NAME}.blob.core.windows.net`,
          credential,
        );
        const blobClient = blobServiceClient
          .getContainerClient(blobInfo.containerName)
          .getBlobClient(blobInfo.blobName);

        const downloadResponse = await blobClient.download();
        const content = await streamToString(
          downloadResponse.readableStreamBody,
        );
        return JSON.parse(content);
      },
      (e) => new Error(`Failed to fetch blob: ${e}`),
    ),
    TE.chainW(processItem),
  );

const streamToString = async (
  stream: NodeJS.ReadableStream,
): Promise<string> => {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf-8");
};
```

**Key changes:**

- EventGrid provides event metadata, not blob content
- Must fetch blob using Azure Storage SDK with managed identity
- Use `DefaultAzureCredential` for RBAC authentication

</TabItem>
</Tabs>

### Step 3: Update function.json

<Tabs>
<TabItem value="before" label="Before (Blob Trigger)">

```json
{
  "bindings": [
    {
      "name": "blobContent",
      "type": "blobTrigger",
      "direction": "in",
      "path": "%CONTAINER_NAME%/{name}",
      "connection": "STORAGE_CONNECTION_STRING"
    }
  ],
  "scriptFile": "../dist/main.js",
  "entryPoint": "onBlobChangeEntryPoint"
}
```

</TabItem>
<TabItem value="after" label="After (EventGrid)">

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

</TabItem>
</Tabs>

### Step 4: Add Dead Letter Storage (Terraform)

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

### Step 5: Add RBAC Permissions (Terraform)

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

### Step 6: Add EventGrid Subscription (Terraform)

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

### Step 7: Deploy and Test

1. **Deploy infrastructure**: `terraform apply`
2. **Deploy function code**: Deploy your updated function app
3. **Test with sample blob**:
   ```bash
   az storage blob upload \
     --account-name <storage-account> \
     --container-name uploads \
     --name test.json \
     --file test.json
   ```
4. **Verify function execution**: Check Azure Portal for function logs

### Step 8: Monitor and Validate

Compare metrics between old and new implementation:

- **Latency**: EventGrid should be < 1s
- **Success rate**: Should match blob trigger
- **Event count**: Verify all events are processed

### Step 9: Remove Blob Trigger

Once validated:

1. Remove blob trigger function.json
2. Remove blob trigger code
3. Deploy final version

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
    role                 = "Storage Blob Data Contributor"
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

## Rollback Plan

If issues arise:

1. **Comment out EventGrid subscription** in Terraform
2. **Restore blob trigger function.json** from version control
3. **Deploy previous function version**
4. **Run** `terraform apply` to remove EventGrid subscription

## Best Practices

- **Idempotency**: Handle duplicate events (EventGrid may deliver same event
  multiple times)
- **Error handling**: Let exceptions bubble up for EventGrid retry logic
- **Monitoring**: Track EventGrid delivery metrics and dead-letter queue
- **Filtering**: Use subject filters to reduce unnecessary invocations
- **Dead-letter monitoring**: Set up alerts when events land in dead-letter
  storage
