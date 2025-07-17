# Validation tests for input validation and error conditions
# Tests that invalid configurations are properly caught

provider "azurerm" {
  features {}
}

# Test invalid tier values
run "validation_invalid_tier" {
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
      Test = "validation-test-invalid-tier"
    }

    resource_group_name = "test-rg"
    tier                = "invalid"

    virtual_network = {
      name                = "test-vnet"
      resource_group_name = "test-rg"
    }

    subnet_pep_id                        = "test-subnet-id"
    subnet_cidr                          = "10.20.90.0/24"
    private_dns_zone_resource_group_name = "dns-rg"

    app_settings      = {}
    slot_app_settings = {}
    health_check_path = "/health"
  }

  expect_failures = [
    var.tier
  ]
}

# Test invalid stack values
run "validation_invalid_stack" {
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
      Test = "validation-test-invalid-stack"
    }

    resource_group_name = "test-rg"
    tier                = "m"
    stack               = "python"

    virtual_network = {
      name                = "test-vnet"
      resource_group_name = "test-rg"
    }

    subnet_pep_id                        = "test-subnet-id"
    subnet_cidr                          = "10.20.91.0/24"
    private_dns_zone_resource_group_name = "dns-rg"

    app_settings      = {}
    slot_app_settings = {}
    health_check_path = "/health"
  }

  expect_failures = [
    var.stack
  ]
}

# Test both subnet_id and subnet_cidr provided (should fail)
run "validation_both_subnet_configurations" {
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
      Test = "validation-test-both-subnet-configs"
    }

    resource_group_name = "test-rg"
    tier                = "m"

    virtual_network = {
      name                = "test-vnet"
      resource_group_name = "test-rg"
    }

    subnet_pep_id                        = "test-subnet-id"
    subnet_id                            = "existing-subnet-id"
    subnet_cidr                          = "10.20.92.0/24"
    private_dns_zone_resource_group_name = "dns-rg"

    app_settings      = {}
    slot_app_settings = {}
    health_check_path = "/health"
  }

  expect_failures = [
    var.subnet_cidr
  ]
}

# Test neither subnet_id nor subnet_cidr provided (should fail)
run "validation_no_subnet_configuration" {
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
      Test = "validation-test-no-subnet-config"
    }

    resource_group_name = "test-rg"
    tier                = "m"

    virtual_network = {
      name                = "test-vnet"
      resource_group_name = "test-rg"
    }

    subnet_pep_id                        = "test-subnet-id"
    private_dns_zone_resource_group_name = "dns-rg"

    app_settings      = {}
    slot_app_settings = {}
    health_check_path = "/health"
  }

  expect_failures = [
    var.subnet_cidr
  ]
}

# Test minimum required variables
run "validation_minimum_required_variables" {
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
      Test = "validation-test-minimum-required"
    }

    resource_group_name = "test-rg"

    virtual_network = {
      name                = "test-vnet"
      resource_group_name = "test-rg"
    }

    subnet_pep_id     = "test-subnet-id"
    subnet_cidr       = "10.20.93.0/24"
    
    app_settings      = {}
    health_check_path = "/health"
  }

  # This should succeed with minimum required variables
  assert {
    condition     = azurerm_linux_web_app.this.name != null
    error_message = "App Service should be created with minimum required variables"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].health_check_path == "/health"
    error_message = "Health check path should be set"
  }

  assert {
    condition     = azurerm_service_plan.this[0].sku_name == "P1v3"
    error_message = "Default tier should be 'l' which maps to P1v3"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].application_stack[0].node_version == "20-lts"
    error_message = "Default stack should be node with version 20-lts"
  }
}

# Test Application Insights without connection string
run "validation_app_insights_without_connection" {
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
      Test = "validation-test-no-app-insights"
    }

    resource_group_name = "test-rg"
    tier                = "m"

    virtual_network = {
      name                = "test-vnet"
      resource_group_name = "test-rg"
    }

    subnet_pep_id                        = "test-subnet-id"
    subnet_cidr                          = "10.20.94.0/24"
    private_dns_zone_resource_group_name = "dns-rg"

    app_settings      = {}
    slot_app_settings = {}
    health_check_path = "/health"
  }

  # Application Insights settings should not be present without connection string
  assert {
    condition     = !contains(keys(azurerm_linux_web_app.this.app_settings), "APPLICATIONINSIGHTS_CONNECTION_STRING")
    error_message = "Application Insights connection string should not be set when not provided"
  }

  assert {
    condition     = !contains(keys(azurerm_linux_web_app.this.app_settings), "APPINSIGHTS_SAMPLING_PERCENTAGE")
    error_message = "Application Insights sampling percentage should not be set when not provided"
  }
}

# Test valid TLS versions
run "validation_valid_tls_versions" {
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
      Test = "validation-test-valid-tls"
    }

    resource_group_name = "test-rg"
    tier                = "m"
    tls_version         = 1.2

    virtual_network = {
      name                = "test-vnet"
      resource_group_name = "test-rg"
    }

    subnet_pep_id                        = "test-subnet-id"
    subnet_cidr                          = "10.20.95.0/24"
    private_dns_zone_resource_group_name = "dns-rg"

    app_settings      = {}
    slot_app_settings = {}
    health_check_path = "/health"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].minimum_tls_version == "1.2"
    error_message = "TLS version should be correctly set to 1.2"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].site_config[0].minimum_tls_version == "1.2"
    error_message = "Slot TLS version should match main app"
  }
}

# Test edge case: empty app settings
run "validation_empty_app_settings" {
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
      Test = "validation-test-empty-app-settings"
    }

    resource_group_name = "test-rg"
    tier                = "m"

    virtual_network = {
      name                = "test-vnet"
      resource_group_name = "test-rg"
    }

    subnet_pep_id                        = "test-subnet-id"
    subnet_cidr                          = "10.20.96.0/24"
    private_dns_zone_resource_group_name = "dns-rg"

    app_settings      = {}
    slot_app_settings = {}
    health_check_path = "/health"
  }

  # Should still have default app settings
  assert {
    condition     = azurerm_linux_web_app.this.app_settings["WEBSITE_RUN_FROM_PACKAGE"] == "1"
    error_message = "Default app settings should be present even with empty custom settings"
  }

  assert {
    condition     = azurerm_linux_web_app.this.app_settings["WEBSITE_DNS_SERVER"] == "168.63.129.16"
    error_message = "Default DNS server setting should be present"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].app_settings["WEBSITE_RUN_FROM_PACKAGE"] == "1"
    error_message = "Default app settings should be present in slot"
  }
}

# Test edge case: large sticky settings list
run "validation_large_sticky_settings" {
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
      Test = "validation-test-large-sticky-settings"
    }

    resource_group_name = "test-rg"
    tier                = "m"

    virtual_network = {
      name                = "test-vnet"
      resource_group_name = "test-rg"
    }

    subnet_pep_id                        = "test-subnet-id"
    subnet_cidr                          = "10.20.97.0/24"
    private_dns_zone_resource_group_name = "dns-rg"

    app_settings = {
      "SETTING_1"  = "value1"
      "SETTING_2"  = "value2"
      "SETTING_3"  = "value3"
      "SETTING_4"  = "value4"
      "SETTING_5"  = "value5"
      "SETTING_6"  = "value6"
      "SETTING_7"  = "value7"
      "SETTING_8"  = "value8"
      "SETTING_9"  = "value9"
      "SETTING_10" = "value10"
    }

    slot_app_settings = {}

    sticky_app_setting_names = [
      "SETTING_1",
      "SETTING_2",
      "SETTING_3",
      "SETTING_4",
      "SETTING_5",
      "SETTING_6",
      "SETTING_7",
      "SETTING_8",
      "SETTING_9",
      "SETTING_10"
    ]

    health_check_path = "/health"
  }

  assert {
    condition     = length(azurerm_linux_web_app.this.sticky_settings[0].app_setting_names) == 10
    error_message = "All 10 sticky settings should be configured"
  }

  assert {
    condition     = contains(azurerm_linux_web_app.this.sticky_settings[0].app_setting_names, "SETTING_1")
    error_message = "SETTING_1 should be in sticky settings"
  }

  assert {
    condition     = contains(azurerm_linux_web_app.this.sticky_settings[0].app_setting_names, "SETTING_10")
    error_message = "SETTING_10 should be in sticky settings"
  }
}