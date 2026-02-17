provider "azurerm" {
  features {
  }
}

run "setup_tests" {
  module {
    source = "./tests/setup"
  }

  variables {
    environment = {
      prefix          = "dx"
      env_short       = "d"
      location        = "italynorth"
      domain          = "modules"
      app_name        = "test"
      instance_number = "01"
    }
  }
}

run "sbns_is_correct_plan" {
  command = plan

  variables {
    environment = run.setup_tests.environment

    resource_group_name = run.setup_tests.resource_group_name

    subnet_pep_id                        = run.setup_tests.pep_id
    private_dns_zone_resource_group_name = run.setup_tests.private_dns_zone_resource_group_name

    tags = run.setup_tests.tags
  }

  assert {
    condition     = azurerm_servicebus_namespace.this.name == "dx-d-itn-modules-test-sbns-01"
    error_message = "Service Bus Namespace name should be \"dx-d-itn-modules-test-sbns-01\""
  }

  assert {
    condition     = azurerm_servicebus_namespace.this.location == run.setup_tests.environment.location
    error_message = "Service Bus Namespace location should be ${run.setup_tests.environment.location}"
  }

  assert {
    condition     = azurerm_servicebus_namespace.this.resource_group_name == run.setup_tests.resource_group_name
    error_message = "Service Bus Namespace resource group should be ${run.setup_tests.resource_group_name}"
  }

  assert {
    condition     = azurerm_servicebus_namespace.this.sku == "Premium"
    error_message = "Tier \"l\" should be the default one and set to \"Premium\""
  }

  assert {
    condition     = azurerm_servicebus_namespace.this.local_auth_enabled == false
    error_message = "Service Bus Namespace local auth should be disabled"
  }

  assert {
    condition     = azurerm_servicebus_namespace.this.minimum_tls_version == "1.2"
    error_message = "Service Bus Namespace minimum TLS version should be \"1.2\""
  }
}

run "sbns_default_is_correct_plan" {
  command = plan

  variables {
    environment = run.setup_tests.environment

    resource_group_name = run.setup_tests.resource_group_name

    subnet_pep_id                        = run.setup_tests.pep_id
    private_dns_zone_resource_group_name = run.setup_tests.private_dns_zone_resource_group_name

    tags = run.setup_tests.tags
  }

  assert {
    condition     = azurerm_servicebus_namespace.this.sku == "Premium"
    error_message = "Tier \"l\" should be the default one and set to \"Premium\""
  }

  assert {
    condition     = azurerm_servicebus_namespace.this.capacity == 1
    error_message = "Service Bus Namespace capacity should be 1"
  }

  assert {
    condition     = azurerm_servicebus_namespace.this.premium_messaging_partitions == 1
    error_message = "Service Bus Namespace partitions should be 1"
  }

  assert {
    condition     = azurerm_servicebus_namespace.this.network_rule_set[0].public_network_access_enabled == false
    error_message = "Service Bus Namespace public network access should be disabled"
  }

  assert {
    condition     = azurerm_servicebus_namespace.this.network_rule_set[0].default_action == "Allow"
    error_message = "Service Bus Namespace default action should be \"Allow\" for \"l\" tier"
  }

  assert {
    condition     = azurerm_servicebus_namespace.this.network_rule_set[0].trusted_services_allowed == true
    error_message = "Service Bus Namespace trusted services should be allowed"
  }

  assert {
    condition     = azurerm_servicebus_namespace.this.network_rule_set[0].ip_rules == null
    error_message = "Service Bus Namespace IP rules should be empty"
  }

  assert {
    condition     = azurerm_monitor_autoscale_setting.this[0] != null
    error_message = "Autoscaler should be created"
  }
}

run "sbns_default_fail_plan" {
  command = plan

  variables {
    environment = run.setup_tests.environment

    resource_group_name = run.setup_tests.resource_group_name

    allowed_ips = ["0.0.0.0/0"]

    tags = run.setup_tests.tags
  }

  expect_failures = [
    var.subnet_pep_id,
    var.private_dns_zone_resource_group_name,
    var.allowed_ips,
  ]
}

run "sbns_with_diagnostic_settings" {
  command = plan

  variables {
    environment = run.setup_tests.environment

    resource_group_name = run.setup_tests.resource_group_name

    subnet_pep_id                        = run.setup_tests.pep_id
    private_dns_zone_resource_group_name = run.setup_tests.private_dns_zone_resource_group_name

    diagnostic_settings = {
      enabled                                   = true
      log_analytics_workspace_id                = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.OperationalInsights/workspaces/test-law"
      diagnostic_setting_destination_storage_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.Storage/storageAccounts/teststorage"
    }

    tags = run.setup_tests.tags
  }

  assert {
    condition     = length(azurerm_monitor_diagnostic_setting.this) == 1
    error_message = "Diagnostic settings should be created when enabled"
  }

  assert {
    condition     = azurerm_monitor_diagnostic_setting.this[0].log_analytics_workspace_id == "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.OperationalInsights/workspaces/test-law"
    error_message = "Log Analytics workspace ID should match the provided value"
  }

  assert {
    condition     = azurerm_monitor_diagnostic_setting.this[0].storage_account_id == "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.Storage/storageAccounts/teststorage"
    error_message = "Storage account ID should match the provided value"
  }

  assert {
    condition     = length(azurerm_monitor_diagnostic_setting.this[0].enabled_log) > 0
    error_message = "At least one log category should be enabled"
  }

  assert {
    condition     = length([for log in azurerm_monitor_diagnostic_setting.this[0].enabled_log : log if log.category_group == "allLogs"]) > 0
    error_message = "The category_group should be set to 'allLogs'"
  }

  assert {
    condition     = length(azurerm_monitor_diagnostic_setting.this[0].enabled_metric) > 0
    error_message = "At least one metric category should be enabled"
  }

  assert {
    condition     = length([for metric in azurerm_monitor_diagnostic_setting.this[0].enabled_metric : metric if metric.category == "AllMetrics"]) > 0
    error_message = "AllMetrics category should be enabled"
  }
}

run "sbns_without_diagnostic_settings" {
  command = plan

  variables {
    environment = run.setup_tests.environment

    resource_group_name = run.setup_tests.resource_group_name

    subnet_pep_id                        = run.setup_tests.pep_id
    private_dns_zone_resource_group_name = run.setup_tests.private_dns_zone_resource_group_name

    diagnostic_settings = {
      enabled                                   = false
      log_analytics_workspace_id                = null
      diagnostic_setting_destination_storage_id = null
    }

    tags = run.setup_tests.tags
  }

  assert {
    condition     = length(azurerm_monitor_diagnostic_setting.this) == 0
    error_message = "Diagnostic settings should not be created when disabled"
  }
}

run "sbns_with_diagnostic_settings_only_log_analytics" {
  command = plan

  variables {
    environment = run.setup_tests.environment

    resource_group_name = run.setup_tests.resource_group_name

    subnet_pep_id                        = run.setup_tests.pep_id
    private_dns_zone_resource_group_name = run.setup_tests.private_dns_zone_resource_group_name

    diagnostic_settings = {
      enabled                                   = true
      log_analytics_workspace_id                = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.OperationalInsights/workspaces/test-law"
      diagnostic_setting_destination_storage_id = null
    }

    tags = run.setup_tests.tags
  }

  assert {
    condition     = length(azurerm_monitor_diagnostic_setting.this) == 1
    error_message = "Diagnostic settings should be created with only Log Analytics workspace"
  }

  assert {
    condition     = azurerm_monitor_diagnostic_setting.this[0].log_analytics_workspace_id == "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.OperationalInsights/workspaces/test-law"
    error_message = "Log Analytics workspace ID should match the provided value"
  }

  assert {
    condition     = azurerm_monitor_diagnostic_setting.this[0].storage_account_id == null
    error_message = "Storage account ID should be null when not provided"
  }
}

run "sbns_with_diagnostic_settings_only_storage" {
  command = plan

  variables {
    environment = run.setup_tests.environment

    resource_group_name = run.setup_tests.resource_group_name

    subnet_pep_id                        = run.setup_tests.pep_id
    private_dns_zone_resource_group_name = run.setup_tests.private_dns_zone_resource_group_name

    diagnostic_settings = {
      enabled                                   = true
      log_analytics_workspace_id                = null
      diagnostic_setting_destination_storage_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.Storage/storageAccounts/teststorage"
    }

    tags = run.setup_tests.tags
  }

  assert {
    condition     = length(azurerm_monitor_diagnostic_setting.this) == 1
    error_message = "Diagnostic settings should be created with only Storage Account"
  }

  assert {
    condition     = azurerm_monitor_diagnostic_setting.this[0].log_analytics_workspace_id == null
    error_message = "Log Analytics workspace ID should be null when not provided"
  }

  assert {
    condition     = azurerm_monitor_diagnostic_setting.this[0].storage_account_id == "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.Storage/storageAccounts/teststorage"
    error_message = "Storage account ID should match the provided value"
  }
}

run "sbns_with_diagnostic_settings_enabled_but_no_destinations" {
  command = plan

  variables {
    environment = run.setup_tests.environment

    resource_group_name = run.setup_tests.resource_group_name

    subnet_pep_id                        = run.setup_tests.pep_id
    private_dns_zone_resource_group_name = run.setup_tests.private_dns_zone_resource_group_name

    diagnostic_settings = {
      enabled                                   = true
      log_analytics_workspace_id                = null
      diagnostic_setting_destination_storage_id = null
    }

    tags = run.setup_tests.tags
  }

  expect_failures = [
    var.diagnostic_settings,
  ]
}
