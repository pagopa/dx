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

run "postgres_server_rejects_invalid_password_version" {
  command = plan
  variables { admin_password_version = 0 }
  expect_failures = [var.admin_password_version]
}

run "postgres_server_rejects_non_integer_password_version" {
  command = plan
  variables { admin_password_version = 1.5 }
  expect_failures = [var.admin_password_version]
}

run "postgres_server_requires_exactly_one_networking_mode" {
  command = plan
  variables { delegated_subnet_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-network/providers/Microsoft.Network/virtualNetworks/vnet-test/subnets/delegated" }
  expect_failures = [var.subnet_pep_id]
}

run "postgres_server_rejects_unknown_use_case" {
  command = plan
  variables { use_case = "unsupported" }
  expect_failures = [var.use_case]
}

run "postgres_server_requires_a_replica_in_a_different_location" {
  command = plan
  variables { replica_location = "italynorth" }
  expect_failures = [var.replica_location]
}

run "postgres_server_requires_diagnostic_destinations" {
  command = plan
  variables { diagnostic_settings = { enabled = true, log_analytics_workspace_id = null, diagnostic_setting_destination_storage_id = null } }
  expect_failures = [var.diagnostic_settings]
}
