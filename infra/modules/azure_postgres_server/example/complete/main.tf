data "azurerm_client_config" "current" {}

resource "azurerm_resource_group" "example" {
  name     = "${local.project}-${local.environment.domain}-rg-${local.environment.instance_number}"
  location = local.environment.location
}

data "azurerm_subnet" "pep" {
  name                 = "${local.project}-pep-snet-01"
  virtual_network_name = "${local.project}-common-vnet-01"
  resource_group_name  = "${local.project}-common-rg-01"
}

resource "random_password" "password" {
  length  = 16
  special = true
}

resource "azurerm_key_vault" "example" {
  name                = "${local.project}-kv-01"
  location            = local.environment.location
  resource_group_name = azurerm_resource_group.example.name
  sku_name            = "standard"

  tenant_id                  = data.azurerm_client_config.current.tenant_id
  purge_protection_enabled   = true
  soft_delete_retention_days = 7

  network_acls {
    bypass         = "AzureServices"
    default_action = "Deny"
  }

  access_policy {
    tenant_id = data.azurerm_client_config.current.tenant_id
    object_id = data.azurerm_client_config.current.object_id

    secret_permissions = [
      "Get",
      "Set",
      "Delete"
    ]
  }
}

resource "azurerm_key_vault_secret" "postgres_username" {
  name            = "${local.project}-postgres-username"
  value           = "test_user"
  key_vault_id    = azurerm_key_vault.example.id
  content_type    = "text"
  expiration_date = "1982-12-31T00:00:00Z"
}

resource "azurerm_key_vault_secret" "postgres_password" {
  name            = "${local.project}-postgres-password"
  value           = random_password.password.result
  key_vault_id    = azurerm_key_vault.example.id
  content_type    = "password"
  expiration_date = "1982-12-31T00:00:00Z"
}

module "azure_postgres" {
  source = "../../"

  environment                          = local.environment
  resource_group_name                  = azurerm_resource_group.example.name
  private_dns_zone_resource_group_name = azurerm_resource_group.example.name

  tier = "l"

  administrator_credentials = {
    name     = azurerm_key_vault_secret.postgres_username.value
    password = azurerm_key_vault_secret.postgres_password.value
  }

  subnet_pep_id = data.azurerm_subnet.pep.id

  tags = local.tags
}