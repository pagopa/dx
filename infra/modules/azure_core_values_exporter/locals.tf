locals {
  # Automatically determine backend type based on populated fields
  backend_type = (
    var.core_state.storage_account_name != null &&
    var.core_state.container_name != null &&
    var.core_state.resource_group_name != null
  ) ? "azurerm" : "s3"

  # Select the appropriate data source based on detected backend type
  core_outputs = local.backend_type == "azurerm" ? data.terraform_remote_state.core_azurerm[0].outputs : data.terraform_remote_state.core_s3[0].outputs

  # local.core_outputs.values is a map of account IDs to their respective core values
  # previously, it was assumed there was only one account - the default value make this variable backwards compatible
  values = lookup(local.core_outputs.values, data.azurerm_subscription.current.subscription_id, local.core_outputs.values)

  # Raised by the remote state postconditions when the referenced core state does not
  # contain the `values` output produced by the azure-core-infra module.
  missing_values_output_error_message = <<-EOT
    The configured core remote state does not expose a `values` output.

    This module reads the core infrastructure outputs from a Terraform remote state
    and expects them to be wrapped in a top-level `values` output, as produced by
    the azure-core-infra module.

    This usually means one of the following:
      - core_state.key ("${var.core_state.key}") points to the wrong state file;
      - the referenced state file is empty or has not been applied yet;
      - the remote state does not belong to an azure-core-infra deployment.

    Check the `core_state` configuration and make sure the referenced state exists
    and has been produced by a deployed core infrastructure.
  EOT
}
