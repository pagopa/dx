resource "azurerm_resource_group" "example" {
  name     = "${local.project}-${local.environment.domain}-rg-${local.environment.instance_number}"
  location = local.environment.location
}

module "azure_function_app" {
  source  = "pagopa-dx/azure-function-app-exposed/azurerm"
  version = "~> 6.0"

  environment         = local.environment
  use_case            = "default"
  resource_group_name = azurerm_resource_group.example.name

  app_settings      = {}
  slot_app_settings = {}

  health_check_path = "/health"

  tags = local.tags
}


module "func_autoscaler" {
  source  = "pagopa-dx/azure-app-service-plan-autoscaler/azurerm"
  version = "~> 5.0"

  resource_group_name = module.azure_function_app.function_app.resource_group_name
  location            = local.environment.location

  app_service_plan_id = module.azure_function_app.function_app.plan.id

  target_service = {
    function_apps = [
      {
        id = module.azure_function_app.function_app.function_app.id
      }
    ]
  }

  scale_metrics = {
    cpu = {
      time_aggregation_increase = "Maximum"
      time_aggregation_decrease = "Average"
      increase_by               = 3
      cooldown_increase         = 2
      decrease_by               = 1
      cooldown_decrease         = 1
      upper_threshold           = 40
      lower_threshold           = 15
    },
    requests = {
      time_aggregation_increase = "Maximum"
      time_aggregation_decrease = "Average"
      increase_by               = 3
      cooldown_increase         = 1
      decrease_by               = 1
      cooldown_decrease         = 1
      upper_threshold           = 3000
      lower_threshold           = 300
    }
  }

  scheduler = {
    normal_load = {
      default = 3,
      minimum = 2,

    },
    maximum = 30,
  }

  tags = local.tags
}
