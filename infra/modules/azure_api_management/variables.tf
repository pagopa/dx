#---------#
# General #
#---------#

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

  validation {
    condition     = length("${var.environment.prefix}${var.environment.env_short}reg${var.environment.domain == null ? "" : replace(var.environment.domain, "-", "")}${var.environment.app_name}-apim-${var.environment.instance_number}") <= 50
    error_message = "Azure API Management name must contain between 1 and 50 characters. Current value is \"${var.environment.prefix}${var.environment.env_short}reg${var.environment.domain == null ? "" : var.environment.domain}${var.environment.app_name}-apim-${var.environment.instance_number}\""
  }

  description = "Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains."
}

variable "resource_group_name" {
  type        = string
  description = "The name of the resource group where the resources will be deployed."
}

variable "use_case" {
  type        = string
  description = "Specifies the use case for the API Management. Allowed values are 'cost_optimized', 'high_load', and 'development'."
  default     = "cost_optimized"

  validation {
    condition     = contains(["cost_optimized", "high_load", "development"], var.use_case)
    error_message = "Allowed values for \"use_case\" are \"cost_optimized\", \"high_load\", or \"development\"."
  }
}

variable "autoscale" {
  type = object(
    {
      enabled                       = bool
      default_instances             = number
      minimum_instances             = number
      maximum_instances             = number
      scale_out_capacity_percentage = number
      scale_out_time_window         = string
      scale_out_value               = string
      scale_out_cooldown            = string
      scale_in_capacity_percentage  = number
      scale_in_time_window          = string
      scale_in_value                = string
      scale_in_cooldown             = string
    }
  )
  default = {
    enabled                       = true
    default_instances             = 2
    minimum_instances             = 2
    maximum_instances             = 6
    scale_out_capacity_percentage = 60
    scale_out_time_window         = "PT10M"
    scale_out_value               = "2"
    scale_out_cooldown            = "PT45M"
    scale_in_capacity_percentage  = 30

    scale_in_time_window = "PT30M"
    scale_in_value       = "2"
    scale_in_cooldown    = "PT30M"
  }
  description = "Configuration for autoscaling rules on capacity metrics."

  validation {
    condition = var.autoscale.enabled == false || local.use_case_features.zones == null || (
      # coalesce is used to handle the use cases where zones is set to null
      var.autoscale.minimum_instances % length(coalesce(local.use_case_features.zones, [1])) == 0 &&
      var.autoscale.maximum_instances % length(coalesce(local.use_case_features.zones, [1])) == 0 &&
      var.autoscale.default_instances % length(coalesce(local.use_case_features.zones, [1])) == 0 &&
      tonumber(var.autoscale.scale_out_value) % length(coalesce(local.use_case_features.zones, [1])) == 0 &&
      tonumber(var.autoscale.scale_in_value) % length(coalesce(local.use_case_features.zones, [1])) == 0
    )
    error_message = "When zone redundancy is enabled (${local.use_case_features.zones != null ? length(local.use_case_features.zones) : 0} zones), all autoscaling parameters must be multiples of ${local.use_case_features.zones != null ? length(local.use_case_features.zones) : 0}. Current values: minimum_instances=${var.autoscale.minimum_instances}, maximum_instances=${var.autoscale.maximum_instances}, default_instances=${var.autoscale.default_instances}, scale_out_value=${var.autoscale.scale_out_value}, scale_in_value=${var.autoscale.scale_in_value}. This ensures proper distribution across availability zones."
  }

  validation {
    condition     = var.autoscale.minimum_instances <= var.autoscale.default_instances && var.autoscale.default_instances <= var.autoscale.maximum_instances
    error_message = "The default_instances must be between minimum_instances and maximum_instances."
  }

  validation {
    condition     = var.autoscale.minimum_instances > 0
    error_message = "The minimum_instances must be greater than 0."
  }

  validation {
    condition     = tonumber(var.autoscale.scale_out_value) > 0
    error_message = "The scale_out_value must be greater than 0."
  }

  validation {
    condition     = tonumber(var.autoscale.scale_in_value) > 0
    error_message = "The scale_in_value must be greater than 0."
  }
}

#------------#
# Networking #
#------------#

variable "virtual_network" {
  type = object({
    name                = string
    resource_group_name = string
  })
  description = "Virtual network in which to create the subnet."
}

variable "subnet_id" {
  type        = string
  default     = null
  description = "The ID of the subnet that will be used for the API Management."
}

variable "subnet_pep_id" {
  type        = string
  description = "ID of the subnet hosting private endpoints."
  default     = null

  validation {
    condition     = local.use_case_features.private_endpoint != true || var.subnet_pep_id != null
    error_message = "You must provide a subnet_pep_id when use_case use StandardV2 SKU."
  }
}

variable "virtual_network_type_internal" {
  type        = bool
  description = "Specifies the type of virtual network to use. If true, it will be Internal and requires a subnet_id; otherwise, it will be None."
  default     = null
}

variable "enable_public_network_access" {
  type        = bool
  description = "Specifies whether public network access is enabled."
  default     = null
}

variable "public_ip_address_id" {
  type        = string
  description = "The ID of the public IP address that will be used for the API Management. Custom public IPs are only supported on the non development use cases when deployed in a virtual network."
  default     = null
}

variable "private_dns_zone_resource_group_name" {
  type        = string
  description = "The resource group name of the private DNS zone. This is only required when the resource group name differs from the VNet resource group."
  default     = null
}

variable "private_dns_zone_ids" {
  type = object({
    azure_api_net             = optional(string)
    management_azure_api_net  = optional(string)
    scm_azure_api_net         = optional(string)
    privatelink_azure_api_net = optional(string)
  })
  default     = null
  description = "Override IDs for private DNS zones. If not provided, zones will be looked up in \"private_dns_zone_resource_group_name\". Use this to reference DNS zones in different subscriptions."
}

#---------------------------#
# Policies & Configurations #
#---------------------------#

variable "publisher_name" {
  type        = string
  description = "The name of the publisher or company."
}

variable "publisher_email" {
  type        = string
  description = "The email address of the publisher or company."
}

variable "notification_sender_email" {
  type        = string
  description = "The email address from which notifications will be sent."
  default     = null
}

variable "xml_content" {
  type        = string
  default     = null
  description = "XML content for all API policies."
}

variable "hostname_configuration" {
  type = object({

    proxy = list(object(
      {
        default_ssl_binding = bool
        host_name           = string
        key_vault_id        = string
    }))

    management = object({
      host_name    = string
      key_vault_id = string
    })

    portal = object({
      host_name    = string
      key_vault_id = string
    })

    developer_portal = object({
      host_name    = string
      key_vault_id = string
    })

  })
  default     = null
  description = "Configuration for custom domains."
}

#---------------#
# Administrator #
#---------------#

variable "key_vault_id" {
  type        = string
  default     = null
  description = "The ID of the Key Vault."
}

variable "certificate_names" {
  type        = list(string)
  default     = []
  description = "A list of Key Vault certificate names."
}

variable "lock_enable" {
  type        = bool
  default     = false
  description = "Specifies whether to apply a lock to prevent accidental deletions."
}

#------------------------#
# Tracing and Monitoring #
#------------------------#

variable "application_insights" {
  type = object({
    enabled             = bool
    connection_string   = string
    id                  = optional(string, null)
    sampling_percentage = number
    verbosity           = string
  })
  default = {
    enabled             = false
    connection_string   = null
    id                  = null
    sampling_percentage = 0
    verbosity           = "error"
  }
  description = "Application Insights integration. The connection string used to push data; the id of the AI resource (optional); the sampling percentage (a value between 0 and 100) and the verbosity level (verbose, information, error)."

  validation {
    condition     = !var.application_insights.enabled || var.application_insights.connection_string != null
    error_message = "You must provide a connection string when enabling Application Insights integration."
  }

  validation {
    condition     = var.application_insights.sampling_percentage >= 0 && var.application_insights.sampling_percentage <= 100
    error_message = "Invalid \"sampling_percentage\" value provided. Valid values are between 0 and 100."
  }

  validation {
    condition     = contains(["verbose", "information", "error"], var.application_insights.verbosity)
    error_message = "Invalid \"verbosity\" value provided. Valid values are \"verbose\", \"information\", \"error\"."
  }
}

variable "monitoring" {
  type = object({
    enabled                    = bool
    log_analytics_workspace_id = string

    logs = optional(object({
      enabled    = bool
      groups     = optional(list(string), [])
      categories = optional(list(string), [])
    }), { enabled = false, groups = [], categories = [] })

    metrics = optional(object({
      enabled = bool
    }), { enabled = false })

  })
  default = {
    enabled                    = false
    log_analytics_workspace_id = null
  }
  description = "Enable collecting resources to send to Azure Monitor into AzureDiagnostics table"

  # At least one between logs and metrics must be enabled
  validation {
    condition = (
      # If monitoring is not enabled, no validation needed
      !var.monitoring.enabled ||
      # At least one of logs or metrics must be enabled
      var.monitoring.logs.enabled ||
      var.monitoring.metrics.enabled
    )
    error_message = "At least one between \"logs\" and \"metrics\" must be enabled when monitoring is enabled."
  }

  # Exactly one of logs.groups or logs.categories must be provided, but not both
  validation {
    condition = (
      !var.monitoring.logs.enabled ||
      (length(var.monitoring.logs.groups) == 0) != (length(var.monitoring.logs.categories) == 0)
    )
    error_message = "If logs are enabled, exactly one of \"logs.groups\" or \"logs.categories\" must be provided, but not both."
  }

  # Validate logs.groups values
  validation {
    condition = var.monitoring.logs.enabled == false || alltrue([
      for group in var.monitoring.logs.groups : contains(local.apim.log_category_groups, group)
    ])
    error_message = format("Invalid value in \"logs.groups\". Allowed values are: %#v", join(", ", local.apim.log_category_groups))
  }

  # Validate logs.categories values
  validation {
    condition = var.monitoring.enabled == false || alltrue([
      for category in var.monitoring.logs.categories : contains(local.apim.log_category_types, category)
    ])
    error_message = format("Invalid value in \"logs.categories\". Allowed values are: %#v", join(", ", local.apim.log_category_types))
  }

}

variable "metric_alerts" {
  default = {}

  description = <<EOD
Map of name = criteria objects
EOD

  type = map(object({
    description = string
    # Possible values are PT1M, PT5M, PT15M, PT30M and PT1H
    frequency = string
    # Possible values are PT1M, PT5M, PT15M, PT30M, PT1H, PT6H, PT12H and P1D.
    window_size = string
    # Possible values are 0, 1, 2, 3.
    severity = number
    # Possible values are true, false
    auto_mitigate = bool

    criteria = set(object(
      {
        # criteria.*.aggregation to be one of [Average Count Minimum Maximum Total]
        aggregation = string
        dimension = list(object(
          {
            name     = string
            operator = string
            values   = list(string)
          }
        ))
        metric_name      = string
        metric_namespace = string
        # criteria.0.operator to be one of [Equals NotEquals GreaterThan GreaterThanOrEqual LessThan LessThanOrEqual]
        operator               = string
        skip_metric_validation = bool
        threshold              = number
      }
    ))

    dynamic_criteria = set(object(
      {
        # criteria.*.aggregation to be one of [Average Count Minimum Maximum Total]
        aggregation       = string
        alert_sensitivity = string
        dimension = list(object(
          {
            name     = string
            operator = string
            values   = list(string)
          }
        ))
        evaluation_failure_count = number
        evaluation_total_count   = number
        ignore_data_before       = string
        metric_name              = string
        metric_namespace         = string
        operator                 = string
        skip_metric_validation   = bool
      }
    ))
  }))
}

variable "action_group_id" {
  description = "The ID of the custom string properties Action Group to include with the post webhook operation."
  type        = string
  default     = null
}

variable "management_logger_application_insight_enabled" {
  type        = bool
  description = "Specifies whether to enable the management logger application insight block."
  default     = true
}
