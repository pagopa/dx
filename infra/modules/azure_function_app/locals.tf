locals {
  location_short = var.environment.location == "italynorth" ? "itn" : var.environment.location == "westeurope" ? "weu" : var.environment.location == "germanywestcentral" ? "gwc" : "neu"
  project        = "${var.environment.prefix}-${var.environment.env_short}-${local.location_short}"

  app_service_plan = {
    enable = var.app_service_plan_id == null
  }

  function_app = {
    sku_name               = var.tier == "test" ? "B1" : var.tier == "standard" ? "P0v3" : "P1v3"
    zone_balancing_enabled = var.tier != "test"
    is_slot_enabled        = var.tier == "test" ? 0 : 1
    slot_name              = "staging"
  }

  application_insights = {
    enable = var.application_insights_connection_string != null
  }

  storage_account = {
    replication_type = var.tier == "test" ? "LRS" : "ZRS"
    name             = replace("${local.project}${var.environment.domain}${var.environment.app_name}stfn${var.environment.instance_number}", "-", "")
  }

  private_dns_zone = {
    resource_group_name = var.private_dns_zone_resource_group_name == null ? var.virtual_network.resource_group_name : var.private_dns_zone_resource_group_name
  }

  function_app_slot = {
    host_id           = "${azurerm_linux_function_app.this.name}-${local.function_app.slot_name}"
    truncated_host_id = substr("${azurerm_linux_function_app.this.name}-${local.function_app.slot_name}", length("${azurerm_linux_function_app.this.name}-${local.function_app.slot_name}") - 32, -1)
  }
}
