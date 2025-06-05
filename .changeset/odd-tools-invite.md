---
"azure_storage_account": major
---

# BREAKING CHANGE

The breaking change introduces a new variable `use_case` to define the access tier for the storage account.

The change was made to improve clarity and flexibility in configuring storage account access tiers. By explicitly setting the use_case variable, consumers can better align their configurations with specific workload requirements.

To update your code, use an higher version and add the `use_case` variable to your module configuration instead of old one `access_tier`. Choose one of the following valid options:

- realtime → frequent access (Hot)
- analytics → infrequent access (Cool)
- archive → rare access, immediate retrieval (Cold)
- high_performance → SSD-based high-speed access (Premium)

Example:

```hcl
module "storage_account" {
  source  = "pagopa-dx/azure-storage-account/azurerm"
  version = "~> 2.0"

  # ...existing configuration...

  use_case = "realtime"

  # ...existing configuration...
}
```
