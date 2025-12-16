module "portal" {
  source  = "pagopa-dx/azure-cdn/azurerm"
  version = "~> 0.0"

  resource_group_name = var.cdn.resource_group_name

  environment = {
    prefix          = var.naming_config.prefix
    env_short       = var.naming_config.environment
    location        = var.naming_config.location
    app_name        = "mcp-registry"
    instance_number = var.naming_config.instance_number
  }

  origins = {
    primary = {
      host_name = "${local.api_center_name}.portal.westeurope.azure-apicenter.ms"
      priority  = 1
    }
  }

  custom_domains = [
    {
      host_name = var.cdn.custom_domain_host_name
      dns = {
        zone_name                = "dx.pagopa.it"
        zone_resource_group_name = var.cdn.network_resource_group_name
      }
    }
  ]

  tags = var.tags
}

# Additional Origin Group for API Center Data API
resource "azurerm_cdn_frontdoor_origin_group" "data_api" {
  name = provider::azuredx::resource_name(merge(var.naming_config,
    {
      name          = "mcp-registry-data"
      resource_type = "cdn_frontdoor_origin_group"
    }
  ))
  cdn_frontdoor_profile_id = module.portal.id

  health_probe {
    interval_in_seconds = 100
    protocol            = "Https"
    path                = "/"
    request_type        = "HEAD"
  }

  load_balancing {
    sample_size                 = 4
    successful_samples_required = 3
  }
}

# Origin for API Center Data API
resource "azurerm_cdn_frontdoor_origin" "data_api" {
  name = provider::azuredx::resource_name(merge(var.naming_config,
    {
      name          = "mcp-registry-data"
      resource_type = "cdn_frontdoor_origin"
    }
  ))
  cdn_frontdoor_origin_group_id  = azurerm_cdn_frontdoor_origin_group.data_api.id
  enabled                        = true
  host_name                      = "${local.api_center_name}.data.westeurope.azure-apicenter.ms"
  http_port                      = 80
  https_port                     = 443
  origin_host_header             = "${local.api_center_name}.data.westeurope.azure-apicenter.ms"
  priority                       = 1
  weight                         = 1000
  certificate_name_check_enabled = true
}

# Route for /workspaces/* traffic to Data API
resource "azurerm_cdn_frontdoor_route" "data_api" {
  name = provider::azuredx::resource_name(merge(var.naming_config,
    {
      name          = "mcp-registry-data"
      resource_type = "cdn_frontdoor_route"
    }
  ))
  cdn_frontdoor_endpoint_id     = module.portal.endpoint_id
  cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.data_api.id
  cdn_frontdoor_origin_ids      = [azurerm_cdn_frontdoor_origin.data_api.id]
  enabled                       = true

  forwarding_protocol    = "HttpsOnly"
  https_redirect_enabled = true
  patterns_to_match      = ["/workspaces/*"]
  supported_protocols    = ["Http", "Https"]

  link_to_default_domain = true
  cdn_frontdoor_custom_domain_ids = [
    "${module.portal.id}/customDomains/${replace(var.cdn.custom_domain_host_name, ".", "-")}"
  ]

  cache {
    query_string_caching_behavior = "UseQueryString"
    compression_enabled           = false
  }

  # Cache for 1 hour (3600 seconds)
  cdn_frontdoor_rule_set_ids = [azurerm_cdn_frontdoor_rule_set.cache_rules.id]
}

# Rule set for cache configuration
resource "azurerm_cdn_frontdoor_rule_set" "cache_rules" {
  name                     = "cacherules"
  cdn_frontdoor_profile_id = module.portal.id
}

# Rule to set cache duration to 1 hour for /workspaces/* paths
resource "azurerm_cdn_frontdoor_rule" "cache_data_apis" {
  name                      = "cachedataapis"
  cdn_frontdoor_rule_set_id = azurerm_cdn_frontdoor_rule_set.cache_rules.id
  order                     = 1
  behavior_on_match         = "Continue"

  actions {
    route_configuration_override_action {
      cache_duration                = "01:00:00"
      cdn_frontdoor_origin_group_id = azurerm_cdn_frontdoor_origin_group.data_api.id
      forwarding_protocol           = "HttpsOnly"
      cache_behavior                = "OverrideAlways"
      query_string_caching_behavior = "IgnoreQueryString"
    }
  }

  conditions {
    url_path_condition {
      operator         = "BeginsWith"
      match_values     = ["/workspaces/"]
      transforms       = ["Lowercase"]
      negate_condition = false
    }
  }
}
