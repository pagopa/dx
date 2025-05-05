provider "azurerm" {
  features {
  }
  storage_use_azuread = true
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

run "function_app_is_correct_plan" {
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

    tags  = {
      CostCenter     = "TS000 - Tecnologia e Servizi"
      CreatedBy      = "Terraform"
      Environment    = "Dev"
      BusinessUnit   = "DevEx"
      Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_function_app_exposed/tests"
      ManagementTeam = "Developer Experience"
      Test           = "true"
      TestName       = "Create a function app exposed for test"
    }

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "m"

    app_settings      = {}
    slot_app_settings = {}

    health_check_path = "/health"

  }

  assert {
    condition     = azurerm_service_plan.this[0].sku_name == "P0v3"
    error_message = "The App Service Plan is incorrect, have to be P0v3"
  }

  assert {
    condition     = azurerm_linux_function_app.this.https_only == true
    error_message = "The Function App should enforce HTTPS"
  }

  assert {
    condition     = azurerm_linux_function_app.this.site_config[0].application_stack[0].node_version == "20"
    error_message = "The Function App must use Node version 20"
  }

  assert {
    condition     = azurerm_linux_function_app.this.site_config[0].minimum_tls_version == "1.3"
    error_message = "The Function App must use TLS version 1.3"
  }

  assert {
    condition     = azurerm_linux_function_app.this.site_config[0].always_on == true
    error_message = "The Function App should have Always On enabled"
  }

  assert {
    condition     = azurerm_linux_function_app.this.storage_account_name == azurerm_storage_account.this.name
    error_message = "The Function App must use the correct Storage Account"
  }

  assert {
    condition     = azurerm_linux_function_app.this.app_settings["WEBSITE_RUN_FROM_PACKAGE"] == "1"
    error_message = "The Function App should enable binding"
  }

  assert {
    condition     = azurerm_linux_function_app.this.app_settings["WEBSITE_ADD_SITENAME_BINDINGS_IN_APPHOST_CONFIG"] == "1"
    error_message = "The Function App should run from package"
  }

  assert {
    condition     = azurerm_linux_function_app.this.app_settings["WEBSITE_DNS_SERVER"] == "168.63.129.16"
    error_message = "The Function App should use Azure DNS"
  }

  assert {
    condition     = azurerm_linux_function_app.this.app_settings["SLOT_TASK_HUBNAME"] == "ProductionTaskHub"
    error_message = "The Function App should set production task hub name"
  }

  assert {
    condition     = lookup(azurerm_linux_function_app.this.app_settings, "DfStorageConnectionName__accountname", "default") == "default"
    error_message = "The Function App should not set the Durable Function Storage Account connection name"
  }

  assert {
    condition     = lookup(azurerm_linux_function_app_slot.this[0].app_settings, "DfStorageConnectionName__accountname", "default") == "default"
    error_message = "The Function App staging slot should not set the Durable Function Storage Account connection name"
  }

  assert {
    condition = azurerm_storage_account.durable_function == []
    error_message = "The Durable Function App Storage Account should not be created"
  }

  assert {
    condition = azurerm_role_assignment.function_storage_blob_data_owner != null
    error_message = "Function App must have role assignment to manage blobs in the storage account"
  }

  assert {
    condition = azurerm_role_assignment.function_storage_account_contributor != null
    error_message = "Function App must have role assignment to manage the storage account"
  }

  assert {
    condition = azurerm_role_assignment.function_storage_queue_data_contributor != null
    error_message = "Function App must have role assignment to manage queues in the storage account"
  }

  assert {
    condition = azurerm_role_assignment.staging_function_storage_blob_data_owner != null
    error_message = "Function App staging slot must have role assignment to manage blobs in the storage account"
  }

  assert {
    condition = azurerm_role_assignment.staging_function_storage_account_contributor != null
    error_message = "Function App staging slot must have role assignment to manage the storage account"
  }

  assert {
    condition = azurerm_role_assignment.staging_function_storage_queue_data_contributor != null
    error_message = "Function App staging slot must have role assignment to manage queues in the storage account"
  }

  assert {
    condition     = azurerm_storage_account.durable_function == []
    error_message = "Storage Account for Durable Functions should not be created"
  }
}

run "function_app_with_durable_function" {
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

    tags  = {
      CostCenter     = "TS000 - Tecnologia e Servizi"
      CreatedBy      = "Terraform"
      Environment    = "Dev"
      BusinessUnit   = "DevEx"
      Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_function_app_exposed/tests"
      ManagementTeam = "Developer Experience"
      Test           = "true"
      TestName       = "Create a function app exposed for test"
    }

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "m"

    app_settings      = {}
    slot_app_settings = {}

    health_check_path = "/health"

    has_durable_functions = true
  }

  assert {
    condition     = azurerm_linux_function_app.this.storage_account_name == azurerm_storage_account.this.name
    error_message = "The Function App must use the correct Storage Account"
  }

  assert {
    condition     = azurerm_storage_account.durable_function[0] != null
    error_message = "Storage Account for Durable Functions should be created"
  }

  assert {
    condition     = azurerm_role_assignment.durable_function_storage_blob_data_contributor[0] != null
    error_message = "Function App must have role assignment to manage blobs in the Durable Function storage account"
  }

  assert {
    condition     = azurerm_role_assignment.durable_function_storage_queue_data_contributor[0] != null
    error_message = "Function App must have role assignment to manage queues in the Durable Function storage account"
  }

  assert {
    condition     = azurerm_role_assignment.durable_function_storage_table_data_contributor[0] != null
    error_message = "Function App must have role assignment to manage tables in the Durable Function storage account"
  }

  assert {
    condition     = azurerm_role_assignment.staging_durable_function_storage_blob_data_contributor[0] != null
    error_message = "Function App staging slot must have role assignment to manage blobs in the Durable Function storage account"
  }

  assert {
    condition     = azurerm_role_assignment.staging_durable_function_storage_queue_data_contributor[0] != null
    error_message = "Function App staging slot must have role assignment to manage queues in the Durable Function storage account"
  }

  assert {
    condition     = azurerm_role_assignment.staging_durable_function_storage_table_data_contributor[0] != null
    error_message = "Function App staging slot must have role assignment to manage tables in the Durable Function storage account"
  }
}
