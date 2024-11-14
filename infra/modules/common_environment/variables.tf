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

  validation {
    condition     = length("${var.environment.prefix}${var.environment.env_short}reg${var.environment.domain == null ? "" : replace(var.environment.domain, "-", "")}${var.environment.app_name}-apim-${var.environment.instance_number}") <= 50
    error_message = "Azure API Management name must contain between 1 and 50 characters. Current value is \"${var.environment.prefix}${var.environment.env_short}reg${var.environment.domain == null ? "" : var.environment.domain}${var.environment.app_name}-apim-${var.environment.instance_number}\""
  }

  description = "Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains."
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

# variable "vpn_cidr_subnet" {
#   type        = string
#   description = "VPN network address space."
# }

# variable "dnsforwarder_cidr_subnet" {
#   type        = string
#   description = "DNS forwarder network address space."
# }