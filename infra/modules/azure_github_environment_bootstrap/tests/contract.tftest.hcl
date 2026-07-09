variables {
  environment = {
    prefix          = "dx"
    env_short       = "d"
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
    container_app_environment_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-d-itn-github-runner-rg-01/providers/Microsoft.App/managedEnvironments/dx-d-itn-github-runner-cae-01"
    key_vault = {
      name                = "dx-d-itn-common-kv-01"
      resource_group_name = "dx-d-itn-common-rg-01"
    }
  }

  private_dns_zone_resource_group_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-d-itn-common-rg-01"
  opex_resource_group_id             = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-d-itn-opex-rg-01"

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    Owner          = "DevEx"
    Source         = "https://github.com/pagopa/dx/infra/modules/azure_github_environment_bootstrap/tests"
    ManagementTeam = "Developer Experience"
    Test           = "true"
    TestName       = "Azure GitHub environment bootstrap contract tests"
  }
}

mock_provider "azurerm" {}
mock_provider "github" {}
mock_provider "dx" {}

override_data {
  target = data.azurerm_subscription.current
  values = {
    id              = "/subscriptions/00000000-0000-0000-0000-000000000000"
    subscription_id = "00000000-0000-0000-0000-000000000000"
    tenant_id       = "11111111-1111-1111-1111-111111111111"
    display_name    = "PagoPA Dev"
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

run "azure_github_environment_bootstrap_additional_resource_group_ids" {
  command = plan

  variables {
    additional_resource_group_ids = [
      "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-d-itn-opex-rg-01",
      "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-d-itn-common-rg-01",
    ]
  }

  assert {
    condition     = azurerm_role_assignment.admins_group_rgs["/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-d-itn-opex-rg-01"].role_definition_name == "Owner"
    error_message = "The Admins group should be Owner of additional resource groups"
  }

  assert {
    condition     = azurerm_role_assignment.admins_group_rgs_kv_data["/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-d-itn-opex-rg-01"].role_definition_name == "Key Vault Data Access Administrator"
    error_message = "The Admins group should manage Key Vault data on additional resource groups"
  }

  assert {
    condition     = azurerm_role_assignment.admins_group_rgs_kv_admin["/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-d-itn-opex-rg-01"].role_definition_name == "Key Vault Administrator"
    error_message = "The Admins group should manage Key Vaults on additional resource groups"
  }

  assert {
    condition     = azurerm_role_assignment.devs_group_rgs["/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-d-itn-opex-rg-01"].role_definition_name == "Contributor"
    error_message = "The Devs group should be Contributor of additional resource groups"
  }

  assert {
    condition     = azurerm_role_assignment.devs_group_tf_rgs_kv_secr["/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-d-itn-opex-rg-01"].role_definition_name == "Key Vault Secrets Officer"
    error_message = "The Devs group should manage Key Vault secrets on additional resource groups"
  }

  assert {
    condition     = azurerm_role_assignment.externals_group_rgs["/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-d-itn-opex-rg-01"].role_definition_name == "Reader"
    error_message = "The Externals group should read additional resource groups"
  }

  assert {
    condition     = azurerm_role_assignment.app_ci_rgs_reader["/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-d-itn-opex-rg-01"] != null
    error_message = "The App CI identity is not assigned the merged App CI role on additional resource groups"
  }

  assert {
    condition     = azurerm_role_assignment.app_cd_rgs_deploy["/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-d-itn-opex-rg-01"] != null
    error_message = "The App CD identity is not assigned the merged App CD role on additional resource groups"
  }

  assert {
    condition     = azurerm_role_assignment.infra_cd_rgs_deploy["/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-d-itn-opex-rg-01"] != null
    error_message = "The Infra CD identity is not assigned the merged Infra CD role on additional resource groups"
  }
}

run "azure_github_environment_bootstrap_invalid_additional_resource_group_ids" {
  command = plan

  variables {
    additional_resource_group_ids = [
      "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-d-itn-test-rg-01/providers/Microsoft.Storage/storageAccounts/tfdevdx",
    ]
  }

  expect_failures = [
    var.additional_resource_group_ids,
  ]
}

