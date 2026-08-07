variables {
  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    domain          = "modules"
    app_name        = "test"
    instance_number = "01"
  }
  tags                                 = {}
  resource_group_name                  = "rg-test"
  private_dns_zone_resource_group_name = "rg-network"
  subnet_pep_id                        = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-network/providers/Microsoft.Network/virtualNetworks/vnet-test/subnets/pep"
  admin_username                       = "psql_admin"
  admin_password                       = "password"
  admin_password_version               = 1
  replica_location                     = "spaincentral"
}

mock_provider "azurerm" {}
mock_provider "dx" {}

override_data {
  target = data.azurerm_private_dns_zone.postgre_dns_zone
  values = { id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-network/providers/Microsoft.Network/privateDnsZones/privatelink.postgres.database.azure.com" }
}

run "postgres_server_creates_default_replica_and_private_endpoints" {
  command = plan

  assert {
    condition     = azurerm_postgresql_flexible_server.this.sku_name == "GP_Standard_D2ds_v5"
    error_message = "The default use case must use the expected PostgreSQL SKU."
  }

  assert {
    condition     = azurerm_postgresql_flexible_server.replica[0].create_mode == "Replica"
    error_message = "The default configuration must create a replica."
  }

  assert {
    condition     = azurerm_private_endpoint.postgre_pep[0].subnet_id == var.subnet_pep_id
    error_message = "The primary private endpoint must use the configured subnet."
  }
}

run "postgres_server_supports_delegated_subnet" {
  command = plan
  variables {
    subnet_pep_id       = null
    delegated_subnet_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-network/providers/Microsoft.Network/virtualNetworks/vnet-test/subnets/delegated"
  }

  assert {
    condition     = length(azurerm_private_endpoint.postgre_pep) == 0 && length(azurerm_private_endpoint.replica_postgre_pep) == 0
    error_message = "Delegated networking must not create private endpoints."
  }
}

run "postgres_server_skips_replica_when_disabled" {
  command = plan
  variables {
    create_replica   = false
    replica_location = null
  }

  assert {
    condition     = length(azurerm_postgresql_flexible_server.replica) == 0
    error_message = "No replica must be created when create_replica is false."
  }
}

run "postgres_server_creates_optional_key_vault_secret" {
  command = plan
  variables { key_vault_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.KeyVault/vaults/kv-test" }

  assert {
    condition     = azurerm_key_vault_secret.admin_password[0].key_vault_id == var.key_vault_id
    error_message = "The optional password secret must target the configured Key Vault."
  }
}
