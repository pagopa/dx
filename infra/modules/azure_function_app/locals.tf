locals {
  location_short = var.environment.location == "italynorth" ? "itn" : var.environment.location == "westeurope" ? "weu" : var.environment.location == "germanywestcentral" ? "gwc" : "neu"
  project        = "${var.environment.prefix}-${var.environment.env_short}-${local.location_short}"
  domain         = var.environment.domain == null ? "-" : "-${var.environment.domain}-"

  subnet = {
    enable_service_endpoints = var.subnet_service_endpoints != null ? concat(
      var.subnet_service_endpoints.cosmos ? ["Microsoft.CosmosDB"] : [],
      var.subnet_service_endpoints.web ? ["Microsoft.Web"] : [],
      var.subnet_service_endpoints.storage ? ["Microsoft.Storage"] : [],
    ) : []
    name = "${local.project}${local.domain}${var.environment.app_name}-func-snet-${var.environment.instance_number}"
  }

  app_service_plan = {
    enable = var.app_service_plan_id == null
    name   = "${local.project}${local.domain}${var.environment.app_name}-asp-${var.environment.instance_number}"
  }

  function_app = {
    name                   = "${local.project}${local.domain}${var.environment.app_name}-func-${var.environment.instance_number}"
    sku_name               = var.tier == "test" ? "B1" : var.tier == "standard" ? "P0v3" : "P1v3"
    zone_balancing_enabled = var.tier != "test"
    is_slot_enabled        = var.tier == "test" ? 0 : 1
    pep_sites              = "${local.project}${local.domain}${var.environment.app_name}-func-pep-${var.environment.instance_number}"
    pep_sites_staging      = "${local.project}${local.domain}${var.environment.app_name}-staging-func-pep-${var.environment.instance_number}"
  }

  function_app_slot = {
    name = "staging"
  }

  application_insights = {
    enable = var.application_insights_connection_string != null
  }

  storage_account = {
    replication_type = var.tier == "test" ? "LRS" : "ZRS"
    name             = replace("${local.project}${replace(local.domain, "-", "")}${var.environment.app_name}stfn${var.environment.instance_number}", "-", "")
    pep_blob_name    = "${local.project}${local.domain}${var.environment.app_name}-blob-pep-${var.environment.instance_number}"
    pep_file_name    = "${local.project}${local.domain}${var.environment.app_name}-file-pep-${var.environment.instance_number}"
    pep_queue_name   = "${local.project}${local.domain}${var.environment.app_name}-queue-pep-${var.environment.instance_number}"
  }

  private_dns_zone = {
    resource_group_name = var.private_dns_zone_resource_group_name == null ? var.virtual_network.resource_group_name : var.private_dns_zone_resource_group_name
  }
}
