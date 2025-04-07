module "naming_convention" {
  source = "../../../azure_naming_convention"

  environment = local.environment
}

data "azurerm_client_config" "current" {}

resource "azurerm_resource_group" "example" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "example",
    resource_type = "resource_group"
  }))
  location = local.environment.location
}

data "azurerm_subnet" "pep" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    domain        = null,
    name          = "pep",
    resource_type = "subnet"
  }))
  virtual_network_name = local.virtual_network.name
  resource_group_name  = local.virtual_network.resource_group_name
}

# tflint-ignore: terraform_required_providers
resource "random_password" "password" {
  length  = 16
  special = true
}

resource "azurerm_key_vault" "example" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    domain        = null,
    name          = "example",
    resource_type = "key_vault"
  }))
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
  name            = "${provider::dx::resource_name(merge(local.naming_config, { resource_type = "postgresql" }))}-username"
  value           = "test_user"
  key_vault_id    = azurerm_key_vault.example.id
  content_type    = "text"
  expiration_date = "1982-12-31T00:00:00Z"
}

resource "azurerm_key_vault_secret" "postgres_password" {
  name            = "${provider::dx::resource_name(merge(local.naming_config, { resource_type = "postgresql" }))}-password"
  value           = random_password.password.result
  key_vault_id    = azurerm_key_vault.example.id
  content_type    = "password"
  expiration_date = "1982-12-31T00:00:00Z"
}

module "azure_postgres" {
  source = "../../"

  environment                          = local.environment
  resource_group_name                  = azurerm_resource_group.example.name
  private_dns_zone_resource_group_name = local.virtual_network.resource_group_name

  tier = "s"

  administrator_credentials = {
    name     = azurerm_key_vault_secret.postgres_username.value
    password = azurerm_key_vault_secret.postgres_password.value
  }

  subnet_pep_id = data.azurerm_subnet.pep.id

  tags = local.tags
}