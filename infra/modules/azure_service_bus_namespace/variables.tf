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

  validation {
    condition     = length("${var.environment.prefix}${var.environment.env_short}reg${var.environment.domain == null ? "" : replace(var.environment.domain, "-", "")}${var.environment.app_name}-sbns-${var.environment.instance_number}") <= 50
    error_message = "Azure Service Bus Namespace name must contain between 1 and 50 characters. Current value is \"${var.environment.prefix}${var.environment.env_short}reg${var.environment.domain == null ? "" : var.environment.domain}${var.environment.app_name}-sbns-${var.environment.instance_number}\""
  }

  description = "Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains."
}

variable "resource_group_name" {
  type        = string
  description = "The name of the resource group where resources will be deployed."
}

variable "private_dns_zone_resource_group_name" {
  type        = string
  description = "The name of the resource group containing the private DNS zone for private endpoints."
  default     = null

  validation {
    condition     = var.tier == "l" || (var.tier == "m" && var.private_dns_zone_resource_group_name == null)
    error_message = "The \"private_dns_zone_resource_group_name\" variable can be used if \"tier\" is \"l\" and should not be used otherwise."
  }
}

variable "subnet_pep_id" {
  type        = string
  description = "The ID of the subnet designated for private endpoints. Mandatory if \"tier\" is \"m\"."
  default     = null

  validation {
    condition     = (var.tier == "l" && var.subnet_pep_id != null) || (var.tier == "m" && var.subnet_pep_id == null)
    error_message = "The \"subnet_pep_id\" variable is mandatory if \"tier\" is \"l\" and should not be used otherwise."
  }
}

variable "allowed_ips" {
  type        = list(string)
  description = "A list of IP addresses or CIDR blocks to allow access to the Service Bus Namespace. Mandatory if \"tier\" is \"m\", while not used for \"l\"."
  default     = null

  validation {
    condition     = (var.tier == "m" && try(length(var.allowed_ips) > 0, false)) || (var.tier == "l" && var.allowed_ips == null)
    error_message = "The \"allowed_ips\" variable is mandatory if \"tier\" is \"m\" and should not be used otherwise."
  }
}

variable "tier" {
  type        = string
  description = "Resource tiers depending on demanding workload and security considerations. Allowed values are 'm', 'l'."
  default     = "l"

  validation {
    condition     = contains(["m", "l"], var.tier)
    error_message = "Allowed values for \"tier\" are \"m\", or \"l\"."
  }
}
