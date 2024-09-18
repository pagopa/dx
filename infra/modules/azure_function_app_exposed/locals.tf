locals {
  location_short  = var.environment.location == "italynorth" ? "itn" : var.environment.location == "westeurope" ? "weu" : var.environment.location == "germanywestcentral" ? "gwc" : "neu"
  project         = "${var.environment.prefix}-${var.environment.env_short}-${local.location_short}"
  domain          = var.environment.domain == null ? "-" : "-${var.environment.domain}-"
  app_name_prefix = "${local.project}${local.domain}${var.environment.app_name}"

  app_service_plan = {
    enable = var.app_service_plan_id == null
    name   = "${local.app_name_prefix}-asp-${var.environment.instance_number}"
  }

  function_app = {
    name                   = "${local.app_name_prefix}-func-${var.environment.instance_number}"
    sku_name               = var.tier == "test" ? "B1" : var.tier == "standard" ? "P0v3" : "P1v3"
    zone_balancing_enabled = var.tier != "test"
    is_slot_enabled        = var.tier == "test" ? 0 : 1
  }

  function_app_slot = {
    name = "staging"
  }

  application_insights = {
    enable = var.application_insights_connection_string != null
  }

  storage_account = {
    replication_type = var.tier == "test" ? "LRS" : "ZRS"
    name             = lower(replace("${local.project}${replace(local.domain, "-", "")}${var.environment.app_name}stfn${var.environment.instance_number}", "-", ""))
  }
}
