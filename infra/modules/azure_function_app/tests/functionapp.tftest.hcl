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
    BusinessUnit   = "DevEx"
    Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_function_app/tests"
    ManagementTeam = "Developer Experience"
    Test           = "true"
    TestName       = "Create a function app for test"
  }

  resource_group_name = run.setup_tests.resource_group_name

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
  action_group_ids = [
    run.setup_tests.action_group_appi_id
  ]
}

run "function_app_is_correct_plan" {
  command = plan

  variables {
    use_case = "default"
  }

  # Checks some assertions
  assert {
    condition     = azurerm_service_plan.this[0].sku_name == "P1v3"
    error_message = "The App Service Plan is incorrect, have to be P1v3"
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
    condition     = azurerm_linux_function_app.this.site_config[0].minimum_tls_version == "1.2"
    error_message = "The Function App must use TLS version 1.2"
  }

  assert {
    condition     = azurerm_linux_function_app_slot.this[0].site_config[0].application_stack[0].node_version == "20"
    error_message = "The Function App staging slot must use Node version 20"
  }

  assert {
    condition     = azurerm_linux_function_app_slot.this[0].site_config[0].minimum_tls_version == "1.2"
    error_message = "The Function App staging slot must use TLS version 1.2"
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
    condition     = azurerm_storage_account.durable_function == []
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

  assert {
    condition     = contains([for action in azurerm_monitor_metric_alert.function_app_health_check[0].action : action.action_group_id], run.setup_tests.action_group_appi_id)
    error_message = "The alert group should be set"
  }

  assert {
    condition     = contains([for action in azurerm_monitor_metric_alert.storage_account_health_check[0].action : action.action_group_id], run.setup_tests.action_group_appi_id)
    error_message = "The alert group should be set"
  }
}

run "function_app_custom_subnet" {
  command = plan

  variables {
    use_case    = "default"
    subnet_cidr = null
    subnet_id   = run.setup_tests.pep_id
  }

  assert {
    condition     = azurerm_subnet.this == []
    error_message = "Subnet should not be created"
  }
}

run "function_app_ai_instrumentation_key" {
  command = plan

  variables {
    use_case = "default"

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
    use_case = "default"

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

run "function_app_override_size" {
  command = plan

  variables {
    use_case = "default"
    size     = "P3mv3"
  }

  assert {
    condition     = azurerm_service_plan.this[0].sku_name == "P3mv3"
    error_message = "The Function App Plan is incorrect, have to be P3mv3"
  }
}

run "function_app_override_size_fail" {
  command = plan

  variables {
    use_case = "default"
    size     = "B1"
  }

  expect_failures = [
    var.size,
  ]
}

run "function_app_without_dns_zone_override" {
  command = plan

  variables {
    use_case = "default"
  }

  assert {
    condition     = length(data.azurerm_private_dns_zone.storage_account_blob) == 1
    error_message = "storage_account_blob data source should be created when no override is provided"
  }

  assert {
    condition     = length(data.azurerm_private_dns_zone.storage_account_file) == 1
    error_message = "storage_account_file data source should be created when no override is provided"
  }

  assert {
    condition     = length(data.azurerm_private_dns_zone.storage_account_queue) == 1
    error_message = "storage_account_queue data source should be created when no override is provided"
  }

  assert {
    condition     = length(data.azurerm_private_dns_zone.storage_account_table) == 0
    error_message = "storage_account_table data source should not be created when durable functions are disabled"
  }

  assert {
    condition     = length(data.azurerm_private_dns_zone.function_app) == 1
    error_message = "function_app data source should be created when no override is provided"
  }

  # Verify that private endpoints use the data source IDs
  assert {
    condition     = azurerm_private_endpoint.st_blob.private_dns_zone_group[0].private_dns_zone_ids[0] == data.azurerm_private_dns_zone.storage_account_blob[0].id
    error_message = "st_blob private endpoint should use the data source DNS zone ID"
  }

  assert {
    condition     = azurerm_private_endpoint.st_file.private_dns_zone_group[0].private_dns_zone_ids[0] == data.azurerm_private_dns_zone.storage_account_file[0].id
    error_message = "st_file private endpoint should use the data source DNS zone ID"
  }

  assert {
    condition     = azurerm_private_endpoint.function_sites.private_dns_zone_group[0].private_dns_zone_ids[0] == data.azurerm_private_dns_zone.function_app[0].id
    error_message = "function_sites private endpoint should use the data source DNS zone ID"
  }
}

run "function_app_with_dns_zone_override" {
  command = plan

  variables {
    use_case = "default"

    # Override all DNS zone IDs
    private_dns_zone_ids = {
      blob          = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-dns/providers/Microsoft.Network/privateDnsZones/privatelink.blob.core.windows.net"
      file          = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-dns/providers/Microsoft.Network/privateDnsZones/privatelink.file.core.windows.net"
      queue         = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-dns/providers/Microsoft.Network/privateDnsZones/privatelink.queue.core.windows.net"
      table         = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-dns/providers/Microsoft.Network/privateDnsZones/privatelink.table.core.windows.net"
      azurewebsites = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-dns/providers/Microsoft.Network/privateDnsZones/privatelink.azurewebsites.net"
    }
  }

  # Verify that data sources are NOT created (count = 0)
  assert {
    condition     = length(data.azurerm_private_dns_zone.storage_account_blob) == 0
    error_message = "storage_account_blob data source should not be created when override is provided"
  }

  assert {
    condition     = length(data.azurerm_private_dns_zone.storage_account_file) == 0
    error_message = "storage_account_file data source should not be created when override is provided"
  }

  assert {
    condition     = length(data.azurerm_private_dns_zone.storage_account_queue) == 0
    error_message = "storage_account_queue data source should not be created when override is provided"
  }

  assert {
    condition     = length(data.azurerm_private_dns_zone.storage_account_table) == 0
    error_message = "storage_account_table data source should not be created when override is provided (even without durable)"
  }

  assert {
    condition     = length(data.azurerm_private_dns_zone.function_app) == 0
    error_message = "function_app data source should not be created when override is provided"
  }

  # Verify that private endpoints use the override IDs
  assert {
    condition     = azurerm_private_endpoint.st_blob.private_dns_zone_group[0].private_dns_zone_ids[0] == "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-dns/providers/Microsoft.Network/privateDnsZones/privatelink.blob.core.windows.net"
    error_message = "st_blob private endpoint should use the override DNS zone ID"
  }

  assert {
    condition     = azurerm_private_endpoint.st_file.private_dns_zone_group[0].private_dns_zone_ids[0] == "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-dns/providers/Microsoft.Network/privateDnsZones/privatelink.file.core.windows.net"
    error_message = "st_file private endpoint should use the override DNS zone ID"
  }

  assert {
    condition     = azurerm_private_endpoint.function_sites.private_dns_zone_group[0].private_dns_zone_ids[0] == "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-dns/providers/Microsoft.Network/privateDnsZones/privatelink.azurewebsites.net"
    error_message = "function_sites private endpoint should use the override DNS zone ID"
  }
}

run "function_app_with_partial_dns_zone_override" {
  command = plan

  variables {
    use_case = "default"

    # Override only some DNS zone IDs
    private_dns_zone_ids = {
      blob = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-dns/providers/Microsoft.Network/privateDnsZones/privatelink.blob.core.windows.net"
      file = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-dns/providers/Microsoft.Network/privateDnsZones/privatelink.file.core.windows.net"
      # queue, table, azurewebsites are not overridden (null)
    }
  }

  # Verify partial override: blob and file should not create data sources
  assert {
    condition     = length(data.azurerm_private_dns_zone.storage_account_blob) == 0
    error_message = "storage_account_blob data source should not be created when override is provided"
  }

  assert {
    condition     = length(data.azurerm_private_dns_zone.storage_account_file) == 0
    error_message = "storage_account_file data source should not be created when override is provided"
  }

  # queue and function_app should create data sources
  assert {
    condition     = length(data.azurerm_private_dns_zone.storage_account_queue) == 1
    error_message = "storage_account_queue data source should be created when no override is provided"
  }

  assert {
    condition     = length(data.azurerm_private_dns_zone.function_app) == 1
    error_message = "function_app data source should be created when no override is provided"
  }

  # Verify mixed usage
  assert {
    condition     = azurerm_private_endpoint.st_blob.private_dns_zone_group[0].private_dns_zone_ids[0] == "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-dns/providers/Microsoft.Network/privateDnsZones/privatelink.blob.core.windows.net"
    error_message = "st_blob private endpoint should use the override DNS zone ID"
  }

  assert {
    condition     = azurerm_private_endpoint.st_queue.private_dns_zone_group[0].private_dns_zone_ids[0] == data.azurerm_private_dns_zone.storage_account_queue[0].id
    error_message = "st_queue private endpoint should use the data source DNS zone ID"
  }
}
