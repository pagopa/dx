variable "environment" {
  type = object({
    prefix          = string
    environment     = string
    location        = string
    instance_number = string
    domain          = optional(string)
    app_name        = string
  })
  description = "Values used to generate resource names and location short names."
}

variable "resource_group_name" {
  type        = string
  description = "Name of the resource group where resources will be deployed."
}

variable "tags" {
  type        = map(any)
  description = "Map of tags to assign to all resources."
}

variable "subnet_pep_id" {
  type        = string
  description = "ID of the subnet used for private endpoints."
}

variable "private_dns_zone_resource_group_name" {
  type        = string
  description = "Name of the resource group containing private DNS zones (e.g. the network resource group)."
}

variable "key_vault_id" {
  type        = string
  description = "ID of the Key Vault where secrets (DB credentials, connection string) will be stored."
}

variable "key_vault_name" {
  type        = string
  description = "Name of the Key Vault, used to construct Key Vault reference URLs for app settings."
}

variable "application_insights_connection_string" {
  type        = string
  default     = null
  sensitive   = true
  description = "Application Insights connection string for telemetry of the App Service."
}
