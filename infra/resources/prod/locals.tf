locals {
  azure_environment = {
    prefix          = "dx"
    location        = "italynorth"
    location_short  = "itn"
    env_short       = "p"
    domain          = "devex"
    instance_number = "01"
  }

  core_state = {
    resource_group_name  = "dx-p-itn-tfstate-rg-01"
    storage_account_name = "dxpitntfstatest01"
    container_name       = "terraform-state"
    key                  = "dx.core.prod.tfstate"
  }

  azure_naming_config = {
    prefix          = local.azure_environment.prefix
    environment     = local.azure_environment.env_short
    location        = local.azure_environment.location_short
    instance_number = tonumber(local.azure_environment.instance_number)
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
