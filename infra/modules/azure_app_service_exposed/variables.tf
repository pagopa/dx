# ------------ GENERAL ------------ #
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

  description = "Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains."
}

variable "resource_group_name" {
  type        = string
  description = "Resource group to deploy resources to"
}

# ------------ APP SERVICE ------------ #

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
  description = "Resource tiers depending on workload. Allowed values are 'xs', 's', 'm', 'l', 'xl'. Legacy values 'premium', 'standard', 'test' are also supported for backward compatibility."

  default = "l"

  validation {
    condition     = contains(["xs", "s", "m", "l", "xl", "premium", "standard", "test"], var.tier)
    error_message = "Allowed values for \"tier\" are \"xs\", \"s\", \"m\", \"l\", \"xl\". Legacy values 'premium', 'standard', or 'test' are also supported for backward compatibility."
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

variable "startup_command" {
  type        = string
  default     = ""
  description = "(Optional) The PM2 file used as PM2 process entry point"
}

variable "application_insights_sampling_percentage" {
  type        = number
  default     = 5
  description = "(Optional) The sampling percentage of Application Insights. Default is 5"
}

variable "app_settings" {
  type        = map(string)
  description = "Application settings"
}

variable "slot_app_settings" {
  type        = map(string)
  description = "Staging slot application settings"
  default     = {}
}

variable "sticky_app_setting_names" {
  type        = list(string)
  description = "(Optional) A list of application setting names that are not swapped between slots"
  default     = []
}
