locals {
  tags = merge(var.tags, { ModuleSource = "DX", ModuleVersion = try(jsondecode(file("${path.module}/module.json")).version, "unknown"), ModuleName = try(jsondecode(file("${path.module}/module.json")).name, basename(path.module)) })
  naming_config = {
    prefix          = var.environment.prefix,
    environment     = var.environment.env_short,
    location        = var.environment.location
    domain          = var.environment.domain,
    name            = var.environment.app_name,
    instance_number = tonumber(var.environment.instance_number),
  }

  # Defines the naming convention for APIM, dynamically handling cases where app_name
  # is not "apim" or a domain is specified, to avoid redundant naming logic.
  apim_name = local.naming_config.name != "apim" ? local.naming_config.name : ""

  apim = {
    name           = provider::dx::resource_name(merge(local.naming_config, { name = local.apim_name, resource_type = "api_management" }))
    pep_name       = local.use_case_features.private_endpoint ? provider::dx::resource_name(merge(local.naming_config, { name = local.apim_name, resource_type = "apim_private_endpoint" })) : null
    autoscale_name = local.use_case_features.autoscale ? provider::dx::resource_name(merge(local.naming_config, { name = local.apim_name, resource_type = "api_management_autoscale" })) : null

    log_category_groups = ["allLogs", "audit"]
    log_category_types  = ["DeveloperPortalAuditLogs", "GatewayLogs", "WebSocketConnectionLogs"]
  }

  use_cases = {
    development = {
      sku                                        = "Developer_1"
      virtual_network_type                       = "Internal"
      autoscale                                  = false
      alerts                                     = false
      private_endpoint                           = false
      zones                                      = null
      developer_portal_username_password_enabled = true
    }
    cost_optimized = {
      sku                                        = "StandardV2_1"
      virtual_network_type                       = "External"
      autoscale                                  = false
      alerts                                     = true
      private_endpoint                           = true
      zones                                      = null
      developer_portal_username_password_enabled = false
    }
    high_load = {
      sku                                        = "Premium_2"
      virtual_network_type                       = "Internal"
      autoscale                                  = true
      alerts                                     = true
      private_endpoint                           = false
      zones                                      = ["1", "2"]
      developer_portal_username_password_enabled = false
    }
  }

  use_case_features = local.use_cases[var.use_case]

  metric_namespace = "Microsoft.ApiManagement/service"

  alert_thresholds = {
    development = {
      sku                    = "Developer_1"
      total_requests         = 10000
      successful_requests    = 9500
      failed_requests        = 100
      unauthorized_requests  = 50
      duration               = 500
      capacity               = 80
      cpu_percent_gateway    = 80
      memory_percent_gateway = 80
    }
    cost_optimized = {
      sku                    = "StandardV2_1"
      total_requests         = 10000
      successful_requests    = 9500
      failed_requests        = 100
      unauthorized_requests  = 50
      duration               = 500
      capacity               = null
      cpu_percent_gateway    = 80
      memory_percent_gateway = 80
    }
    high_load = {
      sku                    = "Premium_2"
      total_requests         = 10000
      successful_requests    = 9500
      failed_requests        = 100
      unauthorized_requests  = 50
      duration               = 500
      capacity               = 80
      cpu_percent_gateway    = null
      memory_percent_gateway = null
    }
  }

  request_metric_alerts = {
    for use_case, thresholds in local.alert_thresholds : use_case => {
      total_requests = {
        description      = "The total number of gateway requests is above the expected threshold. Monitor traffic and scale appropriately."
        frequency        = "PT5M"
        window_size      = "PT5M"
        severity         = 2
        auto_mitigate    = false
        dynamic_criteria = []
        criteria = [{
          aggregation            = "Total"
          dimension              = []
          metric_name            = "Requests"
          metric_namespace       = local.metric_namespace
          operator               = "GreaterThan"
          skip_metric_validation = false
          threshold              = thresholds.total_requests
        }]
      }
      successful_requests = {
        description      = "The number of successful gateway requests is above the expected threshold. Ensure the success rate aligns with traffic volume."
        frequency        = "PT5M"
        window_size      = "PT5M"
        severity         = 2
        auto_mitigate    = false
        dynamic_criteria = []
        criteria = [{
          aggregation = "Total"
          dimension = [{
            name     = "GatewayResponseCodeCategory"
            operator = "Include"
            values   = ["2xx", "3xx"]
          }]
          metric_name            = "Requests"
          metric_namespace       = local.metric_namespace
          operator               = "GreaterThan"
          skip_metric_validation = false
          threshold              = thresholds.successful_requests
        }]
      }
      failed_requests = {
        description      = "The number of server-side failed gateway requests is above the expected threshold. Investigate backend or configuration issues."
        frequency        = "PT5M"
        window_size      = "PT5M"
        severity         = 2
        auto_mitigate    = false
        dynamic_criteria = []
        criteria = [{
          aggregation = "Total"
          dimension = [{
            name     = "GatewayResponseCodeCategory"
            operator = "Include"
            values   = ["5xx"]
          }]
          metric_name            = "Requests"
          metric_namespace       = local.metric_namespace
          operator               = "GreaterThan"
          skip_metric_validation = false
          threshold              = thresholds.failed_requests
        }]
      }
      unauthorized_requests = {
        description      = "The number of unauthorized gateway requests is above the expected threshold. Check authentication policies and tokens."
        frequency        = "PT5M"
        window_size      = "PT5M"
        severity         = 2
        auto_mitigate    = false
        dynamic_criteria = []
        criteria = [{
          aggregation = "Total"
          dimension = [{
            name     = "GatewayResponseCode"
            operator = "Include"
            values   = ["401", "403"]
          }]
          metric_name            = "Requests"
          metric_namespace       = local.metric_namespace
          operator               = "GreaterThan"
          skip_metric_validation = false
          threshold              = thresholds.unauthorized_requests
        }]
      }
    }
  }

  default_metric_alerts = {
    development = {}
    cost_optimized = merge(local.request_metric_alerts.cost_optimized, {
      response_time = {
        description      = "The average gateway request duration is above the expected threshold. Optimize backend services or caching."
        frequency        = "PT5M"
        window_size      = "PT5M"
        severity         = 2
        auto_mitigate    = false
        dynamic_criteria = []
        criteria = [{
          aggregation            = "Average"
          dimension              = []
          metric_name            = "Duration"
          metric_namespace       = local.metric_namespace
          operator               = "GreaterThan"
          skip_metric_validation = false
          threshold              = local.alert_thresholds.cost_optimized.duration
        }]
      }
      cpu_percent_gateway = {
        description      = "The average gateway CPU utilization is above the expected threshold. Consider scaling the API Management service."
        frequency        = "PT5M"
        window_size      = "PT5M"
        severity         = 2
        auto_mitigate    = false
        dynamic_criteria = []
        criteria = [{
          aggregation            = "Average"
          dimension              = []
          metric_name            = "CpuPercent_Gateway"
          metric_namespace       = local.metric_namespace
          operator               = "GreaterThan"
          skip_metric_validation = false
          threshold              = local.alert_thresholds.cost_optimized.cpu_percent_gateway
        }]
      }
      memory_percent_gateway = {
        description      = "The average gateway memory utilization is above the expected threshold. Consider scaling the API Management service."
        frequency        = "PT5M"
        window_size      = "PT5M"
        severity         = 2
        auto_mitigate    = false
        dynamic_criteria = []
        criteria = [{
          aggregation            = "Average"
          dimension              = []
          metric_name            = "MemoryPercent_Gateway"
          metric_namespace       = local.metric_namespace
          operator               = "GreaterThan"
          skip_metric_validation = false
          threshold              = local.alert_thresholds.cost_optimized.memory_percent_gateway
        }]
      }
    })
    high_load = merge(local.request_metric_alerts.high_load, {
      response_time = {
        description      = "The average gateway request duration is above the expected threshold. Optimize backend services or caching."
        frequency        = "PT5M"
        window_size      = "PT5M"
        severity         = 2
        auto_mitigate    = false
        dynamic_criteria = []
        criteria = [{
          aggregation            = "Average"
          dimension              = []
          metric_name            = "Duration"
          metric_namespace       = local.metric_namespace
          operator               = "GreaterThan"
          skip_metric_validation = false
          threshold              = local.alert_thresholds.high_load.duration
        }]
      }
      capacity = {
        description      = "The average API Management capacity is above the expected threshold. Consider scaling or upgrading the tier."
        frequency        = "PT5M"
        window_size      = "PT5M"
        severity         = 2
        auto_mitigate    = false
        dynamic_criteria = []
        criteria = [{
          aggregation            = "Average"
          dimension              = []
          metric_name            = "Capacity"
          metric_namespace       = local.metric_namespace
          operator               = "GreaterThan"
          skip_metric_validation = false
          threshold              = local.alert_thresholds.high_load.capacity
        }]
      }
    })
  }

  metric_alerts = var.metric_alerts != null ? var.metric_alerts : local.default_metric_alerts[var.use_case]

  virtual_network_type                  = var.virtual_network_type_internal != null ? (var.virtual_network_type_internal ? "Internal" : "None") : local.use_case_features.virtual_network_type
  virtual_network_configuration_enabled = local.virtual_network_type == "Internal" || var.use_case == "cost_optimized" ? true : false
  public_network                        = var.enable_public_network_access
  private_dns_zone_resource_group_name  = var.private_dns_zone_resource_group_name != null ? var.private_dns_zone_resource_group_name : data.azurerm_virtual_network.this.resource_group_name

  # Private DNS Zone IDs - merges overrides with data source lookups
  private_dns_zone_ids = {
    azure_api_net             = var.private_dns_zone_ids != null && var.private_dns_zone_ids.azure_api_net != null ? var.private_dns_zone_ids.azure_api_net : data.azurerm_private_dns_zone.azure_api_net[0].id
    management_azure_api_net  = var.private_dns_zone_ids != null && var.private_dns_zone_ids.management_azure_api_net != null ? var.private_dns_zone_ids.management_azure_api_net : data.azurerm_private_dns_zone.management_azure_api_net[0].id
    scm_azure_api_net         = var.private_dns_zone_ids != null && var.private_dns_zone_ids.scm_azure_api_net != null ? var.private_dns_zone_ids.scm_azure_api_net : data.azurerm_private_dns_zone.scm_azure_api_net[0].id
    privatelink_azure_api_net = var.private_dns_zone_ids != null && var.private_dns_zone_ids.privatelink_azure_api_net != null ? var.private_dns_zone_ids.privatelink_azure_api_net : (local.use_case_features.private_endpoint ? data.azurerm_private_dns_zone.apim[0].id : null)
  }

  # Calculate zone multiplier for autoscale defaults
  zone_multiplier = local.use_case_features.zones != null ? length(local.use_case_features.zones) : 1

  # Autoscale configuration with zone-aware defaults
  autoscale_config = {
    minimum_instances             = coalesce(try(var.autoscale.minimum_instances, null), local.zone_multiplier)
    default_instances             = coalesce(try(var.autoscale.default_instances, null), local.zone_multiplier)
    maximum_instances             = coalesce(try(var.autoscale.maximum_instances, null), 5 * local.zone_multiplier)
    scale_out_capacity_percentage = coalesce(try(var.autoscale.scale_out_capacity_percentage, null), 60)
    scale_out_time_window         = coalesce(try(var.autoscale.scale_out_time_window, null), "PT10M")
    scale_out_value               = coalesce(try(var.autoscale.scale_out_value, null), tostring(local.zone_multiplier))
    scale_out_cooldown            = coalesce(try(var.autoscale.scale_out_cooldown, null), "PT45M")
    scale_in_capacity_percentage  = coalesce(try(var.autoscale.scale_in_capacity_percentage, null), 30)
    scale_in_time_window          = coalesce(try(var.autoscale.scale_in_time_window, null), "PT30M")
    scale_in_value                = coalesce(try(var.autoscale.scale_in_value, null), tostring(local.zone_multiplier))
    scale_in_cooldown             = coalesce(try(var.autoscale.scale_in_cooldown, null), "PT30M")
  }
}
