locals {
  # General
  location_short = var.environment.location == "italynorth" ? "itn" : var.environment.location == "westeurope" ? "weu" : var.environment.location == "germanywestcentral" ? "gwc" : "neu"
  project        = "${var.environment.prefix}-${var.environment.env_short}-${local.location_short}"
  domain         = var.environment.domain == null ? "-" : "-${var.environment.domain}-"
  db_name_prefix = "${local.project}${local.domain}${var.environment.db_name}"
  name_net       = var.private_endpoint_enabled ? "pvt" : "pub"

  db = {
    name                         = var.is_replica ? "${local.db_name_prefix}-pgflex-replica-${var.environment.instance_number}" : "${local.db_name_prefix}-pgflex-${var.environment.instance_number}"
    sku_name                     = var.tier == "b" ? "B_Standard_B1ms" : var.tier == "gp" ? "GP_Standard_D2s_v3" : "MO_Standard_E4s_v3"
    create_mode                  = var.is_replica ? "Replica" : var.create_mode
    geo_redundant_backup_enabled = var.is_replica ? false : var.geo_redundant_backup_enabled
    backup_retention_days        = var.is_replica ? 7 : var.backup_retention_days

    credentials = var.is_replica ? {
      name     = null
      password = null
    } : var.administrator_credentials

    customer_managed_key_enabled = var.is_replica ? false : var.customer_managed_key_enabled

  }

  # Networking
  delegated_subnet_id = var.private_endpoint_enabled ? var.subnet_id == null ? azurerm_subnet.this[0].id : var.subnet_id : null
  private_dns_zone_id = var.private_endpoint_enabled ? var.private_dns_zone_id == null ? azurerm_private_dns_zone.this[0].id : var.private_dns_zone_id : null

  # Monitoring
  metric_alerts = var.custom_metric_alerts != null ? var.custom_metric_alerts : var.default_metric_alerts
}
