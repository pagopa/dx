resource "azurerm_role_assignment" "user_access_administrator" {
  count                = var.environment.env_short == "d" ? 1 : 0
  scope                = module.core_values.test_resource_group_id
  role_definition_name = "User Access Administrator"
  principal_id         = module.bootstrap.identities.infra.ci.principal_id
}

module "roles_ci" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 1.0"

  principal_id    = module.bootstrap.identities.infra.ci.principal_id
  subscription_id = data.azurerm_subscription.current.subscription_id

  key_vault = [
    {
      name                = module.core_values.common_key_vault.name
      resource_group_name = module.core_values.common_key_vault.resource_group_name
      description         = "Allow dx repo CI to read secrets"
      roles = {
        secrets = "writer"
      }
    }
  ]
}

module "roles_cd" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 1.0"

  principal_id    = module.bootstrap.identities.infra.cd.principal_id
  subscription_id = data.azurerm_subscription.current.subscription_id

  key_vault = [
    {
      name                = module.core_values.common_key_vault.name
      resource_group_name = module.core_values.common_key_vault.resource_group_name
      description         = "Allow dx repo CD to read secrets"
      roles = {
        secrets = "reader"
      }
    }
  ]
}

resource "azurerm_role_assignment" "storage_blob_contributor" {
  count                = var.environment.env_short == "d" ? 1 : 0
  scope                = data.azurerm_resource_group.tfstate[0].id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = module.bootstrap.identities.infra.ci.principal_id
}

resource "azurerm_role_assignment" "contributor" {
  count                = var.environment.env_short == "d" ? 1 : 0
  scope                = data.azurerm_subscription.current.id
  role_definition_name = "Contributor"
  principal_id         = module.bootstrap.identities.infra.ci.principal_id
}
