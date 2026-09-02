variables {
  environment = {
    prefix          = "dx"
    env_short       = "u"
    location        = "italynorth"
    domain          = "modules"
    app_name        = "test"
    instance_number = "01"
  }

  tags                     = { Owner = "DevEx" }
  service_bus_namespace_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.ServiceBus/namespaces/sbns-test"
  action_group_ids         = ["/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Insights/actionGroups/ag-test"]
}

mock_provider "azurerm" {}

run "azure_service_bus_alerts_requires_active_message_entities" {
  command = plan

  variables {
    alerts_on_active_messages = {
      description  = "Invalid active alert"
      entity_names = []
    }
  }

  expect_failures = [var.alerts_on_active_messages]
}

run "azure_service_bus_alerts_rejects_negative_dlq_threshold" {
  command = plan

  variables {
    alerts_on_dlq_messages = {
      description  = "Invalid dead-letter alert"
      entity_names = ["queue1"]
      threshold    = -1
    }
  }

  expect_failures = [var.alerts_on_dlq_messages]
}
