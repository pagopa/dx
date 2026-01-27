resource "azurerm_cdn_frontdoor_profile" "this" {
  count = local.create_profile ? 1 : 0

  name                = provider::dx::resource_name(merge(local.naming_config, { resource_type = "cdn_frontdoor_profile" }))
  resource_group_name = var.resource_group_name
  sku_name            = "Standard_AzureFrontDoor"

  identity {
    type = "SystemAssigned"
  }

  tags = local.tags
}

resource "azurerm_cdn_frontdoor_endpoint" "this" {
  name                     = provider::dx::resource_name(merge(local.naming_config, { resource_type = "cdn_frontdoor_endpoint" }))
  cdn_frontdoor_profile_id = local.profile_id

  tags = local.tags
}

resource "azurerm_cdn_frontdoor_origin_group" "this" {
  name                     = provider::dx::resource_name(merge(local.naming_config, { resource_type = "cdn_frontdoor_origin_group" }))
  cdn_frontdoor_profile_id = local.profile_id

  health_probe {
    interval_in_seconds = 100
    protocol            = "Https"
  }

  load_balancing {}
}

resource "azurerm_cdn_frontdoor_origin" "this" {
  for_each = var.origins

  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "${var.environment.app_name}-${each.key}"
    resource_type = "cdn_frontdoor_origin"
  }))
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

resource "azurerm_cdn_frontdoor_rule_set" "this" {
  name                     = "ruleset"
  cdn_frontdoor_profile_id = local.profile_id
}

resource "azurerm_cdn_frontdoor_route" "this" {
  name                            = provider::dx::resource_name(merge(local.naming_config, { resource_type = "cdn_frontdoor_route" }))
  cdn_frontdoor_endpoint_id       = azurerm_cdn_frontdoor_endpoint.this.id
  cdn_frontdoor_origin_group_id   = azurerm_cdn_frontdoor_origin_group.this.id
  cdn_frontdoor_origin_ids        = [for origin in azurerm_cdn_frontdoor_origin.this : origin.id]
  cdn_frontdoor_rule_set_ids      = [azurerm_cdn_frontdoor_rule_set.this.id]
  cdn_frontdoor_custom_domain_ids = length(var.custom_domains) > 0 ? [for domain in azurerm_cdn_frontdoor_custom_domain.this : domain.id] : []
  enabled                         = true

  forwarding_protocol    = "HttpsOnly"
  https_redirect_enabled = true
  patterns_to_match      = ["/*"]
  supported_protocols    = ["Http", "Https"]

  link_to_default_domain = true

  cache {
    query_string_caching_behavior = "IgnoreQueryString"
  }
}

resource "azurerm_cdn_frontdoor_firewall_policy" "this" {
  count = var.waf_enabled ? 1 : 0

  name                = replace(replace(provider::dx::resource_name(merge(local.naming_config, { resource_type = "cdn_frontdoor_endpoint" })), "-", ""), "fde", "fdfp")
  resource_group_name = var.resource_group_name
  sku_name            = "Standard_AzureFrontDoor"
  enabled             = true
  mode                = "Prevention"

  # Note: managed_rule blocks require Premium_AzureFrontDoor SKU
  # For Standard SKU, use custom_rule blocks instead

  tags = local.tags
}

resource "azurerm_cdn_frontdoor_security_policy" "this" {
  # Only create security policy if WAF is enabled and we have at least one domain (custom or endpoint)
  count = var.waf_enabled ? 1 : 0

  name = replace(replace(provider::dx::resource_name(merge(local.naming_config, { resource_type = "cdn_frontdoor_endpoint" })), "-", ""), "fde", "fdsp")

  cdn_frontdoor_profile_id = local.profile_id

  security_policies {
    firewall {
      cdn_frontdoor_firewall_policy_id = azurerm_cdn_frontdoor_firewall_policy.this[0].id

      association {
        # Always include the default endpoint
        domain {
          cdn_frontdoor_domain_id = azurerm_cdn_frontdoor_endpoint.this.id
        }
        # Include custom domains if any
        dynamic "domain" {
          for_each = azurerm_cdn_frontdoor_custom_domain.this
          content {
            cdn_frontdoor_domain_id = domain.value.id
          }
        }
        patterns_to_match = ["/*"]
      }
    }
  }
}
