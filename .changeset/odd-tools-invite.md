---
"azure_storage_account": minor
---

# MINOR CHANGE

The minor change introduces new values for the variable `access_tier` inside the Storage Account module.

The change was made to improve clarity and flexibility in configuring storage account access tiers. In this way consumers can better align their configurations with specific workload requirements.

To update your code, use an higher version and update `access_tier` variable to your module configuration. Choose one of the following valid options:

access_tier | Description | Backed Tier | Example use cases
-- | -- | -- | --
frequent | Frequent access | Hot | Data for web/mobile apps, real-time logs, actively used production files.
infrequent | Infrequent access | Cool | Short-term backups, Disaster Recovery, less frequently accessed logs, compliance data
rare | Rare access, immediate retrieval | Cold | Long-term backups, historical/audit data, inactive document archives
performance | SSD-backed, high-speed access | Premium | File shares for high-performance apps, search indexes, latency-critical databases

Example:

```hcl
module "storage_account" {
  source  = "pagopa-dx/azure-storage-account/azurerm"
  version = "~> 1.1"

  # ...existing configuration...

  access_tier = "frequent"

  # ...existing configuration...
}
```
