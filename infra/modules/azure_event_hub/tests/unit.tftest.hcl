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
    Owner          = "DevEx"
    ManagementTeam = "Developer Experience"
    Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_event_hub/tests"
    Test           = "true"
    TestName       = "Azure Event Hub unit tests"
  }

  resource_group_name                  = "rg-test"
  subnet_pep_id                        = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-network/providers/Microsoft.Network/virtualNetworks/vnet-test/subnets/pep"
  private_dns_zone_resource_group_name = "rg-network"
  eventhubs = [{
    name                   = "event-hub-test"
    partitions             = 1
    message_retention_days = 1
    consumers              = ["consumer-test"]
    keys = [{
      name   = "sender"
      listen = false
      send   = true
      manage = false
    }]
  }]
}

mock_provider "azurerm" {}

override_data {
  target = data.azurerm_private_dns_zone.this
  values = {
    id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-network/providers/Microsoft.Network/privateDnsZones/privatelink.servicebus.windows.net"
  }
}

run "azure_event_hub_default_configuration" {
  command = plan

  assert {
    condition     = azurerm_eventhub_namespace.this.sku == "Standard"
    error_message = "The default Event Hub namespace must use the Standard SKU."
  }

  assert {
    condition     = azurerm_eventhub_namespace.this.auto_inflate_enabled == false && azurerm_eventhub_namespace.this.capacity == 1
    error_message = "The default Event Hub namespace must disable auto-inflate and use one capacity unit."
  }

  assert {
    condition     = one(values(azurerm_eventhub.events)).partition_count == 1
    error_message = "The configured Event Hub partition count must be applied."
  }
}

run "azure_event_hub_diagnostic_settings" {
  command = plan

  variables {
    diagnostic_settings = {
      enabled                    = true
      log_analytics_workspace_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.OperationalInsights/workspaces/law-test"
      storage_account_id         = null
    }
  }

  assert {
    condition     = length(azurerm_monitor_diagnostic_setting.event_hub_namespace) == 1
    error_message = "Diagnostic settings must be created when a destination is configured."
  }
}
