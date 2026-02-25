variable "environment" {
  type = object({
    prefix          = string
    env_short       = string
    location        = string
    domain          = optional(string)
    app_name        = string
    instance_number = string
  })

  description = "Values which are used to generate resource names and location short names"
}

variable "resource_group_name" {
  type        = string
  description = "Name of the resource group where the Stategraph will be deployed."
}

variable "log_analytics_workspace_id" {
  type        = string
  description = "The ID of the Log Analytics workspace to which the Stategraph environment will be linked for logging and monitoring."
}

variable "key_vault" {
  type = object({
    id   = string
    name = string
  })
  description = "Key Vault with secrets"
}

variable "vnet" {
  type = object({
    id                  = string
    name                = string
    resource_group_name = string
  })

  description = "Virtual network configuration where the Stategraph resources will be deployed."
}

variable "pep_subnet_id" {
  type        = string
  description = "The ID of the subnet where the private endpoints will be deployed."
}

variable "postgres_dns_zone_id" {
  type        = string
  description = "The ID of the private DNS zone for PostgreSQL flexible server."
}

variable "cae_dns_zone_id" {
  type        = string
  description = "The ID of the private DNS zone for Container App Environment."
}

variable "tenant_id" {
  type        = string
  description = "The tenant ID for the Azure Active Directory authentication of PostgreSQL flexible server."
}

variable "admins" {
  type        = map(string)
  description = "List of admin object IDs for PostgreSQL flexible server."
}

variable "tags" {
  type        = map(any)
  description = "Map of tags to apply to all created resources."
}
