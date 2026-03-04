module "appcs_with_kv" {
  source  = "pagopa-dx/azure-app-configuration/azurerm"
  version = "~> 0.0"

  environment         = (merge(local.environment, { instance_number = random_integer.instance_number.result }))
  resource_group_name = azurerm_resource_group.e2e_appcs.name

  subscription_id = data.azurerm_subscription.current.subscription_id

  subnet_pep_id = data.azurerm_subnet.pep.id
  virtual_network = {
    name                = local.e2e_virtual_network.name
    resource_group_name = local.e2e_virtual_network.resource_group_name
  }

  private_dns_zone_resource_group_name = data.azurerm_resource_group.network.name

  key_vaults = [{
    has_rbac_support    = true
    name                = azurerm_key_vault.kv.name
    resource_group_name = azurerm_key_vault.kv.resource_group_name
    app_principal_ids = [
      data.azurerm_user_assigned_identity.integration_github.principal_id,
      azurerm_container_group.private_app.identity[0].principal_id
    ]
  }]

  tags = local.tags
}

resource "azurerm_app_configuration_key" "test_setting" {
  configuration_store_id = module.appcs_with_kv.id
  key                    = "Setting:test-key"
  value                  = "test value"
  content_type           = "application/json"

  depends_on = [
    azurerm_role_assignment.github_appconfig_writer
  ]
}

resource "azurerm_app_configuration_key" "test_secret" {
  configuration_store_id = module.appcs_with_kv.id
  key                    = "Secret:secret-key"
  type                   = "vault"
  vault_key_reference    = azurerm_key_vault_secret.test_secret.versionless_id

  depends_on = [
    azurerm_role_assignment.github_appconfig_writer,
    azurerm_key_vault_secret.test_secret
  ]
}
