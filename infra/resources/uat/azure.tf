module "azure_core_values" {
  source  = "pagopa-dx/azure-core-values-exporter/azurerm"
  version = "~> 2.0"

  core_state = local.core_state
}

# Dummy resource to force Terraform plan changes
resource "null_resource" "dummy" {
  triggers = {
    version = "1"
  }
}
