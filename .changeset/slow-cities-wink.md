---
"azure_api_management": patch
---

# Patch Changes

Fix `azure_api_management` module behavior for `cost_optimized` use case

## Upgrade Notes

- Resolved an issue where terraform apply failed when using `StandardV2` SKU with `virtual_network_type = Internal`, which is not supported.

  - The default `virtual_network_type` is now set to `External` only for the `cost_optimized` use case, while remaining `Internal` for all other cases.

- The variable `virtual_network_type_internal`, which previously defaulted to `true`, now defaults to `null` and acts as an override:

  - If not set, defaults are applied (`Internal` for all, `External` for cost_optimized).

  - If explicitly set, its value overrides the default behavior.

- Added support for a Private Endpoint in the `cost_optimized` scenario to enable private connectivity.

- `sign_up` configuration is disabled only for `cost_optimized` use case because it is not supported by consumption and V2 tier.

- Virtual network configuration is now created when `virtual_network_type` is set to `Internal` (as before) or when is `External` and `cost_optimized`.

These changes have no breaking changes for module consumers.
