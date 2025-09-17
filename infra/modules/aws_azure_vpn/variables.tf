#---------#
# General #
#---------#

variable "tags" {
  type        = map(string)
  description = "A map of tags to assign to the resources."
}

variable "environment" {
  type = object({
    prefix          = string
    env_short       = string
    app_name        = string
    instance_number = string
  })

  description = "Values which are used to generate resource names and region short names."
}

variable "use_case" {
  type        = string
  description = "SitetoSite VPN use case. Allowed values: 'default', 'high_availability'."
  default     = "default"
  validation {
    condition     = contains(["default", "high_availability"], var.use_case)
    error_message = "use_case must be either 'default' or 'high_availability'."
  }
}

#-----#
# AWS #
#-----#
variable "aws" {
  type = object({
    region              = string
    vpc_id              = string
    vpc_cidr            = string
    route_table_ids     = list(string)
    dns_forwarder_ip    = optional(string, null)
    isolated_subnet_ids = list(string)
    private_dns_zones   = optional(list(string), [])
  })
  description = "AWS related configuration."
  validation {
    condition     = (var.use_case == "high_availability" && var.aws.dns_forwarder_ip == null) || (var.use_case == "default" && var.aws.dns_forwarder_ip != null)
    error_message = "If use_case is default, the dns_forwarder_ip must be provided in order to create a CoreDNS EC2 instance. If use_case is high_availability, the dns forwarder will be created with managed resources."
  }
}

#-------#
# Azure #
#-------#
variable "azure" {
  type = object({
    resource_group_name = string
    location            = string
    vnet_id             = string
    vnet_name           = string
    vnet_cidr           = string
    vpn_snet_id         = string
    dns_forwarder_ip    = string
    vpn = optional(object({ # If not provided, a new Virtual Network Gateway will be created
      virtual_network_gateway_id = string
      public_ips                 = list(string)
    }), { virtual_network_gateway_id = null, public_ips = [] })
    private_dns_zones = list(string)
  })
}
