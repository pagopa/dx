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
      CostCenter  = "TS700 - ENGINEERING"
      CreatedBy   = "Terraform"
      Environment = "Dev"
      Owner       = "DevEx"
      Source      = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_app_service_exposed/tests"
      Test        = "true"
      TestName    = "Create app service for test"
    }

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "m"

    app_settings      = {}
    slot_app_settings = {}

    health_check_path = "/health"

  }

  # Checks some assertions
  assert {
    condition     = azurerm_service_plan.this[0].sku_name == "P0v3"
    error_message = "The App Service Plan is incorrect, have to be P0v3"
  }

  assert {
    condition     = azurerm_linux_web_app.this.https_only == true
    error_message = "The App Service should enforce HTTPS"
  }

  assert {
    condition     = azurerm_linux_web_app.this.public_network_access_enabled == true
    error_message = "The App Service should be exposed"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].application_stack[0].node_version == "20-lts"
    error_message = "The App Service must use Node version 20 LTS"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].always_on == true
    error_message = "The App Service should have Always On enabled"
  }
}

run "app_service_node_default_startup_command" {
  command = plan

  plan_options {
    target = [
      azurerm_linux_web_app.this,
      azurerm_linux_web_app_slot.this,
    ]
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

    tags = {}

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "m"

    app_settings      = {}
    slot_app_settings = {}

    health_check_path = "/health"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].application_stack[0].node_version != null
    error_message = "Node version is null"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].site_config[0].application_stack[0].node_version != null
    error_message = "Node version is null on staging slot"
  }

  assert {
    condition     = strcontains(azurerm_linux_web_app.this.site_config[0].app_command_line, "pm2 start")
    error_message = "PM2 is not set as default for Node.js"
  }

  assert {
    condition     = strcontains(azurerm_linux_web_app_slot.this[0].site_config[0].app_command_line, "pm2 start")
    error_message = "PM2 is not set as default for Node.js on staging slot"
  }
}

run "app_service_node_custom_startup_command" {
  command = plan

  plan_options {
    target = [
      azurerm_linux_web_app.this,
        azurerm_linux_web_app_slot.this,
    ]
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

    tags = {}

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "m"

    app_settings      = {}
    slot_app_settings = {}

    health_check_path = "/health"

    startup_command = "custom command"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].application_stack[0].node_version != null
    error_message = "Node version is null"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].app_command_line == "custom command"
    error_message = "Startup command override doesn't work on Node.js stack"
  }
}

run "app_service_java_default_startup_command" {
  command = plan

  plan_options {
    target = [
      azurerm_linux_web_app.this,
        azurerm_linux_web_app_slot.this,
    ]
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

    tags = {}

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "m"

    app_settings      = {}
    slot_app_settings = {}

    health_check_path = "/health"

    stack = "java"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].application_stack[0].java_version != null
    error_message = "Java version is null"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].site_config[0].application_stack[0].java_version != null
    error_message = "Java version is null on staging slot"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].application_stack[0].java_server != null
    error_message = "Java server is null"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].site_config[0].application_stack[0].java_server != null
    error_message = "Java server is null on staging slot"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].application_stack[0].java_server_version != null
    error_message = "Java server version is null"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].site_config[0].application_stack[0].java_server_version != null
    error_message = "Java server version is null on staging slot"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].app_command_line == null
    error_message = "Default startup command value is not null on Java stack"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].site_config[0].app_command_line == null
    error_message = "Default startup command value is not null on Java stack on staging slot"
  }
}

run "app_service_java_custom_startup_command" {
  command = plan

  plan_options {
    target = [
      azurerm_linux_web_app.this,
        azurerm_linux_web_app_slot.this,
    ]
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

    tags = {}

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "m"

    app_settings      = {}
    slot_app_settings = {}

    health_check_path = "/health"

    stack           = "java"
    startup_command = "custom command"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].application_stack[0].java_version != null
    error_message = "Java version is null"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].site_config[0].application_stack[0].java_version != null
    error_message = "Java version is null on staging slot"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].application_stack[0].java_server != null
    error_message = "Java server is null"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].site_config[0].application_stack[0].java_server != null
    error_message = "Java server is null on staging slot"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].application_stack[0].java_server_version != null
    error_message = "Java server version is null"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].site_config[0].application_stack[0].java_server_version != null
    error_message = "Java server version is null on staging slot"
  }

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].app_command_line != null
    error_message = "Startup command override doesn't work on Java stack"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].site_config[0].app_command_line != null
    error_message = "Startup command override doesn't work on Java stack on staging slot"
  }
}
