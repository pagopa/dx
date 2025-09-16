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
    isolated_subnet_ids = optional(list(string), [])
  })
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
