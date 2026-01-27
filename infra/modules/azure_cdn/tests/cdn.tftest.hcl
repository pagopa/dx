provider "azurerm" {
  features {
  }
}

run "setup_tests" {
  module {
    source = "./tests/setup"
  }

  variables {
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
      TestName       = "Create cdn for test"
    }
  }
}

run "verify_basic_cdn_setup" {
  command = plan

  variables {
    resource_group_name = run.setup_tests.resource_group_name

    environment = {
      prefix          = "dx"
      env_short       = "d"
      location        = "italynorth"
      domain          = "modules"
      app_name        = "test"
      instance_number = "01"
    }

    origins = {
      primary = {
        host_name = run.setup_tests.storage_account_host_name
      }
    }

    custom_domains = [
      {
        host_name = "mywebsite.devex.pagopa.it",
        dns = {
          zone_name                = run.setup_tests.devex_pagopa_it_zone_name
          zone_resource_group_name = run.setup_tests.resource_group_name
        }
      }
    ]

    tags = {
      CostCenter     = "TS000 - Tecnologia e Servizi"
      CreatedBy      = "Terraform"
      Environment    = "Dev"
      BusinessUnit   = "DevEx"
      Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_cdn/tests"
      ManagementTeam = "Developer Experience"
      Test           = "true"
      TestName       = "Create cdn for test"
    }
  }

  assert {
    condition     = azurerm_cdn_frontdoor_profile.this[0].sku_name == "Standard_AzureFrontDoor"
    error_message = "CDN profile SKU should be Standard_AzureFrontDoor"
  }

  assert {
    condition     = length(azurerm_cdn_frontdoor_origin.this) == 1
    error_message = "Expected exactly one origin to be created"
  }

  assert {
    condition     = azurerm_cdn_frontdoor_profile.this[0].identity[0].type == "SystemAssigned"
    error_message = "No system-assigned managed identity found for the CDN FrontDoor Profile"
  }

  assert {
    condition     = azurerm_cdn_frontdoor_origin.this["primary"].host_name == run.setup_tests.storage_account_host_name
    error_message = "Origin hostname doesn't match expected value"
  }

  assert {
    condition     = azurerm_dns_txt_record.validation["mywebsite.devex.pagopa.it"].name == "_dnsauth.mywebsite"
    error_message = "DNS TXT record name for mywebsite.devex.pagopa.it custom domain doesn't match expected value"
  }
}

run "cdn_with_diagnostic_settings" {
  command = plan

  variables {
    resource_group_name = run.setup_tests.resource_group_name

    environment = {
      prefix          = "dx"
      env_short       = "d"
      location        = "italynorth"
      domain          = "modules"
      app_name        = "test"
      instance_number = "01"
    }

    origins = {
      primary = {
        host_name = run.setup_tests.storage_account_host_name
      }
    }

    diagnostic_settings = {
      enabled                                   = true
      log_analytics_workspace_id                = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.OperationalInsights/workspaces/test-law"
      diagnostic_setting_destination_storage_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.Storage/storageAccounts/teststorage"
    }

    tags = {
      CostCenter     = "TS000 - Tecnologia e Servizi"
      CreatedBy      = "Terraform"
      Environment    = "Dev"
      BusinessUnit   = "DevEx"
      Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_cdn/tests"
      ManagementTeam = "Developer Experience"
      Test           = "true"
      TestName       = "Create cdn with diagnostic settings"
    }
  }

  assert {
    condition     = length(azurerm_monitor_diagnostic_setting.this) == 1
    error_message = "Diagnostic settings should be created when enabled"
  }
}

run "cdn_without_diagnostic_settings" {
  command = plan

  variables {
    resource_group_name = run.setup_tests.resource_group_name

    environment = {
      prefix          = "dx"
      env_short       = "d"
      location        = "italynorth"
      domain          = "modules"
      app_name        = "test"
      instance_number = "01"
    }

    origins = {
      primary = {
        host_name = run.setup_tests.storage_account_host_name
      }
    }

    diagnostic_settings = {
      enabled                                   = false
      log_analytics_workspace_id                = null
      diagnostic_setting_destination_storage_id = null
    }

    tags = {
      CostCenter     = "TS000 - Tecnologia e Servizi"
      CreatedBy      = "Terraform"
      Environment    = "Dev"
      BusinessUnit   = "DevEx"
      Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_cdn/tests"
      ManagementTeam = "Developer Experience"
      Test           = "true"
      TestName       = "Create cdn without diagnostic settings"
    }
  }

  assert {
    condition     = length(azurerm_monitor_diagnostic_setting.this) == 0
    error_message = "Diagnostic settings should not be created when disabled"
  }
}

run "cdn_with_diagnostic_settings_only_log_analytics" {
  command = plan

  variables {
    resource_group_name = run.setup_tests.resource_group_name

    environment = {
      prefix          = "dx"
      env_short       = "d"
      location        = "italynorth"
      domain          = "modules"
      app_name        = "test"
      instance_number = "01"
    }

    origins = {
      primary = {
        host_name = run.setup_tests.storage_account_host_name
      }
    }

    diagnostic_settings = {
      enabled                                   = true
      log_analytics_workspace_id                = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.OperationalInsights/workspaces/test-law"
      diagnostic_setting_destination_storage_id = null
    }

    tags = {
      CostCenter     = "TS000 - Tecnologia e Servizi"
      CreatedBy      = "Terraform"
      Environment    = "Dev"
      BusinessUnit   = "DevEx"
      Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_cdn/tests"
      ManagementTeam = "Developer Experience"
      Test           = "true"
      TestName       = "Create cdn with diagnostic settings only Log Analytics"
    }
  }

  assert {
    condition     = length(azurerm_monitor_diagnostic_setting.this) == 1
    error_message = "Diagnostic settings should be created with only Log Analytics workspace"
  }
}

run "cdn_with_diagnostic_settings_only_storage" {
  command = plan

  variables {
    resource_group_name = run.setup_tests.resource_group_name

    environment = {
      prefix          = "dx"
      env_short       = "d"
      location        = "italynorth"
      domain          = "modules"
      app_name        = "test"
      instance_number = "01"
    }

    origins = {
      primary = {
        host_name = run.setup_tests.storage_account_host_name
      }
    }

    diagnostic_settings = {
      enabled                                   = true
      log_analytics_workspace_id                = null
      diagnostic_setting_destination_storage_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.Storage/storageAccounts/teststorage"
    }

    tags = {
      CostCenter     = "TS000 - Tecnologia e Servizi"
      CreatedBy      = "Terraform"
      Environment    = "Dev"
      BusinessUnit   = "DevEx"
      Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_cdn/tests"
      ManagementTeam = "Developer Experience"
      Test           = "true"
      TestName       = "Create cdn with diagnostic settings only Storage Account"
    }
  }

  assert {
    condition     = length(azurerm_monitor_diagnostic_setting.this) == 1
    error_message = "Diagnostic settings should be created with only Storage Account"
  }
}

run "cdn_with_diagnostic_settings_enabled_but_no_destinations" {
  command = plan

  variables {
    resource_group_name = run.setup_tests.resource_group_name

    environment = {
      prefix          = "dx"
      env_short       = "d"
      location        = "italynorth"
      domain          = "modules"
      app_name        = "test"
      instance_number = "01"
    }

    origins = {
      primary = {
        host_name = run.setup_tests.storage_account_host_name
      }
    }

    diagnostic_settings = {
      enabled                                   = true
      log_analytics_workspace_id                = null
      diagnostic_setting_destination_storage_id = null
    }

    tags = {
      CostCenter     = "TS000 - Tecnologia e Servizi"
      CreatedBy      = "Terraform"
      Environment    = "Dev"
      BusinessUnit   = "DevEx"
      Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_cdn/tests"
      ManagementTeam = "Developer Experience"
      Test           = "true"
      TestName       = "Expect failure when diagnostic settings enabled without destinations"
    }
  }

  expect_failures = [
    var.diagnostic_settings,
  ]
}

run "cdn_with_waf_enabled" {
  command = plan

  variables {
    resource_group_name = run.setup_tests.resource_group_name

    environment = {
      prefix          = "dx"
      env_short       = "d"
      location        = "italynorth"
      domain          = "modules"
      app_name        = "test"
      instance_number = "01"
    }

    origins = {
      primary = {
        host_name = run.setup_tests.storage_account_host_name
      }
    }

    waf_enabled = true

    custom_domains = [
      {
        host_name = "secure.devex.pagopa.it",
        dns = {
          zone_name                = run.setup_tests.devex_pagopa_it_zone_name
          zone_resource_group_name = run.setup_tests.resource_group_name
        }
      }
    ]

    tags = {
      CostCenter     = "TS000 - Tecnologia e Servizi"
      CreatedBy      = "Terraform"
      Environment    = "Dev"
      BusinessUnit   = "DevEx"
      Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_cdn/tests"
      ManagementTeam = "Developer Experience"
      Test           = "true"
      TestName       = "Create CDN with WAF enabled"
    }
  }

  assert {
    condition     = length(azurerm_cdn_frontdoor_firewall_policy.this) == 1
    error_message = "WAF policy should be created when waf_enabled is true"
  }

  assert {
    condition     = length(azurerm_cdn_frontdoor_security_policy.this) == 1
    error_message = "Security policy should be created when waf_enabled is true"
  }

  assert {
    condition     = azurerm_cdn_frontdoor_firewall_policy.this[0].mode == "Prevention"
    error_message = "WAF policy mode should be Prevention"
  }
}

run "cdn_with_waf_disabled" {
  command = plan

  variables {
    resource_group_name = run.setup_tests.resource_group_name

    environment = {
      prefix          = "dx"
      env_short       = "d"
      location        = "italynorth"
      domain          = "modules"
      app_name        = "test"
      instance_number = "01"
    }

    origins = {
      primary = {
        host_name = run.setup_tests.storage_account_host_name
      }
    }

    waf_enabled = false

    tags = {
      CostCenter     = "TS000 - Tecnologia e Servizi"
      CreatedBy      = "Terraform"
      Environment    = "Dev"
      BusinessUnit   = "DevEx"
      Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_cdn/tests"
      ManagementTeam = "Developer Experience"
      Test           = "true"
      TestName       = "Create CDN with WAF disabled"
    }
  }

  assert {
    condition     = length(azurerm_cdn_frontdoor_firewall_policy.this) == 0
    error_message = "WAF policy should not be created when waf_enabled is false"
  }

  assert {
    condition     = length(azurerm_cdn_frontdoor_security_policy.this) == 0
    error_message = "Security policy should not be created when waf_enabled is false"
  }
}

run "cdn_with_managed_identity_origin" {
  command = plan

  variables {
    resource_group_name = run.setup_tests.resource_group_name

    environment = {
      prefix          = "dx"
      env_short       = "d"
      location        = "italynorth"
      domain          = "modules"
      app_name        = "test"
      instance_number = "01"
    }

    origins = {
      primary = {
        host_name            = run.setup_tests.storage_account_host_name
        use_managed_identity = true
        storage_account_id   = run.setup_tests.storage_account_id
      }
    }

    tags = {
      CostCenter     = "TS000 - Tecnologia e Servizi"
      CreatedBy      = "Terraform"
      Environment    = "Dev"
      BusinessUnit   = "DevEx"
      Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_cdn/tests"
      ManagementTeam = "Developer Experience"
      Test           = "true"
      TestName       = "Create CDN with managed identity for origin"
    }
  }

  assert {
    condition     = length(azurerm_role_assignment.origin_storage_blob_data_reader) == 1
    error_message = "Role assignment should be created for managed identity origin"
  }

  assert {
    condition     = azurerm_role_assignment.origin_storage_blob_data_reader["primary"].role_definition_name == "Storage Blob Data Reader"
    error_message = "Role assignment should grant Storage Blob Data Reader role"
  }
}

run "cdn_with_existing_profile" {
  command = plan

  variables {
    resource_group_name = run.setup_tests.resource_group_name

    environment = {
      prefix          = "dx"
      env_short       = "d"
      location        = "italynorth"
      domain          = "modules"
      app_name        = "test"
      instance_number = "03"
    }

    existing_cdn_frontdoor_profile_id = run.setup_tests.cdn_profile_id

    origins = {
      secondary = {
        host_name = run.setup_tests.storage_account_host_name
      }
    }

    tags = {
      CostCenter     = "TS000 - Tecnologia e Servizi"
      CreatedBy      = "Terraform"
      Environment    = "Dev"
      BusinessUnit   = "DevEx"
      Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_cdn/tests"
      ManagementTeam = "Developer Experience"
      Test           = "true"
      TestName       = "Create CDN resources using existing profile"
    }
  }

  assert {
    condition     = length(azurerm_cdn_frontdoor_profile.this) == 0
    error_message = "CDN profile should not be created when existing_cdn_frontdoor_profile_id is provided"
  }

  assert {
    condition     = length(data.azurerm_cdn_frontdoor_profile.existing) == 1
    error_message = "Data source for existing CDN profile should be created"
  }
}

run "cdn_with_existing_profile_and_waf" {
  command = plan

  variables {
    resource_group_name = run.setup_tests.resource_group_name

    environment = {
      prefix          = "dx"
      env_short       = "d"
      location        = "italynorth"
      domain          = "modules"
      app_name        = "test"
      instance_number = "04"
    }

    existing_cdn_frontdoor_profile_id = run.setup_tests.cdn_profile_id
    waf_enabled                       = true

    origins = {
      tertiary = {
        host_name = run.setup_tests.storage_account_host_name
      }
    }

    custom_domains = [
      {
        host_name = "secure-existing.devex.pagopa.it",
        dns = {
          zone_name                = run.setup_tests.devex_pagopa_it_zone_name
          zone_resource_group_name = run.setup_tests.resource_group_name
        }
      }
    ]

    tags = {
      CostCenter     = "TS000 - Tecnologia e Servizi"
      CreatedBy      = "Terraform"
      Environment    = "Dev"
      BusinessUnit   = "DevEx"
      Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_cdn/tests"
      ManagementTeam = "Developer Experience"
      Test           = "true"
      TestName       = "Create CDN with existing profile and WAF enabled"
    }
  }

  assert {
    condition     = length(azurerm_cdn_frontdoor_profile.this) == 0
    error_message = "CDN profile should not be created when existing_cdn_frontdoor_profile_id is provided"
  }

  assert {
    condition     = length(azurerm_cdn_frontdoor_firewall_policy.this) == 1
    error_message = "WAF policy should be created when waf_enabled is true with existing profile"
  }

  assert {
    condition     = length(azurerm_cdn_frontdoor_security_policy.this) == 1
    error_message = "Security policy should be created when waf_enabled is true with existing profile"
  }

  assert {
    condition     = azurerm_cdn_frontdoor_firewall_policy.this[0].sku_name == "Standard_AzureFrontDoor"
    error_message = "WAF policy SKU should match the existing profile SKU"
  }
}

run "cdn_with_managed_identity_without_storage_account_id" {
  command = plan

  variables {
    resource_group_name = run.setup_tests.resource_group_name

    environment = {
      prefix          = "dx"
      env_short       = "d"
      location        = "italynorth"
      domain          = "modules"
      app_name        = "test"
      instance_number = "05"
    }

    origins = {
      primary = {
        host_name            = run.setup_tests.storage_account_host_name
        use_managed_identity = true
        # storage_account_id is intentionally omitted to test the precondition
      }
    }

    tags = {
      CostCenter     = "TS000 - Tecnologia e Servizi"
      CreatedBy      = "Terraform"
      Environment    = "Dev"
      BusinessUnit   = "DevEx"
      Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_cdn/tests"
      ManagementTeam = "Developer Experience"
      Test           = "true"
      TestName       = "Test precondition: managed identity without storage account ID"
    }
  }

  expect_failures = [
    azurerm_role_assignment.origin_storage_blob_data_reader,
  ]
}
