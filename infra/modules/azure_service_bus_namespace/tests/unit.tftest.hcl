variables {
  environment = {
    prefix          = "dx"
    env_short       = "u"
    location        = "italynorth"
    domain          = "modules"
    app_name        = "test"
    instance_number = "01"
  }

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Uat"
    BusinessUnit   = "DevEx"
    ManagementTeam = "Developer Experience"
    Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_service_bus_namespace/tests"
    Test           = "true"
    TestName       = "Azure Service Bus Namespace unit tests"
  }

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

run "azure_service_bus_namespace_default_configuration" {
  command = plan

  assert {
    condition     = azurerm_servicebus_namespace.this.sku == "Premium" && azurerm_servicebus_namespace.this.capacity == 1
    error_message = "The default Service Bus Namespace must use one Premium messaging unit."
  }

  assert {
    condition     = azurerm_servicebus_namespace.this.local_auth_enabled == false && azurerm_servicebus_namespace.this.minimum_tls_version == "1.2"
    error_message = "The default Service Bus Namespace must disable local auth and enforce TLS 1.2."
  }

  assert {
    condition     = azurerm_servicebus_namespace.this.network_rule_set[0].public_network_access_enabled == false
    error_message = "The default Service Bus Namespace must disable public network access."
  }

  assert {
    condition     = length(azurerm_monitor_autoscale_setting.this) == 1
    error_message = "The default Service Bus Namespace must configure autoscaling."
  }
}

run "azure_service_bus_namespace_diagnostic_settings" {
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
    error_message = "Diagnostic settings must be created when destinations are configured."
  }

  assert {
    condition     = azurerm_monitor_diagnostic_setting.this[0].log_analytics_workspace_id == "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.OperationalInsights/workspaces/law-test"
    error_message = "The configured Log Analytics destination must be applied."
  }
}
