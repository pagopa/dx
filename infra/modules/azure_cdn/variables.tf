variable "resource_group_name" {
  type        = string
  description = "Resource group name where the CDN profile will be created"
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
  description = "Environment configuration object for resource naming"
}

variable "tags" {
  type        = map(any)
  description = "Resource tags"
}

variable "origins" {
  type = map(object({
    host_name = string
    priority  = optional(number, 1)
  }))
  description = "Map of origin configurations. Key is the origin identifier. Priority determines routing preference (lower values = higher priority)"
}

variable "custom_domains" {
  description = "Map of custom domain configurations to associate with the CDN endpoint. If dns parameter is set, DNS records are created."
  type = list(object({
    host_name = string
    dns = optional(object({
      zone_name                = string
      zone_resource_group_name = string
    }), { zone_name = null, zone_resource_group_name = null })
  }))
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