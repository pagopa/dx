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
    TestName       = "App Configuration contract tests"
  }

  // Base inputs
  resource_group_name = "rg-test"
  virtual_network = {
    name                = "vnet-test"
    resource_group_name = "rg-network"
  }
  private_dns_zone_resource_group_name = null
  subnet_pep_id                        = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Network/virtualNetworks/vnet-test/subnets/snet-pep"

  // Defaults
  use_case  = "default"
  size      = null
  key_vault = null
}

mock_provider "azurerm" {}

override_data {
  target = data.azurerm_private_dns_zone.appconfig
  values = {
    id   = "/subscriptions/12345678-1234-9876-4563-123456789012/resourceGroups/rg-network/providers/Microsoft.Network/privateDnsZones/privatelink.azconfig.io"
    name = "privatelink.azconfig.io"
  }
}

run "invalid_size_value" {
  command = plan
  variables { size = "invalid" }

  expect_failures = [
    var.size,
  ]
}

run "valid_explicit_premium_size" {
  command = plan
  variables { size = "premium" }

  assert {
    condition     = azurerm_app_configuration.this.sku == "premium"
    error_message = "Explicit size=premium must set SKU to premium"
  }
}

run "valid_explicit_standard_size" {
  command = plan
  variables { size = "standard" }

  assert {
    condition     = azurerm_app_configuration.this.sku == "standard"
    error_message = "Explicit size=standard must set SKU to standard"
  }
}

run "invalid_use_case_development_premium" {
  command = plan
  variables {
    use_case = "development"
    size     = "premium"
  }

  expect_failures = [
    var.size,
  ]
}
