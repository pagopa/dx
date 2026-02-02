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

# @deprecated This variable will be removed in the next major version.
# Infrastructure encryption should be managed through proper use case configuration instead of overrides.
variable "override_infrastructure_encryption" {
  type        = bool
  description = "When set to true, disables infrastructure encryption even if the use case configuration would enable it. Useful for audit use case to prevent storage account recreation when infrastructure encryption was enabled by default."
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

  validation {
    condition     = var.use_case != "audit" || var.override_infrastructure_encryption || var.subservices_enabled.blob || var.subservices_enabled.file
    error_message = "When use_case is 'audit' with infrastructure encryption enabled (default), at least one of 'blob' or 'file' subservices must be enabled. Set override_infrastructure_encryption to true to bypass this requirement."
  }
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
      state                         = optional(string, null)
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
    condition     = try(var.blob_features.immutability_policy.state, null) == null ? true : contains(["Locked", "Unlocked"], var.blob_features.immutability_policy.state)
    error_message = "Immutability policy state must be either 'Locked' or 'Unlocked'. Note: Locking is irreversible and prevents account deletion."
  }

  validation {
    condition     = var.blob_features.delete_retention_days == 0 || (var.blob_features.delete_retention_days >= 1 && var.blob_features.delete_retention_days <= 365)
    error_message = "Delete retention days must be 0 to disable the policy or between 1 and 365."
  }

  validation {
    condition     = var.blob_features.restore_policy_days == 0 || (var.blob_features.restore_policy_days >= 1 && var.blob_features.restore_policy_days <= 365)
    error_message = "Restore policy days must be 0 to disable the policy or between 1 and 365."
  }

  validation {
    condition     = !contains(["archive", "audit"], var.use_case) || (var.blob_features.delete_retention_days == 0 && var.blob_features.restore_policy_days == 0)
    error_message = "For 'archive' and 'audit' use cases, delete_retention_days and restore_policy_days must be 0."
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
  default     = null

  validation {
    condition     = ((var.secondary_location != var.environment.location) && local.tier_features.secondary_replication == true) || local.tier_features.secondary_replication == false
    error_message = "'secondary_location' must be different from 'environment.location'."
  }
}

variable "containers" {
  description = "Containers to be created."
  type = list(object({
    name        = string
    access_type = optional(string, "private")
    immutability_policy = optional(object({
      period_in_days = number
      locked         = optional(bool, false)
    }), null)
  }))

  default = []

  validation {
    condition     = alltrue([for c in var.containers : contains(["private", "blob", "container"], c.access_type)])
    error_message = "Container access_type must be one of 'private', 'blob', or 'container'."
  }

  validation {
    condition = alltrue([
      for c in var.containers :
      c.immutability_policy == null ? true : (
        try(c.immutability_policy.period_in_days, 0) >= 1 &&
        try(c.immutability_policy.period_in_days, 0) <= 146000
      )
    ])
    error_message = "Container immutability policy period must be between 1 and 146000 days (400 years)."
  }
}

variable "tables" {
  description = "Tables to be created."
  type        = list(string)
  default     = []
}

variable "queues" {
  description = "Queues to be created."
  type        = list(string)
  default     = []
}

# ------------ MONITORING & COMPLIANCE ------------ #
variable "diagnostic_settings" {
  type = object({
    enabled                    = bool
    log_analytics_workspace_id = optional(string, null)
    storage_account_id         = optional(string, null)
  })
  description = "Diagnostic settings for access logging (control and data plane). Mandatory for audit use case to track all access operations."
  default = {
    enabled                    = false
    log_analytics_workspace_id = null
  }

  validation {
    condition     = var.use_case != "audit" || (var.diagnostic_settings.enabled && var.diagnostic_settings.log_analytics_workspace_id != null)
    error_message = "Diagnostic settings with log_analytics_workspace_id must be enabled for audit use case to ensure compliance with access logging requirements."
  }
}

variable "audit_retention_days" {
  type        = number
  description = "Number of days to retain audit logs before automatic deletion. PagoPA standard is 365 days (12 months). Must be between 90 and 3650 days. Only applies to the 'audit' use case. Default is 365 days (1 year)."
  default     = 365

  validation {
    condition     = var.audit_retention_days >= 90 && var.audit_retention_days <= 3650
    error_message = "Retention period must be between 90 days and 10 years (3650 days)."
  }
}
