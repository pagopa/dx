variable "project" {
  type        = string
  description = "env prefix, short environment and short location"
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

variable "vpn_subnet_id" {
  type        = string
  description = "VPN network subnet ID."
}

variable "dnsforwarder_subnet_id" {
  type        = string
  description = "DNS forwarder subnet ID."
}

variable "tenant_id" {
  type        = string
  description = "Tenant ID"
}

variable "env_short" {
  type        = string
  description = "Environment in short form where resources are located"
}