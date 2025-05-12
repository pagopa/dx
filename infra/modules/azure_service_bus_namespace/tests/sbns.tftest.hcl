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

run "sbns_premium_is_correct_plan" {
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
    condition = azurerm_monitor_autoscale_setting.this[0] != null
    error_message = "Autoscaler should be created"
  }
}

run "sbns_standard_is_correct_plan" {
  command = plan

  variables {
    environment = run.setup_tests.environment

    resource_group_name = run.setup_tests.resource_group_name

    allowed_ips = ["127.0.0.1"]

    tier = "m"

    tags = run.setup_tests.tags
  }

  assert {
    condition     = azurerm_servicebus_namespace.this.sku == "Standard"
    error_message = "Tier \"l\" should be the default one and set to \"Standard\""
  }

  assert {
    condition     = azurerm_servicebus_namespace.this.capacity == 0
    error_message = "Service Bus Namespace capacity should be 0"
  }

  assert {
    condition     = azurerm_servicebus_namespace.this.premium_messaging_partitions == 0
    error_message = "Service Bus Namespace partitions should be 0"
  }

  assert {
    condition     = azurerm_servicebus_namespace.this.network_rule_set[0].public_network_access_enabled == false
    error_message = "Service Bus Namespace public network access should be disabled"
  }

  assert {
    condition     = azurerm_servicebus_namespace.this.network_rule_set[0].default_action == "Deny"
    error_message = "Service Bus Namespace default action should be \"Deny\" for \"m\" tier"
  }

  assert {
    condition     = azurerm_servicebus_namespace.this.network_rule_set[0].trusted_services_allowed == true
    error_message = "Service Bus Namespace trusted services should be allowed"
  }

  assert {
    condition     = length(azurerm_servicebus_namespace.this.network_rule_set[0].ip_rules) == 1
    error_message = "Service Bus Namespace IP rules should be filled"
  }
}
