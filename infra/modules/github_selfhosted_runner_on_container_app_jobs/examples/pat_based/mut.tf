module "runner" {
  source = "../.."

  environment         = local.environment
  resource_group_name = azurerm_resource_group.sut.name

  repository = {
    name = local.github_repository
  }

  container_app_environment = {
    id                          = azurerm_container_app_environment.runner.id
    location                    = azurerm_container_app_environment.runner.location
    polling_interval_in_seconds = 15
    max_instances               = 1
    use_labels                  = true
    override_labels             = [local.runner_label]
  }

  key_vault = {
    name                = azurerm_key_vault.test.name
    resource_group_name = azurerm_key_vault.test.resource_group_name
    use_rbac            = true
  }

  tags = local.tags

  depends_on = [
    azurerm_key_vault_secret.runner_pat,
  ]
}
