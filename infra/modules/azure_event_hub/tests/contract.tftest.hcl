variables {
  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    domain          = "modules"
    app_name        = "test"
    instance_number = "01"
  }

  tags                                 = { Owner = "DevEx" }
  resource_group_name                  = "rg-test"
  subnet_pep_id                        = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-network/providers/Microsoft.Network/virtualNetworks/vnet-test/subnets/pep"
  private_dns_zone_resource_group_name = "rg-network"
}

mock_provider "azurerm" {}

override_data {
  target = data.azurerm_private_dns_zone.this
  values = {
    id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-network/providers/Microsoft.Network/privateDnsZones/privatelink.servicebus.windows.net"
  }
}

run "azure_event_hub_requires_diagnostic_destination" {
  command = plan

  variables {
    diagnostic_settings = {
      enabled                    = true
      log_analytics_workspace_id = null
      storage_account_id         = null
    }
  }

  expect_failures = [var.diagnostic_settings]
}
