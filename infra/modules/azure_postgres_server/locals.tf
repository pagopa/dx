locals {
  db = {
    name         = "${module.naming_convention.prefix}-psql-${module.naming_convention.suffix}"
    replica_name = var.tier == "l" ? "${module.naming_convention.prefix}-psql-replica-${module.naming_convention.suffix}" : null
    sku_name = lookup(
      {
        "s" = "B_Standard_B1ms",
        "m" = "GP_Standard_D2s_v3",
        "l" = "GP_Standard_D2ds_v5"
      },
      var.tier,
      "GP_Standard_D2ds_v5" # Default
    )
  }

  # Replica
  replica_enabled = var.replica_enabled

  # Backup
  geo_redundant_backup_enabled = var.geo_redundant_backup_enabled
  high_availability_enabled    = var.high_availability_enabled
  auto_grow_enabled            = var.auto_grow_enabled

  # Monitoring
  metric_alerts         = var.custom_metric_alerts != null ? var.custom_metric_alerts : var.default_metric_alerts
  replica_metric_alerts = var.tier == "l" ? local.metric_alerts : {}
}
