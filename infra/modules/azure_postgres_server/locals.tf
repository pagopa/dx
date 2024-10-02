locals {
  # General
  location_short = var.environment.location == "italynorth" ? "itn" : var.environment.location == "westeurope" ? "weu" : var.environment.location == "germanywestcentral" ? "gwc" : "neu"
  project        = "${var.environment.prefix}-${var.environment.env_short}-${local.location_short}"
  domain         = var.environment.domain == null ? "-" : "-${var.environment.domain}-"
  db_name_prefix = "${local.project}${local.domain}${var.environment.app_name}"

  db = {
    name         = "${local.db_name_prefix}-psql-${var.environment.instance_number}"
    replica_name = var.tier == "l" ? "${local.db_name_prefix}-psql-replica-${var.environment.instance_number}" : null
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
  geo_redundant_backup_enabled = var.tier == "m" || var.tier == "l" ? true : false
  high_availability_enabled    = var.tier == "m" || var.tier == "l" ? true : false
  auto_grow_enabled            = var.tier == "m" || var.tier == "l" ? true : false

  # Monitoring
  metric_alerts         = var.custom_metric_alerts != null ? var.custom_metric_alerts : var.default_metric_alerts
  replica_metric_alerts = var.tier == "l" ? local.metric_alerts : {}
}
