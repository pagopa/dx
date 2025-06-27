data "terraform_remote_state" "core" {
  backend = "azurerm"

  config = {
    resource_group_name  = var.core_state.resource_group_name
    storage_account_name = var.core_state.storage_account_name
    container_name       = var.core_state.container_name
    key                  = var.core_state.key
  }
}
