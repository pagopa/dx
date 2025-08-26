# Contract Tests for Azure Cosmos DB Module
# These tests validate the module's interface - inputs, outputs, and their relationships

provider "azurerm" {
  features {}
}

# Setup module for contract tests
run "setup_contract_tests" {
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

# Test all required outputs are present and correctly typed
run "contract_test_outputs" {
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

    resource_group_name = run.setup_contract_tests.resource_group_name
    subnet_pep_id      = run.setup_contract_tests.pep_id
  }

  # Test that all expected outputs are defined and have correct types
  assert {
    condition     = can(azurerm_cosmosdb_account.this.name)
    error_message = "Output 'name' should be accessible"
  }

  assert {
    condition     = can(azurerm_cosmosdb_account.this.id) 
    error_message = "Output 'id' should be accessible"
  }

  assert {
    condition     = can(azurerm_cosmosdb_account.this.resource_group_name)
    error_message = "Output 'resource_group_name' should be accessible"
  }

  assert {
    condition     = can(azurerm_cosmosdb_account.this.endpoint)
    error_message = "Output 'endpoint' should be accessible"
  }

  assert {
    condition     = can(azurerm_cosmosdb_account.this.read_endpoints)
    error_message = "Output 'read_endpoints' should be accessible"
  }

  assert {
    condition     = can(azurerm_cosmosdb_account.this.write_endpoints)
    error_message = "Output 'write_endpoints' should be accessible"
  }

  # Test output values are strings/lists as expected
  assert {
    condition     = can(regex("^dx-d-itn-modules-test-cosmos-nosql-01$", azurerm_cosmosdb_account.this.name))
    error_message = "Name output should be a valid string following naming convention"
  }

  assert {
    condition     = startswith(azurerm_cosmosdb_account.this.id, "/subscriptions/")
    error_message = "ID output should be a valid Azure resource ID"
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.resource_group_name == run.setup_contract_tests.resource_group_name
    error_message = "Resource group name output should match input"
  }

  assert {
    condition     = startswith(azurerm_cosmosdb_account.this.endpoint, "https://")
    error_message = "Endpoint output should be a valid HTTPS URL"
  }

  assert {
    condition     = length(azurerm_cosmosdb_account.this.read_endpoints) >= 1
    error_message = "Read endpoints should contain at least one endpoint"
  }

  assert {
    condition     = length(azurerm_cosmosdb_account.this.write_endpoints) >= 1
    error_message = "Write endpoints should contain at least one endpoint"
  }
}

# Test input validation works correctly
run "contract_test_input_validation_tier" {
  command = plan
  expect_failures = [var.tier]

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

    tier                = "invalid"  # Should trigger validation error
    resource_group_name = "test-rg"
    subnet_pep_id      = "/subscriptions/sub-id/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/subnet"
  }
}

# Test input validation for consistency policy
run "contract_test_input_validation_consistency" {
  command = plan
  expect_failures = [var.consistency_policy]

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
      consistency_preset = "Invalid"  # Should trigger validation error
    }
  }
}

# Test input validation for customer managed key
run "contract_test_input_validation_cmk" {
  command = plan
  expect_failures = [var.customer_managed_key]

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
      enabled = true
      # Missing required fields - should trigger validation error
    }
  }
}

# Test BoundedStaleness validation
run "contract_test_bounded_staleness_validation" {
  command = plan
  expect_failures = [var.consistency_policy]

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
      max_interval_in_seconds = 1  # Too low - should trigger validation error
      max_staleness_prefix    = 100000
    }
  }
}

# Test different input combinations produce expected outputs
run "contract_test_input_output_mapping" {
  command = plan

  variables {
    environment = {
      prefix          = "custom"
      env_short       = "p"
      location        = "westeurope"
      domain          = "api"
      app_name        = "myapp"
      instance_number = "02"
    }

    tags = {
      Environment = "Production"
      Owner       = "Platform"
      Project     = "MyProject"
    }

    resource_group_name = "custom-rg"
    subnet_pep_id      = "/subscriptions/sub-id/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/subnet"
    tier               = "s"

    primary_geo_location = {
      location       = "westeurope"
      zone_redundant = false
    }
  }

  # Test that custom environment values are reflected in outputs
  assert {
    condition     = can(regex("^custom-p-weu-api-myapp-cosmos-nosql-02$", azurerm_cosmosdb_account.this.name))
    error_message = "Name should reflect custom environment values"
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.location == "westeurope"
    error_message = "Location should match environment location"
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.resource_group_name == "custom-rg"
    error_message = "Resource group should match input"
  }

  # Test tags are properly merged
  assert {
    condition     = azurerm_cosmosdb_account.this.tags["Environment"] == "Production"
    error_message = "User tags should be preserved"
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.tags["Owner"] == "Platform"
    error_message = "User tags should be preserved"
  }

  assert {
    condition     = can(azurerm_cosmosdb_account.this.tags["ModuleSource"])
    error_message = "Module metadata tags should be added"
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.tags["ModuleSource"] == "DX"
    error_message = "ModuleSource tag should be DX"
  }
}

# Test private endpoint configuration is properly exposed
run "contract_test_private_endpoint_outputs" {
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

    resource_group_name = run.setup_contract_tests.resource_group_name
    subnet_pep_id      = run.setup_contract_tests.pep_id
  }

  # Test private endpoint is created and configured correctly
  assert {
    condition     = azurerm_private_endpoint.sql.subnet_id == run.setup_contract_tests.pep_id
    error_message = "Private endpoint should use the provided subnet"
  }

  assert {
    condition     = azurerm_private_endpoint.sql.private_service_connection[0].subresource_names[0] == "Sql"
    error_message = "Private endpoint should target SQL subresource"
  }

  assert {
    condition     = azurerm_private_endpoint.sql.private_service_connection[0].private_connection_resource_id == azurerm_cosmosdb_account.this.id
    error_message = "Private endpoint should connect to the Cosmos DB account"
  }
}

# Test authorized teams configuration
run "contract_test_authorized_teams" {
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

    authorized_teams = {
      readers = ["00000000-0000-0000-0000-000000000001"]
      writers = ["00000000-0000-0000-0000-000000000002", "00000000-0000-0000-0000-000000000003"]
    }
  }

  # Test role assignments are created for authorized teams
  assert {
    condition     = length(keys(azurerm_cosmosdb_sql_role_assignment.this)) == 3
    error_message = "Should create role assignments for all authorized team members"
  }

  # Test reader role assignment
  assert {
    condition = contains([
      for key, assignment in azurerm_cosmosdb_sql_role_assignment.this :
      assignment.principal_id if contains(assignment.role_definition_id, "00000000-0000-0000-0000-000000000001")
    ], "00000000-0000-0000-0000-000000000001")
    error_message = "Reader role should be assigned to reader principal"
  }

  # Test writer role assignments
  assert {
    condition = length([
      for key, assignment in azurerm_cosmosdb_sql_role_assignment.this :
      assignment.principal_id if contains(assignment.role_definition_id, "00000000-0000-0000-0000-000000000002")
    ]) == 2
    error_message = "Writer role should be assigned to writer principals"
  }
}