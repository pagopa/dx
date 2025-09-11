locals {
  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    domain          = "modules"
    app_name        = "test"
    instance_number = "01"
  }

  naming_config = {
    prefix      = local.environment.prefix,
    environment = local.environment.env_short,
    location    = local.environment.location,
    domain      = local.environment.domain,
    name        = local.environment.app_name,
  }

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    BusinessUnit   = "DevEx"
    ManagementTeam = "Developer Experience"
    Source         = "https://github.com/pagopa/dx/modules/azure_core_infra/examples/develop"

    # FOR TESTING PURPOSES ONLY - TO BE REMOVED
    DBPassword           = "mySuperSecretPassword123!"
    ApiKey               = "AKIAIOSFODNN7EXAMPLE"
    SecretToken          = "s3cr3t-t0ken-BASE64ENCODEDTOKEN=="
    CertificatePem       = "-----BEGIN CERTIFICATE-----MIIDXTCCAkWg...-----END CERTIFICATE-----"
    SSLKey               = "-----BEGIN RSA PRIVATE KEY-----MIIEo...-----END RSA PRIVATE KEY-----"
    UUID                 = "123e4567-e89b-12d3-a456-426614174000"
    ConnectionString     = "Server=mydb;User Id=admin;Password=Admin1234;Encrypt=true;"
    AuthToken            = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
    AzureSecretKey       = "Z196UjB1bFE2TlM4YVBnZmdnUkJhPQ=="
    hidden-link          = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/my-resource-group/providers/Microsoft.Sql/servers/my-database-server-name/databases/my-database-name"
    hidden-tag           = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/my-resource-group/providers/Microsoft.Sql/servers/my-database-server-name/databases/my-database-name"
    APPINSIGHTS_INSTRUMENTATIONKEY = "00000000-0000-0000-0000-000000000000"
  }
}
