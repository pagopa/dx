variable "prefix" {
  type        = string
  description = "Prefix for resource naming (max 2 characters)"
  default     = "dx"
}

variable "env_short" {
  type        = string
  description = "Environment short name (d, u, p)"
  default     = "d"
}

variable "location" {
  type        = string
  description = "Azure region"
  default     = "italynorth"
}

variable "domain" {
  type        = string
  description = "Domain grouping (optional)"
  default     = "demo"
}

variable "app_name" {
  type        = string
  description = "Application name"
  default     = "app"
}

variable "instance_number" {
  type        = string
  description = "Instance number"
  default     = "01"
}

variable "virtual_network_name" {
  type        = string
  description = "Name of the existing virtual network"
}

variable "virtual_network_resource_group_name" {
  type        = string
  description = "Resource group of the existing virtual network"
}

variable "subnet_pep_id" {
  type        = string
  description = "Subnet ID for private endpoints"
}

variable "key_vault_name" {
  type        = string
  description = "Name of existing Key Vault for secrets"
}

variable "cost_center" {
  type        = string
  description = "Budget tracking identifier"
  default     = "TS000 - Tecnologia e Servizi"
}

variable "business_unit" {
  type        = string
  description = "Product or business unit"
  default     = "DevEx"
}

variable "management_team" {
  type        = string
  description = "Team responsible for the resource management"
  default     = "Developer Experience"
}

variable "source_repository" {
  type        = string
  description = "Link to the Terraform source code repository"
}
