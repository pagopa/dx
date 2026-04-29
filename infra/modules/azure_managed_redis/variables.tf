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
variable "virtual_network_id" {
  type        = string
  default     = null
  description = "The resource ID of the virtual network hosting the private endpoint. Required when use_case is 'default'; used to locate the 'privatelink.redis.azure.net' DNS zone."

  validation {
    condition     = var.use_case == "development" || var.virtual_network_id != null
    error_message = "virtual_network_id is required when use_case is 'default'."
  }

  validation {
    condition     = var.virtual_network_id == null || can(regex("^/subscriptions/[^/]+/resourceGroups/[^/]+/providers/Microsoft\\.Network/virtualNetworks/[^/]+$", var.virtual_network_id))
    error_message = "virtual_network_id must be a valid Microsoft.Network/virtualNetworks resource ID."
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
  description = "DX preset for Azure Managed Redis. Allowed values are 'default' and 'development'. Drives SKU, high availability, persistence, diagnostics, alerts, lock, and public network access. To scale beyond the default SKU (e.g. ComputeOptimized for high-throughput workloads), set sku_name_override."
  default     = "default"

  validation {
    condition     = contains(["default", "development"], var.use_case)
    error_message = "Allowed values for use_case are 'default' and 'development'."
  }
}

variable "sku_name_override" {
  type        = string
  description = "Optional explicit SKU name override. Only Balanced_* and ComputeOptimized_* SKUs are supported. Balanced_B0 is restricted to the 'development' use_case because it does not support HA or data persistence."
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

  validation {
    condition     = var.sku_name_override != "Balanced_B0" || var.use_case == "development"
    error_message = "Balanced_B0 does not support high availability or data persistence and is only allowed when use_case is 'development'."
  }
}

# ------------ OBSERVABILITY ------------ #
variable "log_analytics_workspace_id" {
  type        = string
  description = "The ID of the Log Analytics workspace to send diagnostics to. Required when use_case is 'default'."
  default     = null

  validation {
    condition     = var.use_case == "development" || var.log_analytics_workspace_id != null
    error_message = "log_analytics_workspace_id is required when use_case is 'default'."
  }
}

variable "alerts" {
  description = "Metric alert configuration. Alerts are enabled by default for the 'default' use case with sensible thresholds."
  type = object({
    action_group_id = optional(string, null)
    thresholds = optional(object({
      used_memory_percentage          = optional(number, 75)
      used_memory_percentage_critical = optional(number, 90)
      server_load                     = optional(number, 80)
      server_load_critical            = optional(number, 90)
      evicted_keys                    = optional(number, 0)
      connected_clients               = optional(number, null)
    }), {})
  })
  default = {}
}
