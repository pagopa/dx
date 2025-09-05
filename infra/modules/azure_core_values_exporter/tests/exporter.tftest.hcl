provider "azurerm" {
  features {
  }
}

run "exporter_azurerm_plan_works" {
  command = plan

  variables {
    core_state = {
      resource_group_name  = "dx-d-itn-tfstate-rg-01"
      storage_account_name = "dxditntfstatest01"
      container_name       = "terraform-state"
      key                  = "dx.core.dev.tfstate"
    }
  }

  assert {
    condition = local.backend_type == "azurerm"
    error_message = "Backend type should be azurerm"
  }

  assert {
    condition     = local.core_outputs.values.application_insights.name == "dx-d-itn-common-appi-01"
    error_message = "The application insights name is not correct"
  }
}
