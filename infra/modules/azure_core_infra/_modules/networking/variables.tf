variable "name_env" {
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

variable "vnet_cidr" {
  type        = string
  description = "VNet CIDR block"
}

variable "pep_snet_cidr" {
  type        = string
  description = "PEP subnet CIDR block"
}