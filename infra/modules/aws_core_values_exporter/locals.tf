locals {
  # Automatically determine backend type based on populated fields
  backend_type = (
    var.core_state.bucket != null && var.core_state.region != null
  ) ? "s3" : "azurerm"

  # Select the appropriate data source based on detected backend type
  core_outputs = local.backend_type == "s3" ? data.terraform_remote_state.core[0].outputs : data.terraform_remote_state.core_azure[0].outputs
}
