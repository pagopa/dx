locals {
  environment = {
    prefix          = "dx"
    env_short       = "u"
    region          = "eu-south-1"
    domain          = "modules"
    app_name        = "test"
    instance_number = "01"
  }

  core_state = {
    storage_account_name = "dx-u-itn-tfstate"
    container_name       = "terraform-state"
    resource_group_name  = "dx-u-itn-tfstate-rg-01"
    key                  = "aws-core.tfstate"
  }

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Uat"
    Owner          = "DevEx"
    Source         = "https://github.com/pagopa/dx/modules/aws_github_environment_bootstrap/examples/complete"
    ManagementTeam = "Developer Experience"
  }
}
