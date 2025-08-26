# Integration Tests for Azure Cosmos DB Module
# These tests validate how the module integrates with other Azure services and dependencies

provider "azurerm" {
  features {}
}

# Setup for integration tests - creates minimal real infrastructure
run "setup_integration_tests" {
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
  }
}

# Test integration with Azure networking (Private Endpoints)
run "integration_test_networking" {
  command = apply

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
      TestType    = "Integration"
    }

    tier                = "s"  # Use serverless for cost efficiency
    resource_group_name = run.setup_integration_tests.resource_group_name
    subnet_pep_id      = run.setup_integration_tests.pep_id

    # Force public access disabled to test private endpoint
    force_public_network_access_enabled = false

    # Simple consistency for integration test
    consistency_policy = {
      consistency_preset = "Default"
    }

    # Disable alerts for testing
    alerts = {
      enabled = false
    }

    # Test with private DNS zone
    private_dns_zone_resource_group_name = "dx-d-itn-network-rg-01"
  }

  # Test that the Cosmos DB account is actually created
  assert {
    condition     = azurerm_cosmosdb_account.this.id != ""
    error_message = "Cosmos DB account should be created successfully"
  }

  # Test private endpoint is created and accessible
  assert {
    condition     = azurerm_private_endpoint.sql.id != ""
    error_message = "Private endpoint should be created successfully"
  }

  # Test private endpoint connection is approved
  assert {
    condition     = azurerm_private_endpoint.sql.private_service_connection[0].private_connection_resource_id == azurerm_cosmosdb_account.this.id
    error_message = "Private endpoint should be connected to Cosmos DB account"
  }

  # Test public network access is disabled
  assert {
    condition     = azurerm_cosmosdb_account.this.public_network_access_enabled == false
    error_message = "Public network access should be disabled"
  }

  # Test DNS integration
  assert {
    condition     = azurerm_private_dns_zone_group.cosmos_sql.name != ""
    error_message = "Private DNS zone group should be created"
  }

  # Test serverless configuration works
  assert {
    condition     = length([for cap in azurerm_cosmosdb_account.this.capabilities : cap if cap.name == "EnableServerless"]) == 1
    error_message = "Serverless capability should be enabled"
  }

  # Test backup configuration is applied
  assert {
    condition     = azurerm_cosmosdb_account.this.backup[0].type == "Continuous"
    error_message = "Backup should be configured as Continuous"
  }
}

# Test integration with Azure Monitor (when alerts are enabled)
run "integration_test_monitoring" {
  command = apply

  variables {
    environment = {
      prefix          = "dx"
      env_short       = "d"
      location        = "italynorth"
      domain          = "modules"
      app_name        = "monitor"
      instance_number = "01"
    }

    tags = {
      Environment = "Test"
      Owner       = "DevEx"
      TestType    = "Integration"
    }

    tier                = "s"
    resource_group_name = run.setup_integration_tests.resource_group_name
    subnet_pep_id      = run.setup_integration_tests.pep_id

    # Enable alerts for monitoring integration test
    alerts = {
      enabled = true
      thresholds = {
        provisioned_throughput_exceeded = 80
      }
    }

    consistency_policy = {
      consistency_preset = "Default"
    }
  }

  # Test monitoring integration
  assert {
    condition     = length(azurerm_monitor_metric_alert.provisioned_throughput_exceeded) == 1
    error_message = "Metric alert should be created when alerts are enabled"
  }

  assert {
    condition     = azurerm_monitor_metric_alert.provisioned_throughput_exceeded[0].enabled == true
    error_message = "Metric alert should be enabled"
  }

  # Test alert configuration
  assert {
    condition = azurerm_monitor_metric_alert.provisioned_throughput_exceeded[0].criteria[0].threshold == 80
    error_message = "Alert threshold should match configuration"
  }
}

# Test integration with geo-replication and multi-region setup
run "integration_test_geo_replication" {
  command = apply

  variables {
    environment = {
      prefix          = "dx"
      env_short       = "d"
      location        = "italynorth"
      domain          = "modules"
      app_name        = "geo"
      instance_number = "01"
    }

    tags = {
      Environment = "Test"
      Owner       = "DevEx"
      TestType    = "Integration"
    }

    tier                = "s"
    resource_group_name = run.setup_integration_tests.resource_group_name
    subnet_pep_id      = run.setup_integration_tests.pep_id

    # Test multi-region configuration
    primary_geo_location = {
      location       = "italynorth"
      zone_redundant = true
    }

    secondary_geo_locations = [
      {
        location          = "westeurope"
        failover_priority = 1
        zone_redundant    = false
      }
    ]

    consistency_policy = {
      consistency_preset = "BalancedStaleness"
    }

    alerts = {
      enabled = false
    }
  }

  # Test geo-replication is configured
  assert {
    condition     = length(azurerm_cosmosdb_account.this.geo_location) == 2
    error_message = "Should have primary and secondary geo locations"
  }

  # Test primary location
  assert {
    condition = one([
      for geo in azurerm_cosmosdb_account.this.geo_location :
      geo.failover_priority == 0 && geo.location == "italynorth" && geo.zone_redundant == true
    ]) != null
    error_message = "Primary location should be in Italy North with zone redundancy"
  }

  # Test secondary location
  assert {
    condition = one([
      for geo in azurerm_cosmosdb_account.this.geo_location :
      geo.failover_priority == 1 && geo.location == "westeurope" && geo.zone_redundant == false
    ]) != null
    error_message = "Secondary location should be in West Europe without zone redundancy"
  }

  # Test automatic failover is enabled
  assert {
    condition     = azurerm_cosmosdb_account.this.automatic_failover_enabled == true
    error_message = "Automatic failover should be enabled for multi-region setup"
  }

  # Test read and write endpoints are available
  assert {
    condition     = length(azurerm_cosmosdb_account.this.read_endpoints) >= 2
    error_message = "Should have read endpoints for both regions"
  }

  assert {
    condition     = length(azurerm_cosmosdb_account.this.write_endpoints) >= 1
    error_message = "Should have at least one write endpoint"
  }
}

# Test integration with Azure RBAC and team access
run "integration_test_rbac" {
  command = apply

  variables {
    environment = {
      prefix          = "dx"
      env_short       = "d"
      location        = "italynorth"
      domain          = "modules"
      app_name        = "rbac"
      instance_number = "01"
    }

    tags = {
      Environment = "Test"
      Owner       = "DevEx"
      TestType    = "Integration"
    }

    tier                = "s"
    resource_group_name = run.setup_integration_tests.resource_group_name
    subnet_pep_id      = run.setup_integration_tests.pep_id

    # Test RBAC integration with authorized teams
    authorized_teams = {
      readers = ["11111111-1111-1111-1111-111111111111"]
      writers = ["22222222-2222-2222-2222-222222222222"]
    }

    consistency_policy = {
      consistency_preset = "Default"
    }

    alerts = {
      enabled = false
    }
  }

  # Test RBAC role assignments are created
  assert {
    condition     = length(keys(azurerm_cosmosdb_sql_role_assignment.this)) == 2
    error_message = "Should create role assignments for authorized teams"
  }

  # Test reader role assignment
  assert {
    condition = contains([
      for key, assignment in azurerm_cosmosdb_sql_role_assignment.this :
      assignment.principal_id
    ], "11111111-1111-1111-1111-111111111111")
    error_message = "Reader principal should have role assignment"
  }

  # Test writer role assignment
  assert {
    condition = contains([
      for key, assignment in azurerm_cosmosdb_sql_role_assignment.this :
      assignment.principal_id
    ], "22222222-2222-2222-2222-222222222222")
    error_message = "Writer principal should have role assignment"
  }

  # Test role assignments reference the correct Cosmos DB account
  assert {
    condition = alltrue([
      for key, assignment in azurerm_cosmosdb_sql_role_assignment.this :
      assignment.account_name == azurerm_cosmosdb_account.this.name
    ])
    error_message = "All role assignments should reference the correct Cosmos DB account"
  }
}

# Test integration with consistency policies and performance
run "integration_test_consistency_performance" {
  command = apply

  variables {
    environment = {
      prefix          = "dx"
      env_short       = "d"
      location        = "italynorth"
      domain          = "modules"
      app_name        = "perf"
      instance_number = "01"
    }

    tags = {
      Environment = "Test"
      Owner       = "DevEx"
      TestType    = "Integration"
    }

    tier                = "s"
    resource_group_name = run.setup_integration_tests.resource_group_name
    subnet_pep_id      = run.setup_integration_tests.pep_id

    # Test custom bounded staleness configuration
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

  # Test custom consistency policy is applied correctly
  assert {
    condition     = azurerm_cosmosdb_account.this.consistency_policy[0].consistency_level == "BoundedStaleness"
    error_message = "Custom consistency level should be BoundedStaleness"
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.consistency_policy[0].max_interval_in_seconds == 300
    error_message = "Max interval should be set correctly"
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.consistency_policy[0].max_staleness_prefix == 100000
    error_message = "Max staleness prefix should be set correctly"
  }

  # Test account is accessible via endpoint
  assert {
    condition     = startswith(azurerm_cosmosdb_account.this.endpoint, "https://")
    error_message = "Cosmos DB endpoint should be accessible via HTTPS"
  }

  assert {
    condition     = endswith(azurerm_cosmosdb_account.this.endpoint, ".documents.azure.com/")
    error_message = "Cosmos DB endpoint should be a valid Azure Cosmos endpoint"
  }
}