terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 3.111.0, < 5.0"
    }
  }
}


module "azure_app_service" {
  source = "../../../azure_app_service"

  environment         = var.environment
  tier                = "s"
  resource_group_name = var.resource_group_name

  virtual_network = {
    name                = var.virtual_network.name
    resource_group_name = var.virtual_network.resource_group_name
  }
  subnet_pep_id = var.subnet_pep_id
  subnet_id     = var.subnet_id

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