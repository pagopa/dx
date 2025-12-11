module "azure" {
  source = "../_modules/azure"

  environment = local.azure_environment

  core_state = {
    resource_group_name  = "dx-u-itn-tfstate-rg-01"
    storage_account_name = "dxuitntfstatest01"
    container_name       = "terraform-state"
    key                  = "dx.core.uat.tfstate"
  }

  repository = {
    owner = "pagopa"
    name  = "dx"
  }

  resource_group_ids = []

  tags = local.tags
}

module "aws" {
  source = "../_modules/aws"

  environment = local.aws_environment

  core_state = {
    resource_group_name  = "dx-u-itn-tfstate-rg-01"
    storage_account_name = "dxuitntfstatest01"
    container_name       = "terraform-state"
    key                  = "dx.core.uat.tfstate"
  }

  repository = {
    owner = "pagopa"
    name  = "dx"
  }

  tags = local.tags
}
