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
    TestName       = "Azure GitHub environment bootstrap unit tests"
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
  target = data.azurerm_role_definition.dx_infra_ci_subscription
  values = {
    id = "/subscriptions/00000000-0000-0000-0000-000000000000/providers/Microsoft.Authorization/roleDefinitions/00000000-0000-0000-0000-000000000103"
  }
}

override_data {
  target = data.azurerm_role_definition.dx_infra_ci_resource_groups
  values = {
    id = "/subscriptions/00000000-0000-0000-0000-000000000000/providers/Microsoft.Authorization/roleDefinitions/00000000-0000-0000-0000-000000000104"
  }
}

override_data {
  target = data.azurerm_role_definition.dx_infra_cd_subscription
  values = {
    id = "/subscriptions/00000000-0000-0000-0000-000000000000/providers/Microsoft.Authorization/roleDefinitions/00000000-0000-0000-0000-000000000105"
  }
}

override_data {
  target = data.azurerm_role_definition.dx_infra_cd_resource_groups
  values = {
    id = "/subscriptions/00000000-0000-0000-0000-000000000000/providers/Microsoft.Authorization/roleDefinitions/00000000-0000-0000-0000-000000000106"
  }
}

override_data {
  target = data.azurerm_role_definition.dx_infra_cd_private_networking
  values = {
    id = "/subscriptions/00000000-0000-0000-0000-000000000000/providers/Microsoft.Authorization/roleDefinitions/00000000-0000-0000-0000-000000000107"
  }
}

run "azure_github_environment_bootstrap_app_identities" {
  command = plan

  assert {
    condition     = azurerm_user_assigned_identity.app_ci.name == "dx-d-itn-test-app-github-ci-id-02"
    error_message = "The App CI user assigned identity has the wrong name"
  }

  assert {
    condition     = azurerm_federated_identity_credential.github_app_ci.subject == "repo:pagopa/dx-test-monorepo-starter-pack:environment:app-dev-ci"
    error_message = "The App CI GitHub federation has the wrong subject"
  }

  assert {
    condition     = azurerm_role_assignment.app_ci_subscription_reader != null
    error_message = "The App CI user assigned identity is not Reader of the subscription"
  }

  assert {
    condition     = length(azurerm_role_assignment.app_ci_rgs_reader) == 1
    error_message = "The App CI user assigned identity is not assigned the merged App CI resource group role"
  }

  assert {
    condition     = azurerm_user_assigned_identity.app_cd.name == "dx-d-itn-test-app-github-cd-id-02"
    error_message = "The App CD user assigned identity has the wrong name"
  }

  assert {
    condition     = azurerm_federated_identity_credential.github_app_cd.subject == "repo:pagopa/dx-test-monorepo-starter-pack:environment:app-dev-cd"
    error_message = "The App CD GitHub federation has the wrong subject"
  }

  assert {
    condition     = azurerm_role_assignment.app_cd_subscription_reader != null
    error_message = "The App CD user assigned identity is not Reader of the subscription"
  }

  assert {
    condition     = length(azurerm_role_assignment.app_cd_rgs_deploy) == 1
    error_message = "The App CD user assigned identity is not assigned the merged App CD resource group role"
  }

  assert {
    condition     = azurerm_role_assignment.app_cd_tf_rg_blob_contributor != null
    error_message = "The App CD user assigned identity is not Blob Contributor of the Terraform resource group"
  }
}

run "azure_github_environment_bootstrap_infra_identities" {
  command = plan

  assert {
    condition     = azurerm_user_assigned_identity.infra_ci.name == "dx-d-itn-test-infra-github-ci-id-02"
    error_message = "The Infra CI user assigned identity has the wrong name"
  }

  assert {
    condition     = azurerm_user_assigned_identity.infra_cd.name == "dx-d-itn-test-infra-github-cd-id-02"
    error_message = "The Infra CD user assigned identity has the wrong name"
  }

  assert {
    condition     = azurerm_federated_identity_credential.github_infra_ci.subject == "repo:pagopa/dx-test-monorepo-starter-pack:environment:infra-dev-ci"
    error_message = "The Infra CI GitHub federation has the wrong subject"
  }

  assert {
    condition     = azurerm_federated_identity_credential.github_infra_cd.subject == "repo:pagopa/dx-test-monorepo-starter-pack:environment:infra-dev-cd"
    error_message = "The Infra CD GitHub federation has the wrong subject"
  }

  assert {
    condition     = azurerm_role_assignment.infra_ci_subscription_reader != null
    error_message = "The Infra CI managed identity can't read resources at subscription scope"
  }

  assert {
    condition     = azurerm_role_assignment.infra_ci_rgs_reader != null
    error_message = "The Infra CI managed identity can't read the merged DX resource group bundle"
  }

  assert {
    condition     = azurerm_role_assignment.infra_ci_tf_st_blob_contributor != null
    error_message = "The Infra CI managed identity can't read Terraform state file Storage Account scope"
  }

  assert {
    condition     = azurerm_role_assignment.infra_cd_subscription_rbac_admin != null
    error_message = "The Infra CD managed identity is not assigned the merged subscription admin role"
  }

  assert {
    condition     = azurerm_role_assignment.infra_cd_rgs_deploy != null
    error_message = "The Infra CD managed identity can't apply the merged DX deploy role at resource group scope"
  }

  assert {
    condition     = azurerm_role_assignment.infra_cd_st_tf_blob_contributor != null
    error_message = "The Infra CD managed identity can't apply changes to the Terraform state file Storage Account scope"
  }

  assert {
    condition     = azurerm_role_assignment.infra_cd_rg_private_networking != null
    error_message = "The Infra CD managed identity can't apply the merged private networking role at resource group scope"
  }
}

run "azure_github_environment_bootstrap_entraid_rbac" {
  command = plan

  assert {
    condition     = azurerm_role_assignment.admins_group_rgs["main"].role_definition_name == "Owner"
    error_message = "The Admins group should have Owner on resource groups"
  }

  assert {
    condition     = azurerm_role_assignment.devs_group_rgs["main"].role_definition_name == "Contributor"
    error_message = "The Developers group should have Contributor on resource groups"
  }

  assert {
    condition     = azurerm_role_assignment.devs_group_tf_rgs_kv_secr["main"].role_definition_name == "Key Vault Secrets Officer"
    error_message = "The Developers group should have Key Vault Secrets Officer"
  }

  assert {
    condition     = azurerm_role_assignment.externals_group_rgs["main"].role_definition_name == "Reader"
    error_message = "The Externals group should have Reader on resource groups"
  }
}

run "azure_github_environment_bootstrap_opex_identities" {
  command = plan

  assert {
    condition     = azurerm_user_assigned_identity.opex_ci.name == "dx-d-itn-test-opex-github-ci-id-02"
    error_message = "Opex CI identity name is incorrect"
  }

  assert {
    condition     = azurerm_user_assigned_identity.opex_cd.name == "dx-d-itn-test-opex-github-cd-id-02"
    error_message = "Opex CD identity name is incorrect"
  }

  assert {
    condition     = azurerm_federated_identity_credential.github_opex_ci.subject == "repo:pagopa/dx-test-monorepo-starter-pack:environment:opex-dev-ci"
    error_message = "GitHub Opex CI federated credential subject is incorrect"
  }

  assert {
    condition     = azurerm_federated_identity_credential.github_opex_cd.subject == "repo:pagopa/dx-test-monorepo-starter-pack:environment:opex-dev-cd"
    error_message = "GitHub Opex CD federated credential subject is incorrect"
  }

  assert {
    condition     = azurerm_role_assignment.opex_ci_subscription_reader != null
    error_message = "Opex CI subscription reader role assignment should not be null"
  }

  assert {
    condition     = azurerm_role_assignment.opex_cd_subscription_reader != null
    error_message = "Opex CD subscription reader role assignment should not be null"
  }
}

