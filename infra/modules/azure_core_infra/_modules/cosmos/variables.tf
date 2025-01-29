variable "prefix" {
  type        = string
  description = "env prefix, short environment and short location amd domain"
}

variable "suffix" {
  type        = string
  description = "the instance number"
}

variable "resource_group_name" {
  type        = string
  description = "Resource group name"
}

variable "location" {
  type        = string
  description = "Location"
}

variable "tags" {
  type        = map(any)
  description = "Resources tags"
}

variable "virtual_network" {
  type = object({
    name                = string
    resource_group_name = string
  })
  description = "Virtual network in which to create the subnet"
}

variable "subnet_pep_id" {
  type        = string
  description = "Id of the subnet which holds private endpoints"
}

variable "force_public_network_access_enabled" {
  type        = bool
  description = "(Optional) Whether the Cosmos Account permits public network access or not. Defaults to false."
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