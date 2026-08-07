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
    Owner = "DevEx"
  }

  resource_group_name = "rg-test"
  virtual_network = {
    name                = "vnet-test"
    resource_group_name = "rg-test"
  }
  subnet_cidr                          = "10.20.50.0/24"
  subnet_pep_id                        = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Network/virtualNetworks/vnet-test/subnets/snet-pep"
  private_dns_zone_resource_group_name = "rg-network"
  app_settings                         = {}
  slot_app_settings                    = {}
  health_check_path                    = "/health"
}

mock_provider "azurerm" {}
mock_provider "dx" {}

override_data {
  target = data.azurerm_virtual_network.this
  values = {
    id                  = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Network/virtualNetworks/vnet-test"
    name                = "vnet-test"
    resource_group_name = "rg-test"
  }
}

override_data {
  target = data.azurerm_private_dns_zone.app_service
  values = {
    id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-network/providers/Microsoft.Network/privateDnsZones/privatelink.azurewebsites.net"
  }
}

run "azure_app_service_rejects_unsupported_size" {
  command = plan

  variables {
    size = "B1"
  }

  expect_failures = [var.size]
}

run "azure_app_service_rejects_unsupported_node_version" {
  command = plan

  variables {
    node_version = 99
  }

  expect_failures = [var.node_version]
}

run "azure_app_service_rejects_multiple_subnet_sources" {
  command = plan

  variables {
    subnet_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Network/virtualNetworks/vnet-test/subnets/snet-app"
  }

  expect_failures = [var.subnet_cidr]
}
