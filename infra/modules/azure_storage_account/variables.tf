# ------------ GENERAL ------------ #
variable "tags" {
  type        = map(any)
  description = "A map of tags to assign to all resources created by this module."
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
  description = "The name of the resource group where the storage account and related resources will be deployed."
}

# ------------ STORAGE ACCOUNT ------------ #
variable "use_case" {
  type        = string
  description = "Storage account use case. Allowed values: 'default', 'audit', 'delegated_access', 'development', 'archive'."
  default     = "default"

  validation {
    condition     = contains(["default", "audit", "delegated_access", "development", "archive"], var.use_case)
    error_message = "Allowed values for \"use_case\" are \"default\", \"audit\", \"delegated_access\", \"development\", or \"archive\"."
  }
}

variable "subnet_pep_id" {
  type        = string
  description = "The ID of the subnet used for private endpoints. Required only if `force_public_network_access_enabled` is set to false."
  default     = null

  validation {
    condition     = var.use_case == "delegated_access" || var.force_public_network_access_enabled || (var.subnet_pep_id != null && var.subnet_pep_id != "")
    error_message = "subnet_pep_id is required when force_public_network_access_enabled is false."
  }
}

variable "customer_managed_key" {
  type = object({
    enabled                   = optional(bool, false)
    type                      = optional(string, null)
    key_name                  = optional(string, null)
    user_assigned_identity_id = optional(string, null)
    key_vault_id              = optional(string, null)
  })
  description = "Configures customer-managed keys (CMK) for encryption. Supports only 'kv' (Key Vault)."
  default     = { enabled = false }

  validation {
    condition     = var.use_case != "audit" || var.customer_managed_key.enabled
    error_message = "Customer-managed key (BYOK) must be enabled when the use case is 'audit'."
  }
}

variable "force_public_network_access_enabled" {
  type        = bool
  description = "Allows public network access. Defaults to 'false'."
  default     = false
}

variable "access_tier" {
  type        = string
  description = "Access tier for the storage account. Options: 'Hot', 'Cool', 'Cold', 'Premium'. Defaults to 'Hot'."
  default     = "Hot"
}

variable "subservices_enabled" {
  type = object({
    blob  = optional(bool, true)
    file  = optional(bool, false)
    queue = optional(bool, false)
    table = optional(bool, false)
  })
  description = "Enables subservices (blob, file, queue, table). Creates Private Endpoints for enabled services. Defaults to 'blob' only. Used only if force_public_network_access_enabled is false."
  default     = {}
}

variable "blob_features" {
  type = object({
    restore_policy_days   = optional(number, 0)
    delete_retention_days = optional(number, 0)
    last_access_time      = optional(bool, false)
    versioning            = optional(bool, false)
    change_feed = optional(object({
      enabled           = optional(bool, false)
      retention_in_days = optional(number, 0)
    }), { enabled = false })
    immutability_policy = optional(object({
      enabled                       = optional(bool, false)
      allow_protected_append_writes = optional(bool, false)
      period_since_creation_in_days = optional(number, 730)
    }), { enabled = false })
  })
  description = "Advanced blob features like versioning, change feed, immutability, and retention policies."
  default = {
    restore_policy_days   = 0
    delete_retention_days = 0
    last_access_time      = false
    versioning            = false
    change_feed           = { enabled = false, retention_in_days = 0 }
    immutability_policy   = { enabled = false }
  }

  validation {
    condition     = (var.blob_features.immutability_policy.enabled == true && var.blob_features.restore_policy_days == 0) || var.blob_features.immutability_policy.enabled == false
    error_message = "Immutability policy doesn't support Point-in-Time restore."
  }

  validation {
    condition     = var.blob_features.delete_retention_days == 0 || (var.blob_features.delete_retention_days >= 1 && var.blob_features.delete_retention_days <= 365)
    error_message = "Delete retention days must be 0 to disable the policy or between 1 and 365."
  }

  validation {
    condition     = var.blob_features.restore_policy_days == 0 || (var.blob_features.restore_policy_days >= 1 && var.blob_features.restore_policy_days <= 365)
    error_message = "Restore policy days must be 0 to disable the policy or between 1 and 365."
  }
}

variable "network_rules" {
  type = object({
    default_action             = string
    bypass                     = list(string)
    ip_rules                   = list(string)
    virtual_network_subnet_ids = list(string)
  })
  default = {
    default_action             = "Deny"
    bypass                     = []
    ip_rules                   = []
    virtual_network_subnet_ids = []
  }

  description = <<EOT
Defines network rules for the storage account:
- `default_action`: Default action when no rules match ('Deny' or 'Allow').
- `bypass`: Services bypassing restrictions (valid values: 'Logging', 'Metrics', 'AzureServices').
- `ip_rules`: List of IPv4 addresses or CIDR ranges.
- `virtual_network_subnet_ids`: List of subnet resource IDs.
Defaults to denying all traffic unless explicitly allowed.
EOT
}

variable "private_dns_zone_resource_group_name" {
  type        = string
  description = "Resource group for the private DNS zone. Defaults to the virtual network's resource group."
  default     = null
}

variable "action_group_id" {
  type        = string
  description = "ID of the Action Group for alerts. Required for tier 'l'."
  default     = null
}

variable "static_website" {
  type = object({
    enabled            = optional(bool, false)
    index_document     = optional(string, null)
    error_404_document = optional(string, null)
  })
  description = "Configures static website hosting with index and error documents."
  default = {
    enabled            = false
    index_document     = null
    error_404_document = null
  }
}

variable "custom_domain" {
  type = object({
    name          = optional(string, null)
    use_subdomain = optional(bool, false)
  })
  description = "Custom domain configuration for the storage account."
  default = {
    name          = null
    use_subdomain = false
  }
}

variable "secondary_location" {
  type        = string
  description = "Secondary location for geo-redundant storage accounts. Used if `use_case` need a replication_type like GRS or GZRS."
  default     = "spaincentral"
}

variable "replication_container_names" {
  description = "A list of container names to be replicated."
  type        = list(string)
  default     = []
}