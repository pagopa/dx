resource "azurerm_linux_web_app_slot" "this" {
  count = local.app_service.is_slot_enabled

  name = local.app_service_slot.name

  app_service_id = azurerm_linux_web_app.this.id

  https_only                    = true
  public_network_access_enabled = false
  virtual_network_subnet_id     = local.app_service.has_existing_subnet ? var.subnet_id : azurerm_subnet.this[0].id

  identity {
    type = "SystemAssigned"
  }

  site_config {
    http2_enabled                     = true
    always_on                         = true
    vnet_route_all_enabled            = true
    health_check_path                 = var.health_check_path
    health_check_eviction_time_in_min = 2
    ip_restriction_default_action     = "Deny"

    application_stack {
      node_version        = var.stack == "node" ? "${var.node_version}-lts" : null
      java_version        = var.stack == "java" ? var.java_version : null
      java_server         = var.stack == "java" ? "JAVA" : null
      java_server_version = var.stack == "java" ? var.java_version : null
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
      # https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots?tabs=portal#specify-custom-warm-up
      WEBSITE_SWAP_WARMUP_PING_PATH     = var.health_check_path
      WEBSITE_SWAP_WARMUP_PING_STATUSES = "200,204"
      WEBSITE_WARMUP_PATH               = var.health_check_path
    },
    var.slot_app_settings,
    local.application_insights.enable ? {
      # https://learn.microsoft.com/en-us/azure/azure-functions/functions-app-settings#applicationinsights_connection_string
      APPLICATIONINSIGHTS_CONNECTION_STRING = var.application_insights_connection_string
      # https://docs.microsoft.com/en-us/azure/azure-monitor/app/sampling
      APPINSIGHTS_SAMPLING_PERCENTAGE = var.application_insights_sampling_percentage
    } : {}
  )

  lifecycle {
    ignore_changes = [
      app_settings["WEBSITE_HEALTHCHECK_MAXPINGFAILURES"],
      tags["hidden-link: /app-insights-conn-string"],
      tags["hidden-link: /app-insights-instrumentation-key"],
      tags["hidden-link: /app-insights-resource-id"]
    ]
  }

  tags = local.tags
}
