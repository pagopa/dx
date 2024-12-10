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

variable "vpn_cidr_subnet" {
  type        = string
  description = "VPN network address space."
}

variable "dnsforwarder_cidr_subnet" {
  type        = string
  description = "DNS forwarder network address space."
}

variable "virtual_network" {
  type = object({
    id   = string
    name = string
  })
  description = "Virtual network where to attach private dns zones"
}

variable "tenant_id" {
  type        = string
  description = "Tenant ID"
}