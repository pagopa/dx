variables {
  environment = {
    prefix          = "dx"
    env_short       = "u"
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

run "azure_service_bus_namespace_requires_private_endpoint_subnet" {
  command = plan

  variables {
    subnet_pep_id = null
  }

  expect_failures = [var.subnet_pep_id]
}

run "azure_service_bus_namespace_requires_private_dns_resource_group" {
  command = plan

  variables {
    private_dns_zone_resource_group_name = null
  }

  expect_failures = [var.private_dns_zone_resource_group_name]
}

run "azure_service_bus_namespace_rejects_allowed_ips_for_default_use_case" {
  command = plan

  variables {
    allowed_ips = ["0.0.0.0/0"]
  }

  expect_failures = [var.allowed_ips]
}

run "azure_service_bus_namespace_requires_diagnostic_destination" {
  command = plan

  variables {
    diagnostic_settings = {
      enabled                                   = true
      log_analytics_workspace_id                = null
      diagnostic_setting_destination_storage_id = null
    }
  }

  expect_failures = [var.diagnostic_settings]
}
