variables {
  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    domain          = "modules"
    app_name        = "appcs"
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

  size      = null
  key_vault = null
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

// Invalid size should trigger validation failure
run "invalid_size" {
  command = plan
  variables { size = "invalid" }

  expect_failures = [
    var.size,
  ]
}

// Private endpoint basics
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
    key_vault = {
      name                = "kv-test"
      resource_group_name = "rg-kv"
      has_rbac_support    = true
      subscription_id     = "00000000-0000-0000-0000-000000000000"
    }
  }

  assert {
    condition     = length(module.roles) >= 1
    error_message = "Role must be assigned to allow read-only access to KeyVault's secret"
  }
}
