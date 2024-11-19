variable "project" {
  type        = string
  description = "IO prefix, short environment and short location"
}

variable "prefix" {
  type        = string
  description = "IO prefix, short environment, short location and domain"
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

variable "subnet_pep_id" {
  type        = string
  description = "Private endpoint subnet id"
}

variable "private_dns_zone" {
  type = object({
    id                  = string
    resource_group_name = string
  })
  description = "Private dns zone id and resource group name"
}

variable "tenant_id" {
  type        = string
  description = "Tenant ID"
}