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

run "apim_is_correct_plan" {
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
      Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_api_management/tests"
      ManagementTeam = "Developer Experience"
      Test           = "true"
      TestName       = "Create APIM for test"
    }

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "l"

    publisher_email = "example@pagopa.it"
    publisher_name  = "Example Publisher"

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    application_insights = {
      enabled           = true
      connection_string = "aConnectionString"
    }

    subnet_id                     = run.setup_tests.subnet_id
    virtual_network_type_internal = true
  }

  # Checks some assertions
  assert {
    condition     = azurerm_api_management.this.sku_name == "Premium_1"
    error_message = "The APIM SKU is incorrect, have to be Premium_1"
  }

  assert {
    condition     = length(azurerm_api_management_logger.this) > 0
    error_message = "The APIM logger does not exist"
  }
}

run "apim_ai_enabled_without_connection_string" {
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
      Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_api_management/tests"
      ManagementTeam = "Developer Experience"
      Test           = "true"
      TestName       = "Create APIM for test"
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

    application_insights = {
      enabled           = true
      connection_string = null
    }
  }

  expect_failures = [
    # Specify the exact variable that should fail validation
    var.application_insights.connection_string,
  ]
}
