provider "azurerm" {
  features {
  }
}

run "setup_tests" {
  module {
    source = "./tests/setup"
  }

  variables {
    environment = {
      prefix          = "dx"
      env_short       = "d"
      location        = "italynorth"
      domain          = "modules"
      app_name        = "test"
      instance_number = "01"
    }
  }
}

run "ids_default" {
  command = plan

  variables {
    prefix              = "dx"
    env                 = "dev"
    env_short           = "d"
    resource_group_name = run.setup_tests.resource_group_name
    domain              = "modules"
    repositories        = ["dx"]

    subscription_id = run.setup_tests.subscription_id

    tags = {}
  }

  assert {
    condition     = azurerm_user_assigned_identity.ci != null
    error_message = "CI identity should be created"
  }

  assert {
    condition     = azurerm_user_assigned_identity.cd != null
    error_message = "CD identity should be created"
  }

  assert {
    condition     = azurerm_federated_identity_credential.ci_github["dx.environment.dev-ci"].audience[0] == "api://AzureADTokenExchange"
    error_message = "CI federation must be done with AD auth"
  }

  assert {
    condition     = azurerm_federated_identity_credential.cd_github["dx.environment.dev-cd"].audience[0] == "api://AzureADTokenExchange"
    error_message = "CD federation must be done with AD auth"
  }

  assert {
    condition     = azurerm_federated_identity_credential.ci_github["dx.environment.dev-ci"].issuer == "https://token.actions.githubusercontent.com"
    error_message = "CI federation must be done with GitHub"
  }

  assert {
    condition     = azurerm_federated_identity_credential.ci_github["dx.environment.dev-ci"].issuer == "https://token.actions.githubusercontent.com"
    error_message = "CD federation must be done with GitHub"
  }

  assert {
    condition     = azurerm_federated_identity_credential.ci_github["dx.environment.dev-ci"].subject == "repo:pagopa/dx:environment:dev-ci"
    error_message = "CI federation must be done with the environment of PagoPA's DX repository"
  }

  assert {
    condition     = azurerm_federated_identity_credential.cd_github["dx.environment.dev-cd"].subject == "repo:pagopa/dx:environment:dev-cd"
    error_message = "CD federation must be done with the environment of PagoPA's DX repository"
  }

  assert {
    condition     = azurerm_role_assignment.ci_subscription["Reader"] != null
    error_message = "CI identity must have Reader role at subscription scope"
  }

  assert {
    condition     = azurerm_role_assignment.ci_subscription["Reader and Data Access"] != null
    error_message = "CI identity must have Reader and Data Access role at subscription scope"
  }

  assert {
    condition     = azurerm_role_assignment.ci_subscription["PagoPA IaC Reader"] != null
    error_message = "CI identity must have PagoPA IaC Reader role at subscription scope"
  }

  assert {
    condition     = azurerm_role_assignment.ci_subscription["DocumentDB Account Contributor"] != null
    error_message = "CI identity must have DocumentDB Account Contributor role at subscription scope"
  }

  assert {
    condition     = azurerm_role_assignment.ci_subscription["PagoPA API Management Service List Secrets"] != null
    error_message = "CI identity must have PagoPA API Management Service List Secrets role at subscription scope"
  }

  assert {
    condition     = azurerm_role_assignment.cd_subscription["Contributor"] != null
    error_message = "CD identity must have Contributor role at subscription scope"
  }

  assert {
    condition     = azurerm_role_assignment.ci_rg[0].role_definition_name == "Storage Blob Data Contributor"
    error_message = "CI identity must have Storage Blob Data Contributor role at terraform-state-rg resource group scope"
  }

  assert {
    condition     = azurerm_role_assignment.cd_rg[0].role_definition_name == "Storage Blob Data Contributor"
    error_message = "CD identity must have Storage Blob Data Contributor role at terraform-state-rg resource group scope"
  }
}

run "ids_custom_roles" {
  command = plan

  variables {
    prefix              = "dx"
    env                 = "dev"
    env_short           = "d"
    resource_group_name = run.setup_tests.resource_group_name
    domain              = "modules"
    repositories        = ["dx"]

    subscription_id = run.setup_tests.subscription_id

    continuos_integration = {
      enable = true
      roles = {
        subscription = [
          "Owner"
        ]
        resource_groups = {
          dx-d-itn-common-rg-01 = [
            "Storage Blob Data Reader"
          ]
        }
      }
    }

    continuos_delivery = {
      enable = true
      roles = {
        subscription = ["Owner"]
        resource_groups = {
          dx-d-itn-common-rg-01 = [
            "Storage Blob Data Owner"
          ]
        }
      }
    }

    tags = {}
  }

  assert {
    condition     = azurerm_role_assignment.ci_subscription["Owner"] != null
    error_message = "CI identity must have Owner role at subscription scope"
  }

  assert {
    condition     = azurerm_role_assignment.cd_subscription["Owner"] != null
    error_message = "CD identity must have Owner role at subscription scope"
  }

  assert {
    condition     = azurerm_role_assignment.ci_rg[0].role_definition_name == "Storage Blob Data Reader"
    error_message = "CI identity must have Storage Blob Data Reader role at dx-d-itn-common-rg-01 resource group scope"
  }

  assert {
    condition     = azurerm_role_assignment.cd_rg[0].role_definition_name == "Storage Blob Data Owner"
    error_message = "CD identity must have Storage Blob Data Owner role at dx-d-itn-common-rg-01 resource group scope"
  }
}

run "cd_disabled" {
  command = plan

  variables {
    prefix              = "dx"
    env                 = "dev"
    env_short           = "d"
    resource_group_name = run.setup_tests.resource_group_name
    domain              = "modules"
    repositories        = ["dx"]

    subscription_id = run.setup_tests.subscription_id

    continuos_delivery = {
      enable = false
    }

    tags = {}
  }

  assert {
    condition = azurerm_user_assigned_identity.cd == []
    error_message = "CD identity must not be created"
  }
}

run "ci_disabled" {
  command = plan

  variables {
    prefix              = "dx"
    env                 = "dev"
    env_short           = "d"
    resource_group_name = run.setup_tests.resource_group_name
    domain              = "modules"
    repositories        = ["dx"]

    subscription_id = run.setup_tests.subscription_id

    continuos_integration = {
      enable = false
    }

    tags = {}
  }

  assert {
    condition = azurerm_user_assigned_identity.ci == []
    error_message = "CI identity must not be created"
  }
}
