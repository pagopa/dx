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

run "azure_app_service_default_plan" {
  command = plan

  assert {
    condition     = azurerm_service_plan.this[0].sku_name == "P1v3"
    error_message = "The default App Service plan must use the P1v3 SKU."
  }

  assert {
    condition     = azurerm_linux_web_app.this.https_only && azurerm_linux_web_app.this.site_config[0].always_on
    error_message = "The App Service must enforce HTTPS and remain always on."
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].application_stack[0].node_version == "22-lts"
    error_message = "The default App Service stack must use Node 22 LTS."
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].minimum_tls_version == "1.2" && azurerm_linux_web_app_slot.this[0].site_config[0].minimum_tls_version == "1.2"
    error_message = "The App Service and staging slot must enforce TLS 1.2."
  }

  assert {
    condition     = length(azurerm_subnet.this) == 1
    error_message = "A subnet must be created when a CIDR is supplied."
  }
}

run "azure_app_service_existing_subnet" {
  command = plan

  variables {
    subnet_cidr = null
    subnet_id   = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Network/virtualNetworks/vnet-test/subnets/snet-app"
  }

  assert {
    condition     = azurerm_subnet.this == []
    error_message = "No subnet must be created when an existing subnet is supplied."
  }
}

run "azure_app_service_custom_plan_sizes" {
  command = plan

  variables {
    size = "P2v3"
  }

  assert {
    condition     = azurerm_service_plan.this[0].sku_name == "P2v3" && azurerm_service_plan.this[0].zone_balancing_enabled
    error_message = "The P2v3 override must enable zone balancing."
  }
}

run "azure_app_service_p0v3_disables_zone_balancing" {
  command = plan

  variables {
    size = "P0v3"
  }

  assert {
    condition     = !azurerm_service_plan.this[0].zone_balancing_enabled
    error_message = "The P0v3 override must disable zone balancing."
  }
}

run "azure_app_service_diagnostic_settings" {
  command = plan

  variables {
    diagnostic_settings = {
      enabled                                   = true
      log_analytics_workspace_id                = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.OperationalInsights/workspaces/law-test"
      diagnostic_setting_destination_storage_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Storage/storageAccounts/sttest"
    }
  }

  assert {
    condition     = length(azurerm_monitor_diagnostic_setting.this) == 1
    error_message = "Diagnostic settings must be created when enabled with destinations."
  }
}

run "azure_app_service_disabled_diagnostic_settings" {
  command = plan

  variables {
    diagnostic_settings = {
      enabled                                   = false
      log_analytics_workspace_id                = null
      diagnostic_setting_destination_storage_id = null
    }
  }

  assert {
    condition     = length(azurerm_monitor_diagnostic_setting.this) == 0
    error_message = "Diagnostic settings must not be created when disabled."
  }
}

run "azure_app_service_node_24" {
  command = plan

  variables {
    node_version = 24
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].application_stack[0].node_version == "24-lts"
    error_message = "The App Service must support Node 24 LTS."
  }
}
