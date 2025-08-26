# Contract Tests for Azure Cosmos DB Module
# These tests verify input validation rules and module interface contracts
# They ensure proper error messages are returned for invalid inputs

provider "azurerm" {
  features {}
}

variables {
  # Valid base configuration for testing
  environment = {
    prefix          = "dx"
    env_short       = "d"  # Use 'd' for development as required by the provider
    location        = "italynorth"
    domain          = "test"
    app_name        = "cosmos"
    instance_number = "01"
  }

  tags = {
    Environment = "Test"
    Owner       = "DevEx"
    Test        = "contract"
  }

  resource_group_name = "test-rg"
  subnet_pep_id       = "/subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/test-rg/providers/Microsoft.Network/virtualNetworks/test-vnet/subnets/test-subnet"
  
  consistency_policy = {
    consistency_preset = "Default"
  }
}

# Test 1: Invalid tier should fail
run "test_invalid_tier" {
  command = plan

  variables {
    tier = "invalid"
  }

  expect_failures = [
    var.tier
  ]
}

# Test 2: Invalid environment.prefix should fail
run "test_invalid_environment_prefix" {
  command = plan

  variables {
    environment = {
      prefix          = "DX-INVALID"  # Contains uppercase and special characters
      env_short       = "d"
      location        = "italynorth"
      domain          = "test"
      app_name        = "cosmos"
      instance_number = "01"
    }
  }

  expect_failures = [
    var.environment
  ]
}

# Test 3: Invalid environment.env_short should fail
run "test_invalid_environment_env_short" {
  command = plan

  variables {
    environment = {
      prefix          = "dx"
      env_short       = "dev"  # More than one character
      location        = "italynorth"
      domain          = "test"
      app_name        = "cosmos"
      instance_number = "01"
    }
  }

  expect_failures = [
    var.environment
  ]
}

# Test 4: Invalid environment.location should fail
run "test_invalid_environment_location" {
  command = plan

  variables {
    environment = {
      prefix          = "dx"
      env_short       = "d"
      location        = "invalid-region"
      domain          = "test"
      app_name        = "cosmos"
      instance_number = "01"
    }
  }

  expect_failures = [
    var.environment
  ]
}

# Test 5: Invalid environment.instance_number should fail
run "test_invalid_environment_instance_number" {
  command = plan

  variables {
    environment = {
      prefix          = "dx"
      env_short       = "d"
      location        = "italynorth"
      domain          = "test"
      app_name        = "cosmos"
      instance_number = "1"  # Single digit instead of two
    }
  }

  expect_failures = [
    var.environment
  ]
}

# Test 6: Invalid subnet_pep_id should fail
run "test_invalid_subnet_pep_id" {
  command = plan

  variables {
    subnet_pep_id = "invalid-subnet-id"
  }

  expect_failures = [
    var.subnet_pep_id
  ]
}

# Test 7: Invalid consistency_preset should fail
run "test_invalid_consistency_preset" {
  command = plan

  variables {
    consistency_policy = {
      consistency_preset = "InvalidPreset"
    }
  }

  expect_failures = [
    var.consistency_policy
  ]
}

# Test 8: Invalid custom consistency_level should fail
run "test_invalid_custom_consistency_level" {
  command = plan

  variables {
    consistency_policy = {
      consistency_preset = "Custom"
      consistency_level  = "InvalidLevel"
    }
  }

  expect_failures = [
    var.consistency_policy
  ]
}

# Test 9: Invalid BoundedStaleness configuration should fail
run "test_invalid_bounded_staleness_interval" {
  command = plan

  variables {
    consistency_policy = {
      consistency_preset      = "Custom"
      consistency_level       = "BoundedStaleness"
      max_interval_in_seconds = 3  # Below minimum of 5
      max_staleness_prefix    = 100
    }
  }

  expect_failures = [
    var.consistency_policy
  ]
}

run "test_invalid_bounded_staleness_prefix" {
  command = plan

  variables {
    consistency_policy = {
      consistency_preset      = "Custom"
      consistency_level       = "BoundedStaleness"
      max_interval_in_seconds = 300
      max_staleness_prefix    = 5  # Below minimum of 10
    }
  }

  expect_failures = [
    var.consistency_policy
  ]
}

# Test 10: Invalid customer managed key configuration should fail
run "test_invalid_cmk_missing_identity" {
  command = plan

  variables {
    customer_managed_key = {
      enabled          = true
      key_vault_key_id = "/subscriptions/test/resourceGroups/test/providers/Microsoft.KeyVault/vaults/test/keys/test"
      # Missing user_assigned_identity_id
    }
  }

  expect_failures = [
    var.customer_managed_key
  ]
}

run "test_invalid_cmk_missing_key" {
  command = plan

  variables {
    customer_managed_key = {
      enabled                   = true
      user_assigned_identity_id = "/subscriptions/test/resourceGroups/test/providers/Microsoft.ManagedIdentity/userAssignedIdentities/test"
      # Missing key_vault_key_id
    }
  }

  expect_failures = [
    var.customer_managed_key
  ]
}

# Test 11: Too many secondary geo locations should fail
run "test_too_many_secondary_geo_locations" {
  command = plan

  variables {
    secondary_geo_locations = [
      { location = "westeurope", failover_priority = 1 },
      { location = "northeurope", failover_priority = 2 },
      { location = "eastus", failover_priority = 3 },
      { location = "westus2", failover_priority = 4 },
      { location = "centralus", failover_priority = 5 },
      { location = "southcentralus", failover_priority = 6 }  # 6th location, should fail
    ]
  }

  expect_failures = [
    var.secondary_geo_locations
  ]
}

# Test 12: Invalid failover priority should fail
run "test_invalid_failover_priority" {
  command = plan

  variables {
    secondary_geo_locations = [
      { location = "westeurope", failover_priority = 0 },  # Should be >= 1
    ]
  }

  expect_failures = [
    var.secondary_geo_locations
  ]
}

# Test 13: Invalid principal IDs should fail
run "test_invalid_principal_ids" {
  command = plan

  variables {
    authorized_teams = {
      readers = ["invalid-uuid"]
      writers = ["also-invalid-uuid"]
    }
  }

  expect_failures = [
    var.authorized_teams
  ]
}

# Test 14: Too many principal IDs should fail
run "test_too_many_principal_ids" {
  command = plan

  variables {
    authorized_teams = {
      readers = [
        "12345678-1234-1234-1234-123456789001",
        "12345678-1234-1234-1234-123456789002",
        "12345678-1234-1234-1234-123456789003",
        "12345678-1234-1234-1234-123456789004",
        "12345678-1234-1234-1234-123456789005",
        "12345678-1234-1234-1234-123456789006",
        "12345678-1234-1234-1234-123456789007",
        "12345678-1234-1234-1234-123456789008",
        "12345678-1234-1234-1234-123456789009",
        "12345678-1234-1234-1234-123456789010",
        "12345678-1234-1234-1234-123456789011"
      ]
      writers = [
        "12345678-1234-1234-1234-123456789012",
        "12345678-1234-1234-1234-123456789013",
        "12345678-1234-1234-1234-123456789014",
        "12345678-1234-1234-1234-123456789015",
        "12345678-1234-1234-1234-123456789016",
        "12345678-1234-1234-1234-123456789017",
        "12345678-1234-1234-1234-123456789018",
        "12345678-1234-1234-1234-123456789019",
        "12345678-1234-1234-1234-123456789020",
        "12345678-1234-1234-1234-123456789021"  # Total 21, should fail
      ]
    }
  }

  expect_failures = [
    var.authorized_teams
  ]
}

# Test 15: Valid configuration should pass
run "test_valid_configuration" {
  command = plan

  variables {
    tier = "l"
    
    environment = {
      prefix          = "dx"
      env_short       = "d"
      location        = "italynorth"
      domain          = "test"
      app_name        = "cosmos"
      instance_number = "01"
    }

    subnet_pep_id = "/subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/test-rg/providers/Microsoft.Network/virtualNetworks/test-vnet/subnets/test-subnet"

    consistency_policy = {
      consistency_preset      = "Custom"
      consistency_level       = "BoundedStaleness"
      max_interval_in_seconds = 300
      max_staleness_prefix    = 100000
    }

    secondary_geo_locations = [
      { location = "westeurope", failover_priority = 1, zone_redundant = true },
      { location = "northeurope", failover_priority = 2, zone_redundant = false }
    ]

    customer_managed_key = {
      enabled                   = true
      key_vault_key_id         = "/subscriptions/test/resourceGroups/test/providers/Microsoft.KeyVault/vaults/test/keys/test"
      user_assigned_identity_id = "/subscriptions/test/resourceGroups/test/providers/Microsoft.ManagedIdentity/userAssignedIdentities/test"
    }

    authorized_teams = {
      readers = ["12345678-1234-1234-1234-123456789001", "12345678-1234-1234-1234-123456789002"]
      writers = ["12345678-1234-1234-1234-123456789003"]
    }

    alerts = {
      enabled = true
      thresholds = {
        provisioned_throughput_exceeded = 1000
      }
    }
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.name != ""
    error_message = "Valid configuration should create Cosmos DB account"
  }
}
