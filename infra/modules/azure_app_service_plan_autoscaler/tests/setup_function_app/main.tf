terraform {
  required_version = ">= 1.17.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 5.0.0, < 6.0.0"
    }
  }
}

module "azure_function_app" {
  source  = "pagopa-dx/azure-function-app-exposed/azurerm"
  version = "~> 6.0"

  environment         = var.environment
  use_case            = "default"
  resource_group_name = var.resource_group_name
  app_service_plan_id = var.app_service_plan_id

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
