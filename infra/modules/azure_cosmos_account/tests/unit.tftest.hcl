# Unit Tests for Azure Cosmos DB Module
# These tests verify configuration logic, resource attributes, and computed values
# without creating actual infrastructure resources (using terraform plan)

provider "azurerm" {
  features {}
}

variables {
  # Common test variables
  environment = {
    prefix          = "dx"
    env_short       = "d" # Use 'd' for development as required by the provider
    location        = "italynorth"
    domain          = "test"
    app_name        = "cosmos"
    instance_number = "01"
  }

  tags = {
    Environment = "Test"
    Owner       = "DevEx"
    Test        = "unit"
  }

  resource_group_name = "test-rg"
  subnet_pep_id       = "/subscriptions/test/resourceGroups/test-rg/providers/Microsoft.Network/virtualNetworks/test-vnet/subnets/test-subnet"

  # Add required consistency_policy
  consistency_policy = {
    consistency_preset = "Default"
  }

  # Add alerts configuration with required thresholds
  alerts = {
    enabled = true
    thresholds = {
      provisioned_throughput_exceeded = 80
    }
  }
}

# Test 1: Verify naming convention and resource naming logic
run "test_naming_logic" {
  command = plan

  variables {
    tier = "l"
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.name == "dx-u-itn-test-cosmos-cosno-01"
    error_message = "Cosmos DB account name should follow naming convention: dx-u-itn-test-cosmos-cosno-01"
  }

  assert {
    condition     = azurerm_private_endpoint.sql.name == "dx-u-itn-test-cosmos-cospe-01"
    error_message = "Private endpoint name should follow naming convention"
  }
}

# Test 2: Verify consistency policy presets work correctly
run "test_consistency_policy_default_preset" {
  command = plan

  variables {
    tier = "l"
    consistency_policy = {
      consistency_preset = "Default"
    }
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.consistency_policy[0].consistency_level == "Session"
    error_message = "Default preset should set consistency level to Session"
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.consistency_policy[0].max_interval_in_seconds == null
    error_message = "Default preset should not set max_interval_in_seconds"
  }
}

run "test_consistency_policy_high_consistency_preset" {
  command = plan

  variables {
    tier = "l"
    consistency_policy = {
      consistency_preset = "HighConsistency"
    }
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.consistency_policy[0].consistency_level == "Strong"
    error_message = "HighConsistency preset should set consistency level to Strong"
  }
}

run "test_consistency_policy_balanced_staleness_preset" {
  command = plan

  variables {
    tier = "l"
    consistency_policy = {
      consistency_preset = "BalancedStaleness"
    }
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.consistency_policy[0].consistency_level == "BoundedStaleness"
    error_message = "BalancedStaleness preset should set consistency level to BoundedStaleness"
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.consistency_policy[0].max_interval_in_seconds == 300
    error_message = "BalancedStaleness preset should set max_interval_in_seconds to 300"
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.consistency_policy[0].max_staleness_prefix == 100000
    error_message = "BalancedStaleness preset should set max_staleness_prefix to 100000"
  }
}

run "test_consistency_policy_custom" {
  command = plan

  variables {
    tier = "l"
    consistency_policy = {
      consistency_preset      = "Custom"
      consistency_level       = "BoundedStaleness"
      max_interval_in_seconds = 600
      max_staleness_prefix    = 200000
    }
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.consistency_policy[0].consistency_level == "BoundedStaleness"
    error_message = "Custom consistency policy should use provided consistency_level"
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.consistency_policy[0].max_interval_in_seconds == 600
    error_message = "Custom consistency policy should use provided max_interval_in_seconds"
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.consistency_policy[0].max_staleness_prefix == 200000
    error_message = "Custom consistency policy should use provided max_staleness_prefix"
  }
}

# Test 3: Verify serverless tier configuration
run "test_serverless_tier" {
  command = plan

  variables {
    tier = "s"
  }

  assert {
    condition     = length([for cap in azurerm_cosmosdb_account.this.capabilities : cap.name if cap.name == "EnableServerless"]) == 1
    error_message = "Serverless tier should enable EnableServerless capability"
  }
}

run "test_provisioned_tier" {
  command = plan

  variables {
    tier = "l"
  }

  assert {
    condition     = length(azurerm_cosmosdb_account.this.capabilities) == 0
    error_message = "Provisioned tier should not have any capabilities enabled"
  }
}

# Test 4: Verify geo-location configurations
run "test_primary_geo_location_default" {
  command = plan

  variables {
    tier = "l"
    primary_geo_location = {
      zone_redundant = true
    }
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.geo_location[0].location == "italynorth"
    error_message = "Primary geo location should default to environment location"
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.geo_location[0].failover_priority == 0
    error_message = "Primary geo location should have failover priority 0"
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.geo_location[0].zone_redundant == true
    error_message = "Primary geo location should have zone redundancy enabled"
  }
}

run "test_secondary_geo_locations" {
  command = plan

  variables {
    tier = "l"
    secondary_geo_locations = [
      {
        location          = "westeurope"
        failover_priority = 1
        zone_redundant    = true
      },
      {
        location          = "northeurope"
        failover_priority = 2
        zone_redundant    = false
      }
    ]
  }

  assert {
    condition     = length(azurerm_cosmosdb_account.this.geo_location) == 3
    error_message = "Should have primary + 2 secondary geo locations"
  }

  assert {
    condition = alltrue([
      for geo in azurerm_cosmosdb_account.this.geo_location :
      contains(["italynorth", "westeurope", "northeurope"], geo.location)
    ])
    error_message = "All geo locations should be configured correctly"
  }
}

# Test 5: Verify role assignment logic
run "test_role_assignments_mapping" {
  command = plan

  variables {
    tier = "l"
    authorized_teams = {
      readers = ["reader-1", "reader-2"]
      writers = ["writer-1"]
    }
  }

  assert {
    condition     = length(azurerm_cosmosdb_sql_role_assignment.principal_role_assignments) == 3
    error_message = "Should create 3 role assignments (2 readers + 1 writer)"
  }

  # Verify reader role assignments
  assert {
    condition = length([
      for assignment in azurerm_cosmosdb_sql_role_assignment.principal_role_assignments :
      assignment.role_definition_id
      if can(regex("00000000-0000-0000-0000-000000000001$", assignment.role_definition_id))
    ]) == 2
    error_message = "Should create 2 reader role assignments"
  }

  # Verify writer role assignments
  assert {
    condition = length([
      for assignment in azurerm_cosmosdb_sql_role_assignment.principal_role_assignments :
      assignment.role_definition_id
      if can(regex("00000000-0000-0000-0000-000000000002$", assignment.role_definition_id))
    ]) == 1
    error_message = "Should create 1 writer role assignment"
  }
}

# Test 6: Verify tag merging logic
run "test_tag_merging" {
  command = plan

  variables {
    tier = "l"
    tags = {
      Environment = "Test"
      CustomTag   = "CustomValue"
    }
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.tags["Environment"] == "Test"
    error_message = "Should preserve user-provided tags"
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.tags["ModuleSource"] == "DX"
    error_message = "Should add ModuleSource tag"
  }

  assert {
    condition     = can(azurerm_cosmosdb_account.this.tags["ModuleVersion"])
    error_message = "Should add ModuleVersion tag"
  }

  assert {
    condition     = can(azurerm_cosmosdb_account.this.tags["ModuleName"])
    error_message = "Should add ModuleName tag"
  }
}

# Test 7: Verify customer managed key configuration
run "test_customer_managed_key_disabled" {
  command = plan

  variables {
    tier = "l"
    customer_managed_key = {
      enabled = false
    }
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.key_vault_key_id == null
    error_message = "Should not set key_vault_key_id when CMK is disabled"
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.default_identity_type == "FirstPartyIdentity"
    error_message = "Should use FirstPartyIdentity when CMK is disabled"
  }

  assert {
    condition     = length(azurerm_cosmosdb_account.this.identity) == 0
    error_message = "Should not have identity block when CMK is disabled"
  }
}

run "test_customer_managed_key_enabled" {
  command = plan

  variables {
    tier = "l"
    customer_managed_key = {
      enabled                   = true
      key_vault_key_id          = "/subscriptions/test/resourceGroups/test/providers/Microsoft.KeyVault/vaults/test/keys/test"
      user_assigned_identity_id = "/subscriptions/test/resourceGroups/test/providers/Microsoft.ManagedIdentity/userAssignedIdentities/test"
    }
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.key_vault_key_id == "/subscriptions/test/resourceGroups/test/providers/Microsoft.KeyVault/vaults/test/keys/test"
    error_message = "Should set key_vault_key_id when CMK is enabled"
  }

  assert {
    condition     = can(regex("UserAssignedIdentity=", azurerm_cosmosdb_account.this.default_identity_type))
    error_message = "Should use UserAssignedIdentity when CMK is enabled"
  }

  assert {
    condition     = length(azurerm_cosmosdb_account.this.identity) == 1
    error_message = "Should have identity block when CMK is enabled"
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.identity[0].type == "UserAssigned"
    error_message = "Should use UserAssigned identity type when CMK is enabled"
  }
}

# Test 8: Verify alert configuration
run "test_alerts_disabled" {
  command = plan

  variables {
    tier = "l"
    alerts = {
      enabled = false
    }
  }

  assert {
    condition     = length(azurerm_monitor_metric_alert.cosmos_db_provisioned_throughput_exceeded) == 0
    error_message = "Should not create alerts when disabled"
  }
}

run "test_alerts_enabled" {
  command = plan

  variables {
    tier = "l"
    alerts = {
      enabled = true
      thresholds = {
        provisioned_throughput_exceeded = 1000
      }
    }
  }

  assert {
    condition     = length(azurerm_monitor_metric_alert.cosmos_db_provisioned_throughput_exceeded) == 1
    error_message = "Should create alert when enabled"
  }

  assert {
    condition     = azurerm_monitor_metric_alert.cosmos_db_provisioned_throughput_exceeded[0].criteria[0].threshold == 1000
    error_message = "Should use provided threshold value"
  }
}
