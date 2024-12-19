locals {
  app_service_plan = {
    enable = var.app_service_plan_id == null
    name   = module.naming_convention.name.app_service_plan["1"]
  }

  function_app = {
    name                   = module.naming_convention.name.function_app["1"]
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
    name             = module.naming_convention.name.function_storage_account["1"]
  }
}
