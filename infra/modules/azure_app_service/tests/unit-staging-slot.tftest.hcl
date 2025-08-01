# Unit tests for staging slot configuration
# Tests staging slot creation and configuration based on tier

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

# Test staging slot creation for medium tier
run "staging_slot_medium_tier" {
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
      Test = "unit-test-staging-slot-medium"
    }

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "m"

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    subnet_pep_id                        = run.setup_tests.pep_id
    subnet_cidr                          = "10.20.100.0/24"
    private_dns_zone_resource_group_name = "dx-d-itn-network-rg-01"

    app_settings = {
      "MAIN_APP_SETTING" = "main_value"
    }

    slot_app_settings = {
      "SLOT_SETTING" = "slot_value"
    }

    health_check_path = "/health"
  }

  assert {
    condition     = length(azurerm_linux_web_app_slot.this) == 1
    error_message = "Medium tier should have staging slot"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].name == "staging"
    error_message = "Staging slot should be named 'staging'"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].app_service_id == azurerm_linux_web_app.this.id
    error_message = "Staging slot should belong to the main app service"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].https_only == true
    error_message = "Staging slot should enforce HTTPS"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].public_network_access_enabled == false
    error_message = "Staging slot should have public network access disabled"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].virtual_network_subnet_id == azurerm_subnet.this[0].id
    error_message = "Staging slot should use the same subnet as main app"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].identity[0].type == "SystemAssigned"
    error_message = "Staging slot should have SystemAssigned identity"
  }
}

# Test staging slot configuration matches main app
run "staging_slot_config_matches_main" {
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
      Test = "unit-test-staging-slot-config"
    }

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "l"
    stack               = "java"
    java_version        = "17"
    tls_version         = 1.3

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    subnet_pep_id                        = run.setup_tests.pep_id
    subnet_cidr                          = "10.20.101.0/24"
    private_dns_zone_resource_group_name = "dx-d-itn-network-rg-01"

    app_settings      = {}
    slot_app_settings = {}
    health_check_path = "/actuator/health"
  }

  # Test site config matches main app
  assert {
    condition     = azurerm_linux_web_app_slot.this[0].site_config[0].http2_enabled == true
    error_message = "Staging slot should have HTTP2 enabled"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].site_config[0].always_on == true
    error_message = "Staging slot should have always on enabled"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].site_config[0].vnet_route_all_enabled == true
    error_message = "Staging slot should have vnet route all enabled"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].site_config[0].minimum_tls_version == "1.3"
    error_message = "Staging slot should have matching TLS version"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].site_config[0].health_check_path == "/actuator/health"
    error_message = "Staging slot should have matching health check path"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].site_config[0].health_check_eviction_time_in_min == 2
    error_message = "Staging slot should have matching health check eviction time"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].site_config[0].ip_restriction_default_action == "Deny"
    error_message = "Staging slot should have matching IP restriction default action"
  }

  # Test application stack matches main app
  assert {
    condition     = azurerm_linux_web_app_slot.this[0].site_config[0].application_stack[0].java_version == "17"
    error_message = "Staging slot should have matching Java version"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].site_config[0].application_stack[0].java_server == "JAVA"
    error_message = "Staging slot should have matching Java server"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].site_config[0].application_stack[0].java_server_version == "17"
    error_message = "Staging slot should have matching Java server version"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].site_config[0].application_stack[0].node_version == null
    error_message = "Staging slot should not have node version for Java stack"
  }
}

# Test staging slot app settings
run "staging_slot_app_settings" {
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
      Test = "unit-test-staging-slot-app-settings"
    }

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "l"

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    subnet_pep_id                        = run.setup_tests.pep_id
    subnet_cidr                          = "10.20.102.0/24"
    private_dns_zone_resource_group_name = "dx-d-itn-network-rg-01"

    application_insights_connection_string = "InstrumentationKey=12345678-1234-1234-1234-123456789012;IngestionEndpoint=https://westeurope-1.in.applicationinsights.azure.com/"
    application_insights_sampling_percentage = 20

    app_settings = {
      "ENVIRONMENT"  = "production"
      "DEBUG"        = "false"
      "CACHE_ENABLED" = "true"
    }

    slot_app_settings = {
      "ENVIRONMENT"  = "staging"
      "DEBUG"        = "true"
      "CACHE_ENABLED" = "false"
    }

    health_check_path = "/health"
  }

  # Test default app settings are present in slot
  assert {
    condition     = azurerm_linux_web_app_slot.this[0].app_settings["WEBSITE_ADD_SITENAME_BINDINGS_IN_APPHOST_CONFIG"] == "1"
    error_message = "Staging slot should have default website bindings setting"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].app_settings["WEBSITE_RUN_FROM_PACKAGE"] == "1"
    error_message = "Staging slot should have default run from package setting"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].app_settings["WEBSITE_DNS_SERVER"] == "168.63.129.16"
    error_message = "Staging slot should have default DNS server setting"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].app_settings["WEBSITE_SWAP_WARMUP_PING_PATH"] == "/health"
    error_message = "Staging slot should have swap warmup ping path"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].app_settings["WEBSITE_SWAP_WARMUP_PING_STATUSES"] == "200,204"
    error_message = "Staging slot should have swap warmup ping statuses"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].app_settings["WEBSITE_WARMUP_PATH"] == "/health"
    error_message = "Staging slot should have warmup path"
  }

  # Test Application Insights settings are present in slot
  assert {
    condition     = azurerm_linux_web_app_slot.this[0].app_settings["APPLICATIONINSIGHTS_CONNECTION_STRING"] != null
    error_message = "Staging slot should have Application Insights connection string"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].app_settings["APPINSIGHTS_SAMPLING_PERCENTAGE"] == "20"
    error_message = "Staging slot should have Application Insights sampling percentage"
  }

  # Test slot-specific app settings
  assert {
    condition     = azurerm_linux_web_app_slot.this[0].app_settings["ENVIRONMENT"] == "staging"
    error_message = "Staging slot should have slot-specific environment setting"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].app_settings["DEBUG"] == "true"
    error_message = "Staging slot should have slot-specific debug setting"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].app_settings["CACHE_ENABLED"] == "false"
    error_message = "Staging slot should have slot-specific cache setting"
  }

  # Test main app settings are different
  assert {
    condition     = azurerm_linux_web_app.this.app_settings["ENVIRONMENT"] == "production"
    error_message = "Main app should have production environment setting"
  }

  assert {
    condition     = azurerm_linux_web_app.this.app_settings["DEBUG"] == "false"
    error_message = "Main app should have debug disabled"
  }

  assert {
    condition     = azurerm_linux_web_app.this.app_settings["CACHE_ENABLED"] == "true"
    error_message = "Main app should have cache enabled"
  }
}

# Test no staging slot for small tier
run "no_staging_slot_small_tier" {
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
      Test = "unit-test-no-staging-slot-small"
    }

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "s"

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    subnet_pep_id                        = run.setup_tests.pep_id
    subnet_cidr                          = "10.20.103.0/24"
    private_dns_zone_resource_group_name = "dx-d-itn-network-rg-01"

    app_settings      = {}
    slot_app_settings = {}
    health_check_path = "/health"
  }

  assert {
    condition     = length(azurerm_linux_web_app_slot.this) == 0
    error_message = "Small tier should not have staging slot"
  }
}

# Test staging slot with custom subnet
run "staging_slot_custom_subnet" {
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
      Test = "unit-test-staging-slot-custom-subnet"
    }

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "xl"

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    subnet_pep_id                        = run.setup_tests.pep_id
    subnet_id                            = run.setup_tests.pep_id
    private_dns_zone_resource_group_name = "dx-d-itn-network-rg-01"

    app_settings      = {}
    slot_app_settings = {}
    health_check_path = "/health"
  }

  assert {
    condition     = length(azurerm_linux_web_app_slot.this) == 1
    error_message = "XL tier should have staging slot"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].virtual_network_subnet_id == run.setup_tests.pep_id
    error_message = "Staging slot should use the same custom subnet as main app"
  }

  assert {
    condition     = length(azurerm_subnet.this) == 0
    error_message = "No subnet should be created when using custom subnet"
  }
}

# Test staging slot with Node.js stack
run "staging_slot_nodejs_stack" {
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
      Test = "unit-test-staging-slot-nodejs"
    }

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "m"
    stack               = "node"
    node_version        = 18

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    subnet_pep_id                        = run.setup_tests.pep_id
    subnet_cidr                          = "10.20.104.0/24"
    private_dns_zone_resource_group_name = "dx-d-itn-network-rg-01"

    app_settings      = {}
    slot_app_settings = {}
    health_check_path = "/health"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].site_config[0].application_stack[0].node_version == "18-lts"
    error_message = "Staging slot should have matching Node.js version"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].site_config[0].application_stack[0].java_version == null
    error_message = "Staging slot should not have Java version for Node.js stack"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].site_config[0].application_stack[0].java_server == null
    error_message = "Staging slot should not have Java server for Node.js stack"
  }
}