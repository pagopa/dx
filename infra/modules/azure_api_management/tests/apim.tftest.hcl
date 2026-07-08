provider "azurerm" {
  features {}
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

run "cost_optimized_defaults" {
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

    tags                       = run.setup_tests.tags
    resource_group_name        = run.setup_tests.resource_group_name
    use_case                   = "cost_optimized"
    publisher_email            = "example@pagopa.it"
    publisher_name             = "Example Publisher"
    log_analytics_workspace_id = run.setup_tests.log_analytics_workspace_id

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }
  }

  assert {
    condition     = azurerm_api_management.this.sku_name == "StandardV2_1"
    error_message = "The APIM SKU must be StandardV2_1."
  }

  assert {
    condition     = azurerm_api_management.this.virtual_network_type == "External"
    error_message = "The cost_optimized use case must use External virtual networking."
  }

  assert {
    condition     = azurerm_api_management.this.public_network_access_enabled == false
    error_message = "The cost_optimized use case must disable public network access."
  }

  assert {
    condition     = azurerm_api_management.this.public_ip_address_id == null
    error_message = "The cost_optimized use case must not attach a public IP."
  }

  assert {
    condition     = dx_available_subnet_cidr.apim.prefix_length == 24
    error_message = "The APIM subnet must be created from an available /24 CIDR."
  }

  assert {
    condition     = length(azurerm_private_endpoint.apim_pep) == 1
    error_message = "The cost_optimized use case must create a private endpoint."
  }

  assert {
    condition     = length(azurerm_monitor_diagnostic_setting.apim) == 1
    error_message = "The cost_optimized use case must enable diagnostic logs and metrics."
  }

  assert {
    condition     = length(azurerm_management_lock.this) == 1
    error_message = "The cost_optimized use case must enable the management lock."
  }
}

run "high_load_generated_public_ip" {
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

    tags                       = run.setup_tests.tags
    resource_group_name        = run.setup_tests.resource_group_name
    use_case                   = "high_load"
    publisher_email            = "example@pagopa.it"
    publisher_name             = "Example Publisher"
    log_analytics_workspace_id = run.setup_tests.log_analytics_workspace_id

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }
  }

  assert {
    condition     = azurerm_api_management.this.sku_name == "Premium_2"
    error_message = "The high_load use case must use Premium_2."
  }

  assert {
    condition     = azurerm_api_management.this.virtual_network_type == "Internal"
    error_message = "The high_load use case must use Internal virtual networking."
  }

  assert {
    condition     = azurerm_api_management.this.public_ip_address_id == azurerm_public_ip.apim[0].id
    error_message = "The high_load use case must attach the module-managed public IP."
  }

  assert {
    condition     = azurerm_public_ip.apim[0].allocation_method == "Static" && azurerm_public_ip.apim[0].sku == "Standard"
    error_message = "The module-managed public IP must be static and Standard SKU."
  }

  assert {
    condition     = azurerm_public_ip.apim[0].zones == ["1", "2"]
    error_message = "The high_load public IP zones must match the use case."
  }

  assert {
    condition     = length(azurerm_monitor_autoscale_setting.this) == 1
    error_message = "The high_load use case must enable autoscale."
  }
}

run "development_disables_production_features" {
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
    use_case            = "development"
    publisher_email     = "example@pagopa.it"
    publisher_name      = "Example Publisher"

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }
  }

  assert {
    condition     = length(azurerm_monitor_diagnostic_setting.apim) == 0
    error_message = "The development use case must not enable diagnostic settings by default."
  }

  assert {
    condition     = length(azurerm_management_lock.this) == 0
    error_message = "The development use case must not enable the management lock."
  }

  assert {
    condition     = length(azurerm_public_ip.apim) == 0
    error_message = "The development use case must not create a public IP."
  }
}

run "hostname_configuration_simplifies_certificates" {
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

    tags                       = run.setup_tests.tags
    resource_group_name        = run.setup_tests.resource_group_name
    use_case                   = "cost_optimized"
    publisher_email            = "example@pagopa.it"
    publisher_name             = "Example Publisher"
    log_analytics_workspace_id = run.setup_tests.log_analytics_workspace_id

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    hostname_configuration = {
      proxy = {
        use_resource_name_as_default = true
      }
      management = [
        {
          host_name                = "management.example.com"
          key_vault_certificate_id = "https://dx-d-itn-common-kv-01.vault.azure.net/secrets/cert1/1234567890"
        }
      ]
    }
  }

  assert {
    condition     = azurerm_api_management.this.hostname_configuration[0].proxy[0].host_name == "${azurerm_api_management.this.name}.azure-api.net"
    error_message = "The proxy hostname must be managed from the APIM resource name."
  }

  assert {
    condition     = azurerm_api_management.this.hostname_configuration[0].proxy[0].default_ssl_binding == true
    error_message = "use_resource_name_as_default must drive proxy default SSL binding."
  }

  assert {
    condition     = azurerm_api_management.this.hostname_configuration[0].management[0].key_vault_certificate_id == "https://dx-d-itn-common-kv-01.vault.azure.net/secrets/cert1"
    error_message = "Versioned Key Vault certificate IDs must be normalized internally."
  }
}

run "log_analytics_required_for_production_use_cases" {
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
  }

  expect_failures = [
    var.log_analytics_workspace_id,
  ]
}

run "autoscale_validation_zone_redundancy" {
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

    tags                       = run.setup_tests.tags
    resource_group_name        = run.setup_tests.resource_group_name
    use_case                   = "high_load"
    publisher_email            = "example@pagopa.it"
    publisher_name             = "Example Publisher"
    log_analytics_workspace_id = run.setup_tests.log_analytics_workspace_id

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    autoscale = {
      minimum_instances             = 3
      default_instances             = 4
      maximum_instances             = 8
      scale_out_capacity_percentage = 60
    }
  }

  expect_failures = [
    var.autoscale,
  ]
}

run "application_insights_validation" {
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
    use_case            = "development"
    publisher_email     = "example@pagopa.it"
    publisher_name      = "Example Publisher"

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    application_insights = {
      sampling_percentage = 101
      verbosity           = "error"
    }
  }

  expect_failures = [
    var.application_insights,
  ]
}
