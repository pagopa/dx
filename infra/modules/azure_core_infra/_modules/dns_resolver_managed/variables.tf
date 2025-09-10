#---------#
# General #
#---------#

variable "tags" {
  type        = map(any)
  description = "A map of tags to assign to the resources."
}

variable "environment" {
  type = object({
    prefix          = string
    env_short       = string
    location        = string
    app_name        = string
    instance_number = string
  })
  description = "Values which are used to generate resource names and location short names."
}

variable "resource_group_name" {
  type        = string
  description = "Resource group name where the Private DNS Resolver will be created."
}

variable "virtual_network_id" {
  type        = string
  description = "Virtual Network ID where the Private DNS Resolver will be created."
}

variable "inbound_subnet_id" {
  type        = string
  description = "Subnet ID for the inbound endpoint."
}

variable "outbound_subnet_id" {
  type        = string
  description = "Subnet ID for the outbound endpoint."
}

variable "cross_cloud_dns_config" {
  type = object({
    aws_resolver_inbound_ips = list(string)
    aws_vpc_cidr             = string
  })
  description = "Cross-cloud DNS configuration for AWS Route53 Resolver integration."
}
