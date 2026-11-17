provider "azurerm" {
  features {
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
  }
}

provider "dx" {}

variables {
  environment = {
    prefix          = "dx"
    env_short       = "u"
    location        = "italynorth"
    domain          = "int"
    app_name        = "fa"
    instance_number = "01"
  }

  tags = {
    CostCenter  = "TS720 - DEV EX"
    Environment = "Uat"
    Owner       = "DevEx"
    Source      = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_function_app/tests"
    Test        = "true"
    TestName    = "Azure Function App integration tests"
  }
}

run "setup" {
  module {
    source = "./tests/setup"
  }

  variables {
    environment = var.environment
  }
}

run "apply_default_and_durable_function_app" {
  command = apply

  variables {
    environment           = merge(var.environment, { app_name = "intfn" })
    tags                  = var.tags
    resource_group_name   = run.setup.resource_group_name
    virtual_network       = run.setup.vnet
    subnet_pep_id         = run.setup.pep_id
    subnet_cidr           = run.setup.subnet_cidr
    action_group_ids      = [run.setup.action_group_appi_id]
    health_check_path     = "/health"
    app_settings          = {}
    slot_app_settings     = {}
    has_durable_functions = true
  }

  assert {
    condition     = azurerm_linux_function_app.this.https_only && azurerm_linux_function_app.this.public_network_access_enabled == false
    error_message = "The Function App must enforce HTTPS and disable public network access."
  }

  assert {
    condition     = azurerm_linux_function_app.this.identity[0].type == "SystemAssigned"
    error_message = "The Function App must have a system-assigned identity."
  }

  assert {
    condition     = azurerm_linux_function_app_slot.this[0].function_app_id == azurerm_linux_function_app.this.id
    error_message = "The staging slot must belong to the created Function App."
  }

  assert {
    condition     = azurerm_service_plan.this[0].sku_name == "P1v3"
    error_message = "The default use case must create a P1v3 App Service Plan."
  }

  assert {
    condition     = azurerm_subnet.this[0].address_prefixes == [run.setup.subnet_cidr] && azurerm_subnet.this[0].delegation[0].service_delegation[0].name == "Microsoft.Web/serverFarms"
    error_message = "The Function App subnet must use its allocated CIDR and the Microsoft.Web/serverFarms delegation."
  }

  assert {
    condition     = azurerm_storage_account.this.account_replication_type == "ZRS" && azurerm_storage_account.this.shared_access_key_enabled == false
    error_message = "The primary storage account must use ZRS replication and disable shared keys."
  }

  assert {
    condition     = azurerm_storage_account_network_rules.st_network_rules.default_action == "Deny"
    error_message = "The primary storage account must deny network access by default."
  }

  assert {
    condition     = length(azurerm_private_endpoint.st_blob) == 1 && length(azurerm_private_endpoint.st_file) == 1 && length(azurerm_private_endpoint.st_queue) == 1 && length(azurerm_private_endpoint.function_sites) == 1 && length(azurerm_private_endpoint.staging_function_sites) == 1
    error_message = "The default Function App must create private endpoints for storage, the app, and its staging slot."
  }

  assert {
    condition     = length(azurerm_monitor_metric_alert.function_app_health_check) == 1 && length(azurerm_monitor_metric_alert.storage_account_health_check) == 1
    error_message = "The default use case must create health alerts for the Function App and its storage account."
  }

  assert {
    condition     = contains([for action in azurerm_monitor_metric_alert.function_app_health_check[0].action : action.action_group_id], run.setup.action_group_appi_id)
    error_message = "The Function App health alert must use the configured Action Group."
  }

  assert {
    condition     = length(azurerm_role_assignment.function_storage_blob_data_owner) == 1 && length(azurerm_role_assignment.staging_function_storage_blob_data_owner) == 1
    error_message = "The Function App and staging slot identities must receive storage data access."
  }

  assert {
    condition     = length(azurerm_storage_account.durable_function) == 1
    error_message = "Durable Functions must create a dedicated storage account."
  }

  assert {
    condition     = azurerm_linux_function_app.this.app_settings["DfStorageConnectionName__accountname"] == azurerm_storage_account.durable_function[0].name
    error_message = "The Function App must be configured to use its Durable Functions storage account."
  }

  assert {
    condition     = length(azurerm_private_endpoint.std_blob) == 1 && length(azurerm_private_endpoint.std_file) == 1 && length(azurerm_private_endpoint.std_queue) == 1 && length(azurerm_private_endpoint.std_table) == 1
    error_message = "Durable Functions storage must have private endpoints for blob, file, queue, and table services."
  }

  assert {
    condition     = length(azurerm_role_assignment.durable_function_storage_blob_data_contributor) == 1 && length(azurerm_role_assignment.durable_function_storage_queue_data_contributor) == 1 && length(azurerm_role_assignment.durable_function_storage_table_data_contributor) == 1
    error_message = "The Function App identity must receive data access to Durable Functions storage."
  }

  assert {
    condition     = length(azurerm_role_assignment.staging_durable_function_storage_blob_data_contributor) == 1 && length(azurerm_role_assignment.staging_durable_function_storage_queue_data_contributor) == 1 && length(azurerm_role_assignment.staging_durable_function_storage_table_data_contributor) == 1
    error_message = "The staging slot identity must receive data access to Durable Functions storage."
  }
}
