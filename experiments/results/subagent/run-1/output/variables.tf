variable "environment" {
  type = object({
    prefix          = string
    env_short       = string
    location        = string
    domain          = optional(string)
    app_name        = string
    instance_number = string
  })
  description = "Environment configuration for resource naming"
  default = {
    prefix          = "myapp"
    env_short       = "d"
    location        = "italynorth"
    domain          = null
    app_name        = "backend"
    instance_number = "01"
  }
}

variable "business_unit" {
  type        = string
  description = "Business unit responsible for this infrastructure"
  default     = "DevEx"
}

variable "management_team" {
  type        = string
  description = "Team responsible for managing this infrastructure"
  default     = "Developer Experience"
}

variable "virtual_network" {
  type = object({
    name                = string
    resource_group_name = string
  })
  description = "Existing Virtual Network for subnet integration"
}

variable "subnet_pep_id" {
  type        = string
  description = "Subnet ID for private endpoints"
}

variable "key_vault_name" {
  type        = string
  description = "Name of the Key Vault for secret references"
}

variable "key_vault_resource_group_name" {
  type        = string
  description = "Resource group name of the Key Vault"
}

variable "application_insights_connection_string" {
  type        = string
  description = "Application Insights connection string for Function App"
  sensitive   = true
}

variable "function_node_version" {
  type        = number
  description = "Node.js runtime version for Function App"
  default     = 20

  validation {
    condition     = contains([18, 20], var.function_node_version)
    error_message = "Node.js version must be 18 or 20."
  }
}

variable "cosmos_consistency_preset" {
  type        = string
  description = "Cosmos DB consistency policy preset"
  default     = "default"

  validation {
    condition     = contains(["default", "high_consistency", "high_performance"], var.cosmos_consistency_preset)
    error_message = "Allowed values: 'default', 'high_consistency', 'high_performance'."
  }
}
