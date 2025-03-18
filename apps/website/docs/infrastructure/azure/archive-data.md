---
sidebar_label: Archiving Data for Decommissioned Projects
---

# Archiving Data for Decommissioned Projects

## Best practices for data archiving

When a project is decommissioned, it is important to strike a balance between
data retention for legal and auditing purposes and storage cost optimization.
Depending on the context and specific requirements, adopting low-cost storage
solutions can be considered while ensuring access to the necessary information
for potential future audits. This guide provides a comprehensive approach to
data archiving with a focus on Azure storage solutions.

## Recommended configuration for the destination storage account

The optimal storage solution balances flexibility, support, and
cost-effectiveness with the following characteristics:

- Use archive storage tier
- Disable internet access
- Enforce authentication via Entra ID (disable access keys)
- Implement legal hold policies
- Configure multi-AZ replication in the primary region
- Set up single-AZ replication in a secondary region
- Enable object replication between regions
- Apply read-only lock

### Sample Terraform configuration

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

:::note

- Manually set the `access_tier` to `Archive` via Azure Portal after backup
  completion
- Set `public_network_access_enabled` to `false` only after backup is complete

:::

### Secondary region options

You can choose from the following regions for secondary storage:

- Germany West Central (GWC)
- Spain Central (SPC)

## Migrating from Azure Cosmos DB

[Azure Cosmos DB Data Migration Tool (DMT)](https://github.com/AzureCosmosDB/data-migration-desktop-tool)
is a command-line tool that can be used to migrate data between Azure Cosmos DB
and other data sources.

Download the release zip file, and edit the `migrationsettings.json` according
to the desired operation:

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

Then, run the `dmt` executable file via CLI:

```sh
chmod +x ./dmt
./dmt
```

To restore data from the Azure Blob to Cosmos DB, modify the
`migrationsettings.json` inverting the source and sink settings:

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

## Migrating from another storage account

### Blob storage migration

The preferred method for migrating blobs between storage accounts is to use
Object Replication Policy.

It consists in an automatic asynchronous copy of all blobs in a Storage Account
container to another Storage Account. The target blob container becomes
read-only when the policy is enabled.

:::warning

You can't create cascading object replication policies on the same container.
For example, if there is already a policy replicating data from a container in
storage account A to a container in storage account B, you cannot create another
policy to replicate data from this container in storage account B to a container
in storage account C.

:::

#### Object replication configuration with Terraform

```hcl
resource "azurerm_storage_object_replication" "old_to_new" {
  source_storage_account_id      = azurerm_storage_account.old.id
  destination_storage_account_id = azurerm_storage_account.new.id

  rules {
    source_container_name      = azurerm_storage_container.old1.name
    destination_container_name = azurerm_storage_container.new1.name
    copy_blobs_created_after   = "Everything"
  }

  rules {
    source_container_name      = azurerm_storage_container.old2.name
    destination_container_name = azurerm_storage_container.new2.name
    copy_blobs_created_after   = "Everything"
  }
}
```

The property `copy_blobs_created_after` accepts either `Everything` or
`OnlyNew`:

- `Everything`: This value ensures that all blobs in the source container,
  regardless of their creation date, are copied to the destination container.
  Use this option when you want a complete replication of all existing blobs.
- `OnlyNew`: This value ensures that only blobs created after the replication
  policy is applied are copied to the destination container. Use this option
  when you only need to replicate new blobs created after a certain point in
  time. as values, but the former is advised as it ensures all blobs are copied.

### Table storage migration

1. For small Tables:

   - Use
     [Microsoft Azure Storage Explorer](https://azure.microsoft.com/en-us/products/storage/storage-explorer#Download-4)
   - Right-click source table and select `Copy`
   - Right-click `Tables` in destination storage account and select `Paste`

2. For large Tables we recommend using Azure Data Factory pipelines

## Best practices and recommendations

- Always implement access controls
- Use encryption at rest
- Regularly audit archived data
- Maintain a clear retention policy
- Consider compliance requirements specific to your industry

## Conclusion

Effective data archiving requires a strategic approach that balances data
preservation, security, and cost-efficiency. Regularly review and update your
archiving strategy to ensure it meets your organization's evolving needs.
