# Service Bus alerts example

This example creates a Premium Service Bus namespace with a private endpoint.
Provide `private_dns_zone_resource_group_name` for a resource group containing
the `privatelink.servicebus.windows.net` private DNS zone, and `subnet_pep_id`
for an existing subnet that can host the private endpoint. The Terraform
identity must be able to read and link that DNS zone.
