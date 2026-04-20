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

  subnet_pep_id                        = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Network/virtualNetworks/vnet-test/subnets/snet-pep"
  private_dns_zone_resource_group_name = "dx-d-itn-network-rg-01"
  force_public_network_access_enabled  = false

  use_case          = "default"
  sku_name_override = null

  access_keys_authentication_enabled = false
  authorized_teams = {
    data_owners = []
  }

  geo_replication = {
    enabled                  = false
    group_name               = null
    linked_managed_redis_ids = []
  }

  database = {
    client_protocol   = null
    clustering_policy = null
    eviction_policy   = null
    persistence = {
      mode      = null
      frequency = null
    }
    modules = []
  }

  identity = null
  customer_managed_key = {
    enabled                   = false
    key_vault_key_id          = null
    user_assigned_identity_id = null
  }

  diagnostic_settings = {
    enabled                                   = false
    log_analytics_workspace_id                = null
    diagnostic_setting_destination_storage_id = null
  }

  alerts = {
    enabled         = false
    action_group_id = null
    thresholds = {
      used_memory_percentage = null
      connected_clients      = null
      server_load            = null
      cache_misses           = null
    }
  }

  enable_lock = null
}

mock_provider "azurerm" {}

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
    error_message = "Public network access must default to Disabled"
  }

  assert {
    condition     = azurerm_managed_redis.this.default_database[0].access_keys_authentication_enabled == false
    error_message = "Access keys authentication must be disabled by default"
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
    condition     = local.selected_database.persistence_mode == "rdb" && local.selected_database.persistence_frequency == "12h"
    error_message = "Default use case must resolve persistence to RDB every 12h"
  }

  assert {
    condition     = length(azurerm_management_lock.this) == 1
    error_message = "Default use case must create a management lock"
  }
}

run "managed_redis_development_use_case" {
  command = plan

  variables {
    use_case = "development"
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
    condition     = local.selected_database.persistence_mode == "disabled" && local.selected_database.persistence_frequency == null
    error_message = "Development use case must disable persistence"
  }

  assert {
    condition     = length(azurerm_management_lock.this) == 0
    error_message = "Development use case must not create a management lock by default"
  }
}

run "managed_redis_high_throughput_use_case" {
  command = plan

  variables {
    use_case = "high_throughput"
  }

  assert {
    condition     = azurerm_managed_redis.this.sku_name == "ComputeOptimized_X3"
    error_message = "High throughput use case must resolve to ComputeOptimized_X3"
  }

  assert {
    condition     = azurerm_managed_redis.this.high_availability_enabled == true
    error_message = "High throughput use case must enable high availability"
  }

  assert {
    condition     = local.selected_database.persistence_mode == "rdb" && local.selected_database.persistence_frequency == "6h"
    error_message = "High throughput use case must resolve persistence to RDB every 6h"
  }
}

run "managed_redis_sku_override" {
  command = plan

  variables {
    sku_name_override = "MemoryOptimized_M10"
  }

  assert {
    condition     = azurerm_managed_redis.this.sku_name == "MemoryOptimized_M10"
    error_message = "SKU override must take precedence over the use case preset"
  }
}

run "managed_redis_private_endpoint" {
  command = plan

  assert {
    condition     = azurerm_private_endpoint.redis[0].subnet_id == var.subnet_pep_id
    error_message = "Private endpoint must target the provided subnet"
  }

  assert {
    condition     = azurerm_private_endpoint.redis[0].private_service_connection[0].subresource_names[0] == "redisEnterprise"
    error_message = "Private endpoint must use the redisEnterprise subresource"
  }

  assert {
    condition     = can(regex("privatelink\\.redis\\.azure\\.net$", azurerm_private_endpoint.redis[0].private_dns_zone_group[0].private_dns_zone_ids[0]))
    error_message = "Private endpoint must use the Managed Redis private DNS zone"
  }
}

run "managed_redis_public_network_access" {
  command = plan

  variables {
    force_public_network_access_enabled = true
    subnet_pep_id                       = null
  }

  assert {
    condition     = azurerm_managed_redis.this.public_network_access == "Enabled"
    error_message = "Public network access must be Enabled when forced"
  }

  assert {
    condition     = length(azurerm_private_endpoint.redis) == 0
    error_message = "Private endpoint must not be created when public network access is enabled"
  }
}

run "managed_redis_access_policy_assignments" {
  command = plan

  variables {
    authorized_teams = {
      data_owners = [
        "11111111-1111-1111-1111-111111111111",
        "22222222-2222-2222-2222-222222222222"
      ]
    }
  }

  assert {
    condition     = length(azurerm_managed_redis_access_policy_assignment.data_owners) == 2
    error_message = "Two data owner access policy assignments must be created"
  }
}

run "managed_redis_geo_replication" {
  command = plan

  variables {
    geo_replication = {
      enabled    = true
      group_name = "amr-group"
      linked_managed_redis_ids = [
        "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-west/providers/Microsoft.Cache/redisEnterprise/amr-west",
        "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-east/providers/Microsoft.Cache/redisEnterprise/amr-east"
      ]
    }

    database = {
      client_protocol   = null
      clustering_policy = null
      eviction_policy   = null
      persistence = {
        mode      = "disabled"
        frequency = null
      }
      modules = []
    }
  }

  assert {
    condition     = azurerm_managed_redis.this.default_database[0].geo_replication_group_name == "amr-group"
    error_message = "Geo-replication group name must be configured on the default database"
  }

  assert {
    condition     = length(azurerm_managed_redis_geo_replication.this) == 1
    error_message = "Geo-replication resource must be created when linked clusters are provided"
  }

  assert {
    condition     = length(azurerm_managed_redis_geo_replication.this[0].linked_managed_redis_ids) == 2
    error_message = "Geo-replication resource must include both linked managed redis IDs"
  }
}

run "managed_redis_cmk_identity" {
  command = plan

  variables {
    customer_managed_key = {
      enabled                   = true
      key_vault_key_id          = "https://kv-test.vault.azure.net/keys/redis-cmk/0123456789abcdef"
      user_assigned_identity_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-identity/providers/Microsoft.ManagedIdentity/userAssignedIdentities/amr-mi"
    }
  }

  assert {
    condition     = azurerm_managed_redis.this.customer_managed_key[0].key_vault_key_id == "https://kv-test.vault.azure.net/keys/redis-cmk/0123456789abcdef"
    error_message = "Customer managed key must reference the provided Key Vault key"
  }

  assert {
    condition     = azurerm_managed_redis.this.identity[0].type == "UserAssigned"
    error_message = "CMK-enabled managed redis must use a user-assigned identity"
  }
}

run "managed_redis_observability" {
  command = plan

  variables {
    database = {
      client_protocol   = null
      clustering_policy = null
      eviction_policy   = null
      persistence = {
        mode      = "disabled"
        frequency = null
      }
      modules = [
        {
          name = "RediSearch"
          args = "ON JSON PREFIX 1 docs:"
        },
        {
          name = "RedisJSON"
          args = null
        }
      ]
    }

    diagnostic_settings = {
      enabled                                   = true
      log_analytics_workspace_id                = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-monitor/providers/Microsoft.OperationalInsights/workspaces/law-test"
      diagnostic_setting_destination_storage_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-monitor/providers/Microsoft.Storage/storageAccounts/stdiagtest"
    }

    alerts = {
      enabled         = true
      action_group_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-monitor/providers/Microsoft.Insights/actionGroups/ag-test"
      thresholds = {
        used_memory_percentage = 80
        connected_clients      = 2000
        server_load            = 80
        cache_misses           = 100
      }
    }
  }

  assert {
    condition     = length(azurerm_managed_redis.this.default_database[0].module) == 2
    error_message = "Two Redis modules must be configured on the default database"
  }

  assert {
    condition     = length(azurerm_monitor_diagnostic_setting.this) == 1
    error_message = "Diagnostic settings must be created when enabled"
  }

  assert {
    condition     = azurerm_monitor_diagnostic_setting.this[0].log_analytics_workspace_id == "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-monitor/providers/Microsoft.OperationalInsights/workspaces/law-test"
    error_message = "Diagnostic settings must target the provided Log Analytics workspace"
  }

  assert {
    condition     = length(azurerm_monitor_diagnostic_setting.this[0].enabled_metric) == 1
    error_message = "Diagnostic settings must enable AllMetrics"
  }

  assert {
    condition     = length(azurerm_monitor_metric_alert.this) == 4
    error_message = "Four metric alerts must be created when all thresholds are set"
  }
}
