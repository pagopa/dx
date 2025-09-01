---
"azure_core_infra": patch
---

Address two issues with generated names:

- `instance_number` variable was not used to generate resource name, causing all instances to have the same name when multiple instances were created
  - affected components: VPN Gateway and NAT Gateway
- the Entra ID application name was not using the `prefix` variable, replaced by `dx` hardcoded value
  - affected components: VPN Gateway
