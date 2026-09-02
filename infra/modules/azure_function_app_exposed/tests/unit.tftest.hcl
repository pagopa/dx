variables {
  environment = {
    prefix          = "dx"
    env_short       = "u"
    location        = "italynorth"
    domain          = "modules"
    app_name        = "test"
    instance_number = "01"
  }

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Uat"
    BusinessUnit   = "DevEx"
    ManagementTeam = "Developer Experience"
    Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_function_app_exposed/tests"
    Test           = "true"
    TestName       = "Azure Function App Exposed unit tests"
  }

  resource_group_name = "rg-test"
  health_check_path   = "/health"
  app_settings        = {}
  slot_app_settings   = {}
}

mock_provider "azurerm" {}

run "azure_function_app_exposed_default_configuration" {
  command = plan

  assert {
    condition     = azurerm_service_plan.this[0].sku_name == "P1v3"
    error_message = "The default use case must create a P1v3 App Service Plan."
  }

  assert {
    condition     = azurerm_linux_function_app.this.https_only && azurerm_linux_function_app.this.site_config[0].always_on
    error_message = "The exposed Function App must enforce HTTPS and remain always on."
  }

  assert {
    condition     = azurerm_linux_function_app.this.site_config[0].application_stack[0].node_version == "22"
    error_message = "The exposed Function App must use Node.js 22 by default."
  }

  assert {
    condition     = length(azurerm_storage_account.durable_function) == 0
    error_message = "The default configuration must not create Durable Functions storage."
  }
}

run "azure_function_app_exposed_durable_functions" {
  command = plan

  variables {
    has_durable_functions = true
  }

  assert {
    condition     = length(azurerm_storage_account.durable_function) == 1
    error_message = "Durable Functions must create their dedicated storage account."
  }

  assert {
    condition     = azurerm_role_assignment.durable_function_storage_table_data_contributor[0] != null
    error_message = "Durable Functions must receive table data contributor access."
  }
}

run "azure_function_app_exposed_custom_sku_and_runtime" {
  command = plan

  variables {
    size         = "P3mv3"
    node_version = 24
  }

  assert {
    condition     = azurerm_service_plan.this[0].sku_name == "P3mv3"
    error_message = "An explicit App Service Plan SKU must be respected."
  }

  assert {
    condition     = azurerm_linux_function_app.this.site_config[0].application_stack[0].node_version == "24"
    error_message = "An explicit Node.js version must be respected."
  }
}
