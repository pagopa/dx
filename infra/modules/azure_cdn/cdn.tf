resource "azurerm_cdn_frontdoor_profile" "this" {
  name                = "${module.naming_convention.prefix}-cdnp-${module.naming_convention.suffix}"
  resource_group_name = var.resource_group_name
  sku_name            = "Standard_AzureFrontDoor"

  tags = var.tags
}

resource "azurerm_cdn_frontdoor_endpoint" "this" {
  name                     = "${module.naming_convention.prefix}-cdne-${module.naming_convention.suffix}"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.this.id

  tags = var.tags
}

resource "azurerm_cdn_frontdoor_origin_group" "this" {
  name                     = "${module.naming_convention.prefix}-cdnog-${module.naming_convention.suffix}"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.this.id

  health_probe {
    interval_in_seconds = 100
    path                = "/"
    protocol            = "Https"
    request_type        = "HEAD"
  }

  load_balancing {}
}

resource "azurerm_cdn_frontdoor_origin" "this" {
  for_each = var.origins

  name                           = "${module.naming_convention.prefix}-${each.key}-cdnp-${module.naming_convention.suffix}"
  cdn_frontdoor_origin_group_id  = azurerm_cdn_frontdoor_origin_group.this.id
  enabled                        = true
  host_name                      = each.value.host_name
  http_port                      = 80
  https_port                     = 443
  origin_host_header             = each.value.host_name
  priority                       = each.value.priority
  weight                         = 1000
  certificate_name_check_enabled = true
}

resource "azurerm_cdn_frontdoor_route" "this" {
  name                            = "${module.naming_convention.prefix}-cdnr-${module.naming_convention.suffix}"
  cdn_frontdoor_endpoint_id       = azurerm_cdn_frontdoor_endpoint.this.id
  cdn_frontdoor_origin_group_id   = azurerm_cdn_frontdoor_origin_group.this.id
  cdn_frontdoor_origin_ids        = [for origin in azurerm_cdn_frontdoor_origin.this : origin.id]
  cdn_frontdoor_rule_set_ids      = []
  cdn_frontdoor_custom_domain_ids = length(var.custom_domains) > 0 ? [for domain in azurerm_cdn_frontdoor_custom_domain.this : domain.id] : []
  enabled                         = true

  forwarding_protocol    = "HttpsOnly"
  https_redirect_enabled = true
  patterns_to_match      = ["/*"]
  supported_protocols    = ["Http", "Https"]

  link_to_default_domain = true

  cache {
    query_string_caching_behavior = "IgnoreQueryString"
    compression_enabled           = true
  }
}

resource "azurerm_monitor_diagnostic_setting" "diagnostic_settings_cdn_profile" {
  count                      = var.diagnostic_settings.enabled ? 1 : 0
  name                       = "${module.naming_convention.prefix}-cdnp-${module.naming_convention.suffix}"
  target_resource_id         = azurerm_cdn_frontdoor_profile.this.id
  log_analytics_workspace_id = var.diagnostic_settings.log_analytics_workspace_id
  storage_account_id         = var.diagnostic_settings.diagnostic_setting_destination_storage_id

  enabled_log {
    category_group = "allLogs"
  }

  metric {
    category = "AllMetrics"
  }
}