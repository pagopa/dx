locals {
  core_state = {
    resource_group_name  = "dx-p-itn-tfstate-rg-01"
    storage_account_name = "dxpitntfstatest01"
    container_name       = "terraform-state"
    key                  = "dx.core.prod.tfstate"
  }

  azure_naming_config = {
    prefix          = "dx"
    environment     = "p"
    location        = "itn"
    instance_number = 1
  }

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Owner          = "DevEx"
    Environment    = "Prod"
    Source         = "https://github.com/pagopa/dx/blob/main/infra/resources/prod"
    ManagementTeam = "Developer Experience"
  }
}
