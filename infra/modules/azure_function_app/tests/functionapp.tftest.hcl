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
      prefix          = "io"
      env_short       = "p"
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
      prefix          = "io"
      env_short       = "p"
      location        = "italynorth"
      domain          = "modules"
      app_name        = "test"
      instance_number = "01"
    }

    tags = {
      CostCenter  = "TS310 - PAGAMENTI & SERVIZI"
      CreatedBy   = "Terraform"
      Environment = "Prod"
      Owner       = "IO"
      Source      = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_function_app/tests"
      Test        = "true"
      TestName    = "Create Function app for test"
    }

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "m"

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }
  
    subnet_pep_id = run.setup_tests.pep_id
    subnet_cidr   = "10.20.50.0/24"
    private_dns_zone_resource_group_name = "io-p-rg-common"

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
    error_message = "The App Service should enforce HTTPS"
  }

  assert {
    condition     = azurerm_linux_function_app.this.site_config[0].application_stack[0].node_version ==  "20"
    error_message = "The App Service must use Node version 20"
  }

  assert {
    condition     = azurerm_linux_function_app.this.site_config[0].always_on == true
    error_message = "The App Service should have Always On enabled"
  }

  assert {
    condition     = azurerm_linux_function_app.this.storage_account_name == azurerm_storage_account.this.name
    error_message = "The Function App must use the correct Storage Account"
  }

  assert {
    condition     = azurerm_private_endpoint.st_blob.subnet_id == run.setup_tests.pep_id
    error_message = "The Private Endpoint must be in the correct subnet"
  }
}

run "function_app_is_correct_apply" {
  command = apply

  variables {
    environment = {
      prefix          = "io"
      env_short       = "p"
      location        = "italynorth"
      domain          = "modules"
      app_name        = "test"
      instance_number = "01"
    }

    tags = {
      CostCenter  = "TS310 - PAGAMENTI & SERVIZI"
      CreatedBy   = "Terraform"
      Environment = "Prod"
      Owner       = "IO"
      Source      = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_function_app/tests"
      Test        = "true"
      TestName    = "Create Function app for test"
    }

    resource_group_name = run.setup_tests.resource_group_name
    tier                = "m"

    virtual_network = {
      name                = run.setup_tests.vnet.name
      resource_group_name = run.setup_tests.vnet.resource_group_name
    }
  
    subnet_pep_id = run.setup_tests.pep_id
    subnet_cidr   = "10.20.50.0/24"
    private_dns_zone_resource_group_name = "io-p-rg-common"

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
    error_message = "The App Service should enforce HTTPS"
  }

  assert {
    condition     = azurerm_linux_function_app.this.site_config[0].application_stack[0].node_version ==  "20"
    error_message = "The App Service must use Node version 20"
  }

  assert {
    condition     = azurerm_linux_function_app.this.site_config[0].always_on == true
    error_message = "The App Service should have Always On enabled"
  }

  assert {
    condition     = azurerm_linux_function_app.this.service_plan_id == azurerm_service_plan.this[0].id
    error_message = "The Function App must use the correct Service Plan"
  }

  assert {
    condition     = azurerm_linux_function_app.this.storage_account_name == azurerm_storage_account.this.name
    error_message = "The Function App must use the correct Storage Account"
  }


  assert {
    condition     = azurerm_linux_function_app.this.service_plan_id == azurerm_service_plan.this[0].id
    error_message = "The Function App Slot must use the correct Service Plan"
  }

  assert {
    condition     = azurerm_private_endpoint.st_blob.private_service_connection[0].private_connection_resource_id == azurerm_linux_function_app.this.id
    error_message = "The Private Endpoint must be associated with the correct Function App"
  }

  assert {
    condition     = azurerm_role_assignment.function_storage_blob_data_owner.principal_id == azurerm_linux_function_app.this.identity[0].principal_id
    error_message = "The Function App must have the correct Role Assignment"
  }

  assert {
    condition     = azurerm_private_endpoint.st_blob.subnet_id == run.setup_tests.pep_id
    error_message = "The Private Endpoint must be in the correct subnet"
  }

  assert {
    condition     = azurerm_linux_function_app_slot.this[0].function_app_id == azurerm_linux_function_app.this.id
    error_message = "The Function App Slot ha right function ref"
  }
}