locals {
  environment = {
    prefix          = "dx"
    environment     = "d"
    location        = "italynorth"
    instance_number = "01"
  }

  core_state = {
    resource_group_name  = "dx-d-itn-tfstate-rg-01"
    storage_account_name = "dxditntfstatest01"
    container_name       = "terraform-state"
    key                  = "dx.core.dev.tfstate"
  }

  aws_naming_config = {
    prefix          = "dx"
    environment     = "p" # change to d
    region          = "eu-south-1"
    instance_number = 1
  }

  test_modes = ["integration", "e2e"]

  private_dns_zones = [
    "privatelink.azure-api.net",
    "azure-api.net",
    "privatelink.azurewebsites.net",
    "privatelink.blob.core.windows.net",
    "privatelink.${local.environment.location}.azurecontainerapps.io",
    "privatelink.documents.azure.com",
    "privatelink.file.core.windows.net",
    "management.azure-api.net",
    "privatelink.postgres.database.azure.com",
    "privatelink.queue.core.windows.net",
    "scm.azure-api.net",
    "privatelink.servicebus.windows.net",
    "privatelink.table.core.windows.net",
  ]

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Owner          = "DevEx"
    Environment    = "Prod"
    Source         = "https://github.com/pagopa/dx/blob/main/infra/resources/dev"
    ManagementTeam = "Developer Experience"
  }
}
