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
    app_name        = string
    instance_number = string
  })

  validation {
    condition     = length("${var.environment.prefix}${var.environment.env_short}reg${var.environment.domain == null ? "" : replace(var.environment.domain, "-", "")}${var.environment.app_name}-ps-replica-${var.environment.instance_number}") <= 63
    error_message = "Azure PostgreSQL Flexible Server name must contain between 3 and 63 characters. Current value is \"${var.environment.prefix}${var.environment.env_short}reg${var.environment.domain == null ? "" : var.environment.domain}${var.environment.app_name}-ps-replica-${var.environment.instance_number}\""
  }

  description = "Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains."
}

variable "resource_group_name" {
  type        = string
  description = "Resource group to deploy resources to"
}

variable "db_version" {
  type        = number
  description = "The version of PostgreSQL Flexible Server to use. Possible values are 11, 12, 13, 14, 15 and 16"
  default     = 16
}

#------------#
# Networking #
#------------#
variable "virtual_network" {
  type = object({
    name                = string
    resource_group_name = string
  })
  description = "Virtual network in which to create the subnet"
}

variable "private_dns_zone_id" {
  type        = string
  description = "ID of the private DNS zone"
}

variable "subnet_cidr" {
  type        = string
  description = "CIDR block to use for the subnet the Function App uses for outbound connectivity"
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

#----------------#
# Administration #
#----------------#

variable "tier" {
  type        = string
  description = "Resource tiers depending on demanding workload. Allowed values are 'test', 'standard', 'premium'."
  default     = "test"

  validation {
    condition     = contains(["test", "standard", "premium"], var.tier)
    error_message = "Allowed values for \"tier\" are \"test\", \"standard\", or \"premium\"."
  }
}

variable "storage_mb" {
  type        = number
  description = "The max storage allowed for the PostgreSQL Flexible Server. Possible values are 32768, 65536, 131072, 262144, 524288, 1048576, 2097152, 4194304, 8388608, 16777216, and 33554432."
  default     = 32768
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

variable "zone" {
  type        = number
  description = "(Optional) Specifies the Availability Zone in which the PostgreSQL Flexible Server should be located."
  default     = null
}

variable "replica_zone" {
  type        = number
  description = "(Optional) Specifies the Availability Zone in which the Replica PostgreSQL Flexible Server should be located."
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