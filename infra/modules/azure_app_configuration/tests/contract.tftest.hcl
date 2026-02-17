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
  use_case   = "default"
  size       = null
  key_vaults = null
  authorized_teams = {
    writers = []
    readers = []
  }
  subscription_id = "00000000-0000-0000-0000-000000000000"
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

run "key_vault_roles_contract" {
  command = plan
  variables {
    key_vaults = [
      {
        name                = "kv-contract-test"
        resource_group_name = "rg-kv-test"
        has_rbac_support    = true
        app_principal_ids   = ["aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"]
      }
    ]
  }

  assert {
    condition     = length(azurerm_role_assignment.app_kv_secrets_user) == 1
    error_message = "One Key Vault role assignment must exist for single principal"
  }

  assert {
    condition     = length(azurerm_role_assignment.app_appconfig_reader) == 1
    error_message = "One App Configuration role assignment must exist for single principal"
  }

  assert {
    condition     = length(local.app_principal_assignments) == 1
    error_message = "One principal assignment must be identified"
  }
}

run "authorized_teams_contract" {
  command = plan
  variables {
    authorized_teams = {
      writers = ["bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"]
      readers = ["cccccccc-cccc-cccc-cccc-cccccccccccc"]
    }
  }

  assert {
    condition     = length(module.appconfig_team_roles) == 2
    error_message = "Two team role modules must be created (1 writer + 1 reader)"
  }
}

run "deduplication_across_key_vaults" {
  command = plan
  variables {
    key_vaults = [
      {
        name                = "kv-1"
        resource_group_name = "rg-kv"
        has_rbac_support    = true
        app_principal_ids   = ["dddddddd-dddd-dddd-dddd-dddddddddddd", "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"]
      },
      {
        name                = "kv-2"
        resource_group_name = "rg-kv"
        has_rbac_support    = true
        app_principal_ids   = ["dddddddd-dddd-dddd-dddd-dddddddddddd"]
      }
    ]
  }

  assert {
    condition     = length(azurerm_role_assignment.app_kv_secrets_user) == 3
    error_message = "Three Key Vault role assignments must be created (2 from KV1 + 1 from KV2)"
  }

  assert {
    condition     = length(azurerm_role_assignment.app_appconfig_reader) == 3
    error_message = "Three App Configuration role assignments must be created (2 from KV1 + 1 from KV2)"
  }

  assert {
    condition     = length(local.app_principal_assignments) == 3
    error_message = "Three principal assignments must be created (2 from KV1 + 1 from KV2)"
  }
}
