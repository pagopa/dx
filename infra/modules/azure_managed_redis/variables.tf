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
variable "virtual_network" {
  type = object({
    name                = string
    resource_group_name = string
  })
  default = {
    name                = null
    resource_group_name = null
  }
  description = "The virtual network hosting the private endpoint. Required for 'default' and 'high_throughput' use cases, used to locate the 'privatelink.redis.azure.net' DNS zone."

  validation {
    condition     = var.use_case == "development" || (var.virtual_network.name != null && var.virtual_network.resource_group_name != null)
    error_message = "virtual_network.name and virtual_network.resource_group_name are required when use_case is 'default' or 'high_throughput'."
  }
}

variable "private_dns_zone_resource_group_name" {
  type        = string
  description = "The resource group name containing the 'privatelink.redis.azure.net' private DNS zone. Defaults to the virtual network resource group."
  default     = null
}

# ------------ REDIS ------------ #
variable "use_case" {
  type        = string
  description = "DX preset for Azure Managed Redis. Allowed values are 'default', 'development', and 'high_throughput'. Drives SKU, high availability, persistence, diagnostics, alerts, lock, and public network access."
  default     = "default"

  validation {
    condition     = contains(["default", "development", "high_throughput"], var.use_case)
    error_message = "Allowed values for use_case are 'default', 'development', and 'high_throughput'."
  }
}

variable "sku_name_override" {
  type        = string
  description = "Optional explicit SKU name override. Only Balanced_* and ComputeOptimized_* SKUs are supported."
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
    ], var.sku_name_override)
    error_message = "sku_name_override must be a supported Balanced_* or ComputeOptimized_* SKU."
  }
}

variable "database" {
  description = "Advanced configuration for the default database. All fields are optional and fall back to the use_case preset."
  type = object({
    client_protocol   = optional(string, null)
    clustering_policy = optional(string, null)
    eviction_policy   = optional(string, null)
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
    condition     = try(var.database.clustering_policy, null) == null || contains(["EnterpriseCluster", "OSSCluster"], var.database.clustering_policy)
    error_message = "database.clustering_policy must be null, 'EnterpriseCluster', or 'OSSCluster'."
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
    condition = alltrue([
      for m in try(var.database.modules, []) : contains([
        "RediSearch",
        "RedisJSON",
        "RedisBloom",
        "RedisTimeSeries"
      ], m.name)
    ])
    error_message = "database.modules[*].name must be one of RediSearch, RedisJSON, RedisBloom, or RedisTimeSeries."
  }
}

# ------------ OBSERVABILITY ------------ #
variable "log_analytics_workspace_id" {
  type        = string
  description = "The ID of the Log Analytics workspace to send diagnostics to. Required unless use_case is 'development'."
  default     = null

  validation {
    condition     = var.use_case == "development" || var.log_analytics_workspace_id != null
    error_message = "log_analytics_workspace_id is required when use_case is 'default' or 'high_throughput'."
  }
}

variable "alerts" {
  description = "Metric alert configuration. Alerts are enabled by default for 'default' and 'high_throughput' use cases with sensible thresholds."
  type = object({
    action_group_id = optional(string, null)
    thresholds = optional(object({
      used_memory_percentage = optional(number, 60)
      connected_clients      = optional(number, 5000)
      server_load            = optional(number, 60)
      cache_misses           = optional(number, 1000)
    }), {})
  })
  default = {}
}
