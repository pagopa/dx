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
    Owner = "DevEx"
  }

  origins = {
    primary = {
      host_name = "test.blob.core.windows.net"
    }
  }

  diagnostic_settings = {
    enabled                                   = false
    log_analytics_workspace_id                = null
    diagnostic_setting_destination_storage_id = null
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

override_data {
  target = data.azurerm_key_vault.this
  values = {
    id = "/subscriptions/12345678-1234-9876-4563-123456789012/resourceGroups/rg-test/providers/Microsoft.KeyVault/vaults/kv-test"
  }
}

run "invalid_existing_profile_id_format" {
  command = plan

  variables {
    existing_cdn_frontdoor_profile_id = "invalid-resource-id"
  }

  expect_failures = [
    var.existing_cdn_frontdoor_profile_id,
  ]
}

run "invalid_existing_profile_id_wrong_provider" {
  command = plan

  variables {
    existing_cdn_frontdoor_profile_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Network/frontDoorWebApplicationFirewallPolicies/policy"
  }

  expect_failures = [
    var.existing_cdn_frontdoor_profile_id,
  ]
}

run "invalid_existing_profile_id_wrong_resource_type" {
  command = plan

  variables {
    existing_cdn_frontdoor_profile_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Cdn/endpoints/cdn-endpoint"
  }

  expect_failures = [
    var.existing_cdn_frontdoor_profile_id,
  ]
}

run "diagnostic_settings_enabled_without_destinations" {
  command = plan

  variables {
    diagnostic_settings = {
      enabled                                   = true
      log_analytics_workspace_id                = null
      diagnostic_setting_destination_storage_id = null
    }
  }

  expect_failures = [
    var.diagnostic_settings,
  ]
}

run "valid_diagnostic_settings_with_log_analytics" {
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
    error_message = "Diagnostic settings must be created when valid configuration is provided"
  }
}

run "valid_diagnostic_settings_with_storage" {
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
    error_message = "Diagnostic settings must be created when valid configuration is provided"
  }
}

run "valid_diagnostic_settings_with_both_destinations" {
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
    error_message = "Diagnostic settings must be created when valid configuration is provided"
  }
}

run "apex_domain_without_custom_certificate" {
  command = plan

  variables {
    custom_domains = [
      {
        host_name = "devex.pagopa.it"
        dns = {
          zone_name                = "devex.pagopa.it"
          zone_resource_group_name = "rg-test"
        }
        # custom_certificate not provided for apex domain
      }
    ]
  }

  expect_failures = [
    var.custom_domains,
  ]
}

run "apex_domain_with_custom_certificate" {
  command = plan

  variables {
    custom_domains = [
      {
        host_name = "devex.pagopa.it"
        dns = {
          zone_name                = "devex.pagopa.it"
          zone_resource_group_name = "rg-test"
        }
        custom_certificate = {
          key_vault_certificate_versionless_id = "https://kv-test.vault.azure.net/certificates/cert-apex"
          key_vault_name                       = "kv-test"
          key_vault_resource_group_name        = "rg-test"
          key_vault_has_rbac_support           = true
        }
      }
    ]
  }

  assert {
    condition     = length(azurerm_cdn_frontdoor_custom_domain.this) == 1
    error_message = "Custom domain must be created when apex domain has valid certificate configuration"
  }
}

run "subdomain_without_custom_certificate" {
  command = plan

  variables {
    custom_domains = [
      {
        host_name = "subdomain.devex.pagopa.it"
        dns = {
          zone_name                = "devex.pagopa.it"
          zone_resource_group_name = "rg-test"
        }
        # custom_certificate not required for subdomain
      }
    ]
  }

  assert {
    condition     = length(azurerm_cdn_frontdoor_custom_domain.this) == 1
    error_message = "Custom domain must be created for subdomain without custom certificate"
  }
}

run "managed_identity_origin_validation" {
  command = plan

  variables {
    origins = {
      primary = {
        host_name            = "test.blob.core.windows.net"
        use_managed_identity = true
        storage_account_id   = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Storage/storageAccounts/test"
      }
    }
  }

  expect_failures = [
    var.origins,
  ]
}

run "valid_origin_without_managed_identity" {
  command = plan

  variables {
    origins = {
      primary = {
        host_name            = "test.blob.core.windows.net"
        use_managed_identity = false
      }
    }
  }

  assert {
    condition     = length(azurerm_cdn_frontdoor_origin.this) == 1
    error_message = "Origin must be created when managed identity is not used"
  }
}

run "multiple_origins_with_same_priority" {
  command = plan

  variables {
    origins = {
      primary = {
        host_name = "primary.blob.core.windows.net"
        priority  = 1
      }
      secondary = {
        host_name = "secondary.blob.core.windows.net"
        priority  = 1
      }
    }
  }

  assert {
    condition     = length(azurerm_cdn_frontdoor_origin.this) == 2
    error_message = "Multiple origins with same priority should be allowed for load balancing"
  }
}

run "valid_existing_profile_id" {
  command = plan

  variables {
    existing_cdn_frontdoor_profile_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Cdn/profiles/cdn-profile-test"
  }

  assert {
    condition     = length(azurerm_cdn_frontdoor_profile.this) == 0
    error_message = "CDN profile must not be created when valid existing_cdn_frontdoor_profile_id is provided"
  }

  assert {
    condition     = length(data.azurerm_cdn_frontdoor_profile.existing) == 1
    error_message = "Data source must be created for valid existing profile ID"
  }
}
