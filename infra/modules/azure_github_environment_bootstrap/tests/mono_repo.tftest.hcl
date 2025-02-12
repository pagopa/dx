provider "azurerm" {
  features {
  }
}

provider "github" {
  owner = "pagopa"
}

run "setup_tests" {
  module {
    source = "./tests/setup"
  }
}

run "validate_github_repository" {
  command = plan

  plan_options {
    target = [
      github_repository.this,
    ]
  }

  variables {
    environment = {
      prefix          = run.setup_tests.environment.prefix
      env_short       = run.setup_tests.environment.env_short
      location        = run.setup_tests.environment.location
      domain          = run.setup_tests.environment.domain
      app_name        = run.setup_tests.environment.app_name
      instance_number = run.setup_tests.environment.instance_number
    }

    subscription_id = run.setup_tests.subscription_id
    tenant_id       = run.setup_tests.tenant_id

    entraid_groups = {
      admins_object_id    = run.setup_tests.entraid_groups.admins_object_id
      devs_object_id      = run.setup_tests.entraid_groups.devs_object_id
      externals_object_id = run.setup_tests.entraid_groups.externals_object_id
    }

    terraform_storage_account = {
      name                = run.setup_tests.terraform_storage_account.name
      resource_group_name = run.setup_tests.terraform_storage_account.resource_group_name
    }

    repository = {
      name               = run.setup_tests.repository.name
      description        = run.setup_tests.repository.description
      topics             = run.setup_tests.repository.topics
      reviewers_teams    = run.setup_tests.repository.reviewers_teams
      app_cd_policy_tags = run.setup_tests.repository.app_cd_policy_tags
    }

    github_private_runner = {
      container_app_environment_id       = run.setup_tests.github_private_runner.container_app_environment_id
      container_app_environment_location = run.setup_tests.github_private_runner.container_app_environment_location
      key_vault = {
        name                = run.setup_tests.github_private_runner.key_vault.name
        resource_group_name = run.setup_tests.github_private_runner.key_vault.resource_group_name
      }
    }

    pep_vnet_id                   = run.setup_tests.pep_vnet_id
    dns_zone_resource_group_id    = run.setup_tests.dns_zone_resource_group_id
    opex_resource_group_id        = run.setup_tests.opex_resource_group_id
    nat_gateway_resource_group_id = run.setup_tests.dns_zone_resource_group_id

    tags = run.setup_tests.tags
  }

  assert {
    condition     = github_repository.this.name == "dx-test-monorepo-starter-pack"
    error_message = "The repository name is not correct"
  }

  assert {
    condition     = github_repository.this.description == "Devex repository for shared tools and pipelines."
    error_message = "The repository description is not correct"
  }

  assert {
    condition     = tolist(github_repository.this.topics) == tolist(["developer-experience"])
    error_message = "The repository topics are not correct"
  }

  assert {
    condition     = github_repository.this.visibility == "public"
    error_message = "The repository visibilty is not correct"
  }

  assert {
    condition     = github_repository.this.allow_rebase_merge == false
    error_message = "The repository PR merge setup is not correct"
  }

  assert {
    condition     = github_repository.this.allow_merge_commit == false
    error_message = "The repository PR merge setup is not correct"
  }

  assert {
    condition     = github_repository.this.allow_squash_merge == true
    error_message = "The repository PR merge setup is not correct"
  }
}

run "validate_github_branch_protection" {
  command = plan

  plan_options {
    target = [
      github_branch_protection.main,
    ]
  }

  variables {
    environment = {
      prefix          = run.setup_tests.environment.prefix
      env_short       = run.setup_tests.environment.env_short
      location        = run.setup_tests.environment.location
      domain          = run.setup_tests.environment.domain
      app_name        = run.setup_tests.environment.app_name
      instance_number = run.setup_tests.environment.instance_number
    }

    subscription_id = run.setup_tests.subscription_id
    tenant_id       = run.setup_tests.tenant_id

    entraid_groups = {
      admins_object_id    = run.setup_tests.entraid_groups.admins_object_id
      devs_object_id      = run.setup_tests.entraid_groups.devs_object_id
      externals_object_id = run.setup_tests.entraid_groups.externals_object_id
    }

    terraform_storage_account = {
      name                = run.setup_tests.terraform_storage_account.name
      resource_group_name = run.setup_tests.terraform_storage_account.resource_group_name
    }

    repository = {
      name               = run.setup_tests.repository.name
      description        = run.setup_tests.repository.description
      topics             = run.setup_tests.repository.topics
      reviewers_teams    = run.setup_tests.repository.reviewers_teams
      app_cd_policy_tags = run.setup_tests.repository.app_cd_policy_tags
    }

    github_private_runner = {
      container_app_environment_id       = run.setup_tests.github_private_runner.container_app_environment_id
      container_app_environment_location = run.setup_tests.github_private_runner.container_app_environment_location
      key_vault = {
        name                = run.setup_tests.github_private_runner.key_vault.name
        resource_group_name = run.setup_tests.github_private_runner.key_vault.resource_group_name
      }
    }

    pep_vnet_id                   = run.setup_tests.pep_vnet_id
    dns_zone_resource_group_id    = run.setup_tests.dns_zone_resource_group_id
    opex_resource_group_id        = run.setup_tests.opex_resource_group_id
    nat_gateway_resource_group_id = run.setup_tests.dns_zone_resource_group_id

    tags = run.setup_tests.tags
  }

  assert {
    condition     = github_branch_protection.main.pattern == "main"
    error_message = "The repository branch protection on main is not set"
  }

  assert {
    condition     = github_branch_protection.main.require_conversation_resolution == true
    error_message = "The main branch is not requiring conversation resolution"
  }

  assert {
    condition     = github_branch_protection.main.allows_force_pushes == false
    error_message = "The main branch is allowing force pushes"
  }
}

run "validate_github_default_branch_override" {
  command = plan

  plan_options {
    target = [
      github_branch_protection.main,
    ]
  }

  variables {
    environment = {
      prefix          = run.setup_tests.environment.prefix
      env_short       = run.setup_tests.environment.env_short
      location        = run.setup_tests.environment.location
      domain          = run.setup_tests.environment.domain
      app_name        = run.setup_tests.environment.app_name
      instance_number = run.setup_tests.environment.instance_number
    }

    subscription_id = run.setup_tests.subscription_id
    tenant_id       = run.setup_tests.tenant_id

    entraid_groups = {
      admins_object_id    = run.setup_tests.entraid_groups.admins_object_id
      devs_object_id      = run.setup_tests.entraid_groups.devs_object_id
      externals_object_id = run.setup_tests.entraid_groups.externals_object_id
    }

    terraform_storage_account = {
      name                = run.setup_tests.terraform_storage_account.name
      resource_group_name = run.setup_tests.terraform_storage_account.resource_group_name
    }

    repository = {
      name                = run.setup_tests.repository.name
      description         = run.setup_tests.repository.description
      topics              = run.setup_tests.repository.topics
      reviewers_teams     = run.setup_tests.repository.reviewers_teams
      default_branch_name = "master"
    }

    github_private_runner = {
      container_app_environment_id       = run.setup_tests.github_private_runner.container_app_environment_id
      container_app_environment_location = run.setup_tests.github_private_runner.container_app_environment_location
      key_vault = {
        name                = run.setup_tests.github_private_runner.key_vault.name
        resource_group_name = run.setup_tests.github_private_runner.key_vault.resource_group_name
      }
    }

    pep_vnet_id                   = run.setup_tests.pep_vnet_id
    dns_zone_resource_group_id    = run.setup_tests.dns_zone_resource_group_id
    opex_resource_group_id        = run.setup_tests.opex_resource_group_id
    nat_gateway_resource_group_id = run.setup_tests.dns_zone_resource_group_id

    tags = run.setup_tests.tags
  }

  assert {
    condition     = github_branch_protection.main.pattern == "master"
    error_message = "The repository branch protection on master is not set"
  }
}

run "validate_github_id_app" {
  command = plan

  plan_options {
    target = [
      azurerm_user_assigned_identity.app_cd,
      azurerm_federated_identity_credential.github_app_cd,
      azurerm_role_assignment.app_cd_subscription_reader,
      azurerm_role_assignment.app_cd_rg_contributor,
      azurerm_role_assignment.app_cd_tf_rg_blob_contributor,
    ]
  }

  variables {
    environment = {
      prefix          = run.setup_tests.environment.prefix
      env_short       = run.setup_tests.environment.env_short
      location        = run.setup_tests.environment.location
      domain          = run.setup_tests.environment.domain
      app_name        = run.setup_tests.environment.app_name
      instance_number = run.setup_tests.environment.instance_number
    }

    subscription_id = run.setup_tests.subscription_id
    tenant_id       = run.setup_tests.tenant_id

    entraid_groups = {
      admins_object_id    = run.setup_tests.entraid_groups.admins_object_id
      devs_object_id      = run.setup_tests.entraid_groups.devs_object_id
      externals_object_id = run.setup_tests.entraid_groups.externals_object_id
    }

    terraform_storage_account = {
      name                = run.setup_tests.terraform_storage_account.name
      resource_group_name = run.setup_tests.terraform_storage_account.resource_group_name
    }

    repository = {
      name               = run.setup_tests.repository.name
      description        = run.setup_tests.repository.description
      topics             = run.setup_tests.repository.topics
      reviewers_teams    = run.setup_tests.repository.reviewers_teams
      app_cd_policy_tags = run.setup_tests.repository.app_cd_policy_tags
    }

    github_private_runner = {
      container_app_environment_id       = run.setup_tests.github_private_runner.container_app_environment_id
      container_app_environment_location = run.setup_tests.github_private_runner.container_app_environment_location
      key_vault = {
        name                = run.setup_tests.github_private_runner.key_vault.name
        resource_group_name = run.setup_tests.github_private_runner.key_vault.resource_group_name
      }
    }

    pep_vnet_id                   = run.setup_tests.pep_vnet_id
    dns_zone_resource_group_id    = run.setup_tests.dns_zone_resource_group_id
    opex_resource_group_id        = run.setup_tests.opex_resource_group_id
    nat_gateway_resource_group_id = run.setup_tests.dns_zone_resource_group_id

    tags = run.setup_tests.tags
  }

  assert {
    condition     = azurerm_user_assigned_identity.app_cd.name == "dx-d-itn-test-app-github-cd-id-02"
    error_message = "The App CD user assigned identity has the wrong name"
  }

  assert {
    condition     = azurerm_federated_identity_credential.github_app_cd != null
    error_message = "The App CD GitHub federation is not set"
  }

  assert {
    condition     = azurerm_role_assignment.app_cd_subscription_reader != null
    error_message = "The App CD user assigned identity is not Reader of the subscription"
  }

  assert {
    condition     = azurerm_role_assignment.app_cd_rg_contributor != null
    error_message = "The App CD user assigned identity is not Contributor of the resource group"
  }

  assert {
    condition     = azurerm_role_assignment.app_cd_tf_rg_blob_contributor != null
    error_message = "The App CD user assigned identity is not Blob Contributor of the Terraform resource group"
  }
}

run "validate_github_id_infra" {
  command = plan

  plan_options {
    target = [
      azurerm_user_assigned_identity.infra_ci,
      azurerm_user_assigned_identity.infra_cd,
      azurerm_federated_identity_credential.github_infra_ci,
      azurerm_federated_identity_credential.github_infra_cd,
      azurerm_role_assignment.infra_ci_subscription_reader,
      azurerm_role_assignment.infra_ci_subscription_data_access,
      azurerm_role_assignment.infra_ci_subscription_pagopa_iac_reader,
      azurerm_role_assignment.infra_ci_rg_cosmos_contributor,
      azurerm_role_assignment.infra_ci_tf_st_blob_contributor,
      azurerm_role_assignment.infra_ci_rg_kv_secr,
      azurerm_role_assignment.infra_ci_rg_kv_cert,
      azurerm_role_assignment.infra_ci_rg_kv_crypto,
      azurerm_role_assignment.infra_ci_rg_st_blob_reader,
      azurerm_role_assignment.infra_ci_rg_st_queue_reader,
      azurerm_role_assignment.infra_ci_rg_ext_pagopa_dns_reader,
      azurerm_key_vault_access_policy.infra_ci_kv_common,
      azurerm_role_assignment.infra_cd_subscription_reader,
      azurerm_role_assignment.infra_cd_subscription_rbac_admin,
      azurerm_role_assignment.infra_cd_rg_contributor,
      azurerm_role_assignment.infra_cd_vnet_network_contributor,
      azurerm_role_assignment.infra_cd_apim_service_contributor,
      azurerm_role_assignment.infra_cd_st_tf_blob_contributor,
      azurerm_role_assignment.infra_cd_rg_rbac_admin,
      azurerm_role_assignment.infra_cd_rg_user_access_admin,
      azurerm_role_assignment.infra_cd_rg_kv_secr,
      azurerm_role_assignment.infra_cd_rg_kv_cert,
      azurerm_role_assignment.infra_cd_rg_kv_crypto,
      azurerm_role_assignment.infra_cd_rg_st_blob_contributor,
      azurerm_role_assignment.infra_ci_rg_st_queue_contributor,
      azurerm_role_assignment.infra_cd_rg_ext_network_dns_zone_contributor,
      azurerm_role_assignment.infra_cd_rg_ext_network_contributor,
      azurerm_role_assignment.infra_cd_rg_nat_gw_network_contributor,
      azurerm_key_vault_access_policy.infra_cd_kv_common,
    ]
  }

  variables {
    environment = {
      prefix          = run.setup_tests.environment.prefix
      env_short       = run.setup_tests.environment.env_short
      location        = run.setup_tests.environment.location
      domain          = run.setup_tests.environment.domain
      app_name        = run.setup_tests.environment.app_name
      instance_number = run.setup_tests.environment.instance_number
    }

    subscription_id = run.setup_tests.subscription_id
    tenant_id       = run.setup_tests.tenant_id

    entraid_groups = {
      admins_object_id    = run.setup_tests.entraid_groups.admins_object_id
      devs_object_id      = run.setup_tests.entraid_groups.devs_object_id
      externals_object_id = run.setup_tests.entraid_groups.externals_object_id
    }

    terraform_storage_account = {
      name                = run.setup_tests.terraform_storage_account.name
      resource_group_name = run.setup_tests.terraform_storage_account.resource_group_name
    }

    repository = {
      name               = run.setup_tests.repository.name
      description        = run.setup_tests.repository.description
      topics             = run.setup_tests.repository.topics
      reviewers_teams    = run.setup_tests.repository.reviewers_teams
      app_cd_policy_tags = run.setup_tests.repository.app_cd_policy_tags
    }

    github_private_runner = {
      container_app_environment_id       = run.setup_tests.github_private_runner.container_app_environment_id
      container_app_environment_location = run.setup_tests.github_private_runner.container_app_environment_location
      key_vault = {
        name                = run.setup_tests.github_private_runner.key_vault.name
        resource_group_name = run.setup_tests.github_private_runner.key_vault.resource_group_name
      }
    }

    pep_vnet_id                   = run.setup_tests.pep_vnet_id
    dns_zone_resource_group_id    = run.setup_tests.dns_zone_resource_group_id
    opex_resource_group_id        = run.setup_tests.opex_resource_group_id
    nat_gateway_resource_group_id = run.setup_tests.dns_zone_resource_group_id

    tags = run.setup_tests.tags
  }

  assert {
    condition     = azurerm_user_assigned_identity.infra_ci.name == "dx-d-itn-test-infra-github-ci-id-02"
    error_message = "The Infra CI user assigned identity has the wrong name"
  }

  assert {
    condition     = azurerm_user_assigned_identity.infra_cd.name == "dx-d-itn-test-infra-github-cd-id-02"
    error_message = "The Infra CD user assigned identity has the wrong name"
  }

  assert {
    condition     = azurerm_federated_identity_credential.github_infra_ci != null
    error_message = "The Infra CI GitHub federation is not set"
  }

  assert {
    condition     = azurerm_federated_identity_credential.github_infra_cd != null
    error_message = "The Infra CD GitHub federation is not set"
  }

  assert {
    condition     = azurerm_role_assignment.infra_ci_subscription_reader != null
    error_message = "The Infra CI managed identity can't read resources at subscription scope"
  }

  assert {
    condition     = azurerm_role_assignment.infra_ci_subscription_data_access != null
    error_message = "The Infra CI managed identity can't read resources' keys and data at subscription scope"
  }

  assert {
    condition     = azurerm_role_assignment.infra_ci_rg_cosmos_contributor != null
    error_message = "The Infra CI managed identity can't read Cosmos DB keys at resource group scope"
  }

  assert {
    condition     = azurerm_role_assignment.infra_ci_subscription_pagopa_iac_reader != null
    error_message = "The Infra CI managed identity can't read resources configuration at subscription scope"
  }

  assert {
    condition     = azurerm_role_assignment.infra_ci_tf_st_blob_contributor != null
    error_message = "The Infra CI managed identity can't read Terraform state file Storage Account scope"
  }

  assert {
    condition     = azurerm_role_assignment.infra_ci_rg_kv_secr != null
    error_message = "The Infra CI managed identity can't read Key Vault secrets at resource group scope"
  }

  assert {
    condition     = azurerm_role_assignment.infra_ci_rg_kv_cert != null
    error_message = "The Infra CI managed identity can't read Key Vault certificates at resource group scope"
  }

  assert {
    condition     = azurerm_role_assignment.infra_ci_rg_kv_crypto != null
    error_message = "The Infra CI managed identity can't read Key Vault keys at resource group scope"
  }

  assert {
    condition     = azurerm_role_assignment.infra_ci_rg_st_blob_reader != null
    error_message = "The Infra CI managed identity can't read Storage Account blobs at resource group scope"
  }

  assert {
    condition     = azurerm_role_assignment.infra_ci_rg_st_queue_reader != null
    error_message = "The Infra CI managed identity can't read Storage Account queues at resource group scope"
  }

  assert {
    condition     = azurerm_role_assignment.infra_ci_rg_ext_pagopa_dns_reader != null
    error_message = "The Infra CI managed identity can't read external DNS configuration at resource group scope"
  }

  assert {
    condition     = length(azurerm_key_vault_access_policy.infra_ci_kv_common) == 0
    error_message = "The Infra CI managed identity is not allowed to read from common Key Vault"
  }

  assert {
    condition     = azurerm_role_assignment.infra_cd_subscription_reader != null
    error_message = "The Infra CD managed identity can't read resources at subscription scope"
  }

  assert {
    condition     = azurerm_role_assignment.infra_cd_subscription_rbac_admin != null
    error_message = "The Infra CD managed identity can't manage IAM roles at subscription scope"
  }

  assert {
    condition     = azurerm_role_assignment.infra_cd_rg_contributor != null
    error_message = "The Infra CD managed identity can't apply changes to resources at resource group scope"
  }

  assert {
    condition     = azurerm_role_assignment.infra_cd_vnet_network_contributor != null
    error_message = "The Infra CD managed identity can't apply changes to network configurations at resource group scope"
  }

  assert {
    condition     = azurerm_role_assignment.infra_cd_apim_service_contributor == []
    error_message = "The Infra CD managed identity can't apply changes to API Management service configurations at resource group scope"
  }

  assert {
    condition     = azurerm_role_assignment.infra_cd_st_tf_blob_contributor != null
    error_message = "The Infra CD managed identity can't apply changes to the Terraform state file Storage Account scope"
  }

  assert {
    condition     = azurerm_role_assignment.infra_cd_rg_rbac_admin != null
    error_message = "The Infra CD managed identity can't apply changes to RBAC configurations at resource group scope"
  }

  assert {
    condition     = azurerm_role_assignment.infra_cd_rg_user_access_admin != null
    error_message = "The Infra CD managed identity can't apply changes to locks at resource group scope"
  }

  assert {
    condition     = azurerm_role_assignment.infra_cd_rg_kv_secr != null
    error_message = "The Infra CD managed identity can't read Key Vault secrets at resource group scope"
  }

  assert {
    condition     = azurerm_role_assignment.infra_cd_rg_kv_cert != null
    error_message = "The Infra CD managed identity can't write Key Vault certificates at resource group scope"
  }

  assert {
    condition     = azurerm_role_assignment.infra_cd_rg_kv_crypto != null
    error_message = "The Infra CD managed identity can't write Key Vault keys at resource group scope"
  }

  assert {
    condition     = azurerm_role_assignment.infra_cd_rg_st_blob_contributor != null
    error_message = "The Infra CD managed identity can't write Storage Account blobs at resource group scope"
  }

  assert {
    condition     = azurerm_role_assignment.infra_ci_rg_st_queue_contributor != null
    error_message = "The Infra CD managed identity can't write Storage Account queues at resource group scope"
  }

  assert {
    condition     = azurerm_role_assignment.infra_cd_rg_ext_network_dns_zone_contributor != null
    error_message = "The Infra CD managed identity can't apply changes to DNS zone configurations at resource group scope"
  }

  assert {
    condition     = azurerm_role_assignment.infra_cd_rg_ext_network_contributor != null
    error_message = "The Infra CD managed identity can't associate DNS zone and private endpoints at resource group scope"
  }

  assert {
    condition     = azurerm_role_assignment.infra_cd_rg_nat_gw_network_contributor != null
    error_message = "The Infra CD managed identity can't associate NAT Gateways with subnets at resource group scope"
  }

  assert {
    condition     = length(azurerm_key_vault_access_policy.infra_cd_kv_common) == 0
    error_message = "The Infra CD managed identity is not allowed to write to common Key Vaults"
  }
}

run "validate_rbac_entraid" {
  command = plan

  plan_options {
    target = [
      azurerm_role_assignment.admins_group_rg,
      azurerm_role_assignment.admins_group_rg_kv_data,
      azurerm_role_assignment.admins_group_rg_kv_admin,
      azurerm_role_assignment.devs_group_rg,
      azurerm_role_assignment.devs_group_tf_rg_kv_secr,
      azurerm_role_assignment.externals_group_rg,
    ]
  }

  variables {
    environment = {
      prefix          = run.setup_tests.environment.prefix
      env_short       = run.setup_tests.environment.env_short
      location        = run.setup_tests.environment.location
      domain          = run.setup_tests.environment.domain
      app_name        = run.setup_tests.environment.app_name
      instance_number = run.setup_tests.environment.instance_number
    }

    subscription_id = run.setup_tests.subscription_id
    tenant_id       = run.setup_tests.tenant_id

    entraid_groups = {
      admins_object_id    = run.setup_tests.entraid_groups.admins_object_id
      devs_object_id      = run.setup_tests.entraid_groups.devs_object_id
      externals_object_id = run.setup_tests.entraid_groups.externals_object_id
    }

    terraform_storage_account = {
      name                = run.setup_tests.terraform_storage_account.name
      resource_group_name = run.setup_tests.terraform_storage_account.resource_group_name
    }

    repository = {
      name               = run.setup_tests.repository.name
      description        = run.setup_tests.repository.description
      topics             = run.setup_tests.repository.topics
      reviewers_teams    = run.setup_tests.repository.reviewers_teams
      app_cd_policy_tags = run.setup_tests.repository.app_cd_policy_tags
    }

    github_private_runner = {
      container_app_environment_id       = run.setup_tests.github_private_runner.container_app_environment_id
      container_app_environment_location = run.setup_tests.github_private_runner.container_app_environment_location
      key_vault = {
        name                = run.setup_tests.github_private_runner.key_vault.name
        resource_group_name = run.setup_tests.github_private_runner.key_vault.resource_group_name
      }
    }

    pep_vnet_id                   = run.setup_tests.pep_vnet_id
    dns_zone_resource_group_id    = run.setup_tests.dns_zone_resource_group_id
    opex_resource_group_id        = run.setup_tests.opex_resource_group_id
    nat_gateway_resource_group_id = run.setup_tests.dns_zone_resource_group_id

    tags = run.setup_tests.tags
  }

  assert {
    condition     = azurerm_role_assignment.admins_group_rg != null
    error_message = "The Admins group should have role assignments at resource group scope"
  }

  assert {
    condition     = azurerm_role_assignment.devs_group_rg != null
    error_message = "The Developers group should have role assignments at resource group scope"
  }

  assert {
    condition     = azurerm_role_assignment.devs_group_tf_rg_kv_secr != null
    error_message = "The Developers group should have Key Vault Secrets role"
  }

  assert {
    condition     = azurerm_role_assignment.externals_group_rg != null
    error_message = "The Externals group should have role assignments at resource group scope"
  }
}

run "validate_github_id_opex" {
  command = plan

  plan_options {
    target = [
      azurerm_user_assigned_identity.opex_ci,
      azurerm_user_assigned_identity.opex_cd,
      azurerm_federated_identity_credential.github_opex_ci,
      azurerm_federated_identity_credential.github_opex_cd,
      azurerm_role_assignment.opex_ci_subscription_reader,
      azurerm_role_assignment.opex_cd_subscription_reader,
    ]
  }

  variables {
    environment = {
      prefix          = run.setup_tests.environment.prefix
      env_short       = run.setup_tests.environment.env_short
      location        = run.setup_tests.environment.location
      domain          = run.setup_tests.environment.domain
      app_name        = run.setup_tests.environment.app_name
      instance_number = run.setup_tests.environment.instance_number
    }

    subscription_id = run.setup_tests.subscription_id
    tenant_id       = run.setup_tests.tenant_id

    entraid_groups = {
      admins_object_id    = run.setup_tests.entraid_groups.admins_object_id
      devs_object_id      = run.setup_tests.entraid_groups.devs_object_id
      externals_object_id = run.setup_tests.entraid_groups.externals_object_id
    }

    terraform_storage_account = {
      name                = run.setup_tests.terraform_storage_account.name
      resource_group_name = run.setup_tests.terraform_storage_account.resource_group_name
    }

    repository = {
      name               = run.setup_tests.repository.name
      description        = run.setup_tests.repository.description
      topics             = run.setup_tests.repository.topics
      reviewers_teams    = run.setup_tests.repository.reviewers_teams
      app_cd_policy_tags = run.setup_tests.repository.app_cd_policy_tags
    }

    github_private_runner = {
      container_app_environment_id       = run.setup_tests.github_private_runner.container_app_environment_id
      container_app_environment_location = run.setup_tests.github_private_runner.container_app_environment_location
      key_vault = {
        name                = run.setup_tests.github_private_runner.key_vault.name
        resource_group_name = run.setup_tests.github_private_runner.key_vault.resource_group_name
      }
    }

    pep_vnet_id                   = run.setup_tests.pep_vnet_id
    dns_zone_resource_group_id    = run.setup_tests.dns_zone_resource_group_id
    opex_resource_group_id        = run.setup_tests.opex_resource_group_id
    nat_gateway_resource_group_id = run.setup_tests.dns_zone_resource_group_id

    tags = run.setup_tests.tags
  }

  assert {
    condition     = azurerm_user_assigned_identity.opex_ci.name == "dx-d-itn-test-opex-github-ci-id-02"
    error_message = "Opex CI identity name is incorrect"
  }

  assert {
    condition     = azurerm_user_assigned_identity.opex_cd.name == "dx-d-itn-test-opex-github-cd-id-02"
    error_message = "Opex CD identity name is incorrect"
  }

  assert {
    condition     = azurerm_federated_identity_credential.github_opex_ci.subject != null
    error_message = "GitHub Opex CI federated credential subject should not be null"
  }

  assert {
    condition     = azurerm_federated_identity_credential.github_opex_cd.subject != null
    error_message = "GitHub Opex CD federated credential subject should not be null"
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
