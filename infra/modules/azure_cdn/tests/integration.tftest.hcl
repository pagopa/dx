# Integration Tests for Azure CDN Module

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
    source = "./tests/setup_integration"
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

    waf_enabled = true

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
