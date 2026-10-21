locals {
  tags = merge(var.tags, { ModuleSource = "DX", ModuleVersion = try(jsondecode(file("${path.module}/module.json")).version, "unknown"), ModuleName = try(jsondecode(file("${path.module}/project.json")).name, "unknown") })
  naming_config = {
    prefix          = var.environment.prefix,
    environment     = var.environment.env_short,
    location        = var.environment.location
    domain          = var.environment.domain,
    name            = var.environment.app_name,
    instance_number = tonumber(var.environment.instance_number),
  }

  subnet = {
    enable_service_endpoints = var.subnet_service_endpoints != null ? concat(
      var.subnet_service_endpoints.cosmos ? ["Microsoft.CosmosDB"] : [],
      var.subnet_service_endpoints.web ? ["Microsoft.Web"] : [],
      var.subnet_service_endpoints.storage ? ["Microsoft.Storage"] : [],
    ) : []
  }

  use_cases = {
    default = {
      sku            = "P1v3"
      slot           = true
      zone_balancing = true
    }
    high_load = {
      sku            = "P2v3"
      slot           = true
      zone_balancing = true
    }
  }

  use_case_features = local.use_cases[var.use_case]

  app_service_plan = {
    enable = var.app_service_plan_id == null
  }

  app_service = {
    name                  = provider::dx::resource_name(merge(local.naming_config, { resource_type = "app_service" }))
    sku_name              = var.size != null ? var.size : local.use_case_features.sku
    zone_balancing        = var.size != null && var.size == "P0v3" ? false : local.use_case_features.zone_balancing
    has_existing_subnet   = var.subnet_id != null
    private_endpoint_name = provider::dx::resource_name(merge(local.naming_config, { resource_type = "app_private_endpoint" }))
  }

  app_service_slot = {
    name                  = "staging"
    private_endpoint_name = provider::dx::resource_name(merge(local.naming_config, { resource_type = "app_slot_private_endpoint" }))
  }

  container_image_parts        = var.container_image == null ? [] : split("/", var.container_image)
  container_image_has_registry = length(local.container_image_parts) > 1 && can(regex("[.:]|^localhost$", try(local.container_image_parts[0], "")))

  container = {
    enable       = var.container_image != null
    use_acr      = local.container_image_has_registry && can(regex("\\.azurecr\\.io$", lower(try(local.container_image_parts[0], ""))))
    registry_url = var.container_image == null ? null : "https://${local.container_image_has_registry ? local.container_image_parts[0] : "index.docker.io"}"
    image_name   = var.container_image == null ? null : (local.container_image_has_registry ? join("/", slice(local.container_image_parts, 1, length(local.container_image_parts))) : var.container_image)
  }

  # Container-based apps run the image content, so the deployment package setting must not be set
  package_app_settings = local.container.enable ? {
    # https://learn.microsoft.com/en-us/troubleshoot/azure/app-service/faqs-app-service-linux-new#custom-containers
    WEBSITES_ENABLE_APP_SERVICE_STORAGE = "false"
    } : {
    # https://learn.microsoft.com/en-us/azure/azure-functions/run-functions-from-deployment-package#using-website_run_from_package--1
    WEBSITE_RUN_FROM_PACKAGE = 1
  }

  application_insights = {
    enable = nonsensitive(var.application_insights_connection_string != null)
  }

  private_dns_zone = {
    resource_group_name = var.private_dns_zone_resource_group_name == null ? var.virtual_network.resource_group_name : var.private_dns_zone_resource_group_name
  }
}
