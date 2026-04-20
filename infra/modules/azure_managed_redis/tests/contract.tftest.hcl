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
    TestName       = "Azure Managed Redis contract tests"
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

run "invalid_use_case" {
  command = plan

  variables {
    use_case = "unsupported"
  }

  expect_failures = [
    var.use_case,
  ]
}

run "missing_private_endpoint_subnet" {
  command = plan

  variables {
    subnet_pep_id = null
  }

  expect_failures = [
    var.subnet_pep_id,
  ]
}

run "invalid_sku_override" {
  command = plan

  variables {
    sku_name_override = "Balanced_B9999"
  }

  expect_failures = [
    var.sku_name_override,
  ]
}

run "invalid_geo_replication_without_group_name" {
  command = plan

  variables {
    geo_replication = {
      enabled                  = true
      group_name               = null
      linked_managed_redis_ids = []
    }
  }

  expect_failures = [
    var.geo_replication,
  ]
}

run "invalid_geo_replication_with_persistence" {
  command = plan

  variables {
    geo_replication = {
      enabled    = true
      group_name = "amr-group"
      linked_managed_redis_ids = [
        "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-west/providers/Microsoft.Cache/redisEnterprise/amr-west"
      ]
    }

    database = {
      client_protocol   = null
      clustering_policy = null
      eviction_policy   = null
      persistence = {
        mode      = "rdb"
        frequency = "1h"
      }
      modules = []
    }
  }

  expect_failures = [
    var.database,
  ]
}

run "invalid_geo_replication_with_unsupported_module" {
  command = plan

  variables {
    geo_replication = {
      enabled    = true
      group_name = "amr-group"
      linked_managed_redis_ids = [
        "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-west/providers/Microsoft.Cache/redisEnterprise/amr-west"
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
      modules = [
        {
          name = "RedisBloom"
          args = null
        }
      ]
    }
  }

  expect_failures = [
    var.database,
  ]
}

run "invalid_cmk_configuration" {
  command = plan

  variables {
    customer_managed_key = {
      enabled                   = true
      key_vault_key_id          = "https://kv-test.vault.azure.net/keys/redis-cmk/0123456789abcdef"
      user_assigned_identity_id = null
    }
  }

  expect_failures = [
    var.customer_managed_key,
  ]
}

run "invalid_diagnostic_settings_without_destinations" {
  command = plan

  variables {
    diagnostic_settings = {
      enabled                                   = true
      log_analytics_workspace_id                = null
      diagnostic_setting_destination_storage_id = null
    }
  }

  expect_failures = [
    var.diagnostic_settings,
  ]
}

run "invalid_aof_frequency" {
  command = plan

  variables {
    database = {
      client_protocol   = null
      clustering_policy = null
      eviction_policy   = null
      persistence = {
        mode      = "aof"
        frequency = "6h"
      }
      modules = []
    }
  }

  expect_failures = [
    var.database,
  ]
}
