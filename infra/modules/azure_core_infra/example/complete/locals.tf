locals {
  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    domain          = "modules"
    app_name        = "test"
    instance_number = "01"
  }

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    BusinessUnit   = "DevEx"
    ManagementTeam = "Developer Experience"
    Source         = "https://github.com/pagopa/dx/modules/azure_core_infra/examples/complete"

    # FOR TESTING PURPOSES ONLY - TO BE REMOVED
    hidden-link          = "/subscriptions/0000000-0000-0000-0000-00000/resourceGroups/my-resource-group/providers/Microsoft.Sql/servers/my-database-server-name/databases/my-database-name"
  }
}
