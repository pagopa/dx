provider "azurerm" {
  features {
  }
  storage_use_azuread = true
}

run "setup_tests" {
  module {
    source = "./tests/setup"
  }
  
  variables {
    environment = {
      prefix          = "io"
      env_short       = "p"
      location        = "italynorth"
      domain          = "modules"
      app_name        = "test"
      instance_number = "01"
    }
  }
}

run "postgres_is_correct_plan" {
  command = plan

  variables {
    environment = {
      prefix          = "io"
      env_short       = "p"
      location        = "italynorth"
      domain          = "modules"
      app_name        = "test"
      instance_number = "01"
    }

    tags = {
      CostCenter  = "TS310 - PAGAMENTI & SERVIZI"
      CreatedBy   = "Terraform"
      Environment = "Prod"
      Owner       = "IO"
      Source      = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_postgres_server/tests"
      Test        = "true"
      TestName    = "Create app service for test"
    }

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "l"
  
    subnet_pep_id = run.setup_tests.pep_id
    private_dns_zone_resource_group_name = "io-p-rg-common"

    administrator_credentials = {
      name     = "psql_admin"
      password = "password"
    }

  }

  # Checks some assertions
  assert {
    condition     = azurerm_postgresql_flexible_server.this.sku_name == "GP_Standard_D2ds_v5"
    error_message = "The PostgreSQL Flexible Server must use the correct SKU (GP_Standard_D2ds_v5)"
  }

  assert {
    condition     = azurerm_postgresql_flexible_server.replica[0].create_mode == "Replica"
    error_message = "The PostgreSQL Flexible Server must be configured as a replica"
  }

  assert {
    condition     = azurerm_private_endpoint.postgre_pep.subnet_id == run.setup_tests.pep_id
    error_message = "The Private Endpoint must be in the correct subnet"
  }
}