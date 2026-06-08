locals {
  tags = merge(var.tags, {
    ModuleSource  = "DX"
    ModuleVersion = try(jsondecode(file("${path.module}/package.json")).version, "unknown")
    ModuleName    = try(jsondecode(file("${path.module}/package.json")).name, "unknown")
  })

  use_cases = {
    default = {
      sku_name                  = "Balanced_B3"
      high_availability_enabled = true
      private_network_enabled   = true
      lock_enabled              = true
      diagnostics_enabled       = true
      alerts_enabled            = true
      persistence_mode          = "rdb"
    }
    development = {
      sku_name                  = "Balanced_B0"
      high_availability_enabled = false
      private_network_enabled   = false
      lock_enabled              = false
      diagnostics_enabled       = false
      alerts_enabled            = false
      persistence_mode          = "disabled"
    }
  }

  use_case_features = local.use_cases[var.use_case]

  managed_redis_name    = provider::dx::resource_name(merge(var.environment, { resource_type = "managed_redis" }))
  private_endpoint_name = provider::dx::resource_name(merge(var.environment, { resource_type = "managed_redis_private_endpoint" }))

  vnet_id                  = var.virtual_network_id != null ? provider::azurerm::normalise_resource_id(var.virtual_network_id) : null
  vnet_resource_group_name = var.virtual_network_id != null ? provider::azurerm::parse_resource_id(var.virtual_network_id).resource_group_name : null
  vnet_name                = local.vnet_id != null ? provider::azurerm::parse_resource_id(local.vnet_id).resource_name : null
  vnet_instance_number     = try(tonumber(split("-", local.vnet_name != null ? local.vnet_name : "")[length(split("-", local.vnet_name != null ? local.vnet_name : "")) - 1]), 1)

  pep_subnet_name = provider::dx::resource_name(merge(var.environment, {
    domain          = "",
    app_name        = "pep",
    resource_type   = "subnet",
    instance_number = local.vnet_instance_number,
  }))
  subnet_pep_id = local.vnet_id != null ? provider::azurerm::normalise_resource_id("${local.vnet_id}/subnets/${local.pep_subnet_name}") : null

  selected_sku_name = coalesce(var.sku_name_override, local.use_case_features.sku_name)

  persistence_frequency = local.use_case_features.persistence_mode == "rdb" ? "1h" : null

  private_endpoint_enabled             = local.use_case_features.private_network_enabled
  private_dns_zone_resource_group_name = try(coalesce(var.private_dns_zone_resource_group_name, local.vnet_resource_group_name), null)

  load_alert_uses_cpu_metric = contains([
    "Balanced_B0",
    "Balanced_B1",
    "Balanced_B3",
    "Balanced_B5",
  ], local.selected_sku_name)

  load_alert_metric_name = local.load_alert_uses_cpu_metric ? "percentProcessorTime" : "serverLoad"

  load_alert_warn_description = local.load_alert_uses_cpu_metric ? "Managed Redis average CPU is elevated. On smaller SKUs, CPU is a more reliable sustained-load signal than server load." : "Managed Redis average server load is elevated. Sustained load at this level can lead to unplanned failovers."

  load_alert_critical_description = local.load_alert_uses_cpu_metric ? "Managed Redis average CPU is near saturation. On smaller SKUs, CPU is a more reliable sustained-load signal than server load." : "Managed Redis average server load is near saturation. Scale out or shard."

  metric_alert_definitions = merge({
    used_memory_percentage = {
      aggregation      = "Maximum"
      metric_namespace = "Microsoft.Cache/redisEnterprise"
      metric_name      = "usedmemorypercentage"
      operator         = "GreaterThan"
      threshold        = try(var.alerts.thresholds.used_memory_percentage, 75)
      frequency        = "PT5M"
      window_size      = "PT15M"
      severity         = 2
      description      = "Managed Redis used memory percentage is elevated; MS recommends scaling up at this level."
    }
    used_memory_percentage_critical = {
      aggregation      = "Maximum"
      metric_namespace = "Microsoft.Cache/redisEnterprise"
      metric_name      = "usedmemorypercentage"
      operator         = "GreaterThan"
      threshold        = try(var.alerts.thresholds.used_memory_percentage_critical, 90)
      frequency        = "PT1M"
      window_size      = "PT5M"
      severity         = 1
      description      = "Managed Redis used memory percentage is critical. Eviction or OOM failover is imminent."
    }
    server_load = {
      aggregation      = "Average"
      metric_namespace = "Microsoft.Cache/redisEnterprise"
      metric_name      = local.load_alert_metric_name
      operator         = "GreaterThan"
      threshold        = try(var.alerts.thresholds.server_load, 80)
      frequency        = "PT5M"
      window_size      = "PT15M"
      severity         = 2
      description      = local.load_alert_warn_description
    }
    server_load_critical = {
      aggregation      = "Average"
      metric_namespace = "Microsoft.Cache/redisEnterprise"
      metric_name      = local.load_alert_metric_name
      operator         = "GreaterThan"
      threshold        = try(var.alerts.thresholds.server_load_critical, 90)
      frequency        = "PT1M"
      window_size      = "PT5M"
      severity         = 1
      description      = local.load_alert_critical_description
    }
    evicted_keys = {
      aggregation      = "Total"
      metric_namespace = "Microsoft.Cache/redisEnterprise"
      metric_name      = "evictedkeys"
      operator         = "GreaterThan"
      threshold        = try(var.alerts.thresholds.evicted_keys, 0)
      frequency        = "PT5M"
      window_size      = "PT15M"
      severity         = 2
      description      = "Managed Redis is evicting keys due to memory pressure; data loss may be occurring."
    }
    },
    try(var.alerts.thresholds.connected_clients, null) == null ? {} : {
      connected_clients = {
        aggregation      = "Maximum"
        metric_namespace = "Microsoft.Cache/redisEnterprise"
        metric_name      = "connectedclients"
        operator         = "GreaterThan"
        threshold        = var.alerts.thresholds.connected_clients
        frequency        = "PT5M"
        window_size      = "PT15M"
        severity         = 2
        description      = "Managed Redis connected clients are above the configured threshold; approaching the SKU connection ceiling."
      }
  })

  metric_alerts = local.use_case_features.alerts_enabled ? local.metric_alert_definitions : {}
}
