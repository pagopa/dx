variable "environment" {
  description = "Environment configuration"
  type = object({
    env_short = string
    location  = string
  })
}

variable "domain" {
  description = "Domain name for resource naming"
  type        = string
}

variable "location" {
  description = "Azure region for resources"
  type        = string
  default     = "westeurope"
}

variable "tags" {
  description = "Required tags for all resources"
  type = object({
    CostCenter     = string
    BusinessUnit   = string
    ManagementTeam = string
  })

  validation {
    condition     = alltrue([for k in ["CostCenter", "BusinessUnit", "ManagementTeam"] : lookup(var.tags, k, null) != null])
    error_message = "All required tags (CostCenter, BusinessUnit, ManagementTeam) must be provided."
  }
}

variable "function_app_settings" {
  description = "Additional app settings for Function App"
  type        = map(string)
  default     = {}
  sensitive   = true
}

variable "cosmosdb_throughput" {
  description = "Cosmos DB throughput (RU/s) for serverless mode"
  type        = number
  default     = null
}

variable "key_vault_id" {
  description = "Key Vault ID for secret references"
  type        = string
}
