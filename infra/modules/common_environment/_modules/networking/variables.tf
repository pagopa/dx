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

variable "ng_ips_number" {
  type        = number
  description = "Number of public IPs assigned to the nat gateway"
  default     = 1
}

variable "ng_number" {
  type        = number
  description = "Number of nat gateways to deploy"
  default     = 1
}


variable "ng_ippres_number" {
  type        = number
  description = "Number of Public IP Prefix assigned to the nat gateway"
  default     = 3
}