variables {
  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    domain          = "modules"
    app_name        = "cache"
    instance_number = "01"
  }

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    Owner          = "DevEx"
    Source         = "https://github.com/pagopa/dx/infra/modules/azure_managed_redis/tests"
    ManagementTeam = "Developer Experience"
    Test           = "true"
    TestName       = "Azure Managed Redis unit tests"
  }

  resource_group_name = "rg-test"

  virtual_network_id                   = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-d-itn-network-rg-01/providers/Microsoft.Network/virtualNetworks/vnet-test"
  private_dns_zone_resource_group_name = null

  use_case          = "default"
  sku_name_override = null

  log_analytics_workspace_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-monitor/providers/Microsoft.OperationalInsights/workspaces/law-test"

  alerts = {
    action_group_id = null
    thresholds      = {}
  }
}

mock_provider "azurerm" {
  mock_data "azurerm_subscription" {
    defaults = {
      id              = "/subscriptions/00000000-0000-0000-0000-000000000000"
      subscription_id = "00000000-0000-0000-0000-000000000000"
    }
  }
  mock_data "azurerm_private_dns_zone" {
    defaults = {
      id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-d-itn-network-rg-01/providers/Microsoft.Network/privateDnsZones/privatelink.redis.azure.net"
    }
  }
}

run "managed_redis_default_use_case" {
  command = plan

  assert {
    condition     = azurerm_managed_redis.this.name == "dx-d-itn-modules-cache-amr-01"
    error_message = "Managed Redis name must use the amr suffix"
  }

  assert {
    condition     = azurerm_managed_redis.this.sku_name == "Balanced_B3"
    error_message = "Default use case must resolve to Balanced_B3"
  }

  assert {
    condition     = azurerm_managed_redis.this.high_availability_enabled == true
    error_message = "Default use case must enable high availability"
  }

  assert {
    condition     = azurerm_managed_redis.this.public_network_access == "Disabled"
    error_message = "Default use case must disable public network access"
  }

  assert {
    condition     = azurerm_managed_redis.this.identity[0].type == "SystemAssigned"
    error_message = "Default use case must use a system-assigned identity"
  }

  assert {
    condition     = azurerm_managed_redis.this.default_database[0].access_keys_authentication_enabled == false
    error_message = "Access keys authentication must always be disabled (Entra-only)"
  }

  assert {
    condition     = azurerm_managed_redis.this.default_database[0].client_protocol == "Encrypted"
    error_message = "Client protocol must default to Encrypted"
  }

  assert {
    condition     = azurerm_managed_redis.this.default_database[0].clustering_policy == "OSSCluster"
    error_message = "Default use case must use OSSCluster"
  }

  assert {
    condition     = local.use_case_features.persistence_mode == "rdb" && local.persistence_frequency == "1h"
    error_message = "Default use case must resolve persistence to RDB every 1h"
  }

  assert {
    condition     = length(azurerm_management_lock.this) == 1
    error_message = "Default use case must create a management lock"
  }

  assert {
    condition     = length(azurerm_private_endpoint.redis) == 1
    error_message = "Default use case must create a private endpoint"
  }

  assert {
    condition     = length(azurerm_monitor_diagnostic_setting.this) == 1
    error_message = "Default use case must enable diagnostic settings"
  }

  assert {
    condition     = length(azurerm_monitor_metric_alert.this) == 5
    error_message = "Default use case must create the five default metric alerts (connected_clients is opt-in)"
  }
}

run "managed_redis_development_use_case" {
  command = plan

  variables {
    use_case = "development"

    # Development use case does not require a virtual network or LAW
    virtual_network_id         = null
    log_analytics_workspace_id = null
  }

  assert {
    condition     = azurerm_managed_redis.this.sku_name == "Balanced_B0"
    error_message = "Development use case must resolve to Balanced_B0"
  }

  assert {
    condition     = azurerm_managed_redis.this.high_availability_enabled == false
    error_message = "Development use case must disable high availability"
  }

  assert {
    condition     = azurerm_managed_redis.this.public_network_access == "Enabled"
    error_message = "Development use case must enable public network access"
  }

  assert {
    condition     = local.use_case_features.persistence_mode == "disabled" && local.persistence_frequency == null
    error_message = "Development use case must disable persistence"
  }

  assert {
    condition     = length(azurerm_management_lock.this) == 0
    error_message = "Development use case must not create a management lock"
  }

  assert {
    condition     = length(azurerm_private_endpoint.redis) == 0
    error_message = "Development use case must not create a private endpoint"
  }

  assert {
    condition     = length(azurerm_monitor_diagnostic_setting.this) == 0
    error_message = "Development use case must not create diagnostic settings"
  }

  assert {
    condition     = length(azurerm_monitor_metric_alert.this) == 0
    error_message = "Development use case must not create metric alerts"
  }
}

run "managed_redis_sku_override" {
  command = plan

  variables {
    sku_name_override = "ComputeOptimized_X10"
  }

  assert {
    condition     = azurerm_managed_redis.this.sku_name == "ComputeOptimized_X10"
    error_message = "SKU override must take precedence over the use case preset"
  }
}

run "managed_redis_private_endpoint" {
  command = plan

  assert {
    condition     = azurerm_private_endpoint.redis[0].subnet_id == local.subnet_pep_id
    error_message = "Private endpoint must target the synthesized PEP subnet"
  }

  assert {
    condition     = azurerm_private_endpoint.redis[0].private_service_connection[0].subresource_names[0] == "redisEnterprise"
    error_message = "Private endpoint must use the redisEnterprise subresource"
  }
}

run "managed_redis_no_modules" {
  command = plan

  assert {
    condition     = length(azurerm_managed_redis.this.default_database[0].module) == 0
    error_message = "Module must never configure Redis modules on the default database"
  }

  assert {
    condition     = azurerm_managed_redis.this.default_database[0].eviction_policy == "VolatileLRU"
    error_message = "Eviction policy must be hardcoded to VolatileLRU"
  }
}

run "managed_redis_default_alert_thresholds" {
  command = plan

  assert {
    condition     = azurerm_monitor_metric_alert.this["used_memory_percentage"].criteria[0].threshold == 75
    error_message = "used_memory_percentage must default to 75 (MS recommended scale-up level)"
  }

  assert {
    condition     = azurerm_monitor_metric_alert.this["used_memory_percentage_critical"].criteria[0].threshold == 90
    error_message = "used_memory_percentage_critical must default to 90"
  }

  assert {
    condition     = azurerm_monitor_metric_alert.this["server_load"].criteria[0].threshold == 80
    error_message = "server_load must default to 80 (MS recommended)"
  }

  assert {
    condition     = azurerm_monitor_metric_alert.this["server_load_critical"].criteria[0].threshold == 90
    error_message = "server_load_critical must default to 90"
  }

  assert {
    condition     = azurerm_monitor_metric_alert.this["evicted_keys"].criteria[0].threshold == 0
    error_message = "evicted_keys must default to 0 (any eviction is an alert)"
  }

  assert {
    condition     = !contains(keys(azurerm_monitor_metric_alert.this), "connected_clients")
    error_message = "connected_clients must NOT be created by default (opt-in)"
  }

  assert {
    condition     = !contains(keys(azurerm_monitor_metric_alert.this), "cache_misses")
    error_message = "cache_misses alert has been removed"
  }
}

run "managed_redis_connected_clients_opt_in" {
  command = plan

  variables {
    alerts = {
      thresholds = {
        connected_clients = 8000
      }
    }
  }

  assert {
    condition     = azurerm_monitor_metric_alert.this["connected_clients"].criteria[0].threshold == 8000
    error_message = "connected_clients alert must be created when threshold is set explicitly"
  }

  assert {
    condition     = length(azurerm_monitor_metric_alert.this) == 6
    error_message = "Setting connected_clients threshold must add a 6th alert"
  }
}
