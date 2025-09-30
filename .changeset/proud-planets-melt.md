---
"azure_app_service": major
---

# Major Changes

1. Replace the `tier` variable with a new `use_case` variable for tiering configuration.
2. Add new variables `size` for sku override.

## Upgrade Notes

| Old Value | New Value        | Description                                       |
| --------- | ---------------- | ------------------------------------------------- |
| s         | _none_           | Does not exist anymore                            |
| m         | _none_           | Does not exist anymore                            |
| l         | default          | Ideal for `production` environments, use P1v3 SKU |
| xl        | high_load        | Ideal for `high_load` scenarios, use P2v3 SKU     |

This change simplifies and clarifies the selection of App Service.

To migrate to this new major version:

1. Update the module version to `~> 2.0` in your Terraform configuration.
2. Update your `module` configuration to use the new `use_case` variable instead of `tier`.
3. Optionally, configure the new `size` variable to create the desired SKU within the App Service.

For Example:

- **Before**

  ```hcl
  module "app_service" {
    source  = "pagopa-dx/azure-app-service/azurerm"
    version = "~> 1.0"
    tier    = "l"
    # ...other variables...
  }
  ```

- **After**

  ```hcl
  module "app_service" {
    source  = "pagopa-dx/azure-app-service/azurerm"
    version = "~> 2.0"
    use_case = "default"
    # ...other variables remain unchanged...
  }
  ```
