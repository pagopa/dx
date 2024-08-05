resource "azurerm_linux_function_app" "this" {
  name                = local.function_app.name
  location            = var.environment.location
  resource_group_name = var.resource_group_name

  service_plan_id = local.app_service_plan.enable ? azurerm_service_plan.this[0].id : var.app_service_plan_id

  storage_account_name          = azurerm_storage_account.this.name
  storage_uses_managed_identity = true
  builtin_logging_enabled       = false

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
    application_insights_connection_string = local.application_insights.enable ? var.application_insights_connection_string : null
    health_check_path                      = var.health_check_path
    health_check_eviction_time_in_min      = 2
    ip_restriction_default_action          = "Deny"

    application_stack {
      node_version = var.stack == "node" ? var.node_version : null
      java_version = var.stack == "java" ? var.java_version : null
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
      # https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference?tabs=blob&pivots=programming-language-csharp#connecting-to-host-storage-with-an-identity
      SLOT_TASK_HUBNAME = "ProductionTaskHub",
    },
    # https://learn.microsoft.com/en-us/azure/azure-functions/errors-diagnostics/diagnostic-events/azfd0004#options-for-addressing-collisions
    length(local.function_app.name) > 32 && !(contains(keys(var.app_settings), "AzureFunctionsWebHost__hostid")) ? { AzureFunctionsWebHost__hostid = "production" } : {},
    var.app_settings,
    local.application_insights.enable ? {
      # https://docs.microsoft.com/en-us/azure/azure-monitor/app/sampling
      APPINSIGHTS_SAMPLING_PERCENTAGE = var.application_insights_sampling_percentage
    } : {}
  )

  sticky_settings {
    app_setting_names = concat(
      [
        "SLOT_TASK_HUBNAME",
        "APPINSIGHTS_SAMPLING_PERCENTAGE",
        "AzureFunctionsWebHost__hostid"
      ],
      var.sticky_app_setting_names,
    )
  }

  depends_on = [
    azurerm_private_endpoint.st_blob,
    azurerm_private_endpoint.st_file,
    azurerm_private_endpoint.st_queue,
  ]

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
