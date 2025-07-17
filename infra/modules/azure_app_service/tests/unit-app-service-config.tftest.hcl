# Unit tests for App Service application stack configuration
# Tests different technology stacks and their configurations

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

# Test Node.js stack with default version
run "app_service_node_default_version" {
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
      Test = "unit-test-node-default"
    }

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "m"
    stack               = "node"

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    subnet_pep_id                        = run.setup_tests.pep_id
    subnet_cidr                          = "10.20.60.0/24"
    private_dns_zone_resource_group_name = "dx-d-itn-network-rg-01"

    app_settings      = {}
    slot_app_settings = {}
    health_check_path = "/health"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].application_stack[0].node_version == "20-lts"
    error_message = "Default Node.js version should be 20-lts"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].application_stack[0].java_version == null
    error_message = "Java version should be null for Node.js stack"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].application_stack[0].java_server == null
    error_message = "Java server should be null for Node.js stack"
  }
}

# Test Node.js stack with custom version
run "app_service_node_custom_version" {
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
      Test = "unit-test-node-custom"
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
    subnet_cidr                          = "10.20.61.0/24"
    private_dns_zone_resource_group_name = "dx-d-itn-network-rg-01"

    app_settings      = {}
    slot_app_settings = {}
    health_check_path = "/health"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].application_stack[0].node_version == "18-lts"
    error_message = "Custom Node.js version should be 18-lts"
  }
}

# Test Java stack with default version
run "app_service_java_default_version" {
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
      Test = "unit-test-java-default"
    }

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "m"
    stack               = "java"

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    subnet_pep_id                        = run.setup_tests.pep_id
    subnet_cidr                          = "10.20.62.0/24"
    private_dns_zone_resource_group_name = "dx-d-itn-network-rg-01"

    app_settings      = {}
    slot_app_settings = {}
    health_check_path = "/health"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].application_stack[0].java_version == "17"
    error_message = "Default Java version should be 17"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].application_stack[0].java_server == "JAVA"
    error_message = "Java server should be JAVA"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].application_stack[0].java_server_version == "17"
    error_message = "Java server version should match Java version"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].application_stack[0].node_version == null
    error_message = "Node version should be null for Java stack"
  }
}

# Test Java stack with custom version
run "app_service_java_custom_version" {
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
      Test = "unit-test-java-custom"
    }

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "m"
    stack               = "java"
    java_version        = "21"

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    subnet_pep_id                        = run.setup_tests.pep_id
    subnet_cidr                          = "10.20.63.0/24"
    private_dns_zone_resource_group_name = "dx-d-itn-network-rg-01"

    app_settings      = {}
    slot_app_settings = {}
    health_check_path = "/health"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].application_stack[0].java_version == "21"
    error_message = "Custom Java version should be 21"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].application_stack[0].java_server_version == "21"
    error_message = "Java server version should match custom Java version"
  }
}

# Test App Service core configuration
run "app_service_core_config" {
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
      Test = "unit-test-core-config"
    }

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "m"

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    subnet_pep_id                        = run.setup_tests.pep_id
    subnet_cidr                          = "10.20.64.0/24"
    private_dns_zone_resource_group_name = "dx-d-itn-network-rg-01"

    app_settings      = {}
    slot_app_settings = {}
    health_check_path = "/health"
  }

  assert {
    condition     = azurerm_linux_web_app.this.https_only == true
    error_message = "HTTPS should be enforced"
  }

  assert {
    condition     = azurerm_linux_web_app.this.public_network_access_enabled == false
    error_message = "Public network access should be disabled"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].always_on == true
    error_message = "Always On should be enabled"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].http2_enabled == true
    error_message = "HTTP2 should be enabled"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].vnet_route_all_enabled == true
    error_message = "VNet route all should be enabled"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].minimum_tls_version == "1.2"
    error_message = "Minimum TLS version should be 1.2"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].ip_restriction_default_action == "Deny"
    error_message = "IP restriction default action should be Deny"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].health_check_path == "/health"
    error_message = "Health check path should be /health"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].health_check_eviction_time_in_min == 2
    error_message = "Health check eviction time should be 2 minutes"
  }

  assert {
    condition     = azurerm_linux_web_app.this.identity[0].type == "SystemAssigned"
    error_message = "Identity should be SystemAssigned"
  }
}

# Test custom TLS version
run "app_service_custom_tls" {
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
      Test = "unit-test-custom-tls"
    }

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "m"
    tls_version         = 1.3

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    subnet_pep_id                        = run.setup_tests.pep_id
    subnet_cidr                          = "10.20.65.0/24"
    private_dns_zone_resource_group_name = "dx-d-itn-network-rg-01"

    app_settings      = {}
    slot_app_settings = {}
    health_check_path = "/health"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].minimum_tls_version == "1.3"
    error_message = "Custom TLS version should be 1.3"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].site_config[0].minimum_tls_version == "1.3"
    error_message = "Staging slot TLS version should match main app"
  }
}