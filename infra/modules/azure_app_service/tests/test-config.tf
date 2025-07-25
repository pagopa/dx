# Test configuration for running tests without Azure authentication
# This file shows how to configure tests for local development and CI/CD

# Mock provider configuration for testing
provider "azurerm" {
  features {}
  # For testing purposes, you can use:
  # use_cli = false
  # use_msi = false
  # skip_provider_registration = true
}

# Example test variables that can be used across test files
variable "test_environment" {
  type = object({
    prefix          = string
    env_short       = string
    location        = string
    domain          = optional(string)
    app_name        = string
    instance_number = string
  })
  
  default = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    domain          = "modules"
    app_name        = "test"
    instance_number = "01"
  }
}

variable "test_tags" {
  type = map(string)
  default = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    Owner          = "DevEx"
    Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_app_service/tests"
    ManagementTeam = "Developer Experience"
    Test           = "true"
  }
}

# Example of how to run tests with minimal authentication
# 1. Set environment variables:
#    export ARM_USE_CLI=false
#    export ARM_USE_MSI=false
#    export ARM_SKIP_PROVIDER_REGISTRATION=true
#    export ARM_SUBSCRIPTION_ID="00000000-0000-0000-0000-000000000000"
#    export ARM_TENANT_ID="00000000-0000-0000-0000-000000000000"
#    export ARM_CLIENT_ID="00000000-0000-0000-0000-000000000000"
#    export ARM_CLIENT_SECRET="fake-client-secret"
#
# 2. Run tests with plan command only:
#    terraform test -verbose
#
# 3. For unit tests that don't require data sources:
#    terraform test -filter=unit-*
#
# 4. For validation tests:
#    terraform test -filter=validation-*