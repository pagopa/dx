# Integration Tests for Azure Cosmos DB Module
# These tests create actual Azure resources to verify the module works end-to-end
# They use terraform apply and verify resources are created correctly

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
      env_short       = "d"  # 'i' for integration
      location        = "italynorth"
      domain          = "modules"
      app_name        = "test"
      instance_number = "01"
    }
  }
}

# Test 1: Deploy a minimal Cosmos DB configuration
run "test_minimal_deployment" {
  command = apply

  variables {
    environment = {
      prefix          = "dx"
      env_short       = "d"  # Use 'd' for development as required by the provider
      location        = "italynorth"
      domain          = "modules"
      app_name        = "test"
      instance_number = "01"
    }

    tags = {
      CostCenter     = "TS000 - Tecnologia e Servizi"
      CreatedBy      = "Terraform"
      Environment    = "Integration"
      Owner          = "DevEx"
      Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_cosmos_account/tests"
      ManagementTeam = "Developer Experience"
      Test           = "true"
      TestName       = "Integration test - minimal deployment"
    }

    tier = "s"  # Use serverless for cost efficiency in tests

    resource_group_name = run.setup_tests.resource_group_name
    subnet_pep_id       = run.setup_tests.pep_id
    private_dns_zone_resource_group_name = "dx-i-itn-network-rg-01"

    primary_geo_location = {
      zone_redundant = true
    }

    consistency_policy = {
      consistency_preset = "Default"
    }

    alerts = {
      enabled = false  # Disable alerts for cost efficiency
    }

    force_public_network_access_enabled = false
  }

  # Verify the Cosmos DB account was created
  assert {
    condition     = azurerm_cosmosdb_account.this.name != ""
    error_message = "Cosmos DB account should be created"
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.kind == "GlobalDocumentDB"
    error_message = "Cosmos DB should support DocumentDB API"
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.offer_type == "Standard"
    error_message = "Cosmos DB should have Standard offer type"
  }

  assert {
    condition     = length([for cap in azurerm_cosmosdb_account.this.capabilities : cap.name if cap.name == "EnableServerless"]) == 1
    error_message = "Serverless should be enabled for tier 's'"
  }

  # Verify private endpoint was created
  assert {
    condition     = azurerm_private_endpoint.sql.name != ""
    error_message = "Private endpoint should be created"
  }

  assert {
    condition     = azurerm_private_endpoint.sql.private_service_connection[0].subresource_names[0] == "Sql"
    error_message = "Private endpoint should connect to Sql subresource"
  }

  # Verify outputs are correct
  assert {
    condition     = output.name == azurerm_cosmosdb_account.this.name
    error_message = "Output name should match created resource name"
  }

  assert {
    condition     = output.id == azurerm_cosmosdb_account.this.id
    error_message = "Output id should match created resource id"
  }

  assert {
    condition     = output.endpoint != ""
    error_message = "Endpoint output should not be empty"
  }
}

# Test 2: Deploy with secondary geo locations
run "test_multi_region_deployment" {
  command = apply

  variables {
    environment = {
      prefix          = "dx"
      env_short       = "d"
      location        = "italynorth"
      domain          = "modules"
      app_name        = "multi"
      instance_number = "01"
    }

    tags = {
      Environment = "Integration"
      Test        = "multi-region"
    }

    tier = "s"

    resource_group_name = run.setup_tests.resource_group_name
    subnet_pep_id       = run.setup_tests.pep_id
    private_dns_zone_resource_group_name = "dx-i-itn-network-rg-01"

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
      consistency_preset = "HighPerformance"  # Eventual consistency
    }

    alerts = {
      enabled = false
    }
  }

  # Verify multi-region configuration
  assert {
    condition     = length(azurerm_cosmosdb_account.this.geo_location) == 2
    error_message = "Should have primary + 1 secondary geo location"
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.automatic_failover_enabled == true
    error_message = "Automatic failover should be enabled"
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.consistency_policy[0].consistency_level == "Eventual"
    error_message = "Should use Eventual consistency for HighPerformance preset"
  }

  # Verify read/write endpoints are available
  assert {
    condition     = length(azurerm_cosmosdb_account.this.read_endpoints) > 0
    error_message = "Should have read endpoints"
  }

  assert {
    condition     = length(azurerm_cosmosdb_account.this.write_endpoints) > 0
    error_message = "Should have write endpoints"
  }
}

# Test 3: Deploy with role assignments
run "test_role_assignments_deployment" {
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
      Environment = "Integration"
      Test        = "rbac"
    }

    tier = "s"

    resource_group_name = run.setup_tests.resource_group_name
    subnet_pep_id       = run.setup_tests.pep_id
    private_dns_zone_resource_group_name = "dx-i-itn-network-rg-01"

    authorized_teams = {
      readers = ["12345678-1234-1234-1234-123456789001"]
      writers = ["12345678-1234-1234-1234-123456789002"]
    }

    alerts = {
      enabled = false
    }
  }

  # Verify role assignments were created
  assert {
    condition     = length(azurerm_cosmosdb_sql_role_assignment.principal_role_assignments) == 2
    error_message = "Should create 2 role assignments (1 reader + 1 writer)"
  }

  # Check that role assignments reference the correct account
  assert {
    condition = alltrue([
      for assignment in azurerm_cosmosdb_sql_role_assignment.principal_role_assignments :
      assignment.account_name == azurerm_cosmosdb_account.this.name
    ])
    error_message = "All role assignments should reference the created Cosmos DB account"
  }

  # Check that role assignments have correct scope
  assert {
    condition = alltrue([
      for assignment in azurerm_cosmosdb_sql_role_assignment.principal_role_assignments :
      assignment.scope == azurerm_cosmosdb_account.this.id
    ])
    error_message = "All role assignments should have correct scope"
  }
}

# Test 4: Deploy with custom consistency policy
run "test_custom_consistency_deployment" {
  command = apply

  variables {
    environment = {
      prefix          = "dx"
      env_short       = "d"
      location        = "italynorth"
      domain          = "modules"
      app_name        = "custom"
      instance_number = "01"
    }

    tags = {
      Environment = "Integration"
      Test        = "custom-consistency"
    }

    tier = "s"

    resource_group_name = run.setup_tests.resource_group_name
    subnet_pep_id       = run.setup_tests.pep_id
    private_dns_zone_resource_group_name = "dx-i-itn-network-rg-01"

    consistency_policy = {
      consistency_preset      = "Custom"
      consistency_level       = "BoundedStaleness"
      max_interval_in_seconds = 600
      max_staleness_prefix    = 200000
    }

    alerts = {
      enabled = false
    }
  }

  # Verify custom consistency policy is applied
  assert {
    condition     = azurerm_cosmosdb_account.this.consistency_policy[0].consistency_level == "BoundedStaleness"
    error_message = "Should use BoundedStaleness consistency level"
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.consistency_policy[0].max_interval_in_seconds == 600
    error_message = "Should use custom max_interval_in_seconds value"
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.consistency_policy[0].max_staleness_prefix == 200000
    error_message = "Should use custom max_staleness_prefix value"
  }
}

# Test 5: Test backup configuration
run "test_backup_configuration" {
  command = apply

  variables {
    environment = {
      prefix          = "dx"
      env_short       = "d"
      location        = "italynorth"
      domain          = "modules"
      app_name        = "backup"
      instance_number = "01"
    }

    tags = {
      Environment = "Integration"
      Test        = "backup"
    }

    tier = "s"

    resource_group_name = run.setup_tests.resource_group_name
    subnet_pep_id       = run.setup_tests.pep_id
    private_dns_zone_resource_group_name = "dx-i-itn-network-rg-01"

    alerts = {
      enabled = false
    }
  }

  # Verify backup configuration is set correctly
  assert {
    condition     = azurerm_cosmosdb_account.this.backup[0].type == "Continuous"
    error_message = "Backup type should be Continuous"
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.backup[0].tier == "Continuous30Days"
    error_message = "Backup tier should be Continuous30Days"
  }
}
