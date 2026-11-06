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
    TestName       = "Azure GitHub environment bootstrap unit tests"
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

run "azure_github_environment_bootstrap_legacy_state_access" {
  command = plan

  assert {
    condition = alltrue([
      azurerm_role_assignment.infra_ci_tf_st_blob_contributor.scope == local.tf_storage_account.id,
      azurerm_role_assignment.infra_cd_st_tf_blob_contributor.scope == local.tf_storage_account.id,
      azurerm_role_assignment.app_cd_tf_rg_blob_contributor.scope == local.tf_storage_account.id,
      azurerm_role_assignment.opex_ci_tf_rg_blob_contributor.scope == local.tf_storage_account.id,
      azurerm_role_assignment.opex_cd_tf_rg_blob_contributor.scope == local.tf_storage_account.id,
      azurerm_role_assignment.opex_ci_subscription_data_access[0].role_definition_name == "Reader and Data Access",
      azurerm_role_assignment.opex_cd_tf_rg_blob_data_access[0].role_definition_name == "Reader and Data Access",
      azurerm_role_assignment.infra_ci_subscription_reader.role_definition_id == data.azurerm_role_definition.dx_infra_ci_subscription.id,
      azurerm_role_assignment.infra_cd_subscription_rbac_admin.role_definition_id == data.azurerm_role_definition.dx_infra_cd_subscription.id,
    ]) && length(azurerm_role_assignment.app_ci_tf_state_blob_contributor) == 0 && length(azurerm_role_assignment.terraform_state_upstream_reader) == 0
    error_message = "Legacy mode must preserve account-scoped state access and existing role bundles without container-only assignments"
  }

  assert {
    condition = alltrue([
      azurerm_role_assignment.infra_ci_tf_st_blob_contributor.description == "Allow ${var.repository.name} Infra CI identity to apply changes to the Terraform state file Storage Account scope",
      azurerm_role_assignment.infra_cd_st_tf_blob_contributor.description == "Allow ${var.repository.name} Infra CD identity to apply changes to the Terraform state file Storage Account scope",
      azurerm_role_assignment.app_cd_tf_rg_blob_contributor.description == "Allow ${var.repository.name} App CD identity to apply changes to the Terraform state file Storage Account scope",
      azurerm_role_assignment.opex_ci_tf_rg_blob_contributor.description == "Allow ${var.repository.name} Opex CI identity to apply changes to the Terraform state file Storage Account scope",
      azurerm_role_assignment.opex_cd_tf_rg_blob_contributor.description == "Allow ${var.repository.name} Opex CD identity to apply changes to the Terraform state file Storage Account scope",
      azurerm_role_assignment.infra_cd_subscription_rbac_admin.description == "Allow ${var.repository.name} Infra CD identity to manage the DX subscription admin bundle",
    ])
    error_message = "Legacy assignment descriptions must remain unchanged to avoid replacement"
  }
}

run "azure_github_environment_bootstrap_container_state_access" {
  command = plan

  variables {
    terraform_state_container_access = {
      upstream = {
        "dx-tf-state" = {
          identities    = ["infra_ci", "app_ci"]
          principal_ids = ["00000000-0000-0000-0000-000000000099"]
        }
      }
    }
  }

  override_resource {
    target          = azurerm_user_assigned_identity.infra_ci
    override_during = plan
    values = {
      id           = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-u-itn-test-rg-02/providers/Microsoft.ManagedIdentity/userAssignedIdentities/infra-ci"
      principal_id = "00000000-0000-0000-0000-000000000010"
    }
  }

  override_resource {
    target          = azurerm_user_assigned_identity.app_ci
    override_during = plan
    values = {
      id           = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/dx-u-itn-test-rg-02/providers/Microsoft.ManagedIdentity/userAssignedIdentities/app-ci"
      principal_id = "00000000-0000-0000-0000-000000000011"
    }
  }

  assert {
    condition = alltrue([
      for assignment in [
        azurerm_role_assignment.infra_ci_tf_st_blob_contributor,
        azurerm_role_assignment.infra_cd_st_tf_blob_contributor,
        azurerm_role_assignment.app_ci_tf_state_blob_contributor[0],
        azurerm_role_assignment.app_cd_tf_rg_blob_contributor,
        azurerm_role_assignment.opex_ci_tf_rg_blob_contributor,
        azurerm_role_assignment.opex_cd_tf_rg_blob_contributor,
      ] : lower(assignment.scope) == lower("${local.tf_storage_account.id}/blobServices/default/containers/test-tf-state") && assignment.role_definition_name == "Storage Blob Data Contributor"
    ])
    error_message = "All state identities must receive Blob Contributor on the default <domain>-tf-state container"
  }

  assert {
    condition = length(azurerm_role_assignment.terraform_state_upstream_reader) == 3 && alltrue([
      azurerm_role_assignment.terraform_state_upstream_reader[jsonencode(["dx-tf-state", "identity", "infra_ci"])].principal_id == "00000000-0000-0000-0000-000000000010",
      azurerm_role_assignment.terraform_state_upstream_reader[jsonencode(["dx-tf-state", "identity", "app_ci"])].principal_id == "00000000-0000-0000-0000-000000000011",
      azurerm_role_assignment.terraform_state_upstream_reader[jsonencode(["dx-tf-state", "principal", "00000000-0000-0000-0000-000000000099"])].principal_id == "00000000-0000-0000-0000-000000000099",
      azurerm_role_assignment.terraform_state_upstream_reader[jsonencode(["dx-tf-state", "identity", "infra_ci"])].scope == "${local.tf_storage_account.id}/blobServices/default/containers/dx-tf-state",
      azurerm_role_assignment.terraform_state_upstream_reader[jsonencode(["dx-tf-state", "identity", "infra_ci"])].role_definition_name == "Storage Blob Data Reader",
    ])
    error_message = "Only selected recipients should receive Reader on the declared core container"
  }

  assert {
    condition = alltrue([
      length(azurerm_role_assignment.opex_ci_subscription_data_access) == 0,
      length(azurerm_role_assignment.opex_cd_tf_rg_blob_data_access) == 0,
      azurerm_role_assignment.infra_ci_subscription_reader.role_definition_id == data.azurerm_role_definition.dx_infra_ci_subscription_state_safe[0].id,
      local.custom_role_definition_names.dx_infra_ci_subscription_state_safe == "PagoPA Uat DX Infra CI Subscription (No Storage Key Access)",
      azurerm_role_assignment.infra_cd_subscription_rbac_admin.role_definition_id == data.azurerm_role_definition.dx_infra_cd_subscription_no_rbac_admin[0].id,
      local.custom_role_definition_names.dx_infra_cd_subscription_no_rbac_admin == "PagoPA Uat DX Infra CD Subscription (No RBAC Admin)",
    ])
    error_message = "Container mode must use the agreed Infra subscription roles and remove broad Opex data access"
  }
}

run "azure_github_environment_bootstrap_container_state_access_own_container_only" {
  command = plan

  variables {
    terraform_state_container_access = {}
  }

  assert {
    condition     = azurerm_role_assignment.infra_ci_tf_st_blob_contributor.scope == "${local.tf_storage_account.id}/blobServices/default/containers/test-tf-state" && length(azurerm_role_assignment.terraform_state_upstream_reader) == 0
    error_message = "Opting in without upstreams must grant own-container access only"
  }
}

run "azure_github_environment_bootstrap_upstream_arm_id_override" {
  command = plan

  variables {
    terraform_state_container_access = {
      upstream = {
        "/subscriptions/22222222-2222-2222-2222-222222222222/resourceGroups/legacy-state/providers/Microsoft.Storage/storageAccounts/legacytf/blobServices/default/containers/old-tf-state" = {
          identities    = ["infra_ci"]
          principal_ids = ["00000000-0000-0000-0000-000000000099"]
        }
      }
    }
  }

  assert {
    condition     = azurerm_role_assignment.terraform_state_upstream_reader[jsonencode(["/subscriptions/22222222-2222-2222-2222-222222222222/resourceGroups/legacy-state/providers/Microsoft.Storage/storageAccounts/legacytf/blobServices/default/containers/old-tf-state", "identity", "infra_ci"])].scope == "/subscriptions/22222222-2222-2222-2222-222222222222/resourceGroups/legacy-state/providers/Microsoft.Storage/storageAccounts/legacytf/blobServices/default/containers/old-tf-state"
    error_message = "A full upstream container ID must be preserved for legacy or cross-account state"
  }
}

run "azure_github_environment_bootstrap_core_container_override" {
  command = plan

  variables {
    terraform_state_container_access = {
      container_name = "dx-tf-state"
    }
  }

  assert {
    condition     = lower(azurerm_role_assignment.infra_ci_tf_st_blob_contributor.scope) == lower("${local.tf_storage_account.id}/blobServices/default/containers/dx-tf-state")
    error_message = "Core may explicitly use <prefix>-tf-state as its managed state container"
  }
}

run "azure_github_environment_bootstrap_app_identities" {
  command = plan

  assert {
    condition     = azurerm_user_assigned_identity.app_ci.name == "dx-u-itn-test-app-github-ci-id-02"
    error_message = "The App CI user assigned identity has the wrong name"
  }

  assert {
    condition     = azurerm_federated_identity_credential.github_app_ci.subject == "repo:pagopa/dx-test-monorepo-starter-pack:environment:app-uat-ci"
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
    condition     = azurerm_user_assigned_identity.app_cd.name == "dx-u-itn-test-app-github-cd-id-02"
    error_message = "The App CD user assigned identity has the wrong name"
  }

  assert {
    condition     = azurerm_federated_identity_credential.github_app_cd.subject == "repo:pagopa/dx-test-monorepo-starter-pack:environment:app-uat-cd"
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
    condition     = azurerm_user_assigned_identity.infra_ci.name == "dx-u-itn-test-infra-github-ci-id-02"
    error_message = "The Infra CI user assigned identity has the wrong name"
  }

  assert {
    condition     = azurerm_user_assigned_identity.infra_cd.name == "dx-u-itn-test-infra-github-cd-id-02"
    error_message = "The Infra CD user assigned identity has the wrong name"
  }

  assert {
    condition     = azurerm_federated_identity_credential.github_infra_ci.subject == "repo:pagopa/dx-test-monorepo-starter-pack:environment:infra-uat-ci"
    error_message = "The Infra CI GitHub federation has the wrong subject"
  }

  assert {
    condition     = azurerm_federated_identity_credential.github_infra_cd.subject == "repo:pagopa/dx-test-monorepo-starter-pack:environment:infra-uat-cd"
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
    condition     = azurerm_user_assigned_identity.opex_ci.name == "dx-u-itn-test-opex-github-ci-id-02"
    error_message = "Opex CI identity name is incorrect"
  }

  assert {
    condition     = azurerm_user_assigned_identity.opex_cd.name == "dx-u-itn-test-opex-github-cd-id-02"
    error_message = "Opex CD identity name is incorrect"
  }

  assert {
    condition     = azurerm_federated_identity_credential.github_opex_ci.subject == "repo:pagopa/dx-test-monorepo-starter-pack:environment:opex-uat-ci"
    error_message = "GitHub Opex CI federated credential subject is incorrect"
  }

  assert {
    condition     = azurerm_federated_identity_credential.github_opex_cd.subject == "repo:pagopa/dx-test-monorepo-starter-pack:environment:opex-uat-cd"
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

run "azure_github_environment_bootstrap_dx_runner" {
  command = plan

  assert {
    condition     = output.github_dx_runner != null
    error_message = "The DX GitHub self-hosted runner should be provisioned"
  }

  assert {
    condition     = output.github_dx_runner.name != output.github_private_runner.name
    error_message = "The DX GitHub self-hosted runner should use its distinct name"
  }
}

run "azure_github_environment_bootstrap_dx_runner_configuration" {
  command = plan

  variables {
    github_private_runner = merge(var.github_private_runner, {
      labels = ["uat"]
    })
  }

  assert {
    condition     = output.github_dx_runner.image == "ghcr.io/pagopa/dx-github-self-hosted-runner:latest"
    error_message = "The DX GitHub self-hosted runner should use the DX image"
  }

  assert {
    condition     = output.github_dx_runner.labels == ["uat", "dx"]
    error_message = "The DX GitHub self-hosted runner should preserve configured labels and append dx"
  }
}

run "azure_github_environment_bootstrap_dx_runner_not_provisioned_for_other_prefixes" {
  command = plan

  variables {
    environment = merge(var.environment, {
      prefix = "ced"
    })
  }

  assert {
    condition     = output.github_dx_runner == null && length(module.github_runner_dx) == 0
    error_message = "The DX runner should not be provisioned when the environment prefix does not start with dx"
  }
}

run "azure_github_environment_bootstrap_dx_runner_provisioned_for_dx_prefix_variants" {
  command = plan

  variables {
    environment = merge(var.environment, {
      prefix = "dx1"
    })
  }

  assert {
    condition     = output.github_dx_runner != null
    error_message = "The DX runner should be provisioned when the environment prefix starts with dx"
  }
}

run "azure_github_environment_bootstrap_dx_runner_instance_number_boundary" {
  command = plan

  variables {
    environment = merge(var.environment, {
      instance_number = "99"
    })
  }

  assert {
    condition     = output.github_dx_runner != null
    error_message = "The DX GitHub self-hosted runner should support instance number 99"
  }
}

run "azure_github_environment_bootstrap_immutable_identities" {
  command = plan

  assert {
    condition     = azurerm_federated_identity_credential.github_infra_ci_immutable.subject == "repo:pagopa@57742367/dx-test-monorepo-starter-pack@1373623344:environment:infra-uat-ci"
    error_message = "The Infra CI immutable subject is incorrect"
  }

  assert {
    condition     = azurerm_federated_identity_credential.github_infra_cd_immutable.subject == "repo:pagopa@57742367/dx-test-monorepo-starter-pack@1373623344:environment:infra-uat-cd"
    error_message = "The Infra CD immutable subject is incorrect"
  }

  assert {
    condition     = azurerm_federated_identity_credential.github_automation_cd_immutable.subject == "repo:pagopa@57742367/dx-test-monorepo-starter-pack@1373623344:environment:automation-uat-cd"
    error_message = "The automation CD immutable subject is incorrect"
  }

  assert {
    condition     = azurerm_federated_identity_credential.github_app_ci_immutable.subject == "repo:pagopa@57742367/dx-test-monorepo-starter-pack@1373623344:environment:app-uat-ci"
    error_message = "The App CI immutable subject is incorrect"
  }

  assert {
    condition     = azurerm_federated_identity_credential.github_app_cd_immutable.subject == "repo:pagopa@57742367/dx-test-monorepo-starter-pack@1373623344:environment:app-uat-cd"
    error_message = "The App CD immutable subject is incorrect"
  }

  assert {
    condition     = azurerm_federated_identity_credential.github_opex_ci_immutable.subject == "repo:pagopa@57742367/dx-test-monorepo-starter-pack@1373623344:environment:opex-uat-ci"
    error_message = "The Opex CI immutable subject is incorrect"
  }

  assert {
    condition     = azurerm_federated_identity_credential.github_opex_cd_immutable.subject == "repo:pagopa@57742367/dx-test-monorepo-starter-pack@1373623344:environment:opex-uat-cd"
    error_message = "The Opex CD immutable subject is incorrect"
  }

  assert {
    condition     = azurerm_federated_identity_credential.github_infra_ci != null && azurerm_federated_identity_credential.github_app_ci != null
    error_message = "The name-based credentials must be kept for backward compatibility"
  }
}

run "azure_github_environment_bootstrap_custom_owner_identities" {
  command = plan

  variables {
    repository = {
      owner = "example-org"
      name  = "dx-test-monorepo-starter-pack"
    }
  }

  assert {
    condition     = azurerm_federated_identity_credential.github_app_ci.subject == "repo:example-org/dx-test-monorepo-starter-pack:environment:app-uat-ci"
    error_message = "The App CI subject must use the configured GitHub owner"
  }

  assert {
    condition     = azurerm_federated_identity_credential.github_app_cd.subject == "repo:example-org/dx-test-monorepo-starter-pack:environment:app-uat-cd"
    error_message = "The App CD subject must use the configured GitHub owner"
  }

  assert {
    condition     = azurerm_federated_identity_credential.github_infra_ci.subject == "repo:example-org/dx-test-monorepo-starter-pack:environment:infra-uat-ci"
    error_message = "The Infra CI subject must use the configured GitHub owner"
  }

  assert {
    condition     = azurerm_federated_identity_credential.github_infra_cd.subject == "repo:example-org/dx-test-monorepo-starter-pack:environment:infra-uat-cd"
    error_message = "The Infra CD subject must use the configured GitHub owner"
  }

  assert {
    condition     = azurerm_federated_identity_credential.github_automation_cd.subject == "repo:example-org/dx-test-monorepo-starter-pack:environment:automation-uat-cd"
    error_message = "The Automation CD subject must use the configured GitHub owner"
  }

  assert {
    condition     = azurerm_federated_identity_credential.github_opex_ci.subject == "repo:example-org/dx-test-monorepo-starter-pack:environment:opex-uat-ci"
    error_message = "The Opex CI subject must use the configured GitHub owner"
  }

  assert {
    condition     = azurerm_federated_identity_credential.github_opex_cd.subject == "repo:example-org/dx-test-monorepo-starter-pack:environment:opex-uat-cd"
    error_message = "The Opex CD subject must use the configured GitHub owner"
  }

  assert {
    condition     = azurerm_federated_identity_credential.github_infra_ci_immutable.subject == "repo:example-org@57742367/dx-test-monorepo-starter-pack@1373623344:environment:infra-uat-ci"
    error_message = "The immutable Infra CI subject must use the configured GitHub owner"
  }

  assert {
    condition     = azurerm_federated_identity_credential.github_infra_cd_immutable.subject == "repo:example-org@57742367/dx-test-monorepo-starter-pack@1373623344:environment:infra-uat-cd"
    error_message = "The immutable Infra CD subject must use the configured GitHub owner"
  }

  assert {
    condition     = azurerm_federated_identity_credential.github_automation_cd_immutable.subject == "repo:example-org@57742367/dx-test-monorepo-starter-pack@1373623344:environment:automation-uat-cd"
    error_message = "The immutable Automation CD subject must use the configured GitHub owner"
  }

  assert {
    condition     = azurerm_federated_identity_credential.github_app_ci_immutable.subject == "repo:example-org@57742367/dx-test-monorepo-starter-pack@1373623344:environment:app-uat-ci"
    error_message = "The immutable App CI subject must use the configured GitHub owner"
  }

  assert {
    condition     = azurerm_federated_identity_credential.github_app_cd_immutable.subject == "repo:example-org@57742367/dx-test-monorepo-starter-pack@1373623344:environment:app-uat-cd"
    error_message = "The immutable App CD subject must use the configured GitHub owner"
  }

  assert {
    condition     = azurerm_federated_identity_credential.github_opex_ci_immutable.subject == "repo:example-org@57742367/dx-test-monorepo-starter-pack@1373623344:environment:opex-uat-ci"
    error_message = "The immutable Opex CI subject must use the configured GitHub owner"
  }

  assert {
    condition     = azurerm_federated_identity_credential.github_opex_cd_immutable.subject == "repo:example-org@57742367/dx-test-monorepo-starter-pack@1373623344:environment:opex-uat-cd"
    error_message = "The immutable Opex CD subject must use the configured GitHub owner"
  }
}

run "azure_github_environment_bootstrap_user_owner_identities" {
  command = plan

  variables {
    repository = {
      owner    = "example-user"
      name     = "dx-test-monorepo-starter-pack"
      owner_id = 54321
    }
  }

  assert {
    condition     = azurerm_federated_identity_credential.github_infra_ci_immutable.subject == "repo:example-user@54321/dx-test-monorepo-starter-pack@1373623344:environment:infra-uat-ci"
    error_message = "The immutable Infra CI subject must use the supplied numeric GitHub owner ID"
  }

  assert {
    condition     = length(data.github_organization.owner) == 0
    error_message = "User-owned repositories must not query the GitHub organization data source"
  }
}

run "azure_github_environment_bootstrap_default_environment_secrets" {
  command = plan

  assert {
    condition = alltrue([
      github_actions_environment_secret.infra_ci["ARM_CLIENT_ID"].environment == "infra-uat-ci",
      github_actions_environment_secret.automation_ci["ARM_CLIENT_ID"].environment == "automation-uat-ci",
      github_actions_environment_secret.app_ci["ARM_CLIENT_ID"].environment == "app-uat-ci",
      github_actions_environment_secret.opex_ci["ARM_CLIENT_ID"].environment == "opex-uat-ci",
      github_actions_environment_secret.infra_cd["ARM_CLIENT_ID"].environment == "infra-uat-cd",
      github_actions_environment_secret.automation_cd["ARM_CLIENT_ID"].environment == "automation-uat-cd",
      github_actions_environment_secret.app_cd["ARM_CLIENT_ID"].environment == "app-uat-cd",
      github_actions_environment_secret.opex_cd["ARM_CLIENT_ID"].environment == "opex-uat-cd",
    ])
    error_message = "The default prefix flag must preserve existing GitHub secret environment names"
  }
}

run "azure_github_environment_bootstrap_prefix_flag_preserves_cloud_names" {
  command = plan

  variables {
    github_environment_prefix_enabled = true
  }

  assert {
    condition = alltrue([
      github_actions_environment_secret.infra_ci["ARM_CLIENT_ID"].environment == "infra-dx-uat-ci",
      azurerm_user_assigned_identity.infra_ci.name == "dx-u-itn-test-infra-github-ci-id-02",
    ])
    error_message = "The prefix flag must affect GitHub environment names only"
  }
}

run "azure_github_environment_bootstrap_ced_tenant_environment" {
  command = plan

  variables {
    environment = merge(var.environment, {
      env_short = "p"
      prefix    = "ced"
    })
    github_environment_prefix_enabled = true
  }

  assert {
    condition = alltrue([
      github_actions_environment_secret.infra_ci["ARM_CLIENT_ID"].environment == "infra-ced-prod-ci",
      github_actions_environment_secret.automation_ci["ARM_CLIENT_ID"].environment == "automation-ced-prod-ci",
      github_actions_environment_secret.app_ci["ARM_CLIENT_ID"].environment == "app-ced-prod-ci",
      github_actions_environment_secret.opex_ci["ARM_CLIENT_ID"].environment == "opex-ced-prod-ci",
      github_actions_environment_secret.infra_cd["ARM_CLIENT_ID"].environment == "infra-ced-prod-cd",
      github_actions_environment_secret.automation_cd["ARM_CLIENT_ID"].environment == "automation-ced-prod-cd",
      github_actions_environment_secret.app_cd["ARM_CLIENT_ID"].environment == "app-ced-prod-cd",
      github_actions_environment_secret.opex_cd["ARM_CLIENT_ID"].environment == "opex-ced-prod-cd",
      azurerm_user_assigned_identity.infra_ci.name == "ced-p-itn-test-infra-github-ci-id-02",
      azurerm_federated_identity_credential.github_infra_ci.name == "dx-test-monorepo-starter-pack-environment-infra-ced-prod-ci",
      azurerm_federated_identity_credential.github_infra_ci.subject == "repo:pagopa/dx-test-monorepo-starter-pack:environment:infra-ced-prod-ci",
      azurerm_federated_identity_credential.github_infra_ci_immutable.subject == "repo:pagopa@57742367/dx-test-monorepo-starter-pack@1373623344:environment:infra-ced-prod-ci",
      azurerm_federated_identity_credential.github_infra_cd.subject == "repo:pagopa/dx-test-monorepo-starter-pack:environment:infra-ced-prod-cd",
      azurerm_federated_identity_credential.github_infra_cd_immutable.subject == "repo:pagopa@57742367/dx-test-monorepo-starter-pack@1373623344:environment:infra-ced-prod-cd",
    ])
    error_message = "The ced prefix must scope GitHub secrets and OIDC subjects without changing resource naming rules"
  }
}

run "azure_github_environment_bootstrap_cgn_tenant_environment" {
  command = plan

  variables {
    environment = merge(var.environment, {
      env_short = "p"
      prefix    = "cgn"
    })
    github_environment_prefix_enabled = true
  }

  assert {
    condition = alltrue([
      github_actions_environment_secret.infra_ci["ARM_CLIENT_ID"].environment == "infra-cgn-prod-ci",
      github_actions_environment_secret.infra_cd["ARM_CLIENT_ID"].environment == "infra-cgn-prod-cd",
      azurerm_federated_identity_credential.github_infra_ci.name == "dx-test-monorepo-starter-pack-environment-infra-cgn-prod-ci",
      azurerm_federated_identity_credential.github_infra_ci.subject == "repo:pagopa/dx-test-monorepo-starter-pack:environment:infra-cgn-prod-ci",
      azurerm_federated_identity_credential.github_infra_ci_immutable.subject == "repo:pagopa@57742367/dx-test-monorepo-starter-pack@1373623344:environment:infra-cgn-prod-ci",
    ])
    error_message = "The cgn prefix must use its own GitHub environments and OIDC subjects"
  }
}
