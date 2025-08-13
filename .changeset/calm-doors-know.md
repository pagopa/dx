---
"azure_service_bus_namespace": major
---

Replace the `tier` variable with a new `use_case` variable for tiering configuration. The previous values (`m`, `l`) have been replaced by a new option: `default` (formerly `m`). This change simplifies and clarifies the selection of Service Bus namespace. In addition, some variables with tier dependencies have been updated with new validation rules to ensure they are only used when appropriate (`subnet_pep_id`, `private_dns_zone_resource_group_name`, `allowed_ips`).
