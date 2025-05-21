locals {
  naming_config = {
    prefix          = "dx"
    environment     = "d"
    location        = "italynorth"
    name            = "azsamemoney-poc"
    instance_number = 1
  }

  resource_group_name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "test",
    resource_type = "resource_group"
  }))

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    BusinessUnit   = "DevEx"
    Source         = "https://github.com/pagopa/dx/blob/main/infra/poc"
    ManagementTeam = "Developer Experience"
    Scope          = "PoC AzSaveMoney"
  }
}
