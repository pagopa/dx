---
"azure_container_app": major
---


# Major Changes

1. Replace the `tier` variable with a new `use_case` variable for tiering configuration.
2. Add new variables `size` for cpu/memory override.
3. Added README documentation.

## Upgrade Notes

| Old Value | New Value        | Description                         |
| --------- | ---------------- | ----------------------------------- |
| xs        | _none_           | Does not exist anymore              |
| s         | _none_           | Does not exist anymore              |
| m         | default          | Ideal for `production` environments |
| l         | _none_           | Does not exist anymore              |

This change simplifies and clarifies the selection of Container App.

To migrate to this new major version:

1. Update the module version to `~> 4.0` in your Terraform configuration.
2. Update your `module` configuration to use the new `use_case` variable instead of `tier`.
3. Optionally, configure the new `size` variable to use the desired CPU/Memory configuration within the Container App.

For Example:

- **Before**

  ```hcl
  module "container_app" {
    source  = "pagopa-dx/azure-container-app/azurerm"
    version = "~> 3.0"
    tier    = "m"
    # ...other variables...
  }
  ```

- **After**

  ```hcl
  module "container_app" {
    source  = "pagopa-dx/azure-container-app/azurerm"
    version = "~> 4.0"
    use_case = "default"
    # ...other variables remain unchanged...
  }
  ```
