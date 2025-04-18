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
    domain          = optional(string)
    app_name        = string
    instance_number = string
  })

  description = "Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains."
}

variable "test_enabled" {
  type        = bool
  description = "A boolean flag to enable or disable the creation of testing resources."
  default     = false
}

# Networking variables

variable "virtual_network_cidr" {
  type        = string
  description = "The CIDR block defining the IP address range for the virtual network."
  default     = "10.0.0.0/16"
}

variable "pep_subnet_cidr" {
  type        = string
  description = "The CIDR block defining the IP address range for the private endpoint subnet."
  default     = "10.0.2.0/23"
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
    error_message = "Both 'cidr_subnet' and 'dnsforwarder_cidr_subnet' must be specified together, or both must be left empty."
  }
}

variable "nat_enabled" {
  type        = bool
  description = "A boolean flag to enable or disable the creation of a NAT gateway."
  default     = false
}

variable "gh_runner_snet" {
  type        = string
  default     = "10.0.242.0/23"
  description = "The CIDR block defining the IP address range for the GitHub runner subnet."
}