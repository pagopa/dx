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

    tags = run.setup_tests.tags

    resource_group_name = run.setup_tests.resource_group_name
    use_case            = "csot_optimized"

    publisher_email = "example@pagopa.it"
    publisher_name  = "Example Publisher"

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    application_insights = {
      enabled             = true
      connection_string   = "aConnectionString"
      sampling_percentage = 50
      verbosity           = "error"
    }

    subnet_id                     = run.setup_tests.subnet_id
    enable_public_network_access  = true
    virtual_network_type_internal = true
  }

  # Checks some assertions
  assert {
    condition     = azurerm_api_management.this.sku_name == "StandardV2_1"
    error_message = "The APIM SKU is incorrect, have to be StandardV2_1"
  }

  assert {
    condition     = length(azurerm_api_management_logger.this) > 0
    error_message = "The APIM logger does not exist"
  }

  assert {
    condition     = length(azurerm_api_management.this.zones) == 0
    error_message = "The APIM zones are incorrect, they should be []"
  }

  assert {
    condition     = length(azurerm_monitor_diagnostic_setting.apim) == 0
    error_message = "No diagnostic setting should be created when monitoring is disabled"
  }

  assert {
    condition     = azurerm_api_management.this.public_ip_address_id == null
    error_message = "The APIM public IP address is incorrect, it should be null"
  }

  assert {
    condition     = azurerm_api_management.this.public_network_access_enabled == false
    error_message = "The APIM public Network Access should be disabled"
  }
}

run "plan_with_invalid_parameters" {
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

    tags = run.setup_tests.tags

    resource_group_name = run.setup_tests.resource_group_name
    use_case            = "high_load"

    publisher_email = "example@pagopa.it"
    publisher_name  = "Example Publisher"

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    subnet_id                     = run.setup_tests.subnet_id
    virtual_network_type_internal = true

    application_insights = {
      enabled             = true
      connection_string   = null
      sampling_percentage = 101
      verbosity           = "error"
    }
  }

  expect_failures = [
    # Specify the exact variable that should fail validation
    var.application_insights,
  ]
}

run "apim_test_zones_public_ip" {
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

    tags = run.setup_tests.tags

    resource_group_name = run.setup_tests.resource_group_name
    use_case            = "high_load"

    publisher_email = "example@pagopa.it"
    publisher_name  = "Example Publisher"

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }
    public_ip_address_id = run.setup_tests.pip_id

    application_insights = {
      enabled             = true
      connection_string   = "aConnectionString"
      sampling_percentage = 50
      verbosity           = "error"
    }

    subnet_id                     = run.setup_tests.subnet_id
    virtual_network_type_internal = true
  }

  # Checks some assertions
  assert {
    condition     = azurerm_api_management.this.sku_name == "Premium_2"
    error_message = "The APIM SKU is incorrect, have to be Premium_2"
  }

  assert {
    condition     = length(azurerm_api_management.this.zones) == 2 && contains(azurerm_api_management.this.zones, "1") && contains(azurerm_api_management.this.zones, "2")
    error_message = "The APIM zones are incorrect, they should be ['1', '2']"
  }

  assert {
    condition     = azurerm_api_management.this.public_ip_address_id == run.setup_tests.pip_id
    error_message = "The APIM public IP address is incorrect, it should match the setup public IP"
  }
}
