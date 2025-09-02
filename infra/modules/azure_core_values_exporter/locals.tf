locals {
  # Automatically determine backend type based on populated fields
  backend_type = (
    var.core_state.storage_account_name != null &&
    var.core_state.container_name != null &&
    var.core_state.resource_group_name != null
  ) ? "azurerm" : "s3"

  # Select the appropriate data source based on detected backend type
  core_outputs = local.backend_type == "azurerm" ? data.terraform_remote_state.core_azurerm[0].outputs : data.terraform_remote_state.core_s3[0].outputs
}
