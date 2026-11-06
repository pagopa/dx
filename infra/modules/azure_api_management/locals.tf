locals {
  tags      = merge(var.tags, { ModuleSource = "DX", ModuleVersion = try(jsondecode(file("${path.module}/module.json")).version, "unknown"), ModuleName = try(jsondecode(file("${path.module}/project.json")).name, "unknown") })
  apim_name = var.environment.app_name != "apim" ? var.environment.app_name : ""

  apim = {
    name           = provider::dx::resource_name(merge(var.environment, { app_name = local.apim_name, resource_type = "api_management" }))
    pep_name       = local.use_case_features.private_endpoint ? provider::dx::resource_name(merge(var.environment, { app_name = local.apim_name, resource_type = "apim_private_endpoint" })) : null
    public_ip_name = local.use_case_features.public_ip ? provider::dx::resource_name(merge(var.environment, { app_name = local.apim_name, resource_type = "public_ip" })) : null
    autoscale_name = local.use_case_features.autoscale ? provider::dx::resource_name(merge(var.environment, { app_name = local.apim_name, resource_type = "api_management_autoscale" })) : null

  }

  use_cases = {
    development = {
      sku                                        = "Developer_1"
      virtual_network_type                       = "Internal"
      autoscale                                  = false
      alerts                                     = false
      private_endpoint                           = false
      zones                                      = null
      public_network_access_enabled              = true
      public_ip                                  = false
      monitoring                                 = false
      lock                                       = false
      developer_portal_username_password_enabled = true
    }
    cost_optimized = {
      sku                                        = "StandardV2_1"
      virtual_network_type                       = "External"
      autoscale                                  = false
      alerts                                     = true
      private_endpoint                           = true
      zones                                      = null
      public_network_access_enabled              = false
      public_ip                                  = false
      monitoring                                 = true
      lock                                       = true
      developer_portal_username_password_enabled = false
    }
    high_load = {
      sku                                        = "Premium_2"
      virtual_network_type                       = "Internal"
      autoscale                                  = true
      alerts                                     = true
      private_endpoint                           = false
      zones                                      = ["1", "2"]
      public_network_access_enabled              = true
      public_ip                                  = true # APIM is still internal, but the public IP is multi zone
      monitoring                                 = true
      lock                                       = true
      developer_portal_username_password_enabled = false
    }
  }

  use_case_features = local.use_cases[var.use_case]

  virtual_network_type                 = local.use_case_features.virtual_network_type
  virtual_network_id                   = provider::azurerm::normalise_resource_id(var.virtual_network)
  virtual_network                      = provider::azurerm::parse_resource_id(local.virtual_network_id)
  virtual_network_name                 = local.virtual_network.resource_name
  virtual_network_resource_group_name  = local.virtual_network.resource_group_name
  private_dns_zone_resource_group_name = coalesce(var.private_dns_zone_resource_group_name, local.virtual_network_resource_group_name)
  private_dns_zone_id                  = provider::azurerm::normalise_resource_id("/subscriptions/${local.virtual_network.subscription_id}/resourceGroups/${local.private_dns_zone_resource_group_name}/providers/Microsoft.Network/privateDnsZones/privatelink.azure-api.net")
  private_dns_zone_ids = {
    for key, zone_name in {
      azure_api_net            = "azure-api.net"
      management_azure_api_net = "management.azure-api.net"
      scm_azure_api_net        = "scm.azure-api.net"
    } : key => provider::azurerm::normalise_resource_id("/subscriptions/${local.virtual_network.subscription_id}/resourceGroups/${local.private_dns_zone_resource_group_name}/providers/Microsoft.Network/privateDnsZones/${zone_name}")
  }

  metric_namespace = "Microsoft.ApiManagement/service"

  alert_thresholds = {
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
      total_requests         = 20000
      successful_requests    = 19000
      failed_requests        = 200
      unauthorized_requests  = 100
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

  metric_alert_names = toset(flatten([
    for alerts in values(local.default_metric_alerts) : keys(alerts)
  ]))

  metric_alerts = var.metric_alerts != null ? var.metric_alerts : {
    for alert_name, alert in local.default_metric_alerts[var.use_case] :
    alert_name => merge(alert, {
      criteria = [
        for criterion in alert.criteria : merge(criterion, {
          threshold = lookup(var.metric_alert_thresholds, alert_name, criterion.threshold)
        })
      ]
    })
    if lookup(var.metric_alert_thresholds, alert_name, 1) != null
  }

  vnet_instance_number = try(
    tonumber(split("-", local.virtual_network_name)[length(split("-", local.virtual_network_name)) - 1]),
    tonumber(var.environment.instance_number)
  )

  apim_subnet_name = provider::dx::resource_name(merge(var.environment, {
    resource_type = "apim_subnet",
  }))

  pep_subnet_name = provider::dx::resource_name(merge(var.environment, {
    domain          = "",
    app_name        = "pep",
    resource_type   = "subnet",
    instance_number = local.vnet_instance_number,
  }))

  subnet_pep_id = local.use_case_features.private_endpoint ? provider::azurerm::normalise_resource_id("${local.virtual_network_id}/subnets/${local.pep_subnet_name}") : null

  custom_hostname_configuration = {
    for hostname_type, domains in {
      management       = var.hostname_configuration.management
      portal           = var.hostname_configuration.portal
      developer_portal = var.hostname_configuration.developer_portal
      scm              = var.hostname_configuration.scm
      } : hostname_type => [for domain in domains : merge(domain, {
        key_vault_certificate_id = length(split("/", domain.key_vault_certificate_id)) > 5 ? trimsuffix(domain.key_vault_certificate_id, "/${element(split("/", domain.key_vault_certificate_id), length(split("/", domain.key_vault_certificate_id)) - 1)}") : domain.key_vault_certificate_id
    })]
  }

  hostname_configuration = merge(local.custom_hostname_configuration, {
    proxy = [
      {
        default_ssl_binding      = try(var.hostname_configuration.proxy.use_resource_name_as_default, false)
        host_name                = "${local.apim.name}.azure-api.net"
        key_vault_certificate_id = null
      }
    ]
  })

  zone_multiplier = local.use_case_features.zones != null ? length(local.use_case_features.zones) : 1

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
