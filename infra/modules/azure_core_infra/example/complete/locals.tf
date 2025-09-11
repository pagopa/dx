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
    AuthToken            = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
    AzureSecretKey       = "Z196UjB1bFE2TlM4YVBnZmdnUkJhPQ=="
    hidden-link          = "https://example.com,https://example.org"
    APPINSIGHTS_INSTRUMENTATIONKEY = "00000000-0000-0000-0000-000000000000"
  }
}
