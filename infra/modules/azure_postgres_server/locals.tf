locals {
  # General
  location_short = var.environment.location == "italynorth" ? "itn" : var.environment.location == "westeurope" ? "weu" : var.environment.location == "germanywestcentral" ? "gwc" : "neu"
  project        = "${var.environment.prefix}-${var.environment.env_short}-${local.location_short}"
  domain         = var.environment.domain == null ? "-" : "-${var.environment.domain}-"
  db_name_prefix = "${local.project}${local.domain}${var.environment.db_name}"

  db = {
    name         = "${local.db_name_prefix}-ps-${var.environment.instance_number}"
    replica_name = var.tier == "premium" ? "${local.db_name_prefix}-ps-replica-${var.environment.instance_number}" : null
    sku_name     = var.tier == "test" ? "B_Standard_B1ms" : var.tier == "standard" ? "GP_Standard_D2s_v3" : "GP_Standard_D2s_v5"
  }

  # Backup
  high_availability_enabled = var.tier == "standard" || var.tier == "premium" ? true : false

  # Monitoring
  metric_alerts         = var.custom_metric_alerts != null ? var.custom_metric_alerts : var.default_metric_alerts
  replica_metric_alerts = var.tier == "premium" ? local.metric_alerts : {}
}
