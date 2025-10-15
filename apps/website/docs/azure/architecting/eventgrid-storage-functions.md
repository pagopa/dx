# Migrating from Blob Trigger to EventGrid

Upgrade your Azure Function Apps from polling-based blob triggers to push-based EventGrid for better performance, reliability, and scalability.

## Why Migrate?

### Blob Trigger Limitations

- **Polling-based**: Checks for new blobs every ~10 seconds, causing latency
- **Missed events**: Can miss events under high load
- **Limited filtering**: Only path patterns supported
- **Slow scaling**: Takes time to scale for large containers
- **No guarantees**: No built-in retry or dead-lettering

### EventGrid Benefits

- **Push-based**: Sub-second event delivery
- **Guaranteed delivery**: Built-in retries with exponential backoff
- **Advanced filtering**: Filter by subject, data fields, and more
- **Dead-lettering**: Failed events go to dead-letter queue
- **High throughput**: Handles millions of events per second
- **Better scaling**: Instant response to event volume

## Migration Steps

### Step 1: Update function.json

Change the trigger type from `blobTrigger` to `eventGridTrigger`:

```json
// BEFORE: Blob Trigger
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

// AFTER: EventGrid Trigger
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

**Key changes:**
- Remove `path` and `connection` (EventGrid handles routing)
- Change `type` from `blobTrigger` to `eventGridTrigger`
- Rename binding parameter (e.g., `blobContent` → `eventGridEvent`)

### Step 2: Update Function Code

Adapt your handler to process EventGrid events instead of blob content:

```typescript
import { BlobServiceClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";
import * as TE from "fp-ts/lib/TaskEither";
import * as E from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";

// BEFORE: Blob Trigger - receives blob content directly
export const onBlobChangeEntryPoint = pipe(
  onBlobChangeHandler(),
  parseBlob,
  toAzureFunctionHandler,
);

const parseBlob = ({ inputs }) =>
  pipe(
    inputs[0] as Buffer,
    (blob) => blob.toString("utf-8"),
    parseJson,
    TE.fromEither,
    TE.chainW((decodedItem) => processItem(decodedItem)),
  );

// AFTER: EventGrid - receives event metadata, must fetch blob
export const onBlobEventEntryPoint = pipe(
  onBlobEventHandler(),
  parseEventGridEvent,
  toAzureFunctionHandler,
);

const parseEventGridEvent = ({ inputs }) =>
  pipe(
    inputs[0] as EventGridEvent,
    extractBlobInfo,
    TE.fromEither,
    TE.chainW(fetchAndProcessBlob),
  );

const extractBlobInfo = (event: EventGridEvent) =>
  E.tryCatch(
    () => ({
      url: event.data.url,
      containerName: event.subject.split('/')[6],
      blobName: event.subject.split('/').slice(8).join('/'),
      contentType: event.data.contentType,
    }),
    (e) => new Error(`Failed to extract blob info: ${e}`),
  );

const fetchAndProcessBlob = (blobInfo: BlobInfo) =>
  pipe(
    TE.tryCatch(
      async () => {
        // Use DefaultAzureCredential for managed identity
        const credential = new DefaultAzureCredential();
        const blobServiceClient = new BlobServiceClient(
          `https://${process.env.STORAGE_ACCOUNT_NAME}.blob.core.windows.net`,
          credential,
        );
        const containerClient = blobServiceClient.getContainerClient(blobInfo.containerName);
        const blobClient = containerClient.getBlobClient(blobInfo.blobName);
        
        const downloadResponse = await blobClient.download();
        const content = await streamToString(downloadResponse.readableStreamBody);
        return JSON.parse(content);
      },
      (e) => new Error(`Failed to fetch blob: ${e}`),
    ),
    TE.chainW(processItem),
  );

const streamToString = async (stream: NodeJS.ReadableStream): Promise<string> => {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf-8');
};
```

**Key changes:**
- EventGrid provides event metadata, not blob content
- Must fetch blob using Azure Storage SDK with managed identity
- Extract blob info from event subject and data
- Use `DefaultAzureCredential` for RBAC authentication

### Step 3: Add EventGrid Subscription

Create the EventGrid subscription in Terraform:

```hcl
resource "azurerm_eventgrid_event_subscription" "blob_events" {
  name  = "blob-processing-events"
  scope = module.storage_account.id

  azure_function_endpoint {
    function_id                       = "${module.function_app.function_app.id}/functions/onBlobEvent"
    max_events_per_batch              = 1
    preferred_batch_size_in_kilobytes = 64
  }

  included_event_types = [
    "Microsoft.Storage.BlobCreated",
  ]

  # Filter by container and file type
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

### Step 4: Add Dead Letter Storage

Create a storage account for failed events:

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
  
  containers = [
    {
      name        = "eventgrid-deadletter"
      access_type = "private"
    }
  ]
}
```

### Step 5: Update Dependencies

Add Azure Storage SDK and Identity library to your package.json:

```json
{
  "dependencies": {
    "@azure/storage-blob": "^12.0.0",
    "@azure/identity": "^4.0.0"
  }
}
```

## Testing the Migration

### 1. Deploy Both Triggers

Initially run both blob trigger and EventGrid in parallel:

```hcl
# Keep existing blob trigger function
# Add new EventGrid function with different name
resource "azurerm_eventgrid_event_subscription" "blob_events" {
  # ...
  azure_function_endpoint {
    function_id = "${module.function_app.function_app.id}/functions/onBlobEventNew"
  }
}
```

### 2. Monitor Both Functions

Compare metrics:
- Latency (EventGrid should be < 1s)
- Success rate (should be equal)
- Event count (should match)

### 3. Validate EventGrid

Upload test blobs and verify:
```bash
az storage blob upload \
  --account-name <storage-account> \
  --container-name uploads \
  --name test.json \
  --file test.json
```

Check both functions processed the blob.

### 4. Remove Blob Trigger

Once validated, remove the blob trigger function and rename EventGrid function.

## Key Differences

| Aspect | Blob Trigger | EventGrid |
|--------|-------------|----------|
| **Delivery** | Polling (~10s delay) | Push (sub-second) |
| **Input** | Blob content directly | Event metadata only |
| **Fetch blob** | Automatic | Manual (Azure SDK) |
| **Filtering** | Path patterns | Advanced (subject, data) |
| **Retries** | Function-level | Built-in + dead-letter |
| **Scale** | Slow for large containers | Instant |
| **Cost** | Lower for low volume | Better for high volume |
| **Missed events** | Possible under load | Guaranteed delivery |

## Complete Migration Example

```hcl
# Storage Account using PagoPA DX module
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
    {
      name        = "uploads"
      access_type = "private"
    },
    {
      name        = "archive"
      access_type = "private"
    }
  ]

  tags = {
    Environment = "development"
    Project     = "blob-processing"
  }
}

# Function App using PagoPA DX module
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
    ARCHIVE_CONTAINER        = "archive"
  }

  tags = {
    Environment = "development"
    Project     = "blob-processing"
  }
}

# RBAC permissions for blob access
resource "azurerm_role_assignment" "function_storage_access" {
  scope                = module.storage_account.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = module.function_app.function_app.principal_id
}
```

## Rollback Plan

If issues arise, revert to blob trigger:

```hcl
# Comment out EventGrid subscription
# resource "azurerm_eventgrid_event_subscription" "blob_events" { ... }

# Restore blob trigger function.json
# Deploy previous version
```

## When to Use Each

**Use Blob Trigger when:**
- Low to medium volume (< 100 blobs/minute)
- Simple path-based filtering is sufficient
- You need the blob content immediately
- Cost optimization is critical

**Use EventGrid when:**
- High volume (> 100 blobs/minute)
- Need sub-second latency
- Require advanced filtering
- Need guaranteed delivery with dead-lettering
- Processing large blobs (fetch on-demand)

## RBAC Permissions

Grant the Function App managed identity access to the storage account:

```hcl
# Required for reading blobs
resource "azurerm_role_assignment" "function_storage_reader" {
  scope                = module.storage_account.id
  role_definition_name = "Storage Blob Data Reader"
  principal_id         = module.function_app.function_app.principal_id
}

# Or use Contributor for read/write access
resource "azurerm_role_assignment" "function_storage_contributor" {
  scope                = module.storage_account.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = module.function_app.function_app.principal_id
}
```

**Note:** The PagoPA DX Function App module automatically enables system-assigned managed identity.

## Best Practices

- **RBAC over connection strings**: Use managed identity for secure, credential-free authentication
- **Idempotency**: Handle duplicate events (EventGrid may deliver same event multiple times)
- **Error handling**: Let exceptions bubble up for EventGrid retry logic
- **Monitoring**: Track EventGrid delivery metrics and dead-letter queue
- **Filtering**: Use subject filters to reduce unnecessary function invocations
- **Dead-lettering**: Monitor and process failed events from dead-letter queue
- **Credential caching**: Reuse `DefaultAzureCredential` and `BlobServiceClient` instances
