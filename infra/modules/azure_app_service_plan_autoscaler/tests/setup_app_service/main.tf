terraform {
  required_version = ">= 1.17.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 5.0.0, < 6.0.0"
    }
  }
}


module "azure_app_service" {
  source  = "pagopa-dx/azure-app-service-exposed/azurerm"
  version = "~> 6.0"

  environment         = var.environment
  use_case            = "default"
  resource_group_name = var.resource_group_name

  app_settings      = {}
  slot_app_settings = {}

  health_check_path = "/health"

  tags = var.tags
}

output "app_service_plan_id" {
  value = module.azure_app_service.app_service.plan.id
}

output "app_service" {
  value = {
    name = module.azure_app_service.app_service.app_service.name
    id   = module.azure_app_service.app_service.app_service.id
  }
}
