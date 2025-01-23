locals {
  app_service_plan = {
    enable = var.app_service_plan_id == null
    name   = "${module.naming_convention.prefix}-asp-${module.naming_convention.suffix}"
  }

  function_app = {
    name                   = "${module.naming_convention.prefix}-func-${module.naming_convention.suffix}"
    sku_name               = local.sku_name_mapping[local.tier]
    zone_balancing_enabled = local.tier != "s"
    is_slot_enabled        = local.tier == "s" ? 0 : 1
    worker_process_count   = local.worker_process_count_mapping[local.tier]
  }

  function_app_slot = {
    name = "staging"
  }

  application_insights = {
    enable = var.application_insights_connection_string != null || var.application_insights_key != null
  }

  storage_account = {
    replication_type = local.tier == "s" ? "LRS" : "ZRS"
    name             = lower(replace("${module.naming_convention.project}${replace(module.naming_convention.domain, "-", "")}${var.environment.app_name}stfn${module.naming_convention.suffix}", "-", ""))
  }
}
