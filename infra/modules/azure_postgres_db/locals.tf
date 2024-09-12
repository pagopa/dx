locals {
  # General
  location_short = var.environment.location == "italynorth" ? "itn" : var.environment.location == "westeurope" ? "weu" : var.environment.location == "germanywestcentral" ? "gwc" : "neu"
  project        = "${var.environment.prefix}-${var.environment.env_short}-${local.location_short}"
  domain         = var.environment.domain == null ? "-" : "-${var.environment.domain}-"
  db_name_prefix = "${local.project}${local.domain}${var.environment.db_name}"
  name_net       = var.private_endpoint_enabled ? "pvt" : "pub"

  db = {
    name     = "${local.db_name_prefix}-pgflex-${var.environment.instance_number}"
    sku_name = var.tier == "b" ? "B_Standard_B1ms" : var.tier == "gp" ? "GP_Standard_D2s_v3" : "MO_Standard_E4s_v3"
  }

  # Networking
  delegated_subnet_id = var.private_endpoint_enabled && var.subnet_id == null ? azurerm_subnet.this[0].id : var.subnet_id
  private_dns_zone_id = var.private_endpoint_enabled && var.private_dns_zone_id == null ? azurerm_private_dns_zone.this[0].id : var.private_dns_zone_id

  # Monitoring
  metric_alerts = var.custom_metric_alerts != null ? var.custom_metric_alerts : var.default_metric_alerts
}
