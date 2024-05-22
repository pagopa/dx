locals {
  location_short = var.location == "italynorth" ? "itn" : var.location == "westeurope" ? "weu" : var.location == "germanywestcentral" ? "gwc" : "neu"
  project        = "${var.prefix}-${var.env_short}-${local.location_short}"

  app_service_plan = {
    enable = var.app_service_plan_id == null
  }

  function_app = {
    sku_name               = var.tier == "test" ? "B1" : var.tier == "standard" ? "P0v3" : "P1v3"
    zone_balancing_enabled = var.tier != "test"
    is_slot_enabled        = var.tier == "test" ? 0 : 1
  }

  storage_account = {
    replication_type = var.tier == "test" ? "LRS" : "ZRS"
  }

  private_dns_zone = {
    resource_group_name = var.private_dns_zone_resource_group_name == null ? var.virtual_network.resource_group_name : var.private_dns_zone_resource_group_name
  }
}
