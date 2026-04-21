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
      database = {
        client_protocol   = "Encrypted"
        clustering_policy = "OSSCluster"
        eviction_policy   = "VolatileLRU"
      }
    }
    development = {
      sku_name                  = "Balanced_B0"
      high_availability_enabled = false
      private_network_enabled   = false
      lock_enabled              = false
      diagnostics_enabled       = false
      alerts_enabled            = false
      persistence_mode          = "disabled"
      database = {
        client_protocol   = "Encrypted"
        clustering_policy = "OSSCluster"
        eviction_policy   = "VolatileLRU"
      }
    }
    high_throughput = {
      sku_name                  = "ComputeOptimized_X3"
      high_availability_enabled = true
      private_network_enabled   = true
      lock_enabled              = true
      diagnostics_enabled       = true
      alerts_enabled            = true
      persistence_mode          = "rdb"
      database = {
        client_protocol   = "Encrypted"
        clustering_policy = "OSSCluster"
        eviction_policy   = "VolatileLRU"
      }
    }
  }

  use_case_features = local.use_cases[var.use_case]

  managed_redis_name    = provider::dx::resource_name(merge(local.naming_config, { resource_type = "managed_redis" }))
  private_endpoint_name = provider::dx::resource_name(merge(local.naming_config, { resource_type = "private_endpoint" }))

  selected_sku_name = coalesce(var.sku_name_override, local.use_case_features.sku_name)

  selected_database = {
    client_protocol       = coalesce(try(var.database.client_protocol, null), local.use_case_features.database.client_protocol)
    clustering_policy     = coalesce(try(var.database.clustering_policy, null), local.use_case_features.database.clustering_policy)
    eviction_policy       = coalesce(try(var.database.eviction_policy, null), local.use_case_features.database.eviction_policy)
    persistence_mode      = local.use_case_features.persistence_mode
    persistence_frequency = local.use_case_features.persistence_mode == "rdb" ? "1h" : null
    modules = [
      for m in try(var.database.modules, []) : {
        name = m.name
        args = try(m.args, null)
      }
    ]
  }

  private_endpoint_enabled             = local.use_case_features.private_network_enabled
  private_dns_zone_resource_group_name = try(coalesce(var.private_dns_zone_resource_group_name, var.virtual_network.resource_group_name), null)

  metric_alert_definitions = {
    used_memory_percentage = {
      aggregation      = "Maximum"
      metric_namespace = "Microsoft.Cache/redisEnterprise"
      metric_name      = "usedmemorypercentage"
      operator         = "GreaterThan"
      threshold        = try(var.alerts.thresholds.used_memory_percentage, 60)
      frequency        = "PT5M"
      window_size      = "PT15M"
      severity         = 2
      description      = "Managed Redis used memory percentage is above threshold."
    }
    connected_clients = {
      aggregation      = "Maximum"
      metric_namespace = "Microsoft.Cache/redisEnterprise"
      metric_name      = "connectedclients"
      operator         = "GreaterThan"
      threshold        = try(var.alerts.thresholds.connected_clients, 5000)
      frequency        = "PT5M"
      window_size      = "PT15M"
      severity         = 2
      description      = "Managed Redis connected clients are above threshold."
    }
    server_load = {
      aggregation      = "Maximum"
      metric_namespace = "Microsoft.Cache/redisEnterprise"
      metric_name      = "serverLoad"
      operator         = "GreaterThan"
      threshold        = try(var.alerts.thresholds.server_load, 60)
      frequency        = "PT5M"
      window_size      = "PT15M"
      severity         = 2
      description      = "Managed Redis server load is above threshold."
    }
    cache_misses = {
      aggregation      = "Total"
      metric_namespace = "Microsoft.Cache/redisEnterprise"
      metric_name      = "cachemisses"
      operator         = "GreaterThan"
      threshold        = try(var.alerts.thresholds.cache_misses, 1000)
      frequency        = "PT5M"
      window_size      = "PT15M"
      severity         = 2
      description      = "Managed Redis cache misses are above threshold."
    }
  }

  metric_alerts = local.use_case_features.alerts_enabled ? local.metric_alert_definitions : {}
}
