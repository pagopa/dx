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
    condition     = length("${var.environment.prefix}${var.environment.env_short}reg${var.environment.domain == null ? "" : replace(var.environment.domain, "-", "")}${var.environment.app_name}stfn${var.environment.instance_number}") <= 24
    error_message = "Storage Account name must have less than 25 characters. Current value is \"${var.environment.prefix}${var.environment.env_short}reg${var.environment.domain == null ? "" : var.environment.domain}${var.environment.app_name}st${var.environment.instance_number}\""
  }

  validation {
    condition     = var.has_durable_functions == false || length("${var.environment.prefix}${var.environment.env_short}reg${var.environment.domain == null ? "" : replace(var.environment.domain, "-", "")}${var.environment.app_name}stfd${var.environment.instance_number}") <= 24
    error_message = "Storage Account name for Durable Functions must have less than 25 characters. Current value is \"${var.environment.prefix}${var.environment.env_short}reg${var.environment.domain == null ? "" : var.environment.domain}${var.environment.app_name}stfnd${var.environment.instance_number}\""
  }

  description = "Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains."
}

variable "resource_group_name" {
  type        = string
  description = "Resource group to deploy resources to"
}

variable "app_service_plan_id" {
  type        = string
  default     = null
  description = "(Optional) Set the AppService Id where you want to host the Function App"
}

variable "application_insights_connection_string" {
  type        = string
  sensitive   = true
  default     = null
  description = "(Optional) Application Insights connection string"
}

variable "health_check_path" {
  type        = string
  description = "Endpoint where health probe is exposed"
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
  type    = string
  default = "node"

  validation {
    condition     = contains(["node", "java"], var.stack)
    error_message = "Allowed values for \"stack\" are \"node\", \"java\". Note, you can select the version using \"node_version\" and \"java_version\" variables."
  }
}

variable "node_version" {
  type        = number
  default     = 20
  description = "Node version to use"
}

variable "java_version" {
  type        = string
  default     = 17
  description = "Java version to use"
}

variable "application_insights_sampling_percentage" {
  type        = number
  default     = 5
  description = "(Optional) The sampling percentage of Application Insights. Default is 5"
}

variable "app_settings" {
  type        = map(string)
  description = "Application settings"

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
  description = "Staging slot application settings"
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
  description = "(Optional) A list of application setting names that are not swapped between slots"
  default     = []
}

variable "has_durable_functions" {
  type        = bool
  description = "(Optional) Enable if the Function App hosts Durable Functions"
  default     = false
}
