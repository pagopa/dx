locals {
  primary_location = var.primary_geo_location.location == null ? var.environment.location : var.primary_geo_location.location

  consistency_presets = {
    default = {
      consistency_level       = "Session"
      max_interval_in_seconds = null
      max_staleness_prefix    = null
    }
    high_consistency = {
      consistency_level       = "Strong"
      max_interval_in_seconds = null
      max_staleness_prefix    = null
    }
    high_performance = {
      consistency_level       = "Eventual"
      max_interval_in_seconds = null
      max_staleness_prefix    = null
    }
    balanced_staleness = {
      consistency_level       = "BoundedStaleness"
      max_interval_in_seconds = 300
      max_staleness_prefix    = 100000
    }
  }

  selected_preset = coalesce(var.consistency_policy.consistency_preset, "default")

  final_consistency_policy = local.selected_preset == "custom" ? {
    consistency_level       = var.consistency_policy.consistency_level
    max_interval_in_seconds = var.consistency_policy.consistency_level == "BoundedStaleness" ? var.consistency_policy.max_interval_in_seconds : null
    max_staleness_prefix    = var.consistency_policy.consistency_level == "BoundedStaleness" ? var.consistency_policy.max_staleness_prefix : null
  } : local.consistency_presets[local.selected_preset]

}