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
    region          = string
    app_name        = string
    instance_number = string
  })

  description = "Values which are used to generate resource names and region short names."
}

# Networking variables

variable "vpc_cidr" {
  type        = string
  description = "The CIDR block defining the IP address range for the VPC."
}

variable "nat_gateway_count" {
  type        = number
  description = "Number of NAT gateways to create. Set to 0 to disable NAT gateways, 1 for development environment, 3 for high availability in production environment."
  default     = 3

  validation {
    condition     = var.nat_gateway_count >= 0 && var.nat_gateway_count <= 3
    error_message = "NAT gateway count must be between 0 and 3."
  }
}

