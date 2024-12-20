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
      instance_number = 1
    }
  }
}

run "apim_is_correct_plan" {
  command = plan

  variables {
    environment = {
      prefix          = "dx"
      env_short       = "d"
      location        = "italynorth"
      domain          = "modules"
      app_name        = "test"
      instance_number = 1
    }

    tags = {
      CostCenter  = "TS700 - ENGINEERING"
      CreatedBy   = "Terraform"
      Environment = "Dev"
      Owner       = "DevEx"
      Source      = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_api_management/tests"
      Test        = "true"
      TestName    = "Create APIM for test"
    }

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "l"

    publisher_email = "example@pagopa.it"
    publisher_name  = "Example Publisher"

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    subnet_id                     = run.setup_tests.subnet_id
    virtual_network_type_internal = true

  }

  # Checks some assertions
  assert {
    condition     = azurerm_api_management.this.sku_name == "Premium_1"
    error_message = "The APIM SKU is incorrect, have to be Premium_1"
  }
}
