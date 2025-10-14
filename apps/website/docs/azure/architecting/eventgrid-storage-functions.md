# Event-driven architectures with Function App and Storage Account

Replace inefficient polling patterns with EventGrid to create responsive,
scalable Azure Function Apps that react to Storage Account events.

## The Problem with Polling

Traditional polling approaches waste resources and introduce latency:

```javascript
// ❌ Inefficient polling pattern
setInterval(async () => {
  const newFiles = await checkForNewBlobs();
  if (newFiles.length > 0) {
    await processFiles(newFiles);
  }
}, 30000); // Check every 30 seconds
```

## EventGrid Solution

EventGrid delivers events in real-time with automatic retries and
dead-lettering:

```javascript
// ✅ Event-driven pattern
module.exports = async function (context, eventGridEvent) {
  const { subject, data } = eventGridEvent;

  if (data.api === "PutBlob") {
    await processNewBlob(data.url);
  }
};
```

## Implementation Steps

### 1. Terraform Infrastructure

Configure EventGrid subscription with Terraform:

````hcl
resource "azurerm_eventgrid_event_subscription" "storage_events" {
  name  = "blob-events"
  scope = module.storage_account.id

  azure_function_endpoint {
    function_id = "${module.function_app.function_app.id}/functions/${var.function_name}"
  }

  included_event_types = [
    "Microsoft.Storage.BlobCreated",
    "Microsoft.Storage.BlobDeleted"
  ]

  retry_policy {
    max_delivery_attempts = 30
    event_time_to_live    = 1440
  }

  dead_letter_identity {
    type = "SystemAssigned"
  }

  storage_blob_dead_letter_destination {
    storage_account_id          = azurerm_storage_account.deadletter.id
    storage_blob_container_name = azurerm_storage_container.deadletter.name
  }
}

### 2. Function App Configuration

Create an EventGrid-triggered function:

```json
{
  "bindings": [
    {
      "type": "eventGridTrigger",
      "name": "eventGridEvent",
      "direction": "in"
    }
  ]
}
````

### 3. Event Processing Logic

Handle different event types efficiently:

```javascript
module.exports = async function (context, eventGridEvent) {
  const { eventType, subject, data } = eventGridEvent;

  switch (eventType) {
    case "Microsoft.Storage.BlobCreated":
      await handleBlobCreated(data);
      break;
    case "Microsoft.Storage.BlobDeleted":
      await handleBlobDeleted(data);
      break;
  }
};

async function handleBlobCreated(data) {
  const blobUrl = data.url;
  const contentType = data.contentType;

  // Process based on file type
  if (contentType.startsWith("image/")) {
    await processImage(blobUrl);
  } else if (contentType === "application/json") {
    await processJsonFile(blobUrl);
  }
}
```

## Event Filtering

Filter events at the subscription level to reduce noise:

```hcl
resource "azurerm_eventgrid_event_subscription" "filtered_events" {
  name  = "image-events"
  scope = module.storage_account.id

  azure_function_endpoint {
    function_id = "${module.function_app.function_app.id}/functions/processImages"
  }

  included_event_types = ["Microsoft.Storage.BlobCreated"]

  advanced_filter {
    string_ends_with {
      key    = "data.url"
      values = [".jpg", ".png", ".gif"]
    }
  }

  advanced_filter {
    string_contains {
      key    = "subject"
      values = ["/images/"]
    }
  }
}
```

## Error Handling

Implement robust error handling with dead-lettering:

```javascript
module.exports = async function (context, eventGridEvent) {
  try {
    await processEvent(eventGridEvent);
  } catch (error) {
    context.log.error("Processing failed:", error);

    // EventGrid will retry automatically
    // After max retries, event goes to dead letter queue
    throw error;
  }
};
```

## Benefits

- **Real-time processing**: Events trigger immediately when blobs are
  created/modified
- **Cost efficient**: No continuous polling overhead
- **Scalable**: EventGrid handles millions of events per second
- **Reliable**: Built-in retry logic and dead-lettering
- **Filtered**: Process only relevant events

## Common Patterns

### Image Processing Pipeline

```javascript
module.exports = async function (context, eventGridEvent) {
  const { data } = eventGridEvent;

  if (data.contentType.startsWith("image/")) {
    const blobName = getBlobNameFromUrl(data.url);

    // Generate thumbnail
    await generateThumbnail(blobName);

    // Extract metadata
    await extractImageMetadata(blobName);

    // Update database
    await updateImageCatalog(blobName, data);
  }
};
```

### Document Processing

```javascript
module.exports = async function (context, eventGridEvent) {
  const { data } = eventGridEvent;

  if (data.url.endsWith(".pdf")) {
    // Extract text content
    const text = await extractPdfText(data.url);

    // Index for search
    await indexDocument(data.url, text);

    // Notify completion
    await sendProcessingNotification(data.url);
  }
};
```

## RBAC Permissions

Function App needs specific permissions to access Storage Account blobs:

```hcl
# Grant Storage Blob Data Reader for read access
resource "azurerm_role_assignment" "function_storage_reader" {
  scope                = module.storage_account.id
  role_definition_name = "Storage Blob Data Reader"
  principal_id         = module.function_app.function_app.principal_id
}

# Grant Storage Blob Data Contributor for read/write access
resource "azurerm_role_assignment" "function_storage_contributor" {
  scope                = module.storage_account.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = module.function_app.function_app.principal_id
}
```

**Note:** The PagoPA DX Function App module automatically configures managed identity, so you only need to assign the appropriate storage permissions.

## Complete Terraform Example

```hcl
# Storage Account using PagoPA DX module
module "storage_account" {
  source = "pagopa-dx/azure-storage-account/azurerm"
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
    }
  ]

  tags = {
    Environment = "development"
    Project     = "event-processing"
  }
}

# Function App using PagoPA DX module
module "function_app" {
  source = "pagopa-dx/azure-function-app/azurerm"
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
  }

  tags = {
    Environment = "development"
    Project     = "event-processing"
  }
}

# RBAC permissions for blob access
resource "azurerm_role_assignment" "function_storage_access" {
  scope                = module.storage_account.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = module.function_app.function_app.principal_id
}

# EventGrid Event Subscription
resource "azurerm_eventgrid_event_subscription" "blob_events" {
  name  = "blob-processing-events"
  scope = module.storage_account.id

  azure_function_endpoint {
    function_id                       = "${module.function_app.function_app.id}/functions/processBlobEvent"
    max_events_per_batch              = 1
    preferred_batch_size_in_kilobytes = 64
  }

  included_event_types = [
    "Microsoft.Storage.BlobCreated",
    "Microsoft.Storage.BlobDeleted"
  ]

  retry_policy {
    max_delivery_attempts = 30
    event_time_to_live    = 1440
  }
}
```

## Best Practices

- **Idempotency**: Handle duplicate events gracefully
- **Filtering**: Use subject and data filters to reduce unnecessary invocations
- **Batching**: Process multiple events together when possible
- **Monitoring**: Track processing metrics and error rates
- **Dead lettering**: Configure dead letter destinations for failed events
- **Infrastructure as Code**: Use Terraform for consistent deployments
