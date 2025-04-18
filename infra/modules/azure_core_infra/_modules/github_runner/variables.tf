variable "naming_config" {
  type = object({
    prefix          = string,
    environment     = string,
    name            = optional(string, "github-runner"),
    location        = string,
    instance_number = optional(number, 1),
  })
  description = "Map with naming values for resource names"

}

variable "resource_group_name" {
  type        = string
  description = "Resource group name"
}

variable "location" {
  type        = string
  description = "Location"
}

variable "tags" {
  type        = map(any)
  description = "Resources tags"
}

variable "virtual_network" {
  type = object({
    id                  = string
    name                = string
    resource_group_name = string
  })
  description = "Virtual network where to attach private dns zones"
}

variable "log_analytics_workspace_id" {
  type = string
}

variable "subnet_cidr" {
  type    = string
  default = "10.0.242.0/23"
}