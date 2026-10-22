# trivy:ignore:AZU-0001 App service does not have client certificates enabled
# trivy:ignore:AZU-0003 App service does not have authentication enabled
# trivy:ignore:AZU-0006 App service does not require a secure TLS version
resource "azurerm_linux_web_app" "this" {
  name                = local.app_service.name
  location            = var.environment.location
  resource_group_name = var.resource_group_name

  service_plan_id = local.app_service_plan.enable ? azurerm_service_plan.this[0].id : var.app_service_plan_id

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
    minimum_tls_version               = var.tls_version

    container_registry_use_managed_identity = local.container.use_acr

    application_stack {
      node_version        = !local.container.enable && var.stack == "node" ? "${var.node_version}-lts" : null
      java_version        = !local.container.enable && var.stack == "java" ? var.java_version : null
      java_server         = !local.container.enable && var.stack == "java" ? "JAVA" : null
      java_server_version = !local.container.enable && var.stack == "java" ? var.java_version : null
      docker_registry_url = local.container.registry_url
      docker_image_name   = local.container.image_name
    }
  }

  app_settings = merge(
    {
      # https://github.com/projectkudu/kudu/wiki/Configurable-settings#attempt-to-rename-dlls-if-they-cant-be-copied-during-a-webdeploy-deployment-1
      WEBSITE_ADD_SITENAME_BINDINGS_IN_APPHOST_CONFIG = 1
      # https://docs.microsoft.com/en-us/azure/virtual-network/what-is-ip-address-168-63-129-16
      WEBSITE_DNS_SERVER = "168.63.129.16"
      # https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots?tabs=portal#specify-custom-warm-up
      WEBSITE_SWAP_WARMUP_PING_PATH     = var.health_check_path
      WEBSITE_SWAP_WARMUP_PING_STATUSES = "200,204"
      WEBSITE_WARMUP_PATH               = var.health_check_path
    },
    local.package_app_settings,
    var.app_settings,
    local.application_insights.enable ? {
      # https://learn.microsoft.com/en-us/azure/azure-functions/functions-app-settings#applicationinsights_connection_string
      APPLICATIONINSIGHTS_CONNECTION_STRING = var.application_insights_connection_string
      # https://docs.microsoft.com/en-us/azure/azure-monitor/app/sampling
      APPINSIGHTS_SAMPLING_PERCENTAGE = var.application_insights_sampling_percentage
    } : {}
  )

  dynamic "sticky_settings" {
    for_each = length(var.sticky_app_setting_names) == 0 ? [] : [1]
    content {
      app_setting_names = var.sticky_app_setting_names
    }
  }

  lifecycle {
    ignore_changes = [
      # The image is not managed by Terraform, but instead updated by CD pipelines
      site_config[0].application_stack[0].docker_registry_url,
      site_config[0].application_stack[0].docker_image_name,
      app_settings["WEBSITE_HEALTHCHECK_MAXPINGFAILURES"],
      tags["hidden-link: /app-insights-conn-string"],
      tags["hidden-link: /app-insights-instrumentation-key"],
      tags["hidden-link: /app-insights-resource-id"]
    ]
  }

  tags = local.tags
}
