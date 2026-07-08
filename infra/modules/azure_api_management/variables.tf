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
      default_instances             = optional(number)
      minimum_instances             = optional(number)
      maximum_instances             = optional(number)
      scale_out_capacity_percentage = optional(number)
      scale_out_time_window         = optional(string)
      scale_out_value               = optional(string)
      scale_out_cooldown            = optional(string)
      scale_in_capacity_percentage  = optional(number)
      scale_in_time_window          = optional(string)
      scale_in_value                = optional(string)
      scale_in_cooldown             = optional(string)
    }
  )
  default     = null
  description = "Configuration for autoscaling rules on capacity metrics."

  validation {
    condition = var.autoscale == null || local.use_case_features.zones == null ? true : (
      (try(var.autoscale.minimum_instances, null) == null || var.autoscale.minimum_instances % length(coalesce(local.use_case_features.zones, [1])) == 0) &&
      (try(var.autoscale.maximum_instances, null) == null || var.autoscale.maximum_instances % length(coalesce(local.use_case_features.zones, [1])) == 0) &&
      (try(var.autoscale.default_instances, null) == null || var.autoscale.default_instances % length(coalesce(local.use_case_features.zones, [1])) == 0) &&
      (try(var.autoscale.scale_out_value, null) == null || tonumber(var.autoscale.scale_out_value) % length(coalesce(local.use_case_features.zones, [1])) == 0) &&
      (try(var.autoscale.scale_in_value, null) == null || tonumber(var.autoscale.scale_in_value) % length(coalesce(local.use_case_features.zones, [1])) == 0)
    )
    error_message = "When zone redundancy is enabled (${local.use_case_features.zones != null ? length(local.use_case_features.zones) : 0} zones), all autoscaling parameters must be multiples of ${local.use_case_features.zones != null ? length(local.use_case_features.zones) : 0}. This ensures proper distribution across availability zones."
  }

  validation {
    condition = var.autoscale == null ? true : (
      try(var.autoscale.minimum_instances, null) == null || try(var.autoscale.default_instances, null) == null || try(var.autoscale.maximum_instances, null) == null ||
      (var.autoscale.minimum_instances <= var.autoscale.default_instances && var.autoscale.default_instances <= var.autoscale.maximum_instances)
    )
    error_message = "The default_instances must be between minimum_instances and maximum_instances."
  }

  validation {
    condition     = var.autoscale == null ? true : (try(var.autoscale.minimum_instances, null) == null || var.autoscale.minimum_instances > 0)
    error_message = "The minimum_instances must be greater than 0."
  }

  validation {
    condition     = var.autoscale == null ? true : (try(var.autoscale.scale_out_value, null) == null || tonumber(var.autoscale.scale_out_value) > 0)
    error_message = "The scale_out_value must be greater than 0."
  }

  validation {
    condition     = var.autoscale == null ? true : (try(var.autoscale.scale_in_value, null) == null || tonumber(var.autoscale.scale_in_value) > 0)
    error_message = "The scale_in_value must be greater than 0."
  }
}

variable "virtual_network" {
  type = object({
    name                = string
    resource_group_name = string
  })
  description = "Virtual network in which to create the APIM subnet and resolve private endpoint subnets."
}

variable "private_dns_zone_resource_group_name" {
  type        = string
  description = "The resource group name of the private DNS zones. Defaults to the Virtual Network resource group. Zones are resolved in the current subscription."
  default     = null
}

variable "publisher_name" {
  type        = string
  description = "The name of the publisher or company."
}

variable "publisher_email" {
  type        = string
  description = "The email address of the publisher or company. Also used as the notification sender email."
}

variable "xml_content" {
  type        = string
  default     = null
  description = "XML content for all API policies."
}

variable "hostname_configuration" {
  type = object({
    proxy = optional(object({
      use_resource_name_as_default = optional(bool, false)
    }), {})
    management = optional(list(object({
      host_name                = string
      key_vault_certificate_id = string
    })), [])
    portal = optional(list(object({
      host_name                = string
      key_vault_certificate_id = string
    })), [])
    developer_portal = optional(list(object({
      host_name                = string
      key_vault_certificate_id = string
    })), [])
    scm = optional(list(object({
      host_name                = string
      key_vault_certificate_id = string
    })), [])
  })
  default     = {}
  description = "Custom domain configurations. The proxy hostname is managed by the module; only whether the resource-name hostname is the default can be configured. Key Vault certificate IDs may include a version; the module strips it internally."
}

variable "application_insights" {
  type = object({
    id                  = optional(string, null)
    sampling_percentage = optional(number, 0)
    verbosity           = optional(string, "error")
  })
  default     = {}
  description = "Application Insights integration. Set id to enable it; the module resolves the connection string from the resource ID."

  validation {
    condition     = try(var.application_insights.sampling_percentage, 0) >= 0 && try(var.application_insights.sampling_percentage, 0) <= 100
    error_message = "Invalid \"sampling_percentage\" value provided. Valid values are between 0 and 100."
  }

  validation {
    condition     = contains(["verbose", "information", "error"], try(var.application_insights.verbosity, "error"))
    error_message = "Invalid \"verbosity\" value provided. Valid values are \"verbose\", \"information\", \"error\"."
  }
}

variable "log_analytics_workspace_id" {
  type        = string
  default     = null
  description = "The Log Analytics workspace ID used for diagnostic logs and metrics. Required when the selected use_case enables monitoring."

  validation {
    condition     = !local.use_case_features.monitoring || var.log_analytics_workspace_id != null
    error_message = "log_analytics_workspace_id must be provided when the selected use_case enables monitoring."
  }
}

variable "metric_alerts" {
  default = {}

  description = <<EOD
Map of name = criteria objects
EOD

  type = map(object({
    description   = string
    frequency     = string
    window_size   = string
    severity      = number
    auto_mitigate = bool

    criteria = set(object(
      {
        aggregation = string
        dimension = list(object(
          {
            name     = string
            operator = string
            values   = list(string)
          }
        ))
        metric_name            = string
        metric_namespace       = string
        operator               = string
        skip_metric_validation = bool
        threshold              = number
      }
    ))

    dynamic_criteria = set(object(
      {
        aggregation              = string
        alert_sensitivity        = string
        dimension                = list(object({ name = string, operator = string, values = list(string) }))
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
