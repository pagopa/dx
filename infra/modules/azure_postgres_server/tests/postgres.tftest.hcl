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
      prefix          = "dx"
      env_short       = "d"
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
      prefix          = "dx"
      env_short       = "d"
      location        = "italynorth"
      domain          = "modules"
      app_name        = "test"
      instance_number = "01"
    }

    tags = {
      CostCenter  = "TS700 - ENGINEERING"
      CreatedBy   = "Terraform"
      Environment = "Dev"
      Owner       = "DevEx"
      Source      = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_postgres_server/tests"
      Test        = "true"
      TestName    = "Create PostgreSQL for test"
    }

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "l"

    subnet_pep_id                        = run.setup_tests.pep_id
    private_dns_zone_resource_group_name = "dx-d-itn-network-rg-01"

    administrator_credentials = {
      name     = "psql_admin"
      password = "password"
    }

  }

  # Checks some assertions
  assert {
    condition     = azurerm_postgresql_flexible_server.this.sku_name == "GP_Standard_D4ds_v5"
    error_message = "The PostgreSQL Flexible Server must use the correct SKU (GP_Standard_D4ds_v5)"
  }

  assert {
    condition     = azurerm_postgresql_flexible_server.replica[0].create_mode == "Replica"
    error_message = "The PostgreSQL Flexible Server must be configured as a replica"
  }

  assert {
    condition     = azurerm_private_endpoint.postgre_pep[0].subnet_id == run.setup_tests.pep_id
    error_message = "The Private Endpoint must be in the correct subnet"
  }
}

run "postgres_delegated_snet_is_correct_plan" {
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
      CostCenter  = "TS700 - ENGINEERING"
      CreatedBy   = "Terraform"
      Environment = "Dev"
      Owner       = "DevEx"
      Source      = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_postgres_server/tests"
      Test        = "true"
      TestName    = "Create PostgreSQL for test"
    }

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "l"

    delegated_subnet_id                  = run.setup_tests.pep_id
    private_dns_zone_resource_group_name = "dx-d-itn-network-rg-01"

    administrator_credentials = {
      name     = "psql_admin"
      password = "password"
    }

  }

  # Checks some assertions
  assert {
    condition     = azurerm_private_endpoint.postgre_pep == []
    error_message = "The Private Endpoint resource must not exist"
  }
}
