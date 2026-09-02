variables {
  environment = {
    prefix          = "dx"
    env_short       = "u"
    location        = "italynorth"
    domain          = "modules"
    instance_number = "01"
  }
  resource_group_name = "rg-test"
  repository          = { name = "dx" }
  subscription_id     = "/subscriptions/00000000-0000-0000-0000-000000000000"
  tags                = {}
}

mock_provider "azurerm" {
  mock_data "azurerm_resource_group" {
    defaults = {
      id   = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-test"
      name = "rg-test"
    }
  }
}
mock_provider "dx" {}

run "federated_identity_creates_default_ci_and_cd_identities" {
  command = plan

  assert {
    condition     = length(azurerm_user_assigned_identity.ci) == 1 && length(azurerm_user_assigned_identity.cd) == 1
    error_message = "Default configuration must create CI and CD identities."
  }

  assert {
    condition     = azurerm_federated_identity_credential.ci_github[0].subject == "repo:pagopa/dx:environment:infra-uat-ci"
    error_message = "The CI credential must target the expected GitHub environment."
  }
}

run "federated_identity_uses_custom_roles" {
  command = plan
  variables {
    continuos_integration = { enable = true, roles = { subscription = ["Owner"], resource_groups = { rg-test = ["Storage Blob Data Reader"] } } }
    continuos_delivery    = { enable = true, roles = { subscription = ["Owner"], resource_groups = { rg-test = ["Storage Blob Data Owner"] } } }
  }

  assert {
    condition     = azurerm_role_assignment.ci_subscription["Owner"].role_definition_name == "Owner"
    error_message = "Custom CI subscription roles must be assigned."
  }

  assert {
    condition     = azurerm_role_assignment.cd_rg[0].role_definition_name == "Storage Blob Data Owner"
    error_message = "Custom CD resource-group roles must be assigned."
  }
}

run "federated_identity_omits_disabled_cd" {
  command = plan
  variables { continuos_delivery = { enable = false } }

  assert {
    condition     = length(azurerm_user_assigned_identity.cd) == 0
    error_message = "CD resources must not be created when CD is disabled."
  }
}

run "federated_identity_omits_disabled_ci" {
  command = plan
  variables { continuos_integration = { enable = false } }

  assert {
    condition     = length(azurerm_user_assigned_identity.ci) == 0
    error_message = "CI resources must not be created when CI is disabled."
  }
}
