# End-to-End Tests for Azure Cosmos DB Module
# These tests validate complete deployment scenarios and workflows

provider "azurerm" {
  features {}
}

# Setup for E2E tests - creates comprehensive infrastructure
run "setup_e2e_tests" {
  module {
    source = "./tests/setup"
  }

  variables {
    environment = {
      prefix          = "dx"
      env_short       = "d"
      location        = "italynorth"
      domain          = "modules"
      app_name        = "e2e"
      instance_number = "01"
    }
  }
}

# E2E Test: Complete production-like scenario with all features
run "e2e_test_production_scenario" {
  command = apply

  variables {
    environment = {
      prefix          = "dx"
      env_short       = "d"
      location        = "italynorth"
      domain          = "modules"
      app_name        = "prod"
      instance_number = "01"
    }

    tags = {
      Environment    = "Production"
      Owner          = "DevEx" 
      Project        = "E2E-Test"
      CostCenter     = "TS000"
      TestType       = "E2E"
      BusinessUnit   = "Platform"
      MaintenanceTeam = "DevOps"
    }

    # Production tier
    tier                = "l"
    resource_group_name = run.setup_e2e_tests.resource_group_name
    subnet_pep_id      = run.setup_e2e_tests.pep_id

    # Production-like geo-replication
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

    # Production consistency for financial applications
    consistency_policy = {
      consistency_preset = "HighConsistency"
    }

    # Production monitoring
    alerts = {
      enabled = true
      thresholds = {
        provisioned_throughput_exceeded = 80
      }
    }

    # Team access configuration
    authorized_teams = {
      readers = [
        "33333333-3333-3333-3333-333333333333",  # Platform team readers
        "44444444-4444-4444-4444-444444444444"   # DevOps team readers
      ]
      writers = [
        "55555555-5555-5555-5555-555555555555"   # Application team writers
      ]
    }

    # Secure configuration
    force_public_network_access_enabled = false
    private_dns_zone_resource_group_name = "dx-d-itn-network-rg-01"
  }

  # Validate complete deployment
  assert {
    condition     = azurerm_cosmosdb_account.this.id != ""
    error_message = "Cosmos DB account should be deployed successfully"
  }

  # Validate production configuration
  assert {
    condition     = azurerm_cosmosdb_account.this.consistency_policy[0].consistency_level == "Strong"
    error_message = "Production should use Strong consistency"
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.automatic_failover_enabled == true
    error_message = "Production should have automatic failover enabled"
  }

  # Validate geo-replication
  assert {
    condition     = length(azurerm_cosmosdb_account.this.geo_location) == 2
    error_message = "Production should have multi-region deployment"
  }

  # Validate security configuration
  assert {
    condition     = azurerm_cosmosdb_account.this.public_network_access_enabled == false
    error_message = "Production should disable public access"
  }

  assert {
    condition     = azurerm_private_endpoint.sql.id != ""
    error_message = "Production should have private endpoint"
  }

  # Validate monitoring
  assert {
    condition     = length(azurerm_monitor_metric_alert.provisioned_throughput_exceeded) == 1
    error_message = "Production should have monitoring alerts"
  }

  # Validate team access
  assert {
    condition     = length(keys(azurerm_cosmosdb_sql_role_assignment.this)) == 3
    error_message = "Production should have team access configured"
  }

  # Validate backup configuration
  assert {
    condition     = azurerm_cosmosdb_account.this.backup[0].type == "Continuous"
    error_message = "Production should have continuous backup"
  }

  # Validate zone redundancy
  assert {
    condition = alltrue([
      for geo in azurerm_cosmosdb_account.this.geo_location :
      geo.zone_redundant == true
    ])
    error_message = "Production should have zone redundancy in all regions"
  }

  # Validate endpoints are accessible
  assert {
    condition     = length(azurerm_cosmosdb_account.this.read_endpoints) >= 2
    error_message = "Production should have multiple read endpoints"
  }

  assert {
    condition     = length(azurerm_cosmosdb_account.this.write_endpoints) >= 1
    error_message = "Production should have write endpoints"
  }

  # Validate tagging
  assert {
    condition     = azurerm_cosmosdb_account.this.tags["Environment"] == "Production"
    error_message = "Production environment tag should be set"
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.tags["ModuleSource"] == "DX"
    error_message = "Module metadata should be tagged"
  }
}

# E2E Test: Development environment scenario with cost optimization
run "e2e_test_development_scenario" {
  command = apply

  variables {
    environment = {
      prefix          = "dx"
      env_short       = "d"
      location        = "italynorth"
      domain          = "modules"
      app_name        = "dev"
      instance_number = "01"
    }

    tags = {
      Environment = "Development"
      Owner       = "DevEx"
      Project     = "E2E-Test"
      TestType    = "E2E"
      CostOpt     = "true"
    }

    # Development tier (serverless for cost)
    tier                = "s"
    resource_group_name = run.setup_e2e_tests.resource_group_name
    subnet_pep_id      = run.setup_e2e_tests.pep_id

    # Single region for development
    primary_geo_location = {
      location       = "italynorth"
      zone_redundant = false  # Cost optimization
    }

    # Relaxed consistency for development
    consistency_policy = {
      consistency_preset = "HighPerformance"
    }

    # No alerts for development
    alerts = {
      enabled = false
    }

    # Single developer access
    authorized_teams = {
      readers = []
      writers = ["66666666-6666-6666-6666-666666666666"]
    }

    # Allow public access for development convenience
    force_public_network_access_enabled = true
  }

  # Validate development deployment
  assert {
    condition     = azurerm_cosmosdb_account.this.id != ""
    error_message = "Development Cosmos DB should be deployed successfully"
  }

  # Validate development configuration
  assert {
    condition     = azurerm_cosmosdb_account.this.consistency_policy[0].consistency_level == "Eventual"
    error_message = "Development should use Eventual consistency for performance"
  }

  # Validate cost optimization
  assert {
    condition     = length([for cap in azurerm_cosmosdb_account.this.capabilities : cap if cap.name == "EnableServerless"]) == 1
    error_message = "Development should use serverless for cost optimization"
  }

  assert {
    condition     = length(azurerm_cosmosdb_account.this.geo_location) == 1
    error_message = "Development should have single region for cost"
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.geo_location[0].zone_redundant == false
    error_message = "Development should disable zone redundancy for cost"
  }

  # Validate development convenience features
  assert {
    condition     = azurerm_cosmosdb_account.this.public_network_access_enabled == true
    error_message = "Development should allow public access for convenience"
  }

  # Validate no alerts configured
  assert {
    condition     = length(azurerm_monitor_metric_alert.provisioned_throughput_exceeded) == 0
    error_message = "Development should not have alerts configured"
  }

  # Validate single team member access
  assert {
    condition     = length(keys(azurerm_cosmosdb_sql_role_assignment.this)) == 1
    error_message = "Development should have single team member access"
  }
}

# E2E Test: Customer Managed Key scenario
run "e2e_test_customer_managed_key_scenario" {
  command = apply

  variables {
    environment = {
      prefix          = "dx"
      env_short       = "d"
      location        = "italynorth"
      domain          = "modules"
      app_name        = "cmk"
      instance_number = "01"
    }

    tags = {
      Environment  = "Secure"
      Owner        = "DevEx"
      Project      = "E2E-Test"
      TestType     = "E2E"
      SecurityLevel = "High"
    }

    tier                = "l"
    resource_group_name = run.setup_e2e_tests.resource_group_name
    subnet_pep_id      = run.setup_e2e_tests.pep_id

    # Customer managed key configuration
    customer_managed_key = {
      enabled                   = true
      user_assigned_identity_id = "/subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/test-rg/providers/Microsoft.ManagedIdentity/userAssignedIdentities/test-identity"
      key_vault_key_id          = "https://test-vault.vault.azure.net/keys/test-key/1234567890abcdef"
    }

    consistency_policy = {
      consistency_preset = "HighConsistency"
    }

    alerts = {
      enabled = false
    }

    # Secure configuration
    force_public_network_access_enabled = false
  }

  # Validate CMK deployment
  assert {
    condition     = azurerm_cosmosdb_account.this.id != ""
    error_message = "CMK Cosmos DB should be deployed successfully"
  }

  # Validate customer managed key configuration
  assert {
    condition     = azurerm_cosmosdb_account.this.key_vault_key_id != null
    error_message = "Customer managed key should be configured"
  }

  assert {
    condition     = length(azurerm_cosmosdb_account.this.identity) == 1
    error_message = "User assigned identity should be configured for CMK"
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.identity[0].type == "UserAssigned"
    error_message = "Identity type should be UserAssigned for CMK"
  }

  assert {
    condition     = contains(azurerm_cosmosdb_account.this.identity[0].identity_ids, "/subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/test-rg/providers/Microsoft.ManagedIdentity/userAssignedIdentities/test-identity")
    error_message = "Correct user assigned identity should be configured"
  }

  assert {
    condition     = startswith(azurerm_cosmosdb_account.this.default_identity_type, "UserAssignedIdentity=")
    error_message = "Default identity type should be UserAssigned for CMK"
  }

  # Validate security features
  assert {
    condition     = azurerm_cosmosdb_account.this.public_network_access_enabled == false
    error_message = "Secure scenario should disable public access"
  }

  assert {
    condition     = azurerm_private_endpoint.sql.id != ""
    error_message = "Secure scenario should have private endpoint"
  }
}

# E2E Test: Multi-region disaster recovery scenario
run "e2e_test_disaster_recovery_scenario" {
  command = apply

  variables {
    environment = {
      prefix          = "dx"
      env_short       = "d"
      location        = "italynorth"
      domain          = "modules"
      app_name        = "dr"
      instance_number = "01"
    }

    tags = {
      Environment = "DR-Test"
      Owner       = "DevEx"
      Project     = "E2E-Test"
      TestType    = "E2E"
      DR          = "true"
    }

    tier                = "l"
    resource_group_name = run.setup_e2e_tests.resource_group_name
    subnet_pep_id      = run.setup_e2e_tests.pep_id

    # Multi-region DR configuration
    primary_geo_location = {
      location       = "italynorth"
      zone_redundant = true
    }

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

    # Consistent reads across regions
    consistency_policy = {
      consistency_preset = "BalancedStaleness"
    }

    alerts = {
      enabled = true
      thresholds = {
        provisioned_throughput_exceeded = 90
      }
    }

    force_public_network_access_enabled = false
  }

  # Validate DR deployment
  assert {
    condition     = azurerm_cosmosdb_account.this.id != ""
    error_message = "DR Cosmos DB should be deployed successfully"
  }

  # Validate multi-region configuration
  assert {
    condition     = length(azurerm_cosmosdb_account.this.geo_location) == 3
    error_message = "DR should have three regions configured"
  }

  # Validate failover priorities
  assert {
    condition = one([
      for geo in azurerm_cosmosdb_account.this.geo_location :
      geo.failover_priority == 0 && geo.location == "italynorth"
    ]) != null
    error_message = "Primary region should have priority 0"
  }

  assert {
    condition = one([
      for geo in azurerm_cosmosdb_account.this.geo_location :
      geo.failover_priority == 1 && geo.location == "westeurope"
    ]) != null
    error_message = "First secondary region should have priority 1"
  }

  assert {
    condition = one([
      for geo in azurerm_cosmosdb_account.this.geo_location :
      geo.failover_priority == 2 && geo.location == "northeurope"
    ]) != null
    error_message = "Second secondary region should have priority 2"
  }

  # Validate automatic failover
  assert {
    condition     = azurerm_cosmosdb_account.this.automatic_failover_enabled == true
    error_message = "DR should have automatic failover enabled"
  }

  # Validate consistency for DR
  assert {
    condition     = azurerm_cosmosdb_account.this.consistency_policy[0].consistency_level == "BoundedStaleness"
    error_message = "DR should use BoundedStaleness for balanced consistency"
  }

  # Validate multiple endpoints
  assert {
    condition     = length(azurerm_cosmosdb_account.this.read_endpoints) >= 3
    error_message = "DR should have read endpoints for all regions"
  }

  # Validate monitoring for DR
  assert {
    condition     = length(azurerm_monitor_metric_alert.provisioned_throughput_exceeded) == 1
    error_message = "DR should have monitoring configured"
  }

  # Validate continuous backup for DR
  assert {
    condition     = azurerm_cosmosdb_account.this.backup[0].type == "Continuous"
    error_message = "DR should have continuous backup"
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.backup[0].tier == "Continuous30Days"
    error_message = "DR should have 30-day continuous backup"
  }
}