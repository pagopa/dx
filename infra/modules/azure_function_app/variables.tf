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
  type        = string
  description = "Resource group to deploy resource to"
}

variable "application_insights_connection_string" {
  type        = string
  sensitive   = true
  description = "Application Insights connection string"
}

variable "health_check_path" {
  type        = string
  description = "Endpoint where health probe is exposed"
}

variable "node_version" {
  type = number
}

variable "ai_sampling_percentage" {
  type        = number
  default     = 5
  description = "(Optional) The sampling percentage of Application Insights. Default is 5"
}

variable "app_settings" {
  type        = map(string)
  description = "Application settings"
}

variable "sticky_app_setting_names" {
  type        = list(string)
  description = "(Optional) A list of application setting names that are not swapped between slots"
  default     = []
}

variable "subnet_cidr" {
  type        = string
  description = "CIDR block to use for the subnet the Function App uses for outbound connectivity"
}

variable "subnet_pep_id" {
  type        = string
  description = "Id of the subnet which holds private endpoints"
}

variable "virtual_network" {
  type = object({
    name                = string
    resource_group_name = string
  })
  description = "Virtual network in which to create the subnet"
}
