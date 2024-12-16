variable "prefix" {
  type = string
}

variable "suffix" {
  type        = string
  description = "Suffix for resource names"
  default     = "01"
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

variable "key_vault" {
  type = object({
    name                = string
    secret_name         = string
    resource_group_name = string
  })
  description = "Key Vault configuration variables"
}

variable "virtual_network" {
  type = object({
    id                  = string
    name                = string
    resource_group_name = string
  })
  description = "Virtual network where to attach private dns zones"
}

variable "job" {
  type = object({
    name       = string
    repo       = string
    repo_owner = optional(string, "pagopa")
  })
  description = "Job configuration variables"
}

variable "log_analytics_workspace_id" {
  type = string
}

variable "subnet_cidr" {
  type    = string
  default = "10.0.242.0/23"
}

variable "labels" {
  type    = list(string)
  default = []
}