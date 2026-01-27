provider "azurerm" {
  features {
  }
}

run "setup_tests" {
  module {
    source = "./tests/setup"
  }

  variables {
    project = "dx-d-itn"
  }
}

run "default_eventhub_is_correct_plan" {
  command = plan

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
      Owner          = "DevEx"
      Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_event_hub/tests"
      ManagementTeam = "Developer Experience"
      Test           = "true"
      TestName       = "Create EventHUB for test"
    }

    resource_group_name = "dx-d-evt-rg"
    use_case            = "default"

    subnet_pep_id                        = run.setup_tests.pep_id
    private_dns_zone_resource_group_name = "dx-d-itn-network-rg-01"

    eventhubs = [{
      name                   = "event-hub-test"
      partitions             = 1
      message_retention_days = 1
      consumers = [
        "bpd-payment-instrument",
        "test-comsumer-group-1",
        "test-comsumer-group-2"
      ]
      keys = [
        {
          name   = "test-comsumer-group-1"
          listen = false
          send   = true
          manage = false
        },
        {
          name   = "test-comsumer-group-2"
          listen = true
          send   = false
          manage = false
        },
      ]
    }]
  }

  # Checks some assertions
  assert {
    condition     = azurerm_eventhub_namespace.this.sku == "Standard"
    error_message = "The Namespace SKU is incorrect, have to be Standard"
  }

  assert {
    condition     = [for k, v in azurerm_eventhub.events : v.partition_count][0] == 1
    error_message = "Number of partitions are incorrect, have to be 1"
  }

  assert {
    condition     = azurerm_eventhub_namespace.this.auto_inflate_enabled == false
    error_message = "Auto Inflate should be disabled for the default use case"
  }

  assert {
    condition     = azurerm_eventhub_namespace.this.capacity == 1
    error_message = "Capacity should be 1 for the default use case"
  }

  assert {
    condition     = azurerm_eventhub_namespace.this.maximum_throughput_units == null
    error_message = "Maximum throughput units should be null when auto-inflate is disabled"
  }
}

run "diagnostics_enabled_plan" {
  command = plan

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
      Owner          = "DevEx"
      Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_event_hub/tests"
      ManagementTeam = "Developer Experience"
      Test           = "true"
      TestName       = "Create EventHUB with Diagnostic Settings"
    }

    resource_group_name = "dx-d-evt-rg"
    use_case            = "default"

    subnet_pep_id                        = run.setup_tests.pep_id
    private_dns_zone_resource_group_name = "dx-d-itn-network-rg-01"

    eventhubs = [{
      name                   = "event-hub-test"
      partitions             = 1
      message_retention_days = 1
      consumers = [
        "bpd-payment-instrument"
      ]
      keys = [
        {
          name   = "test-key"
          listen = true
          send   = true
          manage = false
        }
      ]
    }]

    diagnostic_settings = {
      enabled                    = true
      log_analytics_workspace_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.OperationalInsights/workspaces/law-test"
      storage_account_id         = null
    }
  }

  # Checks that diagnostic setting resource will be created
  assert {
    condition     = length(azurerm_monitor_diagnostic_setting.event_hub_namespace) == 1
    error_message = "Diagnostic setting should be created when enabled"
  }
}
