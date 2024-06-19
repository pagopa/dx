terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 3.100.0"
    }
  }
}

provider "azurerm" {
  features {}
}

module "autoscaler" {
  source = "../azure_app_service_plan_autoscaler"

  # environment = {
  #   prefix          = "io"
  #   env_short       = "d"
  #   location        = "italynorth"
  #   domain          = "test"
  #   app_name        = "autoscaler"
  #   instance_number = "01"
  # }

  resource_group_name = "dev-andreag"

  target_service = {
    app_service_name = "io-d-itn-test-autoscaler-app-01"
  }
  # app_service_plan_id = "/subscriptions/a4e96bcd-59dc-4d66-b2f7-5547ad157c12/resourceGroups/dev-andreag/providers/Microsoft.Web/serverfarms/io-d-test-autoscaler-asp-01"
  # app_service_id      = "/subscriptions/a4e96bcd-59dc-4d66-b2f7-5547ad157c12/resourcegroups/dev-andreag/providers/Microsoft.Web/sites/io-d-test-autoscaler-app-01"

  scheduler = {
    normal_load = {
      default = 2
      minimum = 1
    }
  }

  tags = {
    Test = "autoscale"
  }
}
