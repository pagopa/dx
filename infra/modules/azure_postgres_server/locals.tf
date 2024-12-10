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

  # Backup
  # Geo redundant backup is not available in Italy North
  geo_redundant_backup_enabled = (var.tier == "m" || var.tier == "l") && (lower(var.environment.location) != "italynorth" ) ? true : false
  high_availability_enabled    = var.tier == "m" || var.tier == "l" ? true : false
  auto_grow_enabled            = var.tier == "m" || var.tier == "l" ? true : false

  # Monitoring
  metric_alerts         = var.custom_metric_alerts != null ? var.custom_metric_alerts : var.default_metric_alerts
  replica_metric_alerts = var.tier == "l" ? local.metric_alerts : {}
}
