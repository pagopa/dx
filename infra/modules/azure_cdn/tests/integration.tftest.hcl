# Integration Tests for Azure CDN Module
#
# IMPORTANT: These tests use an EXISTING CDN FrontDoor Profile to avoid long
# provisioning times (45+ minutes for profile creation/deletion).
#
# The existing profile "dx-d-itn-pagopa-afd-02" is pre-provisioned in the
# dev environment and referenced via the setup module.
#
# What we test:
# - Endpoint creation with existing profile
# - Origins configuration (single and multiple)
# - Custom domains and DNS records
# - WAF security policies
# - Diagnostic settings
# - Route configuration
#
# What we DON'T test here:
# - CDN Profile creation (too slow, covered by unit tests with mocks)
# - Profile deletion (too slow for CI/CD workflows)
#
# For full profile lifecycle testing, use manual tests or separate scheduled jobs.

provider "azurerm" {
  features {}
}

variables {
  test_kind = "integration"

  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    domain          = "integ"
    app_name        = "test"
    instance_number = "01"
  }

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    BusinessUnit   = "DevEx"
    Source         = "https://github.com/pagopa/dx/infra/modules/azure_cdn/tests"
    ManagementTeam = "Developer Experience"
    Test           = "true"
    TestName       = "CDN integration tests"
  }
}

run "setup" {
  module {
    source = "./tests/setup"
  }

  variables {
    environment = var.environment
    tags        = var.tags
  }
}

run "apply_endpoint_with_existing_profile" {
  command = apply

  variables {
    environment                       = var.environment
    tags                              = var.tags
    resource_group_name               = run.setup.resource_group_name
    existing_cdn_frontdoor_profile_id = run.setup.cdn_profile_id

    origins = {
      primary = {
        host_name = run.setup.storage_account_host_name
      }
    }
  }

  assert {
    condition     = length(azurerm_cdn_frontdoor_profile.this) == 0
    error_message = "CDN profile must not be created when using existing profile"
  }

  assert {
    condition     = length(data.azurerm_cdn_frontdoor_profile.existing) == 1
    error_message = "Data source for existing profile must be used"
  }

  assert {
    condition     = azurerm_cdn_frontdoor_origin.this["primary"].host_name == run.setup.storage_account_host_name
    error_message = "Origin hostname must match storage account hostname"
  }

  assert {
    condition     = azurerm_cdn_frontdoor_endpoint.this.enabled == true
    error_message = "CDN endpoint must be enabled"
  }

  assert {
    condition     = azurerm_cdn_frontdoor_route.this.enabled == true
    error_message = "CDN route must be enabled"
  }

  assert {
    condition     = azurerm_cdn_frontdoor_route.this.forwarding_protocol == "HttpsOnly"
    error_message = "Route must use HTTPS-only forwarding"
  }

  assert {
    condition     = azurerm_cdn_frontdoor_route.this.https_redirect_enabled == true
    error_message = "HTTPS redirect must be enabled"
  }
}

run "apply_cdn_with_custom_domain" {
  command = apply

  variables {
    environment = {
      prefix          = "dx"
      env_short       = "d"
      location        = "italynorth"
      domain          = "integ"
      app_name        = "test"
      instance_number = "02"
    }
    tags                              = var.tags
    resource_group_name               = run.setup.resource_group_name
    existing_cdn_frontdoor_profile_id = run.setup.cdn_profile_id

    origins = {
      primary = {
        host_name = run.setup.storage_account_host_name
      }
    }

    custom_domains = [
      {
        host_name = "cdn-test.devex.pagopa.it"
        dns = {
          zone_name                = run.setup.devex_pagopa_it_zone_name
          zone_resource_group_name = run.setup.resource_group_name
        }
      }
    ]
  }

  assert {
    condition     = length(azurerm_cdn_frontdoor_custom_domain.this) == 1
    error_message = "Custom domain must be created"
  }

  assert {
    condition     = azurerm_cdn_frontdoor_custom_domain.this["cdn-test.devex.pagopa.it"].host_name == "cdn-test.devex.pagopa.it"
    error_message = "Custom domain hostname must match"
  }

  assert {
    condition     = length(azurerm_dns_txt_record.validation) == 1
    error_message = "DNS TXT validation record must be created"
  }

  assert {
    condition     = azurerm_dns_txt_record.validation["cdn-test.devex.pagopa.it"].name == "_dnsauth.cdn-test"
    error_message = "DNS TXT record must have correct name"
  }

  assert {
    condition     = length(azurerm_dns_cname_record.this) == 1
    error_message = "DNS CNAME record must be created"
  }

  assert {
    condition     = azurerm_dns_cname_record.this["cdn-test.devex.pagopa.it"].name == "cdn-test"
    error_message = "DNS CNAME record must have correct name"
  }
}

run "apply_cdn_with_waf" {
  command = apply

  variables {
    environment = {
      prefix          = "dx"
      env_short       = "d"
      location        = "italynorth"
      domain          = "integ"
      app_name        = "test"
      instance_number = "03"
    }
    tags                              = var.tags
    resource_group_name               = run.setup.resource_group_name
    existing_cdn_frontdoor_profile_id = run.setup.cdn_profile_id
    waf_enabled                       = true

    origins = {
      primary = {
        host_name = run.setup.storage_account_host_name
      }
    }

    custom_domains = [
      {
        host_name = "secure-cdn.devex.pagopa.it"
        dns = {
          zone_name                = run.setup.devex_pagopa_it_zone_name
          zone_resource_group_name = run.setup.resource_group_name
        }
      }
    ]
  }

  assert {
    condition     = length(azurerm_cdn_frontdoor_firewall_policy.this) == 1
    error_message = "WAF policy must be created when enabled"
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
    condition     = length(azurerm_cdn_frontdoor_security_policy.this) == 1
    error_message = "Security policy must be created"
  }
}

run "apply_cdn_with_diagnostic_settings" {
  command = apply

  variables {
    environment = {
      prefix          = "dx"
      env_short       = "d"
      location        = "italynorth"
      domain          = "integ"
      app_name        = "test"
      instance_number = "04"
    }
    tags                              = var.tags
    resource_group_name               = run.setup.resource_group_name
    existing_cdn_frontdoor_profile_id = run.setup.cdn_profile_id

    origins = {
      primary = {
        host_name = run.setup.storage_account_host_name
      }
    }

    diagnostic_settings = {
      enabled                         = true
      log_analytics_workspace_id      = run.setup.log_analytics_workspace_id
      log_analytics_destination_type  = "Dedicated"
      storage_account_id              = null
      event_hub_authorization_rule_id = null
      event_hub_name                  = null
      marketplace_partner_resource_id = null
      logs_destinations_ids           = []
      metric_enabled                  = true
      log_categories                  = null
      metric_categories               = null
      retention_policy_enabled        = false
      retention_policy_days           = 0
      eventhub_authorization_rule_id  = null
      partner_solution_id             = null
    }
  }

  assert {
    condition     = length(azurerm_monitor_diagnostic_setting.this) == 1
    error_message = "Diagnostic setting must be created"
  }

  assert {
    condition     = azurerm_monitor_diagnostic_setting.this[0].log_analytics_workspace_id == run.setup.log_analytics_workspace_id
    error_message = "Diagnostic setting must use correct Log Analytics workspace"
  }

  assert {
    condition     = azurerm_monitor_diagnostic_setting.this[0].log_analytics_destination_type == "Dedicated"
    error_message = "Diagnostic setting must use dedicated destination type"
  }
}

run "apply_cdn_with_multiple_origins" {
  command = apply

  variables {
    environment = {
      prefix          = "dx"
      env_short       = "d"
      location        = "italynorth"
      domain          = "integ"
      app_name        = "test"
      instance_number = "05"
    }
    tags                              = var.tags
    resource_group_name               = run.setup.resource_group_name
    existing_cdn_frontdoor_profile_id = run.setup.cdn_profile_id

    origins = {
      primary = {
        host_name = run.setup.storage_account_host_name
        priority  = 1
      }
      secondary = {
        host_name = run.setup.storage_account_host_name
        priority  = 2
      }
    }
  }

  assert {
    condition     = length(azurerm_cdn_frontdoor_profile.this) == 0
    error_message = "CDN profile must not be created when using existing profile"
  }

  assert {
    condition     = length(data.azurerm_cdn_frontdoor_profile.existing) == 1
    error_message = "Data source for existing profile must be used"
  }

  assert {
    condition     = length(azurerm_cdn_frontdoor_origin.this) == 2
    error_message = "Two origins must be created"
  }

  assert {
    condition     = azurerm_cdn_frontdoor_origin.this["primary"].priority == 1
    error_message = "Primary origin priority must be 1"
  }

  assert {
    condition     = azurerm_cdn_frontdoor_origin.this["secondary"].priority == 2
    error_message = "Secondary origin priority must be 2"
  }

  assert {
    condition     = azurerm_cdn_frontdoor_origin.this["primary"].host_name == run.setup.storage_account_host_name
    error_message = "Origins must be created with existing profile"
  }
}
