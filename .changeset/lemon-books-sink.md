---
"azure_function_app": major
---

# Major Changes

1. Replace the `tier` variable with a new `use_case` variable for tiering configuration.
2. Add new variables `size` for sku override.
3. Added README documentation.

## Upgrade Notes

| Old Value | New Value        | Description                         |
| --------- | ---------------- | ----------------------------------- |
| s         | _none_           | Does not exist anymore              |
| m         | _none_           | Does not exist anymore              |
| l         | default          | Ideal for `production` environments |
| xl        | high_load        | Ideal for `high_load` scenarios     |
| xxl       | _none_           | Does not exist anymore              |

This change simplifies and clarifies the selection of Function App.

To migrate to this new major version:

1. Update the module version to `~> 4.0` in your Terraform configuration.
2. Update your `module` configuration to use the new `use_case` variable instead of `tier`.
3. Optionally, configure the new `size` variable to create the desired SKU within the Function App.

For Example:

- **Before**

  ```hcl
  module "function_app" {
    source  = "pagopa-dx/azure-function-app/azurerm"
    version = "~> 3.0"
    tier    = "l"
    # ...other variables...
  }
  ```

- **After**

  ```hcl
  module "function_app" {
    source  = "pagopa-dx/azure-function-app/azurerm"
    version = "~> 4.0"
    use_case = "default"
    # ...other variables remain unchanged...
  }
  ```
