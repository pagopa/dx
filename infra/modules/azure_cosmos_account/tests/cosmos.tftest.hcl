provider "azurerm" {
  features {
  }
}

run "setup_tests" {
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

run "cosmos_is_correct_plan" {
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
      CostCenter     = "TS000 - Tecnologia e Servizi"
      CreatedBy      = "Terraform"
      Environment    = "Dev"
      Owner          = "DevEx"
      Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_cosmos_account/tests"
      ManagementTeam = "Developer Experience"
      Test           = "true"
      TestName       = "Create Cosmos account for test"
    }

    tier = "s"

    resource_group_name = run.setup_tests.resource_group_name

    subnet_pep_id                        = run.setup_tests.pep_id
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

  # Checks some assertions
  assert {
    condition     = azurerm_cosmosdb_account.this.offer_type == "Standard"
    error_message = "The Cosmos DB offer type must be Standard"
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.local_authentication_disabled == true
    error_message = "The Cosmos DB account must have local authentication disabled"
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.consistency_policy[0].consistency_level == "BoundedStaleness"
    error_message = "The Cosmos DB consistency level must be Bounded Staleness"
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.automatic_failover_enabled == true
    error_message = "The Cosmos DB account must have automatic failover enabled"
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.kind == "GlobalDocumentDB"
    error_message = "The Cosmos DB account must support DocumentDB API"
  }

  assert {
    condition     = [ for value in azurerm_cosmosdb_account.this.capabilities : value.name ][0] == "EnableServerless"
    error_message = "The Cosmos DB account must have serverless enabled"
  }

  assert {
    condition = length(setintersection(
      [for value in azurerm_cosmosdb_account.this.capabilities : value.name],
      ["EnableMongo", "EnableCassandra", "EnableTable", "EnableGremlin"]
    )) == 0
    error_message = "The Cosmos DB account must not have capabilities EnableMongo, EnableCassandra, EnableTable, or EnableGremlin"
  }

  assert {
    condition     = azurerm_private_endpoint.sql.subnet_id == run.setup_tests.pep_id
    error_message = "The Private Endpoint must be in the correct subnet"
  }

  assert {
    condition     = azurerm_private_endpoint.sql.private_service_connection[0].name == run.setup_tests.pvt_service_connection_name
    error_message = "The Private Endpoint connection must have the correct name"
  }

  assert {
    condition     = azurerm_private_endpoint.sql.private_service_connection[0].subresource_names[0] == "Sql"
    error_message = "The Subresource name must be Sql"
  }
}
