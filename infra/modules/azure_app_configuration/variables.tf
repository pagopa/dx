variable "tags" {
  type        = map(any)
  description = "A map of tags to assign to the resources."
}

variable "environment" {
  type = object({
    prefix          = string
    env_short       = string
    location        = string
    domain          = optional(string)
    app_name        = string
    instance_number = string
  })

  description = "Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains."
}

variable "resource_group_name" {
  type        = string
  description = "The name of the resource group where resources will be deployed."
}

variable "use_case" {
  type        = string
  description = "Allowed values: 'default', 'development'."
  default     = "default"

  validation {
    condition     = contains(["default", "development"], var.use_case)
    error_message = "Allowed values for \"use_case\" are \"default\", \"development\"."
  }
}

variable "size" {
  type        = string
  default     = null
  description = <<-EOT
  "App Configuration SKU. Allowed values: 'standard', 'premium'. If not set, it will be determined by the use_case."
  EOT

  validation {
    condition     = var.size == null || (contains(["standard", "premium"], var.size) && var.use_case == "default")
    error_message = "Allowed values: 'standard', 'premium'. For development purpose, set \"use_case\" to \"development\" and unset this."
  }
}

variable "virtual_network" {
  type = object({
    name                = string
    resource_group_name = string
  })
  description = "Virtual network where the subnet will be created."
}

variable "private_dns_zone_resource_group_name" {
  type        = string
  default     = null
  description = "Name of the resource group containing the private DNS zone for private endpoints. Default is the resource group of the virtual network."
}

variable "subnet_pep_id" {
  type        = string
  description = "ID of the subnet hosting private endpoints."
}

variable "subscription_id" {
  type        = string
  description = "Subscription Id of the involved resources"
}

variable "key_vaults" {
  type = list(object({
    name                = string
    resource_group_name = string
    has_rbac_support    = bool
    app_principal_ids   = list(string)
  }))
  default = null

  description = <<EOT
   Optionally, integrate App Configuration with a one or more existing Key Vault for secrets retrieval.
   Set `has_rbac_support` to true if the referenced Key Vault uses RBAC model for access control.
   Use `app_principal_ids` to set application principal IDs to be granted access to the Key Vault.
  EOT
}

variable "authorized_teams" {
  type = object({
    writers = optional(list(string), []),
    readers = optional(list(string), [])
  })
  default = {
    writers = []
    readers = []
  }

  description = <<EOT
  Object containing lists of principal IDs (Azure AD object IDs) of product teams to be granted read or write permissions on the App Configuration. These represent the teams within the organization that need access to this resource."
  EOT
}
