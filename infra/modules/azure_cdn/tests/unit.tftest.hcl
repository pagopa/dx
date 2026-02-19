variables {
  resource_group_name = "rg-test"

  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    domain          = "modules"
    app_name        = "test"
    instance_number = "01"
  }

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    BusinessUnit   = "DevEx"
    Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_cdn/tests"
    ManagementTeam = "Developer Experience"
    Test           = "true"
    TestName       = "CDN unit tests"
  }

  origins = {
    primary = {
      host_name = "test.blob.core.windows.net"
    }
  }
}

mock_provider "azurerm" {}

override_data {
  target = data.azurerm_cdn_frontdoor_profile.existing
  values = {
    id       = "/subscriptions/12345678-1234-9876-4563-123456789012/resourceGroups/rg-test/providers/Microsoft.Cdn/profiles/cdn-profile-test"
    sku_name = "Standard_AzureFrontDoor"
    identity = [{
      type         = "SystemAssigned"
      principal_id = "00000000-0000-0000-0000-000000000000"
      tenant_id    = "00000000-0000-0000-0000-000000000000"
    }]
  }
}

run "cdn_profile_basic_setup" {
  command = plan

  assert {
    condition     = azurerm_cdn_frontdoor_profile.this[0].sku_name == "Standard_AzureFrontDoor"
    error_message = "CDN profile SKU must be Standard_AzureFrontDoor"
  }

  assert {
    condition     = azurerm_cdn_frontdoor_profile.this[0].identity[0].type == "SystemAssigned"
    error_message = "CDN profile must have SystemAssigned managed identity"
  }

  assert {
    condition     = length(azurerm_cdn_frontdoor_profile.this) == 1
    error_message = "Expected exactly one CDN profile to be created when no existing_cdn_frontdoor_profile_id is provided"
  }
}

run "cdn_endpoint_created" {
  command = plan

  assert {
    condition     = can(azurerm_cdn_frontdoor_endpoint.this.name)
    error_message = "CDN endpoint must be created"
  }
}

run "cdn_origin_group_health_probe" {
  command = plan

  assert {
    condition     = azurerm_cdn_frontdoor_origin_group.this.health_probe[0].interval_in_seconds == 100
    error_message = "Origin group health probe interval must be 100 seconds"
  }

  assert {
    condition     = azurerm_cdn_frontdoor_origin_group.this.health_probe[0].protocol == "Https"
    error_message = "Origin group health probe protocol must be HTTPS"
  }
}

run "cdn_single_origin" {
  command = plan

  assert {
    condition     = length(azurerm_cdn_frontdoor_origin.this) == 1
    error_message = "Expected exactly one origin when only primary origin is provided"
  }

  assert {
    condition     = azurerm_cdn_frontdoor_origin.this["primary"].host_name == "test.blob.core.windows.net"
    error_message = "Primary origin hostname must match the provided value"
  }

  assert {
    condition     = azurerm_cdn_frontdoor_origin.this["primary"].priority == 1
    error_message = "Primary origin should have default priority of 1"
  }

  assert {
    condition     = azurerm_cdn_frontdoor_origin.this["primary"].enabled == true
    error_message = "Origin must be enabled by default"
  }

  assert {
    condition     = azurerm_cdn_frontdoor_origin.this["primary"].certificate_name_check_enabled == true
    error_message = "Certificate name check must be enabled"
  }
}

run "cdn_multiple_origins_with_priorities" {
  command = plan

  variables {
    origins = {
      primary = {
        host_name = "primary.blob.core.windows.net"
        priority  = 1
      }
      secondary = {
        host_name = "secondary.blob.core.windows.net"
        priority  = 2
      }
    }
  }

  assert {
    condition     = length(azurerm_cdn_frontdoor_origin.this) == 2
    error_message = "Expected exactly two origins"
  }

  assert {
    condition     = azurerm_cdn_frontdoor_origin.this["primary"].priority == 1
    error_message = "Primary origin priority must be 1"
  }

  assert {
    condition     = azurerm_cdn_frontdoor_origin.this["secondary"].priority == 2
    error_message = "Secondary origin priority must be 2"
  }
}

run "cdn_route_configuration" {
  command = plan

  assert {
    condition     = azurerm_cdn_frontdoor_route.this.forwarding_protocol == "HttpsOnly"
    error_message = "Route must use HTTPS-only forwarding protocol"
  }

  assert {
    condition     = azurerm_cdn_frontdoor_route.this.https_redirect_enabled == true
    error_message = "HTTPS redirect must be enabled"
  }

  assert {
    condition     = contains(azurerm_cdn_frontdoor_route.this.supported_protocols, "Http")
    error_message = "Route must support HTTP protocol"
  }

  assert {
    condition     = contains(azurerm_cdn_frontdoor_route.this.supported_protocols, "Https")
    error_message = "Route must support HTTPS protocol"
  }

  assert {
    condition     = azurerm_cdn_frontdoor_route.this.patterns_to_match[0] == "/*"
    error_message = "Route must match all paths (/*)"
  }

  assert {
    condition     = azurerm_cdn_frontdoor_route.this.cache[0].query_string_caching_behavior == "IgnoreQueryString"
    error_message = "Cache must ignore query strings"
  }
}

run "cdn_waf_enabled" {
  command = plan

  variables {
    waf_enabled = true
    custom_domains = [
      {
        host_name = "secure.devex.pagopa.it"
        dns = {
          zone_name                = "devex.pagopa.it"
          zone_resource_group_name = "rg-test"
        }
      }
    ]
  }

  assert {
    condition     = length(azurerm_cdn_frontdoor_firewall_policy.this) == 1
    error_message = "WAF policy must be created when waf_enabled is true"
  }

  assert {
    condition     = azurerm_cdn_frontdoor_firewall_policy.this[0].enabled == true
    error_message = "WAF policy must be enabled"
  }

  assert {
    condition     = azurerm_cdn_frontdoor_firewall_policy.this[0].mode == "Prevention"
    error_message = "WAF policy mode must be Prevention"
  }

  assert {
    condition     = azurerm_cdn_frontdoor_firewall_policy.this[0].sku_name == "Standard_AzureFrontDoor"
    error_message = "WAF policy SKU must match profile SKU"
  }

  assert {
    condition     = length(azurerm_cdn_frontdoor_security_policy.this) == 1
    error_message = "Security policy must be created when WAF is enabled"
  }
}

run "cdn_waf_disabled" {
  command = plan

  variables {
    waf_enabled = false
  }

  assert {
    condition     = length(azurerm_cdn_frontdoor_firewall_policy.this) == 0
    error_message = "WAF policy must not be created when waf_enabled is false"
  }

  assert {
    condition     = length(azurerm_cdn_frontdoor_security_policy.this) == 0
    error_message = "Security policy must not be created when WAF is disabled"
  }
}

run "cdn_custom_domain_dns_records" {
  command = plan

  variables {
    custom_domains = [
      {
        host_name = "mywebsite.devex.pagopa.it"
        dns = {
          zone_name                = "devex.pagopa.it"
          zone_resource_group_name = "rg-test"
        }
      }
    ]
  }

  assert {
    condition     = length(azurerm_cdn_frontdoor_custom_domain.this) == 1
    error_message = "Expected exactly one custom domain"
  }

  assert {
    condition     = azurerm_cdn_frontdoor_custom_domain.this["mywebsite.devex.pagopa.it"].host_name == "mywebsite.devex.pagopa.it"
    error_message = "Custom domain hostname must match provided value"
  }

  assert {
    condition     = length(azurerm_dns_txt_record.validation) == 1
    error_message = "DNS TXT validation record must be created for custom domain"
  }

  assert {
    condition     = azurerm_dns_txt_record.validation["mywebsite.devex.pagopa.it"].name == "_dnsauth.mywebsite"
    error_message = "DNS TXT record name must be _dnsauth.<subdomain>"
  }

  assert {
    condition     = length(azurerm_dns_cname_record.this) == 1
    error_message = "DNS CNAME record must be created for custom domain"
  }
}

run "cdn_multiple_custom_domains" {
  command = plan

  variables {
    custom_domains = [
      {
        host_name = "site1.devex.pagopa.it"
        dns = {
          zone_name                = "devex.pagopa.it"
          zone_resource_group_name = "rg-test"
        }
      },
      {
        host_name = "site2.devex.pagopa.it"
        dns = {
          zone_name                = "devex.pagopa.it"
          zone_resource_group_name = "rg-test"
        }
      }
    ]
  }

  assert {
    condition     = length(azurerm_cdn_frontdoor_custom_domain.this) == 2
    error_message = "Expected exactly two custom domains"
  }

  assert {
    condition     = length(azurerm_dns_txt_record.validation) == 2
    error_message = "Expected two DNS TXT validation records"
  }

  assert {
    condition     = length(azurerm_dns_cname_record.this) == 2
    error_message = "Expected two DNS CNAME records"
  }
}

run "cdn_diagnostic_settings_enabled_both_destinations" {
  command = plan

  variables {
    diagnostic_settings = {
      enabled                                   = true
      log_analytics_workspace_id                = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.OperationalInsights/workspaces/test-law"
      diagnostic_setting_destination_storage_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.Storage/storageAccounts/teststorage"
    }
  }

  assert {
    condition     = length(azurerm_monitor_diagnostic_setting.this) == 1
    error_message = "Diagnostic settings must be created when enabled"
  }

  assert {
    condition     = azurerm_monitor_diagnostic_setting.this[0].log_analytics_workspace_id == "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.OperationalInsights/workspaces/test-law"
    error_message = "Log Analytics workspace ID must match provided value"
  }

  assert {
    condition     = azurerm_monitor_diagnostic_setting.this[0].storage_account_id == "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.Storage/storageAccounts/teststorage"
    error_message = "Storage account ID must match provided value"
  }
}

run "cdn_diagnostic_settings_disabled" {
  command = plan

  variables {
    diagnostic_settings = {
      enabled                                   = false
      log_analytics_workspace_id                = null
      diagnostic_setting_destination_storage_id = null
    }
  }

  assert {
    condition     = length(azurerm_monitor_diagnostic_setting.this) == 0
    error_message = "Diagnostic settings must not be created when disabled"
  }
}

run "cdn_diagnostic_settings_only_log_analytics" {
  command = plan

  variables {
    diagnostic_settings = {
      enabled                                   = true
      log_analytics_workspace_id                = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.OperationalInsights/workspaces/test-law"
      diagnostic_setting_destination_storage_id = null
    }
  }

  assert {
    condition     = length(azurerm_monitor_diagnostic_setting.this) == 1
    error_message = "Diagnostic settings must be created with only Log Analytics workspace"
  }

  assert {
    condition     = azurerm_monitor_diagnostic_setting.this[0].log_analytics_workspace_id != null
    error_message = "Log Analytics workspace ID must be set"
  }

  assert {
    condition     = azurerm_monitor_diagnostic_setting.this[0].storage_account_id == null
    error_message = "Storage account ID must be null when not provided"
  }
}

run "cdn_diagnostic_settings_only_storage" {
  command = plan

  variables {
    diagnostic_settings = {
      enabled                                   = true
      log_analytics_workspace_id                = null
      diagnostic_setting_destination_storage_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.Storage/storageAccounts/teststorage"
    }
  }

  assert {
    condition     = length(azurerm_monitor_diagnostic_setting.this) == 1
    error_message = "Diagnostic settings must be created with only Storage Account"
  }

  assert {
    condition     = azurerm_monitor_diagnostic_setting.this[0].log_analytics_workspace_id == null
    error_message = "Log Analytics workspace ID must be null when not provided"
  }

  assert {
    condition     = azurerm_monitor_diagnostic_setting.this[0].storage_account_id != null
    error_message = "Storage account ID must be set"
  }
}

run "cdn_with_existing_profile" {
  command = plan

  variables {
    existing_cdn_frontdoor_profile_id = "/subscriptions/12345678-1234-9876-4563-123456789012/resourceGroups/rg-test/providers/Microsoft.Cdn/profiles/cdn-profile-test"
  }

  assert {
    condition     = length(azurerm_cdn_frontdoor_profile.this) == 0
    error_message = "CDN profile must not be created when existing_cdn_frontdoor_profile_id is provided"
  }

  assert {
    condition     = length(data.azurerm_cdn_frontdoor_profile.existing) == 1
    error_message = "Data source for existing CDN profile must be created"
  }
}

run "cdn_with_existing_profile_and_waf" {
  command = plan

  variables {
    existing_cdn_frontdoor_profile_id = "/subscriptions/12345678-1234-9876-4563-123456789012/resourceGroups/rg-test/providers/Microsoft.Cdn/profiles/cdn-profile-test"
    waf_enabled                       = true
    custom_domains = [
      {
        host_name = "secure.devex.pagopa.it"
        dns = {
          zone_name                = "devex.pagopa.it"
          zone_resource_group_name = "rg-test"
        }
      }
    ]
  }

  assert {
    condition     = length(azurerm_cdn_frontdoor_profile.this) == 0
    error_message = "CDN profile must not be created when existing_cdn_frontdoor_profile_id is provided"
  }

  assert {
    condition     = length(azurerm_cdn_frontdoor_firewall_policy.this) == 1
    error_message = "WAF policy must be created when waf_enabled is true with existing profile"
  }

  assert {
    condition     = azurerm_cdn_frontdoor_firewall_policy.this[0].sku_name == "Standard_AzureFrontDoor"
    error_message = "WAF policy SKU must match the existing profile SKU"
  }
}

run "cdn_rule_set_created" {
  command = plan

  assert {
    condition     = azurerm_cdn_frontdoor_rule_set.this.name == "ruleset"
    error_message = "Rule set name must be 'ruleset'"
  }

  assert {
    condition     = length(azurerm_cdn_frontdoor_rule_set.this) > 0
    error_message = "Rule set must be created"
  }
  variables {
    custom_domains = [
      {
        host_name = "test.devex.pagopa.it"
        dns = {
          zone_name                = "devex.pagopa.it"
          zone_resource_group_name = "rg-test"
        }
      }
    ]
  }

  assert {
    condition     = length(azurerm_cdn_frontdoor_route.this.cdn_frontdoor_custom_domain_ids) > 0
    error_message = "Route must link custom domains when they are provided"
  }

  assert {
    condition     = azurerm_cdn_frontdoor_route.this.link_to_default_domain == true
    error_message = "Route must link to default domain"
  }
}

run "cdn_route_without_custom_domains" {
  command = plan

  assert {
    condition     = length(azurerm_cdn_frontdoor_route.this.cdn_frontdoor_custom_domain_ids) == 0
    error_message = "Route must not link custom domains when none are provided"
  }
}
