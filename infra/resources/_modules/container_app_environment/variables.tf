variable "environment" {
  type = object({
    prefix          = string
    env_short       = string
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

variable "virtual_network_id" {
  type        = string
  description = "ID of the virtual network where the container app subnet will be created."
}

variable "virtual_network_name" {
  type        = string
  description = "Name of the virtual network where the container app subnet will be created."
}

variable "virtual_network_resource_group_name" {
  type        = string
  description = "Name of the resource group containing the virtual network."
}

variable "private_dns_zone_resource_group_name" {
  type        = string
  description = "Name of the resource group containing private DNS zones."
}

variable "log_analytics_workspace_id" {
  type        = string
  description = "ID of the Log Analytics workspace for diagnostics."
}
