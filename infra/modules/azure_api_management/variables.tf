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
    condition     = length("${var.environment.prefix}${var.environment.env_short}reg${var.environment.domain == null ? "" : replace(var.environment.domain, "-", "")}${var.environment.app_name}-apim-${var.environment.instance_number}") <= 50
    error_message = "Azure API Management name must contain between 1 and 50 characters. Current value is \"${var.environment.prefix}${var.environment.env_short}reg${var.environment.domain == null ? "" : var.environment.domain}${var.environment.app_name}-apim-${var.environment.instance_number}\""
  }

  description = "Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains."
}

variable "resource_group_name" {
  type        = string
  description = "Resource group to deploy resources to"
}

variable "tier" {
  type        = string
  description = "Resource tiers depending on demanding workload. Allowed values are 's', 'm', 'l', 'xl'."
  default     = "s"

  validation {
    condition     = contains(["s", "m", "l", "xl"], var.tier)
    error_message = "Allowed values for \"tier\" are \"s\", \"m\", \"l\" or \"xl\"."
  }
}

variable "autoscale" {
  type = object(
    {
      enabled                       = bool
      legacy_name                   = optional(string, "")
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
    legacy_name                   = ""
    default_instances             = 1
    minimum_instances             = 1
    maximum_instances             = 5
    scale_out_capacity_percentage = 60
    scale_out_time_window         = "PT10M"
    scale_out_value               = "2"
    scale_out_cooldown            = "PT45M"
    scale_in_capacity_percentage  = 30
    scale_in_time_window          = "PT30M"
    scale_in_value                = "1"
    scale_in_cooldown             = "PT30M"
  }
  description = "Configure Apim autoscale rule on capacity metric. If 'legacy_name' is set, it will be used for autoscale; otherwise, a name will be automatically generated following the naming convention."
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

variable "subnet_id" {
  type        = string
  default     = null
  description = "The id of the subnet that will be used for the API Management."
}

variable "virtual_network_type_internal" {
  type        = bool
  description = "The type of virtual network you want to use, if true it will be Internal and you need to specify a subnet_id, otherwise it will be None"
  default     = true
}

variable "enable_public_network_access" {
  type        = bool
  description = "Enable public network access"
  default     = false
}

variable "public_ip_address_id" {
  type        = string
  description = "(Optional) The id of the public ip address that will be used for the API Management. Custom public IPs are only supported on the Premium and Developer tiers when deployed in a virtual network."
  default     = null
}

variable "private_dns_zone_resource_group_name" {
  type        = string
  description = "(Optional) The resource group name of the private DNS zone. This is only required when resource group name is different from the VNet resource group."
  default     = null
}

#---------------------------#
# Policies & Configurations #
#---------------------------#

variable "publisher_name" {
  type        = string
  description = "The name of publisher/company."
}

variable "publisher_email" {
  type        = string
  description = "The email of publisher/company."
}

variable "notification_sender_email" {
  type        = string
  description = "Email address from which the notification will be sent."
  default     = null
}

variable "xml_content" {
  type        = string
  default     = null
  description = "Xml content for all api policy"
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
  description = "Custom domains"
}

#---------------#
# Administrator #
#---------------#

variable "key_vault_id" {
  type        = string
  default     = null
  description = "Key vault id."
}

variable "certificate_names" {
  type        = list(string)
  default     = []
  description = "List of key vault certificate name"
}


variable "lock_enable" {
  type        = bool
  default     = false
  description = "Apply lock to block accidental deletions."
}


#------------#
# Monitoring #
#------------#

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
    error_message = "You must provide a connection string when enabling Application Insights integration"
  }

  validation {
    condition     = var.application_insights.sampling_percentage >= 0 && var.application_insights.sampling_percentage <= 100
    error_message = "Invalid `sampling_percentage` value provided. Valid values are between 0 and 100"
  }

  validation {
    condition     = contains(["verbose", "information", "error"], var.application_insights.verbosity)
    error_message = "Invalid `verbosity` value provided. Valid values are 'verbose', 'information', 'error'"
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
  description = "The ID of the Action Group of custom string properties to include with the post webhook operation."
  type        = string
  default     = null
}



variable "management_logger_application_insight_enabled" {
  type        = bool
  description = "(Optional) if false, disables management logger application insight block"
  default     = true
}
