---
"azure_service_bus_namespace": patch
---
# Patch Changes

1. Replace the `tier` variable with a new `use_case` variable for tiering configuration.

2. Some variables with tier dependencies have been updated with new validation rules to ensure they are only used when appropriate (`subnet_pep_id`, `private_dns_zone_resource_group_name`, `allowed_ips`).

## Upgrade Notes

| Old Value | New Value | Description                                  |
|-----------|-----------|----------------------------------------------|
| m         | default   | Ideal for `production` environments purposes |
| l         | *none*    | Now don't exist                              |

This change simplifies and clarifies the selection of Service Bus namespace.

For Example:

- **Before**

  ```hcl
  module "service_bus" {
    source  = "pagopa-dx/azure-service-bus-namespace/azurerm
    version = "~> 0.0"

    tier    = "m"
    
    # ...other variables...
  }
  ```

- **After**

  ```hcl
  module "service_bus" {
    source  = "pagopa-dx/azure-service-bus-namespace/azurerm
    version = "~> 0.0"
    
    use_case = "default"

    # ...other variables remain unchanged...
  }
  ```
