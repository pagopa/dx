module "key_vault" {
  source = "./modules/key_vault"

  naming_config = merge(local.naming_config, { name = var.environment.app_name })

  location            = var.environment.location
  resource_group_name = azurerm_resource_group.common.name

  tenant_id = data.azurerm_client_config.current.tenant_id

  subnet_pep_id = module.network.pep_snet.id
  private_dns_zone = {
    id                  = module.dns.private_dns_zones.vault.id
    resource_group_name = azurerm_resource_group.network.name
  }

  tags = local.tags
}
