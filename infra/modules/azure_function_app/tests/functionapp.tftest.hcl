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
      Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_function_app/tests"
      ManagementTeam = "Developer Experience"
      Test           = "true"
      TestName       = "Create a function app for test"
    }

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "m"

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    subnet_pep_id                        = run.setup_tests.pep_id
    subnet_cidr                          = "10.50.80.0/24"
    private_dns_zone_resource_group_name = "dx-d-itn-network-rg-01"

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
    condition     = azurerm_linux_function_app.this.https_only == true
    error_message = "The Function App should enforce HTTPS"
  }

  assert {
    condition     = azurerm_linux_function_app_slot.this[0].https_only == true
    error_message = "The Function App staging slot should enforce HTTPS"
  }

  assert {
    condition     = azurerm_linux_function_app.this.site_config[0].application_stack[0].node_version == "20"
    error_message = "The Function App must use Node version 20"
  }

  assert {
    condition     = azurerm_linux_function_app_slot.this[0].site_config[0].application_stack[0].node_version == "20"
    error_message = "The Function App staging slot must use Node version 20"
  }

  assert {
    condition     = azurerm_linux_function_app.this.site_config[0].always_on == true
    error_message = "The Function App should have Always On enabled"
  }

  assert {
    condition     = azurerm_linux_function_app.this.app_settings["WEBSITE_RUN_FROM_PACKAGE"] == "1"
    error_message = "The Function App should run deployments from zip files"
  }

  assert {
    condition     = azurerm_linux_function_app_slot.this[0].app_settings["WEBSITE_RUN_FROM_PACKAGE"] == "1"
    error_message = "The Function App staging slot should run deployments from zip files"
  }

  assert {
    condition     = azurerm_linux_function_app.this.app_settings["WEBSITE_ADD_SITENAME_BINDINGS_IN_APPHOST_CONFIG"] == "1"
    error_message = "The Function App should enable host binding"
  }

  assert {
    condition     = azurerm_linux_function_app_slot.this[0].app_settings["WEBSITE_ADD_SITENAME_BINDINGS_IN_APPHOST_CONFIG"] == "1"
    error_message = "The Function App staging slot should enable host binding"
  }

  assert {
    condition     = azurerm_linux_function_app.this.app_settings["WEBSITE_DNS_SERVER"] == "168.63.129.16"
    error_message = "The Function App should use Azure DNS"
  }

  assert {
    condition     = azurerm_linux_function_app_slot.this[0].app_settings["WEBSITE_DNS_SERVER"] == "168.63.129.16"
    error_message = "The Function App staging slot should use Azure DNS"
  }

  assert {
    condition     = azurerm_linux_function_app.this.app_settings["SLOT_TASK_HUBNAME"] == "ProductionTaskHub"
    error_message = "The Function App should set production task hub name"
  }

  assert {
    condition     = azurerm_linux_function_app_slot.this[0].app_settings["SLOT_TASK_HUBNAME"] == "StagingTaskHub"
    error_message = "The Function App staging slot should set staging task hub name"
  }

  assert {
    condition     = azurerm_linux_function_app.this.storage_account_name == azurerm_storage_account.this.name
    error_message = "The Function App must use the correct Storage Account"
  }

  assert {
    condition     = azurerm_linux_function_app_slot.this[0].storage_account_name == azurerm_storage_account.this.name
    error_message = "The Function App staging slot must use the correct Storage Account"
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
    condition     = azurerm_private_endpoint.st_blob.subnet_id == run.setup_tests.pep_id
    error_message = "The Private Endpoint must be in the correct subnet"
  }

  assert {
    condition     = length(azurerm_subnet.this) == 1
    error_message = "Subnet should be created"
  }
}

run "function_app_custom_subnet" {
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
      Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_function_app/tests"
      ManagementTeam = "Developer Experience"
      Test           = "true"
      TestName       = "Create a function app for test"
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
    condition     = azurerm_subnet.this == []
    error_message = "Subnet should not be created"
  }
}

run "function_app_ai_instrumentation_key" {
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
      Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_function_app/tests"
      ManagementTeam = "Developer Experience"
      Test           = "true"
      TestName       = "Create a function app for test"
    }

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "m"

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    subnet_pep_id                        = run.setup_tests.pep_id
    subnet_cidr                          = "10.50.80.0/24"
    private_dns_zone_resource_group_name = "dx-d-itn-network-rg-01"

    app_settings      = {}
    slot_app_settings = {}

    health_check_path = "/health"

    application_insights_key = "00000000-00aa-00a0-aa00-0aa00000a000"
  }

  assert {
    condition     = local.application_insights.enable == false
    error_message = "Application Insights should be disabled"
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
      Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_function_app/tests"
      ManagementTeam = "Developer Experience"
      Test           = "true"
      TestName       = "Create a function app for test"
    }

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "m"

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }

    subnet_pep_id                        = run.setup_tests.pep_id
    subnet_cidr                          = "10.50.80.0/24"
    private_dns_zone_resource_group_name = "dx-d-itn-network-rg-01"

    app_settings      = {}
    slot_app_settings = {}

    health_check_path = "/health"

    has_durable_functions = true

    application_insights_connection_string = "InstrumentationKey=00000000-00aa-00a0-aa00-0aa00000a000;IngestionEndpoint=https://italynorth-0.in.applicationinsights.azure.com/;LiveEndpoint=https://italynorth.livediagnostics.monitor.azure.com/;ApplicationId=00000000-0000-0000-a0a0-a0a0a0000a00"
  }

  assert {
    condition     = azurerm_linux_function_app.this.storage_account_name == azurerm_storage_account.this.name
    error_message = "The Function App must use the correct Storage Account"
  }

  assert {
    condition     = azurerm_linux_function_app_slot.this[0].storage_account_name == azurerm_storage_account.this.name
    error_message = "The Function App staging slot must use the correct Storage Account"
  }

  assert {
    condition     = azurerm_linux_function_app.this.app_settings["SLOT_TASK_HUBNAME"] == "ProductionTaskHub"
    error_message = "The Function App should set production task hub name"
  }

  assert {
    condition     = azurerm_linux_function_app_slot.this[0].app_settings["SLOT_TASK_HUBNAME"] == "StagingTaskHub"
    error_message = "The Function App staging slot should set staging task hub name"
  }

  assert {
    condition     = azurerm_storage_account.durable_function[0] != null
    error_message = "Storage Account for Durable Functions should be created"
  }

  assert {
    condition     = azurerm_linux_function_app.this.app_settings["DfStorageConnectionName__accountname"] == azurerm_storage_account.durable_function[0].name
    error_message = "The Function App should set the Durable Function Storage Account connection name"
  }

  assert {
    condition     = azurerm_linux_function_app_slot.this[0].app_settings["DfStorageConnectionName__accountname"] == azurerm_storage_account.durable_function[0].name
    error_message = "The Function App staging slot should set the Durable Function Storage Account connection name"
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
