---
"azure_github_environment_bootstrap": major
---

The variable `private_dns_zone_resource_group_id` replaces `dns_zone_resource_group_id`. This is going to remove all roles on external DNS zone resource group. Instead, all required roles to manage Private DNS Zone are set, in order to let identities to create, update and delete private endpoints on resources.

The variable `nat_gateway_resource_group_id` is now optional.
