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

  description = "Values used to generate resource names and derive short location names."
}

variable "resource_group_name" {
  type        = string
  description = "The name of the resource group where resources will be deployed."
}

# ------------ NETWORK ------------ #
variable "subnet_pep_id" {
  type        = string
  description = "The ID of the subnet used for the private endpoint. Required unless public network access is enabled."
  default     = null

  validation {
    condition     = var.force_public_network_access_enabled || var.subnet_pep_id != null
    error_message = "subnet_pep_id is required when force_public_network_access_enabled is false."
  }
}

variable "private_dns_zone_resource_group_name" {
  type        = string
  description = "The resource group name containing the Managed Redis private DNS zone. Defaults to the subnet resource group."
  default     = null
}

variable "force_public_network_access_enabled" {
  type        = bool
  description = "Whether public network access should be enabled."
  default     = false
}

# ------------ REDIS ------------ #
variable "use_case" {
  type        = string
  description = "Specifies the DX preset for Azure Managed Redis. Allowed values are 'default', 'development', and 'high_throughput'."
  default     = "default"

  validation {
    condition     = contains(["default", "development", "high_throughput"], var.use_case)
    error_message = "Allowed values for use_case are 'default', 'development', and 'high_throughput'."
  }
}

variable "sku_name_override" {
  type        = string
  description = "Optional explicit SKU name override for Azure Managed Redis."
  default     = null

  validation {
    condition = var.sku_name_override == null || contains([
      "Balanced_B0",
      "Balanced_B1",
      "Balanced_B3",
      "Balanced_B5",
      "Balanced_B10",
      "Balanced_B20",
      "Balanced_B50",
      "Balanced_B100",
      "Balanced_B150",
      "Balanced_B250",
      "Balanced_B350",
      "Balanced_B500",
      "Balanced_B700",
      "Balanced_B1000",
      "ComputeOptimized_X3",
      "ComputeOptimized_X5",
      "ComputeOptimized_X10",
      "ComputeOptimized_X20",
      "ComputeOptimized_X50",
      "ComputeOptimized_X100",
      "ComputeOptimized_X150",
      "ComputeOptimized_X250",
      "ComputeOptimized_X350",
      "ComputeOptimized_X500",
      "ComputeOptimized_X700",
      "FlashOptimized_A250",
      "FlashOptimized_A500",
      "FlashOptimized_A700",
      "FlashOptimized_A1000",
      "FlashOptimized_A1500",
      "FlashOptimized_A2000",
      "FlashOptimized_A4500",
      "MemoryOptimized_M10",
      "MemoryOptimized_M20",
      "MemoryOptimized_M50",
      "MemoryOptimized_M100",
      "MemoryOptimized_M150",
      "MemoryOptimized_M250",
      "MemoryOptimized_M350",
      "MemoryOptimized_M500",
      "MemoryOptimized_M700",
      "MemoryOptimized_M1000",
      "MemoryOptimized_M1500",
      "MemoryOptimized_M2000"
    ], var.sku_name_override)
    error_message = "sku_name_override must be a supported Azure Managed Redis SKU."
  }
}

variable "access_keys_authentication_enabled" {
  type        = bool
  description = "Whether access key authentication should be enabled on the default database. Defaults to false to prefer Microsoft Entra authentication."
  default     = false
}

variable "authorized_teams" {
  type = object({
    data_owners = optional(list(string), [])
  })
  description = "Lists of principal IDs to be granted data owner access to the default database."
  default     = {}
}

variable "database" {
  description = "Advanced configuration for the default Azure Managed Redis database."
  type = object({
    client_protocol   = optional(string, null)
    clustering_policy = optional(string, null)
    eviction_policy   = optional(string, null)
    persistence = optional(object({
      mode      = optional(string, null)
      frequency = optional(string, null)
    }), {})
    modules = optional(list(object({
      name = string
      args = optional(string, null)
    })), [])
  })
  default = {}

  validation {
    condition     = try(var.database.client_protocol, null) == null || contains(["Encrypted", "Plaintext"], var.database.client_protocol)
    error_message = "database.client_protocol must be null, 'Encrypted', or 'Plaintext'."
  }

  validation {
    condition     = try(var.database.clustering_policy, null) == null || contains(["EnterpriseCluster", "OSSCluster", "NoCluster"], var.database.clustering_policy)
    error_message = "database.clustering_policy must be null, 'EnterpriseCluster', 'OSSCluster', or 'NoCluster'."
  }

  validation {
    condition = try(var.database.eviction_policy, null) == null || contains([
      "AllKeysLFU",
      "AllKeysLRU",
      "AllKeysRandom",
      "VolatileLRU",
      "VolatileLFU",
      "VolatileTTL",
      "VolatileRandom",
      "NoEviction"
    ], var.database.eviction_policy)
    error_message = "database.eviction_policy must be null or a supported Azure Managed Redis eviction policy."
  }

  validation {
    condition     = try(var.database.persistence.mode, null) == null || contains(["disabled", "rdb", "aof"], var.database.persistence.mode)
    error_message = "database.persistence.mode must be null, 'disabled', 'rdb', or 'aof'."
  }

  validation {
    condition     = try(var.database.persistence.mode, null) != "disabled" || try(var.database.persistence.frequency, null) == null
    error_message = "database.persistence.frequency must be null when database.persistence.mode is 'disabled'."
  }

  validation {
    condition = try(var.database.persistence.mode, null) != "rdb" || contains([
      "1h",
      "6h",
      "12h"
    ], try(var.database.persistence.frequency, ""))
    error_message = "database.persistence.frequency must be one of '1h', '6h', or '12h' when database.persistence.mode is 'rdb'."
  }

  validation {
    condition     = try(var.database.persistence.mode, null) != "aof" || try(var.database.persistence.frequency, null) == "1s"
    error_message = "database.persistence.frequency must be '1s' when database.persistence.mode is 'aof'."
  }

  validation {
    condition = alltrue([
      for module in try(var.database.modules, []) : contains([
        "RediSearch",
        "RedisJSON",
        "RedisBloom",
        "RedisTimeSeries"
      ], module.name)
    ])
    error_message = "database.modules[*].name must be one of RediSearch, RedisJSON, RedisBloom, or RedisTimeSeries."
  }

  validation {
    condition     = !var.geo_replication.enabled || try(var.database.persistence.mode, null) == null || var.database.persistence.mode == "disabled"
    error_message = "Persistence cannot be enabled when geo_replication.enabled is true."
  }

  validation {
    condition = !var.geo_replication.enabled || alltrue([
      for module in try(var.database.modules, []) : contains([
        "RediSearch",
        "RedisJSON"
      ], module.name)
    ])
    error_message = "Only RediSearch and RedisJSON modules are supported when geo_replication.enabled is true."
  }
}

variable "geo_replication" {
  description = "Geo-replication configuration for the default database."
  type = object({
    enabled                  = optional(bool, false)
    group_name               = optional(string, null)
    linked_managed_redis_ids = optional(list(string), [])
  })
  default = {}

  validation {
    condition     = !var.geo_replication.enabled || try(var.geo_replication.group_name, null) != null
    error_message = "geo_replication.group_name is required when geo_replication.enabled is true."
  }

  validation {
    condition     = length(try(var.geo_replication.linked_managed_redis_ids, [])) <= 4
    error_message = "geo_replication.linked_managed_redis_ids can contain at most 4 Managed Redis IDs."
  }
}

variable "identity" {
  description = "Optional managed identity configuration for the Managed Redis instance."
  type = object({
    type         = string
    identity_ids = optional(list(string), [])
  })
  default = null

  validation {
    condition = var.identity == null || contains([
      "SystemAssigned",
      "UserAssigned",
      "SystemAssigned, UserAssigned"
    ], var.identity.type)
    error_message = "identity.type must be 'SystemAssigned', 'UserAssigned', or 'SystemAssigned, UserAssigned'."
  }

  validation {
    condition = var.identity == null || !contains([
      "UserAssigned",
      "SystemAssigned, UserAssigned"
    ], var.identity.type) || length(try(var.identity.identity_ids, [])) > 0
    error_message = "identity.identity_ids must contain at least one value when identity.type uses UserAssigned."
  }
}

variable "customer_managed_key" {
  description = "Customer-managed key configuration for Azure Managed Redis."
  type = object({
    enabled                   = optional(bool, false)
    key_vault_key_id          = optional(string, null)
    user_assigned_identity_id = optional(string, null)
  })
  default = {}

  validation {
    condition = (
      !try(var.customer_managed_key.enabled, false)
      || (
        try(var.customer_managed_key.key_vault_key_id, null) != null
        && try(var.customer_managed_key.user_assigned_identity_id, null) != null
      )
    )
    error_message = "customer_managed_key.key_vault_key_id and customer_managed_key.user_assigned_identity_id are required when customer_managed_key.enabled is true."
  }
}

# ------------ OBSERVABILITY ------------ #
variable "diagnostic_settings" {
  description = "Diagnostic settings configuration for the Managed Redis instance."
  type = object({
    enabled                                   = optional(bool, false)
    log_analytics_workspace_id                = optional(string, null)
    diagnostic_setting_destination_storage_id = optional(string, null)
  })
  default = {}

  validation {
    condition = (
      !try(var.diagnostic_settings.enabled, false)
      || (
        try(var.diagnostic_settings.log_analytics_workspace_id, null) != null
        || try(var.diagnostic_settings.diagnostic_setting_destination_storage_id, null) != null
      )
    )
    error_message = "At least one diagnostic settings destination must be configured when diagnostic_settings.enabled is true."
  }
}

variable "alerts" {
  description = "Metric alert configuration for the Managed Redis instance."
  type = object({
    enabled         = optional(bool, null)
    action_group_id = optional(string, null)
    thresholds = optional(object({
      used_memory_percentage = optional(number, null)
      connected_clients      = optional(number, null)
      server_load            = optional(number, null)
      cache_misses           = optional(number, null)
    }), {})
  })
  default = {}
}

variable "enable_lock" {
  type        = bool
  description = "Overrides whether a management lock should be created. Defaults to the selected use case behavior."
  default     = null
}
