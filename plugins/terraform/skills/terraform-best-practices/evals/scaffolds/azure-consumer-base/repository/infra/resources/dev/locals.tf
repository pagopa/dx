locals {
  environment = {
    prefix          = "pay"
    env_short       = "d"
    location        = "italynorth"
    domain          = "shared"
    app_name        = "platform"
    instance_number = "01"
  }

  core_state = {
    resource_group_name  = "pay-d-itn-tfstate-rg-01"
    storage_account_name = "payditntfstate01"
    container_name       = "terraform-state"
    key                  = "payments.core.dev.tfstate"
  }

  tags = {
    BusinessUnit   = "Payments"
    CostCenter     = "PAYMENTS"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    ManagementTeam = "Payments Platform"
    Source         = "https://github.com/pagopa/example-terraform-consumer"
  }
}
