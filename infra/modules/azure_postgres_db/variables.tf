#---------#
# General #
#---------#

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
    db_name         = string
    instance_number = string
  })

  validation {
    condition     = length("${var.environment.prefix}${var.environment.env_short}reg${var.environment.domain == null ? "" : replace(var.environment.domain, "-", "")}${var.environment.db_name}stfn${var.environment.instance_number}") <= 24
    error_message = "Storage Account name must have less than 25 characters. Current value is \"${var.environment.prefix}${var.environment.env_short}reg${var.environment.domain == null ? "" : var.environment.domain}${var.environment.db_name}st${var.environment.instance_number}\""
  }

  description = "Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains."
}

variable "resource_group_name" {
  type        = string
  description = "Resource group to deploy resources to"
}

variable "db_version" {
  type        = number
  description = "(Required) The version of PostgreSQL Flexible Server to use. Possible values are 11, 12, 13, 14, 15 and 16"
}

variable "is_replica" {
  type        = bool
  description = "If DB is a replica set set true else false"
  default     = false
}

#------------#
# Networking #
#------------#
variable "private_endpoint_enabled" {
  type        = bool
  description = "If DB is private endpoint enabled set true else false"
  default     = false
}

variable "virtual_network" {
  type = object({
    name                = string
    resource_group_name = string
  })
  description = "Virtual network in which to create the subnet"
}

variable "subnet_id" {
  type        = string
  description = "Subnet ID in which to create the PostgreSQL Flexible Server. If not provided, a new subnet will be created in the virtual network"
  default     = null
}

variable "subnet_cidr" {
  type        = string
  description = "CIDR block to use for the subnet the Function App uses for outbound connectivity"
  default     = null
}

variable "subnet_service_endpoints" {
  type = object({
    cosmos  = optional(bool, false)
    storage = optional(bool, false)
    web     = optional(bool, false)
  })
  description = "(Optional) Enable service endpoints for the underlying subnet. This variable should be set only if function dependencies do not use private endpoints"
  default     = null
}

variable "private_dns_zone_id" {
  type        = string
  default     = null
  description = "(Optional) The ID of the private dns zone to create the PostgreSQL Flexible Server. Changing this forces a new PostgreSQL Flexible Server to be created."
}

variable "public_network_access_enabled" {
  type        = bool
  default     = false
  description = "(Optional) Specifies whether this PostgreSQL Flexible Server is publicly accessible."
}

variable "private_dns_registration" {
  type        = bool
  default     = false
  description = "(Optional) If true, creates a cname record for the newly created postgreSQL db fqdn into the provided private dns zone"
}

variable "private_dns_zone_name" {
  type        = string
  default     = null
  description = "(Optional) if 'private_dns_registration' is true, defines the private dns zone name in which the server fqdn should be registered"
}

variable "private_dns_zone_rg_name" {
  type        = string
  default     = null
  description = "(Optional) if 'private_dns_registration' is true, defines the private dns zone resource group name of the dns zone in which the server fqdn should be registered"
}

variable "private_dns_record_cname" {
  type        = string
  default     = null
  description = "(Optional) if 'private_dns_registration' is true, defines the private dns CNAME used to register this server FQDN"
}

variable "private_dns_cname_record_ttl" {
  type        = number
  default     = 300
  description = "(Optional) if 'private_dns_registration' is true, defines the record TTL"
}

#-------------------#
# High Availability #
#-------------------#

variable "high_availability_enabled" {
  type        = bool
  description = "(Required) Is the High Availability Enabled"
}

variable "standby_availability_zone" {
  type        = number
  default     = null
  description = "(Optional) Specifies the Availability Zone in which the standby Flexible Server should be located."
}

variable "maintenance_window_config" {
  type = object({
    day_of_week  = number
    start_hour   = number
    start_minute = number
  })

  default = {
    day_of_week  = 3
    start_hour   = 2
    start_minute = 0
  }

  description = "(Optional) Allows the configuration of the maintenance window, if not configured default is Wednesday@2.00am"

}

#----------------#
# Administration #
#----------------#

variable "tier" {
  type        = string
  description = "Resource tiers depending on demanding workload. Allowed values are 'b', 'gp', 'mo' -> 'burstable', 'general_purpose', 'memory_optimized'."
  default     = "premium"

  validation {
    condition     = contains(["b", "gp", "mo"], var.tier)
    error_message = "Allowed values for \"tier\" are \"b\", \"gp\", or \"mo\"."
  }
}

variable "storage_mb" {
  type        = number
  description = "The max storage allowed for the PostgreSQL Flexible Server. Possible values are 32768, 65536, 131072, 262144, 524288, 1048576, 2097152, 4194304, 8388608, 16777216, and 33554432."
  default     = 32768
}

variable "customer_managed_key_enabled" {
  type        = bool
  description = "enable customer_managed_key"
  default     = false
}

variable "customer_managed_key_kv_key_id" {
  type        = string
  description = "The ID of the Key Vault Key"
  default     = null
}

variable "administrator_credentials" {
  type = object({
    name     = string
    password = string
  })
  description = "Flexible PostgreSql server administrator credentials (Only for tests)"
}

#--------#
# Backup #
#--------#

variable "backup_retention_days" {
  type        = number
  description = "(Optional) The backup retention days for the PostgreSQL Flexible Server. Possible values are between 7 and 35 days."
  default     = 7
}

variable "geo_redundant_backup_enabled" {
  type        = bool
  description = "(Optional) Is Geo-Redundant backup enabled on the PostgreSQL Flexible Server. Defaults to false"
  default     = false
}

variable "create_mode" {
  type        = string
  description = "(Optional) The creation mode. Can be used to restore or replicate existing servers. Possible values are Default, Replica, GeoRestore, and PointInTimeRestore"
  default     = "Default"
}

variable "zone" {
  type        = number
  description = "(Optional) Specifies the Availability Zone in which the PostgreSQL Flexible Server should be located."
  default     = null
}

variable "primary_user_assigned_identity_id" {
  type        = string
  description = "Manages a User Assigned Identity"
  default     = null
}

#-------------------#
# DB Configurations #
#-------------------#

variable "pgbouncer_enabled" {
  type        = bool
  default     = true
  description = "Is PgBouncer enabled into configurations?"
}

#------------#
# Monitoring #
#------------#

variable "custom_metric_alerts" {
  default = null

  description = <<EOD
  Map of name = criteria objects
  EOD

  type = map(object({
    # criteria.*.aggregation to be one of [Average Count Minimum Maximum Total]
    aggregation = string
    metric_name = string
    # "Insights.Container/pods" "Insights.Container/nodes"
    metric_namespace = string
    # criteria.0.operator to be one of [Equals NotEquals GreaterThan GreaterThanOrEqual LessThan LessThanOrEqual]
    operator  = string
    threshold = number
    # Possible values are PT1M, PT5M, PT15M, PT30M and PT1H
    frequency = string
    # Possible values are PT1M, PT5M, PT15M, PT30M, PT1H, PT6H, PT12H and P1D.
    window_size = string
    # severity: The severity of this Metric Alert. Possible values are 0, 1, 2, 3 and 4. Defaults to 3.
    severity = number
  }))
}

variable "default_metric_alerts" {

  description = <<EOD
  Map of name = criteria objects
  EOD

  type = map(object({
    # criteria.*.aggregation to be one of [Average Count Minimum Maximum Total]
    aggregation = string
    metric_name = string
    # "Insights.Container/pods" "Insights.Container/nodes"
    metric_namespace = string
    # criteria.0.operator to be one of [Equals NotEquals GreaterThan GreaterThanOrEqual LessThan LessThanOrEqual]
    operator  = string
    threshold = number
    # Possible values are PT1M, PT5M, PT15M, PT30M and PT1H
    frequency = string
    # Possible values are PT1M, PT5M, PT15M, PT30M, PT1H, PT6H, PT12H and P1D.
    window_size = string
    # severity: The severity of this Metric Alert. Possible values are 0, 1, 2, 3 and 4. Defaults to 3.
    severity = number
  }))

  default = {
    cpu_percent = {
      frequency        = "PT5M"
      window_size      = "PT30M"
      metric_namespace = "Microsoft.DBforPostgreSQL/flexibleServers"
      aggregation      = "Average"
      metric_name      = "cpu_percent"
      operator         = "GreaterThan"
      threshold        = 80
      severity         = 2
    },
    memory_percent = {
      frequency        = "PT5M"
      window_size      = "PT30M"
      metric_namespace = "Microsoft.DBforPostgreSQL/flexibleServers"
      aggregation      = "Average"
      metric_name      = "memory_percent"
      operator         = "GreaterThan"
      threshold        = 80
      severity         = 2
    },
    storage_percent = {
      frequency        = "PT5M"
      window_size      = "PT30M"
      metric_namespace = "Microsoft.DBforPostgreSQL/flexibleServers"
      aggregation      = "Average"
      metric_name      = "storage_percent"
      operator         = "GreaterThan"
      threshold        = 80
      severity         = 2
    },
    active_connections = {
      frequency        = "PT5M"
      window_size      = "PT30M"
      metric_namespace = "Microsoft.DBforPostgreSQL/flexibleServers"
      aggregation      = "Average"
      metric_name      = "active_connections"
      operator         = "GreaterThan"
      threshold        = 80
      severity         = 2
    },
    connections_failed = {
      frequency        = "PT5M"
      window_size      = "PT30M"
      metric_namespace = "Microsoft.DBforPostgreSQL/flexibleServers"
      aggregation      = "Total"
      metric_name      = "connections_failed"
      operator         = "GreaterThan"
      threshold        = 80
      severity         = 2
    }
  }
}

variable "alerts_enabled" {
  type        = bool
  default     = false
  description = "Define if alerts should be enabled."
}

variable "alert_action" {
  description = "The ID of the Action Group and optional map of custom string properties to include with the post webhook operation."
  type = set(object(
    {
      action_group_id    = string
      webhook_properties = map(string)
    }
  ))
  default = []
}

variable "diagnostic_settings" {
  type = object({
    enabled                                   = bool
    log_analytics_workspace_id                = string
    diagnostic_setting_destination_storage_id = string
  })
  default = {
    enabled                                   = false
    log_analytics_workspace_id                = null
    diagnostic_setting_destination_storage_id = null
  }
  description = <<-EOT
    Define if diagnostic settings should be enabled.
    if it is:
    Specifies the ID of a Log Analytics Workspace where Diagnostics Data should be sent and 
    the ID of the Storage Account where logs should be sent. (Changing this forces a new resource to be created)
  EOT

  validation {
    condition = (
      !(var.diagnostic_settings.enabled)
      || (
        var.diagnostic_settings.log_analytics_workspace_id != null
        && var.diagnostic_settings.diagnostic_setting_destination_storage_id != null
      )
    )
    error_message = "log_analytics_workspace_id and diagnostic_setting_destination_storage_id are mandatory if diagnostic is enabled."
  }
}