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

  name                          = "${module.naming_convention.prefix}-${each.key}-cdnp-${module.naming_convention.suffix}"
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.this.id
  enabled                       = true
  host_name                     = each.value.host_name
  http_port                     = 80
  https_port                    = 443
  origin_host_header            = each.value.host_name
  priority                      = each.value.priority
  weight                        = 1000
  certificate_name_check_enabled = true
}

resource "azurerm_cdn_frontdoor_rule_set" "this" {
  name                     = "ruleset"
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.this.id
}

resource "azurerm_cdn_frontdoor_route" "this" {
  name                          = "${module.naming_convention.prefix}-cdnr-${module.naming_convention.suffix}"
  cdn_frontdoor_endpoint_id     = azurerm_cdn_frontdoor_endpoint.this.id
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.this.id
  cdn_frontdoor_origin_ids      = [for origin in azurerm_cdn_frontdoor_origin.this : origin.id]
  cdn_frontdoor_rule_set_ids    = [azurerm_cdn_frontdoor_rule_set.this.id]
  cdn_frontdoor_custom_domain_ids = length(var.custom_domains) > 0 ? [for domain in azurerm_cdn_frontdoor_custom_domain.this : domain.id] : []
  enabled                       = true

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

resource "azurerm_cdn_frontdoor_custom_domain" "this" {
  for_each = var.custom_domains

  name                     = each.key
  cdn_frontdoor_profile_id = azurerm_cdn_frontdoor_profile.this.id
  host_name                = each.value.host_name
  
  tls {
    certificate_type    = "ManagedCertificate"
    minimum_tls_version = "TLS12"
  }
}

resource "azurerm_cdn_frontdoor_custom_domain_association" "this" {
  for_each = var.custom_domains

  cdn_frontdoor_custom_domain_id = azurerm_cdn_frontdoor_custom_domain.this[each.key].id
  cdn_frontdoor_route_ids        = [azurerm_cdn_frontdoor_route.this.id]
}

resource "azurerm_cdn_frontdoor_rule" "delivery_rules" {
  for_each = var.delivery_rules

  name                      = replace(each.key, "-", "")
  cdn_frontdoor_rule_set_id = azurerm_cdn_frontdoor_rule_set.this.id
  order                     = each.value.order
  behavior_on_match         = "Continue"

  # URL path conditions
  dynamic "conditions" {
    for_each = each.value.url_path_conditions != null ? [1] : []
    content {
      url_path_condition {
        operator         = "BeginsWith"
        negate_condition = false
        match_values     = each.value.url_path_conditions
        transforms       = ["Lowercase"]
      }
    }
  }

  # URL file extension conditions
  dynamic "conditions" {
    for_each = each.value.url_file_extension_conditions != null ? [1] : []
    content {
      url_file_extension_condition {
        operator         = "Equal"
        negate_condition = false
        match_values     = each.value.url_file_extension_conditions
        transforms       = ["Lowercase"]
      }
    }
  }

  # Request scheme condition
  dynamic "conditions" {
    for_each = each.value.request_scheme_condition != null ? [1] : []
    content {
      request_scheme_condition {
        operator         = "Equal"
        negate_condition = false
        match_values     = [upper(each.value.request_scheme_condition)]
      }
    }
  }

  # URL redirect action
  dynamic "actions" {
    for_each = each.value.actions.url_redirect_action != null ? [1] : []
    content {
      url_redirect_action {
        redirect_type        = each.value.actions.url_redirect_action.redirect_type
        redirect_protocol    = each.value.actions.url_redirect_action.redirect_protocol
        destination_hostname = each.value.actions.url_redirect_action.destination_hostname
        destination_path     = each.value.actions.url_redirect_action.destination_path
        query_string         = each.value.actions.url_redirect_action.query_string
      }
    }
  }

  # URL rewrite action
  dynamic "actions" {
    for_each = each.value.actions.url_rewrite_action != null ? [1] : []
    content {
      url_rewrite_action {
        source_pattern          = each.value.actions.url_rewrite_action.source_pattern
        destination             = each.value.actions.url_rewrite_action.destination
        preserve_unmatched_path = each.value.actions.url_rewrite_action.preserve_unmatched_path
      }
    }
  }
  depends_on = [azurerm_cdn_frontdoor_origin_group.this, azurerm_cdn_frontdoor_origin.this]
}

