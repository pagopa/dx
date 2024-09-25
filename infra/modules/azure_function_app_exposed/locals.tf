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
    sku_name               = local.sku_name_mapping[local.tier]
    zone_balancing_enabled = local.tier != "s"
    is_slot_enabled        = local.tier == "s" ? 0 : 1
    worker_process_count   = local.worker_process_count_mapping[local.tier]
  }

  function_app_slot = {
    name = "staging"
  }

  application_insights = {
    enable = var.application_insights_connection_string != null
  }

  storage_account = {
    replication_type = local.tier == "s" ? "LRS" : "ZRS"
    name             = lower(replace("${local.project}${replace(local.domain, "-", "")}${var.environment.app_name}stfn${var.environment.instance_number}", "-", ""))
  }
}
