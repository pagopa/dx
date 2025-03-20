terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4"
    }
  }
}

locals {
  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    Owner          = "DevEx"
    Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_app_service_plan/tests"
    ManagementTeam = "Developer Experience"
    Test           = "true"
    TestName       = "Create AppService Plan for automated tests"
  }
}

resource "azurerm_resource_group" "plan_test" {
  name     = "dx-d-itn-test-asp-rg-01"
  location = "italynorth"

  tags = local.tags
}
