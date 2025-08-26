variables {
  // Common happy-path defaults
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
    consistency_level       = "Session" // valid by default
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
      enabled    = true
      thresholds = {}
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
