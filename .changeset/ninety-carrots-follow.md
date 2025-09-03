---
"azure_postgres_server": major
---

# Major Changes

1. Replaced the `tier` variable with a new `use_case` variable for tiering configuration.
2. Add new variables for replica:

    - `create_replica`: Set to `true` by default, this determines whether or not to create a replica.
    - `replica_location`: optional value used to specify a different location for the replica (default on `spaincentral`)

3. Removed metrics block from azurerm_monitor_diagnostic_setting for deprecation .

## Upgrade Notes

| Old Value | New Value | Description                                  |
|-----------|-----------|----------------------------------------------|
| s         | *none*    | Now don't exist purposess                    |
| m         | default   | Ideal for `production` environments purposes |
| l         | *none*    | Now don't exist workloads                    |

This change simplifies and clarifies the selection of Postgres Server tiers.

For Example:

- **Before**

  ```hcl
  module "postgres" {
    source  = "pagopa-dx/azure-postgres-server/azurerm
    version = "~> 1.0"

    tier    = "m"
    
    # ...other variables...
  }
  ```

- **After**

  ```hcl
  module "postgres" {
    source  = "pagopa-dx/azure-postgres-server/azurerm
    version = "~> 2.0"
    
    use_case = "default"

    # ...other variables remain unchanged...
  }
  ```
