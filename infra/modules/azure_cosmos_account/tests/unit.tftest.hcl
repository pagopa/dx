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
    Owner          = "DevEx"
    Source         = "https://github.com/pagopa/dx/infra/modules/azure_cosmos_account/tests"
    ManagementTeam = "Developer Experience"
    Test           = "true"
    TestName       = "Cosmos unit tests"
  }

  tier = "l"

  // These will be provided by the mocked setup module call
  resource_group_name                  = "rg-test"
  subnet_pep_id                        = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Network/virtualNetworks/vnet-test/subnets/snet-pep"
  private_dns_zone_resource_group_name = "dx-d-itn-network-rg-01"

  primary_geo_location = {
    location       = "italynorth"
    zone_redundant = true
  }

  secondary_geo_locations = [
    {
      location          = "westeurope"
      failover_priority = 1
      zone_redundant    = true
    }
  ]

  force_public_network_access_enabled = false

  // Start with Custom bounded staleness to exercise consistency logic
  consistency_policy = {
    consistency_preset      = "Custom"
    consistency_level       = "BoundedStaleness"
    max_interval_in_seconds = 300
    max_staleness_prefix    = 100000
  }

  alerts = {
    enabled = false
  }

  authorized_teams = {
    readers = []
    writers = []
  }
}

// Provider mocks. We prevent any real API calls and feed minimal state the module needs at plan time.
mock_provider "azurerm" {}

// Override data source to return a valid Azure resource ID for Private DNS Zone
// so the azurerm provider does not fail parsing at plan time.
override_data {
  target = data.azurerm_private_dns_zone.cosmos
  values = {
    id = "/subscriptions/12345678-1234-9876-4563-123456789012/resourceGroups/dx-d-itn-network-rg-01/providers/Microsoft.Network/privateDnsZones/privatelink.documents.azure.com"
  }
}

// Assert Cosmos DB account baseline properties
run "cosmos_account_basics" {
  command = plan

  assert {
    condition     = azurerm_cosmosdb_account.this.offer_type == "Standard"
    error_message = "Cosmos DB offer_type must be Standard"
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.kind == "GlobalDocumentDB"
    error_message = "Cosmos DB kind must be GlobalDocumentDB"
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.automatic_failover_enabled == true
    error_message = "Cosmos DB automatic_failover_enabled must be true"
  }

  assert {
    condition     = length(azurerm_cosmosdb_account.this.capabilities) == 0
    error_message = "Cosmos DB must not enable Serverless capability when tier = 'l'"
  }
}

run "cosmos_account_serverless" {
  command = plan

  variables {
    tier = "s"
  }

  assert {
    condition     = [for c in azurerm_cosmosdb_account.this.capabilities : c.name][0] == "EnableServerless"
    error_message = "Cosmos DB must enable Serverless capability when tier = 's'"
  }
}

run "consistency_policy_custom_bounded" {
  command = plan

  assert {
    condition     = azurerm_cosmosdb_account.this.consistency_policy[0].consistency_level == "BoundedStaleness"
    error_message = "Consistency level must be BoundedStaleness for Custom preset"
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.consistency_policy[0].max_interval_in_seconds == 300
    error_message = "max_interval_in_seconds must be 300 for BoundedStaleness"
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.consistency_policy[0].max_staleness_prefix == 100000
    error_message = "max_staleness_prefix must be 100000 for BoundedStaleness"
  }
}

// Assert private endpoint wiring at plan time
run "private_endpoint_sql" {
  command = plan

  assert {
    condition     = azurerm_private_endpoint.sql.subnet_id == var.subnet_pep_id
    error_message = "Private Endpoint must target provided PEP subnet"
  }

  assert {
    condition     = azurerm_private_endpoint.sql.private_service_connection[0].subresource_names[0] == "Sql"
    error_message = "Private Endpoint subresource_names must contain 'Sql'"
  }
}

// Validate preset mapping when using a different preset (no apply required)
run "consistency_preset_default_session" {
  command = plan

  variables {
    // Only override what differs from defaults
    consistency_policy = {
      consistency_preset = "Default"
    }
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.consistency_policy[0].consistency_level == "Session"
    error_message = "Default preset must map to Session consistency"
  }
}

run "valid_cmk" {
  command = plan

  variables {
    customer_managed_key = {
      enabled                   = true
      user_assigned_identity_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-mi/providers/Microsoft.ManagedIdentity/userAssignedIdentities/mi-test"
      key_vault_key_id          = "https://kv-test.vault.azure.net/keys/key-test"
    }
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.default_identity_type == "UserAssignedIdentity=${var.customer_managed_key.user_assigned_identity_id}"
    error_message = "default_identity_type must reference the provided user-assigned identity"
  }
}
