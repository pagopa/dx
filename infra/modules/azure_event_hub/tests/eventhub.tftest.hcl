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

run "eventhub_is_correct_plan" {
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
      CostCenter  = "TS700 - ENGINEERING"
      CreatedBy   = "Terraform"
      Environment = "Dev"
      Owner       = "DevEx"
      Source      = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_event_hub/tests"
      Test        = "true"
      TestName    = "Create EventHUB for test"
    }

    resource_group_name = "dx-d-evt-rg"
    tier                = "s"

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
}
