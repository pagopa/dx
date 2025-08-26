# Unit Tests for Azure Cosmos DB Module
# These tests validate configuration logic and resource attributes without deploying infrastructure

provider "azurerm" {
  features {}
}

# Test default configuration with minimal inputs
run "unit_test_default_configuration" {
  command = plan

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
      Environment = "Test"
      Owner       = "DevEx"
    }

    resource_group_name = "test-rg"
    subnet_pep_id      = "/subscriptions/sub-id/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/subnet"
    
    consistency_policy = {
      consistency_preset = "Default"
    }
    
    alerts = {
      enabled = false
    }
  }

  # Test default values and basic configuration
  assert {
    condition     = azurerm_cosmosdb_account.this.offer_type == "Standard"
    error_message = "The Cosmos DB offer type must be Standard"
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.kind == "GlobalDocumentDB"
    error_message = "The Cosmos DB account must support DocumentDB API"
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.automatic_failover_enabled == true
    error_message = "The Cosmos DB account must have automatic failover enabled"
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.public_network_access_enabled == false
    error_message = "Public network access should be disabled by default"
  }

  # Test default consistency policy (Session)
  assert {
    condition     = azurerm_cosmosdb_account.this.consistency_policy[0].consistency_level == "Session"
    error_message = "Default consistency level should be Session"
  }

  # Test default backup configuration
  assert {
    condition     = azurerm_cosmosdb_account.this.backup[0].type == "Continuous"
    error_message = "Backup type should be Continuous"
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.backup[0].tier == "Continuous30Days"
    error_message = "Backup tier should be Continuous30Days"
  }

  # Test that no serverless capability is enabled for default tier (l)
  assert {
    condition     = length([for cap in azurerm_cosmosdb_account.this.capabilities : cap if cap.name == "EnableServerless"]) == 0
    error_message = "Serverless should not be enabled for large tier"
  }
}

# Test serverless tier configuration
run "unit_test_serverless_tier" {
  command = plan

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
      Environment = "Test"
      Owner       = "DevEx"
    }

    tier                = "s"
    resource_group_name = "test-rg"
    subnet_pep_id      = "/subscriptions/sub-id/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/subnet"
    
    consistency_policy = {
      consistency_preset = "Default"
    }
    
    alerts = {
      enabled = false
    }
  }

  # Test serverless capability is enabled
  assert {
    condition     = length([for cap in azurerm_cosmosdb_account.this.capabilities : cap if cap.name == "EnableServerless"]) == 1
    error_message = "Serverless capability should be enabled for 's' tier"
  }
}

# Test custom consistency policy
run "unit_test_custom_consistency_policy" {
  command = plan

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
      Environment = "Test"
      Owner       = "DevEx"
    }

    resource_group_name = "test-rg"
    subnet_pep_id      = "/subscriptions/sub-id/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/subnet"

    consistency_policy = {
      consistency_preset      = "Custom"
      consistency_level       = "BoundedStaleness"
      max_interval_in_seconds = 300
      max_staleness_prefix    = 100000
    }
    
    alerts = {
      enabled = false
    }
  }

  # Test custom consistency policy
  assert {
    condition     = azurerm_cosmosdb_account.this.consistency_policy[0].consistency_level == "BoundedStaleness"
    error_message = "Custom consistency level should be BoundedStaleness"
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.consistency_policy[0].max_interval_in_seconds == 300
    error_message = "Max interval should be 300 seconds"
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.consistency_policy[0].max_staleness_prefix == 100000
    error_message = "Max staleness prefix should be 100000"
  }
}

# Test preset consistency policies
run "unit_test_preset_consistency_policies" {
  command = plan

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
      Environment = "Test"
      Owner       = "DevEx"
    }

    resource_group_name = "test-rg"
    subnet_pep_id      = "/subscriptions/sub-id/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/subnet"

    consistency_policy = {
      consistency_preset = "HighConsistency"
    }
    
    alerts = {
      enabled = false
    }
  }

  # Test high consistency preset
  assert {
    condition     = azurerm_cosmosdb_account.this.consistency_policy[0].consistency_level == "Strong"
    error_message = "HighConsistency preset should map to Strong consistency level"
  }
}

# Test geo-replication configuration
run "unit_test_geo_replication" {
  command = plan

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
      Environment = "Test"
      Owner       = "DevEx"
    }

    resource_group_name = "test-rg"
    subnet_pep_id      = "/subscriptions/sub-id/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/subnet"

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
    
    consistency_policy = {
      consistency_preset = "Default"
    }
    
    alerts = {
      enabled = false
    }
  }

  # Test geo-replication configuration
  assert {
    condition     = length(azurerm_cosmosdb_account.this.geo_location) == 2
    error_message = "Should have primary and secondary geo locations"
  }

  # Test primary location has priority 0
  assert {
    condition = one([
      for geo in azurerm_cosmosdb_account.this.geo_location :
      geo.failover_priority == 0 && geo.location == "italynorth"
    ]) != null
    error_message = "Primary location should have failover priority 0"
  }

  # Test secondary location has correct priority
  assert {
    condition = one([
      for geo in azurerm_cosmosdb_account.this.geo_location :
      geo.failover_priority == 1 && geo.location == "westeurope"
    ]) != null
    error_message = "Secondary location should have failover priority 1"
  }
}

# Test customer managed key configuration
run "unit_test_customer_managed_key" {
  command = plan

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
      Environment = "Test"
      Owner       = "DevEx"
    }

    resource_group_name = "test-rg"
    subnet_pep_id      = "/subscriptions/sub-id/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/subnet"

    customer_managed_key = {
      enabled                   = true
      user_assigned_identity_id = "/subscriptions/sub-id/resourceGroups/rg/providers/Microsoft.ManagedIdentity/userAssignedIdentities/identity"
      key_vault_key_id          = "https://vault.vault.azure.net/keys/key/version"
    }
    
    consistency_policy = {
      consistency_preset = "Default"
    }
    
    alerts = {
      enabled = false
    }
  }

  # Test customer managed key configuration
  assert {
    condition     = azurerm_cosmosdb_account.this.key_vault_key_id != null
    error_message = "Key vault key ID should be set when customer managed key is enabled"
  }

  assert {
    condition     = length(azurerm_cosmosdb_account.this.identity) == 1
    error_message = "Identity should be configured when customer managed key is enabled"
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.identity[0].type == "UserAssigned"
    error_message = "Identity type should be UserAssigned"
  }

  assert {
    condition     = contains(azurerm_cosmosdb_account.this.identity[0].identity_ids, "/subscriptions/sub-id/resourceGroups/rg/providers/Microsoft.ManagedIdentity/userAssignedIdentities/identity")
    error_message = "Identity IDs should include the user assigned identity"
  }
}

# Test naming convention
run "unit_test_naming_convention" {
  command = plan

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
      Environment = "Test"
      Owner       = "DevEx"
    }

    resource_group_name = "test-rg"
    subnet_pep_id      = "/subscriptions/sub-id/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/subnet"
    
    consistency_policy = {
      consistency_preset = "Default"
    }
    
    alerts = {
      enabled = false
    }
  }

  # Test naming convention is applied
  assert {
    condition     = can(regex("^dx-d-itn-modules-test-cosmos-nosql-01$", azurerm_cosmosdb_account.this.name))
    error_message = "Cosmos DB name should follow naming convention"
  }
}