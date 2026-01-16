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

    subnet_id     = run.setup_tests.subnet_id
    subnet_pep_id = run.setup_tests.pep_id
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
    condition     = azurerm_api_management.this.public_network_access_enabled == true
    error_message = "The APIM public Network Access should be enabled"
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

    # Provide valid autoscale values (multiples of the number of zones, which is 2 in this test, for high_load zone redundancy)
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

# Test custom_domains: single proxy endpoint
run "custom_domains_single_proxy" {
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

    custom_domains = {
      proxy = [
        {
          host_name                = "api.example.com"
          key_vault_certificate_id = "https://dx-d-itn-common-kv-01.vault.azure.net/secrets/cert1"
          default_ssl_binding      = true
        }
      ]
    }
  }

  assert {
    condition     = length(azurerm_api_management.this.hostname_configuration) > 0
    error_message = "hostname_configuration should be present"
  }

  assert {
    condition     = length(azurerm_api_management.this.hostname_configuration[0].proxy) == 1
    error_message = "Should have exactly 1 proxy configuration"
  }

  assert {
    condition     = azurerm_api_management.this.hostname_configuration[0].proxy[0].host_name == "api.example.com"
    error_message = "Proxy hostname should match"
  }

  assert {
    condition     = azurerm_api_management.this.hostname_configuration[0].proxy[0].default_ssl_binding == true
    error_message = "Default SSL binding should be true"
  }
}

# Test custom_domains: multiple proxy endpoints
run "custom_domains_multiple_proxy" {
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

    custom_domains = {
      proxy = [
        {
          host_name                = "api.example.com"
          key_vault_certificate_id = "https://dx-d-itn-common-kv-01.vault.azure.net/secrets/cert1"
          default_ssl_binding      = true
        },
        {
          host_name                = "api-v2.example.com"
          key_vault_certificate_id = "https://dx-d-itn-common-kv-01.vault.azure.net/secrets/cert2"
          default_ssl_binding      = false
        }
      ]
    }
  }

  assert {
    condition     = length(azurerm_api_management.this.hostname_configuration[0].proxy) == 2
    error_message = "Should have exactly 2 proxy configurations"
  }
}

# Test custom_domains: all endpoint types
run "custom_domains_all_types" {
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

    custom_domains = {
      proxy = [
        {
          host_name                = "api.example.com"
          key_vault_certificate_id = "https://dx-d-itn-common-kv-01.vault.azure.net/secrets/cert1"
          default_ssl_binding      = true
        }
      ]
      management = [
        {
          host_name                = "management.example.com"
          key_vault_certificate_id = "https://dx-d-itn-common-kv-01.vault.azure.net/secrets/cert2"
        }
      ]
      portal = [
        {
          host_name                = "portal.example.com"
          key_vault_certificate_id = "https://dx-d-itn-common-kv-01.vault.azure.net/secrets/cert3"
        }
      ]
      developer_portal = [
        {
          host_name                = "developer.example.com"
          key_vault_certificate_id = "https://dx-d-itn-common-kv-01.vault.azure.net/secrets/cert4"
        }
      ]
      scm = [
        {
          host_name                = "scm.example.com"
          key_vault_certificate_id = "https://dx-d-itn-common-kv-01.vault.azure.net/secrets/cert5"
        }
      ]
    }
  }

  assert {
    condition     = length(azurerm_api_management.this.hostname_configuration[0].proxy) == 1
    error_message = "Should have 1 proxy configuration"
  }

  assert {
    condition     = length(azurerm_api_management.this.hostname_configuration[0].management) == 1
    error_message = "Should have 1 management configuration"
  }

  assert {
    condition     = length(azurerm_api_management.this.hostname_configuration[0].portal) == 1
    error_message = "Should have 1 portal configuration"
  }

  assert {
    condition     = length(azurerm_api_management.this.hostname_configuration[0].developer_portal) == 1
    error_message = "Should have 1 developer_portal configuration"
  }

  assert {
    condition     = length(azurerm_api_management.this.hostname_configuration[0].scm) == 1
    error_message = "Should have 1 scm configuration"
  }

  assert {
    condition     = azurerm_api_management.this.hostname_configuration[0].management[0].host_name == "management.example.com"
    error_message = "Management hostname should match"
  }
}

