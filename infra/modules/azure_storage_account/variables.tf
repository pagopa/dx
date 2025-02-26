# ------------ GENERAL ------------ #
variable "tags" {
  type        = map(any)
  description = "Resources tags"
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
  description = "Resource group to deploy resources to"
}

variable "expiration_days" {
  description = "Number of days after which the resource will be deleted."
  type        = number
  default     = 30

  validation {
    condition     = var.expiration_days >= 0
    error_message = "Expiration days must be greater than or equal to 0."
  }
}

# ------------ STORAGE ACCOUNT ------------ #
variable "tier" {
  type        = string
  description = "Resource tiers depending on demanding workload. Allowed values are 's', 'l'."

  validation {
    condition     = contains(["s", "l"], var.tier)
    error_message = "Allowed values for \"tier\" are \"s\" or \"l\"."
  }
}

variable "subnet_pep_id" {
  type        = string
  description = "Id of the subnet which holds private endpoints"
}

variable "customer_managed_key" {
  type = object({
    enabled                   = optional(bool, false)
    type                      = optional(string, null)
    key_name                  = optional(string, null)
    user_assigned_identity_id = optional(string, null)
    key_vault_id              = optional(string, null)
  })
  description = "(Optional) Customer managed key to use for encryption. Currently type can only be set to 'kv'. If the key vault is in the same tenant, and key_name is not set, the key and relevant permissions will be automatically created."
  default     = { enabled = false }
}

variable "force_public_network_access_enabled" {
  type        = bool
  description = "(Optional) Whether the Storage Account permits public network access or not. Defaults to false."
  default     = false
}

variable "access_tier" {
  type        = string
  description = "(Optional) Access tier of the Storage Account. Defaults to Hot."
  default     = "Hot"
}

variable "subservices_enabled" {
  type = object({
    blob  = optional(bool, true)
    file  = optional(bool, false)
    queue = optional(bool, false)
    table = optional(bool, false)
  })
  description = "(Optional) Subservices enabled for the Storage Account. Creates peps for enabled services. By default, only blob is enabled."
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
  description = "(Optional) Blob features configuration"
  default = {
    restore_policy_days   = 0
    delete_retention_days = 0
    last_access_time      = false
    versioning            = false
    change_feed           = { enabled = false, retention_in_days = 0 }
    immutability_policy   = { enabled = false }
  }

  # https://learn.microsoft.com/en-us/azure/storage/blobs/point-in-time-restore-overview#limitations-and-known-issues
  validation {
    condition     = (var.blob_features.immutability_policy.enabled == true && var.blob_features.restore_policy_days == 0) || var.blob_features.immutability_policy.enabled == false
    error_message = "Immutability policy doesn't support Point-in-Time restore"
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
    default_action             = string       # Specifies the default action of allow or deny when no other rules match. Valid options are Deny or Allow
    bypass                     = list(string) # Specifies whether traffic is bypassed for Logging/Metrics/AzureServices. Valid options are any combination of Logging, Metrics, AzureServices, or None
    ip_rules                   = list(string) # List of public IP or IP ranges in CIDR Format. Only IPV4 addresses are allowed
    virtual_network_subnet_ids = list(string) # A list of resource ids for subnets.
  })
  default = {
    default_action             = "Deny"
    bypass                     = []
    ip_rules                   = []
    virtual_network_subnet_ids = []
  }

  description = "(Optional) Network rules for the Storage Account. If not provided, defaults will be used."
}

variable "private_dns_zone_resource_group_name" {
  type        = string
  description = "(Optional) The name of the resource group holding private DNS zone to use for private endpoints. Default is Virtual Network resource group"
  default     = null
}

variable "action_group_id" {
  type        = string
  description = "(Optional) Set the Action Group Id to invoke when the Storage Account alert triggers. Required when tier is l."
  default     = null
}

variable "static_website" {
  type = object({
    enabled            = optional(bool, false)
    index_document     = optional(string, null)
    error_404_document = optional(string, null)
  })
  description = "(Optional) Static website configuration"

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
  description = "(Optional) Custom domain configuration"
  default = {
    name          = null
    use_subdomain = false
  }
}