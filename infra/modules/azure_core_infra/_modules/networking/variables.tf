variable "project" {
  type        = string
  description = "IO prefix, short environment and short location"
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