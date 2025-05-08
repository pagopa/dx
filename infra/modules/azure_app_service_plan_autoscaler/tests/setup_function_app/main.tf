terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 3.111.0, < 5.0"
    }
  }
}

module "azure_function_app" {
  source = "../../../azure_function_app_exposed"

  environment         = var.environment
  tier                = "s"
  resource_group_name = var.resource_group_name
  app_service_plan_id = var.app_service_plan_id

  # virtual_network = {
  #   name                = var.virtual_network.name
  #   resource_group_name = var.virtual_network.resource_group_name
  # }
  # subnet_pep_id = var.subnet_pep_id
  # subnet_id     = var.subnet_id

  app_settings      = {}
  slot_app_settings = {}

  health_check_path = "/health"

  tags = var.tags
}

output "function_app" {
  value = {
    name = module.azure_function_app.function_app.function_app.name
    id   = module.azure_function_app.function_app.function_app.id
  }
}