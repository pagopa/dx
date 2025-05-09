# ------------ GENERAL ------------ #
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

# ------------ COSMOS ------------ #
variable "subnet_pep_id" {
  type        = string
  description = "The ID of the subnet designated for private endpoints."
}

variable "tier" {
  type        = string
  description = "The offer type for the Cosmos DB account. Valid values are 's' and 'l'."
  default     = "l"

  validation {
    condition     = contains(["s", "l"], var.tier)
    error_message = "Valid values for tier are 's' and 'l'."
  }

}

variable "private_dns_zone_resource_group_name" {
  type        = string
  description = "The name of the resource group containing the private DNS zone for private endpoints. Defaults to the Virtual Network resource group."
  default     = null
}

variable "primary_geo_location" {
  type = object({
    location       = optional(string, null)
    zone_redundant = optional(bool, true)
  })
  description = "The primary geo-location for the Cosmos DB account. Specify 'location' to deploy the account in a region other than the default."

  default = {
    location       = null
    zone_redundant = true
  }
}

variable "secondary_geo_locations" {
  type = list(object({
    location          = optional(string, null)
    failover_priority = optional(number, null)
    zone_redundant    = optional(bool, true)
  }))
  description = "Secondary geo locations for Cosmos DB account. Failover priority determines the order in which regions will take over in case of a regional outage. If failover priority is not set, the items order is used."
  default     = []
}

variable "customer_managed_key" {
  type = object({
    enabled                   = optional(bool, false)
    user_assigned_identity_id = optional(string, null)
    key_vault_key_id          = optional(string, null)
  })
  description = "Customer managed key to use for encryption"
  default     = { enabled = false }

  validation {
    condition = (
      (!var.customer_managed_key.enabled) ||
      (var.customer_managed_key.enabled && var.customer_managed_key.user_assigned_identity_id != null && var.customer_managed_key.key_vault_key_id != null)
    )
    error_message = "Either 'user_assigned_identity_id' or 'key_vault_key_id' must be provided when 'enabled' is set to true."
  }
}

variable "force_public_network_access_enabled" {
  type        = bool
  description = "Specifies whether public network access is allowed for the Cosmos DB account. Defaults to false."
  default     = false
}

variable "consistency_policy" {
  description = "Defines the consistency policy for CosmosDB. Use 'consistency_preset' for predefined configurations, or set it to 'custom' for manual configuration. Presets include: 'default' (Session consistency), 'high_consistency' (Strong), 'high_performance' (Eventual), and 'balanced_staleness' (BoundedStaleness). For custom configuration, specify 'consistency_level' and, if using BoundedStaleness, 'max_interval_in_seconds' and 'max_staleness_prefix'. Refer to https://learn.microsoft.com/en-us/azure/cosmos-db/consistency-levels for more details."
  type = object({
    consistency_preset      = optional(string)
    consistency_level       = optional(string, "Preset")
    max_interval_in_seconds = optional(number, 0)
    max_staleness_prefix    = optional(number, 0)
  })

  validation {
    condition     = contains(["Default", "HighConsistency", "HighPerformance", "BalancedStaleness", "Custom"], var.consistency_policy.consistency_preset)
    error_message = "Valid values for consistency_preset are: Default, HighConsistency, HighPerformance, BalancedStaleness, Custom."
  }

  validation {
    condition     = var.consistency_policy.consistency_preset != "Custom" || contains(["BoundedStaleness", "Eventual", "Session", "Strong", "ConsistentPrefix"], var.consistency_policy.consistency_level)
    error_message = "When consistency_preset is 'Custom', consistency_level must be one of 'BoundedStaleness', 'Eventual', 'Session', 'Strong', or 'ConsistentPrefix'."
  }

  validation {
    condition = (
      var.consistency_policy.consistency_level != "BoundedStaleness" ||
      (var.consistency_policy.max_interval_in_seconds != null && var.consistency_policy.max_interval_in_seconds >= 5 && var.consistency_policy.max_interval_in_seconds <= 86400)
    )
    error_message = "When consistency_level is 'BoundedStaleness', max_interval_in_seconds must be between 5 and 86400."
  }

  validation {
    condition = (
      var.consistency_policy.consistency_level != "BoundedStaleness" ||
      (var.consistency_policy.max_staleness_prefix != null && var.consistency_policy.max_staleness_prefix >= 10 && var.consistency_policy.max_staleness_prefix <= 2147483647)
    )
    error_message = "When consistency_level is 'BoundedStaleness', max_staleness_prefix must be between 10 and 2147483647."
  }
}

variable "alerts" {
  type = object({
    enabled         = bool
    action_group_id = optional(string, null)
    thresholds = optional(object({
      provisioned_throughput_exceeded = optional(number, null)
    }), {})
  })
  description = "Alerts configuration for Cosmos DB account."
  default     = { enabled = true }

  validation {
    condition = (var.alerts.enabled && (
      alltrue([for threshold in var.alerts.thresholds : threshold != null])) || !var.alerts.enabled
    )
    error_message = "When alerts are enabled, all thresholds must be set."
  }
}

variable "authorized_principal_ids" {
  type        = list(string)
  description = "A list of principal IDs (users, groups, or managed identities) to be granted specific permissions on the Cosmos DB account."
  default     = []
}