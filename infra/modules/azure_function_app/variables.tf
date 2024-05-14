variable "tags" {
  type        = map(any)
  description = "Resources tags"
}

variable "env_short" {
  type        = string
  description = "Environment short name"
}

variable "location_short" {
  type        = string
  description = "Location short name"
}

variable "location" {
  type        = string
  description = "Location name"
}

variable "prefix" {
  type        = string
  description = "Project prefix"
}

variable "instance_number" {
  type        = string
  description = "(Optional) Instance count for a specific resource"
  default     = "01"
}

variable "domain" {
  type        = string
  description = "Domain of the project"
}

variable "app_name" {
  type        = string
  description = "Application name"
}

variable "resource_group_name" {
  type = string
}

variable "application_insights_connection_string" {
  type      = string
  sensitive = true
}

variable "health_check_path" {
  type = string
}

variable "node_version" {
  type = number
}

variable "ai_sampling_percentage" {
  type = number
}

variable "app_settings" {
  type = map(string)
}

variable "sticky_app_setting_names" {
  type        = list(string)
  description = "(Optional) A list of app_setting names that the Linux Function App will not swap between Slots when a swap operation is triggered"
  default     = []
}

variable "subnet_cidr" {
  type = string
}

variable "virtual_network" {
  type = object({
    name                = string
    resource_group_name = string
  })
}
