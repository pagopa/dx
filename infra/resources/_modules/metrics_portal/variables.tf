variable "environment" {
  type = object({
    prefix          = string
    environment     = optional(string)
    env_short       = optional(string)
    location        = string
    instance_number = string
    domain          = optional(string)
    app_name        = optional(string)
  })
  description = "Values used to generate resource names and location short names."
}

variable "resource_group_name" {
  type        = string
  description = "Name of the resource group where resources will be deployed."
}

variable "tags" {
  type        = map(any)
  description = "Map of tags to assign to all resources."
}

variable "subnet_pep_id" {
  type        = string
  description = "ID of the subnet used for private endpoints."
}

variable "private_dns_zone_resource_group_name" {
  type        = string
  description = "Name of the resource group containing private DNS zones (e.g. the network resource group)."
}

variable "key_vault_id" {
  type        = string
  description = "ID of the Key Vault where secrets (DB credentials, connection string) will be stored."
}

variable "container_app_env_id" {
  type        = string
  description = "ID of the Container App Environment."
}

variable "container_app_user_assigned_identity_id" {
  type        = string
  description = "ID of the user-assigned managed identity for the Container App to access Key Vault."
}

variable "container_app_user_assigned_identity_principal_id" {
  type        = string
  description = "Principal ID of the user-assigned managed identity for the Container App to access Key Vault."
}

variable "container_app_image" {
  type        = string
  description = "OCI image URI for the Container App. Should reference the dx-metrics image from GitHub Container Registry (e.g., 'ghcr.io/pagopa/dx/dx-metrics:latest'). Built and deployed via GitHub Actions."
}
