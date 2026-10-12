variable "private_dns_zone_resource_group_name" {
  type        = string
  description = "Resource group containing the privatelink.servicebus.windows.net private DNS zone."
}

variable "subnet_pep_id" {
  type        = string
  description = "Existing subnet resource ID for the Service Bus private endpoint."
}
