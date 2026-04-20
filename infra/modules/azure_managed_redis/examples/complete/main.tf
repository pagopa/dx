resource "azurerm_resource_group" "example" {
  name     = "dx-d-itn-example-amr-rg-01"
  location = local.environment.location
  tags     = local.tags
}

resource "random_integer" "instance" {
  min = 1
  max = 99
}

module "managed_redis" {
  source = "../.."

  environment = merge(local.environment, {
    instance_number = format("%02d", random_integer.instance.result)
  })

  resource_group_name = azurerm_resource_group.example.name
  tags                = local.tags

  force_public_network_access_enabled = local.subnet_pep_id == null
  subnet_pep_id                       = local.subnet_pep_id
  private_dns_zone_resource_group_name = local.private_dns_zone_resource_group_name

  use_case                           = "default"
  access_keys_authentication_enabled = false

  authorized_teams = {
    data_owners = [data.azurerm_client_config.current.object_id]
  }

  database = {
    modules = [
      { name = "RedisJSON" },
      { name = "RediSearch" }
    ]
  }

  diagnostic_settings = local.log_analytics_workspace_id == null ? {
    enabled = false
  } : {
    enabled                    = true
    log_analytics_workspace_id = local.log_analytics_workspace_id
  }

  alerts = {
    enabled         = true
    action_group_id = local.action_group_id
    thresholds = {
      used_memory_percentage = 85
      connected_clients      = 5000
      server_load            = 85
      cache_misses           = 1000
    }
  }

  customer_managed_key = local.cmk_key_vault_key_id == null ? {
    enabled = false
  } : {
    enabled                   = true
    key_vault_key_id          = local.cmk_key_vault_key_id
    user_assigned_identity_id = local.cmk_user_assigned_identity_id
  }

  geo_replication = length(local.geo_replication_linked_ids) == 0 ? {
    enabled = false
  } : {
    enabled                  = true
    group_name               = "example-amr-group"
    linked_managed_redis_ids = local.geo_replication_linked_ids
  }
}
