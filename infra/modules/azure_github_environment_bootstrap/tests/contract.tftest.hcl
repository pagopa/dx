variables {
  environment = {
    prefix          = "dx"
    env_short       = "u"
    location        = "italynorth"
    domain          = "test"
    instance_number = "02"
  }

  entraid_groups = {
    admins_object_id    = "00000000-0000-0000-0000-000000000001"
    devs_object_id      = "00000000-0000-0000-0000-000000000002"
    externals_object_id = "00000000-0000-0000-0000-000000000003"
  }

  terraform_storage_account = {
    name                = "tfdevdx"
    resource_group_name = "terraform-state-rg"
  }

  repository = {
    name = "dx-test-monorepo-starter-pack"
  }

  github_private_runner = {
    container_app_environment_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-u-itn-github-runner-rg-01/providers/Microsoft.App/managedEnvironments/dx-u-itn-github-runner-cae-01"
    key_vault = {
      name                = "dx-u-itn-common-kv-01"
      resource_group_name = "dx-u-itn-common-rg-01"
    }
  }

  private_dns_zone_resource_group_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-u-itn-common-rg-01"
  opex_resource_group_id             = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-u-itn-opex-rg-01"

  tags = {
    CostCenter     = "TS720 - DEV EX"
    CreatedBy      = "Terraform"
    Environment    = "Uat"
    Owner          = "DevEx"
    Source         = "https://github.com/pagopa/dx/infra/modules/azure_github_environment_bootstrap/tests"
    ManagementTeam = "Developer Experience"
    Test           = "true"
    TestName       = "Azure GitHub environment bootstrap contract tests"
  }
}

mock_provider "azurerm" {}
mock_provider "github" {
  mock_data "github_organization" {
    defaults = {
      id = "57742367"
    }
  }
  mock_data "github_repository" {
    defaults = {
      repo_id = 1373623344
    }
  }
}
mock_provider "dx" {}

override_data {
  target = data.azurerm_subscription.current
  values = {
    id              = "/subscriptions/00000000-0000-0000-0000-000000000000"
    subscription_id = "00000000-0000-0000-0000-000000000000"
    tenant_id       = "11111111-1111-1111-1111-111111111111"
    display_name    = "PagoPA Uat"
  }
}

override_data {
  target = data.azurerm_role_definition.dx_app_ci_resource_groups
  values = {
    id = "/subscriptions/00000000-0000-0000-0000-000000000000/providers/Microsoft.Authorization/roleDefinitions/00000000-0000-0000-0000-000000000101"
  }
}

override_data {
  target = data.azurerm_role_definition.dx_app_cd_resource_groups
  values = {
    id = "/subscriptions/00000000-0000-0000-0000-000000000000/providers/Microsoft.Authorization/roleDefinitions/00000000-0000-0000-0000-000000000102"
  }
}

override_data {
  target = data.azurerm_role_definition.dx_infra_cd_resource_groups
  values = {
    id = "/subscriptions/00000000-0000-0000-0000-000000000000/providers/Microsoft.Authorization/roleDefinitions/00000000-0000-0000-0000-000000000106"
  }
}

override_data {
  target = data.azurerm_role_definition.dx_infra_ci_subscription_state_safe
  values = {
    id = "/subscriptions/00000000-0000-0000-0000-000000000000/providers/Microsoft.Authorization/roleDefinitions/00000000-0000-0000-0000-000000000108"
  }
}

override_data {
  target = data.azurerm_role_definition.dx_infra_cd_subscription_no_rbac_admin
  values = {
    id = "/subscriptions/00000000-0000-0000-0000-000000000000/providers/Microsoft.Authorization/roleDefinitions/00000000-0000-0000-0000-000000000109"
  }
}

run "azure_github_environment_bootstrap_additional_resource_group_ids" {
  command = plan

  variables {
    additional_resource_group_ids = [
      "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-u-itn-opex-rg-01",
      "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-u-itn-common-rg-01",
    ]
  }

  assert {
    condition     = azurerm_role_assignment.admins_group_rgs["/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-u-itn-opex-rg-01"].role_definition_name == "Owner"
    error_message = "The Admins group should be Owner of additional resource groups"
  }

  assert {
    condition     = azurerm_role_assignment.admins_group_rgs_kv_data["/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-u-itn-opex-rg-01"].role_definition_name == "Key Vault Data Access Administrator"
    error_message = "The Admins group should manage Key Vault data on additional resource groups"
  }

  assert {
    condition     = azurerm_role_assignment.admins_group_rgs_kv_admin["/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-u-itn-opex-rg-01"].role_definition_name == "Key Vault Administrator"
    error_message = "The Admins group should manage Key Vaults on additional resource groups"
  }

  assert {
    condition     = azurerm_role_assignment.devs_group_rgs["/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-u-itn-opex-rg-01"].role_definition_name == "Contributor"
    error_message = "The Devs group should be Contributor of additional resource groups"
  }

  assert {
    condition     = azurerm_role_assignment.devs_group_tf_rgs_kv_secr["/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-u-itn-opex-rg-01"].role_definition_name == "Key Vault Secrets Officer"
    error_message = "The Devs group should manage Key Vault secrets on additional resource groups"
  }

  assert {
    condition     = azurerm_role_assignment.externals_group_rgs["/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-u-itn-opex-rg-01"].role_definition_name == "Reader"
    error_message = "The Externals group should read additional resource groups"
  }

  assert {
    condition     = azurerm_role_assignment.app_ci_rgs_reader["/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-u-itn-opex-rg-01"] != null
    error_message = "The App CI identity is not assigned the merged App CI role on additional resource groups"
  }

  assert {
    condition     = azurerm_role_assignment.app_cd_rgs_deploy["/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-u-itn-opex-rg-01"] != null
    error_message = "The App CD identity is not assigned the merged App CD role on additional resource groups"
  }

  assert {
    condition     = azurerm_role_assignment.infra_cd_rgs_deploy["/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-u-itn-opex-rg-01"] != null
    error_message = "The Infra CD identity is not assigned the merged Infra CD role on additional resource groups"
  }
}

run "azure_github_environment_bootstrap_rejects_invalid_state_container_name" {
  command = plan

  variables {
    terraform_state_container_access = {
      container_name = "Invalid_Name"
    }
  }

  expect_failures = [
    var.terraform_state_container_access,
  ]
}

run "azure_github_environment_bootstrap_rejects_consecutive_hyphens_in_state_container_name" {
  command = plan

  variables {
    terraform_state_container_access = {
      container_name = "abc--def"
    }
  }

  expect_failures = [
    var.terraform_state_container_access,
  ]
}

run "azure_github_environment_bootstrap_rejects_empty_state_container_name" {
  command = plan

  variables {
    terraform_state_container_access = {
      container_name = ""
    }
  }

  expect_failures = [
    var.terraform_state_container_access,
  ]
}

run "azure_github_environment_bootstrap_rejects_invalid_upstream_scope" {
  command = plan

  variables {
    terraform_state_container_access = {
      upstream = {
        "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/core-state-rg" = {
          identities = ["infra_ci"]
        }
      }
    }
  }

  expect_failures = [
    var.terraform_state_container_access,
  ]
}

run "azure_github_environment_bootstrap_rejects_consecutive_hyphens_in_upstream_container_name" {
  command = plan

  variables {
    terraform_state_container_access = {
      upstream = {
        "core--tf-state" = {
          principal_ids = ["00000000-0000-0000-0000-000000000099"]
        }
      }
    }
  }

  expect_failures = [
    var.terraform_state_container_access,
  ]
}

run "azure_github_environment_bootstrap_rejects_duplicate_upstream_scopes" {
  command = plan

  variables {
    terraform_state_container_access = {
      upstream = {
        "dx-tf-state" = {
          identities = ["infra_ci"]
        }
        "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/terraform-state-rg/providers/Microsoft.Storage/storageAccounts/tfdevdx/blobServices/default/containers/dx-tf-state" = {
          identities = ["infra_ci"]
        }
      }
    }
  }

  expect_failures = [
    azurerm_role_assignment.terraform_state_upstream_reader,
  ]
}

run "azure_github_environment_bootstrap_rejects_unknown_upstream_identity" {
  command = plan

  variables {
    terraform_state_container_access = {
      upstream = {
        "core-tf-state" = {
          identities = ["unknown"]
        }
      }
    }
  }

  expect_failures = [
    var.terraform_state_container_access,
  ]
}

run "azure_github_environment_bootstrap_rejects_invalid_upstream_principal_id" {
  command = plan

  variables {
    terraform_state_container_access = {
      upstream = {
        "core-tf-state" = {
          principal_ids = ["not-an-object-id"]
        }
      }
    }
  }

  expect_failures = [
    var.terraform_state_container_access,
  ]
}

run "azure_github_environment_bootstrap_rejects_upstream_without_recipients" {
  command = plan

  variables {
    terraform_state_container_access = {
      upstream = {
        "core-tf-state" = {}
      }
    }
  }

  expect_failures = [
    var.terraform_state_container_access,
  ]
}

run "azure_github_environment_bootstrap_rejects_state_account_resource_group_overlap" {
  command = plan

  variables {
    terraform_state_container_access = {}
    additional_resource_group_ids = [
      "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/terraform-state-rg",
    ]
  }

  expect_failures = [
    azurerm_resource_group.main,
  ]
}

run "azure_github_environment_bootstrap_rejects_opex_state_account_resource_group_overlap" {
  command = plan

  variables {
    terraform_state_container_access = {}
    opex_resource_group_id           = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/terraform-state-rg"
  }

  expect_failures = [
    azurerm_resource_group.main,
  ]
}

run "azure_github_environment_bootstrap_rejects_private_networking_state_resource_group_overlap" {
  command = plan

  variables {
    terraform_state_container_access   = {}
    private_dns_zone_resource_group_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/terraform-state-rg"
  }

  expect_failures = [
    azurerm_resource_group.main,
  ]
}

run "azure_github_environment_bootstrap_rejects_workload_state_resource_group_overlap" {
  command = plan

  variables {
    terraform_state_container_access = {}
    terraform_storage_account = {
      name                = "tfdevdx"
      resource_group_name = "dx-u-itn-test-rg-02"
    }
  }

  expect_failures = [
    azurerm_resource_group.main,
  ]
}

run "azure_github_environment_bootstrap_allows_same_resource_group_name_in_another_subscription" {
  command = plan

  variables {
    terraform_state_container_access = {}
    additional_resource_group_ids = [
      "/subscriptions/22222222-2222-2222-2222-222222222222/resourceGroups/terraform-state-rg",
    ]
  }

  assert {
    condition     = azurerm_resource_group.main != null
    error_message = "A resource group with the same name in another subscription must not be treated as overlapping the state account resource group"
  }
}

run "azure_github_environment_bootstrap_invalid_additional_resource_group_ids" {
  command = plan

  variables {
    additional_resource_group_ids = [
      "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-u-itn-test-rg-01/providers/Microsoft.Storage/storageAccounts/tfdevdx",
    ]
  }

  expect_failures = [
    var.additional_resource_group_ids,
  ]
}

run "azure_github_environment_bootstrap_rejects_zero_owner_id" {
  command = plan

  variables {
    repository = {
      owner    = "example-user"
      name     = "dx-test-monorepo-starter-pack"
      owner_id = 0
    }
  }

  expect_failures = [var.repository]
}

run "azure_github_environment_bootstrap_rejects_negative_owner_id" {
  command = plan

  variables {
    repository = {
      owner    = "example-user"
      name     = "dx-test-monorepo-starter-pack"
      owner_id = -1
    }
  }

  expect_failures = [var.repository]
}

run "azure_github_environment_bootstrap_rejects_fractional_owner_id" {
  command = plan

  variables {
    repository = {
      owner    = "example-user"
      name     = "dx-test-monorepo-starter-pack"
      owner_id = 1.5
    }
  }

  expect_failures = [var.repository]
}
