resource "azurerm_linux_function_app_slot" "this" {
  count = local.use_case_features.slot ? 1 : 0

  name            = local.function_app_slot.name
  function_app_id = azurerm_linux_function_app.this.id

  storage_account_name          = azurerm_storage_account.this.name
  storage_uses_managed_identity = true
  builtin_logging_enabled       = false

  https_only                    = true
  public_network_access_enabled = false
  virtual_network_subnet_id     = local.function_app.has_existing_subnet ? var.subnet_id : azurerm_subnet.this[0].id

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
    application_insights_key               = var.application_insights_key
    minimum_tls_version                    = var.tls_version

    container_registry_use_managed_identity = local.container.use_managed_identity

    application_stack {
      node_version = !local.container.enable && var.stack == "node" ? var.node_version : null
      java_version = !local.container.enable && var.stack == "java" ? var.java_version : null

      dynamic "docker" {
        for_each = local.container.enable ? [local.container] : []
        content {
          registry_url = docker.value.registry_url
          image_name   = docker.value.image_name
          image_tag    = docker.value.image_tag
        }
      }
    }
  }

  app_settings = merge(
    {
      # https://github.com/projectkudu/kudu/wiki/Configurable-settings#attempt-to-rename-dlls-if-they-cant-be-copied-during-a-webdeploy-deployment-1
      WEBSITE_ADD_SITENAME_BINDINGS_IN_APPHOST_CONFIG = 1
      # https://docs.microsoft.com/en-us/azure/virtual-network/what-is-ip-address-168-63-129-16
      WEBSITE_DNS_SERVER = "168.63.129.16"
      # https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference?tabs=blob&pivots=programming-language-csharp#connecting-to-host-storage-with-an-identity
      SLOT_TASK_HUBNAME = "StagingTaskHub",
      # https://learn.microsoft.com/en-us/azure/azure-functions/functions-app-settings#functions_worker_process_count
      FUNCTIONS_WORKER_PROCESS_COUNT = local.worker_process_count,
      # https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots?tabs=portal#specify-custom-warm-up
      WEBSITE_SWAP_WARMUP_PING_PATH     = var.health_check_path
      WEBSITE_SWAP_WARMUP_PING_STATUSES = "200,204"
      WEBSITE_WARMUP_PATH               = var.health_check_path
    },
    local.application_insights.enable ? {
      # AI SDK Sampling, to be used programmatically
      # https://docs.microsoft.com/en-us/azure/azure-monitor/app/sampling
      APPINSIGHTS_SAMPLING_PERCENTAGE = "100",

      # Azure Function Host (runtime) AI Sampling
      # https://learn.microsoft.com/en-us/azure/azure-functions/configure-monitoring?tabs=v2#overriding-monitoring-configuration-at-runtime
      AzureFunctionsJobHost__logging__applicationInsights__samplingSettings__minSamplingPercentage     = "100",
      AzureFunctionsJobHost__logging__applicationInsights__samplingSettings__maxSamplingPercentage     = "100",
      AzureFunctionsJobHost__logging__applicationInsights__samplingSettings__initialSamplingPercentage = "100"
    } : {},
    local.package_app_settings,
    # https://learn.microsoft.com/en-us/azure/azure-functions/errors-diagnostics/diagnostic-events/azfd0004#options-for-addressing-collisions
    length("${azurerm_linux_function_app.this.name}-${local.function_app_slot.name}") > 32 && !(contains(keys(var.slot_app_settings), "AzureFunctionsWebHost__hostid")) ? { AzureFunctionsWebHost__hostid = local.function_app_slot.name } : {},
    var.slot_app_settings,
    local.function_app.has_durable == 1 ? {
      #https://learn.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-storage-providers#hostjson-configuration
      DfStorageConnectionName__accountname                                                  = azurerm_storage_account.durable_function[0].name,
      AzureFunctionsJobHost__extensions__durableTask__hubName                               = "StagingTaskHub",
      AzureFunctionsJobHost__extensions__durableTask__storageProvider__connectionStringName = "DfStorageConnectionName"
    } : {},
  )

  dynamic "auth_settings_v2" {
    for_each = var.entra_id_authentication != null ? [var.entra_id_authentication] : []
    content {
      auth_enabled           = true
      require_authentication = true
      unauthenticated_action = "Return401"

      active_directory_v2 {
        allowed_applications = auth_settings_v2.value.allowed_callers_client_ids
        client_id            = auth_settings_v2.value.audience_client_id
        tenant_auth_endpoint = "https://login.microsoftonline.com/${auth_settings_v2.value.tenant_id}/v2.0"
      }

      login {
        token_store_enabled = false
      }
    }
  }

  lifecycle {
    ignore_changes = [
      site_config[0].health_check_eviction_time_in_min,
      # The image is not managed by Terraform, but instead updated by CD pipelines
      site_config[0].application_stack[0].docker,
      app_settings["WEBSITE_HEALTHCHECK_MAXPINGFAILURES"],
      tags["hidden-link: /app-insights-conn-string"],
      tags["hidden-link: /app-insights-instrumentation-key"],
      tags["hidden-link: /app-insights-resource-id"]
    ]
  }

  tags = local.tags
}
