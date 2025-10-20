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
    use_case            = "cost_optimized"

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
    subnet_pep_id                 = run.setup_tests.pep_id
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
    condition     = azurerm_api_management.this.zones == null
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

  assert {
    condition     = azurerm_api_management.this.virtual_network_type == "External"
    error_message = "The APIM virtual network type is incorrect, it should be External"
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

    # Provide valid autoscale values (multiples of 2 for high_load zone redundancy)
    autoscale = {
      enabled                       = true
      minimum_instances             = 2
      default_instances             = 4
      maximum_instances             = 8
      scale_out_capacity_percentage = 60
      scale_out_time_window         = "PT10M"
      scale_out_value               = "2"
      scale_out_cooldown            = "PT45M"
      scale_in_capacity_percentage  = 30
      scale_in_time_window          = "PT30M"
      scale_in_value                = "2"
      scale_in_cooldown             = "PT30M"
    }

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

    # Provide valid autoscale values (multiples of 2 for high_load zone redundancy)
    autoscale = {
      enabled                       = true
      minimum_instances             = 2
      default_instances             = 4
      maximum_instances             = 8
      scale_out_capacity_percentage = 60
      scale_out_time_window         = "PT10M"
      scale_out_value               = "2"
      scale_out_cooldown            = "PT45M"
      scale_in_capacity_percentage  = 30
      scale_in_time_window          = "PT30M"
      scale_in_value                = "2"
      scale_in_cooldown             = "PT30M"
    }
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

  assert {
    condition     = azurerm_api_management.this.virtual_network_type == "Internal"
    error_message = "The APIM virtual network type is incorrect, it should be Internal"
  }
}

# Test autoscale validation: default_instances must be between minimum and maximum
run "autoscale_validation_default_out_of_range" {
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

    tags                = run.setup_tests.tags
    resource_group_name = run.setup_tests.resource_group_name
    use_case            = "cost_optimized"
    publisher_email     = "example@pagopa.it"
    publisher_name      = "Example Publisher"

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    subnet_id     = run.setup_tests.subnet_id
    subnet_pep_id = run.setup_tests.pep_id

    autoscale = {
      enabled                       = true
      minimum_instances             = 2
      default_instances             = 10
      maximum_instances             = 5
      scale_out_capacity_percentage = 60
      scale_out_time_window         = "PT10M"
      scale_out_value               = "2"
      scale_out_cooldown            = "PT45M"
      scale_in_capacity_percentage  = 30
      scale_in_time_window          = "PT30M"
      scale_in_value                = "2"
      scale_in_cooldown             = "PT30M"
    }
  }

  expect_failures = [
    var.autoscale,
  ]
}

# Test autoscale validation: minimum_instances must be positive
run "autoscale_validation_minimum_zero" {
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

    tags                = run.setup_tests.tags
    resource_group_name = run.setup_tests.resource_group_name
    use_case            = "cost_optimized"
    publisher_email     = "example@pagopa.it"
    publisher_name      = "Example Publisher"

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    subnet_id     = run.setup_tests.subnet_id
    subnet_pep_id = run.setup_tests.pep_id

    autoscale = {
      enabled                       = true
      minimum_instances             = 0
      default_instances             = 2
      maximum_instances             = 5
      scale_out_capacity_percentage = 60
      scale_out_time_window         = "PT10M"
      scale_out_value               = "2"
      scale_out_cooldown            = "PT45M"
      scale_in_capacity_percentage  = 30
      scale_in_time_window          = "PT30M"
      scale_in_value                = "2"
      scale_in_cooldown             = "PT30M"
    }
  }

  expect_failures = [
    var.autoscale,
  ]
}

# Test autoscale validation: scale_out_value must be positive
run "autoscale_validation_scale_out_zero" {
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

    tags                = run.setup_tests.tags
    resource_group_name = run.setup_tests.resource_group_name
    use_case            = "cost_optimized"
    publisher_email     = "example@pagopa.it"
    publisher_name      = "Example Publisher"

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    subnet_id     = run.setup_tests.subnet_id
    subnet_pep_id = run.setup_tests.pep_id

    autoscale = {
      enabled                       = true
      minimum_instances             = 2
      default_instances             = 2
      maximum_instances             = 5
      scale_out_capacity_percentage = 60
      scale_out_time_window         = "PT10M"
      scale_out_value               = "0"
      scale_out_cooldown            = "PT45M"
      scale_in_capacity_percentage  = 30
      scale_in_time_window          = "PT30M"
      scale_in_value                = "2"
      scale_in_cooldown             = "PT30M"
    }
  }

  expect_failures = [
    var.autoscale,
  ]
}

# Test autoscale validation: scale_in_value must be positive
run "autoscale_validation_scale_in_zero" {
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

    tags                = run.setup_tests.tags
    resource_group_name = run.setup_tests.resource_group_name
    use_case            = "cost_optimized"
    publisher_email     = "example@pagopa.it"
    publisher_name      = "Example Publisher"

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    subnet_id     = run.setup_tests.subnet_id
    subnet_pep_id = run.setup_tests.pep_id

    autoscale = {
      enabled                       = true
      minimum_instances             = 2
      default_instances             = 2
      maximum_instances             = 5
      scale_out_capacity_percentage = 60
      scale_out_time_window         = "PT10M"
      scale_out_value               = "2"
      scale_out_cooldown            = "PT45M"
      scale_in_capacity_percentage  = 30
      scale_in_time_window          = "PT30M"
      scale_in_value                = "0"
      scale_in_cooldown             = "PT30M"
    }
  }

  expect_failures = [
    var.autoscale,
  ]
}

# Test autoscale validation: zone redundancy - odd minimum_instances with high_load should fail
run "autoscale_validation_zone_redundancy_odd_minimum" {
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

    tags                          = run.setup_tests.tags
    resource_group_name           = run.setup_tests.resource_group_name
    use_case                      = "high_load"
    publisher_email               = "example@pagopa.it"
    publisher_name                = "Example Publisher"
    public_ip_address_id          = run.setup_tests.pip_id
    virtual_network_type_internal = true

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    subnet_id = run.setup_tests.subnet_id

    autoscale = {
      enabled                       = true
      minimum_instances             = 3
      default_instances             = 4
      maximum_instances             = 6
      scale_out_capacity_percentage = 60
      scale_out_time_window         = "PT10M"
      scale_out_value               = "2"
      scale_out_cooldown            = "PT45M"
      scale_in_capacity_percentage  = 30
      scale_in_time_window          = "PT30M"
      scale_in_value                = "2"
      scale_in_cooldown             = "PT30M"
    }
  }

  expect_failures = [
    var.autoscale,
  ]
}

# Test autoscale validation: zone redundancy - odd maximum_instances with high_load should fail
run "autoscale_validation_zone_redundancy_odd_maximum" {
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

    tags                          = run.setup_tests.tags
    resource_group_name           = run.setup_tests.resource_group_name
    use_case                      = "high_load"
    publisher_email               = "example@pagopa.it"
    publisher_name                = "Example Publisher"
    public_ip_address_id          = run.setup_tests.pip_id
    virtual_network_type_internal = true

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    subnet_id = run.setup_tests.subnet_id

    autoscale = {
      enabled                       = true
      minimum_instances             = 2
      default_instances             = 4
      maximum_instances             = 7
      scale_out_capacity_percentage = 60
      scale_out_time_window         = "PT10M"
      scale_out_value               = "2"
      scale_out_cooldown            = "PT45M"
      scale_in_capacity_percentage  = 30
      scale_in_time_window          = "PT30M"
      scale_in_value                = "2"
      scale_in_cooldown             = "PT30M"
    }
  }

  expect_failures = [
    var.autoscale,
  ]
}

# Test autoscale validation: zone redundancy - odd default_instances with high_load should fail
run "autoscale_validation_zone_redundancy_odd_default" {
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

    tags                          = run.setup_tests.tags
    resource_group_name           = run.setup_tests.resource_group_name
    use_case                      = "high_load"
    publisher_email               = "example@pagopa.it"
    publisher_name                = "Example Publisher"
    public_ip_address_id          = run.setup_tests.pip_id
    virtual_network_type_internal = true

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    subnet_id = run.setup_tests.subnet_id

    autoscale = {
      enabled                       = true
      minimum_instances             = 2
      default_instances             = 3
      maximum_instances             = 6
      scale_out_capacity_percentage = 60
      scale_out_time_window         = "PT10M"
      scale_out_value               = "2"
      scale_out_cooldown            = "PT45M"
      scale_in_capacity_percentage  = 30
      scale_in_time_window          = "PT30M"
      scale_in_value                = "2"
      scale_in_cooldown             = "PT30M"
    }
  }

  expect_failures = [
    var.autoscale,
  ]
}

# Test autoscale validation: zone redundancy - odd scale_out_value with high_load should fail
run "autoscale_validation_zone_redundancy_odd_scale_out" {
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

    tags                          = run.setup_tests.tags
    resource_group_name           = run.setup_tests.resource_group_name
    use_case                      = "high_load"
    publisher_email               = "example@pagopa.it"
    publisher_name                = "Example Publisher"
    public_ip_address_id          = run.setup_tests.pip_id
    virtual_network_type_internal = true

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    subnet_id = run.setup_tests.subnet_id

    autoscale = {
      enabled                       = true
      minimum_instances             = 2
      default_instances             = 4
      maximum_instances             = 6
      scale_out_capacity_percentage = 60
      scale_out_time_window         = "PT10M"
      scale_out_value               = "3"
      scale_out_cooldown            = "PT45M"
      scale_in_capacity_percentage  = 30
      scale_in_time_window          = "PT30M"
      scale_in_value                = "2"
      scale_in_cooldown             = "PT30M"
    }
  }

  expect_failures = [
    var.autoscale,
  ]
}

# Test autoscale validation: zone redundancy - odd scale_in_value with high_load should fail
run "autoscale_validation_zone_redundancy_odd_scale_in" {
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

    tags                          = run.setup_tests.tags
    resource_group_name           = run.setup_tests.resource_group_name
    use_case                      = "high_load"
    publisher_email               = "example@pagopa.it"
    publisher_name                = "Example Publisher"
    public_ip_address_id          = run.setup_tests.pip_id
    virtual_network_type_internal = true

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    subnet_id = run.setup_tests.subnet_id

    autoscale = {
      enabled                       = true
      minimum_instances             = 2
      default_instances             = 4
      maximum_instances             = 6
      scale_out_capacity_percentage = 60
      scale_out_time_window         = "PT10M"
      scale_out_value               = "2"
      scale_out_cooldown            = "PT45M"
      scale_in_capacity_percentage  = 30
      scale_in_time_window          = "PT30M"
      scale_in_value                = "3"
      scale_in_cooldown             = "PT30M"
    }
  }

  expect_failures = [
    var.autoscale,
  ]
}

# Test autoscale validation: zone redundancy - all even values with high_load should pass
run "autoscale_validation_zone_redundancy_valid" {
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

    tags                          = run.setup_tests.tags
    resource_group_name           = run.setup_tests.resource_group_name
    use_case                      = "high_load"
    publisher_email               = "example@pagopa.it"
    publisher_name                = "Example Publisher"
    public_ip_address_id          = run.setup_tests.pip_id
    virtual_network_type_internal = true

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    subnet_id = run.setup_tests.subnet_id

    autoscale = {
      enabled                       = true
      minimum_instances             = 2
      default_instances             = 4
      maximum_instances             = 8
      scale_out_capacity_percentage = 60
      scale_out_time_window         = "PT10M"
      scale_out_value               = "2"
      scale_out_cooldown            = "PT45M"
      scale_in_capacity_percentage  = 30
      scale_in_time_window          = "PT30M"
      scale_in_value                = "2"
      scale_in_cooldown             = "PT30M"
    }
  }

  assert {
    condition     = azurerm_api_management.this.sku_name == "Premium_2"
    error_message = "The APIM SKU is incorrect, should be Premium_2"
  }

  assert {
    condition     = length(azurerm_api_management.this.zones) == 2
    error_message = "The APIM zones count is incorrect, should be 2"
  }
}

