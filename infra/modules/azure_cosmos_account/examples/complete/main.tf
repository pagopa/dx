resource "azurerm_resource_group" "example" {
  name     = "${local.project}-${local.environment.domain}-rg-${local.environment.instance_number}"
  location = local.environment.location
}

resource "azurerm_user_assigned_identity" "example" {
  name                = "example"
  resource_group_name = azurerm_resource_group.example.name
  location            = local.environment.location
}

module "cosmos_db" {
  source = "../../"

  environment         = local.environment
  resource_group_name = azurerm_resource_group.example.name

  subnet_pep_id                        = data.azurerm_subnet.pep.id
  private_dns_zone_resource_group_name = "${local.environment.prefix}-${local.environment.env_short}-rg-common"

  primary_geo_location = {
    location       = local.environment.location
    zone_redundant = true
  }

  secondary_geo_locations = [
    {
      location          = "italynorth"
      failover_priority = 1
      zone_redundant    = true
    }
  ]

  customer_managed_key = {
    enabled                   = true
    user_assigned_identity_id = azurerm_user_assigned_identity.example.id
    key_vault_key_id          = "https://${local.environment.prefix}-${local.environment.env_short}-kv.vault.azure.net/keys/my-kv-key"
  }

  force_public_network_access_enabled = false

  consistency_policy = {
    consistency_preset      = "Custom"
    consistency_level       = "BoundedStaleness"
    max_interval_in_seconds = 300
    max_staleness_prefix    = 100000
  }

  alerts = {
    enabled         = true
    action_group_id = data.azurerm_monitor_action_group.example.id
    thresholds = {
      provisioned_throughput_exceeded = 900
    }
  }

  tags = local.tags
}
