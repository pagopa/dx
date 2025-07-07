module "core_values" {
  source  = "pagopa-dx/azure-core-values-exporter/azurerm"
  version = "~> 0.0"

  core_state = {
    resource_group_name  = "${local.project}-tfstate-rg-01"
    storage_account_name = replace("${local.project}tfstatest01", "-", "")
    container_name       = "terraform-state"
    key                  = "dx.core.prod.tfstate"
  }
}
