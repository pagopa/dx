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
}

variable "subnet_pep_id" {
  type        = string
  description = "The ID of the subnet designated for private endpoints. Mandatory if \"sku_name\" is \"Premium\"."
  default     = null

  validation {
    condition     = var.sku_name == "Premium" ? length(var.subnet_pep_id) > 0 : true
    error_message = "The \"subnet_pep_id\" variable is mandatory if \"sku_name\" is \"Premium\"."
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
