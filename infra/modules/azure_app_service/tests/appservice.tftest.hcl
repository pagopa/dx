# Legacy integration tests - kept for backward compatibility
# These tests represent the original test scenarios and should continue to pass

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

# Legacy test: Basic app service plan verification
run "app_service_is_correct_plan" {
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
      Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_app_service/tests"
      ManagementTeam = "Developer Experience"
      Test           = "true"
      TestName       = "Create app service for test"
    }

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "m"

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    subnet_pep_id                        = run.setup_tests.pep_id
    subnet_cidr                          = "10.20.50.0/24"
    private_dns_zone_resource_group_name = "dx-d-itn-network-rg-01"

    app_settings      = {}
    slot_app_settings = {}
    health_check_path = "/health"
  }

  # Core App Service Plan assertions
  assert {
    condition     = azurerm_service_plan.this[0].sku_name == "P0v3"
    error_message = "The App Service Plan is incorrect, have to be P0v3"
  }

  assert {
    condition     = azurerm_service_plan.this[0].os_type == "Linux"
    error_message = "The App Service Plan should be Linux"
  }

  assert {
    condition     = azurerm_service_plan.this[0].zone_balancing_enabled == true
    error_message = "Medium tier should have zone balancing enabled"
  }

  # Core App Service assertions
  assert {
    condition     = azurerm_linux_web_app.this.https_only == true
    error_message = "The App Service should enforce HTTPS"
  }

  assert {
    condition     = azurerm_linux_web_app.this.public_network_access_enabled == false
    error_message = "The App Service should have public network access disabled"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].application_stack[0].node_version == "20-lts"
    error_message = "The App Service must use Node version 20 LTS"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].always_on == true
    error_message = "The App Service should have Always On enabled"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].minimum_tls_version == "1.2"
    error_message = "The App Service must use TLS version 1.2"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].http2_enabled == true
    error_message = "The App Service should have HTTP2 enabled"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].vnet_route_all_enabled == true
    error_message = "The App Service should have VNet route all enabled"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].health_check_path == "/health"
    error_message = "The App Service should have correct health check path"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].health_check_eviction_time_in_min == 2
    error_message = "The App Service should have correct health check eviction time"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].ip_restriction_default_action == "Deny"
    error_message = "The App Service should have IP restriction default action set to Deny"
  }

  assert {
    condition     = azurerm_linux_web_app.this.identity[0].type == "SystemAssigned"
    error_message = "The App Service should have SystemAssigned identity"
  }

  # Staging slot assertions
  assert {
    condition     = length(azurerm_linux_web_app_slot.this) == 1
    error_message = "Medium tier should have staging slot"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].site_config[0].minimum_tls_version == "1.2"
    error_message = "The App Service staging slot must use TLS version 1.2"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].https_only == true
    error_message = "The App Service staging slot should enforce HTTPS"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].public_network_access_enabled == false
    error_message = "The App Service staging slot should have public network access disabled"
  }

  # Networking assertions
  assert {
    condition     = length(azurerm_subnet.this) == 1
    error_message = "Subnet should be created"
  }

  assert {
    condition     = azurerm_subnet.this[0].address_prefixes[0] == "10.20.50.0/24"
    error_message = "Subnet should have correct CIDR"
  }

  assert {
    condition     = azurerm_linux_web_app.this.virtual_network_subnet_id == azurerm_subnet.this[0].id
    error_message = "App Service should use created subnet"
  }

  # Private endpoints assertions
  assert {
    condition     = azurerm_private_endpoint.app_service_sites.subnet_id == run.setup_tests.pep_id
    error_message = "App Service private endpoint should use correct subnet"
  }

  assert {
    condition     = length(azurerm_private_endpoint.staging_app_service_sites) == 1
    error_message = "Staging slot private endpoint should be created"
  }

  # App settings assertions
  assert {
    condition     = azurerm_linux_web_app.this.app_settings["WEBSITE_RUN_FROM_PACKAGE"] == "1"
    error_message = "Default app setting should be present"
  }

  assert {
    condition     = azurerm_linux_web_app.this.app_settings["WEBSITE_DNS_SERVER"] == "168.63.129.16"
    error_message = "Default DNS server setting should be present"
  }

  assert {
    condition     = azurerm_linux_web_app.this.app_settings["WEBSITE_SWAP_WARMUP_PING_PATH"] == "/health"
    error_message = "Swap warmup ping path should match health check path"
  }
}

# Legacy test: Custom subnet scenario
run "app_service_custom_subnet" {
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
      Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_app_service/tests"
      ManagementTeam = "Developer Experience"
      Test           = "true"
      TestName       = "Create app service for test"
    }

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "m"

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
    condition     = length(azurerm_subnet.this) == 0
    error_message = "Subnet should not be created when using custom subnet"
  }

  assert {
    condition     = azurerm_linux_web_app.this.virtual_network_subnet_id == run.setup_tests.pep_id
    error_message = "App Service should use provided subnet_id"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].virtual_network_subnet_id == run.setup_tests.pep_id
    error_message = "Staging slot should use provided subnet_id"
  }

  assert {
    condition     = azurerm_private_endpoint.app_service_sites.subnet_id == run.setup_tests.pep_id
    error_message = "Private endpoint should use correct subnet"
  }

  assert {
    condition     = azurerm_private_endpoint.staging_app_service_sites[0].subnet_id == run.setup_tests.pep_id
    error_message = "Staging private endpoint should use correct subnet"
  }
}

# Additional comprehensive test for different configuration scenarios
run "app_service_comprehensive_config" {
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
      Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_app_service/tests"
      ManagementTeam = "Developer Experience"
      Test           = "true"
      TestName       = "Comprehensive app service test"
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
    subnet_cidr                          = "10.20.51.0/24"
    private_dns_zone_resource_group_name = "dx-d-itn-network-rg-01"

    subnet_service_endpoints = {
      cosmos  = true
      storage = true
      web     = false
    }

    application_insights_connection_string = "InstrumentationKey=12345678-1234-1234-1234-123456789012;IngestionEndpoint=https://westeurope-1.in.applicationinsights.azure.com/"
    application_insights_sampling_percentage = 25

    app_settings = {
      "JAVA_OPTS"     = "-Xmx2g -Xms1g"
      "ENVIRONMENT"   = "production"
      "DATABASE_URL"  = "prod-db-url"
    }

    slot_app_settings = {
      "ENVIRONMENT"   = "staging"
      "DATABASE_URL"  = "staging-db-url"
    }

    sticky_app_setting_names = [
      "ENVIRONMENT",
      "DATABASE_URL"
    ]

    health_check_path = "/actuator/health"
  }

  # Test App Service Plan for large tier
  assert {
    condition     = azurerm_service_plan.this[0].sku_name == "P1v3"
    error_message = "Large tier should use P1v3 SKU"
  }

  assert {
    condition     = azurerm_service_plan.this[0].zone_balancing_enabled == true
    error_message = "Large tier should have zone balancing enabled"
  }

  # Test Java stack configuration
  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].application_stack[0].java_version == "21"
    error_message = "Java version should be 21"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].application_stack[0].java_server == "JAVA"
    error_message = "Java server should be JAVA"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].application_stack[0].java_server_version == "21"
    error_message = "Java server version should be 21"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].application_stack[0].node_version == null
    error_message = "Node version should be null for Java stack"
  }

  # Test TLS version
  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].minimum_tls_version == "1.3"
    error_message = "TLS version should be 1.3"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].site_config[0].minimum_tls_version == "1.3"
    error_message = "Staging slot TLS version should be 1.3"
  }

  # Test health check path
  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].health_check_path == "/actuator/health"
    error_message = "Health check path should be /actuator/health"
  }

  # Test service endpoints
  assert {
    condition     = contains(azurerm_subnet.this[0].service_endpoints, "Microsoft.CosmosDB")
    error_message = "Cosmos DB service endpoint should be enabled"
  }

  assert {
    condition     = contains(azurerm_subnet.this[0].service_endpoints, "Microsoft.Storage")
    error_message = "Storage service endpoint should be enabled"
  }

  assert {
    condition     = !contains(azurerm_subnet.this[0].service_endpoints, "Microsoft.Web")
    error_message = "Web service endpoint should not be enabled"
  }

  # Test Application Insights
  assert {
    condition     = azurerm_linux_web_app.this.app_settings["APPLICATIONINSIGHTS_CONNECTION_STRING"] != null
    error_message = "Application Insights connection string should be set"
  }

  assert {
    condition     = azurerm_linux_web_app.this.app_settings["APPINSIGHTS_SAMPLING_PERCENTAGE"] == "25"
    error_message = "Application Insights sampling percentage should be 25"
  }

  # Test custom app settings
  assert {
    condition     = azurerm_linux_web_app.this.app_settings["JAVA_OPTS"] == "-Xmx2g -Xms1g"
    error_message = "Custom Java opts should be set"
  }

  assert {
    condition     = azurerm_linux_web_app.this.app_settings["ENVIRONMENT"] == "production"
    error_message = "Environment should be production"
  }

  # Test slot app settings
  assert {
    condition     = azurerm_linux_web_app_slot.this[0].app_settings["ENVIRONMENT"] == "staging"
    error_message = "Slot environment should be staging"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].app_settings["DATABASE_URL"] == "staging-db-url"
    error_message = "Slot database URL should be staging URL"
  }

  # Test sticky settings
  assert {
    condition     = contains(azurerm_linux_web_app.this.sticky_settings[0].app_setting_names, "ENVIRONMENT")
    error_message = "ENVIRONMENT should be in sticky settings"
  }

  assert {
    condition     = contains(azurerm_linux_web_app.this.sticky_settings[0].app_setting_names, "DATABASE_URL")
    error_message = "DATABASE_URL should be in sticky settings"
  }

  # Test staging slot configuration matches main app
  assert {
    condition     = azurerm_linux_web_app_slot.this[0].site_config[0].application_stack[0].java_version == "21"
    error_message = "Staging slot Java version should match main app"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].site_config[0].health_check_path == "/actuator/health"
    error_message = "Staging slot health check path should match main app"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].https_only == true
    error_message = "Staging slot should enforce HTTPS"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].public_network_access_enabled == false
    error_message = "Staging slot should have public network access disabled"
  }
}
