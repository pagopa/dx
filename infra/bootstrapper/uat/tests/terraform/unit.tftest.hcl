variables {
  environment = {
    prefix          = "dx"
    env_short       = "u"
    location        = "italynorth"
    domain          = "test"
    app_name        = "core"
    instance_number = "02"
  }

  core_state = {
    resource_group_name  = "dx-u-itn-tfstate-rg"
    storage_account_name = "dxuitntfstate"
    container_name       = "terraform-state"
    key                  = "core.tfstate"
  }

  repository = {
    name = "dx-test-repo"
  }

  resource_group_ids = []

  tags = {
    CreatedBy      = "Terraform"
    Environment    = "Uat"
    ManagementTeam = "Developer Experience"
  }
}

mock_provider "azurerm" {}
mock_provider "azuread" {}
mock_provider "dx" {}
mock_provider "github" {}
mock_provider "hashicorpgithub" {
  mock_data "github_organization" {
    defaults = {
      id = "12345"
    }
  }

  mock_data "github_repository" {
    defaults = {
      repo_id = 67890
    }
  }
}

override_data {
  target = data.azurerm_subscription.current
  values = {
    id              = "/subscriptions/00000000-0000-0000-0000-000000000001"
    subscription_id = "00000000-0000-0000-0000-000000000001"
    tenant_id       = "00000000-0000-0000-0000-000000000002"
    display_name    = "Test Subscription"
  }
}

override_data {
  target = data.azurerm_client_config.current
  values = {
    subscription_id = "00000000-0000-0000-0000-000000000001"
  }
}

override_data {
  target = data.azuread_group.admins
  values = {
    object_id = "00000000-0000-0000-0000-000000000003"
  }
}

override_data {
  target = data.azuread_group.developers
  values = {
    object_id = "00000000-0000-0000-0000-000000000004"
  }
}

override_data {
  target = data.azuread_group.externals
  values = {
    object_id = "00000000-0000-0000-0000-000000000005"
  }
}

override_module {
  target = module.core_values
  outputs = {
    common_resource_group_id = "/subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/dx-u-itn-common-rg"
    common_key_vault = {
      name                = "dx-u-itn-common-kv"
      resource_group_name = "dx-u-itn-common-rg"
    }
    github_runner = {
      environment_id = "/subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/dx-u-itn-common-rg/providers/Microsoft.App/managedEnvironments/dx-u-itn-github-runner-cae"
    }
    network_resource_group_id = "/subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/dx-u-itn-network-rg"
    opex_resource_group_id    = "/subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/dx-u-itn-opex-rg"
    test_resource_group_id    = "/subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/dx-u-itn-test-rg"
  }
}

override_module {
  target = module.bootstrap
  outputs = {
    identities = {
      infra = {
        ci = {
          client_id    = "00000000-0000-0000-0000-000000000006"
          principal_id = "00000000-0000-0000-0000-000000000007"
        }
        cd = {
          client_id    = "00000000-0000-0000-0000-000000000008"
          principal_id = "00000000-0000-0000-0000-000000000009"
        }
      }
    }
    resource_group = {
      name     = "dx-u-itn-bootstrap-rg"
      location = "italynorth"
    }
    subscription_id = "00000000-0000-0000-0000-000000000001"
  }
}

run "bootstrapper_custom_owner_integration_test_subject" {
  command = plan

  module {
    source = "../../../_modules/azure"
  }

  variables {
    repository = {
      owner = "example-org"
      name  = "dx-test-repo"
    }
  }

  assert {
    condition     = azurerm_federated_identity_credential.infra_cd_integration_tests[0].subject == "repo:example-org/dx-test-repo:environment:automation-uat-cd"
    error_message = "The Integration Tests OIDC subject must use the configured GitHub owner"
  }

  assert {
    condition     = azurerm_federated_identity_credential.infra_cd_integration_tests_immutable[0].subject == "repo:example-org@12345/dx-test-repo@67890:environment:automation-uat-cd"
    error_message = "The immutable Integration Tests OIDC subject must use the configured GitHub owner and numeric repository IDs"
  }

}

run "bootstrapper_default_owner_integration_test_subject" {
  command = plan

  module {
    source = "../../../_modules/azure"
  }

  assert {
    condition     = azurerm_federated_identity_credential.infra_cd_integration_tests[0].subject == "repo:pagopa/dx-test-repo:environment:automation-uat-cd"
    error_message = "The Integration Tests OIDC subject must preserve the default GitHub owner"
  }

  assert {
    condition     = azurerm_federated_identity_credential.infra_cd_integration_tests_immutable[0].subject == "repo:pagopa@12345/dx-test-repo@67890:environment:automation-uat-cd"
    error_message = "The immutable Integration Tests subject must preserve the default GitHub owner"
  }
}

run "bootstrapper_non_uat_omits_integration_test_credentials" {
  command = plan

  module {
    source = "../../../_modules/azure"
  }

  variables {
    environment = merge(var.environment, {
      env_short = "d"
    })
  }

  assert {
    condition     = length(azurerm_federated_identity_credential.infra_cd_integration_tests) == 0 && length(azurerm_federated_identity_credential.infra_cd_integration_tests_immutable) == 0
    error_message = "Integration Tests credentials should only be created for UAT"
  }
}
