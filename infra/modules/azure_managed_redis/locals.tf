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
      enable_lock               = true
      alerts_enabled            = true
      database = {
        client_protocol       = "Encrypted"
        clustering_policy     = "OSSCluster"
        eviction_policy       = "VolatileLRU"
        persistence_mode      = "rdb"
        persistence_frequency = "12h"
      }
      alert_thresholds = {
        used_memory_percentage = 80
        connected_clients      = 5000
        server_load            = 80
        cache_misses           = 1000
      }
    }
    development = {
      sku_name                  = "Balanced_B0"
      high_availability_enabled = false
      enable_lock               = false
      alerts_enabled            = false
      database = {
        client_protocol       = "Encrypted"
        clustering_policy     = "OSSCluster"
        eviction_policy       = "VolatileLRU"
        persistence_mode      = "disabled"
        persistence_frequency = null
      }
      alert_thresholds = {
        used_memory_percentage = null
        connected_clients      = null
        server_load            = null
        cache_misses           = null
      }
    }
    high_throughput = {
      sku_name                  = "ComputeOptimized_X3"
      high_availability_enabled = true
      enable_lock               = true
      alerts_enabled            = true
      database = {
        client_protocol       = "Encrypted"
        clustering_policy     = "OSSCluster"
        eviction_policy       = "VolatileLRU"
        persistence_mode      = "rdb"
        persistence_frequency = "6h"
      }
      alert_thresholds = {
        used_memory_percentage = 80
        connected_clients      = 10000
        server_load            = 80
        cache_misses           = 2000
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
    persistence_mode      = coalesce(try(var.database.persistence.mode, null), local.use_case_features.database.persistence_mode)
    persistence_frequency = try(var.database.persistence.frequency, null) != null ? var.database.persistence.frequency : local.use_case_features.database.persistence_frequency
    modules = [
      for module in try(var.database.modules, []) : {
        name = module.name
        args = try(module.args, null)
      }
    ]
  }

  private_endpoint_enabled             = !var.force_public_network_access_enabled
  private_dns_zone_resource_group_name = coalesce(var.private_dns_zone_resource_group_name, try(split("/", var.subnet_pep_id)[4], null))
  private_dns_zone_id = local.private_endpoint_enabled ? format(
    "/subscriptions/%s/resourceGroups/%s/providers/Microsoft.Network/privateDnsZones/privatelink.redis.azure.net",
    split("/", var.subnet_pep_id)[2],
    local.private_dns_zone_resource_group_name
  ) : null

  geo_replication_enabled = try(var.geo_replication.enabled, false)

  base_identity = var.identity == null ? null : {
    type         = var.identity.type
    identity_ids = try(var.identity.identity_ids, [])
  }

  effective_identity = try(var.customer_managed_key.enabled, false) ? {
    type = var.identity == null ? "UserAssigned" : (
      var.identity.type == "SystemAssigned" ? "SystemAssigned, UserAssigned" : var.identity.type
    )
    identity_ids = distinct(compact(concat(
      try(var.identity.identity_ids, []),
      [var.customer_managed_key.user_assigned_identity_id]
    )))
  } : local.base_identity

  alerts_enabled = coalesce(try(var.alerts.enabled, null), local.use_case_features.alerts_enabled)

  alert_thresholds = {
    used_memory_percentage = try(var.alerts.thresholds.used_memory_percentage, null) != null ? var.alerts.thresholds.used_memory_percentage : local.use_case_features.alert_thresholds.used_memory_percentage
    connected_clients      = try(var.alerts.thresholds.connected_clients, null) != null ? var.alerts.thresholds.connected_clients : local.use_case_features.alert_thresholds.connected_clients
    server_load            = try(var.alerts.thresholds.server_load, null) != null ? var.alerts.thresholds.server_load : local.use_case_features.alert_thresholds.server_load
    cache_misses           = try(var.alerts.thresholds.cache_misses, null) != null ? var.alerts.thresholds.cache_misses : local.use_case_features.alert_thresholds.cache_misses
  }

  metric_alert_definitions = {
    used_memory_percentage = {
      aggregation      = "Maximum"
      metric_namespace = "Microsoft.Cache/redisEnterprise"
      metric_name      = "usedmemorypercentage"
      operator         = "GreaterThan"
      threshold        = local.alert_thresholds.used_memory_percentage
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
      threshold        = local.alert_thresholds.connected_clients
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
      threshold        = local.alert_thresholds.server_load
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
      threshold        = local.alert_thresholds.cache_misses
      frequency        = "PT5M"
      window_size      = "PT15M"
      severity         = 2
      description      = "Managed Redis cache misses are above threshold."
    }
  }

  metric_alerts = local.alerts_enabled ? {
    for key, definition in local.metric_alert_definitions : key => definition
    if definition.threshold != null
  } : {}

  enable_lock = var.enable_lock != null ? var.enable_lock : local.use_case_features.enable_lock
}
