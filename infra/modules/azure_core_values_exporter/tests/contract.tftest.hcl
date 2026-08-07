variables {
  core_state = {
    resource_group_name  = "rg-tfstate"
    storage_account_name = "sttfstate"
    container_name       = "terraform-state"
    key                  = "core.tfstate"
  }
}

mock_provider "azurerm" {}
mock_provider "dx" {}

run "core_values_exporter_requires_complete_backend_settings" {
  command = plan
  variables { core_state = { key = "core.tfstate" } }
  expect_failures = [var.core_state]
}
