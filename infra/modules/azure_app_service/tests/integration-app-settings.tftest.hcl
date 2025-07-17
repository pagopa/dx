# Integration tests for app settings and Application Insights integration
# Tests how different components work together

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

# Test app settings integration
run "integration_app_settings" {
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
      Test = "integration-test-app-settings"
    }

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "m"

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    subnet_pep_id                        = run.setup_tests.pep_id
    subnet_cidr                          = "10.20.80.0/24"
    private_dns_zone_resource_group_name = "dx-d-itn-network-rg-01"

    app_settings = {
      "CUSTOM_SETTING_1" = "value1"
      "CUSTOM_SETTING_2" = "value2"
      "NODE_ENV"         = "production"
    }

    slot_app_settings = {
      "SLOT_SETTING_1" = "slot_value1"
      "NODE_ENV"       = "staging"
    }

    health_check_path = "/health"
  }

  # Test default app settings are present
  assert {
    condition     = azurerm_linux_web_app.this.app_settings["WEBSITE_ADD_SITENAME_BINDINGS_IN_APPHOST_CONFIG"] == "1"
    error_message = "Default WEBSITE_ADD_SITENAME_BINDINGS_IN_APPHOST_CONFIG should be set"
  }

  assert {
    condition     = azurerm_linux_web_app.this.app_settings["WEBSITE_RUN_FROM_PACKAGE"] == "1"
    error_message = "Default WEBSITE_RUN_FROM_PACKAGE should be set"
  }

  assert {
    condition     = azurerm_linux_web_app.this.app_settings["WEBSITE_DNS_SERVER"] == "168.63.129.16"
    error_message = "Default WEBSITE_DNS_SERVER should be set"
  }

  assert {
    condition     = azurerm_linux_web_app.this.app_settings["WEBSITE_SWAP_WARMUP_PING_PATH"] == "/health"
    error_message = "WEBSITE_SWAP_WARMUP_PING_PATH should match health_check_path"
  }

  assert {
    condition     = azurerm_linux_web_app.this.app_settings["WEBSITE_SWAP_WARMUP_PING_STATUSES"] == "200,204"
    error_message = "WEBSITE_SWAP_WARMUP_PING_STATUSES should be set"
  }

  assert {
    condition     = azurerm_linux_web_app.this.app_settings["WEBSITE_WARMUP_PATH"] == "/health"
    error_message = "WEBSITE_WARMUP_PATH should match health_check_path"
  }

  # Test custom app settings are present
  assert {
    condition     = azurerm_linux_web_app.this.app_settings["CUSTOM_SETTING_1"] == "value1"
    error_message = "Custom app setting CUSTOM_SETTING_1 should be set"
  }

  assert {
    condition     = azurerm_linux_web_app.this.app_settings["CUSTOM_SETTING_2"] == "value2"
    error_message = "Custom app setting CUSTOM_SETTING_2 should be set"
  }

  assert {
    condition     = azurerm_linux_web_app.this.app_settings["NODE_ENV"] == "production"
    error_message = "Custom app setting NODE_ENV should be set"
  }

  # Test slot app settings
  assert {
    condition     = azurerm_linux_web_app_slot.this[0].app_settings["SLOT_SETTING_1"] == "slot_value1"
    error_message = "Slot app setting SLOT_SETTING_1 should be set"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].app_settings["NODE_ENV"] == "staging"
    error_message = "Slot app setting NODE_ENV should be set"
  }

  # Test default settings are also in slot
  assert {
    condition     = azurerm_linux_web_app_slot.this[0].app_settings["WEBSITE_RUN_FROM_PACKAGE"] == "1"
    error_message = "Default settings should be in slot"
  }
}

# Test Application Insights integration
run "integration_application_insights" {
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
      Test = "integration-test-application-insights"
    }

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "m"

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    subnet_pep_id                        = run.setup_tests.pep_id
    subnet_cidr                          = "10.20.81.0/24"
    private_dns_zone_resource_group_name = "dx-d-itn-network-rg-01"

    application_insights_connection_string = "InstrumentationKey=12345678-1234-1234-1234-123456789012;IngestionEndpoint=https://westeurope-1.in.applicationinsights.azure.com/;LiveEndpoint=https://westeurope.livediagnostics.monitor.azure.com/"
    application_insights_sampling_percentage = 10

    app_settings      = {}
    slot_app_settings = {}
    health_check_path = "/health"
  }

  assert {
    condition     = azurerm_linux_web_app.this.app_settings["APPLICATIONINSIGHTS_CONNECTION_STRING"] == "InstrumentationKey=12345678-1234-1234-1234-123456789012;IngestionEndpoint=https://westeurope-1.in.applicationinsights.azure.com/;LiveEndpoint=https://westeurope.livediagnostics.monitor.azure.com/"
    error_message = "Application Insights connection string should be set"
  }

  assert {
    condition     = azurerm_linux_web_app.this.app_settings["APPINSIGHTS_SAMPLING_PERCENTAGE"] == "10"
    error_message = "Application Insights sampling percentage should be set"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].app_settings["APPLICATIONINSIGHTS_CONNECTION_STRING"] == "InstrumentationKey=12345678-1234-1234-1234-123456789012;IngestionEndpoint=https://westeurope-1.in.applicationinsights.azure.com/;LiveEndpoint=https://westeurope.livediagnostics.monitor.azure.com/"
    error_message = "Application Insights connection string should be set in slot"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].app_settings["APPINSIGHTS_SAMPLING_PERCENTAGE"] == "10"
    error_message = "Application Insights sampling percentage should be set in slot"
  }
}

# Test sticky settings configuration
run "integration_sticky_settings" {
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
      Test = "integration-test-sticky-settings"
    }

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "m"

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    subnet_pep_id                        = run.setup_tests.pep_id
    subnet_cidr                          = "10.20.82.0/24"
    private_dns_zone_resource_group_name = "dx-d-itn-network-rg-01"

    app_settings = {
      "ENVIRONMENT"     = "production"
      "DATABASE_URL"    = "prod-db-url"
      "CACHE_PROVIDER"  = "redis"
    }

    slot_app_settings = {
      "ENVIRONMENT"     = "staging"
      "DATABASE_URL"    = "staging-db-url"
    }

    sticky_app_setting_names = [
      "ENVIRONMENT",
      "DATABASE_URL"
    ]

    health_check_path = "/health"
  }

  assert {
    condition     = contains(azurerm_linux_web_app.this.sticky_settings[0].app_setting_names, "ENVIRONMENT")
    error_message = "ENVIRONMENT should be in sticky settings"
  }

  assert {
    condition     = contains(azurerm_linux_web_app.this.sticky_settings[0].app_setting_names, "DATABASE_URL")
    error_message = "DATABASE_URL should be in sticky settings"
  }

  assert {
    condition     = !contains(azurerm_linux_web_app.this.sticky_settings[0].app_setting_names, "CACHE_PROVIDER")
    error_message = "CACHE_PROVIDER should not be in sticky settings"
  }
}

# Test no sticky settings when list is empty
run "integration_no_sticky_settings" {
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
      Test = "integration-test-no-sticky-settings"
    }

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "m"

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    subnet_pep_id                        = run.setup_tests.pep_id
    subnet_cidr                          = "10.20.83.0/24"
    private_dns_zone_resource_group_name = "dx-d-itn-network-rg-01"

    app_settings = {
      "ENVIRONMENT" = "production"
    }

    slot_app_settings = {}
    sticky_app_setting_names = []

    health_check_path = "/health"
  }

  assert {
    condition     = length(azurerm_linux_web_app.this.sticky_settings) == 0
    error_message = "No sticky settings block should be created when list is empty"
  }
}

# Test complete integration - all features together
run "integration_complete_scenario" {
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
      Test = "integration-test-complete"
    }

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "l"
    stack               = "java"
    java_version        = "21"
    tls_version         = 1.3

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    subnet_pep_id                        = run.setup_tests.pep_id
    subnet_cidr                          = "10.20.84.0/24"
    private_dns_zone_resource_group_name = "custom-dns-rg"

    subnet_service_endpoints = {
      cosmos  = true
      storage = true
      web     = false
    }

    application_insights_connection_string = "InstrumentationKey=12345678-1234-1234-1234-123456789012;IngestionEndpoint=https://westeurope-1.in.applicationinsights.azure.com/"
    application_insights_sampling_percentage = 15

    app_settings = {
      "JAVA_OPTS"       = "-Xmx2g -Xms1g"
      "SPRING_PROFILES" = "production"
      "DATABASE_URL"    = "prod-db-url"
    }

    slot_app_settings = {
      "SPRING_PROFILES" = "staging"
      "DATABASE_URL"    = "staging-db-url"
    }

    sticky_app_setting_names = [
      "SPRING_PROFILES",
      "DATABASE_URL"
    ]

    health_check_path = "/actuator/health"
  }

  # Test App Service Plan configuration
  assert {
    condition     = azurerm_service_plan.this[0].sku_name == "P1v3"
    error_message = "Large tier should use P1v3 SKU"
  }

  assert {
    condition     = azurerm_service_plan.this[0].zone_balancing_enabled == true
    error_message = "Large tier should have zone balancing enabled"
  }

  # Test App Service configuration
  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].application_stack[0].java_version == "21"
    error_message = "Java version should be 21"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].minimum_tls_version == "1.3"
    error_message = "TLS version should be 1.3"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].health_check_path == "/actuator/health"
    error_message = "Health check path should be /actuator/health"
  }

  # Test networking configuration
  assert {
    condition     = length(azurerm_subnet.this) == 1
    error_message = "Subnet should be created"
  }

  assert {
    condition     = contains(azurerm_subnet.this[0].service_endpoints, "Microsoft.CosmosDB")
    error_message = "Cosmos DB service endpoint should be enabled"
  }

  assert {
    condition     = contains(azurerm_subnet.this[0].service_endpoints, "Microsoft.Storage")
    error_message = "Storage service endpoint should be enabled"
  }

  # Test private endpoints
  assert {
    condition     = azurerm_private_endpoint.app_service_sites.subnet_id == run.setup_tests.pep_id
    error_message = "Private endpoint should be configured"
  }

  assert {
    condition     = length(azurerm_private_endpoint.staging_app_service_sites) == 1
    error_message = "Staging private endpoint should be created"
  }

  # Test staging slot
  assert {
    condition     = length(azurerm_linux_web_app_slot.this) == 1
    error_message = "Staging slot should be created for large tier"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].name == "staging"
    error_message = "Staging slot should be named 'staging'"
  }

  # Test Application Insights integration
  assert {
    condition     = azurerm_linux_web_app.this.app_settings["APPLICATIONINSIGHTS_CONNECTION_STRING"] != null
    error_message = "Application Insights connection string should be set"
  }

  assert {
    condition     = azurerm_linux_web_app.this.app_settings["APPINSIGHTS_SAMPLING_PERCENTAGE"] == "15"
    error_message = "Application Insights sampling percentage should be 15"
  }

  # Test custom app settings
  assert {
    condition     = azurerm_linux_web_app.this.app_settings["JAVA_OPTS"] == "-Xmx2g -Xms1g"
    error_message = "Custom Java opts should be set"
  }

  assert {
    condition     = azurerm_linux_web_app.this.app_settings["SPRING_PROFILES"] == "production"
    error_message = "Spring profiles should be set"
  }

  # Test slot app settings
  assert {
    condition     = azurerm_linux_web_app_slot.this[0].app_settings["SPRING_PROFILES"] == "staging"
    error_message = "Slot Spring profiles should be set"
  }

  # Test sticky settings
  assert {
    condition     = contains(azurerm_linux_web_app.this.sticky_settings[0].app_setting_names, "SPRING_PROFILES")
    error_message = "SPRING_PROFILES should be sticky"
  }

  assert {
    condition     = contains(azurerm_linux_web_app.this.sticky_settings[0].app_setting_names, "DATABASE_URL")
    error_message = "DATABASE_URL should be sticky"
  }
}