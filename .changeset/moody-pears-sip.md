---
"azure_storage_account": major
---

# Breaking Change

Replace the `tier` variable with a new `use_case` variable for tiering configuration. The previous values (`s`, `l`) have been replaced by five new options: `development` (formerly `s`), `default` (formerly `l`),  `audit`, `delegated_access` and `archive`. This change simplifies and clarifies the selection of Storage Account.

- The `audit` use case now requires Customer-Managed Key (BYOK) encryption to be enabled.
- For the `delegated_access` use case, `shared_access_key_enabled` is now set to false.
- Microsoft Defender for Storage (`advanced_threat_protection`) is now consistently enabled for use cases exposed to higher risks, such as `delegated_access`.

Add new variables for container, queue and tables creation.

## Migration Path

To migrate to this new major version:

1. Update the module version to `~> 2.0` in your Terraform configuration.
2. Update your `module` configuration to use the new `use_case` variable instead of `tier`. Check the README to choose correctly the best `use_case`, you can use `development` if you are using `s`, or `default` if `l`.
3. Optionally, configure the new `containers`, `queues`, and `tables` variables to create the desired resources within the Storage Account.
4. Refer to the README and module documentation for updated examples and guidance.

### Example

#### Before

```hcl
module "storage_account" {
  source  = "pagopa-dx/azure-storage-account/azurerm
  version = "~> 1.0"
  tier    = "l"
  # ...other variables...
}
```

#### After

```hcl
module "storage_account" {
  source  = "pagopa-dx/azure-storage-account/azurerm
  version = "~> 2.0"
  
  use_case = "default"

  containers = [
    {
      name        = "container1"
      access_type = "private"
    },
    {
      name        = "container2"
      access_type = "private"
    }
  ]

  tables = [
    "table1",
    "table2"
  ]

  queues = [
    "queue1",
    "queue2"
  ]

  # ...other variables remain unchanged...
}
```

### Note for already existing resources

If containers, queues, or tables were previously created manually or through other means, you need to import them into the new module state using the `terraform import` command to avoid recreation.

```bash
terraform import 'module.storage_account.azure_storage_container.this[N]' /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/myresourcegroup/providers/Microsoft.Storage/storageAccounts/myaccount/blobServices/default/containers/mycontainer
```

Choose the correct index `N` based on the order of your `containers`, `queues`, and `tables` lists.