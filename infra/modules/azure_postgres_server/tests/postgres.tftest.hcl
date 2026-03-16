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

    tags = run.setup_tests.tags

    resource_group_name = run.setup_tests.resource_group_name
    use_case            = "default"
    replica_location    = "spaincentral"

    subnet_pep_id                        = run.setup_tests.pep_id
    private_dns_zone_resource_group_name = "dx-d-itn-network-rg-01"

    admin_username         = "psql_admin"
    admin_password         = "password"
    admin_password_version = 1

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

    tags = run.setup_tests.tags

    resource_group_name = run.setup_tests.resource_group_name
    use_case            = "default"
    replica_location    = "spaincentral"

    delegated_subnet_id                  = run.setup_tests.pep_id
    private_dns_zone_resource_group_name = "dx-d-itn-network-rg-01"

    admin_username         = "psql_admin"
    admin_password         = "password"
    admin_password_version = 1

  }

  # Checks some assertions
  assert {
    condition     = azurerm_private_endpoint.postgre_pep == []
    error_message = "The Private Endpoint resource must not exist"
  }

  assert {
    condition     = azurerm_private_endpoint.replica_postgre_pep == []
    error_message = "The Replica Private Endpoint resource must not exist"
  }
}

run "postgres_no_replica_is_correct_plan" {
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

    tags = run.setup_tests.tags

    resource_group_name = run.setup_tests.resource_group_name
    use_case            = "default"
    create_replica      = false

    subnet_pep_id                        = run.setup_tests.pep_id
    private_dns_zone_resource_group_name = "dx-d-itn-network-rg-01"

    admin_username         = "psql_admin"
    admin_password         = "password"
    admin_password_version = 1
  }

  # Checks some assertions
  assert {
    condition     = length(azurerm_postgresql_flexible_server.replica) == 0
    error_message = "The PostgreSQL Flexible Server replica must not be created"
  }
}

run "postgres_replica_location_correct_plan" {
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

    tags             = run.setup_tests.tags
    replica_location = "spaincentral"

    resource_group_name = run.setup_tests.resource_group_name
    use_case            = "default"

    subnet_pep_id                        = run.setup_tests.pep_id
    private_dns_zone_resource_group_name = "dx-d-itn-network-rg-01"

    admin_username         = "psql_admin"
    admin_password         = "password"
    admin_password_version = 1
  }

  # Checks some assertions
  assert {
    condition     = azurerm_postgresql_flexible_server.replica[0].location == "spaincentral"
    error_message = "The PostgreSQL Flexible Server replica must be created in the default location (spaincentral)"
  }
}

run "postgres_with_key_vault_is_correct_plan" {
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

    tags = run.setup_tests.tags

    resource_group_name = run.setup_tests.resource_group_name
    use_case            = "default"
    replica_location    = "spaincentral"

    subnet_pep_id                        = run.setup_tests.pep_id
    private_dns_zone_resource_group_name = "dx-d-itn-network-rg-01"

    admin_username         = "psql_admin"
    admin_password         = "password"
    admin_password_version = 1

    key_vault = {
      id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.KeyVault/vaults/test-vault"
    }
  }

  assert {
    condition     = length(azurerm_key_vault_secret.admin_password) == 1
    error_message = "A Key Vault secret for the admin password must be created when key_vault is provided"
  }

  assert {
    condition     = azurerm_key_vault_secret.admin_password[0].key_vault_id == "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.KeyVault/vaults/test-vault"
    error_message = "The Key Vault secret must reference the specified vault"
  }
}
