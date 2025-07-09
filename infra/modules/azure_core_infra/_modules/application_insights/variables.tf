variable "naming_config" {
  type = object({
    prefix          = string,
    environment     = string,
    location        = string,
    instance_number = optional(number, 1),
  })
  description = "Map with naming values for resource names"
}

variable "resource_group_name" {
  type        = string
  description = "The name of the resource group in which the Log Analytics will be created"
}

variable "location" {
  type        = string
  description = "The location in which the Log Analytics will be created"
}

variable "log_analytics_workspace_id" {
  type        = string
  description = "The ID of the Log Analytics Workspace to link with Application Insights"
}

variable "key_vault_id" {
  type        = string
  description = "The ID of the Key Vault where Application Insights secrets will be stored"
}

variable "daily_data_cap_in_gb" {
  type        = number
  default     = 100
  description = "The daily data cap in GB for Application Insights"
}

variable "tags" {
  type        = map(any)
  description = "A mapping of tags to assign to the resource"
}
