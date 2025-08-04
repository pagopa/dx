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

run "validate_github_id_app" {
  command = plan

  plan_options {
    target = [
      azurerm_user_assigned_identity.app_cd,
      azurerm_federated_identity_credential.github_app_cd,
      azurerm_role_assignment.app_cd_subscription_reader,
      azurerm_role_assignment.app_cd_rgs_website_contributor,
      azurerm_role_assignment.app_cd_rgs_cdn_profile_contributor,
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
    }

    github_private_runner = {
      container_app_environment_id       = run.setup_tests.github_private_runner.container_app_environment_id
      container_app_environment_location = run.setup_tests.github_private_runner.container_app_environment_location
      key_vault = {
        name                = run.setup_tests.github_private_runner.key_vault.name
        resource_group_name = run.setup_tests.github_private_runner.key_vault.resource_group_name
      }
    }

    pep_vnet_id                        = run.setup_tests.pep_vnet_id
    private_dns_zone_resource_group_id = run.setup_tests.private_dns_zone_resource_group_id
    opex_resource_group_id             = run.setup_tests.opex_resource_group_id

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
    condition     = length(azurerm_role_assignment.app_cd_rgs_website_contributor) == 1
    error_message = "The App CD user assigned identity is not Wesbsite Contributor of the resource group"
  }

  assert {
    condition     = length(azurerm_role_assignment.app_cd_rgs_cdn_profile_contributor) == 1
    error_message = "The App CD user assigned identity is not CDN Endpoint Contributor of the resource group"
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
      azurerm_role_assignment.infra_ci_rgs_cosmos_contributor,
      azurerm_role_assignment.infra_ci_tf_st_blob_contributor,
      azurerm_role_assignment.infra_ci_rgs_kv_secr,
      azurerm_role_assignment.infra_ci_rgs_kv_cert,
      azurerm_role_assignment.infra_ci_rgs_kv_crypto,
      azurerm_role_assignment.infra_ci_rgs_st_blob_reader,
      azurerm_role_assignment.infra_ci_rgs_st_queue_reader,
      azurerm_role_assignment.infra_ci_rgs_st_table_reader,
      azurerm_key_vault_access_policy.infra_ci_kv_common,
      azurerm_role_assignment.infra_ci_rgs_ca_operator,
      azurerm_role_assignment.infra_cd_subscription_reader,
      azurerm_role_assignment.infra_cd_subscription_rbac_admin,
      azurerm_role_assignment.infra_cd_rgs_contributor,
      azurerm_role_assignment.infra_cd_vnet_network_contributor,
      azurerm_role_assignment.infra_cd_apim_service_contributor,
      azurerm_role_assignment.infra_cd_sbns_contributor,
      azurerm_role_assignment.infra_cd_st_tf_blob_contributor,
      azurerm_role_assignment.infra_cd_rgs_user_access_admin,
      azurerm_role_assignment.infra_cd_rgs_kv_secr,
      azurerm_role_assignment.infra_cd_rgs_kv_cert,
      azurerm_role_assignment.infra_cd_rgs_kv_crypto,
      azurerm_role_assignment.infra_cd_rgs_st_blob_contributor,
      azurerm_role_assignment.infra_ci_rgs_st_queue_contributor,
      azurerm_role_assignment.infra_ci_rgs_st_table_contributor,
      azurerm_role_assignment.infra_cd_rg_ext_network_dns_zone_contributor,
      azurerm_role_assignment.infra_cd_rg_private_dns_zone_contributor,
      azurerm_role_assignment.infra_cd_rg_network_contributor,
      azurerm_role_assignment.infra_cd_rg_nat_gw_network_contributor,
      azurerm_key_vault_access_policy.infra_cd_kv_common,
      azurerm_role_assignment.infra_cd_rgs_ca_contributor,
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
    }

    github_private_runner = {
      container_app_environment_id       = run.setup_tests.github_private_runner.container_app_environment_id
      container_app_environment_location = run.setup_tests.github_private_runner.container_app_environment_location
      key_vault = {
        name                = run.setup_tests.github_private_runner.key_vault.name
        resource_group_name = run.setup_tests.github_private_runner.key_vault.resource_group_name
      }
    }

    pep_vnet_id                        = run.setup_tests.pep_vnet_id
    private_dns_zone_resource_group_id = run.setup_tests.private_dns_zone_resource_group_id
    opex_resource_group_id             = run.setup_tests.opex_resource_group_id
    nat_gateway_resource_group_id      = run.setup_tests.nat_gateway_resource_group_id

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
    condition     = azurerm_role_assignment.infra_ci_rgs_cosmos_contributor != null
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
    condition     = azurerm_role_assignment.infra_ci_rgs_kv_secr != null
    error_message = "The Infra CI managed identity can't read Key Vault secrets at resource group scope"
  }

  assert {
    condition     = azurerm_role_assignment.infra_ci_rgs_kv_cert != null
    error_message = "The Infra CI managed identity can't read Key Vault certificates at resource group scope"
  }

  assert {
    condition     = azurerm_role_assignment.infra_ci_rgs_kv_crypto != null
    error_message = "The Infra CI managed identity can't read Key Vault keys at resource group scope"
  }

  assert {
    condition     = azurerm_role_assignment.infra_ci_rgs_st_blob_reader != null
    error_message = "The Infra CI managed identity can't read Storage Account blobs at resource group scope"
  }

  assert {
    condition     = azurerm_role_assignment.infra_ci_rgs_st_queue_reader != null
    error_message = "The Infra CI managed identity can't read Storage Account queues at resource group scope"
  }

  assert {
    condition     = azurerm_role_assignment.infra_ci_rgs_st_table_reader != null
    error_message = "The Infra CI managed identity can't read Storage Account tables at resource group scope"
  }

  assert {
    condition     = length(azurerm_key_vault_access_policy.infra_ci_kv_common) == 0
    error_message = "The Infra CI managed identity is not allowed to read from common Key Vault"
  }

  assert {
    condition     = azurerm_role_assignment.infra_ci_rgs_ca_operator != null
    error_message = "The Infra CI managed identity can't read Container Apps secrets at resource group scope"
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
    condition     = azurerm_role_assignment.infra_cd_rgs_contributor != null
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
    condition     = azurerm_role_assignment.infra_cd_sbns_contributor == []
    error_message = "The Infra CD managed identity can't apply changes to Service Bus Namespace configurations at resource group scope"
  }

  assert {
    condition     = azurerm_role_assignment.infra_cd_st_tf_blob_contributor != null
    error_message = "The Infra CD managed identity can't apply changes to the Terraform state file Storage Account scope"
  }

  assert {
    condition     = azurerm_role_assignment.infra_cd_rgs_user_access_admin != null
    error_message = "The Infra CD managed identity can't apply changes to locks at resource group scope"
  }

  assert {
    condition     = azurerm_role_assignment.infra_cd_rgs_kv_secr != null
    error_message = "The Infra CD managed identity can't read Key Vault secrets at resource group scope"
  }

  assert {
    condition     = azurerm_role_assignment.infra_cd_rgs_kv_cert != null
    error_message = "The Infra CD managed identity can't write Key Vault certificates at resource group scope"
  }

  assert {
    condition     = azurerm_role_assignment.infra_cd_rgs_kv_crypto != null
    error_message = "The Infra CD managed identity can't write Key Vault keys at resource group scope"
  }

  assert {
    condition     = azurerm_role_assignment.infra_cd_rgs_st_blob_contributor != null
    error_message = "The Infra CD managed identity can't write Storage Account blobs at resource group scope"
  }

  assert {
    condition     = azurerm_role_assignment.infra_ci_rgs_st_queue_contributor != null
    error_message = "The Infra CD managed identity can't write Storage Account queues at resource group scope"
  }

  assert {
    condition     = azurerm_role_assignment.infra_ci_rgs_st_table_contributor != null
    error_message = "The Infra CD managed identity can't write Storage Account tables at resource group scope"
  }

  assert {
    condition     = azurerm_role_assignment.infra_cd_rg_private_dns_zone_contributor != null
    error_message = "The Infra CD managed identity can't associate Private DNS zone and private endpoints at resource group scope"
  }

  assert {
    condition     = azurerm_role_assignment.infra_cd_rg_nat_gw_network_contributor != null
    error_message = "The Infra CD managed identity can't associate NAT Gateways with subnets at resource group scope"
  }

  assert {
    condition     = length(azurerm_key_vault_access_policy.infra_cd_kv_common) == 0
    error_message = "The Infra CD managed identity is not allowed to write to common Key Vaults"
  }

  assert {
    condition     = azurerm_role_assignment.infra_cd_rgs_ca_contributor != null
    error_message = "The Infra CD managed identity can't apply changes to Container Apps at resource group scope"
  }
}

run "validate_github_id_infra_duplicate_nat_role_assignment" {
  command = plan

  plan_options {
    target = [
      azurerm_role_assignment.infra_cd_rg_nat_gw_network_contributor,
      azurerm_role_assignment.infra_cd_rg_network_contributor,
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
    }

    github_private_runner = {
      container_app_environment_id       = run.setup_tests.github_private_runner.container_app_environment_id
      container_app_environment_location = run.setup_tests.github_private_runner.container_app_environment_location
      key_vault = {
        name                = run.setup_tests.github_private_runner.key_vault.name
        resource_group_name = run.setup_tests.github_private_runner.key_vault.resource_group_name
      }
    }

    pep_vnet_id                        = run.setup_tests.pep_vnet_id
    private_dns_zone_resource_group_id = run.setup_tests.private_dns_zone_resource_group_id
    opex_resource_group_id             = run.setup_tests.opex_resource_group_id
    nat_gateway_resource_group_id      = run.setup_tests.private_dns_zone_resource_group_id

    tags = run.setup_tests.tags
  }

  assert {
    condition     = azurerm_role_assignment.infra_cd_rg_nat_gw_network_contributor == []
    error_message = "The Infra CD has a duplicate role on the same resource group"
  }

  assert {
    condition     = azurerm_role_assignment.infra_cd_rg_network_contributor != null
    error_message = "The Infra CD has a duplicate role on the same resource group"
  }
}

run "validate_rbac_entraid" {
  command = plan

  plan_options {
    target = [
      azurerm_role_assignment.admins_group_rgs,
      azurerm_role_assignment.admins_group_rgs_kv_data,
      azurerm_role_assignment.admins_group_rgs_kv_admin,
      azurerm_role_assignment.devs_group_rgs,
      azurerm_role_assignment.devs_group_tf_rgs_kv_secr,
      azurerm_role_assignment.externals_group_rgs,
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
    }

    github_private_runner = {
      container_app_environment_id       = run.setup_tests.github_private_runner.container_app_environment_id
      container_app_environment_location = run.setup_tests.github_private_runner.container_app_environment_location
      key_vault = {
        name                = run.setup_tests.github_private_runner.key_vault.name
        resource_group_name = run.setup_tests.github_private_runner.key_vault.resource_group_name
      }
    }

    pep_vnet_id                        = run.setup_tests.pep_vnet_id
    private_dns_zone_resource_group_id = run.setup_tests.private_dns_zone_resource_group_id
    opex_resource_group_id             = run.setup_tests.opex_resource_group_id

    tags = run.setup_tests.tags
  }

  assert {
    condition     = azurerm_role_assignment.admins_group_rgs["main"] != null
    error_message = "The Admins group should have role assignments at resource group scope"
  }

  assert {
    condition     = azurerm_role_assignment.devs_group_rgs["main"] != null
    error_message = "The Developers group should have role assignments at resource group scope"
  }

  assert {
    condition     = azurerm_role_assignment.devs_group_tf_rgs_kv_secr["main"] != null
    error_message = "The Developers group should have Key Vault Secrets role"
  }

  assert {
    condition     = azurerm_role_assignment.externals_group_rgs["main"] != null
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
    }

    github_private_runner = {
      container_app_environment_id       = run.setup_tests.github_private_runner.container_app_environment_id
      container_app_environment_location = run.setup_tests.github_private_runner.container_app_environment_location
      key_vault = {
        name                = run.setup_tests.github_private_runner.key_vault.name
        resource_group_name = run.setup_tests.github_private_runner.key_vault.resource_group_name
      }
    }

    pep_vnet_id                        = run.setup_tests.pep_vnet_id
    private_dns_zone_resource_group_id = run.setup_tests.private_dns_zone_resource_group_id
    opex_resource_group_id             = run.setup_tests.opex_resource_group_id

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

run "validate_rgs_iam" {
  command = plan

  plan_options {
    target = [
      azurerm_role_assignment.admins_group_rgs,
      azurerm_role_assignment.admins_group_rgs_kv_data,
      azurerm_role_assignment.admins_group_rgs_kv_admin,
      azurerm_role_assignment.devs_group_rgs,
      azurerm_role_assignment.devs_group_tf_rgs_kv_secr,
      azurerm_role_assignment.externals_group_rgs,
      azurerm_role_assignment.app_cd_rgs_website_contributor,
      azurerm_role_assignment.app_cd_rgs_cdn_profile_contributor,
      azurerm_role_assignment.infra_cd_rgs_contributor,
      azurerm_role_assignment.infra_cd_rgs_user_access_admin,
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
    }

    github_private_runner = {
      container_app_environment_id       = run.setup_tests.github_private_runner.container_app_environment_id
      container_app_environment_location = run.setup_tests.github_private_runner.container_app_environment_location
      key_vault = {
        name                = run.setup_tests.github_private_runner.key_vault.name
        resource_group_name = run.setup_tests.github_private_runner.key_vault.resource_group_name
      }
    }

    pep_vnet_id                        = run.setup_tests.pep_vnet_id
    private_dns_zone_resource_group_id = run.setup_tests.private_dns_zone_resource_group_id
    opex_resource_group_id             = run.setup_tests.opex_resource_group_id
    additional_resource_group_ids = [
      run.setup_tests.opex_resource_group_id,
      run.setup_tests.private_dns_zone_resource_group_id
    ]

    tags = run.setup_tests.tags
  }

  assert {
    condition     = azurerm_role_assignment.admins_group_rgs[run.setup_tests.opex_resource_group_id] != 0
    error_message = "The Admins group should be Owner of the additional resource groups"
  }

  assert {
    condition     = azurerm_role_assignment.admins_group_rgs_kv_data[run.setup_tests.opex_resource_group_id] != null
    error_message = "The Admins group should be able to apply changes to KeyVault's data of the additional resource groups"
  }

  assert {
    condition     = azurerm_role_assignment.admins_group_rgs_kv_admin[run.setup_tests.opex_resource_group_id] != null
    error_message = "The Admins group should be able to apply changes to KeyVault of the additional resource groups"
  }

  assert {
    condition     = azurerm_role_assignment.devs_group_rgs[run.setup_tests.opex_resource_group_id] != null
    error_message = "The Devs group should be Owner of the additional resource groups"
  }

  assert {
    condition     = azurerm_role_assignment.devs_group_tf_rgs_kv_secr[run.setup_tests.opex_resource_group_id] != null
    error_message = "The Devs group should be able to apply changes to KeyVault's secrets of the additional resource groups"
  }

  assert {
    condition     = azurerm_role_assignment.externals_group_rgs[run.setup_tests.opex_resource_group_id] != null
    error_message = "The Externals group should be able to read resources of the additional resource groups"
  }

  assert {
    condition     = azurerm_role_assignment.app_cd_rgs_website_contributor[run.setup_tests.opex_resource_group_id] != null
    error_message = "The App CD user assigned identity is not Website Contributor of the additional resource groups"
  }

  assert {
    condition     = azurerm_role_assignment.app_cd_rgs_cdn_profile_contributor[run.setup_tests.opex_resource_group_id] != null
    error_message = "The App CD user assigned identity is not CDN Endpoint Contributor of the additional resource groups"
  }

  assert {
    condition     = azurerm_role_assignment.infra_cd_rgs_contributor[run.setup_tests.opex_resource_group_id] != null
    error_message = "The Infra CD user assigned identity is not Contributor of the additional resource groups"
  }

  assert {
    condition     = azurerm_role_assignment.infra_cd_rgs_user_access_admin[run.setup_tests.opex_resource_group_id] != null
    error_message = "The Infra CD user assigned identity is not User Access Administrator of the additional resource groups"
  }
}
