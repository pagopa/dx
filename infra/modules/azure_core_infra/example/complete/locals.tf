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
    CertificatePem       = "-----BEGIN CERTIFICATE-----MIIDXTCCAkWg...-----END CERTIFICATE-----"
    UUID                 = "123e4567-e89b-12d3-a456-426614174000"
    hidden-link          = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/my-resource-group/providers/Microsoft.Sql/servers/my-database-server-name/databases/my-database-name"
  }
}
