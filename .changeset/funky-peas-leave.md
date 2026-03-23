---
"azure_container_app_environment": minor
---

Add public network access support via `public_network_access_enabled` variable (default: `false`).

When enabled, the Container App Environment is exposed via a public load balancer. When disabled (default), an internal load balancer is used and a private endpoint is created.

The `subnet_pep_id` variable is now optional and defaults to `null`, but is required when `public_network_access_enabled = false`. Input validation enforces this constraint.

New outputs added: `default_domain` and `static_ip_address`.
