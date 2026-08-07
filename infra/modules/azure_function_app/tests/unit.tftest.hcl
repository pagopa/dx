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
    ManagementTeam = "Developer Experience"
    Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_function_app/tests"
    Test           = "true"
    TestName       = "Azure Function App unit tests"
  }

  resource_group_name = "rg-test"
  virtual_network = {
    name                = "vnet-test"
    resource_group_name = "rg-network"
  }
  subnet_pep_id     = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-network/providers/Microsoft.Network/virtualNetworks/vnet-test/subnets/pep"
  subnet_cidr       = "10.50.80.0/24"
  health_check_path = "/health"
  app_settings      = {}
  slot_app_settings = {}
  action_group_ids  = ["/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Insights/actionGroups/ag-test"]
}

mock_provider "azurerm" {}

override_data {
  target = data.azurerm_virtual_network.this
  values = {
    id                  = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-network/providers/Microsoft.Network/virtualNetworks/vnet-test"
    name                = "vnet-test"
    resource_group_name = "rg-network"
  }
}

override_data {
  target = data.azurerm_private_dns_zone.storage_account_blob
  values = {
    id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-network/providers/Microsoft.Network/privateDnsZones/privatelink.blob.core.windows.net"
  }
}

override_data {
  target = data.azurerm_private_dns_zone.storage_account_file
  values = {
    id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-network/providers/Microsoft.Network/privateDnsZones/privatelink.file.core.windows.net"
  }
}

override_data {
  target = data.azurerm_private_dns_zone.storage_account_queue
  values = {
    id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-network/providers/Microsoft.Network/privateDnsZones/privatelink.queue.core.windows.net"
  }
}

override_data {
  target = data.azurerm_private_dns_zone.storage_account_table
  values = {
    id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-network/providers/Microsoft.Network/privateDnsZones/privatelink.table.core.windows.net"
  }
}

override_data {
  target = data.azurerm_private_dns_zone.function_app
  values = {
    id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-network/providers/Microsoft.Network/privateDnsZones/privatelink.azurewebsites.net"
  }
}

run "azure_function_app_default_configuration" {
  command = plan

  assert {
    condition     = azurerm_service_plan.this[0].sku_name == "P1v3"
    error_message = "The default use case must create a P1v3 App Service Plan."
  }

  assert {
    condition     = azurerm_linux_function_app.this.https_only && azurerm_linux_function_app_slot.this[0].https_only
    error_message = "The Function App and its staging slot must enforce HTTPS."
  }

  assert {
    condition     = azurerm_linux_function_app.this.site_config[0].application_stack[0].node_version == "22" && azurerm_linux_function_app_slot.this[0].site_config[0].application_stack[0].node_version == "22"
    error_message = "The Function App and its staging slot must use Node.js 22 by default."
  }

  assert {
    condition     = azurerm_linux_function_app.this.app_settings["SLOT_TASK_HUBNAME"] == "ProductionTaskHub" && azurerm_linux_function_app_slot.this[0].app_settings["SLOT_TASK_HUBNAME"] == "StagingTaskHub"
    error_message = "Production and staging slots must use distinct durable task hub names."
  }

  assert {
    condition     = length(azurerm_storage_account.durable_function) == 0 && length(azurerm_subnet.this) == 1
    error_message = "The default configuration must not create durable storage and must create the integration subnet."
  }
}

run "azure_function_app_external_subnet" {
  command = plan

  variables {
    subnet_cidr = null
    subnet_id   = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-network/providers/Microsoft.Network/virtualNetworks/vnet-test/subnets/functions"
  }

  assert {
    condition     = length(azurerm_subnet.this) == 0
    error_message = "An existing subnet must be used without creating an additional subnet."
  }
}

run "azure_function_app_durable_functions" {
  command = plan

  variables {
    has_durable_functions = true
  }

  assert {
    condition     = length(azurerm_storage_account.durable_function) == 1
    error_message = "Durable Functions must create their dedicated storage account."
  }

  assert {
    condition     = azurerm_linux_function_app.this.app_settings["DfStorageConnectionName__accountname"] == azurerm_storage_account.durable_function[0].name
    error_message = "The Function App must use the dedicated Durable Functions storage account."
  }
}

run "azure_function_app_custom_sku_and_runtime" {
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
    condition     = azurerm_linux_function_app.this.site_config[0].application_stack[0].node_version == "24" && azurerm_linux_function_app_slot.this[0].site_config[0].application_stack[0].node_version == "24"
    error_message = "An explicit Node.js version must be applied to both slots."
  }
}

run "azure_function_app_private_dns_overrides" {
  command = plan

  variables {
    private_dns_zone_ids = {
      blob          = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-dns/providers/Microsoft.Network/privateDnsZones/privatelink.blob.core.windows.net"
      file          = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-dns/providers/Microsoft.Network/privateDnsZones/privatelink.file.core.windows.net"
      queue         = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-dns/providers/Microsoft.Network/privateDnsZones/privatelink.queue.core.windows.net"
      table         = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-dns/providers/Microsoft.Network/privateDnsZones/privatelink.table.core.windows.net"
      azurewebsites = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-dns/providers/Microsoft.Network/privateDnsZones/privatelink.azurewebsites.net"
    }
  }

  assert {
    condition     = length(data.azurerm_private_dns_zone.storage_account_blob) == 0 && length(data.azurerm_private_dns_zone.function_app) == 0
    error_message = "Configured private DNS zone IDs must prevent data lookups."
  }

  assert {
    condition     = azurerm_private_endpoint.st_blob.private_dns_zone_group[0].private_dns_zone_ids[0] == "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-dns/providers/Microsoft.Network/privateDnsZones/privatelink.blob.core.windows.net"
    error_message = "The blob private endpoint must use the configured DNS zone ID."
  }
}

run "azure_function_app_diagnostics_and_entra_authentication" {
  command = plan

  variables {
    diagnostic_settings = {
      enabled                                   = true
      log_analytics_workspace_id                = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.OperationalInsights/workspaces/law-test"
      diagnostic_setting_destination_storage_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Storage/storageAccounts/sttest"
    }
    entra_id_authentication = {
      audience_client_id         = "00000000-0000-0000-0000-000000000001"
      allowed_callers_client_ids = ["00000000-0000-0000-0000-000000000002"]
      tenant_id                  = "00000000-0000-0000-0000-000000000003"
    }
  }

  assert {
    condition     = length(azurerm_monitor_diagnostic_setting.this) == 1
    error_message = "Diagnostic settings must be created when a destination is configured."
  }

  assert {
    condition     = azurerm_linux_function_app.this.auth_settings_v2[0].unauthenticated_action == "Return401"
    error_message = "Entra ID authentication must reject unauthenticated requests."
  }

  assert {
    condition     = output.entra_id_authentication.audience_client_id == "00000000-0000-0000-0000-000000000001"
    error_message = "The Entra ID audience client ID must be exposed in the output."
  }
}
