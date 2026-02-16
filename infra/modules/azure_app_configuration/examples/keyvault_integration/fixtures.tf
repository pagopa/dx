resource "random_integer" "instance_number" {
  min = 1
  max = 99
}

resource "azurerm_resource_group" "e2e_appcs" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    domain        = "e2e"
    name          = "appcs",
    resource_type = "resource_group"
  }))
  location = local.environment.location

  tags = local.tags
}

resource "azurerm_key_vault" "kv" {
  name                          = provider::dx::resource_name(merge(local.naming_config, { resource_type = "key_vault", instance_number = random_integer.instance_number.result }))
  location                      = azurerm_resource_group.e2e_appcs.location
  resource_group_name           = azurerm_resource_group.e2e_appcs.name
  tenant_id                     = data.azurerm_client_config.current.tenant_id
  sku_name                      = "standard"
  rbac_authorization_enabled    = true
  purge_protection_enabled      = false
  soft_delete_retention_days    = 7
  public_network_access_enabled = false

  network_acls {
    bypass         = "AzureServices"
    default_action = "Deny"
  }
  tags = local.tags
}

#trivy:ignore:AVD-AZU-0015
#trivy:ignore:AVD-AZU-0017
resource "azurerm_key_vault_secret" "test_secret" {
  name         = "secret-key"
  key_vault_id = azurerm_key_vault.kv.id
  value        = "secret value"

  depends_on = [
    azurerm_role_assignment.github_kv_secrets_writer
  ]
}

resource "azurerm_private_endpoint" "kv" {
  name                = provider::dx::resource_name(merge(local.naming_config, { resource_type = "key_vault_private_endpoint", instance_number = random_integer.instance_number.result }))
  location            = azurerm_resource_group.e2e_appcs.location
  resource_group_name = azurerm_resource_group.e2e_appcs.name
  subnet_id           = data.azurerm_subnet.pep.id

  private_service_connection {
    name                           = provider::dx::resource_name(merge(local.naming_config, { resource_type = "key_vault_private_endpoint", instance_number = random_integer.instance_number.result }))
    private_connection_resource_id = azurerm_key_vault.kv.id
    is_manual_connection           = false
    subresource_names              = ["vault"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.kv.id]
  }

  tags = local.tags
}

resource "dx_available_subnet_cidr" "private_app" {
  virtual_network_id = data.azurerm_virtual_network.e2e.id
  prefix_length      = 26
}

resource "azurerm_subnet" "private_app" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "appcs-private",
    resource_type = "container_instance_subnet"
  }))
  resource_group_name  = local.e2e_virtual_network.resource_group_name
  virtual_network_name = local.e2e_virtual_network.name
  address_prefixes     = [dx_available_subnet_cidr.private_app.cidr_block]

  delegation {
    name = "Microsoft.ContainerInstance/containerGroups"

    service_delegation {
      name = "Microsoft.ContainerInstance/containerGroups"
      actions = [
        "Microsoft.Network/virtualNetworks/subnets/action",
      ]
    }
  }
}

resource "azurerm_container_group" "private_app" {
  name = provider::dx::resource_name(
    merge(local.naming_config, { name = "appcs-private", resource_type = "container_instance" })
  )
  location            = local.environment.location
  resource_group_name = azurerm_resource_group.e2e_appcs.name

  identity { type = "SystemAssigned" }

  os_type = "Linux"

  container {
    name   = "network-access"
    image  = local.docker_image
    cpu    = "0.5"
    memory = "1.5"
    ports {
      port = 8080
    }
  }

  ip_address_type = "Private"

  subnet_ids = [
    azurerm_subnet.private_app.id
  ]

  diagnostics {
    log_analytics {
      workspace_id  = data.azurerm_log_analytics_workspace.e2e.workspace_id
      workspace_key = data.azurerm_log_analytics_workspace.e2e.primary_shared_key
    }
  }

  tags = local.tags
}

resource "azurerm_role_assignment" "github_kv_secrets_writer" {
  scope                = azurerm_key_vault.kv.id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = data.azurerm_user_assigned_identity.integration_github.principal_id

  depends_on = [azurerm_key_vault.kv]
}

resource "azurerm_role_assignment" "github_appconfig_writer" {
  scope                = module.appcs_with_kv.id
  role_definition_name = "App Configuration Data Owner"
  principal_id         = data.azurerm_user_assigned_identity.integration_github.principal_id

  depends_on = [module.appcs_with_kv]
}
