locals {
  tags = merge(var.tags, { DXModuleVersion = try(jsondecode(file("${path.module}/package.json")).version, "unknown"), DXModuleName = try(jsondecode(file("${path.module}/package.json")).name) })
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
}
