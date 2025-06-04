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
  description = "Map of custom domain configurations to associate with the CDN endpoint. If dns parameter is set, DNS records are created. If the custom domain is at the apex of the specified DNS zone, a custom certificate must be used. To generate one, please refer to the confluence documentation."
  type = list(object({
    host_name = string
    dns = optional(object({
      zone_name                = string
      zone_resource_group_name = string
    }), { zone_name = null, zone_resource_group_name = null })

    custom_certificate = optional(object({
      key_vault_certificate_versionless_id = string
      key_vault_name                       = string
      key_vault_resource_group_name        = string
      key_vault_has_rbac_support           = optional(bool, true)
    }), { key_vault_certificate_versionless_id = null, key_vault_name = null, key_vault_resource_group_name = null, key_vault_has_rbac_support = null })
  }))
  default = []

  # Validate that all cases where zone_name is equal to host_name (meaning that the custom domain is a root domain of that zone), the custom_certificate keys are set.
  validation {
    condition = alltrue([
      for domain in var.custom_domains : (
        domain.custom_certificate.key_vault_certificate_versionless_id != null &&
        domain.custom_certificate.key_vault_name != null &&
        domain.custom_certificate.key_vault_resource_group_name != null
      ) if domain.dns.zone_name == domain.host_name
    ])
    error_message = <<-EOT
      Azure CDN does not support managed certificates for apex domains. If a custom domain is an apex domain, the information of a custom certificate must be provided. To generate one, please refer to the confluence documentation.
      Please check the following submitted apex domains: ${join(",", [for domain in var.custom_domains : domain.host_name if domain.dns.zone_name == domain.host_name])}
    EOT
  }
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
