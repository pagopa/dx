module "naming_convention" {
  source = "../../../azure_naming_convention"

  environment = local.environment
}

data "azurerm_subnet" "pep" {
  name                 = "${local.project}-pep-snet-01"
  virtual_network_name = "${local.project}-common-vnet-01"
  resource_group_name  = "${local.project}-network-rg-01"
}

resource "azurerm_resource_group" "example" {
  name     = "${local.project}-${local.environment.domain}-rg-${local.environment.instance_number}"
  location = local.environment.location
}

module "azure_function_app" {
  source = "../../../azure_function_app"

  environment         = local.environment
  tier                = "m"
  resource_group_name = azurerm_resource_group.example.name

  virtual_network = {
    name                = "${local.project}-common-vnet-01"
    resource_group_name = "${local.project}-network-rg-01"
  }
  subnet_pep_id = data.azurerm_subnet.pep.id
  subnet_cidr   = "10.50.249.0/24"

  app_settings      = {}
  slot_app_settings = {}

  health_check_path = "/health"

  tags = local.tags
}


module "func_autoscaler" {
  source = "../../"

  resource_group_name = module.azure_function_app.function_app.resource_group_name
  location            = local.environment.location

  app_service_plan_id = module.azure_function_app.function_app.plan.id

  target_service = {
    function_app = {
      id = module.azure_function_app.function_app.function_app.id
    }
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
