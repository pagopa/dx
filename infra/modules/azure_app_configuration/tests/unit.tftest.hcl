variables {
  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    domain          = "modules"
    app_name        = "appcstest"
    instance_number = "01"
  }

  tags = {
    BusinessUnit   = "DevEx"
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    Source         = "https://github.com/pagopa/dx/infra/modules/azure_app_configuration/tests"
    ManagementTeam = "Developer Experience"
    Test           = "true"
    TestName       = "App Configuration unit tests"
  }

  use_case = "default"

  resource_group_name = "rg-test"
  virtual_network = {
    name                = "vnet-test"
    resource_group_name = "rg-network"
  }
  private_dns_zone_resource_group_name = null
  subnet_pep_id                        = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Network/virtualNetworks/vnet-test/subnets/snet-pep"

  size       = null
  key_vaults = null
  authorized_teams = {
    writers = []
    readers = []
  }
  subscription_id = "00000000-0000-0000-0000-000000000000"
}

mock_provider "azurerm" {}

// Override DNS zone data source with a deterministic ID so plan can succeed
override_data {
  target = data.azurerm_private_dns_zone.appconfig
  values = {
    id   = "/subscriptions/12345678-1234-9876-4563-123456789012/resourceGroups/rg-network/providers/Microsoft.Network/privateDnsZones/privatelink.azconfig.io"
    name = "privatelink.azconfig.io"
  }
}

run "app_configuration_basics" {
  command = plan

  assert {
    condition     = azurerm_app_configuration.this.sku == "standard"
    error_message = "SKU must resolve to 'standard' when use_case=default and size unset"
  }
  assert {
    condition     = azurerm_app_configuration.this.identity[0].type == "SystemAssigned"
    error_message = "Identity must be SystemAssigned"
  }
  assert {
    condition     = azurerm_app_configuration.this.local_auth_enabled == false
    error_message = "Local auth must be disabled"
  }
  assert {
    condition     = azurerm_app_configuration.this.public_network_access == "Disabled"
    error_message = "Public network access must be Disabled"
  }
  assert {
    condition     = azurerm_app_configuration.this.purge_protection_enabled == true
    error_message = "Purge protection must be enabled"
  }
  assert {
    condition     = azurerm_app_configuration.this.data_plane_proxy_authentication_mode == "Pass-through"
    error_message = "Data plane proxy authentication mode must be Pass-through"
  }
}

run "app_configuration_explicit_premium" {
  command = plan
  variables { size = "premium" }

  assert {
    condition     = azurerm_app_configuration.this.sku == "premium"
    error_message = "SKU must be 'premium' when size is explicitly set"
  }
}

run "app_configuration_development_use_case" {
  command = plan
  variables {
    use_case = "development"
  }

  assert {
    condition     = azurerm_app_configuration.this.sku == "developer"
    error_message = "SKU must be 'developer' when use_case is 'development'"
  }
}


run "private_endpoint_configuration_stores" {
  command = plan

  assert {
    condition     = azurerm_private_endpoint.app_config.subnet_id == var.subnet_pep_id
    error_message = "Private Endpoint must target provided PEP subnet"
  }
  assert {
    condition     = azurerm_private_endpoint.app_config.private_service_connection[0].subresource_names[0] == "configurationStores"
    error_message = "Private Endpoint subresource must be 'configurationStores'"
  }
  assert {
    condition     = can(regex("privatelink\\.azconfig\\.io$", data.azurerm_private_dns_zone.appconfig.name))
    error_message = "DNS zone name must match privatelink.azconfig.io"
  }
}

run "private_endpoint_subresource" {
  command = plan
  assert {
    condition     = azurerm_private_endpoint.app_config.private_service_connection[0].subresource_names[0] == "configurationStores"
    error_message = "Private endpoint subresource must be configurationStores"
  }
}

run "key_vault_integration" {
  command = plan
  variables {
    key_vaults = [
      {
        name                = "kv-test"
        resource_group_name = "rg-kv"
        has_rbac_support    = true
        app_principal_ids   = ["11111111-1111-1111-1111-111111111111"]
      }
    ]
  }

  assert {
    condition     = length(azurerm_role_assignment.app_kv_secrets_user) == 1
    error_message = "One Key Vault role assignment must be created for the principal"
  }

  assert {
    condition     = length(azurerm_role_assignment.app_appconfig_reader) == 1
    error_message = "One App Configuration role assignment must be created for the principal"
  }

  assert {
    condition     = length(local.app_principal_assignments) == 1
    error_message = "One principal assignment must be identified"
  }
}

run "key_vault_multiple_principals" {
  command = plan
  variables {
    key_vaults = [
      {
        name                = "kv-test-1"
        resource_group_name = "rg-kv"
        has_rbac_support    = true
        app_principal_ids   = ["11111111-1111-1111-1111-111111111111", "22222222-2222-2222-2222-222222222222"]
      },
      {
        name                = "kv-test-2"
        resource_group_name = "rg-kv"
        has_rbac_support    = false
        app_principal_ids   = ["11111111-1111-1111-1111-111111111111"]
      }
    ]
  }

  assert {
    condition     = length(azurerm_role_assignment.app_kv_secrets_user) == 3
    error_message = "Three Key Vault role assignments must be created (2 principals from KV1 + 1 principal from KV2)"
  }

  assert {
    condition     = length(azurerm_role_assignment.app_appconfig_reader) == 3
    error_message = "Three App Configuration role assignments must be created (2 principals from KV1 + 1 principal from KV2)"
  }

  assert {
    condition     = length(local.app_principal_assignments) == 3
    error_message = "Three principal assignments must be identified (2 from KV1 + 1 from KV2)"
  }
}

run "authorized_teams_roles" {
  command = plan
  variables {
    authorized_teams = {
      writers = ["33333333-3333-3333-3333-333333333333"]
      readers = ["44444444-4444-4444-4444-444444444444", "55555555-5555-5555-5555-555555555555"]
    }
  }

  assert {
    condition     = length(module.appconfig_team_roles) == 3
    error_message = "Three team role assignments must be created (1 writer + 2 readers)"
  }

  assert {
    condition     = length(local.appconfig_role_assignments) == 3
    error_message = "Three role assignments must be in local map"
  }
}

run "app_configuration_diagnostics_enabled" {
  command = plan
  variables {
    diagnostic_settings = {
      enabled                    = true
      log_analytics_workspace_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.OperationalInsights/workspaces/law-test"
      storage_account_id         = null
    }
  }

  assert {
    condition     = length(azurerm_monitor_diagnostic_setting.app_configuration) == 1
    error_message = "Diagnostic setting should be created when enabled"
  }

  assert {
    condition     = azurerm_monitor_diagnostic_setting.app_configuration[0].log_analytics_workspace_id == "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.OperationalInsights/workspaces/law-test"
    error_message = "Log Analytics workspace ID should be set correctly"
  }
}
