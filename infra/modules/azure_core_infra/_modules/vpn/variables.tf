variable "naming_config" {
  type = object({
    prefix          = string,
    environment     = string,
    location        = string,
    instance_number = optional(number, 1),
  })
  description = "Map with naming values for resource names"
}

variable "prefix" {
  type        = string
  description = "Project prefix"
}

variable "project" {
  type        = string
  description = "Env prefix, short environment and short location"
}

variable "instance_number" {
  type        = string
  description = "The instance number of the resource, used to differentiate multiple instances of the same resource type within the same project and environment."
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

variable "vpn_enabled" {
  type        = bool
  description = "A boolean flag to enable or disable the creation of a VPN."
  default     = false
}

variable "aws_vpn_enabled" {
  type        = bool
  description = "A boolean flag to enable or disable the creation of the required resources to support a site-to-site VPN connection towards AWS."
  default     = false
}

variable "vpn_use_case" {
  type        = string
  description = "Site-to-Site VPN use case. Allowed values: 'default', 'high_availability'."
  default     = "default"

  validation {
    condition     = contains(["default", "high_availability"], var.vpn_use_case)
    error_message = "vpn_use_case must be either 'default' or 'high_availability'."
  }
}
