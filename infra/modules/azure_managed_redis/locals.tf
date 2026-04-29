locals {
  tags = merge(var.tags, {
    ModuleSource  = "DX"
    ModuleVersion = try(jsondecode(file("${path.module}/package.json")).version, "unknown")
    ModuleName    = try(jsondecode(file("${path.module}/package.json")).name, "unknown")
  })

  naming_config = {
    prefix          = var.environment.prefix
    environment     = var.environment.env_short
    location        = var.environment.location
    domain          = var.environment.domain
    name            = var.environment.app_name
    instance_number = tonumber(var.environment.instance_number)
  }

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

  managed_redis_name    = provider::dx::resource_name(merge(local.naming_config, { resource_type = "managed_redis" }))
  private_endpoint_name = provider::dx::resource_name(merge(local.naming_config, { resource_type = "private_endpoint" }))

  pep_subnet_name = provider::dx::resource_name(merge(local.naming_config, {
    domain          = "",
    name            = "pep",
    resource_type   = "subnet",
    instance_number = 1,
  }))
  vnet_id                  = var.virtual_network_id != null ? provider::azurerm::normalise_resource_id(var.virtual_network_id) : null
  vnet_resource_group_name = var.virtual_network_id != null ? provider::azurerm::parse_resource_id(var.virtual_network_id).resource_group_name : null
  subnet_pep_id            = local.vnet_id != null ? provider::azurerm::normalise_resource_id("${local.vnet_id}/subnets/${local.pep_subnet_name}") : null

  selected_sku_name = coalesce(var.sku_name_override, local.use_case_features.sku_name)

  persistence_frequency = local.use_case_features.persistence_mode == "rdb" ? "1h" : null

  private_endpoint_enabled             = local.use_case_features.private_network_enabled
  private_dns_zone_resource_group_name = try(coalesce(var.private_dns_zone_resource_group_name, local.vnet_resource_group_name), null)

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
      description      = "Managed Redis used memory percentage is above the warn threshold (75%). MS recommends scaling up at this level."
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
      aggregation      = "Maximum"
      metric_namespace = "Microsoft.Cache/redisEnterprise"
      metric_name      = "serverLoad"
      operator         = "GreaterThan"
      threshold        = try(var.alerts.thresholds.server_load, 80)
      frequency        = "PT5M"
      window_size      = "PT15M"
      severity         = 2
      description      = "Managed Redis server load is above 80%. Sustained load at this level can lead to unplanned failovers."
    }
    server_load_critical = {
      aggregation      = "Maximum"
      metric_namespace = "Microsoft.Cache/redisEnterprise"
      metric_name      = "serverLoad"
      operator         = "GreaterThan"
      threshold        = try(var.alerts.thresholds.server_load_critical, 90)
      frequency        = "PT1M"
      window_size      = "PT5M"
      severity         = 1
      description      = "Managed Redis server load is near saturation. Scale out or shard."
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
