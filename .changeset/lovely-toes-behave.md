---
"azure_api_management": major
---

This is a **major breaking change**. New `custom_domains` variable structure, fix `autoscale` configuration, and added dependency on NSG resource.

## Upgrade Notes

### 1. Custom Domains Variable Structure

The `custom_domains` variable has been completely redesigned from a flat list to a structured object for better ergonomics and type safety.

**Before:**

```terraform
hostname_configuration = {
    proxy = [
      {
        default_ssl_binding = false
        host_name           = "api.example.com"
        key_vault_id        = null
      },
      {
        default_ssl_binding = true
        host_name           = "api2.example.com"
        key_vault_id = "https://..."
      },
      {
        default_ssl_binding = false
        host_name           = "api3.example.com"
        key_vault_id = "https://..."
      },
    ]
    developer_portal = null
    management       = null
    portal           = null
  }
```

**After:**

```terraform
custom_domains = {
  proxy = [
    {
      host_name                = "api.example.com"
      key_vault_certificate_id = "https://..."
      default_ssl_binding      = true
    }
  ]
  management = [
    {
      host_name                = "mgmt.example.com"
      key_vault_certificate_id = "https://..."
    }
  ]
  # Other optional types: management, portal, developer_portal, scm
}
```

**Benefits:**

- new variable name `custom_domains` better reflects its purpose
- `key_vault_id` now is renamed to `key_vault_certificate_id` for clarity, as terraform documentation, refers to Key Vault Secret that contain Certificate.
- optional domain types can be omitted if not used
- `default_ssl_binding` for proxy is only specified when needed

### 2. Autoscale Configuration

The `autoscale` variable is now nullable with smart zone-aware defaults.
This fixes the problem when `use_case` is set to `high_load` without the `autoscale` variable set, which previously returned an error due to non-multiple values.

**Changes:**

- Default changed from a static object to `null`
- When `null`, defaults are automatically calculated based on the number of availability zones
- For `high_load` use case (2 zones): all values are multiples of 2
- For `cost_optimized`/`development` use cases (no zones): values remain as 1

### 3. NSG Dependency

Added explicit `depends_on` relationship between APIM and NSG to prevent parallelism errors during apply operations.

## Migration Guide

### Migrating Custom Domains

1. Find `hostname_configuration` block in your module calls
2. Rename it to `custom_domains`
3. Rename `key_vault_id` to `key_vault_certificate_id`
4. Remove all domain types that are not used (e.g., `developer_portal`, `portal`, `scm`)

## Note

With this major change, all custom domain types are now configurable. Previously, only `proxy` was configurable.
