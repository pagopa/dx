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
    condition     = length("${var.environment.prefix}${var.environment.env_short}reg${var.environment.domain == null ? "" : replace(var.environment.domain, "-", "")}${var.environment.app_name}stfn${var.environment.instance_number}") <= 24
    error_message = "Storage Account name must have less than 25 characters. Current value is \"${var.environment.prefix}${var.environment.env_short}reg${var.environment.domain == null ? "" : var.environment.domain}${var.environment.app_name}st${var.environment.instance_number}\""
  }

  description = "Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains."
}

variable "resource_group_name" {
  type        = string
  description = "The name of the resource group where resources will be deployed."
}

variable "app_service_plan_id" {
  type        = string
  default     = null
  description = "The ID of the App Service Plan where the Function App will be hosted. Leave null to create a new plan."
}

variable "application_insights_connection_string" {
  type        = string
  sensitive   = true
  default     = null
  description = "The connection string for Application Insights to enable monitoring and diagnostics."
}

variable "health_check_path" {
  type        = string
  description = "The endpoint path where the health probe is exposed for the Function App."
}

variable "tier" {
  type        = string
  description = "Resource tiers depending on workload. Allowed values are 's', 'm', 'l', 'xl', 'xxl'. Legacy values 'premium', 'standard', 'test' are also supported for backward compatibility."

  default = "l"

  validation {
    condition     = contains(["s", "m", "l", "xl", "xxl", "premium", "standard", "test"], var.tier)
    error_message = "Allowed values for \"tier\" are \"s\", \"m\", \"l\", \"xl\", \"xxl\". Legacy values 'premium', 'standard', or 'test' are also supported for backward compatibility."
  }
}

variable "stack" {
  type        = string
  default     = "node"
  description = "The runtime stack for the Function App. Allowed values are 'node' and 'java'."

  validation {
    condition     = contains(["node", "java"], var.stack)
    error_message = "Allowed values for \"stack\" are \"node\", \"java\". Note, you can select the version using \"node_version\" and \"java_version\" variables."
  }
}

variable "node_version" {
  type        = number
  default     = 20
  description = "The version of Node.js to use for the Function App runtime."
}

variable "java_version" {
  type        = string
  default     = 17
  description = "The version of Java to use for the Function App runtime."
}

variable "application_insights_sampling_percentage" {
  type        = number
  default     = 5
  description = "The sampling percentage for Application Insights telemetry. Default is 5."
}

variable "app_settings" {
  type        = map(string)
  description = "A map of application settings for the Function App."

  validation {
    condition = (
      !(contains(keys(var.app_settings), "AzureFunctionsWebHost__hostid")) ? true :
      (
        var.app_settings["AzureFunctionsWebHost__hostid"] == null ? true :
        length(var.app_settings["AzureFunctionsWebHost__hostid"]) <= 32
      )
    )
    error_message = "The value for AzureFunctionsWebHost__hostid must be null or must not exceed 32 characters."
  }
}

variable "slot_app_settings" {
  type        = map(string)
  description = "A map of application settings specific to the staging slot of the Function App."
  default     = {}

  validation {
    condition = (
      !(contains(keys(var.slot_app_settings), "AzureFunctionsWebHost__hostid")) ? true :
      (
        var.slot_app_settings["AzureFunctionsWebHost__hostid"] == null ? true :
        length(var.slot_app_settings["AzureFunctionsWebHost__hostid"]) <= 32
      )
    )
    error_message = "The value for AzureFunctionsWebHost__hostid must be null or must not exceed 32 characters."
  }
}

variable "sticky_app_setting_names" {
  type        = list(string)
  description = "A list of application setting names that should remain constant and not be swapped between slots."
  default     = []
}

variable "has_durable_functions" {
  type        = bool
  description = "Set to true if the Function App hosts Durable Functions."
  default     = false
}
