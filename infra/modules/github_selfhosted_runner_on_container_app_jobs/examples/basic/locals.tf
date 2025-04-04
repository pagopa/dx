locals {
  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    instance_number = "01"
  }

  repo_name = "dx"

  key_vault = {
    name                = "dx-d-itn-common-kv-01"
    resource_group_name = "dx-d-itn-common-rg-01"
  }

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    BusinessUnit   = "DevEx"
    ManagementTeam = "Developer Experience"
    Source         = "https://github.com/pagopa/dx/modules/github_selfhosted_runner_container_app_job/examples/basic"
  }
}
