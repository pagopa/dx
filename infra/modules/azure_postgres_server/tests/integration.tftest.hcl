provider "azurerm" {
  features {
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
  }
}

variables {
  environment = {
    prefix          = "dx"
    env_short       = "u"
    location        = "italynorth"
    domain          = "int"
    app_name        = "psql"
    instance_number = "01"
  }

  tags = {
    CostCenter     = "TS720 - DEV EX"
    CreatedBy      = "Terraform"
    Environment    = "Uat"
    Owner          = "DevEx"
    Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_postgres_server/tests"
    ManagementTeam = "Developer Experience"
    Test           = "true"
    TestName       = "PostgreSQL integration tests"
  }

  test_kind = "integration"
  use_case  = "low_load"
}

run "setup" {
  module {
    source = "./tests/setup"
  }

  variables {
    environment = var.environment
    tags        = var.tags
    test_kind   = var.test_kind
  }
}

run "apply_low_load" {
  command = apply

  variables {
    environment                          = merge(var.environment, { app_name = "psqllow" })
    tags                                 = var.tags
    resource_group_name                  = run.setup.resource_group_name
    private_dns_zone_resource_group_name = run.setup.private_dns_zone_resource_group_name
    subnet_pep_id                        = run.setup.subnet_pep_id
    use_case                             = "low_load"
    admin_username                       = "psql_admin"
    admin_password                       = "Password1234!"
    admin_password_version               = 1
  }

  assert {
    condition     = azurerm_postgresql_flexible_server.this.sku_name == "B_Standard_B1ms"
    error_message = "low_load use case must provision the B_Standard_B1ms SKU"
  }

  assert {
    condition     = length(azurerm_postgresql_flexible_server.this.high_availability) == 0
    error_message = "low_load use case must not provision high availability"
  }

  assert {
    condition     = azurerm_postgresql_flexible_server.this.geo_redundant_backup_enabled == false
    error_message = "low_load use case must disable geo-redundant backup"
  }

  assert {
    condition     = azurerm_postgresql_flexible_server.this.auto_grow_enabled == false
    error_message = "low_load use case must disable auto-grow"
  }

  assert {
    condition     = length(azurerm_postgresql_flexible_server.replica) == 0
    error_message = "low_load use case must not create a replica by default"
  }
}
