# End-to-End Tests for Azure Cosmos DB Module
# These tests verify actual functionality of deployed infrastructure
# They test connectivity, monitoring, and operational aspects

provider "azurerm" {
  features {}
}

run "setup_tests" {
  module {
    source = "./tests/setup"
  }

  variables {
    environment = {
      prefix          = "dx"
      env_short       = "d"  # 'e' for end-to-end
      location        = "italynorth"
      domain          = "modules"
      app_name        = "test"
      instance_number = "01"
    }
  }
}

# E2E Test 1: Deploy and verify comprehensive Cosmos DB configuration
run "test_comprehensive_e2e_deployment" {
  command = apply

  variables {
    environment = {
      prefix          = "dx"
      env_short       = "d"
      location        = "italynorth"
      domain          = "modules"
      app_name        = "e2e"
      instance_number = "01"
    }

    tags = {
      Environment = "EndToEnd"
      Test        = "e2e"
      Owner       = "DevEx"
    }

    tier = "s"  # Serverless for cost efficiency

    resource_group_name = run.setup_tests.resource_group_name
    subnet_pep_id       = run.setup_tests.pep_id
    private_dns_zone_resource_group_name = "dx-e-itn-network-rg-01"

    primary_geo_location = {
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
      enabled = true
      thresholds = {
        provisioned_throughput_exceeded = 1000
      }
    }

    authorized_teams = {
      readers = ["12345678-1234-1234-1234-123456789001"]
      writers = ["12345678-1234-1234-1234-123456789002"]
    }

    force_public_network_access_enabled = false
  }

  # Verify the Cosmos DB account is deployed correctly
  assert {
    condition     = azurerm_cosmosdb_account.this.name != ""
    error_message = "Cosmos DB account should be created"
  }

  # Verify endpoint is accessible (returns valid URL)
  assert {
    condition     = can(regex("^https://.*\\.documents\\.azure\\.com:443/", azurerm_cosmosdb_account.this.endpoint))
    error_message = "Cosmos DB endpoint should be a valid Azure Cosmos DB URL"
  }

  # Verify multi-region setup is working
  assert {
    condition     = length(azurerm_cosmosdb_account.this.geo_location) == 2
    error_message = "Should have primary + 1 secondary geo location"
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.automatic_failover_enabled == true
    error_message = "Automatic failover should be enabled for multi-region setup"
  }

  # Verify read and write endpoints are available
  assert {
    condition     = length(azurerm_cosmosdb_account.this.read_endpoints) >= 2
    error_message = "Should have read endpoints for both regions"
  }

  assert {
    condition     = length(azurerm_cosmosdb_account.this.write_endpoints) >= 1
    error_message = "Should have at least one write endpoint"
  }

  # Verify private endpoint is properly configured
  assert {
    condition     = azurerm_private_endpoint.sql.private_service_connection[0].private_connection_resource_id == azurerm_cosmosdb_account.this.id
    error_message = "Private endpoint should connect to the Cosmos DB account"
  }

  assert {
    condition     = azurerm_private_endpoint.sql.private_service_connection[0].subresource_names[0] == "Sql"
    error_message = "Private endpoint should connect to Sql subresource"
  }

  # Verify network security is properly configured
  assert {
    condition     = azurerm_cosmosdb_account.this.public_network_access_enabled == false
    error_message = "Public network access should be disabled"
  }

  # Verify backup is configured for operational resilience
  assert {
    condition     = azurerm_cosmosdb_account.this.backup[0].type == "Continuous"
    error_message = "Backup should be configured for continuous mode"
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.backup[0].tier == "Continuous30Days"
    error_message = "Backup should have 30-day retention for operational needs"
  }

  # Verify monitoring alert is created and configured
  assert {
    condition     = length(azurerm_monitor_metric_alert.cosmos_db_provisioned_throughput_exceeded) == 1
    error_message = "Monitoring alert should be created for operational visibility"
  }

  assert {
    condition     = azurerm_monitor_metric_alert.cosmos_db_provisioned_throughput_exceeded[0].severity == 0
    error_message = "Alert should have critical severity"
  }

  # Verify role assignments are working
  assert {
    condition     = length(azurerm_cosmosdb_sql_role_assignment.principal_role_assignments) == 2
    error_message = "Should create role assignments for readers and writers"
  }

  # Verify all role assignments reference the correct account
  assert {
    condition = alltrue([
      for assignment in azurerm_cosmosdb_sql_role_assignment.principal_role_assignments :
      assignment.account_name == azurerm_cosmosdb_account.this.name
    ])
    error_message = "All role assignments should reference the correct Cosmos DB account"
  }

  # Verify serverless capability is enabled for cost optimization
  assert {
    condition     = length([for cap in azurerm_cosmosdb_account.this.capabilities : cap.name if cap.name == "EnableServerless"]) == 1
    error_message = "Serverless capability should be enabled for cost efficiency"
  }

  # Verify consistency policy is set correctly for application needs
  assert {
    condition     = azurerm_cosmosdb_account.this.consistency_policy[0].consistency_level == "Session"
    error_message = "Default consistency level should be Session for balanced performance"
  }

  # Verify resource tagging for governance
  assert {
    condition     = azurerm_cosmosdb_account.this.tags["Environment"] == "EndToEnd"
    error_message = "Environment tag should be set correctly"
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.tags["ModuleSource"] == "DX"
    error_message = "ModuleSource tag should be set by the module"
  }

  # Verify outputs provide necessary information for consumers
  assert {
    condition     = output.name == azurerm_cosmosdb_account.this.name
    error_message = "Name output should match the created resource"
  }

  assert {
    condition     = output.id == azurerm_cosmosdb_account.this.id
    error_message = "ID output should match the created resource"
  }

  assert {
    condition     = output.endpoint == azurerm_cosmosdb_account.this.endpoint
    error_message = "Endpoint output should match the created resource"
  }

  assert {
    condition     = length(output.read_endpoints) == length(azurerm_cosmosdb_account.this.read_endpoints)
    error_message = "Read endpoints output should match the created resource"
  }

  assert {
    condition     = length(output.write_endpoints) == length(azurerm_cosmosdb_account.this.write_endpoints)
    error_message = "Write endpoints output should match the created resource"
  }
}
