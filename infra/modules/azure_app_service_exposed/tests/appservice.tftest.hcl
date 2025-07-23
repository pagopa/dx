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
      CostCenter     = "TS000 - Tecnologia e Servizi"
      CreatedBy      = "Terraform"
      Environment    = "Dev"
      Owner          = "DevEx"
      Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_app_service_exposed/tests"
      ManagementTeam = "Developer Experience"
      Test           = "true"
      TestName       = "Create app service for test"
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

  assert {
    condition     = azurerm_linux_web_app.this.site_config[0].minimum_tls_version == "1.2"
    error_message = "The App Service must use TLS version 1.2"
  }

  assert {
    condition     = azurerm_linux_web_app_slot.this[0].site_config[0].minimum_tls_version == "1.2"
    error_message = "The App Service staging slot must use TLS version 1.2"
  }
}
