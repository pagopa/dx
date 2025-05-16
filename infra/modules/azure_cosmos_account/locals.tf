locals {
  tags = merge(var.tags, { ModuleSource = "DX", ModuleVersion = try(jsondecode(file("${path.module}/package.json")).version, "unknown"), ModuleName = try(jsondecode(file("${path.module}/package.json")).name, "unknown") })
  naming_config = {
    prefix          = var.environment.prefix,
    environment     = var.environment.env_short,
    location        = var.environment.location
    domain          = var.environment.domain,
    name            = var.environment.app_name,
    instance_number = tonumber(var.environment.instance_number),
  }

  primary_location = var.primary_geo_location.location == null ? var.environment.location : var.primary_geo_location.location

  consistency_presets = {
    Default = {
      consistency_level       = "Session"
      max_interval_in_seconds = null
      max_staleness_prefix    = null
    }
    HighConsistency = {
      consistency_level       = "Strong"
      max_interval_in_seconds = null
      max_staleness_prefix    = null
    }
    HighPerformance = {
      consistency_level       = "Eventual"
      max_interval_in_seconds = null
      max_staleness_prefix    = null
    }
    BalancedStaleness = {
      consistency_level       = "BoundedStaleness"
      max_interval_in_seconds = 300
      max_staleness_prefix    = 100000
    }
  }

  selected_preset = coalesce(var.consistency_policy.consistency_preset, "Default")

  final_consistency_policy = local.selected_preset == "Custom" ? {
    consistency_level       = var.consistency_policy.consistency_level
    max_interval_in_seconds = var.consistency_policy.consistency_level == "BoundedStaleness" ? var.consistency_policy.max_interval_in_seconds : null
    max_staleness_prefix    = var.consistency_policy.consistency_level == "BoundedStaleness" ? var.consistency_policy.max_staleness_prefix : null
  } : local.consistency_presets[local.selected_preset]

  private_endpoint_name = provider::dx::resource_name(merge(local.naming_config, { resource_type = "cosmos_private_endpoint" }))

  # "Cosmos DB Built-in Data Reader/Cotributor" IDs
  cosmos_db_data_reader_role_id      = "${azurerm_cosmosdb_account.this.id}/sqlRoleDefinitions/00000000-0000-0000-0000-000000000001"
  cosmos_db_data_contributor_role_id = "${azurerm_cosmosdb_account.this.id}/sqlRoleDefinitions/00000000-0000-0000-0000-000000000002"

  # Create a map with all principal IDs and their corresponding role IDs
  principal_role_assignments = merge(
    { for i, pid in var.authorized_teams.readers : "reader-${i}" => {
      principal_id       = pid
      role_definition_id = local.cosmos_db_data_reader_role_id
      }
    },
    { for i, pid in var.authorized_teams.writers : "writer-${i}" => {
      principal_id       = pid
      role_definition_id = local.cosmos_db_data_contributor_role_id
      }
    }
  )
}
