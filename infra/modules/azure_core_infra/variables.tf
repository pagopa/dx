#---------#
# General #
#---------#

variable "tags" {
  type        = map(any)
  description = "Resources tags"
}

variable "environment" {
  type = object({
    prefix          = string
    env_short       = string
    location        = string
    domain          = optional(string)
    app_name        = string
    instance_number = string
  })

  description = "Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains."
}

variable "test_enable" {
  type        = bool
  description = "Flag to enable testing resources"
  default     = false
}

# Networking variables

variable "virtual_network_cidr" {
  type        = string
  description = "CIDR block for the virtual network"
}

variable "pep_subnet_cidr" {
  type        = string
  description = "CIDR block for the private endpoint subnet"
}

variable "vpn" {
  type = object({
    cidr_subnet              = optional(string, "")
    dnsforwarder_cidr_subnet = optional(string, "")
  })
  description = "VPN configuration. Both 'cidr_subnet' and 'dnsforwarder_cidr_subnet' must be specified together or not at all."
  default     = {}

  validation {
    condition     = (var.vpn.cidr_subnet == "" && var.vpn.dnsforwarder_cidr_subnet == "") || (var.vpn.cidr_subnet != "" && var.vpn.dnsforwarder_cidr_subnet != "")
    error_message = "You must specify both 'cidr_subnet' and 'dnsforwarder_cidr_subnet' together, or leave both empty."
  }
}