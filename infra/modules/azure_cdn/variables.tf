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
    host_name            = string
    priority             = optional(number, 1)
    storage_account_id   = optional(string, null)
    use_managed_identity = optional(bool, false)
  }))
  description = "Map of origin configurations. Key is the origin identifier. Priority determines routing preference (lower values = higher priority). If use_managed_identity is true, the Front Door identity will be granted 'Storage Blob Data Reader' role on the storage_account_id if provided."

  # NOTE: Remove this validation block when managed identity support is generally available
  validation {
    condition = alltrue([
      for k, v in var.origins : !v.use_managed_identity
    ])
    error_message = "Managed identity for origins is currently in preview and not yet supported. Please set use_managed_identity to false for all origins."
  }
}

variable "existing_cdn_frontdoor_profile_id" {
  type        = string
  description = "Existing CDN FrontDoor Profile ID. If provided, the module will not create a new profile."
  default     = null

  validation {
    condition = (
      var.existing_cdn_frontdoor_profile_id == null
      || (
        can(provider::azurerm::parse_resource_id(var.existing_cdn_frontdoor_profile_id))
        && lower(provider::azurerm::parse_resource_id(var.existing_cdn_frontdoor_profile_id)["resource_provider"]) == "microsoft.cdn"
        && lower(provider::azurerm::parse_resource_id(var.existing_cdn_frontdoor_profile_id)["resource_type"]) == "profiles"
      )
    )
    error_message = "existing_cdn_frontdoor_profile_id must be a valid Azure resource ID for a Microsoft.Cdn/profiles resource, e.g. /subscriptions/<sub>/resourceGroups/<rg>/providers/Microsoft.Cdn/profiles/<name>."
  }
}

variable "waf_enabled" {
  type        = bool
  description = "Whether to enable the WAF policy and associate it with the endpoint."
  default     = false
}

variable "custom_domains" {
  description = "Map of custom domain configurations to associate with the CDN endpoint. If dns parameter is set, DNS records are created. If the custom domain is at the apex of the specified DNS zone, a custom certificate must be used. To generate one in PagoPA context, please refer to the Confluence documentation."
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
    log_analytics_workspace_id                = optional(string)
    diagnostic_setting_destination_storage_id = optional(string)
  })
  default = {
    enabled                                   = false
    log_analytics_workspace_id                = null
    diagnostic_setting_destination_storage_id = null
  }
  description = <<-EOT
    Define if diagnostic settings should be enabled.
    If enabled, specifies the ID of a Log Analytics Workspace where Diagnostics Data should be sent and
    optionally the ID of the Storage Account where logs should be sent.
  EOT

  validation {
    condition = (
      !var.diagnostic_settings.enabled
      || (
        var.diagnostic_settings.log_analytics_workspace_id != null
        || var.diagnostic_settings.diagnostic_setting_destination_storage_id != null
      )
    )
    error_message = "At least one of log_analytics_workspace_id or diagnostic_setting_destination_storage_id must be specified when diagnostic settings are enabled."
  }
}
