variables {
  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    domain          = "modules"
    app_name        = "test"
    instance_number = "01"
  }

  tags = {
    Owner = "DevEx"
  }

  resource_group_name                  = "rg-test"
  subnet_pep_id                        = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test/providers/Microsoft.Network/virtualNetworks/vnet-test/subnets/snet-pep"
  private_dns_zone_resource_group_name = "dx-d-itn-network-rg-01"

  primary_geo_location = {
    location       = "italynorth"
    zone_redundant = true
  }

  tier = "l"

  consistency_policy = {
    consistency_preset      = "Custom"
    consistency_level       = "Session"
    max_interval_in_seconds = 300
    max_staleness_prefix    = 100000
  }

  alerts = {
    enabled = false
  }

  customer_managed_key = {
    enabled                   = false
    user_assigned_identity_id = null
    key_vault_key_id          = null
  }
}

mock_provider "azurerm" {}

override_data {
  target = data.azurerm_private_dns_zone.cosmos
  values = {
    id = "/subscriptions/12345678-1234-9876-4563-123456789012/resourceGroups/dx-d-itn-network-rg-01/providers/Microsoft.Network/privateDnsZones/privatelink.documents.azure.com"
  }
}

run "invalid_tier" {
  command = plan

  variables {
    tier = "x"
  }

  expect_failures = [
    var.tier,
  ]
}

run "invalid_custom_consistency_level" {
  command = plan

  variables {
    consistency_policy = {
      consistency_preset = "Custom"
      consistency_level  = "WrongLevel"
    }
  }

  expect_failures = [
    var.consistency_policy,
  ]
}

run "bounded_staleness_missing_bounds" {
  command = plan

  variables {
    consistency_policy = {
      consistency_preset      = "Custom"
      consistency_level       = "BoundedStaleness"
      max_interval_in_seconds = null
      max_staleness_prefix    = null
    }
  }

  expect_failures = [
    var.consistency_policy,
  ]
}

run "alerts_enabled_without_threshold" {
  command = plan

  variables {
    alerts = {
      enabled                         = true
      thresholds                      = {}
      provisioned_throughput_exceeded = 10000
    }
  }

  expect_failures = [
    var.alerts,
  ]
}

run "cmk_enabled_missing_fields" {
  command = plan

  variables {
    customer_managed_key = {
      enabled                   = true
      user_assigned_identity_id = null
      key_vault_key_id          = null
    }
  }

  expect_failures = [
    var.customer_managed_key,
  ]
}

run "valid_custom_bounded_staleness" {
  command = plan

  variables {
    consistency_policy = {
      consistency_preset      = "Custom"
      consistency_level       = "BoundedStaleness"
      max_interval_in_seconds = 600
      max_staleness_prefix    = 200000
    }
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.consistency_policy[0].consistency_level == "BoundedStaleness"
    error_message = "BoundedStaleness consistency must be set"
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.consistency_policy[0].max_interval_in_seconds == 600
    error_message = "max_interval_in_seconds must be 600"
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.consistency_policy[0].max_staleness_prefix == 200000
    error_message = "max_staleness_prefix must be 200000"
  }
}

run "valid_alerts_with_threshold" {
  command = plan

  variables {
    alerts = {
      enabled = true
      thresholds = {
        provisioned_throughput_exceeded = 10000
      }
    }
  }

  assert {
    condition     = azurerm_monitor_metric_alert.cosmos_db_provisioned_throughput_exceeded[0].criteria[0].threshold == 10000
    error_message = "alerts.thresholds.provisioned_throughput_exceeded must be applied"
  }

  assert {
    condition     = azurerm_monitor_metric_alert.cosmos_db_provisioned_throughput_exceeded[0].severity == 0
    error_message = "metric alert severity must be 0"
  }
}

run "valid_cmk" {
  command = plan

  variables {
    customer_managed_key = {
      enabled                   = true
      user_assigned_identity_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-mi/providers/Microsoft.ManagedIdentity/userAssignedIdentities/mi-test"
      key_vault_key_id          = "https://kv-test.vault.azure.net/keys/key-test"
    }
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.key_vault_key_id == var.customer_managed_key.key_vault_key_id
    error_message = "key_vault_key_id must be set when CMK is enabled"
  }

  assert {
    condition     = azurerm_cosmosdb_account.this.identity[0].type == "UserAssigned"
    error_message = "identity.type must be UserAssigned when CMK is enabled"
  }
}
