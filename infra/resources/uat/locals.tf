locals {
  environment = {
    prefix          = "dx"
    environment     = "u"
    location        = "italynorth"
    instance_number = "01"
  }

  core_state = {
    resource_group_name  = "dx-u-itn-tfstate-rg-01"
    storage_account_name = "dxuitntfstatest01"
    container_name       = "terraform-state"
    key                  = "dx.core.uat.tfstate"
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
    "privatelink.azconfig.io",
    "privatelink.vaultcore.azure.net",
  ]

  tags = {
    BusinessUnit   = "DevEx"
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Uat"
    ManagementTeam = "Developer Experience"
    Source         = "https://github.com/pagopa/dx/blob/main/infra/resources/uat"
  }
}
