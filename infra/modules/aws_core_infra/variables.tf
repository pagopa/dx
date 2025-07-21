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
    location        = string
    domain          = optional(string)
    instance_number = string
  })

  description = "Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains."
}

# Networking variables

variable "vpc_cidr" {
  type        = string
  description = "The CIDR block defining the IP address range for the VPC."
}

variable "nat_gateway_count" {
  type        = number
  description = "Number of NAT gateways to create. Set to 0 to disable NAT gateways, or 1-3 for high availability."
  default     = 3

  validation {
    condition     = var.nat_gateway_count >= 0 && var.nat_gateway_count <= 3
    error_message = "NAT gateway count must be between 0 and 3."
  }
}

variable "vpn_enabled" {
  type        = bool
  description = "A boolean flag to enable or disable the creation of a VPN."
  default     = false
}
