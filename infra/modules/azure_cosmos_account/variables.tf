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

# ------------ COSMOS ------------ #
variable "subnet_pep_id" {
  type        = string
  description = "Id of the subnet which holds private endpoints"
}

variable "private_dns_zone_resource_group_name" {
  type        = string
  description = "(Optional) The name of the resource group holding private DNS zone to use for private endpoints. Default is Virtual Network resource group"
  default     = null
}

variable "primary_geo_location" {
  type = object({
    location       = optional(string, null)
    zone_redundant = optional(bool, true)
  })
  description = "Primary geo location for Cosmos DB account. Set location if you want to deploy the cosmos account in a different region than the default."

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
  description = "(Optional) Secondary geo locations for Cosmos DB account. Failover priority determines the order in which regions will take over in case of a regional outage. If failover priority is not set, the items order is used."
  default     = []
}

variable "customer_managed_key" {
  type = object({
    enabled                   = optional(bool, false)
    user_assigned_identity_id = optional(string, null)
    key_vault_key_id          = optional(string, null)
  })
  description = "(Optional) Customer managed key to use for encryption"
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
  description = "(Optional) Whether the Storage Account permits public network access or not. Defaults to false."
  default     = false
}

variable "consistency_policy" {
  description = "Defines the consistency policy for CosmosDB. This setting is highly dependant on the way the application uses the database. Please refer to the documentation to make the right choice https://learn.microsoft.com/en-us/azure/cosmos-db/consistency-levels."
  type = object({
    consistency_level       = string
    max_interval_in_seconds = optional(number)
    max_staleness_prefix    = optional(number)
  })

  validation {
    condition     = contains(["BoundedStaleness", "Eventual", "Session", "Strong", "ConsistentPrefix"], var.consistency_policy.consistency_level)
    error_message = "The 'consistency_level' must be one of 'BoundedStaleness', 'Eventual', 'Session', 'Strong', or 'ConsistentPrefix'."
  }

  validation {
    condition = (
      var.consistency_policy.consistency_level != "BoundedStaleness" ||
      (var.consistency_policy.max_interval_in_seconds != null && var.consistency_policy.max_interval_in_seconds >= 5 && var.consistency_policy.max_interval_in_seconds <= 86400)
    )
    error_message = "The 'max_interval_in_seconds' must be between 5 and 86400 when 'consistency_level' is 'BoundedStaleness'."
  }

  validation {
    condition = (
      var.consistency_policy.consistency_level != "BoundedStaleness" ||
      (var.consistency_policy.max_staleness_prefix != null && var.consistency_policy.max_staleness_prefix >= 10 && var.consistency_policy.max_staleness_prefix <= 2147483647)
    )
    error_message = "The 'max_staleness_prefix' must be between 10 and 2147483647 when 'consistency_level' is 'BoundedStaleness'."
  }
}

variable "alerts" {
  type = object({
    enabled         = optional(bool, true)
    action_group_id = optional(string, null)
    thresholds = optional(object({
      provisioned_throughput_exceeded = optional(number, null)
    }), {})
  })
  description = "(Optional) Alerts configuration for Cosmos DB account."
  default     = { enabled = true }

  validation {
    condition = var.alerts.enabled && (
      alltrue([for threshold in var.alerts.thresholds : threshold != null])
    )
    error_message = "When alerts are enabled, all thresholds must be set."
  }
}
