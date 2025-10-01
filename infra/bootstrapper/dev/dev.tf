module "azure" {
  source = "../_modules/azure"

  environment = local.azure_environment

  core_state = {
    resource_group_name  = "dx-d-itn-tfstate-rg-01"
    storage_account_name = "dxditntfstatest01"
    container_name       = "terraform-state"
    key                  = "dx.core.dev.tfstate"
  }

  repository = {
    owner = "pagopa"
    name  = "dx"
  }

  resource_group_ids = [
    azurerm_resource_group.integration.id,
    azurerm_resource_group.e2e.id
  ]

  tags = local.tags
}

module "aws" {
  source = "../_modules/aws"

  environment = local.aws_environment

  core_state = {
    resource_group_name  = "dx-d-itn-tfstate-rg-01"
    storage_account_name = "dxditntfstatest01"
    container_name       = "terraform-state"
    key                  = "dx.core.dev.tfstate"
  }

  repository = {
    owner = "pagopa"
    name  = "dx"
  }

  tags = local.tags
}
