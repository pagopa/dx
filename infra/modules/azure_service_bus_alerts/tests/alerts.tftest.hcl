provider "azurerm" {
  features {
  }
  storage_use_azuread = true
}

run "setup_tests" {
  module {
    source = "./tests/setup"
  }
}

run "plan_alerts_on_active_messages" {
  command = plan

  variables {
    environment = run.setup_tests.environment
    tags        = run.setup_tests.tags

    service_bus_namespace_id = run.setup_tests.service_bus_namespace_id
    action_group_ids         = [run.setup_tests.action_group_id]

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
    condition     = azurerm_monitor_metric_alert.active[0] != null
    error_message = "Active messages alert is missing from the plan"
  }

  assert {
    condition     = azurerm_monitor_metric_alert.active[0].enabled == true
    error_message = "Active messages alert should be enabled"
  }

  assert {
    condition     = azurerm_monitor_metric_alert.active[0].description == "Alert on active messages in Service Bus"
    error_message = "Active messages alert description is incorrect"
  }

  assert {
    condition     = azurerm_monitor_metric_alert.active[0].severity == 2
    error_message = "Active messages alert severity value is incorrect"
  }

  assert {
    condition     = length(azurerm_monitor_metric_alert.active[0].scopes) == 1
    error_message = "Active messages alert should have exactly one scope"
  }

  assert {
    condition     = azurerm_monitor_metric_alert.active[0].frequency == "PT15M"
    error_message = "Active messages alert frequency value is incorrect"
  }

  assert {
    condition     = azurerm_monitor_metric_alert.active[0].window_size == "PT30M"
    error_message = "Active messages alert window_size value is incorrect"
  }

  assert {
    condition     = azurerm_monitor_metric_alert.active[0].auto_mitigate == true
    error_message = "Active messages alert auto_mitigate value is incorrect"
  }

  assert {
    condition     = azurerm_monitor_metric_alert.active[0].criteria[0].threshold == 10
    error_message = "Active messages alert threshold value is incorrect"
  }

  assert {
    condition     = azurerm_monitor_metric_alert.active[0].criteria[0].metric_name == "ActiveMessages"
    error_message = "Active messages alert metric name value is incorrect"
  }

  assert {
    condition     = length(azurerm_monitor_metric_alert.active[0].criteria[0].dimension) == 1
    error_message = "Active messages alert should have one dimension in criteria"
  }

  assert {
    condition     = length(azurerm_monitor_metric_alert.active[0].criteria[0].dimension[0].values) == 2
    error_message = "Active messages alert should have two entity names in dimension values"
  }

  assert {
    condition     = azurerm_monitor_metric_alert.active[0].criteria[0].dimension[0].values[0] == "queue1"
    error_message = "Active messages alert first entity name value is incorrect"
  }

  assert {
    condition     = azurerm_monitor_metric_alert.active[0].criteria[0].dimension[0].values[1] == "queue2"
    error_message = "Active messages alert second entity name value is incorrect"
  }

  assert {
    condition     = length(azurerm_monitor_metric_alert.dlq) == 0
    error_message = "DLQ alerts should not be present when only active messages alert is configured"
  }
}

run "plan_alerts_on_dlq_messages" {
  command = plan

  variables {
    environment = run.setup_tests.environment
    tags        = run.setup_tests.tags

    service_bus_namespace_id = run.setup_tests.service_bus_namespace_id
    action_group_ids         = [run.setup_tests.action_group_id]

    alerts_on_dlq_messages = {
      description     = "Alert on dlq messages in Service Bus"
      check_every     = "PT1M"
      lookback_period = "PT5M"
      auto_mitigate   = true
      threshold       = 0
      entity_names    = ["queue1", "queue2"]
    }
  }

  assert {
    condition     = azurerm_monitor_metric_alert.dlq[0] != null
    error_message = "DLQ messages alert is missing from the plan"
  }

  assert {
    condition     = azurerm_monitor_metric_alert.dlq[0].enabled == true
    error_message = "DLQ messages alert should be enabled"
  }

  assert {
    condition     = azurerm_monitor_metric_alert.dlq[0].description == "Alert on dlq messages in Service Bus"
    error_message = "DLQ messages alert description is incorrect"
  }

  assert {
    condition     = azurerm_monitor_metric_alert.dlq[0].severity == 1
    error_message = "DLQ messages alert severity value is incorrect"
  }

  assert {
    condition     = length(azurerm_monitor_metric_alert.dlq[0].scopes) == 1
    error_message = "DLQ messages alert should have exactly one scope"
  }

  assert {
    condition     = azurerm_monitor_metric_alert.dlq[0].frequency == "PT1M"
    error_message = "DLQ messages alert frequency value is incorrect"
  }

  assert {
    condition     = azurerm_monitor_metric_alert.dlq[0].window_size == "PT5M"
    error_message = "DLQ messages alert window_size value is incorrect"
  }

  assert {
    condition     = azurerm_monitor_metric_alert.dlq[0].auto_mitigate == true
    error_message = "DLQ messages alert auto_mitigate value is incorrect"
  }

  assert {
    condition     = azurerm_monitor_metric_alert.dlq[0].criteria[0].threshold == 0
    error_message = "DLQ messages alert threshold value is incorrect"
  }

  assert {
    condition     = azurerm_monitor_metric_alert.dlq[0].criteria[0].metric_name == "DeadletteredMessages"
    error_message = "DLQ messages alert metric name value is incorrect"
  }

  assert {
    condition     = length(azurerm_monitor_metric_alert.dlq[0].criteria[0].dimension) == 1
    error_message = "DLQ messages alert should have one dimension in criteria"
  }

  assert {
    condition     = length(azurerm_monitor_metric_alert.dlq[0].criteria[0].dimension[0].values) == 2
    error_message = "DLQ messages alert should have two entity names in dimension values"
  }

  assert {
    condition     = azurerm_monitor_metric_alert.dlq[0].criteria[0].dimension[0].values[0] == "queue1"
    error_message = "DLQ messages alert first entity name value is incorrect"
  }

  assert {
    condition     = azurerm_monitor_metric_alert.dlq[0].criteria[0].dimension[0].values[1] == "queue2"
    error_message = "DLQ messages alert second entity name value is incorrect"
  }

  assert {
    condition     = length(azurerm_monitor_metric_alert.active) == 0
    error_message = "Active messages alerts should not be present when only DLQ alert is configured"
  }
}
