---
"azure_function_app_exposed": patch
"azure_function_app": patch
---

fix: correct `ignore_changes` syntax for nested `site_config` block

Changed `site_config["health_check_eviction_time_in_min"]` to `site_config[0].health_check_eviction_time_in_min` to properly reference the specific attribute within the nested block. The previous syntax caused Terraform to ignore the entire `site_config` block, preventing changes to `node_version` and other attributes from being applied to the production slot. With the corrected syntax, only the `health_check_eviction_time_in_min` attribute is ignored, while `node_version` and other configuration changes are now properly detected and applied.
