---
"azure_api_management": patch
---

# Patch Changes

Fix `azure_api_management` module behavior for `cost_optimized` use case

## Upgrade Notes

- Resolved an issue where terraform apply failed when using `StandardV2` SKU with `virtual_network_type = Internal`, which is not supported.

  - The default `virtual_network_type` is now set to `None` only for the `cost_optimized` use case, while remaining `Internal` for all other cases.

- The variable `virtual_network_type_internal`, which previously defaulted to `true`, now defaults to `null` and acts as an override:

  - If not set, defaults are applied (`Internal` for all, `None` for cost_optimized).

  - If explicitly set, its value overrides the default behavior.

- Added support for a Private Endpoint in the `cost_optimized` scenario to enable private connectivity.

These changes have no breaking changes for module consumers.
