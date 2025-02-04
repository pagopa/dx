# Archiving Data from Decommissioned Projects

## Overview

When a project is decommissioned, it's crucial to maintain data for legal and auditing purposes while minimizing storage costs. This guide provides a comprehensive approach to data archiving with a focus on Azure storage solutions.

## Best Practices for Data Archiving

### Recommended Storage Account Configuration

The optimal storage solution balances flexibility, support, and cost-effectiveness with the following characteristics:

1. **Blob Storage Configuration**
   - Use Archive storage tier
   - Disable internet access
   - Enforce authentication via Entra ID (disable access keys)
   - Implement legal hold policies
   - Configure multi-AZ replication in the primary region
   - Set up single-AZ replication in a secondary region
   - Enable object replication between regions
   - Apply read-only lock

### Sample Terraform Configuration

```hcl
resource "azurerm_storage_account" "backup_primary" {
  name                = replace("${local.project}backupst01", "-", "")
  resource_group_name = azurerm_resource_group.rg_itn_01.name
  location            = local.location

  account_kind             = "StorageV2"
  account_tier             = "Standard"
  account_replication_type = "ZRS"
  access_tier              = "Cool"

  public_network_access_enabled = false

  shared_access_key_enabled       = false
  default_to_oauth_authentication = true

  blob_properties {
    versioning_enabled       = true
    change_feed_enabled      = true
    last_access_time_enabled = true

    delete_retention_policy {
      days = 7
    }

    restore_policy {
      days = 5
    }

    container_delete_retention_policy {
      days = 10
    }
  }
}
```

> **Note:** 
> - Manually set the `access_tier` to `Archive` via Azure Portal after backup completion
> - Set `public_network_access_enabled` to `false` only after backup is complete

### Secondary Region Options
- Germany West Central (GWC)
- Spain Central (SPC)

## Data Migration Strategies

### 1. Migrating from Cosmos DB

#### Tools
- [Azure Cosmos DB Data Migration Tool (DMT)](https://github.com/AzureCosmosDB/data-migration-desktop-tool)

#### Sample Migration Configuration (Cosmos DB to Blob Storage)

```json
{
  "Source": "Cosmos-nosql",
  "Sink": "Json-AzureBlob",
  "SourceSettings": {
    "ConnectionString": "<cosmos-connection-string>",
    "Database": "<cosmos-database-name>",
    "Container": "<cosmos-container-name>",
    "IncludeMetadataFields": true
  },
  "SinkSettings": {
    "AccountEndpoint": "https://<storage-account-name>.blob.core.windows.net",
    "ContainerName": "cosmosdb",
    "BlobName": "<cosmos-container-name>",
    "UseRbacAuth": true
  }
}
```

#### Restore Configuration (Blob Storage to Cosmos DB)

```json
{
  "Source": "Json-AzureBlob",
  "Sink": "Cosmos-nosql",
  "SourceSettings": {
    "AccountEndpoint": "https://<storage-account-name>.blob.core.windows.net",
    "ContainerName": "cosmosdb",
    "BlobName": "<cosmos-container-name>",
    "UseRbacAuth": true
  },
  "SinkSettings": {
    "ConnectionString": "<cosmos-connection-string>",
    "Database": "<cosmos-database-name>",
    "Container": "<cosmos-container-name>",
    "PartitionKeyPath": "/id"
  }
}
```

### 2. Migrating from Another Storage Account

#### Blob Storage Migration
- Preferred Method: Object Replication

> **Caution:** Cannot create cascading object replication policies on the same containers

##### Terraform Object Replication Configuration

```hcl
resource "azurerm_storage_object_replication" "old_to_new" {
  source_storage_account_id      = azurerm_storage_account.old.id
  destination_storage_account_id = azurerm_storage_account.new.id

  rules {
    source_container_name      = azurerm_storage_container.old1.name
    destination_container_name = azurerm_storage_container.new1.name
    copy_blobs_created_after   = "Everything"
  }
}
```

#### Table Storage Migration

1. **Small Tables:**
   - Use [Microsoft Azure Storage Explorer](https://azure.microsoft.com/en-us/products/storage/storage-explorer#Download-4)
   - Right-click source table and select `Copy`
   - Right-click `Tables` in destination storage account and select `Paste`

2. **Large Tables:**
   - Recommended: Azure Data Factory pipeline

## Best Practices and Recommendations

- Always implement access controls
- Use encryption at rest
- Regularly audit archived data
- Maintain a clear retention policy
- Consider compliance requirements specific to your industry

## Conclusion

Effective data archiving requires a strategic approach that balances data preservation, security, and cost-efficiency. Regularly review and update your archiving strategy to ensure it meets your organization's evolving needs.
