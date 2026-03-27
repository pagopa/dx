variable "environment" {
  type = object({
    prefix          = string
    environment     = string
    location        = string
    instance_number = string
    domain          = optional(string)
    app_name        = optional(string)
  })
  description = "Values used to generate resource names and location short names."
}

variable "tenant_id" {
  type        = string
  description = "Azure tenant ID for authentication."
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

variable "network_resource_group_name" {
  type        = string
  description = "Name of the resource group containing network resources, used for DNS zone reference."
}

variable "custom_domain_host_name" {
  type        = string
  description = "Host name for the custom domain to be used by the Container App (e.g., 'metrics.dx.pagopa.it'). The domain must be configured in the specified DNS zone."
}

variable "auth_entra_id_client_id" {
  type        = string
  description = "Azure Entra ID application (client) ID for authentication. When set, enables managed authentication on the Container App. Not sensitive — it is a public application identifier."
  default     = "90565e12-fde8-4a60-95ee-a282409d3b86"
}
