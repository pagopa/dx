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

variable "nat_enabled" {
  type        = bool
  description = "A boolean flag to enable or disable the creation of a NAT gateway."
  default     = false
}

variable "vpn_enabled" {
  type        = bool
  description = "A boolean flag to enable or disable the creation of a VPN."
  default     = false
}

variable "vpn_use_case" {
  type        = string
  description = "Site-to-Site VPN use case. Allowed values: 'default', 'high_availability'."
  default     = "default"

  validation {
    condition     = contains(["default", "high_availability"], var.vpn_use_case)
    error_message = "vpn_use_case must be either 'default' or 'high_availability'."
  }
}

# Cross-cloud DNS configuration
variable "cross_cloud_dns_enabled" {
  type        = bool
  description = "Enable cross-cloud DNS resolution with AWS."
  default     = false
}