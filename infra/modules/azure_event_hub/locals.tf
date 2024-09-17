locals {
  # General
  location_short  = var.environment.location == "italynorth" ? "itn" : var.environment.location == "westeurope" ? "weu" : var.environment.location == "germanywestcentral" ? "gwc" : "neu"
  project         = "${var.environment.prefix}-${var.environment.env_short}-${local.location_short}"
  domain          = var.environment.domain == null ? "-" : "-${var.environment.domain}-"
  app_name_prefix = "${local.project}${local.domain}${var.environment.app_name}"

  eventhub = {
    name     = "${local.app_name_prefix}-evhns-${var.environment.instance_number}"
    sku_name = var.tier == "test" ? "Basic" : var.tier == "standard" ? "Standard" : "Premium"
    # Note: Basic SKU does not support private access
  }

  # Network
  private_dns_zone_resource_group_name = var.private_dns_zone_resource_group_name == null ? var.resource_group_name : var.private_dns_zone_resource_group_name

  # Backup
  zone_redundant = var.tier == "standard" || var.tier == "premium" ? true : false

  # Autoscaling
  auto_inflate_enabled = var.tier == "premium" ? true : false

  # Monitoring
  alerts_enabled = var.tier == "standard" || var.tier == "premium" ? true : false
}
