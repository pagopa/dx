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
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    BusinessUnit   = "DevEx"
    ManagementTeam = "Developer Experience"
    Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_service_bus_alerts/tests"
    Test           = "true"
    TestName       = "Azure Service Bus Alerts unit tests"
  }

  service_bus_namespace_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.ServiceBus/namespaces/sbns-test"
  action_group_ids         = ["/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Insights/actionGroups/ag-test"]
}

mock_provider "azurerm" {}

run "azure_service_bus_alerts_active_messages" {
  command = plan

  variables {
    alerts_on_active_messages = {
      description     = "Alert on active messages in Service Bus"
      check_every     = "PT15M"
      lookback_period = "PT30M"
      auto_mitigate   = true
      threshold       = 10
      entity_names    = ["queue1", "queue2"]
    }
  }

  assert {
    condition     = length(azurerm_monitor_metric_alert.active) == 1 && length(azurerm_monitor_metric_alert.dlq) == 0
    error_message = "Only the active messages alert must be created."
  }

  assert {
    condition     = azurerm_monitor_metric_alert.active[0].severity == 2 && azurerm_monitor_metric_alert.active[0].criteria[0].metric_name == "ActiveMessages"
    error_message = "The active messages alert must use the Warning severity and ActiveMessages metric."
  }

  assert {
    condition     = length(azurerm_monitor_metric_alert.active[0].criteria[0].dimension[0].values) == 2 && contains(azurerm_monitor_metric_alert.active[0].criteria[0].dimension[0].values, "queue1") && contains(azurerm_monitor_metric_alert.active[0].criteria[0].dimension[0].values, "queue2")
    error_message = "The active messages alert must monitor the configured entities."
  }
}

run "azure_service_bus_alerts_dead_letter_messages" {
  command = plan

  variables {
    alerts_on_dlq_messages = {
      description     = "Alert on dead-lettered messages in Service Bus"
      check_every     = "PT1M"
      lookback_period = "PT5M"
      auto_mitigate   = true
      threshold       = 0
      entity_names    = ["queue1", "queue2"]
    }
  }

  assert {
    condition     = length(azurerm_monitor_metric_alert.dlq) == 1 && length(azurerm_monitor_metric_alert.active) == 0
    error_message = "Only the dead-letter messages alert must be created."
  }

  assert {
    condition     = azurerm_monitor_metric_alert.dlq[0].severity == 1 && azurerm_monitor_metric_alert.dlq[0].criteria[0].metric_name == "DeadletteredMessages"
    error_message = "The dead-letter messages alert must use the Error severity and DeadletteredMessages metric."
  }
}

run "azure_service_bus_alerts_custom_resource_group" {
  command = plan

  variables {
    resource_group_name = "rg-alerts"
    alerts_on_active_messages = {
      description  = "Alert on active messages with custom resource group"
      entity_names = ["queue1"]
    }
  }

  assert {
    condition     = azurerm_monitor_metric_alert.active[0].resource_group_name == "rg-alerts"
    error_message = "An explicit resource group name must be used for the alert."
  }
}

run "azure_service_bus_alerts_derived_resource_group" {
  command = plan

  variables {
    alerts_on_dlq_messages = {
      description  = "Alert on dead-letter messages with derived resource group"
      entity_names = ["queue1"]
    }
  }

  assert {
    condition     = azurerm_monitor_metric_alert.dlq[0].resource_group_name == "rg-test"
    error_message = "The alert resource group must be derived from the Service Bus Namespace ID."
  }
}
