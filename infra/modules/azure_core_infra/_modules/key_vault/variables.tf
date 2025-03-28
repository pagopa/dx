variable "name_env" {
  type = object({
    prefix          = string,
    environment     = string,
    location        = string,
    domain          = string,
    name            = string,
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