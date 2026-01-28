---
"azure_api_management": minor
---

This is a **Minor change**. New `hostname_configuration` variable structure, fix `autoscale` configuration, update public network definition, and added dependency on NSG resource.

## Upgrade Notes

### 1. Custom Domains Variable Structure

The `hostname_configuration` variable has been redesigned from a flat list to a structured object for better ergonomics and type safety.

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
hostname_configuration = {
  proxy = [
    {
      host_name                = "api.example.com"
      key_vault_id             = "https://..."
      default_ssl_binding      = true
    }
  ]
  management = [
    {
      host_name                = "mgmt.example.com"
      key_vault_id             = "https://..."
    }
  ]
  # Other optional types: portal, developer_portal, scm
}
```

**Benefits:**

- Optional endpoint types can be omitted entirely or set to empty lists `[]` if not used
- `default_ssl_binding` for proxy is only specified when needed

### 2. Autoscale Configuration

The `autoscale` variable is now nullable with smart zone-aware defaults.
This fixes the problem when `use_case` is set to `high_load` without the `autoscale` variable set, which previously returned an error due to non-multiple values.

**Changes:**

- `enabled` field does not exist anymore, autoscale is defined by `use_case` (this change is backward compatible as the field was ignored)
- Default changed from a static object to `null`
- All fields inside `autoscale` are now optional so you can now specify only the fields you want to customize
- When `null`, defaults are automatically calculated based on the number of availability zones
- For `high_load` use case (2 zones): all values are multiples of 2
- For `cost_optimized`/`development` use cases (no zones): values remain as 1

### 3. NSG Dependency

Added explicit `depends_on` relationship between APIM and NSG to prevent parallelism errors during apply operations.

### 4. Public Network Access Default

The default value for `public_network_access_enabled` has been set to `true` and is not changed by the `use_case` variable anymore.

## Migration Guide (Optional)

### Migrating Custom Domains

1. Find `hostname_configuration` block in your module calls
2. Remove all endpoint types that are set to `null` or use empty lists `[]` instead
3. Existing configurations with explicit `null` values remain compatible

### Migrating Autoscale Configuration

1. Find `autoscale` block in your module calls
2. Remove the `enabled` field
3. If you have custom values, keep them as is
4. If you were relying on defaults, simply remove the entire `autoscale` block or only keep the fields you want to customize

## Notes

- With this change, all custom domain types are now configurable. Previously, only `proxy` was configurable.
- The `key_vault_id` field accept Key Vault Secret IDs containing certificates, as per the [Azure Terraform provider documentation](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management#key_vault_certificate_id-1)
