resource "azurerm_service_plan" "this" {
  name                   = "${local.project}-${var.domain}-${var.app_name}-asp-${var.instance_number}"
  location               = var.location
  resource_group_name    = var.resource_group_name
  os_type                = "Linux"
  sku_name               = local.sku_name
  zone_balancing_enabled = local.zone_balancing_enabled

  tags = var.tags
}

resource "azurerm_linux_function_app" "this" {
  name                = "${local.project}-${var.domain}-${var.app_name}-func-${var.instance_number}"
  location            = var.location
  resource_group_name = var.resource_group_name

  service_plan_id = azurerm_service_plan.this.id

  storage_account_name          = azurerm_storage_account.this.name
  storage_uses_managed_identity = true

  https_only                    = true
  public_network_access_enabled = false
  virtual_network_subnet_id     = azurerm_subnet.this.id

  identity {
    type = "SystemAssigned"
  }

  site_config {
    http2_enabled                          = true
    always_on                              = true
    vnet_route_all_enabled                 = true
    application_insights_connection_string = var.application_insights_connection_string
    health_check_path                      = var.health_check_path
    health_check_eviction_time_in_min      = 2
    ip_restriction_default_action          = "Deny"

    application_stack {
      node_version = var.node_version
    }
  }

  app_settings = merge(
    {
      # https://github.com/projectkudu/kudu/wiki/Configurable-settings#attempt-to-rename-dlls-if-they-cant-be-copied-during-a-webdeploy-deployment-1
      WEBSITE_ADD_SITENAME_BINDINGS_IN_APPHOST_CONFIG = 1
      # https://learn.microsoft.com/en-us/azure/azure-functions/run-functions-from-deployment-package#using-website_run_from_package--1
      WEBSITE_RUN_FROM_PACKAGE = 1
      # https://docs.microsoft.com/en-us/azure/virtual-network/what-is-ip-address-168-63-129-16
      WEBSITE_DNS_SERVER = "168.63.129.16"
      # https://docs.microsoft.com/en-us/azure/azure-monitor/app/sampling
      APPINSIGHTS_SAMPLING_PERCENTAGE = var.ai_sampling_percentage
      # https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference?tabs=blob&pivots=programming-language-csharp#connecting-to-host-storage-with-an-identity
      AzureWebJobsStorage__accountName = azurerm_storage_account.this.name
      SLOT_TASK_HUBNAME                = "ProductionTaskHub"
    },
    var.app_settings
  )

  sticky_settings {
    app_setting_names = concat(
      ["SLOT_TASK_HUBNAME"],
      var.sticky_app_setting_names,
    )
  }

  lifecycle {
    ignore_changes = [
      app_settings["WEBSITE_HEALTHCHECK_MAXPINGFAILURES"],
      tags["hidden-link: /app-insights-conn-string"],
      tags["hidden-link: /app-insights-instrumentation-key"],
      tags["hidden-link: /app-insights-resource-id"]
    ]
  }

  tags = var.tags

  depends_on = [
    azurerm_private_endpoint.blob,
    azurerm_private_endpoint.file
  ]
}

resource "azurerm_linux_function_app_slot" "this" {
  name            = "${local.project}-${var.domain}-${var.app_name}-staging-func-${var.instance_number}"
  function_app_id = azurerm_linux_function_app.this.id

  storage_account_name          = azurerm_storage_account.this.name
  storage_uses_managed_identity = true

  https_only                    = true
  public_network_access_enabled = false
  virtual_network_subnet_id     = azurerm_subnet.this.id

  identity {
    type = "SystemAssigned"
  }

  site_config {
    http2_enabled                          = true
    always_on                              = true
    vnet_route_all_enabled                 = true
    application_insights_connection_string = var.application_insights_connection_string
    health_check_path                      = var.health_check_path
    health_check_eviction_time_in_min      = 2
    ip_restriction_default_action          = "Deny"

    application_stack {
      node_version = var.node_version
    }
  }

  app_settings = merge(
    {
      # https://github.com/projectkudu/kudu/wiki/Configurable-settings#attempt-to-rename-dlls-if-they-cant-be-copied-during-a-webdeploy-deployment-1
      WEBSITE_ADD_SITENAME_BINDINGS_IN_APPHOST_CONFIG = 1
      # https://learn.microsoft.com/en-us/azure/azure-functions/run-functions-from-deployment-package#using-website_run_from_package--1
      WEBSITE_RUN_FROM_PACKAGE = 1
      # https://docs.microsoft.com/en-us/azure/virtual-network/what-is-ip-address-168-63-129-16
      WEBSITE_DNS_SERVER = "168.63.129.16"
      # https://docs.microsoft.com/en-us/azure/azure-monitor/app/sampling
      APPINSIGHTS_SAMPLING_PERCENTAGE = var.ai_sampling_percentage
      # https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference?tabs=blob&pivots=programming-language-csharp#connecting-to-host-storage-with-an-identity
      AzureWebJobsStorage__accountName = azurerm_storage_account.this.name
      SLOT_TASK_HUBNAME                = "StagingTaskHub"
    },
    var.app_settings
  )

  lifecycle {
    ignore_changes = [
      app_settings["WEBSITE_HEALTHCHECK_MAXPINGFAILURES"],
      tags["hidden-link: /app-insights-conn-string"],
      tags["hidden-link: /app-insights-instrumentation-key"],
      tags["hidden-link: /app-insights-resource-id"]
    ]
  }

  tags = var.tags
}

resource "azurerm_role_assignment" "function_storage_blob_data_owner" {
  scope                = azurerm_storage_account.this.id
  role_definition_name = "Storage Blob Data Owner"
  principal_id         = azurerm_linux_function_app.this.identity[0].principal_id
}

resource "azurerm_role_assignment" "staging_function_storage_blob_data_owner" {
  scope                = azurerm_storage_account.this.id
  role_definition_name = "Storage Blob Data Owner"
  principal_id         = azurerm_linux_function_app_slot.this.identity[0].principal_id
}

resource "azurerm_role_assignment" "function_storage_account_contributor" {
  scope                = azurerm_storage_account.this.id
  role_definition_name = "Storage Account Contributor"
  principal_id         = azurerm_linux_function_app.this.identity[0].principal_id
}

resource "azurerm_role_assignment" "staging_function_storage_account_contributor" {
  scope                = azurerm_storage_account.this.id
  role_definition_name = "Storage Account Contributor"
  principal_id         = azurerm_linux_function_app_slot.this.identity[0].principal_id
}

resource "azurerm_role_assignment" "function_storage_queue_data_contributor" {
  scope                = azurerm_storage_account.this.id
  role_definition_name = "Storage Queue Data Contributor"
  principal_id         = azurerm_linux_function_app.this.identity[0].principal_id
}

resource "azurerm_role_assignment" "staging_function_storage_queue_data_contributor" {
  scope                = azurerm_storage_account.this.id
  role_definition_name = "Storage Queue Data Contributor"
  principal_id         = azurerm_linux_function_app_slot.this.identity[0].principal_id
}
