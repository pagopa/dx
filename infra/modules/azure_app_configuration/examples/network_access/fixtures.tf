resource "azurerm_resource_group" "e2e_appcs" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    domain        = "e2e"
    name          = "appcs",
    resource_type = "resource_group"
  }))
  location = local.environment.location

  tags = local.tags
}

resource "azurerm_container_group" "public_app" {
  name = provider::dx::resource_name(
    merge(local.naming_config, { name = "appcs-public", resource_type = "container_instance" })
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

  diagnostics {
    log_analytics {
      workspace_id  = data.azurerm_log_analytics_workspace.e2e.workspace_id
      workspace_key = data.azurerm_log_analytics_workspace.e2e.primary_shared_key
    }
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

module "role_appcs_private" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 1.0"

  principal_id    = azurerm_container_group.private_app.identity[0].principal_id
  subscription_id = data.azurerm_subscription.current.subscription_id

  app_config = [
    {
      name                = module.private_appcs.name
      resource_group_name = module.private_appcs.resource_group_name
      description         = "Allow private Container Instance to read from App Configuration"
      role                = "reader"
    }
  ]
}

module "role_appcs_public" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 1.0"

  principal_id    = azurerm_container_group.public_app.identity[0].principal_id
  subscription_id = data.azurerm_subscription.current.subscription_id

  app_config = [
    {
      name                = module.private_appcs.name
      resource_group_name = module.private_appcs.resource_group_name
      description         = "Allow public Container Instance to read from App Configuration"
      role                = "reader"
    }
  ]
}

module "integration_github_roles" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 1.0"

  principal_id    = data.azurerm_user_assigned_identity.integration_github.principal_id
  subscription_id = data.azurerm_subscription.current.subscription_id

  app_config = [
    {
      name                = module.private_appcs.name
      resource_group_name = module.private_appcs.resource_group_name
      description         = "Allow GitHub to write settings on App Configuration"
      role                = "writer"
    }
  ]
}
